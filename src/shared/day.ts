// "Today" starts at the user's morning start time, not at midnight.
// A check-in at 1:30 AM with a 6:00 AM morning start counts for the previous day.

function localParts(utcMs: number, timeZone: string) {
  const fmt = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  });
  const p: Record<string, string> = {};
  for (const part of fmt.formatToParts(new Date(utcMs))) p[part.type] = part.value;
  return { y: +p.year, m: +p.month, d: +p.day, minutes: +p.hour * 60 + +p.minute };
}

export function checkinDay(utcMs: number, timeZone: string, morningStartMinutes: number): string {
  const { y, m, d, minutes } = localParts(utcMs, safeTimeZone(timeZone));
  // Date.UTC handles day 0 => last day of the previous month.
  const date = new Date(Date.UTC(y, m - 1, minutes < morningStartMinutes ? d - 1 : d));
  return date.toISOString().slice(0, 10);
}

export function safeTimeZone(tz: string | undefined | null): string {
  if (!tz) return "UTC";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    return "UTC";
  }
}
