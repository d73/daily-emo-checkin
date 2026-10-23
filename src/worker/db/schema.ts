import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core";

// ---- Better Auth tables (names and columns follow Better Auth's defaults + username plugin) ----

export const user = sqliteTable("user", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  emailVerified: integer("email_verified", { mode: "boolean" }).notNull().default(false),
  image: text("image"),
  username: text("username").unique(),
  displayUsername: text("display_username"),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  // App settings. Better Auth does not know about these; they have defaults.
  timezone: text("timezone").notNull().default("UTC"),
  // Minutes after local midnight when the user's "today" starts. 360 = 6:00 AM.
  morningStartMinutes: integer("morning_start_minutes").notNull().default(360),
});

export const session = sqliteTable(
  "session",
  {
    id: text("id").primaryKey(),
    expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
    token: text("token").notNull().unique(),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
  },
  (t) => [index("session_user_idx").on(t.userId)],
);

export const account = sqliteTable(
  "account",
  {
    id: text("id").primaryKey(),
    accountId: text("account_id").notNull(),
    providerId: text("provider_id").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    accessToken: text("access_token"),
    refreshToken: text("refresh_token"),
    idToken: text("id_token"),
    accessTokenExpiresAt: integer("access_token_expires_at", { mode: "timestamp_ms" }),
    refreshTokenExpiresAt: integer("refresh_token_expires_at", { mode: "timestamp_ms" }),
    scope: text("scope"),
    password: text("password"),
    createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
    updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
  },
  (t) => [index("account_user_idx").on(t.userId)],
);

export const verification = sqliteTable("verification", {
  id: text("id").primaryKey(),
  identifier: text("identifier").notNull(),
  value: text("value").notNull(),
  expiresAt: integer("expires_at", { mode: "timestamp_ms" }).notNull(),
  createdAt: integer("created_at", { mode: "timestamp_ms" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp_ms" }).notNull(),
});

export const rateLimit = sqliteTable("rate_limit", {
  id: text("id").primaryKey(),
  key: text("key").notNull().unique(),
  count: integer("count").notNull(),
  lastRequest: integer("last_request").notNull(),
});

// ---- App tables ----

// One row per check-in session.
export const checkin = sqliteTable(
  "checkin",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    startedAt: integer("started_at").notNull(), // UTC ms
    lastActivityAt: integer("last_activity_at").notNull(), // UTC ms
    endedAt: integer("ended_at"), // UTC ms, null while open
    timezone: text("timezone").notNull(), // IANA name, e.g. America/Los_Angeles
    day: text("day").notNull(), // YYYY-MM-DD "today", using the user's morning start time
    startScore: integer("start_score").notNull(),
    latestScore: integer("latest_score").notNull(),
    page: text("page").notNull(), // page the user is on now
    round: integer("round").notNull().default(1),
    endReason: text("end_reason"), // grounded | user_ended | crisis
  },
  (t) => [index("checkin_user_started_idx").on(t.userId, t.startedAt)],
);

// Every step of a check-in, in order. The log entry page replays these.
export const checkinEvent = sqliteTable(
  "checkin_event",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    checkinId: text("checkin_id")
      .notNull()
      .references(() => checkin.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    seq: integer("seq").notNull(),
    at: integer("at").notNull(), // UTC ms
    page: text("page").notNull(),
    actor: text("actor").notNull(), // user | app | ai
    text: text("text"),
    score: integer("score"),
    exercise: text("exercise"), // DBT skill key, when an exercise was suggested
  },
  (t) => [index("event_checkin_seq_idx").on(t.checkinId, t.seq)],
);
