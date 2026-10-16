import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";
import { PasswordForm } from "./password-form";

export default async function PasswordPage() {
  const user = await getCurrentUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-sm flex-1 px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold">Promjena lozinke</h1>
        <PasswordForm />
      </main>
    </>
  );
}
