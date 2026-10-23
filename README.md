# Daily Check-in

A short daily check-in on how you feel, with a log of every session.
Web app (installable PWA) on Cloudflare: React screens + one Worker (Hono) + D1 database.
AI (Claude Sonnet 5.5) is called only from the server, on the Talk More and Exercise pages.

## Flow

Check-in score (1-10) → Feeling (2-5 words) → What is making you feel this way (2+ words) →
Talk or exercise? → Tell me more (chat) **or** a DBT exercise → How are you feeling now? →
back to Feeling, or, once the score is 2+ points above the start, "Thank you for sharing, end?".
"End check-in" is on every page. Every step is saved as it happens (Logs tab replays it).

Safety: every text entry is checked against a crisis phrase list on the server, and the AI also
flags crisis on its pages. Either one stops the check-in and shows crisis resources (US: 988, 741741, 911).
A "Need help now?" button is on every screen.

## Run it locally (Windows, macOS or Linux)

Needs Node.js 20 or newer.

```sh
npm install
cp .dev.vars.example .dev.vars        # Windows: copy .dev.vars.example .dev.vars
npm run db:migrate:local
npm run dev                           # open http://localhost:5173
```

With no `ANTHROPIC_API_KEY` in `.dev.vars`, the AI runs in **practice mode** (canned replies, labeled on screen).

Tests:

```sh
npm test            # unit tests
npm run test:e2e    # browser tests against the dev server (Playwright)
npm run typecheck
```

## Deploy to Cloudflare (first time)

```sh
npx wrangler login
npx wrangler d1 create daily-emo-checkin      # copy the database_id into wrangler.jsonc
npm run db:migrate:remote
npx wrangler secret put BETTER_AUTH_SECRET     # any random string, 32+ characters
npx wrangler secret put BETTER_AUTH_URL        # e.g. https://daily-emo-checkin.<you>.workers.dev
npx wrangler secret put ANTHROPIC_API_KEY      # from console.anthropic.com
npm run deploy
```

Always deploy with `npm run deploy`: it builds the app first, then uploads it.
Running `npx wrangler deploy` on its own skips the build and fails with
"The directory specified by the assets.directory field ... does not exist".

If you deploy from GitHub with Cloudflare's Git integration (Workers Builds), set:
- Build command: `npm run build`
- Deploy command: `npx wrangler deploy`

Set a monthly spending limit in the Anthropic console before sharing the app with anyone.

## Settings worth knowing

| Name | Where | Default | What it does |
|---|---|---|---|
| `AI_MODEL` | `wrangler.jsonc` vars | `claude-sonnet-5-5` | Claude model used for Talk More and Exercise |
| `PASSWORD_HASH_ROUNDS` | var (optional) | `100000` | Password hashing strength. Lower (min 10000) only if sign-in fails with a CPU-limit error on the free plan |

## Code map

- `src/client/` React screens (tabs: Check-in, Logs, Settings)
- `src/worker/index.ts` API routes, settings, delete account
- `src/worker/checkins.ts` check-in flow; the server decides the next page
- `src/worker/ai.ts` Claude calls (structured output: reply + crisis flag) and practice mode
- `src/worker/dbt.ts` fixed list of 12 DBT skills the AI picks from
- `src/shared/` rules shared by screens and server (word limits, crisis phrases, "today")
- `src/worker/db/schema.ts` database tables; `migrations/` generated SQL (`npm run db:generate`)
