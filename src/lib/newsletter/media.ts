// Per-edition newsletter media: freely licensed photos imported from approved libraries, and
// AI-generated illustrations. Added 2026-10-18 after Connor rejected an edition about the
// Barcelona boat show illustrated only with unrelated brokerage listing photos: the fixed
// catalog could not supply images of the actual subject.
//
// Every imported or generated image is stored in R2, keyed by the SHA-256 of its bytes, so the
// existing reuse ledger (newsletter_image_uses) still blocks repeats across editions.
import type { NewsletterEnv } from './core';

export type Media = {
  id: string; url: string; kind: 'licensed' | 'generated'; source: string; credit: string;
  license: string; license_url: string | null; title: string | null; prompt: string | null;
};
export type MediaBucket = {
  get(key: string): Promise<{ arrayBuffer(): Promise<ArrayBuffer>; httpMetadata?: { contentType?: string } } | null>;
  put(key: string, value: ArrayBuffer, options: { httpMetadata: { contentType: string } }): Promise<unknown>;
};
export type MediaEnv = NewsletterEnv & { YACHT_PHOTOS?: MediaBucket };

// Libraries whose licenses allow commercial reuse. The image bytes must come from the library's
// own file host, and the page that states the license must be on the library itself.
const LIBRARIES = [
  { name: 'Wikimedia Commons', page: /^https:\/\/commons\.wikimedia\.org\//, file: /^https:\/\/upload\.wikimedia\.org\// },
  { name: 'Pexels', page: /^https:\/\/www\.pexels\.com\//, file: /^https:\/\/images\.pexels\.com\// },
  { name: 'Unsplash', page: /^https:\/\/unsplash\.com\//, file: /^https:\/\/images\.unsplash\.com\// },
];
// Accepted licenses. Attribution licenses require a named author in the credit.
const LICENSES: { match: RegExp; url: RegExp; attribution: boolean }[] = [
  { match: /^Pexels License$/, url: /^https:\/\/www\.pexels\.com\/license\/?$/, attribution: false },
  { match: /^Unsplash License$/, url: /^https:\/\/unsplash\.com\/license\/?$/, attribution: false },
  { match: /^(CC0 1\.0|Public domain)$/, url: /^https:\/\/creativecommons\.org\/(publicdomain\/zero\/1\.0|publicdomain\/mark\/1\.0)\/?/, attribution: false },
  { match: /^CC BY(-SA)? (2\.0|2\.5|3\.0|4\.0)$/, url: /^https:\/\/creativecommons\.org\/licenses\/by(-sa)?\/(2\.0|2\.5|3\.0|4\.0)\/?/, attribution: true },
];
const TYPES: Record<string, string> = { 'image/jpeg': 'image/jpeg', 'image/png': 'image/png', 'image/webp': 'image/webp' };
const MAX_BYTES = 15 * 1024 * 1024;

export const mediaUrl = (id: string) => `/newsletter-media/${id}`;
const text = (v: unknown, min: number, max: number) => typeof v === 'string' && v.trim().length >= min && v.length <= max && !/[<>]/.test(v);

async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
function bucket(env: MediaEnv) {
  if (!env.YACHT_PHOTOS) throw new Error('Newsletter media storage is not configured');
  return env.YACHT_PHOTOS;
}
async function store(env: MediaEnv, bytes: ArrayBuffer, contentType: string, row: Omit<Media, 'id' | 'url'>) {
  const id = await sha256(bytes);
  await bucket(env).put(`newsletter-media/${id}`, bytes, { httpMetadata: { contentType } });
  await env.NEWSLETTER_DB.prepare('INSERT OR IGNORE INTO newsletter_media(id,url,kind,source,credit,license,license_url,title,prompt,created_at) VALUES(?,?,?,?,?,?,?,?,?,?)')
    .bind(id, mediaUrl(id), row.kind, row.source, row.credit, row.license, row.license_url, row.title, row.prompt, new Date().toISOString()).run();
  const used = await env.NEWSLETTER_DB.prepare('SELECT issue_id FROM newsletter_image_uses WHERE image_id=?').bind(id).first<{ issue_id: string }>();
  return { id, url: mediaUrl(id), alreadyUsed: Boolean(used) };
}

export async function importMedia(env: MediaEnv, input: Record<string, unknown>, fetcher: typeof fetch = fetch) {
  const { downloadUrl, sourceUrl, license, licenseUrl, credit, title } = input;
  if (typeof downloadUrl !== 'string' || typeof sourceUrl !== 'string') throw new Error('downloadUrl and sourceUrl are required');
  const library = LIBRARIES.find(l => l.page.test(sourceUrl) && l.file.test(downloadUrl));
  if (!library) throw new Error('Images must come from Wikimedia Commons, Pexels or Unsplash, with the library page as sourceUrl');
  const rule = LICENSES.find(l => typeof license === 'string' && l.match.test(license) && typeof licenseUrl === 'string' && l.url.test(licenseUrl));
  if (!rule) throw new Error('License must be Pexels, Unsplash, CC0, public domain, CC BY or CC BY-SA, with its official license URL');
  if (!text(credit, 3, 200) || (rule.attribution && !/[A-Za-z]{2,}/.test(String(credit).replace(/wikimedia|commons|pexels|unsplash|photo|by/gi, '')))) throw new Error('A credit naming the author is required');
  if (title !== undefined && !text(title, 3, 300)) throw new Error('Invalid title');
  const response = await fetcher(downloadUrl, { redirect: 'follow', headers: { 'User-Agent': 'GrayYachtsNewsletter/1.0 (https://grayyachts.com; connor@grayyachts.com)' } });
  if (!response.ok) throw new Error(`Download failed (${response.status})`);
  if (response.url && !library.file.test(response.url)) throw new Error('Download redirected away from the image library');
  const contentType = TYPES[(response.headers.get('content-type') || '').split(';')[0].trim()];
  if (!contentType) throw new Error('Only JPEG, PNG or WebP images are accepted');
  const bytes = await response.arrayBuffer();
  if (bytes.byteLength < 20_000 || bytes.byteLength > MAX_BYTES) throw new Error('Image must be between 20 KB and 15 MB');
  return store(env, bytes, contentType, { kind: 'licensed', source: sourceUrl, credit: `${String(credit).trim()} / ${library.name}`, license: String(license), license_url: String(licenseUrl), title: title ? String(title).trim() : null, prompt: null });
}

// Workers AI text-to-image. The guard keeps output illustrative: no text, logos or real people.
export const GENERATED_CREDIT = 'AI-generated illustration';
export async function generateMedia(env: MediaEnv, input: Record<string, unknown>) {
  const { prompt } = input;
  if (!text(prompt, 20, 1200)) throw new Error('Describe the illustration in 20 to 1200 characters');
  if (!env.AI) throw new Error('Image generation is not configured');
  const guarded = `${String(prompt).trim()} Editorial illustration for a yacht brokerage newsletter. No text, no lettering, no logos, no brand names, no identifiable people.`;
  const result = await env.AI.run('@cf/black-forest-labs/flux-1-schnell', { prompt: guarded, steps: 8 }) as unknown as { image?: string };
  if (!result?.image) throw new Error('Image generation returned no image');
  const bin = atob(result.image); const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return store(env, bytes.buffer, 'image/jpeg', { kind: 'generated', source: 'https://developers.cloudflare.com/workers-ai/models/flux-1-schnell/', credit: GENERATED_CREDIT, license: 'AI-generated (Cloudflare Workers AI, FLUX.1 [schnell])', license_url: null, title: null, prompt: String(prompt).trim() });
}

export async function mediaById(env: NewsletterEnv, ids: string[]): Promise<Map<string, Media>> {
  const out = new Map<string, Media>();
  for (const id of ids) {
    if (!/^[a-f0-9]{64}$/.test(id)) continue;
    const row = await env.NEWSLETTER_DB.prepare('SELECT * FROM newsletter_media WHERE id=?').bind(id).first<Media>();
    if (row) out.set(id, row);
  }
  return out;
}
