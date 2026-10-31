// Enforces the hard rule (Connor, 2026-10-30): never use the same picture twice. Every insights
// article must have its own photo in content/seo/article-images.json, on disk, used by no other
// article and showing a boat no other article shows. Without an entry, articlePhoto() falls back
// to /sell/img/hero.jpg, which sell-my-boat-seattle already uses. Newsletter editions are kept off
// these photos by src/lib/newsletter/images.ts. Run: npm run check:article-images
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { boatOf } from "../src/lib/newsletter/images.ts";

const root = process.cwd();
const read = (p: string) => JSON.parse(readFileSync(join(root, p), "utf8"));
const articles: { slug: string }[] = read("content/seo/articles.json");
const images: Record<string, { url: string }> = read("content/seo/article-images.json");
const errors: string[] = [];
const byUrl = new Map<string, string>();
const byBoat = new Map<string, string>();

for (const { slug } of articles) {
  if (!images[slug]) errors.push(`${slug}: no photo in content/seo/article-images.json (it would fall back to a shared photo)`);
}
for (const [slug, { url }] of Object.entries(images)) {
  if (!existsSync(join(root, "public", url))) errors.push(`${slug}: missing file public${url}`);
  if (byUrl.has(url)) errors.push(`${slug}: same photo as ${byUrl.get(url)} (${url})`);
  byUrl.set(url, slug);
  const boat = boatOf(url);
  if (boat && byBoat.has(boat)) errors.push(`${slug}: shows ${boat}, already shown by ${byBoat.get(boat)}`);
  if (boat) byBoat.set(boat, slug);
}

if (errors.length) {
  console.error(`Article photo check failed:\n  ${errors.join("\n  ")}`);
  process.exit(1);
}
console.log(`Article photos OK: ${articles.length} articles, ${byUrl.size} distinct photos.`);
