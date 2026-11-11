// Connor's own photo library (fresh-photo-mix hard rule, 2026-11-11): private originals, stripped
// of EXIF/GPS by the ingest script before they ever leave the VPS (scripts/owner-photos/ingest.mjs),
// stored in the existing YACHT_PHOTOS bucket under owner-photos/<sha256>.jpg. A photo stays private
// until it is reserved by an edition or an insights article (see src/app/newsletter-media/[id]/route.ts).
import type { NewsletterEnv } from './core';
import type { MediaEnv } from './media';
import { mediaUrl } from './media';
import { RELEVANCE_MODEL } from './relevance';

export type OwnerPhoto = {
  id: string; r2_key: string; phash: string; width: number | null; height: number | null;
  taken_on: string | null; description: string | null; tags: string; approved: number; created_at: string;
};
export const OWNER_CREDIT = 'Photo: Connor Gray';
export const OWNER_LOW_WATER = 10;
export const NEAR_DUP_DISTANCE = 6;
const MAX_BYTES = 15 * 1024 * 1024;
const MIN_BYTES = 20 * 1024;

// Migration 0007 (newsletter_owner_photos, insights_image_uses) may not be applied yet when a
// Worker build that references it ships, so every owner-photo query must survive a deploy that
// runs ahead of its migration (see docs/owner-photos.md). Other errors still propagate.
export function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && /no such table/i.test(error.message);
}

function bucket(env: MediaEnv) {
  if (!env.YACHT_PHOTOS) throw new Error('Newsletter media storage is not configured');
  return env.YACHT_PHOTOS;
}
async function sha256(bytes: ArrayBuffer) {
  return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)), b => b.toString(16).padStart(2, '0')).join('');
}
function isJpeg(bytes: ArrayBuffer) {
  const b = new Uint8Array(bytes);
  return b.length > 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff;
}
function base64(bytes: ArrayBuffer) {
  const b = new Uint8Array(bytes); let s = '';
  for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000));
  return btoa(s);
}

// Hamming distance between two 16-hex-character (64-bit) dHash strings.
export function hamming(a: string, b: string): number {
  if (!/^[0-9a-f]{16}$/.test(a) || !/^[0-9a-f]{16}$/.test(b)) throw new Error('phash must be a 16-character hex string');
  let distance = 0;
  for (let i = 0; i < 16; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) { distance += x & 1; x >>= 1; }
  }
  return distance;
}

async function usedOwnerIds(env: NewsletterEnv): Promise<Set<string>> {
  try {
    const newsletter = (await env.NEWSLETTER_DB.prepare('SELECT image_id FROM newsletter_image_uses').all<{ image_id: string }>()).results;
    const insights = (await env.NEWSLETTER_DB.prepare('SELECT image_id FROM insights_image_uses').all<{ image_id: string }>()).results;
    return new Set([...newsletter.map(r => r.image_id), ...insights.map(r => r.image_id)]);
  } catch (error) {
    if (isMissingTableError(error)) return new Set();
    throw error;
  }
}

