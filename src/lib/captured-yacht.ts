import { canonicalListingUrl } from './yacht-photo-candidates';
import { photoKey, type PhotoBucket } from './yacht-photo-store';
import type { ScrapeResult } from './yacht-catalog';

/** Only operator-reviewed captures are published here, never public uploads. */
export async function capturedYacht(bucket: PhotoBucket, url: string): Promise<ScrapeResult | null> {
  const key = `captured-listings/${await photoKey(canonicalListingUrl(url))}.json`;
  const object = await bucket.get(key);
  if (!object) return null;
  const data = JSON.parse(new TextDecoder().decode(await object.arrayBuffer()));
  if (canonicalListingUrl(data.url) !== canonicalListingUrl(url)
    || !data.name || !data.builder || !data.capturedAt || !Number.isFinite(Date.parse(data.capturedAt))) return null;
  const imageId = /^\/api\/yacht-image\?id=([a-f0-9]{64})$/.exec(data.imageUrl ?? '')?.[1];
  if (!imageId || !await bucket.get(imageId)) return null;
  return { ...data, source: 'Saved capture', confidence: 'low', flags: [
    `Live listing unavailable. Showing a saved capture from ${new Date(data.capturedAt).toISOString().slice(0, 10)}; price and availability may have changed.`,
    ...(data.flags ?? []),
  ] };
}
