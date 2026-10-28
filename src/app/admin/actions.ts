"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/auth";
import { createSupabaseAdmin } from "@/lib/supabase/server";
import { dateRange, formatDate, isSunday, isValidDate, isValidTime, zagrebDate, zagrebToDate } from "@/lib/time";
import { ABSENCE_LABEL, isAbsenceType, type Absence, type TimeEntry } from "@/lib/hours";
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

/** Godišnji / bolovanje / blagdan (8 h) ili uklanjanje oznake. Može i za buduće dane (planirani godišnji). */
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
  } else if (isAbsenceType(type)) {
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

/**
 * Godišnji / bolovanje / blagdan za raspon dana (ili jedan dan), ili uklanjanje oznaka.
 * Nedjelje se preskaču (subote po izboru); kod godišnjeg i bolovanja i blagdani.
 * Dan može imati samo jednu oznaku: ako neki dan već ima drugu, ništa se ne sprema.
 */
export async function setAbsenceRange(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = String(formData.get("user_id"));
  const from = String(formData.get("from") ?? "");
  const to = String(formData.get("to") ?? "");
  const type = String(formData.get("type") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const saturdays = formData.get("saturdays") === "on";

  if (!isValidDate(from) || !isValidDate(to) || to < from) return { error: "Odaberi ispravan raspon datuma." };
  if (type !== "" && !isAbsenceType(type)) return { error: "Odaberi vrstu." };

  const days = dateRange(from, to);
  if (days.length > 366) return { error: "Raspon je predug." };

  const db = createSupabaseAdmin();

  if (type === "") {
    const { data, error } = await db.from("absences").delete().eq("user_id", userId).gte("date", from).lte("date", to).select("*");
    if (error) return { error: "Oznake nisu uklonjene." };
    if (data?.length) await log(admin.id, userId, "odsutnost uklonjena (raspon)", data, null, note);
    refresh(userId);
    return { success: data?.length ? `Uklonjeno oznaka: ${data.length}.` : "U rasponu nema oznaka." };
  }

  const [{ data: holidays }, { data: existing }] = await Promise.all([
    db.from("holidays").select("date").gte("date", from).lte("date", to),
    db.from("absences").select("date, type").eq("user_id", userId).gte("date", from).lte("date", to),
  ]);
  const holidaySet = new Set((holidays ?? []).map((h) => h.date as string));
  const isSaturday = (d: string) => new Date(`${d}T12:00:00Z`).getUTCDay() === 6;
  const targetDays = days.filter(
    (d) => !isSunday(d) && (saturdays || !isSaturday(d)) && (type === "blagdan" || !holidaySet.has(d)),
  );
  if (targetDays.length === 0) return { error: "U rasponu nema dana za označiti." };

  const targetSet = new Set(targetDays);
  const conflicts = (existing ?? []).filter((a) => targetSet.has(a.date) && a.type !== type);
  if (conflicts.length > 0) {
    const list = conflicts.map((c) => `${formatDate(c.date)} (${ABSENCE_LABEL[c.type as keyof typeof ABSENCE_LABEL]})`).join(", ");
    return { error: `Dan može imati samo jednu oznaku. Već označeno: ${list}. Prvo ukloni ili promijeni te dane.` };
  }

  const rows = targetDays.map((date) => ({ user_id: userId, date, type, note, created_by: admin.id }));
  const { error } = await db.from("absences").upsert(rows);
  if (error) return { error: "Oznake nisu spremljene." };
  await log(admin.id, userId, "odsutnost (raspon)", null, { from, to, type, days: rows.length }, note);

  refresh(userId);
  return { success: `${ABSENCE_LABEL[type]}: označeno ${rows.length} ${rows.length % 10 === 1 && rows.length % 100 !== 11 ? "dan" : "dana"}.` };
}

/**
 * Plaćeni blagdan (8 h) za sve aktivne djelatnike odjednom.
 * Djelatnike koji taj dan već imaju godišnji ili bolovanje ne dira.
 * S `remove` uklanja oznaku blagdana svima za taj dan.
 */
export async function setHolidayForAll(_prev: FormState, formData: FormData): Promise<FormState> {
  const admin = await requireAdmin();
  const date = String(formData.get("date") ?? "");
  const note = String(formData.get("note") ?? "").trim() || null;
  const remove = formData.get("intent") === "remove";
  if (!isValidDate(date)) return { error: "Odaberi datum." };

  const db = createSupabaseAdmin();
  if (remove) {
    const { data, error } = await db.from("absences").delete().eq("date", date).eq("type", "blagdan").select("user_id");
    if (error) return { error: "Oznake nisu uklonjene." };
    for (const row of data ?? []) await log(admin.id, row.user_id, "blagdan uklonjen (svi)", { date }, null, note);
    revalidatePath("/admin", "layout");
    return { success: `Blagdan uklonjen za ${data?.length ?? 0} djelatnika.` };
  }

  const { data: employees } = await db.from("profiles").select("id").eq("role", "employee").eq("active", true);
  const rows = (employees ?? []).map((e) => ({ user_id: e.id, date, type: "blagdan", note, created_by: admin.id }));
  if (rows.length === 0) return { error: "Nema aktivnih djelatnika." };

  const { data, error } = await db
    .from("absences")
    .upsert(rows, { onConflict: "user_id,date", ignoreDuplicates: true })
    .select("user_id");
  if (error) return { error: "Oznake nisu spremljene. Je li pokrenuta migracija 002_blagdan.sql?" };
  for (const row of data ?? []) await log(admin.id, row.user_id, "blagdan (svi)", null, { date, type: "blagdan" }, note);

  revalidatePath("/admin", "layout");
  const skipped = rows.length - (data?.length ?? 0);
  return {
    success:
      `${ABSENCE_LABEL.blagdan} (8 h) zaveden za ${data?.length ?? 0} djelatnika.` +
      (skipped ? ` Preskočeno ${skipped} (već imaju oznaku za taj dan).` : ""),
  };
}
