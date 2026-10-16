import Link from "next/link";
import { logout } from "@/app/prijava/actions";
import type { Profile } from "@/lib/auth";

export function AppHeader({ user }: { user: Profile }) {
  return (
    <header className="border-b border-border bg-surface">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-4 gap-y-2 px-4 py-3">
        <Link href={user.role === "admin" ? "/admin" : "/"} className="font-semibold">
          Evidencija rada
          {user.role === "admin" && <span className="ml-2 text-xs font-normal text-neutral-500">Admin</span>}
        </Link>
        <nav className="ml-auto flex flex-wrap items-center gap-3 text-sm">
          <span className="text-neutral-500">{user.first_name} {user.last_name}</span>
          <Link href="/lozinka" className="hover:underline">Lozinka</Link>
          <form action={logout}>
            <button type="submit" className="text-neutral-500 hover:text-foreground">Odjava</button>
          </form>
        </nav>
      </div>
    </header>
  );
}
