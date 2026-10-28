import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { PeriodTable } from "@/components/period-table";
import { requireAdmin } from "@/lib/auth";
import { fullName, loadEmployees } from "@/lib/data";
import { ABSENCE_LABEL, ABSENCE_TYPES, formatHours, WEEKLY_LIMIT, type AbsenceType } from "@/lib/hours";
import { loadReport, parseReportParams } from "@/lib/report";
import { formatDate } from "@/lib/time";

export default async function StatsPage({ searchParams }: PageProps<"/admin/statistika">) {
  const admin = await requireAdmin();
  const sp = await searchParams;
  const get = (key: string) => (typeof sp[key] === "string" ? (sp[key] as string) : null);

  const parsed = parseReportParams(get);
  const employees = await loadEmployees({ includeInactive: true });
  const report = "error" in parsed ? null : await loadReport(parsed);
  const error = "error" in parsed ? parsed.error : !report ? "Djelatnik ne postoji." : null;

  const query = report
    ? new URLSearchParams({ djelatnik: report.params.userId ?? "svi", od: report.params.from, do: report.params.to }).toString()
    : "";
  const totals = report && {
    worked: report.rows.reduce((t, r) => t + r.summary.workedHours, 0),
    total: report.rows.reduce((t, r) => t + r.summary.totalHours, 0),
    days: Object.fromEntries(
      ABSENCE_TYPES.map((type) => [type, report.rows.reduce((t, r) => t + r.summary.absenceDays[type], 0)]),
    ) as Record<AbsenceType, number>,
  };

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
        <h1 className="text-2xl font-semibold">Statistika</h1>

        <form className="card flex flex-wrap items-end gap-3">
          <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
            Djelatnik
            <select name="djelatnik" defaultValue={get("djelatnik") ?? "svi"} className="input">
              <option value="svi">Svi djelatnici</option>
              {employees.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.last_name} {e.first_name}
                  {!e.active ? " (neaktivan)" : ""}
                </option>
              ))}
            </select>
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Od
            <input type="date" name="od" defaultValue={report?.params.from ?? get("od") ?? ""} className="input" />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium">
            Do
            <input type="date" name="do" defaultValue={report?.params.to ?? get("do") ?? ""} className="input" />
          </label>
          <button type="submit" className="btn-primary py-2.5">Prikaži</button>
        </form>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {report && totals && (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-sm text-neutral-500">
                {formatDate(report.params.from)} – {formatDate(report.params.to)}
              </p>
              <a href={`/admin/export?${query}`} className="btn-primary ml-auto py-2 text-sm">
                ⬇ Export šihterice (Excel)
              </a>
            </div>

            <section className="card overflow-x-auto p-0">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-border text-left text-xs text-neutral-500">
                    <th className="px-5 py-3 font-medium">Djelatnik</th>
                    <th className="px-3 py-3 text-right font-medium">Rad (h)</th>
                    {ABSENCE_TYPES.map((t) => (
                      <th key={t} className="px-3 py-3 text-right font-medium">{ABSENCE_LABEL[t]} (dana)</th>
                    ))}
                    <th className="px-3 py-3 text-right font-medium">Ukupno (h)</th>
                    <th className="px-5 py-3 text-right font-medium">Tjedana &gt; {WEEKLY_LIMIT} h</th>
                  </tr>
                </thead>
                <tbody>
                  {report.rows.map(({ employee, summary, weeks }) => (
                    <tr key={employee.id} className="border-b border-border">
                      <td className="px-5 py-3">
                        <Link
                          href={`/admin/statistika?${new URLSearchParams({ djelatnik: employee.id, od: report.params.from, do: report.params.to })}`}
                          className="font-medium hover:underline"
                        >
                          {fullName(employee)}
                        </Link>
                        {!employee.active && <span className="ml-2 text-xs text-neutral-500">(neaktivan)</span>}
                      </td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{formatHours(summary.workedHours)}</td>
                      {ABSENCE_TYPES.map((t) => (
                        <td key={t} className="px-3 py-3 text-right font-mono tabular-nums">{summary.absenceDays[t] || ""}</td>
                      ))}
                      <td className="px-3 py-3 text-right font-mono font-semibold tabular-nums">{formatHours(summary.totalHours)}</td>
                      <td className="px-5 py-3 text-right">
                        {weeks.some((w) => w.overLimit) && (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 text-xs font-semibold text-amber-900">
                            ⚠ {weeks.filter((w) => w.overLimit).length}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
                {report.rows.length > 1 && (
                  <tfoot>
                    <tr className="font-semibold">
                      <td className="px-5 py-3">Ukupno</td>
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{formatHours(totals.worked)}</td>
                      {ABSENCE_TYPES.map((t) => (
                        <td key={t} className="px-3 py-3 text-right font-mono tabular-nums">{totals.days[t] || ""}</td>
                      ))}
                      <td className="px-3 py-3 text-right font-mono tabular-nums">{formatHours(totals.total)}</td>
                      <td />
                    </tr>
                  </tfoot>
                )}
              </table>
            </section>

            {report.params.userId && report.rows[0] && (
              <section className="card">
                <h2 className="mb-3 font-semibold">Po danima</h2>
                <PeriodTable
                  summary={report.rows[0].summary}
                  weeks={report.rows[0].weeks}
                  flagOverLimit
                  editHref={(date) => `/admin/djelatnici/${report.rows[0].employee.id}/${date}`}
                />
              </section>
            )}
          </>
        )}
      </main>
    </>
  );
}
