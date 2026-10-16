"use client";

import { useActionState } from "react";
import { login } from "./actions";

export function LoginForm({ initialError }: { initialError?: string }) {
  const [state, action, pending] = useActionState(login, initialError ? { error: initialError } : undefined);

  return (
    <form action={action} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1 text-sm font-medium">
        Mail
        <input name="email" type="email" autoComplete="email" required className="input" />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Lozinka
        <input name="password" type="password" autoComplete="current-password" required className="input" />
      </label>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn-primary">
        {pending ? "Prijava…" : "Prijavi se"}
      </button>
    </form>
  );
}
