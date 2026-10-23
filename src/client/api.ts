import type { Page, Status } from "../shared/flow";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public body: Record<string, unknown>,
  ) {
    super(message);
  }
}

export async function api<T>(path: string, init?: { method?: string; body?: unknown }): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    body: init?.body ? JSON.stringify(init.body) : undefined,
    credentials: "same-origin",
  });
  const data = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) throw new ApiError(res.status, (data.error as string) ?? "Something went wrong.", data);
  return data as T;
}

export const localTimeZone = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export type Checkin = {
  id: string;
  page: Page;
  startScore: number;
  latestScore: number;
  round: number;
  startedAt: number;
  endedAt: number | null;
  timezone: string;
  day: string;
  status: Status;
};

export type Exercise = { key: string; name: string; steps: string[]; intro: string };
export type ChatMessage = { actor: "user" | "ai"; text: string };
export type PageData = { exercise?: Exercise; messages?: ChatMessage[] };
export type StepResponse = { checkin: Checkin; data: PageData; practice?: boolean };

export type Me = {
  username: string;
  email: string;
  timezone: string;
  morningStartMinutes: number;
  aiConnected: boolean;
};

export type LogEvent = {
  seq: number;
  at: number;
  page: Page;
  actor: "user" | "app" | "ai";
  text: string | null;
  score: number | null;
  exercise: { key: string; name: string; steps: string[] } | null;
};

export function formatDateTime(ms: number) {
  return new Date(ms).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(ms: number) {
  return new Date(ms).toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

export function formatDay(day: string) {
  const [y, m, d] = day.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" });
}