export async function ownerLibraryEmpty(env: NewsletterEnv): Promise<boolean> {
  try {
    return !(await env.NEWSLETTER_DB.prepare('SELECT 1 FROM newsletter_owner_photos WHERE approved=1 LIMIT 1').first());
  } catch (error) {
    if (isMissingTableError(error)) return true;
    throw error;
  }
}
export async function ownerPhotosUnusedCount(env: NewsletterEnv): Promise<number> {
  try {
    const all = (await env.NEWSLETTER_DB.prepare('SELECT id FROM newsletter_owner_photos WHERE approved=1').all<{ id: string }>()).results;
    const used = await usedOwnerIds(env);
    return all.filter(o => !used.has(o.id)).length;
  } catch (error) {
    if (isMissingTableError(error)) return 0;
    throw error;
  }
}
export async function ownerPhotosById(env: NewsletterEnv, ids: string[]): Promise<Map<string, OwnerPhoto>> {
  const out = new Map<string, OwnerPhoto>();
  for (const id of ids) {
    if (!/^[a-f0-9]{64}$/.test(id)) continue;
    try {
      const row = await env.NEWSLETTER_DB.prepare('SELECT * FROM newsletter_owner_photos WHERE id=? AND approved=1').bind(id).first<OwnerPhoto>();
      if (row) out.set(id, row);
    } catch (error) {
      if (isMissingTableError(error)) return out;
      throw error;
    }
  }
  return out;
}
// Unused, approved, and not a near-duplicate of a photo already reserved elsewhere: what Hermes
// or an insights author may actually pick next.
export async function availableOwnerPhotos(env: NewsletterEnv): Promise<OwnerPhoto[]> {
  try {
    const all = (await env.NEWSLETTER_DB.prepare('SELECT * FROM newsletter_owner_photos WHERE approved=1').all<OwnerPhoto>()).results;
    const used = await usedOwnerIds(env);
    const usedPhashes = all.filter(o => used.has(o.id)).map(o => o.phash);
    return all.filter(o => !used.has(o.id) && !usedPhashes.some(h => hamming(h, o.phash) <= NEAR_DUP_DISTANCE));
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}
// Phashes of owner photos already reserved by another edition (newsletter_image_uses, excluding
// `excludeIssueId`) or by an insights article (insights_image_uses): what resolveImages checks a
// freshly submitted owner photo against so a near-duplicate of one already spent cannot slip in
// under a new sha256 id.
export async function reservedOwnerPhashes(env: NewsletterEnv, excludeIssueId?: string): Promise<string[]> {
  try {
    const newsletter = (await env.NEWSLETTER_DB.prepare(
      `SELECT p.phash phash FROM newsletter_image_uses u JOIN newsletter_owner_photos p ON p.id=u.image_id${excludeIssueId ? ' WHERE u.issue_id<>?' : ''}`
    ).bind(...(excludeIssueId ? [excludeIssueId] : [])).all<{ phash: string }>()).results;
    const insights = (await env.NEWSLETTER_DB.prepare(
      'SELECT p.phash phash FROM insights_image_uses u JOIN newsletter_owner_photos p ON p.id=u.image_id'
    ).all<{ phash: string }>()).results;
    return [...newsletter.map(r => r.phash), ...insights.map(r => r.phash)];
  } catch (error) {
    if (isMissingTableError(error)) return [];
    throw error;
  }
}
export async function ownerHealth(env: NewsletterEnv) {
  const available = await availableOwnerPhotos(env);
  const unused = await ownerPhotosUnusedCount(env);
  return {
    available: available.map(o => ({ id: o.id, url: mediaUrl(o.id), description: o.description, tags: JSON.parse(o.tags || '[]') as string[], takenOn: o.taken_on })),
    unused,
    warning: unused < OWNER_LOW_WATER ? `Only ${unused} unused Connor photo${unused === 1 ? '' : 's'} left (below the ${OWNER_LOW_WATER}-photo low-water mark)` : null,
  };
}
// id+phash of every uploaded photo (used or not, approved or not), for the ingest script's dedupe.
export async function ownerHashes(env: NewsletterEnv): Promise<{ id: string; phash: string }[]> {
  return (await env.NEWSLETTER_DB.prepare('SELECT id,phash FROM newsletter_owner_photos').all<{ id: string; phash: string }>()).results;
}

async function describe(env: MediaEnv, bytes: ArrayBuffer): Promise<string | null> {
  if (!env.AI) return null;
  try {
    const result = await env.AI.run(RELEVANCE_MODEL, {
      messages: [
        { role: 'system', content: 'Describe this yacht brokerage photo in one short plain sentence for an internal photo library caption. Describe only what is visibly shown; do not guess at location, date or names.' },
        { role: 'user', content: [{ type: 'text', text: 'Describe the photo.' }, { type: 'image_url', image_url: { url: `data:image/jpeg;base64,${base64(bytes)}` } }] },
      ],
      max_tokens: 200, temperature: 0,
    }) as unknown as { response?: unknown; choices?: { message?: { content?: unknown } }[] };
    const out = result?.choices?.[0]?.message?.content ?? result?.response;
    const text = typeof out === 'string' ? out.trim() : null;
    return text ? text.replace(/[<>]/g, '').slice(0, 300) : null;
  } catch (error) {
    console.error('owner photo description failed', error instanceof Error ? error.message : error);
    return null;
  }
}
export async function storeOwnerPhoto(env: MediaEnv, bytes: ArrayBuffer, meta: { phash: string; width?: number | null; height?: number | null; takenOn?: string | null }) {
  if (!isJpeg(bytes)) throw new Error('Owner photos must be JPEG');
  if (bytes.byteLength < MIN_BYTES || bytes.byteLength > MAX_BYTES) throw new Error('Owner photo must be between 20 KB and 15 MB');
  if (!/^[0-9a-f]{16}$/.test(meta.phash)) throw new Error('phash must be a 16-character hex string');
  if (meta.takenOn != null && !/^\d{4}-\d{2}-\d{2}$/.test(meta.takenOn)) throw new Error('takenOn must be a YYYY-MM-DD date');
  const id = await sha256(bytes);
  const exact = await env.NEWSLETTER_DB.prepare('SELECT 1 FROM newsletter_owner_photos WHERE id=?').bind(id).first();
  if (exact) throw new Error('This photo has already been uploaded');
  const rows = (await env.NEWSLETTER_DB.prepare('SELECT id,phash FROM newsletter_owner_photos').all<{ id: string; phash: string }>()).results;
  const near = rows.find(r => hamming(r.phash, meta.phash) <= NEAR_DUP_DISTANCE);
  if (near) throw new Error(`Too similar to an already-uploaded photo (${near.id})`);
  const r2Key = `owner-photos/${id}.jpg`;
  await bucket(env).put(r2Key, bytes, { httpMetadata: { contentType: 'image/jpeg' } });
  const description = await describe(env, bytes);
  await env.NEWSLETTER_DB.prepare('INSERT INTO newsletter_owner_photos(id,r2_key,phash,width,height,taken_on,description,tags,approved,created_at) VALUES(?,?,?,?,?,?,?,?,1,?)')
    .bind(id, r2Key, meta.phash, meta.width ?? null, meta.height ?? null, meta.takenOn ?? null, description, '[]', new Date().toISOString()).run();
  return { id, url: mediaUrl(id), description };
}
