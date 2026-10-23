export interface Env {
  DB: D1Database;
  ASSETS: Fetcher;
  BETTER_AUTH_SECRET: string;
  BETTER_AUTH_URL?: string;
  ANTHROPIC_API_KEY?: string;
  AI_MODEL: string;
  // Optional. Lower it (minimum 10000) only if sign-in hits the free plan's CPU limit.
  PASSWORD_HASH_ROUNDS?: string;
}
