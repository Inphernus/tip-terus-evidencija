"use client";

import { useActionState } from "react";
import { setAbsenceRange, setActive, setPassword } from "@/app/admin/actions";
import { FormMessage } from "@/components/form-message";

export function PasswordResetForm({ userId }: { userId: string }) {
  const [state, action, pending] = useActionState(setPassword, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-semibold">Nova lozinka</h2>
      <input type="hidden" name="user_id" value={userId} />
      <input name="password" type="text" minLength={8} required autoComplete="off" placeholder="barem 8 znakova" className="input font-mono" />
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Spremam…" : "Postavi lozinku"}
      </button>
    </form>
  );
}

export function AbsenceRangeForm({ userId, today }: { userId: string; today: string }) {
  const [state, action, pending] = useActionState(setAbsenceRange, undefined);
  return (
    <form action={action} className="flex flex-col gap-3">
      <h2 className="font-semibold">Godišnji / bolovanje</h2>
      <input type="hidden" name="user_id" value={userId} />
      <select name="type" required className="input">
        <option value="godisnji">Godišnji</option>
        <option value="bolovanje">Bolovanje</option>
      </select>
      <div className="grid grid-cols-2 gap-2">
        <label className="flex flex-col gap-1 text-xs font-medium">
          Od
          <input name="from" type="date" required defaultValue={today} className="input" />
        </label>
        <label className="flex flex-col gap-1 text-xs font-medium">
          Do
          <input name="to" type="date" required defaultValue={today} className="input" />
        </label>
      </div>
      <input name="note" placeholder="Napomena (nije obavezno)" className="input" />
      <p className="text-xs text-neutral-500">Svaki radni dan = 8 h. Vikendi i blagdani se preskaču.</p>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-secondary">
        {pending ? "Spremam…" : "Označi"}
      </button>
    </form>
  );
}

export function ActiveToggle({ userId, active }: { userId: string; active: boolean }) {
  return (
    <form
      action={setActive}
      onSubmit={(e) => {
        const msg = active
          ? "Ukloniti djelatnika? Neće se moći prijaviti, ali njegovi sati ostaju u evidenciji."
          : "Vratiti djelatnika? Ponovno će se moći prijaviti.";
        if (!confirm(msg)) e.preventDefault();
      }}
    >
      <input type="hidden" name="user_id" value={userId} />
      <input type="hidden" name="active" value={active ? "false" : "true"} />
      <button type="submit" className={active ? "text-sm text-red-600 hover:underline" : "btn-secondary"}>
        {active ? "Ukloni djelatnika" : "Vrati djelatnika"}
      </button>
    </form>
  );
}
