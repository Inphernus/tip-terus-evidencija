// Postavlja novu lozinku postojećem računu (npr. Juri). Pokretanje: npm run set-password
import { createClient } from "@supabase/supabase-js";
import { ask, askHidden } from "./prompt.mjs";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const email = (await ask("Mail računa: ")).trim().toLowerCase();
const password = await askHidden("Nova lozinka (min. 8 znakova, prikazuje se kao *): ");
const repeat = await askHidden("Ponovi novu lozinku: ");

if (password.length < 8) {
  console.error("✗ Lozinka mora imati barem 8 znakova.");
  process.exit(1);
}
if (password !== repeat) {
  console.error("✗ Lozinke se ne podudaraju.");
  process.exit(1);
}

const { data: profile } = await supabase.from("profiles").select("id").eq("email", email).maybeSingle();
if (!profile) {
  console.error("✗ Račun s tim mailom ne postoji.");
  process.exit(1);
}

const { error } = await supabase.auth.admin.updateUserById(profile.id, { password });
if (error) {
  console.error("✗ Lozinka nije promijenjena:", error.message);
  process.exit(1);
}

console.log(`✓ Nova lozinka za ${email} je postavljena.`);
