import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  rateLimited,
  rateLimitResponse,
  INQUIRY_LIMIT,
  SCRAPE_LIMIT,
  VALUATION_LIMIT,
} from "./rate-limit";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));

/** Map-backed stand-in for the RATE_LIMIT Workers KV namespace. */
function mockKv() {
  const store = new Map<string, { value: string; ttl?: number }>();
  const kv = {
    get: vi.fn(async (k: string) => store.get(k)?.value ?? null),
    put: vi.fn(async (k: string, v: string, o?: { expirationTtl?: number }) => {
      store.set(k, { value: v, ttl: o?.expirationTtl });
    }),
  };
  return { kv, store };
}

function useEnv(env: Record<string, unknown>) {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env } as never);
}

beforeEach(() => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-10-23T20:00:30Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("rateLimited (KV counter shared across isolates)", () => {
  it("allows `limit` requests in a window and limits the next one", async () => {
    const { kv } = mockKv();
    useEnv({ RATE_LIMIT: kv });
    for (let i = 1; i <= SCRAPE_LIMIT.limit; i++) {
      const r = await rateLimited("203.0.113.9", SCRAPE_LIMIT);
      expect(r, `request ${i}`).toMatchObject({ limited: false, via: "kv" });
    }
    const over = await rateLimited("203.0.113.9", SCRAPE_LIMIT);
    expect(over.limited).toBe(true);
    expect(over.via).toBe("kv");
    expect(over.retryAfterS).toBeGreaterThan(0);
    expect(over.retryAfterS).toBeLessThanOrEqual(SCRAPE_LIMIT.windowS);
  });

  it("counts IPs and policies independently", async () => {
    const { kv } = mockKv();
    useEnv({ RATE_LIMIT: kv });
    for (let i = 0; i < VALUATION_LIMIT.limit; i++) await rateLimited("198.51.100.1", VALUATION_LIMIT);
    expect((await rateLimited("198.51.100.1", VALUATION_LIMIT)).limited).toBe(true);
    // A different visitor is unaffected.
    expect((await rateLimited("198.51.100.2", VALUATION_LIMIT)).limited).toBe(false);
    // The same visitor still has quota on another route.
    expect((await rateLimited("198.51.100.1", SCRAPE_LIMIT)).limited).toBe(false);
  });

  it("keeps the /api/inquiry key format and a TTL of two windows", async () => {
    const { kv, store } = mockKv();
    useEnv({ RATE_LIMIT: kv });
    await rateLimited("1.2.3.4", INQUIRY_LIMIT);
    const bucket = Math.floor(Date.now() / 1000 / INQUIRY_LIMIT.windowS);
    const entry = store.get(`iq:1.2.3.4:${bucket}`);
    expect(entry).toEqual({ value: "1", ttl: INQUIRY_LIMIT.windowS * 2 });
  });

  it("resets when the window rolls over", async () => {
    const { kv } = mockKv();
    useEnv({ RATE_LIMIT: kv });
    for (let i = 0; i <= VALUATION_LIMIT.limit; i++) await rateLimited("1.2.3.4", VALUATION_LIMIT);
    expect((await rateLimited("1.2.3.4", VALUATION_LIMIT)).limited).toBe(true);
    vi.setSystemTime(new Date(Date.now() + VALUATION_LIMIT.windowS * 1000));
    expect((await rateLimited("1.2.3.4", VALUATION_LIMIT)).limited).toBe(false);
  });

  it("uses the native ratelimit binding as a fast path only when the policy names one", async () => {
    const { kv } = mockKv();
    const native = { limit: vi.fn(async () => ({ success: false })) };
    useEnv({ RATE_LIMIT: kv, INQUIRY_RATE_LIMIT: native });
    expect(await rateLimited("1.2.3.4", INQUIRY_LIMIT)).toMatchObject({ limited: true, via: "binding" });
    expect(native.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
    // Other routes never consult the inquiry binding.
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "kv" });
    expect(native.limit).toHaveBeenCalledTimes(1);
  });

  it("fails open without a Cloudflare context, without KV, or when KV throws", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "no-context" });

    useEnv({});
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "no-kv" });

    useEnv({ RATE_LIMIT: { get: async () => { throw new Error("kv down"); }, put: async () => {} } });
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "kv-error" });
  });
});

