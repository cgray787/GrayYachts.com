import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  clientIp,
  rateLimited,
  rateLimitResponse,
  INQUIRY_LIMIT,
  PHOTO_UPLOAD_LIMIT,
  SCRAPE_LIMIT,
  VALUATION_LIMIT,
} from "./rate-limit";
import { RateLimiterDO } from "./rate-limiter-do";
import { fakeLimiterNamespace, fakeState } from "@/test/limiter-namespace";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));

function setEnv(env: Record<string, unknown>) {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env } as never);
}

beforeEach(() => {
  vi.useFakeTimers({ toFake: ["Date"] });
  vi.setSystemTime(new Date("2026-10-23T20:00:30Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.resetAllMocks();
});

describe("RateLimiterDO (atomic reservation)", () => {
  it("reserves exactly `limit` slots out of 1,000 concurrent requests", async () => {
    const limiter = new RateLimiterDO(fakeState());
    const results = await Promise.all(Array.from({ length: 1000 }, () => limiter.reserve(10, 3600)));
    expect(results.filter(r => r.allowed)).toHaveLength(10);
    expect(results.filter(r => !r.allowed).every(r => r.retryAfterS > 0 && r.retryAfterS <= 3600)).toBe(true);
  });

  it("control: the same burst against a non-serialized read-modify-write overshoots, so the test above is meaningful", async () => {
    const racy = new RateLimiterDO(fakeState({ serialize: false }));
    const results = await Promise.all(Array.from({ length: 1000 }, () => racy.reserve(10, 3600)));
    expect(results.filter(r => r.allowed).length).toBeGreaterThan(10);
  });

  it("starts a fresh window when the bucket rolls over and arms a cleanup alarm", async () => {
    const state = fakeState();
    const limiter = new RateLimiterDO(state);
    for (let i = 0; i < 5; i++) expect((await limiter.reserve(5, 3600)).allowed).toBe(true);
    expect((await limiter.reserve(5, 3600)).allowed).toBe(false);
    const bucket = Math.floor(Date.now() / 1000 / 3600);
    expect(state.alarmAt).toBe((bucket + 2) * 3600 * 1000);
    vi.setSystemTime(new Date(Date.now() + 3600 * 1000));
    expect((await limiter.reserve(5, 3600)).allowed).toBe(true);
    await limiter.alarm();
    expect(state.data.size).toBe(0);
  });

  it("rejects malformed reservation requests over fetch", async () => {
    const limiter = new RateLimiterDO(fakeState());
    const post = (body: string) => limiter.fetch(new Request("https://rate-limiter/reserve", { method: "POST", body }));
    expect((await post("not json")).status).toBe(400);
    expect((await post(JSON.stringify({ limit: 0, windowS: 60 }))).status).toBe(400);
    expect((await post(JSON.stringify({ limit: 5, windowS: 1.5 }))).status).toBe(400);
    expect(await (await post(JSON.stringify({ limit: 5, windowS: 60 }))).json()).toMatchObject({ allowed: true, count: 1 });
  });
});

describe("rateLimited", () => {
  it("lets exactly `limit` of 1,000 concurrent requests from one IP through (Codex review of #76)", async () => {
    const ns = fakeLimiterNamespace();
    setEnv({ RATE_LIMITER: ns });
    const results = await Promise.all(Array.from({ length: 1000 }, () => rateLimited("203.0.113.9", SCRAPE_LIMIT)));
    expect(results.filter(r => !r.limited)).toHaveLength(SCRAPE_LIMIT.limit);
    expect(results.every(r => r.via === "do")).toBe(true);
  });

  it("allows `limit` sequential requests, then limits with a Retry-After inside the window", async () => {
    setEnv({ RATE_LIMITER: fakeLimiterNamespace() });
    for (let i = 1; i <= PHOTO_UPLOAD_LIMIT.limit; i++) {
      expect(await rateLimited("203.0.113.9", PHOTO_UPLOAD_LIMIT), `request ${i}`).toMatchObject({ limited: false, via: "do" });
    }
    const over = await rateLimited("203.0.113.9", PHOTO_UPLOAD_LIMIT);
    expect(over).toMatchObject({ limited: true, via: "do" });
    expect(over.retryAfterS).toBeGreaterThan(0);
    expect(over.retryAfterS).toBeLessThanOrEqual(PHOTO_UPLOAD_LIMIT.windowS);
  });

  it("counts IPs and policies in separate objects", async () => {
    const ns = fakeLimiterNamespace();
    setEnv({ RATE_LIMITER: ns });
    for (let i = 0; i < VALUATION_LIMIT.limit; i++) await rateLimited("198.51.100.1", VALUATION_LIMIT);
    expect((await rateLimited("198.51.100.1", VALUATION_LIMIT)).limited).toBe(true);
    expect((await rateLimited("198.51.100.2", VALUATION_LIMIT)).limited).toBe(false);
    expect((await rateLimited("198.51.100.1", SCRAPE_LIMIT)).limited).toBe(false);
    expect([...ns.objects.keys()].sort()).toEqual(["scrape:198.51.100.1", "valuation:198.51.100.1", "valuation:198.51.100.2"]);
  });

  it("uses the native ratelimit binding as a fast path only when the policy names one", async () => {
    const ns = fakeLimiterNamespace();
    const native = { limit: vi.fn(async () => ({ success: false })) };
    setEnv({ RATE_LIMITER: ns, INQUIRY_RATE_LIMIT: native });
    expect(await rateLimited("1.2.3.4", INQUIRY_LIMIT)).toMatchObject({ limited: true, via: "binding" });
    expect(native.limit).toHaveBeenCalledWith({ key: "1.2.3.4" });
    expect(ns.fetches).toBe(0);
    expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: false, via: "do" });
    expect(native.limit).toHaveBeenCalledTimes(1);
  });

  it("allows everything without a Cloudflare context outside production (next dev, tests)", async () => {
    vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
    for (const policy of [SCRAPE_LIMIT, VALUATION_LIMIT]) {
      expect(await rateLimited("1.2.3.4", policy)).toMatchObject({ limited: false, via: "no-context" });
    }
  });

  it("treats a missing context in a production build as a limiter failure, not permission", async () => {
    vi.stubEnv("NODE_ENV", "production");
    try {
      vi.mocked(getCloudflareContext).mockRejectedValue(new Error("no context"));
      expect(await rateLimited("1.2.3.4", SCRAPE_LIMIT)).toMatchObject({ limited: true, via: "no-context" });
      expect(await rateLimited("1.2.3.4", VALUATION_LIMIT)).toMatchObject({ limited: false, via: "no-context" });
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it("fails CLOSED for cost/storage routes and OPEN for lead forms when quota cannot be reserved", async () => {
    const broken = { idFromName: () => ({}), get: () => ({ fetch: async () => { throw new Error("DO unavailable"); } }) };
    const answers500 = { idFromName: () => ({}), get: () => ({ fetch: async () => new Response("x", { status: 500 }) }) };
    for (const env of [{}, { RATE_LIMITER: broken }, { RATE_LIMITER: answers500 }]) {
      setEnv(env);
      for (const policy of [SCRAPE_LIMIT, PHOTO_UPLOAD_LIMIT]) {
        const r = await rateLimited("1.2.3.4", policy);
        expect(r.limited, `${policy.prefix} with ${Object.keys(env)}`).toBe(true);
        expect(r.retryAfterS).toBeLessThanOrEqual(60);
      }
      for (const policy of [VALUATION_LIMIT, INQUIRY_LIMIT]) {
        expect((await rateLimited("1.2.3.4", policy)).limited, `${policy.prefix} with ${Object.keys(env)}`).toBe(false);
      }
    }
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
  it("is a 429 whose `error` is readable text (clients show data.error), with a stable code and Retry-After", async () => {
    const res = rateLimitResponse({ limited: true, via: "do", retryAfterS: 1234 });
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
