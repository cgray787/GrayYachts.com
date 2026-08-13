"use client";

import { createBrowserClient } from "@supabase/ssr";

import { getSupabaseConfig, isSupabaseConfigured, supabaseConfigProblem } from "./config";

/**
 * Browser Supabase client.
 *
 * Returns null only when the config is genuinely unusable — which, thanks to
 * the build-time assertion in next.config.ts, can no longer happen in a shipped
 * bundle. The null branch is kept so callers degrade to a readable message
 * instead of a white screen, and the reason is logged for diagnosis.
 */
export function createClient() {
  if (!isSupabaseConfigured()) {
    console.error(`[supabase] ${supabaseConfigProblem()}`);
    return null;
  }

  const { url, anonKey } = getSupabaseConfig();
  return createBrowserClient(url, anonKey);
}
