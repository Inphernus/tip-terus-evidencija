"use client";

import { useActionState } from "react";
import { setHolidayForAll } from "./actions";
import { FormMessage } from "@/components/form-message";

type Holiday = { date: string; label: string };

export function HolidayForAllForm({ holidays, defaultDate }: { holidays: Holiday[]; defaultDate: string }) {
  const [state, action, pending] = useActionState(setHolidayForAll, undefined);

  return (
    <form action={action} className="card flex flex-col gap-3">
      <div>
        <h2 className="font-semibold">Blagdan za sve djelatnike</h2>
        <p className="text-xs text-neutral-500">
          Svim aktivnim djelatnicima zavodi 8 h blagdana za odabrani dan. Tko taj dan ima godišnji ili bolovanje, ostaje kako je.
          Pojedinačno se blagdan zavodi na danu djelatnika.
        </p>
      </div>
      <div className="flex flex-wrap items-end gap-3">
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-xs font-medium">
          Blagdan
          <select name="date" defaultValue={defaultDate} className="input">
            {holidays.map((h) => (
              <option key={h.date} value={h.date}>{h.label}</option>
            ))}
          </select>
        </label>
        <label className="flex min-w-48 flex-1 flex-col gap-1 text-xs font-medium">
          Napomena (nije obavezno)
          <input name="note" className="input" />
        </label>
      </div>
      <FormMessage state={state} />
      <div className="flex flex-wrap gap-3">
        <button type="submit" name="intent" value="apply" disabled={pending} className="btn-primary py-2 text-sm">
          {pending ? "Spremam…" : "Zavedi blagdan svima"}
        </button>
        <button
          type="submit"
          name="intent"
          value="remove"
          disabled={pending}
          className="text-sm text-red-600 hover:underline"
          onClick={(e) => {
            if (!confirm("Ukloniti oznaku blagdana svim djelatnicima za taj dan?")) e.preventDefault();
          }}
        >
          Ukloni svima
        </button>
      </div>
    </form>
  );
}
