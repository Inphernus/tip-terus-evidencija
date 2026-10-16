"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { zagrebDate } from "@/lib/time";
import type { TimeEntry } from "@/lib/hours";
import type { FormState } from "@/app/prijava/actions";

// Djelatnik samo bilježi dolazak i odlazak u trenutku klika — vrijeme uzima server.
// Upis unatrag, uređivanje i brisanje radi samo Jura iz admin sučelja.

async function openEntryToday(userId: string, today: string) {
  const { data } = await createSupabaseAdmin()
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("work_date", today)
    .is("end_at", null)
    .maybeSingle();
  return data as TimeEntry | null;
}

export async function clockIn(): Promise<FormState> {
  const user = await requireEmployee();
  const now = new Date();
  const today = zagrebDate(now);
  if (await openEntryToday(user.id, today)) return { error: "Već si prijavljen na posao." };

  const { error } = await createSupabaseAdmin()
    .from("time_entries")
    .insert({ user_id: user.id, work_date: today, start_at: now.toISOString() });
  if (error) return { error: "Dolazak nije zapisan. Pokušaj ponovno." };

  revalidatePath("/");
  return { success: "Dolazak zapisan." };
}

export async function clockOut(): Promise<FormState> {
  const user = await requireEmployee();
  const now = new Date();
  const today = zagrebDate(now);
  const open = await openEntryToday(user.id, today);
  if (!open) return { error: "Nemaš otvoren dolazak za danas." };

  const { error } = await createSupabaseAdmin()
    .from("time_entries")
    .update({ end_at: now.toISOString() })
    .eq("id", open.id);
  if (error) return { error: "Odlazak nije zapisan. Pokušaj ponovno." };

  revalidatePath("/");
  return { success: "Odlazak zapisan." };
}
