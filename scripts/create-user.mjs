// Kreira račun. Pokretanje: npm run create-admin (Jura) ili npm run create-employee (djelatnik)
import { createClient } from "@supabase/supabase-js";
import { ask, askHidden } from "./prompt.mjs";

const role = process.argv[2] === "admin" ? "admin" : "employee";
const label = role === "admin" ? "Admin" : "Djelatnik";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const first_name = (await ask("Ime: ")).trim();
const last_name = (await ask("Prezime: ")).trim();
const email = (await ask("Mail: ")).trim().toLowerCase();
const password = await askHidden("Lozinka (min. 8 znakova, prikazuje se kao *): ");

if (!first_name || !last_name || !email || password.length < 8) {
  console.error("✗ Sva polja su obavezna, lozinka mora imati barem 8 znakova.");
  process.exit(1);
}

const { data, error } = await supabase.auth.admin.createUser({ email, password, email_confirm: true });
if (error) {
  console.error("✗ Račun nije kreiran:", error.message);
  process.exit(1);
}

const { error: profileError } = await supabase
  .from("profiles")
  .insert({ id: data.user.id, first_name, last_name, email, role });
if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("✗ Profil nije kreiran (je li pokrenut supabase/schema.sql?):", profileError.message);
  process.exit(1);
}

console.log(`✓ ${label} ${first_name} ${last_name} (${email}) je kreiran.`);
