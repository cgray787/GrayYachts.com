import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

import { isSupabaseConfigured, getSupabaseConfig } from "@/lib/supabase/config";

function toLogin(request: NextRequest, reason?: string) {
  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("redirect", request.nextUrl.pathname);
  if (reason) url.searchParams.set("reason", reason);
  return NextResponse.redirect(url);
}

export async function middleware(request: NextRequest) {
  const isPortal = request.nextUrl.pathname.startsWith("/portal");

  // FAIL CLOSED. This previously returned NextResponse.next() when the env vars
  // were missing, which served the entire client portal with no auth check at
  // all — the same misconfiguration that broke login would have silently opened
  // /portal to anonymous visitors. Missing config must never mean "let them in".
  if (!isSupabaseConfigured()) {
    return isPortal ? toLogin(request, "config") : NextResponse.next({ request });
  }

  const { url: supabaseUrl, anonKey } = getSupabaseConfig();

  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, anonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        supabaseResponse = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) =>
          supabaseResponse.cookies.set(name, value, options)
        );
      },
    },
  });

  // getUser() also refreshes an expiring session and writes the rotated cookies
  // through setAll above — that refresh is why this must run on every portal
  // request, and why the response returned below must be `supabaseResponse`
  // (returning a fresh NextResponse would drop the new cookies and log the
  // user out mid-session).
  let user = null;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    // Supabase unreachable / transient network fault. Treat as unauthenticated
    // rather than crashing the request — the user lands on login and can retry.
    user = null;
  }

  if (!user && isPortal) return toLogin(request);

  return supabaseResponse;
}

export const config = {
  matcher: ["/portal/:path*"],
};
