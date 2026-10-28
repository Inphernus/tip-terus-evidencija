import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ABSENCE_HOURS, ABSENCE_TYPES, DAILY_LIMIT, WEEKLY_LIMIT, entryHours, type Absence, type AbsenceType, type TimeEntry } from "@/lib/hours";
import { addDays, dateRange, isSunday, mondayOf, zagrebDate } from "@/lib/time";

export type Employee = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  active: boolean;
};

/** Djelatnici (bez admina), abecedno po prezimenu. */
export async function loadEmployees({ includeInactive = false } = {}): Promise<Employee[]> {
  let query = createSupabaseAdmin()
    .from("profiles")
    .select("id, first_name, last_name, email, active")
    .eq("role", "employee")
    .order("last_name")
    .order("first_name");
  if (!includeInactive) query = query.eq("active", true);
  const { data } = await query;
  return (data ?? []) as Employee[];
}

export async function loadEmployee(id: string): Promise<Employee | null> {
  const { data } = await createSupabaseAdmin()
    .from("profiles")
    .select("id, first_name, last_name, email, active")
    .eq("id", id)
    .eq("role", "employee")
    .maybeSingle();
  return data as Employee | null;
}

export function fullName(e: Pick<Employee, "first_name" | "last_name">) {
  return `${e.first_name} ${e.last_name}`;
}

export type DaySummary = {
  date: string;
  /** Nedjelja — subota je radni dan. */
  sunday: boolean;
  holiday: string | null;
  absence: Absence["type"] | null;
  entries: TimeEntry[];
  workedHours: number;
  absenceHours: number;
  totalHours: number;
  notes: string[];
  /** Postoji dolazak bez odlaska. */
  unclosed: boolean;
  /** Više od DAILY_LIMIT sati (rad + oznaka) — Jura provjerava. */
  overLimit: boolean;
};

export type PeriodSummary = {
  days: DaySummary[];
  workedHours: number;
  absenceDays: Record<AbsenceType, number>;
  absenceHours: number;
  totalHours: number;
  /** Broj dana s više od DAILY_LIMIT sati. */
  overLimitDays: number;
};

/**
 * Dnevni pregled jednog djelatnika za razdoblje [from, to].
 * Koristi admin klijent — pozivatelj mora prethodno provjeriti ovlasti.
 */
export async function loadPeriod(userId: string, from: string, to: string, now = new Date()): Promise<PeriodSummary> {
  const db = createSupabaseAdmin();
  const [entriesRes, absencesRes, holidaysRes] = await Promise.all([
    db.from("time_entries").select("*").eq("user_id", userId).gte("work_date", from).lte("work_date", to).order("start_at"),
    db.from("absences").select("*").eq("user_id", userId).gte("date", from).lte("date", to),
    db.from("holidays").select("*").gte("date", from).lte("date", to),
  ]);

  const entries = (entriesRes.data ?? []) as TimeEntry[];
  const absences = new Map(((absencesRes.data ?? []) as Absence[]).map((a) => [a.date, a]));
  const holidays = new Map((holidaysRes.data ?? []).map((h: { date: string; name: string }) => [h.date, h.name]));

  const days = dateRange(from, to).map((date): DaySummary => {
    const dayEntries = entries.filter((e) => e.work_date === date);
    const absence = absences.get(date) ?? null;
    const workedHours = dayEntries.reduce((t, e) => t + (e.end_at ? entryHours(e, now) : 0), 0);
    const absenceHours = absence ? ABSENCE_HOURS : 0;
    const notes = [
      ...(absence?.note ? [absence.note] : []),
      ...dayEntries.flatMap((e) => (e.note ? [e.note] : [])),
    ];
    return {
      date,
      sunday: isSunday(date),
      holiday: holidays.get(date) ?? null,
      absence: absence?.type ?? null,
      entries: dayEntries,
      workedHours,
      absenceHours,
      totalHours: workedHours + absenceHours,
      notes,
      unclosed: dayEntries.some((e) => !e.end_at),
      overLimit: workedHours + absenceHours > DAILY_LIMIT + 1e-9,
    };
  });

  const sum = (f: (d: DaySummary) => number) => days.reduce((t, d) => t + f(d), 0);
  return {
    days,
    workedHours: sum((d) => d.workedHours),
    absenceDays: Object.fromEntries(
      ABSENCE_TYPES.map((type) => [type, days.filter((d) => d.absence === type).length]),
    ) as Record<AbsenceType, number>,
    absenceHours: sum((d) => d.absenceHours),
    totalHours: sum((d) => d.totalHours),
    overLimitDays: days.filter((d) => d.overLimit).length,
  };
}

export type WeekSummary = {
  /** Ponedjeljak. */
  start: string;
  /** Nedjelja. */
  end: string;
  hours: number;
  overLimit: boolean;
};

/** Tjedni zbrojevi (pon–ned) od ponedjeljka tjedna `from` do tjedna `to`, iz već učitanih dana. */
export function groupWeeks(days: DaySummary[], from: string, to: string): WeekSummary[] {
  const weeks: WeekSummary[] = [];
  for (let monday = mondayOf(from); monday <= to; monday = addDays(monday, 7)) {
    const end = addDays(monday, 6);
    const hours = days.filter((d) => d.date >= monday && d.date <= end).reduce((t, d) => t + d.totalHours, 0);
    weeks.push({ start: monday, end, hours, overLimit: hours > WEEKLY_LIMIT + 1e-9 });
  }
  return weeks;
}

/**
 * Tjedni zbrojevi (pon–ned) za sve tjedne koji dodiruju [from, to].
 * Tjedni se uvijek računaju cijeli, i kad razdoblje počinje usred tjedna.
 */
export async function loadWeeks(userId: string, from: string, to: string, now = new Date()): Promise<WeekSummary[]> {
  const today = zagrebDate(now);
  const sunday = addDays(mondayOf(to), 6);
  const { days } = await loadPeriod(userId, mondayOf(from), sunday < today ? sunday : today, now);
  return groupWeeks(days, from, to);
}
