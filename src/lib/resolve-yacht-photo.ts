import { archivePhoto, photoKey, savedPhotoUrl, type PhotoBucket } from './yacht-photo-store';
import { canonicalListingUrl, normalizePhotoUrl } from './yacht-photo-candidates';
import { heroImageFor } from './scrape-providers';

/** One identity for imports, legacy cards and repairs. Old object IDs remain readable. */
export async function resolveYachtPhoto(bucket: PhotoBucket, listing: string, sources: (string | null | undefined)[] = [], discover = true): Promise<string | null> {
  const key = await photoKey(canonicalListingUrl(listing));
  if (await bucket.get(key)) return savedPhotoUrl(key);
  const candidates = [...new Set(sources.map(s => normalizePhotoUrl(s, listing)).filter((s): s is string => !!s))];
  const legacyKeys = [await photoKey(listing)];
  for (const source of [...sources, ...candidates]) {
    if (source) legacyKeys.push(await photoKey(listing + '\n' + source));
  }
  for (const legacyKey of new Set(legacyKeys)) {
    if (legacyKey === key) continue;
    const saved = await bucket.get(legacyKey);
    if (saved) {
      await bucket.put(key, await saved.arrayBuffer(), { httpMetadata: { contentType: saved.httpMetadata?.contentType ?? 'image/jpeg' } });
      return savedPhotoUrl(key);
    }
  }
  const tried = new Set<string>();
  const accept = async (raw: string) => {
    const candidate = normalizePhotoUrl(raw, listing);
    if (!candidate || tried.has(candidate) || tried.size >= 12) return false;
    tried.add(candidate);
    const legacy = await bucket.get(await photoKey(listing + '\n' + candidate));
    if (legacy) {
      await bucket.put(key, await legacy.arrayBuffer(), { httpMetadata: { contentType: legacy.httpMetadata?.contentType ?? 'image/jpeg' } });
      return true;
    }
    try { await archivePhoto(bucket, key, candidate, listing); return true; }
    catch { return false; }
  };
  for (const candidate of candidates) if (await accept(candidate)) return savedPhotoUrl(key);
  if (discover && await heroImageFor(listing, { accept })) return savedPhotoUrl(key);
  return null;
}
