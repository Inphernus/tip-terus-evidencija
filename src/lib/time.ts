// Sva pravila o "danas" vrijede po hrvatskom vremenu, neovisno o satu na uređaju ili serveru.
export const TZ = "Europe/Zagreb";

const dateFmt = new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" });
const timeFmt = new Intl.DateTimeFormat("hr-HR", { timeZone: TZ, hour: "2-digit", minute: "2-digit", hourCycle: "h23" });

/** Datum (YYYY-MM-DD) u Zagrebu za zadani trenutak. */
export function zagrebDate(at: Date = new Date()): string {
  return dateFmt.format(at);
}

/** Vrijeme (HH:MM) u Zagrebu za zadani trenutak. */
export function zagrebTime(at: Date | string): string {
  return timeFmt.format(typeof at === "string" ? new Date(at) : at);
}

function offsetMs(at: Date): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: TZ, hourCycle: "h23",
    year: "numeric", month: "numeric", day: "numeric", hour: "numeric", minute: "numeric", second: "numeric",
  }).formatToParts(at);
  const get = (type: string) => Number(parts.find((p) => p.type === type)!.value);
  const asUtc = Date.UTC(get("year"), get("month") - 1, get("day"), get("hour"), get("minute"), get("second"));
  return asUtc - Math.floor(at.getTime() / 1000) * 1000;
}

/** Pretvara zagrebački datum + vrijeme (HH:MM) u stvarni trenutak. */
export function zagrebToDate(date: string, time: string): Date {
  const [y, m, d] = date.split("-").map(Number);
  const [hh, mm] = time.split(":").map(Number);
  const guess = Date.UTC(y, m - 1, d, hh, mm);
  const first = guess - offsetMs(new Date(guess));
  return new Date(guess - offsetMs(new Date(first)));
}

export function isValidTime(value: string): boolean {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

/** Svi datumi (YYYY-MM-DD) od `from` do `to`, uključivo. */
export function dateRange(from: string, to: string): string[] {
  const out: string[] = [];
  const cur = new Date(`${from}T12:00:00Z`);
  const end = new Date(`${to}T12:00:00Z`);
  while (cur <= end) {
    out.push(cur.toISOString().slice(0, 10));
    cur.setUTCDate(cur.getUTCDate() + 1);
  }
  return out;
}

const WEEKDAYS = ["ned", "pon", "uto", "sri", "čet", "pet", "sub"];
export function weekdayShort(date: string): string {
  return WEEKDAYS[new Date(`${date}T12:00:00Z`).getUTCDay()];
}

/** "16.10.2026." */
export function formatDate(date: string): string {
  const [y, m, d] = date.split("-");
  return `${Number(d)}.${Number(m)}.${y}.`;
}

/** "2026-10" iz query parametra; ne dopušta budući mjesec. */
export function parseMonth(value: unknown, currentMonth: string): string {
  return typeof value === "string" && /^\d{4}-\d{2}$/.test(value) && value <= currentMonth ? value : currentMonth;
}

export function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1 + delta, 1)).toISOString().slice(0, 7);
}

/** Prvi i zadnji dan mjeseca; tekući mjesec završava s danas. */
export function monthRange(month: string, today: string): [string, string] {
  const [y, m] = month.split("-").map(Number);
  const last = `${month}-${String(new Date(Date.UTC(y, m, 0)).getUTCDate()).padStart(2, "0")}`;
  return [`${month}-01`, last < today ? last : today];
}

export function monthLabel(month: string): string {
  const [y, m] = month.split("-").map(Number);
  return `${MONTHS[m - 1]} ${y}.`;
}

export const MONTHS = [
  "siječanj", "veljača", "ožujak", "travanj", "svibanj", "lipanj",
  "srpanj", "kolovoz", "rujan", "listopad", "studeni", "prosinac",
];

/** Ispravan kalendarski datum u obliku YYYY-MM-DD (odbija npr. 2026-02-31). */
export function isValidDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const d = new Date(`${value}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === value;
}

export function isSunday(date: string): boolean {
  return new Date(`${date}T12:00:00Z`).getUTCDay() === 0;
}
