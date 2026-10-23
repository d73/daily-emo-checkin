// Rules shared by the screens and the server, so both agree.

export const PAGES = [
  "checkin",
  "feeling",
  "talk",
  "choice",
  "talk-more",
  "exercise",
  "feeling-now",
  "grounded",
  "crisis",
  "ended",
] as const;
export type Page = (typeof PAGES)[number];

export const PROMPTS: Record<Page, string> = {
  checkin: "How are you feeling today?",
  feeling: "Use 2-3 words to describe your feelings.",
  talk: "What is making you feel this way?",
  choice: "Would you like to talk about it or try an exercise?",
  "talk-more": "Tell me more.",
  exercise: "Here is an exercise to try.",
  "feeling-now": "How are you feeling now?",
  grounded: "Thank you for sharing. Would you like to end this check-in?",
  crisis: "It sounds like you may be going through something really hard.",
  ended: "Check-in ended.",
};

export const MIN_WORDS = 2;
export const FEELING_MAX_WORDS = 5;
// Offer to end once the score is this many points above the starting score.
export const GROUNDED_RISE = 2;
// An open check-in with no activity for this long counts as not finished.
export const ABANDON_AFTER_MS = 2 * 60 * 60 * 1000;

export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function wordRule(page: Page): { min: number; max: number | null } {
  return { min: MIN_WORDS, max: page === "feeling" ? FEELING_MAX_WORDS : null };
}

/** Returns an error message, or null when the text is acceptable for this page. */
export function checkWords(page: Page, text: string): string | null {
  const n = countWords(text);
  const { min, max } = wordRule(page);
  if (n < min) return `Please write at least ${min} words.`;
  if (max !== null && n > max) return `Please use ${max} words or fewer.`;
  return null;
}

export function isScore(n: unknown): n is number {
  return typeof n === "number" && Number.isInteger(n) && n >= 1 && n <= 10;
}

export type EndReason = "grounded" | "user_ended" | "crisis";
export type Status = EndReason | "open" | "not_finished";

export const STATUS_LABEL: Record<Status, string> = {
  grounded: "Ended feeling better",
  user_ended: "Ended",
  crisis: "Ended: support resources shown",
  open: "In progress",
  not_finished: "Not finished",
};
