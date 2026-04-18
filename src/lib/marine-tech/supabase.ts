import { createClient } from "@supabase/supabase-js";

export function createMarineTechClient() {
  const url = process.env.MARINE_TECH_SUPABASE_URL;
  const key = process.env.MARINE_TECH_SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Marine Tech Supabase is not configured. Set MARINE_TECH_SUPABASE_URL and MARINE_TECH_SUPABASE_SERVICE_ROLE_KEY."
    );
  }

  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
