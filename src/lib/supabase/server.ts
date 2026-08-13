import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";

import { getSupabaseConfig } from "./config";

export async function createClient() {
  const cookieStore = await cookies();
  // Throws a message naming the exact problem rather than the previous `!`
  // non-null assertions, which handed undefined straight to the SDK.
  const { url, anonKey } = getSupabaseConfig();

  return createServerClient(url, anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value, options }) =>
            cookieStore.set(name, value, options)
          );
        } catch {
          // Called from a Server Component — cookie writes are not allowed there.
          // Middleware already refreshed the session, so this is safe to ignore.
        }
      },
    },
  });
}
