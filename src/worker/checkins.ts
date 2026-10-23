import { Hono } from "hono";
import { and, desc, eq, isNull, max } from "drizzle-orm";
import type { DrizzleD1Database } from "drizzle-orm/d1";
import * as schema from "./db/schema";
import { checkin, checkinEvent } from "./db/schema";
import {
  ABANDON_AFTER_MS,
  GROUNDED_RISE,
  PROMPTS,
  checkWords,
  isScore,
  type EndReason,
  type Page,
  type Status,
} from "../shared/flow";
import { looksLikeCrisis } from "../shared/crisis";
import { checkinDay, safeTimeZone } from "../shared/day";
import { getSkill } from "./dbt";
import { suggestExercise, talkReply, type AiContext } from "./ai";
import type { AppEnv } from "./index";

type Db = DrizzleD1Database<typeof schema>;
type CheckinRow = typeof checkin.$inferSelect;
type EventRow = typeof checkinEvent.$inferSelect;
type NewEvent = Omit<typeof checkinEvent.$inferInsert, "checkinId" | "userId" | "seq" | "at">;

export const checkins = new Hono<AppEnv>();

function statusOf(c: CheckinRow, now = Date.now()): Status {
  if (c.endReason) return c.endReason as EndReason;
  return now - c.lastActivityAt > ABANDON_AFTER_MS ? "not_finished" : "open";
}

function view(c: CheckinRow) {
  return {
    id: c.id,
    page: c.page as Page,
    startScore: c.startScore,
    latestScore: c.latestScore,
    round: c.round,
    startedAt: c.startedAt,
    endedAt: c.endedAt,
    timezone: c.timezone,
    day: c.day,
    status: statusOf(c),
  };
}

function prompt(page: Page): NewEvent {
  return { page, actor: "app", text: PROMPTS[page] };
}

/** Appends events in order and updates the check-in, in one batch. */
async function save(db: Db, c: CheckinRow, events: NewEvent[], patch: Partial<CheckinRow> = {}) {
  const now = Date.now();
  const [{ last }] = await db
    .select({ last: max(checkinEvent.seq) })
    .from(checkinEvent)
    .where(eq(checkinEvent.checkinId, c.id));
  let seq = last ?? 0;
  const rows = events.map((e) => ({ ...e, checkinId: c.id, userId: c.userId, seq: ++seq, at: now }));
  const next = { ...c, ...patch, lastActivityAt: now };
  const update = db.update(checkin).set({ ...patch, lastActivityAt: now }).where(eq(checkin.id, c.id));
  if (rows.length) await db.batch([db.insert(checkinEvent).values(rows), update]);
  else await update;
  return next;
}

async function loadEvents(db: Db, id: string): Promise<EventRow[]> {
  return db.select().from(checkinEvent).where(eq(checkinEvent.checkinId, id)).orderBy(checkinEvent.seq);
}

function aiContext(c: CheckinRow, events: EventRow[]): AiContext {
  return {
    startScore: c.startScore,
    latestScore: c.latestScore,
    entries: events.map((e) => ({ page: e.page, actor: e.actor, text: e.text, score: e.score })),
  };
}

/** Extra data a page needs to show itself (also used when resuming). */
function pageData(c: CheckinRow, events: EventRow[]) {
  // Events since the app last showed this page's prompt.
  let start = 0;
  for (let i = events.length - 1; i >= 0; i--) {
    if (events[i].actor === "app" && events[i].page === c.page) {
      start = i;
      break;
    }
  }
  const visit = events.slice(start);
  if (c.page === "exercise") {
    const ai = visit.find((e) => e.actor === "ai" && e.exercise);
    if (ai?.exercise) {
      const skill = getSkill(ai.exercise);
      return { exercise: { key: skill.key, name: skill.name, steps: skill.steps, intro: ai.text ?? "" } };
    }
  }
  if (c.page === "talk-more") {
    return {
      messages: visit
        .filter((e) => e.actor !== "app" && e.text)
        .map((e) => ({ actor: e.actor as "user" | "ai", text: e.text as string })),
    };
  }
  return {};
}

async function toCrisis(db: Db, c: CheckinRow, events: NewEvent[]) {
  const now = Date.now();
  return save(
    db,
    c,
    [...events, { page: "crisis", actor: "app", text: "Support resources shown. Check-in ended." }],
    { page: "crisis", endReason: "crisis", endedAt: now },
  );
}

