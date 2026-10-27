// One-off: write a Craigslist ad draft per listing from fleet.ts + brochures.ts.
// Usage: npx tsx scripts/craigslist-drafts.ts
import { writeFileSync } from "node:fs";
import { vessels } from "../src/lib/fleet";
import { getBrochure } from "../src/lib/brochures";

// Connor's live YachtWorld listings (2026-10-27) → fleet slug, YachtWorld price.
const yw: Record<string, { id: string; price: string }> = {
  "miss-maggie-ii": { id: "10282368", price: "$299,000" },
  poulsbo: { id: "10296777", price: "$249,000" },
  journey: { id: "10364502", price: "$299,999" },
  "ocean-alexander-548": { id: "10270830", price: "$500,000" },
  kudu: { id: "10374232", price: "$550,000" },
  "blue-pearl": { id: "10317092", price: "$139,999" },
  "playa-linda": { id: "10202717", price: "$95,000" },
  "yamaha-252se": { id: "10242450", price: "$79,999" },
  "cobalt-343": { id: "10246059", price: "$85,000" },
  "sau-ping": { id: "10246337", price: "$379,999" },
  jimmie: { id: "10265476", price: "$900,000" },
};

for (const v of vessels) {
  if (!v.slug || !yw[v.slug]) continue;
  const b = getBrochure(v.slug);
  const y = yw[v.slug];
  const title = `${v.year} ${v.make} ${v.length} — ${v.location}`.slice(0, 70);
  const body = [
    `${v.year} ${v.make.toUpperCase()} — "${v.name.replace(/^[A-Z/]+ /, "")}"`,
    "",
    ...(b ? b.narrative : []),
    "",
    ...(b ? b.highlights.map((h) => `• ${h}`) : []),
    "",
    `Full photo gallery and brochure: https://grayyachts.com/fleet/${v.slug}`,
    "",
    "Connor Gray · Jeff Brown Yachts · Seattle",
    "Reply through Craigslist to arrange a showing.",
  ].join("\n");
  const photos = v.gallery.map((p) => `public${p.src}`).join("\n");
  const flag = v.price === y.price ? "" : `\n!! PRICE MISMATCH: website ${v.price} vs YachtWorld ${y.price} — confirm before posting\n`;
  writeFileSync(
    `docs/marketplace/craigslist/${v.slug}.txt`,
    `CRAIGSLIST — boats by dealer\n${flag}\nTITLE: ${title}\nPRICE: ${v.price}\nCITY/AREA: ${v.location}\nYACHTWORLD: https://www.yachtworld.com/yacht/${y.id}/\n\n--- BODY ---\n${body}\n\n--- PHOTOS (upload in order, max 24) ---\n${photos}\n`,
  );
  console.log(v.slug, v.price, y.price, v.gallery.length, "photos", b ? "" : "NO BROCHURE COPY");
}
