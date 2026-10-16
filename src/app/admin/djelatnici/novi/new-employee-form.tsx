"use client";

import { useActionState } from "react";
import { createEmployee } from "@/app/admin/actions";
import { FormMessage } from "@/components/form-message";

export function NewEmployeeForm() {
  const [state, action, pending] = useActionState(createEmployee, undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-sm font-medium">
          Ime
          <input name="first_name" required className="input" />
        </label>
        <label className="flex flex-col gap-1 text-sm font-medium">
          Prezime
          <input name="last_name" required className="input" />
        </label>
      </div>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mail
        <input name="email" type="email" required className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Privremena lozinka
        <input name="password" type="text" minLength={8} required autoComplete="off" className="input font-mono" />
        <span className="text-xs font-normal text-neutral-500">Barem 8 znakova. Djelatnik je može promijeniti nakon prijave.</span>
      </label>
      <FormMessage state={state} />
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Dodajem…" : "Dodaj djelatnika"}
      </button>
    </form>
  );
}