async function getOwned(db: Db, userId: string, id: string) {
  const [row] = await db
    .select()
    .from(checkin)
    .where(and(eq(checkin.id, id), eq(checkin.userId, userId)));
  return row;
}

// Start a check-in with the first score.
checkins.post("/", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  const body = await c.req.json<{ score?: unknown; timezone?: string }>().catch(() => ({}) as never);
  if (!isScore(body.score)) return c.json({ error: "Pick a number from 1 to 10." }, 400);
  const tz = safeTimeZone(body.timezone ?? user.timezone);
  const now = Date.now();

  const row: CheckinRow = {
    id: crypto.randomUUID(),
    userId: user.id,
    startedAt: now,
    lastActivityAt: now,
    endedAt: null,
    timezone: tz,
    day: checkinDay(now, tz, user.morningStartMinutes),
    startScore: body.score,
    latestScore: body.score,
    page: "feeling",
    round: 1,
    endReason: null,
  };
  // Close any older open check-in so only one is in progress.
  await db
    .update(checkin)
    .set({ endReason: "user_ended", endedAt: now })
    .where(and(eq(checkin.userId, user.id), isNull(checkin.endReason)));
  await db.insert(checkin).values(row);
  if (tz !== user.timezone) await db.update(schema.user).set({ timezone: tz }).where(eq(schema.user.id, user.id));
  const saved = await save(db, row, [
    prompt("checkin"),
    { page: "checkin", actor: "user", score: body.score },
    prompt("feeling"),
  ]);
  return c.json({ checkin: view(saved), data: {} });
});

// One step of the flow. The server decides the next page.
checkins.post("/:id/step", async (c) => {
  const db = c.get("db");
  const user = c.get("user");
  let row = await getOwned(db, user.id, c.req.param("id"));
  if (!row) return c.json({ error: "Check-in not found." }, 404);
  if (row.endReason) return c.json({ error: "This check-in has ended.", checkin: view(row) }, 409);

  const body = await c.req
    .json<{ page?: string; text?: string; score?: unknown; choice?: string; action?: string }>()
    .catch(() => ({}) as never);
  if (body.page !== row.page) {
    const events = await loadEvents(db, row.id);
    return c.json({ error: "Out of step. Showing the current page.", checkin: view(row), data: pageData(row, events) }, 409);
  }
  const page = row.page as Page;
  const text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";

  // Free-text pages: word rules first, then the crisis check, before anything else.
  if (page === "feeling" || page === "talk" || (page === "talk-more" && body.action !== "done")) {
    const err = checkWords(page, text);
    if (err) return c.json({ error: err }, 400);
    const answer: NewEvent = { page, actor: "user", text };
    if (looksLikeCrisis(text)) {
      row = await toCrisis(db, row, [answer]);
      return c.json({ checkin: view(row), data: {} });
    }
    if (page === "feeling") row = await save(db, row, [answer, prompt("talk")], { page: "talk" });
    else if (page === "talk") row = await save(db, row, [answer, prompt("choice")], { page: "choice" });
    else {
      row = await save(db, row, [answer]);
      const events = await loadEvents(db, row.id);
      const ai = await talkReply(c.env, aiContext(row, events));
      if (ai.crisis) {
        row = await toCrisis(db, row, [{ page, actor: "app", text: "The AI flagged a possible crisis." }]);
        return c.json({ checkin: view(row), data: {} });
      }
      row = await save(db, row, [{ page, actor: "ai", text: ai.reply }]);
      return c.json({ checkin: view(row), data: pageData(row, await loadEvents(db, row.id)), practice: ai.practice });
    }
    return c.json({ checkin: view(row), data: {} });
  }

  switch (page) {
    case "choice": {
      if (body.choice !== "talk" && body.choice !== "exercise") return c.json({ error: "Pick talk or exercise." }, 400);
      const answer: NewEvent = {
        page,
        actor: "user",
        text: body.choice === "talk" ? "Talk about it" : "Try an exercise",
      };
      if (body.choice === "talk") {
        row = await save(db, row, [answer, prompt("talk-more")], { page: "talk-more" });
        return c.json({ checkin: view(row), data: { messages: [] } });
      }
      row = await save(db, row, [answer]);
      const ai = await suggestExercise(c.env, aiContext(row, await loadEvents(db, row.id)));
      if (ai.crisis) {
        row = await toCrisis(db, row, [{ page, actor: "app", text: "The AI flagged a possible crisis." }]);
        return c.json({ checkin: view(row), data: {} });
      }
      row = await save(
        db,
        row,
        [prompt("exercise"), { page: "exercise", actor: "ai", text: ai.intro, exercise: ai.skill.key }],
        { page: "exercise" },
      );
      return c.json({ checkin: view(row), data: pageData(row, await loadEvents(db, row.id)), practice: ai.practice });
    }
    case "talk-more":
    case "exercise": {
      if (body.action !== "done") return c.json({ error: "Unknown action." }, 400);
      row = await save(
        db,
        row,
        [{ page, actor: "user", text: page === "exercise" ? "Done with the exercise" : "Done talking" }, prompt("feeling-now")],
        { page: "feeling-now" },
      );
      return c.json({ checkin: view(row), data: {} });
    }
    case "feeling-now": {
      if (!isScore(body.score)) return c.json({ error: "Pick a number from 1 to 10." }, 400);
      const answer: NewEvent = { page, actor: "user", score: body.score };
      if (body.score - row.startScore >= GROUNDED_RISE) {
        row = await save(db, row, [answer, prompt("grounded")], { page: "grounded", latestScore: body.score });
      } else {
        row = await save(db, row, [answer, prompt("feeling")], {
          page: "feeling",
          latestScore: body.score,
          round: row.round + 1,
        });
      }
      return c.json({ checkin: view(row), data: {} });
    }
    case "grounded": {
      if (body.action === "continue") {
        row = await save(db, row, [{ page, actor: "user", text: "Keep going" }, prompt("feeling")], {
          page: "feeling",
          round: row.round + 1,
        });
        return c.json({ checkin: view(row), data: {} });
      }
      return c.json({ error: "Unknown action." }, 400);
    }
    default:
      return c.json({ error: "Nothing to do on this page." }, 400);
  }
});

