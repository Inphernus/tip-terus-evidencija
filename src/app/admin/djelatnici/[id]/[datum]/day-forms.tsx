"use client";

import { useActionState, useState } from "react";
import { deleteEntry, saveEntry, setAbsence } from "@/app/admin/actions";
import { FormMessage } from "@/components/form-message";
import { ABSENCE_LABEL, ABSENCE_TYPES } from "@/lib/hours";

type Ctx = { userId: string; date: string };

export type EntryView = { id: number; start: string; end: string | null; hours: string; note: string | null; edited: boolean };

function Hidden({ userId, date }: Ctx) {
  return (
    <>
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="date" value={date} />
    </>
  );
}

function NoteInput({ required = true }: { required?: boolean }) {
  return (
    <label className="flex w-full flex-col gap-1 text-xs font-medium">
      Opis izmjene {required ? "(obavezno, vidi ga i djelatnik)" : "(nije obavezno)"}
      <input name="note" required={required} placeholder="npr. zaboravio odjavu, ispravak prema dogovoru" className="input" />
    </label>
  );
}

export function EntryList({ ctx, entries }: { ctx: Ctx; entries: EntryView[] }) {
  const [adding, setAdding] = useState(entries.length === 0);
  return (
    <section className="card">
      <div className="mb-3 flex items-center justify-between">
        <h2 className="font-semibold">Dolasci i odlasci</h2>
        {!adding && (
          <button onClick={() => setAdding(true)} className="btn-secondary">+ Dodaj</button>
        )}
      </div>
      {entries.length === 0 && !adding && <p className="text-sm text-neutral-500">Nema zapisa.</p>}
      <ul className="divide-y divide-border">
        {entries.map((e) => (
          <EntryRow key={e.id} ctx={ctx} entry={e} />
        ))}
      </ul>
      {adding && (
        <div className="mt-3 border-t border-border pt-3">
          <EntryForm ctx={ctx} onDone={() => setAdding(false)} />
        </div>
      )}
    </section>
  );
}

function EntryRow({ ctx, entry }: { ctx: Ctx; entry: EntryView }) {
  const [mode, setMode] = useState<"view" | "edit" | "delete">("view");

  if (mode === "edit") {
    return (
      <li className="py-3">
        <EntryForm ctx={ctx} entry={entry} onDone={() => setMode("view")} />
      </li>
    );
  }

  return (
    <li className="py-3">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="font-mono tabular-nums">{entry.start} – {entry.end ?? "…"}</span>
        <span className="text-sm text-neutral-500">{entry.hours} h</span>
        {!entry.end && <span className="text-xs font-medium text-red-600">nema odlaska</span>}
        <span className="ml-auto flex gap-3">
          <button onClick={() => setMode("edit")} className="text-sm text-accent hover:underline">Uredi</button>
          <button onClick={() => setMode("delete")} className="text-sm text-red-600 hover:underline">Obriši</button>
        </span>
      </div>
      {entry.note && <p className="mt-1 text-sm text-amber-700">Opis: {entry.note}</p>}
      {mode === "delete" && <DeleteForm ctx={ctx} id={entry.id} onCancel={() => setMode("view")} />}
    </li>
  );
}

function EntryForm({ ctx, entry, onDone }: { ctx: Ctx; entry?: EntryView; onDone: () => void }) {
  const [state, action, pending] = useActionState(async (prev: Parameters<typeof saveEntry>[0], fd: FormData) => {
    const result = await saveEntry(prev, fd);
    if (result?.success) onDone();
    return result;
  }, undefined);

  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <Hidden {...ctx} />
      {entry && <input type="hidden" name="id" value={entry.id} />}
      <label className="flex flex-col gap-1 text-xs font-medium">
        Dolazak
        <input name="start" type="time" required defaultValue={entry?.start} className="input" />
      </label>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Odlazak
        <input name="end" type="time" defaultValue={entry?.end ?? ""} className="input" />
      </label>
      <NoteInput />
      <button type="submit" disabled={pending} className="btn-primary py-2.5">{pending ? "…" : "Spremi"}</button>
      <button type="button" onClick={onDone} className="btn-secondary py-2.5">Odustani</button>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

function DeleteForm({ ctx, id, onCancel }: { ctx: Ctx; id: number; onCancel: () => void }) {
  const [state, action, pending] = useActionState(deleteEntry, undefined);
  return (
    <form action={action} className="mt-3 flex flex-wrap items-end gap-3 rounded-lg bg-red-50 p-3">
      <Hidden {...ctx} />
      <input type="hidden" name="id" value={id} />
      <NoteInput />
      <button type="submit" disabled={pending} className="rounded-lg bg-red-600 px-4 py-2.5 text-sm font-medium text-white">
        {pending ? "…" : "Obriši zapis"}
      </button>
      <button type="button" onClick={onCancel} className="btn-secondary py-2.5">Odustani</button>
      <div className="w-full"><FormMessage state={state} /></div>
    </form>
  );
}

export function AbsenceForm({ ctx, current, note }: { ctx: Ctx; current: string | null; note: string | null }) {
  const [state, action, pending] = useActionState(setAbsence, undefined);
  return (
    <form action={action} className="card flex flex-col gap-3">
      <h2 className="font-semibold">Godišnji / bolovanje / blagdan</h2>
      <Hidden {...ctx} />
      <div className="flex flex-wrap gap-4 text-sm">
        {[["", "Ništa"], ...ABSENCE_TYPES.map((t) => [t, `${ABSENCE_LABEL[t]} (8 h)`])].map(([value, label]) => (
          <label key={value} className="flex items-center gap-2">
            <input type="radio" name="type" value={value} defaultChecked={(current ?? "") === value} />
            {label}
          </label>
        ))}
      </div>
      <label className="flex flex-col gap-1 text-xs font-medium">
        Napomena (nije obavezno)
        <input name="note" defaultValue={note ?? ""} className="input" />
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-secondary self-start">{pending ? "Spremam…" : "Spremi"}</button>
    </form>
  );
}
