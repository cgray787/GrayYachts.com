import { getCloudflareContext } from "@opennextjs/cloudflare";
import { NextResponse } from "next/server";
import type { ReserveResult } from "./rate-limiter-do";

/**
 * Per-IP rate limiting for the public routes that cost money or write storage
 * (/api/inquiry, /api/scrape-yacht, /api/import-yacht-screenshots,
 * /api/yacht-image uploads, /api/valuation).
 *
 * Quota is reserved atomically in the RATE_LIMITER Durable Object
 * (src/lib/rate-limiter-do.ts), one object per `prefix:ip`. History:
 *  - an in-process Map does NOT work: Workers spreads requests across
 *    isolates, so a per-isolate counter never accumulates (verified against
 *    production, 7 rapid posts produced no 429);
 *  - a Workers KV counter is not atomic and accepts one write per key per
 *    second, so a concurrent burst passed every request through (Codex review
 *    of PR #76: a simulated 1,000-request burst got all 1,000 past a 10/hour
 *    limit). The Durable Object serializes the read-check-write per visitor;
 *  - Cloudflare's native `ratelimit` binding was never observed enforcing
 *    (beta, likely plan-gated); a policy may still name one as a free fast path.
 *
 * Failure handling:
 *  - no Cloudflare context outside a production build (`next dev`, unit
 *    tests) → allow; in a production build a missing context is treated as
 *    a limiter failure, never as permission;
 *  - the limiter binding is missing or the reservation fails in a Worker →
 *    the policy's `onError` decides. Routes that pay for upstream calls or
 *    write storage on a visitor's behalf use "closed" (a 429 rather than
 *    unmetered spend); the two lead forms use "open" so a limiter outage
 *    never drops a seller or buyer inquiry.
 */

export type RateLimitPolicy = {
  /** Object-name prefix; part of the per-visitor Durable Object identity. */
  prefix: string;
  /** Requests allowed per window per IP. */
  limit: number;
  /** Fixed window length in seconds. */
  windowS: number;
  /** What to do when quota cannot be reserved because the limiter is unavailable. */
  onError: "open" | "closed";
  /** Optional native `ratelimit` binding name, consulted first. */
  nativeBinding?: string;
};

export type RateLimitResult = {
  limited: boolean;
  /** Which layer decided: binding | do | no-context | no-limiter | limiter-error. */
  via: string;
  /** Seconds until the current window ends (what Retry-After should say). */
  retryAfterS: number;
};

/** Contact form: 5 per minute (unchanged from the original in-route limiter). */
export const INQUIRY_LIMIT: RateLimitPolicy = { prefix: "iq", limit: 5, windowS: 60, onError: "open", nativeBinding: "INQUIRY_RATE_LIMIT" };
/** Listing scrape: Firecrawl + Claude vision + R2 write per uncached URL. */
export const SCRAPE_LIMIT: RateLimitPolicy = { prefix: "scrape", limit: 10, windowS: 3600, onError: "closed" };
/** Screenshot import: up to four 5 MB images through Claude vision per call. */
export const SCREENSHOT_IMPORT_LIMIT: RateLimitPolicy = { prefix: "import", limit: 10, windowS: 3600, onError: "closed" };
/** Photo upload: up to 8 MB into R2 per call. */
export const PHOTO_UPLOAD_LIMIT: RateLimitPolicy = { prefix: "upload", limit: 20, windowS: 3600, onError: "closed" };
/** Valuation lead: Supabase insert + photo upload + email per call. */
export const VALUATION_LIMIT: RateLimitPolicy = { prefix: "valuation", limit: 5, windowS: 3600, onError: "open" };

type RateLimiter = { limit: (o: { key: string }) => Promise<{ success: boolean }> };
/** The slice of DurableObjectNamespace this module uses. */
export type LimiterNamespace = {
  idFromName(name: string): unknown;
  get(id: unknown): { fetch(input: string, init?: RequestInit): Promise<Response> };
};

/** Visitor address as Cloudflare reports it; "unknown" outside Workers. */
export function clientIp(req: Request): string {
  return (
    req.headers.get("cf-connecting-ip") ??
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    "unknown"
  );
}

export async function rateLimited(ip: string, policy: RateLimitPolicy): Promise<RateLimitResult> {
  const nowS = Math.floor(Date.now() / 1000);
  const windowLeftS = policy.windowS - (nowS % policy.windowS);
  const tag = `[rate-limit:${policy.prefix}]`;
  const unavailable = (via: string): RateLimitResult => ({
    limited: policy.onError === "closed",
    via,
    retryAfterS: policy.onError === "closed" ? Math.min(60, windowLeftS) : windowLeftS,
  });

  let env: Record<string, unknown>;
  try {
    env = (await getCloudflareContext({ async: true })).env as unknown as Record<string, unknown>;
  } catch (e) {
    // `next dev` and unit tests run without a Worker: nothing to count against.
    // A production build always runs in one, so there a missing context is a
    // limiter failure and the policy's onError decides.
    if (process.env.NODE_ENV !== "production") return { limited: false, via: "no-context", retryAfterS: windowLeftS };
    console.error(`${tag} no cf context in production (onError=${policy.onError})`, e);
    return unavailable("no-context");
  }

  // Fast path: Cloudflare's native limiter, when the policy has one and it enforces.
  if (policy.nativeBinding) {
    try {
      const native = env[policy.nativeBinding] as RateLimiter | undefined;
      if (native) {
        const { success } = await native.limit({ key: ip });
        if (!success) return { limited: true, via: "binding", retryAfterS: windowLeftS };
      }
    } catch (e) {
      console.error(`${tag} native limiter failed`, e);
    }
  }

  // Authoritative: atomic reservation in this visitor's Durable Object.
  const ns = env.RATE_LIMITER as LimiterNamespace | undefined;
  if (!ns) {
    console.error(`${tag} RATE_LIMITER binding missing (onError=${policy.onError})`);
    return unavailable("no-limiter");
  }
  try {
    const stub = ns.get(ns.idFromName(`${policy.prefix}:${ip}`));
    const res = await stub.fetch("https://rate-limiter/reserve", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: policy.limit, windowS: policy.windowS }),
    });
    if (!res.ok) throw new Error(`limiter answered ${res.status}`);
    const r = (await res.json()) as ReserveResult;
    if (typeof r.allowed !== "boolean") throw new Error("limiter answered without a decision");
    return { limited: !r.allowed, via: "do", retryAfterS: r.retryAfterS };
  } catch (e) {
    console.error(`${tag} reservation failed (onError=${policy.onError})`, e);
    return unavailable("limiter-error");
  }
}

export const RATE_LIMIT_MESSAGE = "Too many requests from this network — please try again later.";

/**
 * The shared 429 for the cost/write routes (inquiry keeps its own wording).
 * `error` carries the readable text because the compare-tool clients show
 * `data.error` to the visitor; `code` is the stable machine-readable value.
 */
export function rateLimitResponse(result: RateLimitResult) {
  return NextResponse.json(
    {
      ok: false,
      error: RATE_LIMIT_MESSAGE,
      code: "rate_limited",
      retryAfterSeconds: result.retryAfterS,
    },
    {
      status: 429,
      headers: { "Retry-After": String(result.retryAfterS), "Cache-Control": "no-store" },
    },
  );
}
