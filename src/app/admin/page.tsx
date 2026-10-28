import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { fullName, groupWeeks, loadEmployees, loadPeriod } from "@/lib/data";
import { ABSENCE_LABEL, DAILY_LIMIT, formatHours, sumHours, WEEKLY_LIMIT, type TimeEntry } from "@/lib/hours";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { addDays, formatDate, mondayOf, monthLabel, monthRange, weekdayShort, zagrebDate, zagrebTime } from "@/lib/time";
import { HolidayForAllForm } from "./holiday-for-all-form";

export default async function AdminPage({ searchParams }: PageProps<"/admin">) {
  const admin = await requireAdmin();
  const showInactive = (await searchParams).svi === "1";
  const now = new Date();
  const today = zagrebDate(now);
  const month = today.slice(0, 7);
  const [from, to] = monthRange(month, today);

  const employees = await loadEmployees({ includeInactive: showInactive });
  const year = Number(today.slice(0, 4));
  // Zadnja 4 tjedna (uključujući tekući) za provjeru dnevnog i tjednog limita.
  const checkFrom = addDays(mondayOf(today), -21);
  const [periods, recent, unclosedRes, holidaysRes] = await Promise.all([
    Promise.all(employees.map((e) => loadPeriod(e.id, from, to, now))),
    Promise.all(employees.map((e) => loadPeriod(e.id, checkFrom, today, now))),
    createSupabaseAdmin()
      .from("time_entries")
      .select("id, user_id, work_date, start_at")
      .is("end_at", null)
      .lt("work_date", today)
      .order("work_date"),
    createSupabaseAdmin().from("holidays").select("date, name").gte("date", `${year - 1}-01-01`).lte("date", `${year + 1}-12-31`).order("date"),
  ]);
  const holidays = (holidaysRes.data ?? []).map((h: { date: string; name: string }) => ({
    date: h.date,
    label: `${formatDate(h.date)} (${weekdayShort(h.date)}) – ${h.name}`,
  }));
  // Zadano: zadnji blagdan do danas, inače prvi sljedeći.
  const defaultHoliday = holidays.filter((h) => h.date <= today).at(-1)?.date ?? holidays[0]?.date ?? today;

  const byId = new Map(employees.map((e) => [e.id, e]));
  const toCheck = employees.flatMap((employee, i) => [
    ...groupWeeks(recent[i].days, checkFrom, today)
      .filter((w) => w.overLimit)
      .map((w) => ({
        key: `${employee.id}-w-${w.start}`,
        employee,
        href: `/admin/statistika?${new URLSearchParams({ djelatnik: employee.id, od: w.start, do: w.end < today ? w.end : today })}`,
        label: `tjedan ${formatDate(w.start)} – ${formatDate(w.end)}`,
        hours: w.hours,
        limit: WEEKLY_LIMIT,
      })),
    ...recent[i].days
      .filter((d) => d.overLimit)
      .map((d) => ({
        key: `${employee.id}-d-${d.date}`,
        employee,
        href: `/admin/djelatnici/${employee.id}/${d.date}`,
        label: `${weekdayShort(d.date)} ${formatDate(d.date)}`,
        hours: d.totalHours,
        limit: DAILY_LIMIT,
      })),
  ]);
  const unclosed = ((unclosedRes.data ?? []) as Pick<TimeEntry, "id" | "user_id" | "work_date" | "start_at">[]).filter(
    (u) => byId.has(u.user_id),
  );

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-semibold">Djelatnici</h1>
          <Link href="/admin/djelatnici/novi" className="btn-primary ml-auto py-2 text-sm">
            + Novi djelatnik
          </Link>
        </div>

        {unclosed.length > 0 && (
          <section className="rounded-xl border border-red-200 bg-red-50 p-4">
            <h2 className="mb-2 font-semibold text-red-800">Nezatvoreni dani ({unclosed.length})</h2>
            <p className="mb-3 text-sm text-red-800">Djelatnik je zabilježio dolazak, ali ne i odlazak. Upiši vrijeme odlaska.</p>
            <ul className="flex flex-col gap-1 text-sm">
              {unclosed.map((u) => (
                <li key={u.id}>
                  <Link href={`/admin/djelatnici/${u.user_id}/${u.work_date}`} className="text-red-900 underline">
                    {fullName(byId.get(u.user_id)!)} · {formatDate(u.work_date)} · dolazak {zagrebTime(u.start_at)}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        {toCheck.length > 0 && (
          <section className="rounded-xl border border-amber-300 bg-amber-50 p-4">
            <h2 className="mb-2 font-semibold text-amber-900">Za provjeru ({toCheck.length})</h2>
            <p className="mb-3 text-sm text-amber-900">
              Više od {DAILY_LIMIT} h dnevno ili {WEEKLY_LIMIT} h tjedno (rad + godišnji/bolovanje/blagdan), zadnja 4 tjedna.
            </p>
            <ul className="flex flex-col gap-1 text-sm">
              {toCheck.map((item) => (
                <li key={item.key}>
                  <Link href={item.href} className="text-amber-950 underline">
                    {fullName(item.employee)} · {item.label} · <strong>{formatHours(item.hours)} h</strong> (max {item.limit} h)
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        )}

        <section className="card overflow-x-auto p-0">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="border-b border-border text-left text-xs text-neutral-500">
                <th className="px-5 py-3 font-medium">Djelatnik</th>
                <th className="px-3 py-3 font-medium">Danas</th>
                <th className="px-3 py-3 text-right font-medium">Danas sati</th>
                <th className="px-5 py-3 text-right font-medium capitalize">{monthLabel(month)}</th>
              </tr>
            </thead>
            <tbody>
              {employees.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-neutral-500">
                    Još nema djelatnika. Dodaj prvog gumbom „+ Novi djelatnik“.
                  </td>
                </tr>
              )}
              {employees.map((employee, i) => {
                const period = periods[i];
                const day = period.days.at(-1)!;
                const open = day.entries.find((e) => !e.end_at);
                const todayHours = sumHours(day.entries, now);
                const status = day.absence
                  ? ABSENCE_LABEL[day.absence]
                  : open
                    ? `u radu od ${zagrebTime(open.start_at)}`
                    : day.entries.length
                      ? "otišao"
                      : "nije došao";
                return (
                  <tr key={employee.id} className="border-b border-border last:border-0 hover:bg-neutral-50">
                    <td className="px-5 py-3">
                      <Link href={`/admin/djelatnici/${employee.id}`} className="font-medium hover:underline">
                        {fullName(employee)}
                      </Link>
                      {!employee.active && <span className="ml-2 text-xs text-neutral-500">(neaktivan)</span>}
                    </td>
                    <td className="px-3 py-3">
                      <span className={open ? "text-green-700" : day.absence ? "text-amber-700" : "text-neutral-500"}>{status}</span>
                    </td>
                    <td className="px-3 py-3 text-right font-mono tabular-nums">
                      {todayHours > 0 ? formatHours(todayHours) : day.absence ? "8:00" : ""}
                    </td>
                    <td className="px-5 py-3 text-right font-mono tabular-nums">{formatHours(period.totalHours)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </section>

        {holidays.length > 0 && <HolidayForAllForm holidays={holidays} defaultDate={defaultHoliday} />}

        <Link href={showInactive ? "/admin" : "/admin?svi=1"} className="self-start text-sm text-neutral-500 hover:underline">
          {showInactive ? "Sakrij neaktivne djelatnike" : "Prikaži i neaktivne djelatnike"}
        </Link>
      </main>
    </>
  );
}
