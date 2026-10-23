import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { username } from "better-auth/plugins";
import { drizzle } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import type { Env } from "./env";
import { MAX_ROUNDS, hashPassword, verifyPassword } from "./password";

function createAuth(env: Env) {
  const rounds = Math.min(Math.max(Number(env.PASSWORD_HASH_ROUNDS) || MAX_ROUNDS, 10_000), MAX_ROUNDS);
  const db = drizzle(env.DB, { schema });
  return betterAuth({
    secret: env.BETTER_AUTH_SECRET,
    baseURL: env.BETTER_AUTH_URL,
    basePath: "/api/auth",
    database: drizzleAdapter(db, {
      provider: "sqlite",
      schema: {
        user: schema.user,
        session: schema.session,
        account: schema.account,
        verification: schema.verification,
        rateLimit: schema.rateLimit,
      },
    }),
    emailAndPassword: {
      enabled: true,
      minPasswordLength: 8,
      password: { hash: (pw) => hashPassword(pw, rounds), verify: verifyPassword },
    },
    plugins: [username({ minUsernameLength: 3, maxUsernameLength: 30 })],
    session: {
      expiresIn: 60 * 60 * 24 * 30, // 30 days
      updateAge: 60 * 60 * 24, // refresh once a day
    },
    rateLimit: {
      enabled: true,
      storage: "database",
      window: 60,
      max: 100,
      // Slow down password guessing: 5 tries per 15 minutes per IP address.
      customRules: {
        "/sign-in/username": { window: 15 * 60, max: 5 },
        "/sign-in/email": { window: 15 * 60, max: 5 },
        "/sign-up/email": { window: 60 * 60, max: 5 },
      },
    },
    advanced: {
      ipAddress: { ipAddressHeaders: ["cf-connecting-ip"] },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;

// Env is the same for every request an isolate serves, so build once per isolate.
let cached: { env: Env; auth: Auth } | null = null;
export function getAuth(env: Env): Auth {
  if (!cached || cached.env !== env) cached = { env, auth: createAuth(env) };
  return cached.auth;
}
