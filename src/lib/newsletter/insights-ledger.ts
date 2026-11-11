// The insights side of the never-reuse ledger (fresh-photo-mix hard rule, 2026-11-11).
// newsletter_image_uses (migration 0006) blocks a newsletter edition from reusing a photo; this
// blocks an insights article from reusing a photo any newsletter edition, or another insights
// article, already holds. src/lib/newsletter/images.ts's INSIGHTS set and the
// newsletter_reserve_images trigger (migration 0007) are the other halves of this rule.
import type { NewsletterEnv } from './core';

export class ConflictError extends Error { status = 409; }

export async function reserveInsightsImages(env: NewsletterEnv, slug: unknown, imageIds: unknown) {
  if (typeof slug !== 'string' || !slug.trim()) throw new Error('slug is required');
  if (!Array.isArray(imageIds) || imageIds.length < 1 || imageIds.length > 9 || imageIds.some(id => typeof id !== 'string' || !id))
    throw new Error('imageIds must be a non-empty list of id strings');
  const ids = imageIds as string[];
  if (new Set(ids).size !== ids.length) throw new Error('imageIds must not repeat within one request');
  const placeholders = ids.map(() => '?').join(',');
  const newsletterUsed = (await env.NEWSLETTER_DB.prepare(`SELECT image_id FROM newsletter_image_uses WHERE image_id IN (${placeholders})`).bind(...ids).all<{ image_id: string }>()).results;
  if (newsletterUsed.length) throw new ConflictError(`Already used in a newsletter edition: ${newsletterUsed.map(r => r.image_id).join(', ')}`);
  const existing = (await env.NEWSLETTER_DB.prepare(`SELECT image_id,article_slug FROM insights_image_uses WHERE image_id IN (${placeholders})`).bind(...ids).all<{ image_id: string; article_slug: string }>()).results;
  const conflicting = existing.filter(r => r.article_slug !== slug);
  if (conflicting.length) throw new ConflictError(`Already used on another insights article: ${conflicting.map(r => `${r.image_id} (${r.article_slug})`).join(', ')}`);
  const already = new Set(existing.map(r => r.image_id));
  const now = new Date().toISOString();
  for (const id of ids) {
    if (already.has(id)) continue; // Re-reserving for the same slug is idempotent.
    await env.NEWSLETTER_DB.prepare('INSERT INTO insights_image_uses(image_id,article_slug,used_at) VALUES(?,?,?)').bind(id, slug, now).run();
  }
  return { slug, reserved: ids };
}
