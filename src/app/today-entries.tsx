export type TodayEntryView = {
  id: number;
  start: string;
  end: string | null;
  hours: string;
  note: string | null;
};

export function TodayEntries({ entries }: { entries: TodayEntryView[] }) {
  return (
    <section className="card">
      <h2 className="mb-3 font-semibold">Današnji zapisi</h2>

      {entries.length === 0 && <p className="text-sm text-neutral-500">Danas još nema zapisa.</p>}

      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <li key={entry.id} className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
            <span className="font-mono tabular-nums">
              {entry.start} – {entry.end ?? "…"}
            </span>
            <span className="text-sm text-neutral-500">{entry.hours} h</span>
            {entry.note && <p className="w-full text-sm text-amber-700">Napomena: {entry.note}</p>}
          </li>
        ))}
      </ul>

      <p className="mt-3 text-xs text-neutral-500">Ako je nešto krivo upisano, javi se Juri da ispravi.</p>
    </section>
  );
}
