import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeader } from "@/components/app-header";
import { PeriodTable } from "@/components/period-table";
import { requireAdmin } from "@/lib/auth";
import { fullName, loadEmployee, loadPeriod } from "@/lib/data";
import { monthLabel, monthRange, parseMonth, shiftMonth, zagrebDate } from "@/lib/time";
import { AbsenceRangeForm, ActiveToggle, PasswordResetForm } from "./employee-forms";

export default async function EmployeePage({ params, searchParams }: PageProps<"/admin/djelatnici/[id]">) {
  const admin = await requireAdmin();
  const { id } = await params;
  const employee = await loadEmployee(id);
  if (!employee) notFound();

  const today = zagrebDate();
  const currentMonth = today.slice(0, 7);
  const month = parseMonth((await searchParams).mjesec, currentMonth);
  const [from, to] = monthRange(month, today);
  const summary = await loadPeriod(id, from, to);
  const base = `/admin/djelatnici/${id}`;

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-5 px-4 py-6">
        <div>
          <Link href="/admin" className="text-sm text-neutral-500 hover:underline">← Djelatnici</Link>
          <h1 className="mt-2 text-2xl font-semibold">
            {fullName(employee)}
            {!employee.active && <span className="ml-2 text-base font-normal text-neutral-500">(neaktivan)</span>}
          </h1>
          <p className="text-sm text-neutral-500">{employee.email}</p>
        </div>

        <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
          <section className="card">
            <div className="mb-3 flex flex-wrap items-center gap-3">
              <h2 className="font-semibold capitalize">{monthLabel(month)}</h2>
              <nav className="ml-auto flex gap-2 text-sm">
                <Link href={`${base}?mjesec=${shiftMonth(month, -1)}`} className="btn-secondary">← Prethodni</Link>
                {month !== currentMonth && (
                  <Link href={`${base}?mjesec=${shiftMonth(month, 1)}`} className="btn-secondary">Sljedeći →</Link>
                )}
              </nav>
            </div>
            <p className="mb-3 text-xs text-neutral-500">Klikni na dan za uređivanje sati, godišnjeg ili bolovanja.</p>
            <PeriodTable summary={summary} editHref={(date) => `${base}/${date}`} />
          </section>

          <aside className="flex flex-col gap-5">
            <div className="card">
              <AbsenceRangeForm userId={id} today={today} />
            </div>
            <div className="card">
              <PasswordResetForm userId={id} />
            </div>
            <ActiveToggle userId={id} active={employee.active} />
          </aside>
        </div>
      </main>
    </>
  );
}
