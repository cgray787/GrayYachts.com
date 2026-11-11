// Enforces the hard rule (Connor, 2026-10-30): never use the same picture twice. Every insights
// article must have its own photo in content/seo/article-images.json, on disk, used by no other
// article and showing a boat no other article shows. Without an entry, articlePhoto() falls back
// to /sell/img/hero.jpg, which sell-my-boat-seattle already uses. Newsletter editions are kept off
// these photos by src/lib/newsletter/images.ts. Run: npm run check:article-images
//
// Fresh-photo-mix hard rule (Connor, 2026-11-11): an entry may also be {images:[...]} with a lead
// photo and supporting images carrying `kind`/`id`. Articles published on or after
// FRESH_RULE_EFFECTIVE must satisfy checkFreshMix: at least one owner photo, at least one new
// (licensed or generated) picture, and a lead that is never AI-generated. Articles published
// before that date are grandfathered on the single-photo shape.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { boatOf, checkFreshMix } from "../src/lib/newsletter/images.ts";

const root = process.cwd();
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const articles: { slug: string; publishedAt?: string | null }[] = read("content/seo/articles.json");
const images: Record<string, unknown> = read("content/seo/article-images.json");
const errors: string[] = [];
const byUrl = new Map<string, string>();
const byBoat = new Map<string, string>();
const FRESH_RULE_EFFECTIVE = "2026-11-12";
const publishedAt = new Map(articles.map(a => [a.slug, a.publishedAt ?? null]));

type Photo = { url: string; kind?: string; id?: string };
const photosOf = (entry: unknown): Photo[] =>
  entry && typeof entry === "object" && Array.isArray((entry as { images?: unknown }).images)
    ? (entry as { images: Photo[] }).images
    : entry ? [entry as Photo] : [];

for (const { slug } of articles) {
  if (!images[slug]) errors.push(`${slug}: no photo in content/seo/article-images.json (it would fall back to a shared photo)`);
}
for (const [slug, entry] of Object.entries(images)) {
  const photos = photosOf(entry);
  for (const { url } of photos) {
    if (!existsSync(join(root, "public", url))) errors.push(`${slug}: missing file public${url}`);
    if (byUrl.has(url)) errors.push(`${slug}: same photo as ${byUrl.get(url)} (${url})`);
    byUrl.set(url, slug);
    const boat = boatOf(url);
    if (boat && byBoat.has(boat)) errors.push(`${slug}: shows ${boat}, already shown by ${byBoat.get(boat)}`);
    if (boat) byBoat.set(boat, slug);
  }
  const date = publishedAt.get(slug);
  if (date && date >= FRESH_RULE_EFFECTIVE) {
    try { checkFreshMix(photos, { ownerLibraryEmpty: false }); }
    catch (error) { errors.push(`${slug}: ${error instanceof Error ? error.message : "fails the fresh photo mix rule"}`); }
  }
}

if (errors.length) {
  console.error(`Article photo check failed:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`Article photos OK: ${articles.length} articles, ${byUrl.size} distinct photos.`);
