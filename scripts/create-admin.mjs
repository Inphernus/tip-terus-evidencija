// Kreira admin račun (Jura). Pokretanje: npm run create-admin
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SECRET_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const rl = createInterface({ input: stdin, output: stdout });

async function askHidden(question) {
  stdout.write(question);
  const write = rl._writeToOutput;
  rl._writeToOutput = () => {};
  const answer = await rl.question("");
  rl._writeToOutput = write;
  stdout.write("\n");
  return answer;
}

const first_name = (await rl.question("Ime: ")).trim();
const last_name = (await rl.question("Prezime: ")).trim();
const email = (await rl.question("Mail: ")).trim().toLowerCase();
const password = await askHidden("Lozinka (min. 8 znakova, ne prikazuje se): ");
rl.close();

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
  .insert({ id: data.user.id, first_name, last_name, email, role: "admin" });
if (profileError) {
  await supabase.auth.admin.deleteUser(data.user.id);
  console.error("✗ Profil nije kreiran (je li pokrenut supabase/schema.sql?):", profileError.message);
  process.exit(1);
}

console.log(`✓ Admin ${first_name} ${last_name} (${email}) je kreiran.`);
