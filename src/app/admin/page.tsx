import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";

export default async function AdminPage() {
  const user = await requireAdmin();

  return (
    <>
      <AppHeader user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 px-4 py-8">
        <h1 className="text-2xl font-semibold">Admin</h1>
        <div className="card mt-6 text-neutral-500">
          Ovdje dolaze djelatnici, statistika i export (faza 3).
        </div>
      </main>
    </>
  );
}
