import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createSupabase } from "@/lib/supabase/server";

export type Profile = {
  id: string;
  first_name: string;
  last_name: string;
  email: string;
  role: "admin" | "employee";
  active: boolean;
};

/** Trenutno prijavljeni djelatnik; preusmjerava na prijavu ako ga nema ili je deaktiviran. */
export const getCurrentUser = cache(async (): Promise<Profile> => {
  const supabase = await createSupabase();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) redirect("/prijava");

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, first_name, last_name, email, role, active")
    .eq("id", auth.user.id)
    .single<Profile>();

  if (!profile || !profile.active) {
    await supabase.auth.signOut();
    redirect("/prijava?greska=neaktivan");
  }
  return profile;
});

/** Sučelje za djelatnike — admin (Jura) ne upisuje sate, ide na admin sučelje. */
export async function requireEmployee(): Promise<Profile> {
  const user = await getCurrentUser();
  if (user.role === "admin") redirect("/admin");
  return user;
}

export async function requireAdmin(): Promise<Profile> {
  const user = await getCurrentUser();
  if (user.role !== "admin") redirect("/");
  return user;
}
