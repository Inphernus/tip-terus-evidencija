"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { dateRange, isValidDate, isValidTime, isWeekend, zagrebDate, zagrebToDate } from "@/lib/time";
import type { Absence, TimeEntry } from "@/lib/hours";
import type { FormState } from "@/app/prijava/actions";

const BAN_FOREVER = "876000h";

async function log(adminId: string, userId: string, action: string, oldData: unknown, newData: unknown, note: string | null) {
  await createSupabaseAdmin()
    .from("audit_log")
    .insert({ changed_by: adminId, user_id: userId, action, old_data: oldData, new_data: newData, note });
}

function refresh(userId: string, date?: string) {
  revalidatePath("/admin");
  revalidatePath(`/admin/djelatnici/${userId}`);
  if (date) revalidatePath(`/admin/djelatnici/${userId}/${date}`);
}

// ---------- Djelatnici ----------

export async function createEmployee(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const first_name = String(formData.get("first_name") ?? "").trim();
  const last_name = String(formData.get("last_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");

  if (!first_name || !last_name || !email) return { error: "Ime, prezime i mail su obavezni." };
  if (password.length < 8) return { error: "Privremena lozinka mora imati barem 8 znakova." };

  const db = createSupabaseAdmin();
  const { data, error } = await db.auth.admin.createUser({ email, password, email_confirm: true });
  if (error || !data.user) {
    return { error: error?.message.includes("already") ? "Djelatnik s tim mailom već postoji." : "Djelatnik nije dodan." };
  }

  const { error: profileError } = await db
    .from("profiles")
    .insert({ id: data.user.id, first_name, last_name, email, role: "employee" });
  if (profileError) {
    await db.auth.admin.deleteUser(data.user.id);
    return { error: "Djelatnik nije dodan." };
  }

  revalidatePath("/admin");
  redirect(`/admin/djelatnici/${data.user.id}`);
}

export async function setPassword(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireAdmin();
  const userId = String(formData.get("user_id"));
  const password = String(formData.get("password") ?? "");
  if (password.length < 8) return { error: "Lozinka mora imati barem 8 znakova." };

  const { error } = await createSupabaseAdmin().auth.admin.updateUserById(userId, { password });
  if (error) return { error: "Lozinka nije promijenjena." };
  return { success: "Nova lozinka je postavljena. Javi je djelatniku." };
}

/** "Uklanjanje" djelatnika: deaktivacija (povijest sati ostaje) i blokada prijave. */
export async function setActive(formData: FormData) {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const active = formData.get("active") === "true";
  if (userId === admin.id) return;

  const db = createSupabaseAdmin();
  await db.from("profiles").update({ active }).eq("id", userId).eq("role", "employee");
  await db.auth.admin.updateUserById(userId, { ban_duration: active ? "none" : BAN_FOREVER });
  await log(admin.id, userId, active ? "aktiviran" : "deaktiviran", null, null, null);
  refresh(userId);
}

// ---------- Uređivanje dana ----------

function readDay(formData: FormData) {
  const userId = String(formData.get("user_id"));
  const date = String(formData.get("date"));
  const note = String(formData.get("note") ?? "").trim();
  return { userId, date, note };
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

/** Dodavanje ili ispravak dolaska/odlaska za bilo koji dan. Opis je obavezan i vidljiv djelatniku. */
export async function saveEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { userId, date, note } = readDay(formData);
  const id = formData.get("id") ? Number(formData.get("id")) : null;
  const startStr = String(formData.get("start") ?? "");
  const endStr = String(formData.get("end") ?? "");
  const now = new Date();

  if (!isValidDate(date) || date > zagrebDate(now)) return { error: "Neispravan datum." };
  if (!isValidTime(startStr)) return { error: "Upiši vrijeme dolaska (npr. 07:30)." };
  if (endStr && !isValidTime(endStr)) return { error: "Vrijeme odlaska nije ispravno." };
  if (!note) return { error: "Upiši opis izmjene." };

  const start = zagrebToDate(date, startStr);
  const end = endStr ? zagrebToDate(date, endStr) : null;
  if (end && end <= start) return { error: "Odlazak mora biti nakon dolaska." };
  if (start > now || (end && end > now)) return { error: "Vrijeme ne može biti u budućnosti." };
  if (!end && date !== zagrebDate(now)) return { error: "Za prošli dan upiši i vrijeme odlaska." };

  const db = createSupabaseAdmin();
  const { data } = await db.from("time_entries").select("*").eq("user_id", userId).eq("work_date", date);
  const entries = (data ?? []) as TimeEntry[];
  const existing = id ? entries.find((e) => e.id === id) : null;
  if (id && !existing) return { error: "Zapis ne postoji." };

  const others = entries.filter((e) => e.id !== id);
  if (overlaps(start, end, others, now)) return { error: "Vrijeme se preklapa s drugim zapisom tog dana." };

  const row = {
    start_at: start.toISOString(),
    end_at: end?.toISOString() ?? null,
    note,
    edited_by: admin.id,
    edited_at: now.toISOString(),
  };
  const { error } = existing
    ? await db.from("time_entries").update(row).eq("id", existing.id)
    : await db.from("time_entries").insert({ ...row, user_id: userId, work_date: date });
  if (error) return { error: "Zapis nije spremljen." };

  await log(admin.id, userId, existing ? "zapis izmijenjen" : "zapis dodan", existing ?? null, { date, ...row }, note);
  refresh(userId, date);
  return { success: "Spremljeno." };
}

export async function deleteEntry(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { userId, date, note } = readDay(formData);
  const id = Number(formData.get("id"));
  if (!note) return { error: "Upiši opis zašto se zapis briše." };

  const db = createSupabaseAdmin();
  const { data: existing } = await db.from("time_entries").select("*").eq("id", id).eq("user_id", userId).maybeSingle();
  if (!existing) return { error: "Zapis ne postoji." };

  await db.from("time_entries").delete().eq("id", id);
  await log(admin.id, userId, "zapis obrisan", existing, null, note);
  refresh(userId, date);
  return { success: "Zapis obrisan." };
}

/** Godišnji / bolovanje (8 h) ili uklanjanje oznake. Može i za buduće dane (planirani godišnji). */
export async function setAbsence(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const { userId, date, note } = readDay(formData);
  const type = String(formData.get("type") ?? "");
  if (!isValidDate(date)) return { error: "Neispravan datum." };

  const db = createSupabaseAdmin();
  const { data: existing } = await db.from("absences").select("*").eq("user_id", userId).eq("date", date).maybeSingle<Absence>();

  if (type === "") {
    if (!existing) return { success: "Nema oznake." };
    await db.from("absences").delete().eq("user_id", userId).eq("date", date);
    await log(admin.id, userId, "odsutnost uklonjena", existing, null, note || null);
  } else if (type === "godisnji" || type === "bolovanje") {
    const row = { user_id: userId, date, type, note: note || null, created_by: admin.id };
    const { error } = await db.from("absences").upsert(row);
    if (error) return { error: "Oznaka nije spremljena." };
    await log(admin.id, userId, "odsutnost", existing ?? null, row, note || null);
  } else {
    return { error: "Neispravna vrsta." };
  }

  refresh(userId, date);
  return { success: "Spremljeno." };
}

/** Godišnji ili bolovanje za raspon dana (preskače vikende i blagdane). */
export async function setAbsenceRange(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const type = String(formData.get("type") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;

  if (!isValidDate(from) || !isValidDate(to) || to < from) return { error: "Odaberi ispravan raspon datuma." };
  if (type !== "godisnji" && type !== "bolovanje") return { error: "Odaberi godišnji ili bolovanje." };

  const days = dateRange(from, to);
  if (days.length > 366) return { error: "Raspon je predug." };

  const db = createSupabaseAdmin();
  const { data: holidays } = await db.from("holidays").select("date").gte("date", from).lte("date", to);
  const holidaySet = new Set((holidays ?? []).map((h) => h.date as string));
  const rows = days
    .filter((d) => !isWeekend(d) && !holidaySet.has(d))
    .map((date) => ({ user_id: userId, date, type, note, created_by: admin.id }));
  if (rows.length === 0) return { error: "U rasponu nema radnih dana." };

  const { error } = await db.from("absences").upsert(rows);
  if (error) return { error: "Oznake nisu spremljene." };
  await log(admin.id, userId, "odsutnost (raspon)", null, { from, to, type, days: rows.length }, note);

  refresh(userId);
  return { success: `Označeno ${rows.length} radnih dana.` };
}