// End a check-in at any point.
checkins.post("/:id/end", async (c) => {
  const db = c.get("db");
  let row = await getOwned(db, c.get("user").id, c.req.param("id"));
  if (!row) return c.json({ error: "Check-in not found." }, 404);
  if (row.endReason) return c.json({ checkin: view(row), data: {} });
  const reason: EndReason = row.latestScore - row.startScore >= GROUNDED_RISE ? "grounded" : "user_ended";
  row = await save(db, row, [{ page: row.page, actor: "user", text: "Ended the check-in" }, prompt("ended")], {
    page: "ended",
    endReason: reason,
    endedAt: Date.now(),
  });
  return c.json({ checkin: view(row), data: {} });
});

// The check-in in progress, if any (for resuming after closing the app).
checkins.get("/current", async (c) => {
  const db = c.get("db");
  const [row] = await db
    .select()
    .from(checkin)
    .where(and(eq(checkin.userId, c.get("user").id), isNull(checkin.endReason)))
    .orderBy(desc(checkin.startedAt))
    .limit(1);
  if (!row || statusOf(row) !== "open") return c.json({ checkin: null });
  return c.json({ checkin: view(row), data: pageData(row, await loadEvents(db, row.id)) });
});

// Logs tab: all check-ins, newest first.
checkins.get("/", async (c) => {
  const rows = await c
    .get("db")
    .select()
    .from(checkin)
    .where(eq(checkin.userId, c.get("user").id))
    .orderBy(desc(checkin.startedAt))
    .limit(500);
  return c.json({ checkins: rows.map(view) });
});

// One log entry with every step.
checkins.get("/:id", async (c) => {
  const db = c.get("db");
  const row = await getOwned(db, c.get("user").id, c.req.param("id"));
  if (!row) return c.json({ error: "Check-in not found." }, 404);
  const events = await loadEvents(db, row.id);
  return c.json({
    checkin: view(row),
    events: events.map((e) => ({
      seq: e.seq,
      at: e.at,
      page: e.page,
      actor: e.actor,
      text: e.text,
      score: e.score,
      exercise: e.exercise ? { key: e.exercise, name: getSkill(e.exercise).name, steps: getSkill(e.exercise).steps } : null,
    })),
  });
});
