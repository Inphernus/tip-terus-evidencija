"use server";

import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";

export type FormState = { error?: string; success?: string } | undefined;

export async function login(_prev: FormState, formData: FormData): Promise<FormState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!email || !password) return { error: "Upiši mail i lozinku." };

  const supabase = await createSupabase();
  const { data, error } = await supabase.auth.signInWithPassword({ email, password });
  if (error || !data.user) return { error: "Pogrešan mail ili lozinka." };

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, active")
    .eq("id", data.user.id)
    .single();

  if (!profile?.active) {
    await supabase.auth.signOut();
    return { error: "Račun nije aktivan. Javi se Juri." };
  }

  redirect(profile.role === "admin" ? "/admin" : "/");
}

export async function logout() {
  const supabase = await createSupabase();
  await supabase.auth.signOut();
  redirect("/prijava");
}
