import { LoginForm } from "./login-form";

export default async function LoginPage({ searchParams }: PageProps<"/prijava">) {
  const { greska } = await searchParams;
  const initialError = greska === "neaktivan" ? "Račun nije aktivan. Javi se Juri." : undefined;

  return (
    <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-12">
      <h1 className="mb-1 text-2xl font-semibold">Evidencija rada</h1>
      <p className="mb-8 text-sm text-neutral-500">Tip-Terus</p>
      <LoginForm initialError={initialError} />
      <p className="mt-6 text-center text-xs text-neutral-500">Zaboravljena lozinka? Javi se Juri.</p>
    </main>
  );
}
