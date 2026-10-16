import { AppHeader } from "@/components/app-header";
import { getCurrentUser } from "@/lib/auth";

export default async function HomePage() {
  const user = await getCurrentUser();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Bok, {user.first_name}!</h1>
        <div className="card mt-6 text-neutral-500">
          Ovdje dolaze gumbi „Došao sam“ / „Odlazim“ (faza 2).
        </div>
      </main>
    </>
  );
}