describe("clientIp", () => {
  it("prefers cf-connecting-ip, then the first x-forwarded-for hop, then 'unknown'", () => {
    expect(clientIp(new Request("https://x/", { headers: { "cf-connecting-ip": "9.9.9.9", "x-forwarded-for": "1.1.1.1, 2.2.2.2" } }))).toBe("9.9.9.9");
    expect(clientIp(new Request("https://x/", { headers: { "x-forwarded-for": " 1.1.1.1 , 2.2.2.2" } }))).toBe("1.1.1.1");
    expect(clientIp(new Request("https://x/"))).toBe("unknown");
  });
});

describe("rateLimitResponse", () => {
  it("is a clear 429 JSON with Retry-After and no caching", async () => {
    const res = rateLimitResponse({ limited: true, via: "kv", retryAfterS: 1234 });
    expect(res.status).toBe(429);
    expect(res.headers.get("Retry-After")).toBe("1234");
    expect(res.headers.get("Cache-Control")).toBe("no-store");
    expect(await res.json()).toEqual({
      ok: false,
      error: "Too many requests from this network — please try again later.",
      code: "rate_limited",
      retryAfterSeconds: 1234,
    });
  });
});

describe("KV write throttling (one write per key per second)", () => {
  /** KV that accepts one write per key per fake-timer second and rejects the rest. */
  function throttlingKv() {
    const store = new Map<string, string>();
    const lastWrite = new Map<string, number>();
    return {
      store,
      get: vi.fn(async (k: string) => store.get(k) ?? null),
      put: vi.fn(async (k: string, v: string) => {
        const sec = Math.floor(Date.now() / 1000);
        if (lastWrite.get(k) === sec) throw new Error("KV PUT failed: 429 Too Many Requests");
        lastWrite.set(k, sec);
        store.set(k, v);
      }),
    };
  }

  it("keeps an exhausted quota at 429 across rapid retries even though every write fails", async () => {
    const kv = throttlingKv();
    useEnv({ RATE_LIMIT: kv });
    // Fill the quota one request per second (writes succeed).
    for (let i = 0; i < SCRAPE_LIMIT.limit; i++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      expect((await rateLimited("1.2.3.4", SCRAPE_LIMIT)).limited).toBe(false);
    }
    // Same second: 25 retries. The decision comes from the read, so none pass.
    vi.setSystemTime(new Date(Date.now() + 1000));
    const results = [];
    for (let i = 0; i < 25; i++) results.push(await rateLimited("1.2.3.4", SCRAPE_LIMIT));
    expect(results.every(r => r.limited && r.via === "kv")).toBe(true);
  });

  it("never lets a failed write authorize a request, and still counts once per second under a burst", async () => {
    const kv = throttlingKv();
    useEnv({ RATE_LIMIT: kv });
    // 5 requests in one second: the first write lands, 4 are throttled.
    for (let i = 0; i < 5; i++) expect((await rateLimited("1.2.3.4", VALUATION_LIMIT)).via).toBe("kv");
    expect(kv.put).toHaveBeenCalledTimes(5);
    const bucket = Math.floor(Date.now() / 1000 / VALUATION_LIMIT.windowS);
    expect(kv.store.get(`valuation:1.2.3.4:${bucket}`)).toBe("1");
    // One request per second afterwards is counted normally until the window locks.
    let limitedAt = 0;
    for (let s = 1; s <= VALUATION_LIMIT.limit + 1; s++) {
      vi.setSystemTime(new Date(Date.now() + 1000));
      if ((await rateLimited("1.2.3.4", VALUATION_LIMIT)).limited) { limitedAt = s; break; }
    }
    expect(limitedAt).toBe(VALUATION_LIMIT.limit); // 1 counted in the burst + (limit-1) singles, then 429
  });

  it("fails open only when the read itself fails", async () => {
    useEnv({ RATE_LIMIT: { get: async () => { throw new Error("kv down"); }, put: vi.fn() } });
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "kv-error" });
  });
});
