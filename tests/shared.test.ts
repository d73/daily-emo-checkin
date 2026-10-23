import { describe, expect, it } from "vitest";
import { checkWords, countWords } from "../src/shared/flow";
import { looksLikeCrisis } from "../src/shared/crisis";
import { checkinDay } from "../src/shared/day";
import { hashPassword, verifyPassword } from "../src/worker/password";

describe("word rules", () => {
  it("counts words", () => {
    expect(countWords("  tired   and  sad ")).toBe(3);
    expect(countWords("")).toBe(0);
  });
  it("needs 2 words everywhere", () => {
    expect(checkWords("feeling", "tired")).toMatch(/at least 2/);
    expect(checkWords("talk", "work stress")).toBeNull();
  });
  it("caps only the feeling page at 5 words", () => {
    expect(checkWords("feeling", "one two three four five")).toBeNull();
    expect(checkWords("feeling", "one two three four five six")).toMatch(/5 words or fewer/);
    expect(checkWords("talk", "one two three four five six seven")).toBeNull();
    expect(checkWords("talk-more", "a ".repeat(200))).toBeNull();
  });
});

describe("crisis check", () => {
  it.each([
    "I don't want to be here anymore",
    "I dont want to live",
    "thinking about suicide",
    "I want to die",
    "I might hurt myself",
    "self-harm again",
    "Everyone would be better off without me",
  ])("flags: %s", (t) => expect(looksLikeCrisis(t)).toBe(true));

  it.each(["tired and stressed", "work is killing me lately", "I want to diet", "my overdue bills"])(
    "does not flag: %s",
    (t) => expect(looksLikeCrisis(t)).toBe(false),
  );
});

describe("today with a morning start time", () => {
  const LA = "America/Los_Angeles";
  it("counts a check-in before the morning start as the previous day", () => {
    // 2026-10-23 01:30 in Los Angeles (PDT, UTC-7) = 08:30 UTC
    expect(checkinDay(Date.UTC(2026, 9, 23, 8, 30), LA, 360)).toBe("2026-10-22");
  });
  it("counts a check-in after the morning start as that day", () => {
    // 2026-10-23 07:00 PDT = 14:00 UTC
    expect(checkinDay(Date.UTC(2026, 9, 23, 14, 0), LA, 360)).toBe("2026-10-23");
  });
  it("crosses month boundaries", () => {
    // 2026-11-01 02:00 PDT = 09:00 UTC
    expect(checkinDay(Date.UTC(2026, 10, 1, 9, 0), LA, 360)).toBe("2026-10-31");
  });
  it("falls back to UTC for a bad time zone", () => {
    expect(checkinDay(Date.UTC(2026, 9, 23, 12, 0), "Not/AZone", 360)).toBe("2026-10-23");
  });
});

describe("password hashing", () => {
  it("verifies the right password and rejects the wrong one", async () => {
    const h = await hashPassword("correct horse battery");
    expect(h.startsWith("pbkdf2-sha256$100000$")).toBe(true);
    expect(await verifyPassword({ hash: h, password: "correct horse battery" })).toBe(true);
    expect(await verifyPassword({ hash: h, password: "wrong password" })).toBe(false);
    expect(await verifyPassword({ hash: "garbage", password: "x" })).toBe(false);
  });
});
