import { expect, test, type Page } from "@playwright/test";

const password = "test-password-123";

async function signUp(page: Page) {
  const name = `user${Date.now()}${Math.floor(Math.random() * 1000)}`;
  await page.goto("/");
  await page.getByRole("button", { name: "New here? Create an account" }).click();
  await page.getByLabel("Username").fill(name);
  await page.getByLabel(/Email/).fill(`${name}@example.com`);
  await page.getByLabel(/Password/).fill(password);
  await page.getByRole("button", { name: "Create account" }).click();
  await expect(page.getByRole("heading", { name: "How are you feeling today?" })).toBeVisible();
  return name;
}

async function answer(page: Page, text: string, button = "Next") {
  await page.getByLabel("Your answer").fill(text);
  await page.getByRole("button", { name: button }).click();
}

test("full check-in: talk path, exercise path, grounded end, logs, delete account", async ({ page }) => {
  await signUp(page);

  // Start at 4.
  await page.getByRole("button", { name: "4", exact: true }).click();
  await expect(page.getByRole("heading", { name: /2-3 words/ })).toBeVisible();

  // Next is hidden under 2 words, shown at 2, hidden again over 5.
  await page.getByLabel("Your answer").fill("tired");
  await expect(page.getByRole("button", { name: "Next" })).toHaveCount(0);
  await page.getByLabel("Your answer").fill("one two three four five six");
  await expect(page.getByText("Please use 5 words or fewer.")).toBeVisible();
  await answer(page, "tired and stressed");

  await expect(page.getByRole("heading", { name: "What is making you feel this way?" })).toBeVisible();
  await answer(page, "work deadline this week");

  // Talk path.
  await page.getByRole("button", { name: "Talk about it" }).click();
  await expect(page.getByRole("heading", { name: "Tell me more." })).toBeVisible();
  await expect(page.getByText(/Practice mode/)).toBeVisible();
  await answer(page, "my manager moved the deadline up two days", "Send");
  await expect(page.locator(".bubble.ai")).toHaveCount(1);
  await page.getByRole("button", { name: "I'm done talking" }).click();

  // Up only 1 point: loops back to the feeling page.
  await expect(page.getByRole("heading", { name: "How are you feeling now?" })).toBeVisible();
  await page.getByRole("button", { name: "5", exact: true }).click();
  await expect(page.getByRole("heading", { name: /2-3 words/ })).toBeVisible();
  await answer(page, "a bit calmer");
  await answer(page, "still worried about work");

  // Exercise path.
  await page.getByRole("button", { name: "Try an exercise" }).click();
  await expect(page.locator("ol.steps li").first()).toBeVisible();
  await page.getByRole("button", { name: "I'm done" }).click();

  // Up 3 points from the start: offer to end.
  await page.getByRole("button", { name: "7", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Thank you for sharing." })).toBeVisible();
  await page.getByRole("button", { name: "End check-in" }).click();
  await expect(page.getByRole("heading", { name: "Thanks for checking in." })).toBeVisible();

  // Logs tab lists it; the entry replays every step.
  await page.getByRole("link", { name: "Logs", exact: true }).click();
  const entry = page.locator(".log-list a").first();
  await expect(entry).toContainText("4 → 7");
  await expect(entry).toContainText("Ended feeling better");
  await entry.click();
  await expect(page.getByText("tired and stressed")).toBeVisible();
  await expect(page.getByText("Talk about it", { exact: true })).toBeVisible();
  await expect(page.getByText(/Exercise: /)).toBeVisible();
  await expect(page.getByText("Score: 7 / 10")).toBeVisible();
  await page.screenshot({ path: "test-results/log-detail.png", fullPage: true });

  // Settings: morning start, then delete account.
  await page.getByRole("link", { name: "Settings", exact: true }).click();
  await page.getByLabel("My morning starts at").fill("07:30");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByRole("button", { name: "Saved" })).toBeVisible();
  await page.getByRole("button", { name: "Delete my account and all data" }).click();
  await page.getByLabel("Password").fill("wrong-password");
  await page.getByLabel("Type DELETE to confirm").fill("DELETE");
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByText("Wrong password.")).toBeVisible();
  await page.getByLabel("Password").fill(password);
  await page.getByRole("button", { name: "Delete forever" }).click();
  await expect(page.getByRole("heading", { name: "Sign in" })).toBeVisible();
});

test("crisis words stop the flow and show support resources", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "2", exact: true }).click();
  await answer(page, "hopeless and empty");
  await answer(page, "I don't want to be here anymore");
  await expect(page.getByRole("heading", { name: "You don't have to go through this alone." })).toBeVisible();
  await expect(page.getByRole("link", { name: "Call or text 988" })).toBeVisible();
  await page.screenshot({ path: "test-results/crisis.png", fullPage: true });

  await page.getByRole("link", { name: "Logs", exact: true }).click();
  await expect(page.locator(".log-list a").first()).toContainText("support resources shown");
});

test("an unfinished check-in resumes after reload", async ({ page }) => {
  await signUp(page);
  await page.getByRole("button", { name: "6", exact: true }).click();
  await answer(page, "okay but restless");
  await page.reload();
  await expect(page.getByRole("heading", { name: "What is making you feel this way?" })).toBeVisible();
});

test("signed-out API calls are refused", async ({ request }) => {
  const res = await request.get("/api/checkins");
  expect(res.status()).toBe(401);
});
