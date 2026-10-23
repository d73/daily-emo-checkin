import { execSync } from "node:child_process";

// Each test signs up a new user, which trips the sign-up rate limit. Clear it first.
export default function globalSetup() {
  execSync('npx wrangler d1 execute daily-emo-checkin --local --command "DELETE FROM rate_limit"', { stdio: "ignore" });
}
