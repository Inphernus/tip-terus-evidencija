export const ABSENCE_HOURS = 8;

export type TimeEntry = {
  id: number;
  user_id: string;
  work_date: string;
  start_at: string;
  end_at: string | null;
  note: string | null;
  edited_by: string | null;
  edited_at: string | null;
};

export type Absence = {
  user_id: string;
  date: string;
  type: "godisnji" | "bolovanje";
  note: string | null;
};

export const ABSENCE_LABEL: Record<Absence["type"], string> = {
  godisnji: "Godišnji",
  bolovanje: "Bolovanje",
};

/** Odrađeni sati jednog zapisa; otvoreni zapis se računa do `now`. Pauze se ne odbijaju. */
export function entryHours(entry: Pick<TimeEntry, "start_at" | "end_at">, now = new Date()): number {
  const end = entry.end_at ? new Date(entry.end_at) : now;
  return Math.max(0, end.getTime() - new Date(entry.start_at).getTime()) / 3_600_000;
}

export function sumHours(entries: Pick<TimeEntry, "start_at" | "end_at">[], now = new Date()): number {
  return entries.reduce((total, e) => total + entryHours(e, now), 0);
}

/** 7.5 → "7:30" */
export function formatHours(hours: number): string {
  const minutes = Math.round(hours * 60);
  return `${Math.floor(minutes / 60)}:${String(minutes % 60).padStart(2, "0")}`;
}
