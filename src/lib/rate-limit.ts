import { NextResponse } from "next/server";

/**
 * Per-IP rate limiting for the public routes that cost money or write storage
 * (/api/inquiry, /api/scrape-yacht, /api/import-yacht-screenshots,
 * /api/yacht-image uploads, /api/valuation). Backed by the RATE_LIMIT Workers
 * KV namespace declared in wrangler.jsonc.
 *
 * Extracted from /api/inquiry, which established the two facts that matter:
 *  - an in-process Map does NOT work: Workers spreads requests across isolates,
 *    so a per-isolate counter never accumulates (verified against production,
 *    7 rapid posts produced no 429);
 *  - Cloudflare's native `ratelimit` binding was never observed enforcing
 *    (beta, likely plan-gated), so KV is the authoritative counter. A policy
 *    may still name a binding as a free fast path.
 *
 * KV read-modify-write is not atomic, so a tight burst can slip an extra
 * request or two through — acceptable here, and far better than no limit.
 * Fails OPEN (allows the request) when there is no Cloudflare context or no
 * KV binding, i.e. `next dev` and unit tests, rather than blocking genuine
 * visitors.
 */

export type RateLimitPolicy = {
  /** KV key prefix; keep stable so deployed counters survive code changes. */
  prefix: string;
  /** Requests allowed per window per IP. */
  limit: number;
  /** Fixed window length in seconds. */
  windowS: number;
  /** Optional native `ratelimit` binding name, consulted before KV. */
  nativeBinding?: string;
};

export type RateLimitResult = {
  limited: boolean;
  /** Which layer decided: binding | kv | no-context | no-kv | kv-error. */
  via: string;
  /** Seconds until the current window ends (what Retry-After should say). */
  retryAfterS: number;
};

/** Contact form: 5 per minute (unchanged from the original in-route limiter). */
export const INQUIRY_LIMIT: RateLimitPolicy = { prefix: "iq", limit: 5, windowS: 60, nativeBinding: "INQUIRY_RATE_LIMIT" };
/** Listing scrape: Firecrawl + Claude vision + R2 write per uncached URL. */
export const SCRAPE_LIMIT: RateLimitPolicy = { prefix: "scrape", limit: 10, windowS: 3600 };
/** Screenshot import: up to four 5 MB images through Claude vision per call. */
export const SCREENSHOT_IMPORT_LIMIT: RateLimitPolicy = { prefix: "import", limit: 10, windowS: 3600 };
/** Photo upload: up to 8 MB into R2 per call. */
export const PHOTO_UPLOAD_LIMIT: RateLimitPolicy = { prefix: "upload", limit: 20, windowS: 3600 };
/** Valuation lead: Supabase insert + photo upload + email per call. */
export const VALUATION_LIMIT: RateLimitPolicy = { prefix: "valuation", limit: 5, windowS: 3600 };

type RateLimiter = { limit: (o: { key: string }) => Promise<{ success: boolean }> };
type KV = {
  get: (k: string) => Promise<string | null>;
  put: (k: string, v: string, o?: { expirationTtl?: number }) => Promise<void>;
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
  const retryAfterS = policy.windowS - (nowS % policy.windowS);
  const tag = `[rate-limit:${policy.prefix}]`;

  let env: Record<string, unknown>;
  try {
    const { getCloudflareContext } = await import("@opennextjs/cloudflare");
    env = (await getCloudflareContext({ async: true })).env as unknown as Record<string, unknown>;
  } catch (e) {
    console.error(`${tag} no cf context`, e);
    return { limited: false, via: "no-context", retryAfterS }; // fail open
  }

  // Fast path: Cloudflare's native limiter, when the policy has one and it enforces.
  if (policy.nativeBinding) {
    try {
      const native = env[policy.nativeBinding] as RateLimiter | undefined;
      if (native) {
        const { success } = await native.limit({ key: ip });
        if (!success) return { limited: true, via: "binding", retryAfterS };
      }
    } catch (e) {
      console.error(`${tag} native limiter failed`, e);
    }
  }

  // Authoritative: KV counter, shared across isolates.
  const kv = env.RATE_LIMIT as KV | undefined;
  if (!kv) return { limited: false, via: "no-kv", retryAfterS };
  const bucket = Math.floor(nowS / policy.windowS);
  const key = `${policy.prefix}:${ip}:${bucket}`;
  let n: number;
  try {
    n = Number((await kv.get(key)) ?? "0") + 1;
  } catch (e) {
    console.error(`${tag} kv read failed`, e);
    return { limited: false, via: "kv-error", retryAfterS }; // fail open on a KV outage only
  }
  // Decide from the read, before writing: an exhausted quota is rejected no
  // matter what happens to the write below, so a client that retries fast after
  // a 429 stays at 429.
  if (n > policy.limit) return { limited: true, via: "kv", retryAfterS };
  // KV accepts one write per key per second, so under a burst some of these
  // writes fail. A failed write never authorizes anything (the decision above
  // already passed); it only means the counter advances at most once per second
  // per IP, so a burst can exceed `limit` by roughly one request per second of
  // burst before the window locks. An atomic counter (Durable Object) would
  // close that gap; KV is what this site has today.
  try {
    await kv.put(key, String(n), { expirationTtl: policy.windowS * 2 });
  } catch (e) {
    console.error(`${tag} kv write failed (counter not advanced)`, e);
  }
  return { limited: false, via: "kv", retryAfterS };
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
