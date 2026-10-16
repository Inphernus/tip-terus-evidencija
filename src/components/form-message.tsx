import type { FormState } from "@/app/prijava/actions";

export function FormMessage({ state }: { state: FormState }) {
  if (state?.error) return <p className="text-sm text-red-600">{state.error}</p>;
  if (state?.success) return <p className="text-sm text-green-700">{state.success}</p>;
  return null;
}
