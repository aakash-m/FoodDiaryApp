// Local-date helpers. Dates are keyed as 'YYYY-MM-DD' strings in local time.

export type DateKey = string;

const pad = (n: number) => String(n).padStart(2, '0');

export function toKey(d: Date): DateKey {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function fromKey(key: DateKey): Date {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function todayKey(): DateKey {
  return toKey(new Date());
}

/** True for a real calendar date written as YYYY-MM-DD (rejects 2026-02-30, 2026-1-5, …). */
export function isDateKey(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && toKey(fromKey(value)) === value;
}

export function addDays(key: DateKey, days: number): DateKey {
  const d = fromKey(key);
  d.setDate(d.getDate() + days);
  return toKey(d);
}

export function diffDays(a: DateKey, b: DateKey): number {
  return Math.round((fromKey(b).getTime() - fromKey(a).getTime()) / 86_400_000);
}

/** dd.MM.yyyy */
export function formatDate(key: DateKey): string {
  const [y, m, d] = key.split('-');
  return `${d}.${m}.${y}`;
}

/** dd.MM */
export function formatShortDate(key: DateKey): string {
  const [, m, d] = key.split('-');
  return `${d}.${m}`;
}

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];

export function weekdayName(key: DateKey): string {
  return WEEKDAYS[fromKey(key).getDay()];
}

export function weekdayShort(key: DateKey): string {
  return weekdayName(key).slice(0, 3);
}

export function monthLabel(year: number, month: number): string {
  return `${MONTHS[month]} ${year}`;
}

/** ISO 8601 week number. */
export function isoWeek(key: DateKey): number {
  const d = fromKey(key);
  const day = (d.getDay() + 6) % 7; // Monday = 0
  d.setDate(d.getDate() - day + 3); // Thursday of this week
  const firstThursday = new Date(d.getFullYear(), 0, 4);
  const firstDay = (firstThursday.getDay() + 6) % 7;
  firstThursday.setDate(firstThursday.getDate() - firstDay + 3);
  return 1 + Math.round((d.getTime() - firstThursday.getTime()) / (7 * 86_400_000));
}

/** "Week 40" or "Weeks 40–41" for a range spanning two ISO weeks. */
export function weekLabel(start: DateKey, end: DateKey): string {
  const a = isoWeek(start);
  const b = isoWeek(end);
  return a === b ? `Week ${a}` : `Weeks ${a}–${b}`;
}

export function startOfIsoWeek(key: DateKey): DateKey {
  const day = (fromKey(key).getDay() + 6) % 7;
  return addDays(key, -day);
}

/** Calendar cells (Sunday-first, as in the Calendar mockup) for a month, padded with neighbouring days. */
export function monthGrid(year: number, month: number): { key: DateKey; inMonth: boolean }[] {
  const first = new Date(year, month, 1);
  const start = addDays(toKey(first), -first.getDay());
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = Math.ceil((first.getDay() + daysInMonth) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => {
    const key = addDays(start, i);
    return { key, inMonth: fromKey(key).getMonth() === month };
  });
}
