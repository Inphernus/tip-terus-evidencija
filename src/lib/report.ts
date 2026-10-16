import "server-only";
import { loadEmployee, loadEmployees, loadPeriod, type Employee, type PeriodSummary } from "@/lib/data";
import { dateRange, isValidDate, monthRange, zagrebDate } from "@/lib/time";

export const MAX_DAYS = 366;

export type ReportParams = { userId: string | null; from: string; to: string };

export type Report = {
  params: ReportParams;
  rows: { employee: Employee; summary: PeriodSummary }[];
};

/** Čita filtere iz URL-a (?djelatnik=…&od=…&do=…); zadano je tekući mjesec za sve djelatnike. */
export function parseReportParams(get: (key: string) => string | null | undefined): ReportParams | { error: string } {
  const today = zagrebDate();
  const [monthStart, monthEnd] = monthRange(today.slice(0, 7), today);
  const from = get("od") || monthStart;
  const to = get("do") || monthEnd;
  const user = get("djelatnik");

  if (!isValidDate(from) || !isValidDate(to)) return { error: "Neispravan datum." };
  if (to < from) return { error: "Datum „do“ mora biti nakon datuma „od“." };
  if (dateRange(from, to).length > MAX_DAYS) return { error: "Razdoblje može biti najviše godinu dana." };
  return { userId: user && user !== "svi" ? user : null, from, to };
}

/** Podaci za statistiku i export. Pozivatelj mora biti admin. */
export async function loadReport(params: ReportParams): Promise<Report | null> {
  let employees: Employee[];
  if (params.userId) {
    const employee = await loadEmployee(params.userId);
    if (!employee) return null;
    employees = [employee];
  } else {
    employees = await loadEmployees({ includeInactive: true });
  }

  const summaries = await Promise.all(employees.map((e) => loadPeriod(e.id, params.from, params.to)));
  const rows = employees
    .map((employee, i) => ({ employee, summary: summaries[i] }))
    // Neaktivni djelatnici ulaze u zbirni prikaz samo ako imaju sate u razdoblju.
    .filter((r) => params.userId || r.employee.active || r.summary.totalHours > 0);
  return { params, rows };
}

export function exportFileName(report: Report): string {
  const who = report.params.userId
    ? `${report.rows[0].employee.last_name}-${report.rows[0].employee.first_name}`
    : "zbirno";
  const safe = who.normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d").replace(/Đ/g, "D").replace(/[^\w-]+/g, "_");
  return `sihterica_${safe}_${report.params.from}_${report.params.to}.xlsx`;
}
