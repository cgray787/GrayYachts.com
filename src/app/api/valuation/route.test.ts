import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { VALUATION_LIMIT } from "@/lib/rate-limit";
import { fakeLimiterNamespace } from "@/test/limiter-namespace";
import { POST } from "./route";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("@/lib/valuation-store", () => ({
  storageConfigured: () => false,
  insertLead: vi.fn(),
  uploadPhoto: vi.fn(),
  attachPhotos: vi.fn(),
}));

const url = "https://grayyachts.com/api/valuation";
const lead = { name: "Test Owner", email: "owner@example.com", phone: "+1 206 555 0100", brand: "Axopar" };

function post(body: unknown, headers: Record<string, string> = {}) {
  return POST(new Request(url, { method: "POST", headers: { "content-type": "application/json", ...headers }, body: typeof body === "string" ? body : JSON.stringify(body) }));
}

let ns: ReturnType<typeof fakeLimiterNamespace>;
beforeEach(() => {
  ns = fakeLimiterNamespace();
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { RATE_LIMITER: ns } } as never);
  // No mailer in tests: a request that reaches the mailer check (500
  // mailer_unconfigured) has therefore passed validation AND the limiter,
  // without any email or storage side effect.
  vi.stubEnv("RESEND_API_KEY", "");
});
afterEach(() => { vi.unstubAllEnvs(); vi.resetAllMocks(); });

it("rejects bad JSON and honeypot submissions before touching the limiter", async () => {
  expect((await post("{not json")).status).toBe(400);
  expect(await (await post({})).json()).toMatchObject({ ok: false, error: "missing_required" });
  expect((await post({ ...lead, _gotcha: "spam" })).status).toBe(200);
  expect(ns.fetches).toBe(0);
});

it(`allows ${VALUATION_LIMIT.limit} leads per IP per window and answers the next with 429 before any side effect`, async () => {
  for (let i = 1; i <= VALUATION_LIMIT.limit; i++) {
    const res = await post(lead, { "cf-connecting-ip": "203.0.113.7" });
    expect(await res.json(), `lead ${i}`).toMatchObject({ ok: false, error: "mailer_unconfigured" });
  }
  const res = await post(lead, { "cf-connecting-ip": "203.0.113.7" });
  expect(res.status).toBe(429);
  expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
  expect(await res.json()).toMatchObject({ ok: false, code: "rate_limited", error: expect.stringContaining("try again later") });
  // Another visitor is unaffected.
  expect(await (await post(lead, { "cf-connecting-ip": "203.0.113.8" })).json()).toMatchObject({ error: "mailer_unconfigured" });
});

it("fails open when the limiter binding is absent instead of blocking sellers", async () => {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: {} } as never);
  for (let i = 0; i <= VALUATION_LIMIT.limit; i++) {
    expect(await (await post(lead)).json()).toMatchObject({ error: "mailer_unconfigured" });
  }
});
