"use client";

import { useActionState, useState } from "react";
import { deleteEntry, saveEntry } from "./actions";

export type TodayEntryView = {
  id: number;
  start: string;
  end: string | null;
  hours: string;
  note: string | null;
  lockedByAdmin: boolean;
};

export function TodayEntries({ entries }: { entries: TodayEntryView[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Današnji zapisi</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-secondary">
            + Ručni upis
          </button>
        )}
      </div>

      {entries.length === 0 && !adding && (
        <p className="text-sm text-neutral-500">Danas još nema zapisa.</p>
      )}

      <ul className="divide-y divide-border">
        {entries.map((entry) => (
          <EntryRow key={entry.id} entry={entry} />
        ))}
      </ul>

      {adding && (
        <div className="mt-3 border-t border-border pt-3">
          <p className="mb-2 text-sm text-neutral-500">Zaboravio si kliknuti? Upiši današnje vrijeme ručno.</p>
          <EntryForm onDone={() => setAdding(false)} />
        </div>
      )}
    </section>
  );
}

function EntryRow({ entry }: { entry: TodayEntryView }) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="py-3">
        <EntryForm entry={entry} onDone={() => setEditing(false)} />
      </li>
    );
  }

  return (
    <li className="flex flex-wrap items-center gap-x-3 gap-y-1 py-3">
      <span className="font-mono tabular-nums">
        {entry.start} – {entry.end ?? "…"}
      </span>
      <span className="text-sm text-neutral-500">{entry.hours} h</span>
      {entry.lockedByAdmin ? (
        <span className="ml-auto text-xs text-neutral-500">uredio Jura</span>
      ) : (
        <span className="ml-auto flex gap-2">
          <button onClick={() => setEditing(true)} className="text-sm text-accent hover:underline">
            Uredi
          </button>
          <form action={deleteEntry}>
            <input type="hidden" name="id" value={entry.id} />
            <button
              type="submit"
              className="text-sm text-red-600 hover:underline"
              onClick={(e) => {
                if (!confirm("Obrisati ovaj zapis?")) e.preventDefault();
              }}
            >
              Obriši
            </button>
          </form>
        </span>
      )}
      {entry.note && <p className="w-full text-sm text-amber-700">Napomena: {entry.note}</p>}
    </li>
  );
}

function EntryForm({ entry, onDone }: { entry?: TodayEntryView; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveEntry>[0], fd: FormData) => {
    const result = await saveEntry(prev, fd);
    if (result?.success) onDone();
    return result;
  }, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <label className="flex flex-col gap-1 text-xs font-medium">
        Dolazak
        <input name="start" type="time" required defaultValue={entry?.start} className="input" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Odlazak
        <input name="end" type="time" defaultValue={entry?.end ?? ""} className="input" />
      </label>
      <button type="submit" disabled={pending} className="btn-primary py-2.5">
        {pending ? "…" : "Spremi"}
      </button>
      <button type="button" onClick={onDone} className="btn-secondary py-2.5">
        Odustani
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
