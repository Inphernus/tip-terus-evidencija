import type { PeriodSummary } from "@/lib/data";
import { ABSENCE_LABEL, formatHours } from "@/lib/hours";
import { formatDate, weekdayShort, zagrebTime } from "@/lib/time";

/** Tablica po danima (šihterica na ekranu). Najnoviji dan je na vrhu. */
export function PeriodTable({ summary }: { summary: PeriodSummary }) {
  const days = [...summary.days].reverse();

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[520px] text-sm">
        <thead>
          <tr className="border-b border-border text-left text-xs text-neutral-500">
            <th className="py-2 pr-3 font-medium">Dan</th>
            <th className="py-2 pr-3 font-medium">Dolasci / odlasci</th>
            <th className="py-2 pr-3 text-right font-medium">Sati</th>
            <th className="py-2 font-medium">Napomena</th>
          </tr>
        </thead>
        <tbody>
          {days.map((day) => {
            const offDay = day.weekend || day.holiday;
            return (
              <tr key={day.date} className={`border-b border-border align-top ${offDay ? "bg-neutral-50 text-neutral-500" : ""}`}>
                <td className="whitespace-nowrap py-2 pr-3">
                  <span className="inline-block w-8 text-neutral-500">{weekdayShort(day.date)}</span>
                  {formatDate(day.date)}
                </td>
                <td className="py-2 pr-3">
                  {day.absence && (
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${day.absence === "godisnji" ? "bg-green-100 text-green-800" : "bg-orange-100 text-orange-800"}`}>
                      {ABSENCE_LABEL[day.absence]}
                    </span>
                  )}
                  {day.holiday && <span className="mr-2 text-xs">{day.holiday}</span>}
                  <span className="font-mono tabular-nums">
                    {day.entries
                      .map((e) => `${zagrebTime(e.start_at)}–${e.end_at ? zagrebTime(e.end_at) : "?"}`)
                      .join(", ")}
                  </span>
                  {day.unclosed && <span className="ml-2 text-xs font-medium text-red-600">nije zatvoren</span>}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">
                  {day.totalHours > 0 ? formatHours(day.totalHours) : ""}
                </td>
                <td className="py-2 text-amber-700">{day.notes.join(" · ")}</td>
              </tr>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="py-3 pr-3" colSpan={2}>
              Ukupno
              <span className="ml-2 text-xs font-normal text-neutral-500">
                rad {formatHours(summary.workedHours)}
                {summary.godisnjiDays > 0 && ` · godišnji ${summary.godisnjiDays} d`}
                {summary.bolovanjeDays > 0 && ` · bolovanje ${summary.bolovanjeDays} d`}
              </span>
            </td>
            <td className="py-3 pr-3 text-right font-mono tabular-nums">{formatHours(summary.totalHours)}</td>
            <td />
          </tr>
        </tfoot>
      </table>
    </div>
  );
}
