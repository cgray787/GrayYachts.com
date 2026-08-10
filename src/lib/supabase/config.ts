/**
 * Single source of truth for the public Supabase config.
 *
 * Background: the login page once shipped broken because NEXT_PUBLIC_* values
 * are inlined into the client bundle at BUILD time, and the build ran without
 * them. wrangler.jsonc `vars` did not help — those are runtime-only Worker
 * bindings that never reach browser code.
 *
 * Defence in depth, so it cannot silently regress:
 *   1. next.config.ts hardcodes the canonical values and FAILS THE BUILD if
 *      they are missing or malformed — a broken bundle can no longer ship.
 *   2. This module validates shape (not just presence), so a typo'd .env.local
 *      cannot silently override a good default.
 *   3. middleware.ts fails CLOSED if config is unusable.
 *   4. scripts/verify-deploy.mjs re-checks the live site after deploy.
 */

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

/**
 * Literals, deliberately — NOT process.env.
 *
 * next.config.ts `env` did not reach the login page's client chunk: the bundle
 * containing "Authentication service is not configured" had no Supabase URL in
 * it, so createClient() returned null and login stayed broken even though the
 * value was present in another chunk. Inlining depends on the bundler resolving
 * process.env inside a shared module across chunk boundaries, and it did not.
 *
 * A string literal in source has no such failure mode: whatever chunk imports
 * this module gets the value, because it *is* the value. Both are public — the
 * anon key is protected by RLS and already ships in wrangler.jsonc — so there
 * is nothing here that a browser would not receive anyway.
 */
const DEFAULT_URL = "https://eorkwxzhtidstznpzlyg.supabase.co";
const DEFAULT_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcmt3eHpodGlkc3R6bnB6bHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzA3MzAsImV4cCI6MjA4OTU0NjczMH0.2mPq25_musLoqHLZCzzLFjj_70fcNs5nYwJd9H94aEE";

/** A Supabase project URL, e.g. https://abcdefgh.supabase.co */
const URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|red)$/i;
/** Three base64url segments — a JWT. Presence alone is not enough; a truncated
 *  or placeholder key must be rejected loudly rather than 401 at runtime. */
const JWT_RE = /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

/** An env value only wins when it is actually usable, so a half-set or typo'd
 *  variable can never knock out a known-good literal. */
function pick(raw: string | undefined, fallback: string, ok: RegExp) {
  const candidate = (raw ?? "").trim();
  return candidate && ok.test(candidate) ? candidate : fallback;
}

function readRaw() {
  return {
    url: pick(process.env.NEXT_PUBLIC_SUPABASE_URL, DEFAULT_URL, URL_RE),
    anonKey: pick(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, DEFAULT_ANON_KEY, JWT_RE),
  };
}

/** Why the config is unusable, or null when it is fine. */
export function supabaseConfigProblem(): string | null {
  const { url, anonKey } = readRaw();

  if (!url) return "NEXT_PUBLIC_SUPABASE_URL is empty";
  if (!anonKey) return "NEXT_PUBLIC_SUPABASE_ANON_KEY is empty";
  if (!URL_RE.test(url)) return `NEXT_PUBLIC_SUPABASE_URL is malformed: "${url}"`;
  if (!JWT_RE.test(anonKey)) {
    return "NEXT_PUBLIC_SUPABASE_ANON_KEY is not a well-formed JWT";
  }
  return null;
}

export function isSupabaseConfigured(): boolean {
  return supabaseConfigProblem() === null;
}

/**
 * Validated config, or a thrown Error naming the exact problem.
 * Callers that must degrade gracefully should gate on isSupabaseConfigured().
 */
export function getSupabaseConfig(): SupabaseConfig {
  const problem = supabaseConfigProblem();
  if (problem) {
    throw new Error(
      `Supabase is misconfigured — ${problem}. These are inlined at build time ` +
        `from next.config.ts; a Worker "vars" entry alone will not reach client code.`
    );
  }
  const { url, anonKey } = readRaw();
  return { url, anonKey };
}
