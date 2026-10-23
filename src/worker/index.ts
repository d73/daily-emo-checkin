import { Hono } from "hono";
import { and, eq } from "drizzle-orm";
import { drizzle, type DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import { getAuth } from "./auth";
import { checkins } from "./checkins";
import { verifyPassword } from "./password";
import { safeTimeZone } from "../shared/day";
import type { Env } from "./env";

type User = typeof schema.user.$inferSelect;
export type AppEnv = {
  Bindings: Env;
  Variables: { db: DrizzleD1Database<typeof schema>; user: User };
};

const app = new Hono<AppEnv>();

// Login, sign-up, sign-out: handled by Better Auth.
app.on(["GET", "POST"], "/api/auth/*", (c) => getAuth(c.env).handler(c.req.raw));

// Everything else under /api needs a signed-in user.
app.use("/api/*", async (c, next) => {
  const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session) return c.json({ error: "Please sign in." }, 401);
  const db = drizzle(c.env.DB, { schema });
  const [user] = await db.select().from(schema.user).where(eq(schema.user.id, session.user.id));
  if (!user) return c.json({ error: "Please sign in." }, 401);
  c.set("db", db);
  c.set("user", user);
  await next();
});

app.get("/api/me", (c) => {
  const u = c.get("user");
  return c.json({
    username: u.displayUsername ?? u.username,
    email: u.email,
    timezone: u.timezone,
    morningStartMinutes: u.morningStartMinutes,
    aiConnected: Boolean(c.env.ANTHROPIC_API_KEY),
  });
});

app.put("/api/settings", async (c) => {
  const body = await c.req.json<{ morningStartMinutes?: unknown; timezone?: string }>().catch(() => ({}) as never);
  const patch: Partial<User> = {};
  if (body.morningStartMinutes !== undefined) {
    const m = body.morningStartMinutes;
    if (typeof m !== "number" || !Number.isInteger(m) || m < 0 || m >= 24 * 60) {
      return c.json({ error: "Morning start must be a time of day." }, 400);
    }
    patch.morningStartMinutes = m;
  }
  if (body.timezone !== undefined) patch.timezone = safeTimeZone(body.timezone);
  if (Object.keys(patch).length) {
    await c.get("db").update(schema.user).set(patch).where(eq(schema.user.id, c.get("user").id));
  }
  return c.json({ ok: true });
});

// Delete the account and every piece of data tied to it. Asks for the password again.
app.post("/api/account/delete", async (c) => {
  const db = c.get("db");
  const userId = c.get("user").id;
  const { password } = await c.req.json<{ password?: string }>().catch(() => ({}) as never);
  if (!password) return c.json({ error: "Enter your password." }, 400);
  const [acct] = await db
    .select()
    .from(schema.account)
    .where(and(eq(schema.account.userId, userId), eq(schema.account.providerId, "credential")));
  if (!acct?.password || !(await verifyPassword({ hash: acct.password, password }))) {
    return c.json({ error: "Wrong password." }, 403);
  }
  // One batch = one transaction: all or nothing.
  await db.batch([
    db.delete(schema.checkinEvent).where(eq(schema.checkinEvent.userId, userId)),
    db.delete(schema.checkin).where(eq(schema.checkin.userId, userId)),
    db.delete(schema.session).where(eq(schema.session.userId, userId)),
    db.delete(schema.account).where(eq(schema.account.userId, userId)),
    db.delete(schema.user).where(eq(schema.user.id, userId)),
  ]);
  // Clear the login cookie (both the plain and the HTTPS-only name).
  for (const name of ["better-auth.session_token", "__Secure-better-auth.session_token"]) {
    c.header("Set-Cookie", `${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax`, { append: true });
  }
  return c.json({ ok: true });
});

app.route("/api/checkins", checkins);

app.all("/api/*", (c) => c.json({ error: "Not found." }, 404));

export default app;
