const pad2 = (n: number) => String(n).padStart(2, '0');

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const WEEKDAYS_LONG = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/** Format a Date as YYYY-MM-DD using the local calendar (not UTC). */
export function toISODate(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function todayISO(): string {
  return toISODate(new Date());
}

/** Parse YYYY-MM-DD as local midnight (`new Date(iso)` would be UTC midnight). */
export function parseISODate(iso: string): Date {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(iso: string, delta: number): string {
  const d = parseISODate(iso);
  d.setDate(d.getDate() + delta);
  return toISODate(d);
}

/** The last `days` dates ending at `end`, ascending, inclusive of `end`. */
export function lastNDays(days: number, end: string): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) out.push(addDays(end, -i));
  return out;
}

/** Monday of the week containing `iso`. */
export function startOfWeek(iso: string): string {
  const shift = (parseISODate(iso).getDay() + 6) % 7; // Mon=0 … Sun=6
  return addDays(iso, -shift);
}

/** "Jun 28" */
export function formatMedium(iso: string): string {
  const d = parseISODate(iso);
  return `${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Friday, Jul 3" */
export function formatLong(iso: string): string {
  const d = parseISODate(iso);
  return `${WEEKDAYS_LONG[d.getDay()]}, ${MONTHS[d.getMonth()]} ${d.getDate()}`;
}

/** "Mon" */
export function weekdayShort(iso: string): string {
  return WEEKDAYS[parseISODate(iso).getDay()];
}

/** "Today", "Yesterday", "Jun 28", or "Jun 28, 2025" for other years. */
export function relativeDayLabel(iso: string, today = todayISO()): string {
  if (iso === today) return 'Today';
  if (iso === addDays(today, -1)) return 'Yesterday';
  const d = parseISODate(iso);
  const sameYear = d.getFullYear() === parseISODate(today).getFullYear();
  return sameYear ? formatMedium(iso) : `${formatMedium(iso)}, ${d.getFullYear()}`;
}
