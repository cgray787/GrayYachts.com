import { createClient } from "@/lib/supabase/server";
import { isAdmin } from "@/lib/admin";

export async function requireMarineTechAdmin() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user || !isAdmin(user.email)) {
    return { ok: false as const, status: 403 as const };
  }

  return { ok: true as const, user };
}
