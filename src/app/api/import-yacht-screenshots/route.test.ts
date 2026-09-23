import { afterEach, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import { photoBucket } from '@/lib/yacht-photo-store';
import { extractScreenshots } from '@/lib/yacht-screenshot-extract';
import { GET, POST } from './route';
vi.mock('@/lib/yacht-photo-store', () => ({ photoBucket: vi.fn(), savedPhotoUrl: (id: string) => `/api/yacht-image?id=${id}` }));
vi.mock('@/lib/yacht-screenshot-extract', () => ({ extractScreenshots: vi.fn() }));
afterEach(() => vi.resetAllMocks());
const base = 'https://grayyachts.com/api/import-yacht-screenshots';
it('persists a captured listing and retrieves it without the original browser or another extraction', async () => {
  const files = new Map<string, ArrayBuffer>();
  const imageId = 'a'.repeat(64);
  files.set(imageId, new Uint8Array([137,80,78,71]).buffer);
  vi.mocked(photoBucket).mockResolvedValue({
    get: async key => files.has(key) ? { arrayBuffer: async () => files.get(key)!, httpMetadata: { contentType: key === imageId ? 'image/png' : 'application/json' } } : null,
    put: async (key, value) => { files.set(key, value); },
  });
  vi.mocked(extractScreenshots).mockResolvedValue({ name: '2018 Lagoon 50', builder: 'Lagoon', year: 2018, warnings: ['Off market'] } as never);
  const res = await POST(new NextRequest(base, { method:'POST', headers:{origin:'https://grayyachts.com'}, body:JSON.stringify({url:'https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/',photoId:imageId,specIds:[imageId]}) }));
  expect(res.status).toBe(200);
  const data = await res.json();
  expect(data.flags).toContain('Off market');
  const reopened = await GET(new NextRequest(`${base}?id=${data.savedImportId}`));
  expect(reopened.status).toBe(200);
  expect(await reopened.json()).toMatchObject({name:data.name,imageUrl:data.imageUrl,confidence:'low'});
  expect(extractScreenshots).toHaveBeenCalledTimes(1);
});
it('rejects arbitrary object keys and returns useful missing/storage errors', async () => {
  expect((await GET(new NextRequest(`${base}?id=../../photo`))).status).toBe(400);
  expect(photoBucket).not.toHaveBeenCalled();
  vi.mocked(photoBucket).mockResolvedValue({get:async()=>null,put:vi.fn()});
  const request = new NextRequest(`${base}?id=12345678-1234-4123-8123-123456789abc`);
  expect((await GET(request)).status).toBe(404);
  vi.mocked(photoBucket).mockRejectedValue(new Error('Storage unavailable'));
  expect((await GET(request)).status).toBe(503);
});
