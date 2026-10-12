export function dayKey(date: Date, timeZone: string): string {
  // en-CA renders 2026-10-08 with these options.
  return new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function keyToUtc(key: string): number {
  const [y, m, d] = key.split("-").map(Number);
  return Date.UTC(y, m - 1, d);
}

export function shiftKey(key: string, days: number): string {
  return new Date(keyToUtc(key) + days * 86_400_000).toISOString().slice(0, 10);
}

/** 0 for Monday through 6 for Sunday. */
export function weekdayIndex(key: string): number {
  return (new Date(keyToUtc(key)).getUTCDay() + 6) % 7;
}

/** The Monday that starts the week holding `key`. */
export function weekStartKey(key: string): string {
  return shiftKey(key, -weekdayIndex(key));
}

/** Whole days from `from` to `to`; negative when `to` comes first. */
export function daysBetweenKeys(from: string, to: string): number {
  return Math.round((keyToUtc(to) - keyToUtc(from)) / 86_400_000);
}

export function dayLabel(iso: string, now: Date, timeZone: string, locale: string): string {
  const date = new Date(iso);
  const key = dayKey(date, timeZone);
  const today = dayKey(now, timeZone);
  if (key === today) return "Today";
  if (key === shiftKey(today, -1)) return "Yesterday";
  const sameYear = key.slice(0, 4) === today.slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

export function formatTime(iso: string, timeZone: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, { timeZone, hour: "2-digit", minute: "2-digit" }).format(new Date(iso));
}

export function formatDate(iso: string, now: Date, timeZone: string, locale: string): string {
  const date = new Date(iso);
  const sameYear = dayKey(date, timeZone).slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "long",
    ...(sameYear ? {} : { year: "numeric" }),
  }).format(date);
}

/** "3 Oct, 22:10", with the year when it differs from now's. */
export function formatDayTime(iso: string, now: Date, timeZone: string, locale: string): string {
  const date = new Date(iso);
  const sameYear = dayKey(date, timeZone).slice(0, 4) === dayKey(now, timeZone).slice(0, 4);
  return new Intl.DateTimeFormat(locale, {
    timeZone,
    day: "numeric",
    month: "short",
    ...(sameYear ? {} : { year: "numeric" }),
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function groupByDay<T extends { createdAt: string }>(
  items: T[],
  now: Date,
  timeZone: string,
  locale: string,
): Array<{ label: string; items: T[] }> {
  const groups: Array<{ label: string; items: T[] }> = [];
  for (const item of items) {
    const label = dayLabel(item.createdAt, now, timeZone, locale);
    const last = groups[groups.length - 1];
    if (last && last.label === label) last.items.push(item);
    else groups.push({ label, items: [item] });
  }
  return groups;
}
