"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Anchor, Mail, Lock, LogIn, Eye, EyeOff, CheckSquare, Square } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [notABot, setNotABot] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (!notABot) {
      setError("Please confirm you are not a bot.");
      return;
    }

    setLoading(true);

    try {
      const supabase = createClient();
      if (!supabase) {
        setError("Authentication service is not configured. Please contact your administrator.");
        return;
      }
      const { error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) {
        setError(authError.message);
        return;
      }

      // Validate redirect param is a safe relative path
      const redirectParam = searchParams.get("redirect");
      let redirectTo = "/portal/dashboard";
      if (
        redirectParam &&
        redirectParam.startsWith("/") &&
        !redirectParam.startsWith("//")
      ) {
        redirectTo = redirectParam;
      }

      router.push(redirectTo);
      router.refresh();
    } catch {
      setError("Unable to sign in. Please check your credentials and try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left half: hero image / gradient ── */}
      <div className="relative hidden w-1/2 lg:block">
        <div className="absolute inset-0 bg-gradient-to-b from-[#0a1628] to-[#060a12]" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#060a12]/80 via-transparent to-transparent" />

        {/* Bottom-left brand text */}
        <div className="absolute bottom-12 left-12 z-10">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-[0.35em] text-gold">
            GRAY YACHTS
          </h1>
          <p className="mt-3 text-sm tracking-wide text-text-secondary">
            Your Vessel. Your World. Your Portal.
          </p>
        </div>
      </div>

      {/* ── Right half: login form ── */}
      <div className="relative flex w-full items-center justify-center bg-bg-primary px-6 py-12 lg:w-1/2">
        {/* Top-left logo link */}
        <Link
          href="/"
          className="absolute top-6 left-6 flex items-center gap-2 transition-opacity hover:opacity-80"
        >
          <Anchor className="h-5 w-5 text-gold" strokeWidth={1.5} />
          <span className="font-[family-name:var(--font-cormorant)] text-sm tracking-[0.25em] text-gold">
            GRAY YACHTS
          </span>
        </Link>

        <div className="w-full max-w-md space-y-8">
          {/* Anchor icon */}
          <div className="flex justify-center">
            <Anchor className="h-10 w-10 text-gold" strokeWidth={1.5} />
          </div>

          {/* Heading */}
          <div className="text-center">
            <h2 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary">
              Welcome Aboard
            </h2>
            <p className="mt-2 text-sm text-text-secondary">
              Sign in to your client portal
            </p>
          </div>

          {/* Error banner */}
          {error && (
            <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm text-error">
              {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Email */}
            <div className="space-y-2">
              <label
                htmlFor="email"
                className="block text-sm font-medium text-text-secondary"
              >
                Email Address
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className="w-full rounded-md border border-border bg-bg-secondary py-2.5 pl-10 pr-4 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
              </div>
            </div>

            {/* Password */}
            <div className="space-y-2">
              <label
                htmlFor="password"
                className="block text-sm font-medium text-text-secondary"
              >
                Password
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-md border border-border bg-bg-secondary py-2.5 pl-10 pr-10 text-sm text-text-primary placeholder:text-text-secondary/50 focus:border-gold focus:outline-none focus:ring-1 focus:ring-gold"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary transition-colors hover:text-text-primary"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Not a bot checkbox */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={() => setNotABot(!notABot)}
                className="flex items-center gap-2.5 text-sm text-text-secondary transition-colors hover:text-text-primary"
              >
                {notABot ? (
                  <CheckSquare className="h-5 w-5 text-gold" />
                ) : (
                  <Square className="h-5 w-5 text-text-secondary" />
                )}
                I&apos;m not a bot
              </button>

              <button
                type="button"
                onClick={() => {
                  setError("Please contact your Gray Yachts advisor to reset your password.");
                }}
                className="text-sm text-gold hover:text-gold-hover transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !notABot}
              className="flex w-full items-center justify-center gap-2 rounded-md bg-gold py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-bg-primary border-t-transparent" />
              ) : (
                <LogIn className="h-4 w-4" />
              )}
              {loading ? "Signing in…" : "Sign In to Portal"}
            </button>
          </form>

          {/* OR divider */}
          <div className="flex items-center gap-4">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs font-medium tracking-wider text-text-secondary">
              OR
            </span>
            <div className="h-px flex-1 bg-border" />
          </div>

          {/* Request Access */}
          <a
            href="mailto:connor@grayyachts.com?subject=Portal%20Access%20Request"
            className="flex w-full items-center justify-center rounded-md border border-border py-2.5 text-sm font-medium text-text-primary transition-colors hover:border-gold/50 hover:text-gold"
          >
            Request Portal Access
          </a>
        </div>
      </div>
    </div>
  );
}
