import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

/** Next.js 15: cookies() is async, so this is too — always `await createClient()`. */
export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL ?? "",
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options);
            });
          } catch {
            /* set from Server Component */
          }
        }
      }
    }
  );
}

/** @deprecated Use createClient() */
export async function getSupabaseServerClient() {
  return createClient();
}
