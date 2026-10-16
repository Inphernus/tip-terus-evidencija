"use server";

import { getCurrentUser } from "@/lib/auth";
import { createSupabase } from "@/lib/supabase/server";
import type { FormState } from "@/app/prijava/actions";

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await getCurrentUser();
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  const repeat = String(formData.get("repeat") ?? "");

  if (next.length < 8) return { error: "Nova lozinka mora imati barem 8 znakova." };
  if (next !== repeat) return { error: "Nove lozinke se ne podudaraju." };

  const supabase = await createSupabase();
  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { error: "Trenutna lozinka nije točna." };

  const { error } = await supabase.auth.updateUser({ password: next });
  if (error) return { error: "Lozinka nije promijenjena. Pokušaj ponovno." };

  return { success: "Lozinka je promijenjena." };
}
