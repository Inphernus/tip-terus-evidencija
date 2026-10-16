import "server-only";
import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!;

/** Klijent u ime prijavljenog korisnika (poštuje RLS). */
export async function createSupabase() {
  const cookieStore = await cookies();
  return createServerClient(url, publishableKey, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (cookiesToSet) => {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options),
          );
        } catch {
          // Pozvano iz Server Componenta — sesiju osvježava proxy.
        }
      },
    },
  });
}

/** Admin klijent sa secret ključem — zaobilazi RLS, koristiti samo na serveru nakon provjere ovlasti. */
export function createSupabaseAdmin() {
  return createClient(url, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
