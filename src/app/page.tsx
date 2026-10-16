import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PeriodTable } from "@/components/period-table";
import { requireEmployee } from "@/lib/auth";
import { loadPeriod } from "@/lib/data";
import { ABSENCE_LABEL, entryHours, formatHours } from "@/lib/hours";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { formatDate, monthRange, MONTHS, parseMonth, shiftMonth, zagrebDate, zagrebTime } from "@/lib/time";
import { ClockPanel } from "./clock-panel";
import { TodayEntries } from "./today-entries";

export default async function HomePage({ searchParams }: PageProps<"/">) {
  const user = await requireEmployee();
  const now = new Date();
  const today = zagrebDate(now);
  const currentMonth = today.slice(0, 7);

  const month = parseMonth((await searchParams).mjesec, currentMonth);
  const [, monthEnd] = monthRange(month, today);

  const [summary, unclosedRes] = await Promise.all([
    loadPeriod(user.id, `${month}-01`, monthEnd, now),
    createSupabaseAdmin()
      .from("time_entries")
      .select("work_date")
      .eq("user_id", user.id)
      .is("end_at", null)
      .lt("work_date", today),
  ]);

  const todaySummary = month === currentMonth ? summary.days.at(-1)! : (await loadPeriod(user.id, today, today, now)).days[0];
  const todayEntries = todaySummary.entries;
  const open = todayEntries.find((e) => !e.end_at) ?? null;
  const closedHours = todayEntries.filter((e) => e.end_at).reduce((t, e) => t + entryHours(e, now), 0);
  const unclosedDays = [...new Set((unclosedRes.data ?? []).map((r) => r.work_date as string))];
  const [y, m] = month.split("-").map(Number);

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <h1 className="text-2xl font-semibold">Bok, {user.first_name}!</h1>
          <p className="text-sm text-neutral-500">Danas je {formatDate(today)}</p>
        </div>

        {unclosedDays.length > 0 && (
          <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-800">
            Nisi zabilježio odlazak za: {unclosedDays.map(formatDate).join(", ")}. Te dane može zatvoriti samo Jura.
          </div>
        )}

        {todaySummary.absence && (
          <div className="rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Danas: <strong>{ABSENCE_LABEL[todaySummary.absence]}</strong> (8 h).
          </div>
        )}

        <ClockPanel
          openStart={open?.start_at ?? null}
          openStartLabel={open ? zagrebTime(open.start_at) : null}
          closedHours={closedHours}
        />

        <TodayEntries
          entries={todayEntries.map((e) => ({
            id: e.id,
            start: zagrebTime(e.start_at),
            end: e.end_at ? zagrebTime(e.end_at) : null,
            hours: formatHours(entryHours(e, now)),
            note: e.note,
          }))}
        />

        <section className="card">
          <div className="mb-3 flex items-center gap-3">
            <h2 className="font-semibold capitalize">
              {MONTHS[m - 1]} {y}.
            </h2>
            <nav className="ml-auto flex gap-2 text-sm">
              <Link href={`/?mjesec=${shiftMonth(month, -1)}`} className="btn-secondary">← Prethodni</Link>
              {month !== currentMonth && (
                <Link href={`/?mjesec=${shiftMonth(month, 1)}`} className="btn-secondary">Sljedeći →</Link>
              )}
            </nav>
          </div>
          <PeriodTable summary={summary} />
        </section>
      </main>
    </>
  );
}
