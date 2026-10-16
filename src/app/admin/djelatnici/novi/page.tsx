import Link from "next/link";
import { AppHeader } from "@/components/app-header";
import { requireAdmin } from "@/lib/auth";
import { NewEmployeeForm } from "./new-employee-form";

export default async function NewEmployeePage() {
  const admin = await requireAdmin();

  return (
    <>
      <AppHeader user={admin} />
      <main className="mx-auto w-full max-w-md flex-1 px-4 py-6">
        <Link href="/admin" className="text-sm text-neutral-500 hover:underline">← Djelatnici</Link>
        <h1 className="mb-6 mt-2 text-2xl font-semibold">Novi djelatnik</h1>
        <NewEmployeeForm />
      </main>
    </>
  );
}
