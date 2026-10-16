import "server-only";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { ABSENCE_HOURS, entryHours, type Absence, type TimeEntry } from "@/lib/hours";
import { dateRange, isWeekend } from "@/lib/time";

export type DaySummary = {
  date: string;
  weekend: boolean;
  holiday: string | null;
  absence: Absence["type"] | null;
  entries: TimeEntry[];
  workedHours: number;
  absenceHours: number;
  totalHours: number;
  notes: string[];
  /** Postoji dolazak bez odlaska. */
  unclosed: boolean;
};

export type PeriodSummary = {
  days: DaySummary[];
  workedHours: number;
  godisnjiDays: number;
  bolovanjeDays: number;
  absenceHours: number;
  totalHours: number;
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
      weekend: isWeekend(date),
      holiday: holidays.get(date) ?? null,
      absence: absence?.type ?? null,
      entries: dayEntries,
      workedHours,
      absenceHours,
      totalHours: workedHours + absenceHours,
      notes,
      unclosed: dayEntries.some((e) => !e.end_at),
    };
  });

  const sum = (f: (d: DaySummary) => number) => days.reduce((t, d) => t + f(d), 0);
  return {
    days,
    workedHours: sum((d) => d.workedHours),
    godisnjiDays: days.filter((d) => d.absence === "godisnji").length,
    bolovanjeDays: days.filter((d) => d.absence === "bolovanje").length,
    absenceHours: sum((d) => d.absenceHours),
    totalHours: sum((d) => d.totalHours),
  };
}
