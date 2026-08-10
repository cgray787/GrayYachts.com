import type { NextConfig } from "next";

// NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time.
// Cloudflare Worker `vars` in wrangler.jsonc are runtime-only bindings, so they
// never reach client code — which is why a build without .env.local shipped a
// bundle where createClient() saw undefined and the login page reported
// "Authentication service is not configured".
//
// These two values are public by design (the anon key is protected by RLS and is
// already committed in wrangler.jsonc), so defaulting them here makes the build
// reproducible on any machine or CI runner. A local .env.local still wins.
const SUPABASE_URL = "https://eorkwxzhtidstznpzlyg.supabase.co";
const SUPABASE_ANON_KEY =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVvcmt3eHpodGlkc3R6bnB6bHlnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM5NzA3MzAsImV4cCI6MjA4OTU0NjczMH0.2mPq25_musLoqHLZCzzLFjj_70fcNs5nYwJd9H94aEE";

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_SUPABASE_URL:
      process.env.NEXT_PUBLIC_SUPABASE_URL || SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_ANON_KEY:
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || SUPABASE_ANON_KEY,
  },
};

export default nextConfig;
