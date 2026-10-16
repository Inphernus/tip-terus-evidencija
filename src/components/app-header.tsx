import Link from "next/link";
import { logout } from "@/app/prijava/actions";
import type { Profile } from "@/lib/auth";

export function AppHeader({ user }: { user: Profile }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={user.role === "admin" ? "/admin" : "/"} className="font-semibold">
          Evidencija rada
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          {user.role === "admin" && (
            <>
              <Link href="/admin" className="hover:underline">Admin</Link>
              <Link href="/" className="hover:underline">Moj dan</Link>
            </>
          )}
          <Link href="/lozinka" className="hover:underline">Lozinka</Link>
          <form action={logout}>
            <button type="submit" className="text-neutral-500 hover:text-foreground">Odjava</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
