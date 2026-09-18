import { getCloudflareContext } from '@opennextjs/cloudflare';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { archivePhoto, photoKey, fetchPhoto, type PhotoBucket } from './yacht-photo-store';
import { heroFromHtml, heroImageFor } from './scrape-providers';
import { loadCatalog, SEED_YACHTS, STORAGE_KEY } from './yacht-catalog';

vi.mock('@opennextjs/cloudflare', () => ({ getCloudflareContext: vi.fn() }));

const jpeg = new Uint8Array([255, 216, 255, 224, 1, 2, 3]).buffer;
afterEach(() => { vi.unstubAllGlobals(); vi.unstubAllEnvs(); vi.restoreAllMocks(); });

describe('permanent original photo storage', () => {
  it('retains the original bytes across new instances and upstream outages', async () => {
    const disk = new Map<string, { data: ArrayBuffer; contentType: string }>();
    const newBucket = (): PhotoBucket => ({
      get: async key => { const value = disk.get(key); return value ? { arrayBuffer: async () => value.data, httpMetadata: { contentType: value.contentType } } : null; },
      put: async (key, data, options) => { disk.set(key, { data, contentType: options.httpMetadata.contentType }); },
    });
    const fetcher = vi.fn().mockResolvedValue(new Response(jpeg, { headers: { 'content-type': 'image/jpeg' } }));
    vi.stubGlobal('fetch', fetcher);
    const key = await photoKey('https://broker.com/yacht/123');
    const initial = await archivePhoto(newBucket(), key, 'https://cdn.broker.com/original.jpg', 'https://broker.com/yacht/123');
    fetcher.mockRejectedValue(new Error('expired upstream'));
    expect(await archivePhoto(newBucket(), key, 'https://cdn.broker.com/changed.jpg', 'https://broker.com/yacht/123')).toBe(initial);
    expect(await (await newBucket().get(key))!.arrayBuffer()).toEqual(jpeg);
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
  it('reads same-site listing photos through the asset binding', async () => {
    const assets = vi.fn().mockResolvedValue(new Response(jpeg));
    vi.mocked(getCloudflareContext).mockResolvedValue({ env: { ASSETS: { fetch: assets } } } as never);
    const network = vi.fn().mockRejectedValue(new Error('Worker cannot re-enter same-zone route'));
    vi.stubGlobal('fetch', network);
    const photo = await fetchPhoto('https://grayyachts.com/listings/poulsbo/hero.jpg', 'https://grayyachts.com/fleet/poulsbo');
    expect(photo.bytes).toEqual(jpeg);
    expect(assets).toHaveBeenCalledTimes(1);
    expect(network).not.toHaveBeenCalled();
  });
  it('rejects screenshots and HTML disguised as images', async () => {
    const bucket = { get: async () => null, put: vi.fn() };
    await expect(archivePhoto(bucket, 'key', 'https://firecrawl.com/screenshot.png', 'https://broker.com')).rejects.toThrow('Not a listing photo');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('<html>Denied</html>', { headers: { 'content-type': 'image/png' } })));
    await expect(fetchPhoto('https://cdn.broker.com/photo.jpg', 'https://broker.com')).rejects.toThrow('not a supported photo');
    expect(bucket.put).not.toHaveBeenCalled();
  });
  it('rejects redirects to private hosts', async () => {
    const fetcher = vi.fn().mockResolvedValue(new Response(null, { status: 302, headers: { location: 'http://169.254.169.254/latest/meta-data' } }));
    vi.stubGlobal('fetch', fetcher);
    await expect(fetchPhoto('https://cdn.broker.com/photo.jpg', 'https://broker.com')).rejects.toThrow();
    expect(fetcher).toHaveBeenCalledTimes(1);
  });
});

describe('listing photo discovery', () => {
  it('rejects challenge pages and logos', () => {
    expect(heroFromHtml('<title>Access denied</title><meta property="og:image" content="https://site.com/error.png">', 'https://site.com')).toBeNull();
    expect(heroFromHtml('<meta property="og:image" content="https://site.com/logo.jpg">', 'https://site.com')).toBeNull();
    expect(heroFromHtml('<script type="application/ld+json">{"url":"https://site.com/listing","image":"https://cdn.com/yacht.jpg"}</script>', 'https://site.com')).toBe('https://cdn.com/yacht.jpg');
  });
  it('never uses a Firecrawl screenshot when listing photos are unavailable', async () => {
    vi.stubEnv('FIRECRAWL_API_KEY', 'test-key');
    vi.stubGlobal('fetch', vi.fn(async (url: string) => url.includes('firecrawl')
      ? Response.json({ success: true, data: { screenshot: 'https://cdn.com/error-screen.png', metadata: {} } })
      : new Response('unavailable', { status: 503 })));
    expect(await heroImageFor('https://broker.com/yacht')).toBeNull();
  });
});

describe('catalog migration', () => {
  function storage(values: Record<string, string>) {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', { ...values, getItem: (key: string) => values[key] ?? null });
  }
  it('preserves empty catalogs instead of resurrecting demos', () => {
    storage({ [STORAGE_KEY]: '[]' });
    expect(loadCatalog()).toEqual([]);
  });
  it('preserves imported photos while removing untouched demo entries', () => {
    const imported = { ...SEED_YACHTS[0], id: 'imported', imageUrl: '/api/yacht-image?id=original' };
    storage({ [STORAGE_KEY]: JSON.stringify([...SEED_YACHTS, imported]) });
    expect(loadCatalog()).toEqual([imported]);
  });
  it('recovers older catalogs without deleting them', () => {
    const imported = { ...SEED_YACHTS[0], id: 'user-yacht', imageUrl: 'https://cdn.com/original.jpg' };
    storage({ 'gy-compare-catalog-v5': JSON.stringify([imported]) });
    expect(loadCatalog()).toEqual([imported]);
    expect(localStorage.getItem('gy-compare-catalog-v5')).toContain('original.jpg');
  });
});
