import { Fragment } from "react";
import Link from "next/link";
import type { PeriodSummary, WeekSummary } from "@/lib/data";
import { ABSENCE_BADGE, ABSENCE_LABEL, ABSENCE_TYPES, DAILY_LIMIT, formatHours, WEEKLY_LIMIT } from "@/lib/hours";
import { formatDate, mondayOf, weekdayShort, zagrebTime } from "@/lib/time";

type Props = {
  summary: PeriodSummary;
  editHref?: (date: string) => string;
  /** Tjedni zbrojevi (cijeli tjedni); prikazuju se kao redak iznad svakog tjedna. */
  weeks?: WeekSummary[];
  /** Istakni dane i tjedne preko limita (samo admin). */
  flagOverLimit?: boolean;
};

/** Tablica po danima (šihterica na ekranu). Najnoviji dan je na vrhu. */
export function PeriodTable({ summary, editHref, weeks, flagOverLimit = false }: Props) {
  const days = [...summary.days].reverse();
  const weekByStart = new Map((weeks ?? []).map((w) => [w.start, w]));
  // Redak tjedna ide iznad najnovijeg prikazanog dana tog tjedna.
  const weekHeadDates = new Set(
    days.filter((d, i) => i === 0 || mondayOf(days[i - 1].date) !== mondayOf(d.date)).map((d) => d.date),
  );

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
            const offDay = day.sunday || day.holiday;
            const week = weekHeadDates.has(day.date) ? weekByStart.get(mondayOf(day.date)) : undefined;
            const flagged = flagOverLimit && week?.overLimit;
            return (
              <Fragment key={day.date}>
              {week && (
                <tr className={flagged ? "bg-amber-100 text-amber-950" : "bg-neutral-100 text-neutral-600"}>
                  <td className="py-1.5 pr-3 text-xs font-medium" colSpan={2}>
                    Tjedan {formatDate(week.start)} – {formatDate(week.end)}
                    {flagged && <span className="ml-2 font-semibold">⚠ više od {WEEKLY_LIMIT} h – provjeri</span>}
                  </td>
                  <td className="py-1.5 pr-3 text-right font-mono text-xs font-semibold tabular-nums">{formatHours(week.hours)}</td>
                  <td />
                </tr>
              )}
              <tr
                className={`border-b border-border align-top ${
                  flagOverLimit && day.overLimit ? "bg-amber-50" : offDay ? "bg-neutral-50 text-neutral-500" : ""
                }`}
              >
                <td className="whitespace-nowrap py-2 pr-3">
                  <span className="inline-block w-8 text-neutral-500">{weekdayShort(day.date)}</span>
                  {editHref ? (
                    <Link href={editHref(day.date)} className="text-accent hover:underline">
                      {formatDate(day.date)}
                    </Link>
                  ) : (
                    formatDate(day.date)
                  )}
                </td>
                <td className="py-2 pr-3">
                  {day.absence && (
                    <span className={`mr-2 rounded px-1.5 py-0.5 text-xs font-medium ${ABSENCE_BADGE[day.absence]}`}>
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
                  {flagOverLimit && day.overLimit && (
                    <span className="ml-2 rounded bg-amber-200 px-1.5 py-0.5 text-xs font-semibold text-amber-950">
                      ⚠ više od {DAILY_LIMIT} h
                    </span>
                  )}
                </td>
                <td className="py-2 pr-3 text-right font-mono tabular-nums">
                  {day.totalHours > 0 ? formatHours(day.totalHours) : ""}
                </td>
                <td className="py-2 text-amber-700">{day.notes.join(" · ")}</td>
              </tr>
              </Fragment>
            );
          })}
        </tbody>
        <tfoot>
          <tr className="font-medium">
            <td className="py-3 pr-3" colSpan={2}>
              Ukupno
              <span className="ml-2 text-xs font-normal text-neutral-500">
                rad {formatHours(summary.workedHours)}
                {ABSENCE_TYPES.filter((t) => summary.absenceDays[t] > 0).map(
                  (t) => ` · ${ABSENCE_LABEL[t].toLowerCase()} ${summary.absenceDays[t]} d`,
                )}
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
