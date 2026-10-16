import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { fullName, loadEmployee, loadPeriod } from "@/lib/data";
import { entryHours, formatHours } from "@/lib/hours";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatDate, isValidDate, weekdayShort, zagrebDate, zagrebTime } from "@/lib/time";
import { AbsenceForm, EntryList } from "./day-forms";

function shiftDay(date: string, delta: number) {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + delta);
  return d.toISOString().slice(0, 10);
}

export default async function DayPage({ params }: PageProps<"/admin/djelatnici/[id]/[datum]">) {
  const admin = await requireAdmin();
  const { id, datum } = await params;
  if (!isValidDate(datum)) notFound();

  const employee = await loadEmployee(id);
  if (!employee) notFound();

  const now = new Date();
  const today = zagrebDate(now);
  const [summary, absenceRes] = await Promise.all([
    loadPeriod(id, datum, datum, now),
    createSupabaseAdmin().from("absences").select("type, note").eq("user_id", id).eq("date", datum).maybeSingle(),
  ]);
  const day = summary.days[0];
  const ctx = { userId: id, date: datum };
  const base = `/admin/djelatnici/${id}`;
  const future = datum > today;

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto flex w-full max-w-2xl flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <Link href={`${base}?mjesec=${datum.slice(0, 7)}`} className="text-sm text-neutral-500 hover:underline">
            ← {fullName(employee)}
          </Link>
          <div className="mt-2 flex flex-wrap items-center gap-3">
            <h1 className="text-2xl font-semibold">
              <span className="text-neutral-500">{weekdayShort(datum)}</span> {formatDate(datum)}
            </h1>
            <nav className="ml-auto flex gap-2 text-sm">
              <Link href={`${base}/${shiftDay(datum, -1)}`} className="btn-secondary">←</Link>
              {datum < today && <Link href={`${base}/${shiftDay(datum, 1)}`} className="btn-secondary">→</Link>}
            </nav>
          </div>
          <p className="text-sm text-neutral-500">
            {day.holiday && `${day.holiday} · `}
            {day.weekend && "Vikend · "}
            Ukupno: <strong className="font-mono">{formatHours(day.totalHours)}</strong> h
          </p>
        </div>

        {!future && (
          <EntryList
            ctx={ctx}
            entries={day.entries.map((e) => ({
              id: e.id,
              start: zagrebTime(e.start_at),
              end: e.end_at ? zagrebTime(e.end_at) : null,
              hours: formatHours(entryHours(e, now)),
              note: e.note,
              edited: Boolean(e.edited_by),
            }))}
          />
        )}

        <AbsenceForm ctx={ctx} current={absenceRes.data?.type ?? null} note={absenceRes.data?.note ?? null} />
      </main>
    </>
  );
}
