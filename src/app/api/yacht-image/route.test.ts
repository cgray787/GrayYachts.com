import { getCloudflareContext } from '@opennextjs/cloudflare';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { photoBucket } from '@/lib/yacht-photo-store';
import { PHOTO_UPLOAD_LIMIT } from '@/lib/rate-limit';
import { fakeLimiterNamespace } from '@/test/limiter-namespace';
import { POST } from './route';

vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
vi.mock('@/lib/yacht-photo-store', async importOriginal => ({
  ...(await importOriginal<typeof import('@/lib/yacht-photo-store')>()),
  photoBucket: vi.fn(),
}));

const base = 'https://grayyachts.com/api/yacht-image';
const PNG = [137, 80, 78, 71, 13, 10, 26, 10];

function upload(i: number, headers: Record<string, string> = { origin: 'https://grayyachts.com' }) {
  // Distinct bytes per upload: the store is content-addressed, so identical
  // bytes would dedupe and never reach R2 a second time.
  const bytes = new Uint8Array([...PNG, i & 255, (i >> 8) & 255]);
  return new NextRequest(base, { method: 'POST', headers: { ...headers, 'content-length': String(bytes.length) }, body: bytes });
}

let ns: ReturnType<typeof fakeLimiterNamespace>;
let put: ReturnType<typeof vi.fn>;
beforeEach(() => {
  ns = fakeLimiterNamespace();
  put = vi.fn();
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { RATE_LIMITER: ns } } as never);
  vi.mocked(photoBucket).mockResolvedValue({ get: async () => null, put });
});
afterEach(() => vi.resetAllMocks());

it(`accepts ${PHOTO_UPLOAD_LIMIT.limit} uploads per IP per window and answers the next with a clear 429 before reading the body`, async () => {
  for (let i = 1; i <= PHOTO_UPLOAD_LIMIT.limit; i++) {
    const res = await POST(upload(i));
    expect(res.status, `upload ${i}`).toBe(200);
    expect((await res.json()).imageUrl).toMatch(/^\/api\/yacht-image\?id=/);
  }
  expect(put).toHaveBeenCalledTimes(PHOTO_UPLOAD_LIMIT.limit);

  const res = await POST(upload(PHOTO_UPLOAD_LIMIT.limit + 1));
  expect(res.status).toBe(429);
  expect(res.headers.get('Retry-After')).toMatch(/^\d+$/);
  expect(await res.json()).toMatchObject({ ok: false, code: 'rate_limited', error: expect.stringContaining('try again later') });
  expect(put).toHaveBeenCalledTimes(PHOTO_UPLOAD_LIMIT.limit);
  expect(photoBucket).toHaveBeenCalledTimes(PHOTO_UPLOAD_LIMIT.limit);
});

it('keeps the existing 403 / 413 guards ahead of the limiter so rejected requests do not consume quota', async () => {
  expect((await POST(upload(1, {}))).status).toBe(403);
  const big = new NextRequest(base, { method: 'POST', headers: { origin: 'https://grayyachts.com', 'content-length': String(9 * 1024 * 1024) }, body: new Uint8Array(PNG) });
  expect((await POST(big)).status).toBe(413);
  expect(ns.fetches).toBe(0);
});

it('stores exactly the quota from a concurrent burst of 100 distinct uploads (atomic reservation)', async () => {
  const res = await Promise.all(Array.from({ length: 100 }, (_, i) => POST(upload(1000 + i))));
  expect(res.filter(r => r.status === 200)).toHaveLength(PHOTO_UPLOAD_LIMIT.limit);
  expect(res.filter(r => r.status === 429)).toHaveLength(100 - PHOTO_UPLOAD_LIMIT.limit);
  expect(put).toHaveBeenCalledTimes(PHOTO_UPLOAD_LIMIT.limit);
});

it('counts visitors separately by cf-connecting-ip', async () => {
  for (let i = 1; i <= PHOTO_UPLOAD_LIMIT.limit + 1; i++) await POST(upload(i, { origin: 'https://grayyachts.com', 'cf-connecting-ip': '203.0.113.1' }));
  expect((await POST(upload(99, { origin: 'https://grayyachts.com', 'cf-connecting-ip': '203.0.113.1' }))).status).toBe(429);
  expect((await POST(upload(99, { origin: 'https://grayyachts.com', 'cf-connecting-ip': '203.0.113.2' }))).status).toBe(200);
});
