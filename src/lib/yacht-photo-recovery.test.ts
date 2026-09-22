import { afterEach, describe, expect, it, vi } from 'vitest';
import { getCloudflareContext } from '@opennextjs/cloudflare';
import { NextRequest } from 'next/server';
import { GET as scrapeGET } from '@/app/api/scrape-yacht/route';
import { GET, POST } from '@/app/api/yacht-image/route';
import { photoKey, type PhotoBucket } from './yacht-photo-store';
import { resolveYachtPhoto } from './resolve-yacht-photo';
import { photosFromHtml, normalizePhotoUrl, canonicalListingUrl, blockedListingPage } from './yacht-photo-candidates';
vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));
const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 3]).buffer;
const listing = 'https://broker.example/yacht/123';
function storage() {
  const disk = new Map<string, { bytes: ArrayBuffer; contentType: string }>();
  const bucket: PhotoBucket = {
    get: async key => { const saved = disk.get(key); return saved ? { arrayBuffer: async () => saved.bytes, httpMetadata: { contentType: saved.contentType } } : null; },
    put: async (key, bytes, options) => { disk.set(key, { bytes, contentType: options.httpMetadata.contentType }); },
  };
  vi.mocked(getCloudflareContext).mockResolvedValue({ env: { YACHT_PHOTOS: bucket } } as never);
  return { bucket, disk };
}
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });
describe('photo import recovery regressions', () => {
  it('normalizes escaped and relative URLs without permitting private addresses', () => {
    expect(normalizePhotoUrl('/gallery/boat.jpg?w=800&amp;h=600', listing)).toBe('https://broker.example/gallery/boat.jpg?w=800&h=600');
    expect(normalizePhotoUrl('http://localhost:3000/listings/poulsbo/hero.jpg', 'https://grayyachts.com/fleet/poulsbo')).toBe('https://grayyachts.com/listings/poulsbo/hero.jpg');
    expect(normalizePhotoUrl('http://localhost:3000/listings/photo.jpg', listing)).toBeNull();
    expect(normalizePhotoUrl('http://169.254.169.254/secret', listing)).toBeNull();
  });
  it('rejects blocked-page images and collects multiple gallery candidates in priority order', () => {
    expect(blockedListingPage('<title>Access Denied</title>')).toBe(true);
    expect(photosFromHtml('<title>Access Denied</title><meta property="og:image" content="/error.jpg">', listing)).toEqual([]);
    expect(photosFromHtml('<meta property="og:image" content="/expired.jpg"><script type="application/ld+json">{"image":["/boat.jpg","/second.jpg"]}</script><img class="gallery" data-src="/third.jpg"><img src="/unrelated.jpg">', listing)).toEqual([
      'https://broker.example/expired.jpg', 'https://broker.example/boat.jpg', 'https://broker.example/second.jpg', 'https://broker.example/third.jpg',
    ]);
  });
  it('tries the next photo after an expired candidate, then survives upstream failure', async () => {
    const { bucket } = storage();
    const fetcher = vi.fn(async (url: string) => url.includes('expired') ? new Response('Denied', { status: 403 }) : new Response(jpeg));
    vi.stubGlobal('fetch', fetcher);
    const saved = await resolveYachtPhoto(bucket, listing, ['/expired.jpg', '/boat.jpg'], false);
    expect(saved).toMatch(/^\/api\/yacht-image\?id=[a-f0-9]{64}$/);
    expect(fetcher).toHaveBeenCalledTimes(2);
    fetcher.mockRejectedValue(new Error('upstream removed'));
    expect(await resolveYachtPhoto(bucket, listing + '/?utm_source=email', [], false)).toBe(saved);
    expect(fetcher).toHaveBeenCalledTimes(2);
  });
  it('migrates a legacy source-key photo without downloading it again', async () => {
    const { bucket } = storage();
    const source = 'https://cdn.example/boat.jpg';
    const legacy = await photoKey(listing + '\n' + source);
    await bucket.put(legacy, jpeg, { httpMetadata: { contentType: 'image/jpeg' } });
    const fetcher = vi.fn(); vi.stubGlobal('fetch', fetcher);
    expect(await resolveYachtPhoto(bucket, listing, [source])).toBe('/api/yacht-image?id=' + await photoKey(canonicalListingUrl(listing)));
    expect(await bucket.get(legacy)).not.toBeNull();
    expect(fetcher).not.toHaveBeenCalled();
  });
  it('continues within a provider when its first photo is invalid', async () => {
    const { bucket } = storage();
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url === listing
      ? new Response('<meta property="og:image" content="/expired.jpg"><meta name="twitter:image" content="/boat.jpg">')
      : url.includes('expired') ? new Response('<html>denied</html>') : new Response(jpeg)));
    expect(await resolveYachtPhoto(bucket, listing)).toMatch(/id=/);
  });
  it('reports missing stored images as failures rather than successful placeholders', async () => {
    storage();
    const response = await GET(new NextRequest('https://grayyachts.com/api/yacht-image?id=' + '0'.repeat(64)));
    expect(response.status).toBe(404);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('rejects blocked listing imports and never caches them as successful yachts', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', '');
    vi.stubGlobal('fetch', vi.fn(async () => new Response('<title>Access Denied</title>' + ' blocked '.repeat(100))));
    const response = await scrapeGET(new NextRequest('https://grayyachts.com/api/scrape-yacht?url=' + encodeURIComponent(listing)));
    expect(response.status).toBe(502);
    expect(response.headers.get('cache-control')).toBe('no-store');
    expect((await response.json()).error).toContain('could not be read');
  });
  it('saves uploaded bytes under immutable IDs, rejects non-photos and cross-origin writes', async () => {
    const { disk } = storage();
    const request = (body: BodyInit, origin = 'https://grayyachts.com') => new NextRequest('https://grayyachts.com/api/yacht-image', { method: 'POST', headers: { origin }, body });
    expect((await POST(request(jpeg, 'https://other.example'))).status).toBe(403);
    expect((await POST(request('<html>not an image</html>'))).status).toBe(415);
    const response = await POST(request(jpeg));
    expect(response.status).toBe(200);
    const { imageUrl } = await response.json();
    const saved = await GET(new NextRequest('https://grayyachts.com' + imageUrl));
    expect(saved.headers.get('x-image-provider')).toBe('r2-saved-photo');
    expect(await saved.arrayBuffer()).toEqual(jpeg);
    await POST(request(jpeg));
    expect(disk.size).toBe(1);
  });
});
