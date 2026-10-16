"use server";

import { revalidatePath } from "next/cache";
import { requireEmployee } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { isValidTime, zagrebDate, zagrebToDate } from "@/lib/time";
import type { TimeEntry } from "@/lib/hours";
import type { FormState } from "@/app/prijava/actions";

// Djelatnik smije mijenjati samo današnje zapise koje Jura nije uređivao.
// Sve provjere su ovdje na serveru; zapis ide preko admin klijenta.

const GRACE_MS = 60_000;

async function todayEntries(userId: string, today: string) {
  const { data } = await createSupabaseAdmin()
    .from("time_entries")
    .select("*")
    .eq("user_id", userId)
    .eq("work_date", today)
    .order("start_at");
  return (data ?? []) as TimeEntry[];
}

function overlaps(start: Date, end: Date | null, others: TimeEntry[], now: Date) {
  const s = start.getTime();
  const e = (end ?? now).getTime();
  return others.some((o) => {
    const os = new Date(o.start_at).getTime();
    const oe = (o.end_at ? new Date(o.end_at) : now).getTime();
    return s < oe && os < e;
  });
}

export async function clockIn(): Promise<FormState> {
  const user = await requireEmployee();
  const now = new Date();
  const today = zagrebDate(now);
  const entries = await todayEntries(user.id, today);
  if (entries.some((e) => !e.end_at)) return { error: "Već si prijavljen na posao." };

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
  const open = (await todayEntries(user.id, today)).find((e) => !e.end_at);
  if (!open) return { error: "Nemaš otvoren dolazak za danas." };

  const { error } = await createSupabaseAdmin()
    .from("time_entries")
    .update({ end_at: now.toISOString() })
    .eq("id", open.id);
  if (error) return { error: "Odlazak nije zapisan. Pokušaj ponovno." };

  revalidatePath("/");
  return { success: "Odlazak zapisan." };
}

/** Ručni upis ili ispravak vremena — samo za danas. */
export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const user = await requireEmployee();
  const now = new Date();
  const today = zagrebDate(now);

  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const startStr = String(formData.get("start") ?? "");
  const endStr = String(formData.get("end") ?? "");

  if (!isValidTime(startStr)) return { error: "Upiši vrijeme dolaska (npr. 07:30)." };
  if (endStr && !isValidTime(endStr)) return { error: "Vrijeme odlaska nije ispravno." };

  const start = zagrebToDate(today, startStr);
  const end = endStr ? zagrebToDate(today, endStr) : null;

  if (start.getTime() > now.getTime() + GRACE_MS) return { error: "Dolazak ne može biti u budućnosti." };
  if (end && end.getTime() > now.getTime() + GRACE_MS) return { error: "Odlazak ne može biti u budućnosti." };
  if (end && end <= start) return { error: "Odlazak mora biti nakon dolaska." };

  const entries = await todayEntries(user.id, today);
  const existing = id ? entries.find((e) => e.id === id) : null;
  if (id && !existing) return { error: "Možeš mijenjati samo današnje zapise." };
  if (existing?.edited_by) return { error: "Ovaj zapis je uredio Jura i ne može se mijenjati." };

  const others = entries.filter((e) => e.id !== id);
  if (!end && others.some((e) => !e.end_at)) return { error: "Već imaš otvoren dolazak — prvo upiši odlazak." };
  if (overlaps(start, end, others, now)) return { error: "Vrijeme se preklapa s drugim zapisom." };

  const row = { start_at: start.toISOString(), end_at: end?.toISOString() ?? null };
  const admin = createSupabaseAdmin();
  const { error } = existing
    ? await admin.from("time_entries").update(row).eq("id", existing.id)
    : await admin.from("time_entries").insert({ ...row, user_id: user.id, work_date: today });
  if (error) return { error: "Zapis nije spremljen. Pokušaj ponovno." };

  revalidatePath("/");
  return { success: "Spremljeno." };
}

export async function deleteEntry(formData: FormData) {
  const user = await requireEmployee();
  const today = zagrebDate();
  const id = Number(formData.get("id"));
  const entry = (await todayEntries(user.id, today)).find((e) => e.id === id);
  if (!entry || entry.edited_by) return;

  await createSupabaseAdmin().from("time_entries").delete().eq("id", entry.id);
  revalidatePath("/");
}
