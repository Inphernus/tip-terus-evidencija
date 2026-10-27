// Postavlja novu lozinku postojećem računu (npr. Juri). Pokretanje: npm run set-password
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

const email = (await rl.question("Mail računa: ")).trim().toLowerCase();
const password = await askHidden("Nova lozinka (min. 8 znakova, ne prikazuje se): ");
const repeat = await askHidden("Ponovi novu lozinku: ");
rl.close();

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
