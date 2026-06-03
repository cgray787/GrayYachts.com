// Enforces the hard rule: every vessel linked to a /listings/<slug>.pdf brochure
// must have (a) brochure content, (b) a slug, (c) a hero image on disk, and the
// generated PDF (once produced). Run: npm run check:brochures
import { existsSync } from "node:fs";
import { join } from "node:path";
import { vessels } from "../src/lib/fleet.ts";
import { brochures } from "../src/lib/brochures.ts";

const root = process.cwd();
const errors: string[] = [];

for (const v of vessels) {
  const linksPdf = v.href?.endsWith(".pdf");
  if (!linksPdf) continue;

  const slug = v.slug;
  if (!slug) {
    errors.push(`${v.name}: href is a PDF but vessel has no slug`);
    continue;
  }
  if (v.href !== `/listings/${slug}.pdf`) {
    errors.push(`${v.name}: href "${v.href}" does not match /listings/${slug}.pdf`);
  }
  if (!brochures[slug]) {
    errors.push(`${v.name}: no brochure content for slug "${slug}" in brochures.ts`);
  }
  if (!existsSync(join(root, "public", "listings", slug, "hero.jpg"))) {
    errors.push(`${v.name}: missing hero at public/listings/${slug}/hero.jpg`);
  }
}

// Reverse: every brochure entry must map to a vessel
for (const slug of Object.keys(brochures)) {
  if (!vessels.some((v) => v.slug === slug)) {
    errors.push(`brochures.ts has "${slug}" with no matching vessel in fleet.ts`);
  }
}

if (errors.length) {
  console.error("✗ Brochure check failed:\n" + errors.map((e) => "  - " + e).join("\n"));
  process.exit(1);
}
console.log(`✓ Brochure check passed (${Object.keys(brochures).length} brochure(s)).`);
