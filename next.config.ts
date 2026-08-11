import type { NextConfig } from "next";

/**
 * Canonical public Supabase config.
 *
 * NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time. They
 * used to live only in .env.local (gitignored) and wrangler.jsonc `vars`
 * (runtime-only Worker bindings that never reach browser code), so a build on a
 * machine without .env.local shipped a bundle where createClient() saw
 * undefined — and the login page reported "Authentication service is not
 * configured".
 *
 * Both values are public by design: the anon key is protected by RLS and is
 * already committed in wrangler.jsonc. Hardcoding them here makes every build
 * reproducible on any machine or CI runner. A valid .env.local still wins.
 */
const SUPABASE_URL = "https://eorkwxzhtidstznpzlyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcmt3eHpodGlkc3R6bnB6bHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzA3MzAsImV4cCI6MjA4OTU0NjczMH0.2mPq25_musLoqHLZCzzLFjj_70fcNs5nYwJd9H94aEE";

const URL_RE = /^https:\/\/[a-z0-9-]+\.supabase\.(co|in|red)$/i;
const JWT_RE = /^ey[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+\.[A-Za-z0-9_-]+$/;

// An env value only wins if it is actually usable — otherwise a typo'd or
// half-filled .env.local would silently override a known-good default and
// reintroduce the outage.
function pick(envValue: string | undefined, fallback: string, ok: RegExp, name: string) {
  const candidate = (envValue ?? "").trim();
  if (candidate && ok.test(candidate)) return candidate;
  if (candidate && !ok.test(candidate)) {
    console.warn(`[supabase] Ignoring malformed ${name} from the environment; using built-in default.`);
  }
  return fallback;
}

const resolvedUrl = pick(process.env.NEXT_PUBLIC_SUPABASE_URL, SUPABASE_URL, URL_RE, "NEXT_PUBLIC_SUPABASE_URL");
const resolvedKey = pick(
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  SUPABASE_ANON_KEY,
  JWT_RE,
  "NEXT_PUBLIC_SUPABASE_ANON_KEY"
);

// Hard stop. Failing the build is the whole point: a bundle that cannot
// authenticate must never reach production again.
if (!URL_RE.test(resolvedUrl) || !JWT_RE.test(resolvedKey)) {
  throw new Error(
    "[supabase] Refusing to build: public Supabase config is missing or malformed. " +
      "Client-side auth would ship broken. Check the constants in next.config.ts."
  );
}

const nextConfig: NextConfig = {
  // /sell itself needs no rule: the landing page ships as public/sell.html and
  // Cloudflare's asset handler maps it straight to /sell. /valuation is an ads
  // alias with no matching asset, so it must be an explicit redirect — it was
  // lost briefly when these two configs were merged and 404'd for ad traffic.
  async redirects() {
    return [{ source: "/valuation", destination: "/sell", permanent: false }];
  },
  env: {
    NEXT_PUBLIC_SUPABASE_URL: resolvedUrl,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: resolvedKey,
  },
};

export default nextConfig;
