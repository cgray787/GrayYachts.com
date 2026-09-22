import { getCloudflareContext } from '@opennextjs/cloudflare';
import { assertPublicHttpUrl } from './scrape-shared';

export interface PhotoBucket {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
}
export async function photoBucket(): Promise<PhotoBucket> {
  const { env } = await getCloudflareContext({ async: true });
  const bucket = (env as unknown as { YACHT_PHOTOS?: PhotoBucket }).YACHT_PHOTOS;
  if (!bucket) throw new Error('Yacht photo storage is not configured');
  return bucket;
}
export async function photoKey(identity: string): Promise<string> {
  const bytes = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(identity));
  return Array.from(new Uint8Array(bytes), b => b.toString(16).padStart(2, '0')).join('');
}
export function savedPhotoUrl(key: string) { return `/api/yacht-image?id=${key}`; }
export function isListingPhoto(url: string): boolean {
  return /^https?:\/\//i.test(url) && !/screenshot|firecrawl|unsplash|logo|favicon|placeholder|sprite|\/icon[/.]/i.test(url);
}
const LIMIT = 12 * 1024 * 1024;
export async function fetchPhoto(url: string, listing: string): Promise<{ bytes: ArrayBuffer; contentType: string }> {
  let current = url;
  for (let hop = 0; hop <= 4; hop++) {
    assertPublicHttpUrl(current);
    const parsed = new URL(current);
    const localAsset = ['grayyachts.com', 'www.grayyachts.com'].includes(parsed.hostname)
      && parsed.pathname.startsWith('/listings/');
    // Same-zone Worker fetches cannot reliably re-enter our asset route.
    const response = localAsset
      ? await (await getCloudflareContext({ async: true })).env.ASSETS.fetch(new Request(current))
      : await fetch(current, {
          redirect: 'manual', signal: AbortSignal.timeout(15_000),
          headers: { Referer: listing, 'User-Agent': 'Mozilla/5.0' },
        });
    if (response.status >= 300 && response.status < 400) {
      const location = response.headers.get('location');
      if (!location) throw new Error('Invalid photo redirect');
      current = new URL(location, current).href;
      continue;
    }
    if (!response.ok || !response.body) throw new Error(`Photo HTTP ${response.status}`);
    if (Number(response.headers.get('content-length')) > LIMIT) throw new Error('Photo too large');
    const reader = response.body.getReader();
    const chunks: Uint8Array[] = [];
    let total = 0;
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.length;
      if (total > LIMIT) { await reader.cancel(); throw new Error('Photo too large'); }
      chunks.push(value);
    }
    const data = new Uint8Array(total);
    let offset = 0;
    for (const chunk of chunks) { data.set(chunk, offset); offset += chunk.length; }
    const contentType = photoContentType(data);
    if (!contentType) throw new Error('Response is not a supported photo');
    return { bytes: data.buffer, contentType };
  }
  throw new Error('Too many photo redirects');
}
/** Store once; later reads do not depend on the listing or its expiring CDN URL. */
export async function archivePhoto(bucket: PhotoBucket, key: string, source: string, listing: string) {
  if (await bucket.get(key)) return savedPhotoUrl(key);
  if (!isListingPhoto(source)) throw new Error('Not a listing photo');
  const { bytes, contentType } = await fetchPhoto(source, listing);
  await bucket.put(key, bytes, { httpMetadata: { contentType } });
  return savedPhotoUrl(key);
}

export function photoContentType(data: Uint8Array): string | null {
  const prefix = new TextDecoder().decode(data.slice(0, 12));
  return data[0] === 0xff && data[1] === 0xd8 && data[2] === 0xff ? 'image/jpeg'
      : data[0] === 137 && prefix.slice(1, 4) === 'PNG' ? 'image/png'
      : prefix.startsWith('RIFF') && prefix.slice(8) === 'WEBP' ? 'image/webp'
      : prefix.startsWith('GIF8') ? 'image/gif' : prefix.slice(4, 8) === 'ftyp' && /avif|avis/.test(new TextDecoder().decode(data.slice(8, 32))) ? 'image/avif' : null;

}
