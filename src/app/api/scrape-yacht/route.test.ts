import { getCloudflareContext } from "@opennextjs/cloudflare";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { fetchBoatsGroupListing } from "@/lib/boats-group-api";
import { SCRAPE_LIMIT } from "@/lib/rate-limit";
import { GET } from "./route";

vi.mock("@opennextjs/cloudflare", () => ({ getCloudflareContext: vi.fn() }));
vi.mock("@/lib/boats-group-api", () => ({ fetchBoatsGroupListing: vi.fn() }));
vi.mock("@/lib/yacht-photo-store", () => ({ photoBucket: vi.fn(async () => ({ get: async () => null, put: vi.fn() })), savedPhotoUrl: (id: string) => `/api/yacht-image?id=${id}` }));
vi.mock("@/lib/resolve-yacht-photo", () => ({ resolveYachtPhoto: vi.fn(async () => "/api/yacht-image?id=" + "a".repeat(64)) }));

const listing = "https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/";
const base = "https://grayyachts.com/api/scrape-yacht";

function kvSeeded(count: number) {
  const bucket = Math.floor(Date.now() / 1000 / SCRAPE_LIMIT.windowS);
  const store = new Map<string, string>([[`scrape:203.0.113.5:${bucket}`, String(count)]]);
  return {
    get: vi.fn(async (k: string) => store.get(k) ?? null),
    put: vi.fn(async (k: string, v: string) => { store.set(k, v); }),
  };
}

const fetchSpy = vi.fn(async () => { throw new Error("network must not be touched in this test"); });
beforeEach(() => {
  vi.stubGlobal("fetch", fetchSpy);
  vi.mocked(fetchBoatsGroupListing).mockResolvedValue({
    data: { name: "2018 Lagoon 50", builder: "Lagoon", year: 2018, flags: [] },
    photos: [],
  } as never);
});
afterEach(() => { vi.unstubAllGlobals(); vi.resetAllMocks(); });

it("still answers 400 without a url or for a private host, without consulting the limiter", async () => {
  const kv = kvSeeded(0);
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { RATE_LIMIT: kv } } as never);
  expect(await (await GET(new NextRequest(base))).json()).toEqual({ error: "Missing url parameter" });
  expect((await GET(new NextRequest(`${base}?url=${encodeURIComponent("http://169.254.169.254/latest")}`))).status).toBe(400);
  expect(getCloudflareContext).not.toHaveBeenCalled();
  expect(fetchBoatsGroupListing).not.toHaveBeenCalled();
});

it(`answers the ${SCRAPE_LIMIT.limit + 1}th uncached scrape per IP per window with 429 before any upstream call`, async () => {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { RATE_LIMIT: kvSeeded(SCRAPE_LIMIT.limit) } } as never);
  const res = await GET(new NextRequest(`${base}?url=${encodeURIComponent(listing)}`, { headers: { "cf-connecting-ip": "203.0.113.5" } }));
  expect(res.status).toBe(429);
  expect(res.headers.get("Retry-After")).toMatch(/^\d+$/);
  expect(res.headers.get("Cache-Control")).toBe("no-store");
  expect(await res.json()).toMatchObject({ ok: false, code: "rate_limited", error: expect.stringContaining("try again later") });
  expect(fetchBoatsGroupListing).not.toHaveBeenCalled();
  expect(fetchSpy).not.toHaveBeenCalled();
});

it("lets a visitor under the limit through to the scrape pipeline", async () => {
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { RATE_LIMIT: kvSeeded(SCRAPE_LIMIT.limit - 1) } } as never);
  const res = await GET(new NextRequest(`${base}?url=${encodeURIComponent(listing)}`, { headers: { "cf-connecting-ip": "203.0.113.5" } }));
  expect(res.status).toBe(200);
  expect(await res.json()).toMatchObject({ name: "2018 Lagoon 50", builder: "Lagoon" });
  expect(fetchBoatsGroupListing).toHaveBeenCalledWith(listing);
});
