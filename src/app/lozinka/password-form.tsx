"use client";

import { useActionState } from "react";
import { changePassword } from "./actions";

export function PasswordForm() {
  const [state, action, pending] = useActionState(changePassword, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Trenutna lozinka
        <input name="current" type="password" autoComplete="current-password" required className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Nova lozinka
        <input name="next" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Ponovi novu lozinku
        <input name="repeat" type="password" autoComplete="new-password" minLength={8} required className="input" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-700">{state.success}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Spremam…" : "Promijeni lozinku"}
      </button>
    </form>
  );
}
