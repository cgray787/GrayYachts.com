# Listing Brochures Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give every grayyachts.com boat listing a Gray Yachts–branded 3-page PDF brochure matching the existing `public/listings/seawulff.pdf`, generated from one reusable template, with a one-command skill and a standing rule.

**Architecture:** Brochure copy lives in a slug-keyed `src/lib/brochures.ts`, decoupled from the lean fleet cards. A `noindex` print route `src/app/listings/[slug]/brochure` renders the 3-page layout using the site's real theme (Cormorant Garamond + gold `#C9A96E`). A Node/Playwright script prints that route to `public/listings/<slug>.pdf`. A check script enforces that every PDF-linked vessel has brochure content; a personal skill makes listing a boat one command.

**Tech Stack:** Next.js 16 (App Router, TypeScript), Tailwind v4, `next/font` (Cormorant + Geist already loaded in root layout), `playwright` (chromium, print-to-PDF), `tsx` (run TS scripts). No unit-test runner exists in this repo and we are not adding one; the test gates are a runnable check script plus visual comparison against the existing Seawulff PDF.

**Working branch:** `feat/listing-brochures` (already created).

---

## File structure

- **Create** `src/lib/brochures.ts` — `BrochureContent` type + `brochures` record (Seawulff authored first). One responsibility: brochure copy/data.
- **Modify** `src/lib/fleet.ts` — add `slug` to `Vessel`; set `slug`/`href` on Seawulff (then the other four later). Fleet cards stay otherwise unchanged.
- **Create** `src/app/listings/[slug]/brochure/page.tsx` — the print template (server component). One responsibility: render one brochure.
- **Create** `src/app/listings/[slug]/brochure/brochure.css` — print/layout CSS (Letter pages, page breaks, exact-color printing).
- **Create** `src/app/listings/brochure-manifest/route.ts` — JSON list of brochure slugs (so the generator's `--all` knows what to render without importing TS into Node).
- **Create** `scripts/check-brochures.ts` — invariant/enforcement check (run via `tsx`).
- **Create** `scripts/generate-brochure.ts` — spawns `next dev`, prints each brochure route to PDF via Playwright.
- **Modify** `package.json` — add `playwright` + `tsx` devDeps and `brochure` / `check:brochures` scripts.
- **Create** `~/.claude/skills/gy-listing-brochure/SKILL.md` — the listing skill.
- **Create** memory `feedback_grayyachts_listing_pdf.md` + **modify** `MEMORY.md` and `grayyachts.com/CLAUDE.md` — the hard rule.

---

## Task 1: Brochure content model + Seawulff data

**Files:**
- Create: `src/lib/brochures.ts`
- Modify: `src/lib/fleet.ts` (Vessel type + Seawulff entry)

- [ ] **Step 1: Create the brochure model + Seawulff content**

Create `src/lib/brochures.ts`:

```ts
// Per-listing brochure copy, keyed by vessel slug. Consumed only by the
// print route at /listings/[slug]/brochure. Fleet cards do NOT import this.
// Hero image, name, year, make, length, location, price, badge come from the
// matching Vessel in fleet.ts (linked by slug); this file holds brochure-only copy.

export type SpecCell = { value: string; label: string; sub?: string };

export type BrochureContent = {
  slug: string;
  // Headline: renders as `${lead} <gold-italic>${emphasis}</gold-italic> ${tail}`
  tagline: { lead: string; emphasis: string; tail: string };
  specStrip: SpecCell[];        // up to 5 cells; powerboats may use fewer
  narrative: string[];          // body paragraphs, in order
  highlights: string[];         // 2-column bullet table, in order
  documentation?: { officialNo?: string; callSign?: string; note?: string };
  photoCredit?: string;         // place shown in "Photographed at <x> · Gray Yachts Media"
};

export const brochures: Record<string, BrochureContent> = {
  seawulff: {
    slug: "seawulff",
    tagline: {
      lead: "A",
      emphasis: "classic Pacific Northwest",
      tail: "wooden sail vessel — built to last, documented to prove it.",
    },
    specStrip: [
      { value: "34.5'", label: "Length" },
      { value: "1981", label: "Year Built" },
      { value: "Saab", label: "30hp Diesel" },
      { value: "4–6", label: "Sleeps" },
      { value: "Wood", label: "Construction" },
    ],
    narrative: [
      "Seawulff is a 1981 wood-hulled auxiliary sailboat built in Olympia, Washington and hailing from Port Townsend — one of the most storied wooden boat communities on the West Coast. Yellow Cedar, Port Orford Cedar, and Western Red Cedar planking over steam-bent White Oak frames. Teak-planked cabin tops. Bronze hardware throughout. This is a vessel built the old way, for the long run.",
      "She carries a full Dacron sail inventory — main, staysail, jib, and drifter — along with 1x19 stainless standing rigging and a double forestay. The Saab 2-cylinder diesel starts clean, with injector pump rebuilt and injectors checked. Two trunk cabins, V-berth forward, main salon with U-shaped settee, galley aft to port, and a dedicated aft cabin with counter workspace.",
      "Previously USCG-certified for passenger operation on Puget Sound — a level of inspection most private vessels never see. Clean documentation. Survey history on file. Ready for her next chapter.",
    ],
    highlights: [
      "Cedar & Teak construction throughout",
      "Saab 2-cyl diesel, 30hp — starts clean",
      "Full Dacron sail inventory included",
      "140 gal water capacity — dual S/steel tanks",
      "Dickinson diesel cabin heater",
      "Bronze fastenings & keel bolts w/ backing plates",
      "30A shore power, 4x 12V battery bank",
      "Electro Guard galvanic protection system",
      "VHF, depthfinder, binnacle compass",
      "8-person life raft, full USCG safety kit",
      "Stern arch w/ dedicated hydraulic winch",
      "Plow anchor + 160 ft chain rode",
    ],
    documentation: {
      officialNo: "634426",
      callSign: "WTS4768",
      note: "Certified for Puget Sound, Lakes, Bays & Sounds. Inspected and approved for up to 10 passengers under USCG Sector Puget Sound — a standard of documentation that sets this vessel apart from typical private listings.",
    },
    photoCredit: "Port Townsend, WA",
  },
};

export function getBrochure(slug: string): BrochureContent | undefined {
  return brochures[slug];
}
```

- [ ] **Step 2: Add `slug` to the Vessel type and Seawulff entry**

In `src/lib/fleet.ts`, add `slug` to the `Vessel` type (after `name`):

```ts
export type Vessel = {
  name: string;
  slug?: string;        // links a vessel to its BrochureContent + /listings/<slug>.pdf
  year: number;
  make: string;
  length: string;
  location: string;
  price: string;
  image: string;
  gallery: GalleryPhoto[];
  href?: string;
  badge?: string;
};
```

Set `slug: "seawulff"` on the Seawulff vessel object (it already has `href: "/listings/seawulff.pdf"` and `image: "/listings/seawulff/hero.jpg"`). Add the `slug` line directly under its `name`:

```ts
  {
    name: "S/V Seawulff",
    slug: "seawulff",
    year: 1981,
```

- [ ] **Step 3: Type-check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/lib/brochures.ts src/lib/fleet.ts
git commit -m "feat(brochures): add brochure content model + Seawulff data"
```

---

## Task 2: Enforcement check script (the test gate)

**Files:**
- Create: `scripts/check-brochures.ts`
- Modify: `package.json` (add `tsx` devDep + `check:brochures` script)

- [ ] **Step 1: Add tsx**

Run: `npm install -D tsx`
Expected: `tsx` added to devDependencies.

- [ ] **Step 2: Write the check script**

Create `scripts/check-brochures.ts`:

```ts
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
```

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, add:

```json
"check:brochures": "tsx scripts/check-brochures.ts"
```

- [ ] **Step 4: Run the check — it must pass for Seawulff**

Run: `npm run check:brochures`
Expected: `✓ Brochure check passed (1 brochure(s)).` (Seawulff has slug, content, hero, and matching href. The other four vessels have no `.pdf` href yet, so they are correctly skipped.)

- [ ] **Step 5: Commit**

```bash
git add scripts/check-brochures.ts package.json package-lock.json
git commit -m "feat(brochures): add brochure enforcement check script"
```

---

## Task 3: Brochure print template route

**Files:**
- Create: `src/app/listings/[slug]/brochure/page.tsx`
- Create: `src/app/listings/[slug]/brochure/brochure.css`

- [ ] **Step 1: Write the print CSS**

Create `src/app/listings/[slug]/brochure/brochure.css`:

```css
/* Print brochure — white editorial sheet, gold accent, Cormorant headlines.
   Letter pages with explicit breaks so Playwright prints exactly 3 pages. */
.bx { --gold: #C9A96E; --ink: #1a1a1a; --muted: #8a7f6d; --rule: #d8cfbf;
  background:#fff; color:var(--ink);
  font-family: var(--font-geist-sans), Georgia, serif;
  width: 8.5in; margin: 0 auto; }
.bx * { box-sizing: border-box; }
.bx-page { width: 8.5in; min-height: 11in; padding: 0.7in 0.85in; position: relative; }
.bx-page + .bx-page { break-before: page; }
.bx-serif { font-family: var(--font-cormorant), Georgia, serif; }

.bx-topbar { display:flex; justify-content:space-between; align-items:baseline;
  letter-spacing:.22em; font-size:9px; color:var(--muted); text-transform:uppercase; }
.bx-topbar .badge { color:var(--ink); font-weight:600; }
.bx-hero { width:100%; height:4.4in; object-fit:cover; margin:.35in 0 .3in; }

.bx-specs { display:grid; grid-template-columns:repeat(5,1fr); gap:.1in; text-align:center; margin:.1in 0; }
.bx-spec .v { font-family:var(--font-cormorant); font-size:24px; color:var(--gold); font-weight:600; line-height:1; }
.bx-spec .l { font-size:8px; letter-spacing:.18em; color:var(--muted); text-transform:uppercase; margin-top:6px; }

.bx-pricerow { display:flex; justify-content:space-between; align-items:flex-end; margin-top:.25in; }
.bx-price { font-family:var(--font-cormorant); font-size:46px; font-weight:600; line-height:.9; }
.bx-price .obo { font-size:14px; font-style:italic; color:var(--muted); margin-left:8px; }
.bx-port { text-align:right; font-size:11px; color:var(--muted); line-height:1.5; }
.bx-port .h { letter-spacing:.2em; font-size:9px; text-transform:uppercase; }

.bx-rule { border:0; border-top:1px solid var(--rule); margin:.28in 0; }
.bx-eyebrow { letter-spacing:.24em; font-size:9px; color:var(--gold); text-transform:uppercase; }
.bx-headline { font-family:var(--font-cormorant); font-size:34px; line-height:1.12; font-weight:600; margin:.12in 0 .2in; }
.bx-headline em { color:var(--gold); font-style:italic; }
.bx-body p { font-size:13px; line-height:1.7; margin:0 0 .16in; }

.bx-highlights { display:grid; grid-template-columns:1fr 1fr; border:1px solid var(--rule); margin-top:.12in; }
.bx-hl { padding:.12in .16in; border-bottom:1px solid var(--rule); font-size:12px; line-height:1.45; }
.bx-hl:nth-child(odd){ border-right:1px solid var(--rule); }
.bx-hl::before { content:"— "; color:var(--gold); }

.bx-doc { display:flex; gap:.18in; }
.bx-doc .anchor { color:var(--gold); font-size:22px; line-height:1; }
.bx-cta { border:1px solid var(--rule); padding:.4in; text-align:center; margin-top:.3in; }
.bx-cta .ci { font-family:var(--font-cormorant); font-size:26px; font-style:italic; margin:.1in 0; }
.bx-cta .btn { display:inline-block; border:1px solid var(--gold); color:var(--gold);
  letter-spacing:.18em; font-size:11px; padding:.14in .4in; text-transform:uppercase; margin-top:.18in; }
.bx-footer { display:flex; justify-content:space-between; color:var(--muted);
  letter-spacing:.14em; font-size:9px; text-transform:uppercase; margin-top:.5in; }

@media print { @page { size: Letter; margin: 0; } .bx { width:100%; } .bx-page{ margin:0; } }
```

- [ ] **Step 2: Write the template page**

Create `src/app/listings/[slug]/brochure/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { vessels } from "@/lib/fleet";
import { getBrochure } from "@/lib/brochures";
import "./brochure.css";

export const metadata: Metadata = { robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

export default async function BrochurePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const vessel = vessels.find((v) => v.slug === slug);
  const b = getBrochure(slug);
  if (!vessel || !b) notFound();

  const [priceMain, ...priceRest] = vessel.price.split(/\s+(?=or\b)/i);
  const obo = priceRest.join(" ");
  const heroCaption = vessel.gallery[0]?.caption ?? vessel.name;

  return (
    <div className="bx">
      {/* PAGE 1 */}
      <section className="bx-page">
        <div className="bx-topbar">
          <span>Gray Yachts · Pacific Northwest Brokerage</span>
          {vessel.badge && <span className="badge">{vessel.badge}</span>}
        </div>
        <img className="bx-hero" src={vessel.image} alt={heroCaption} />
        <div className="bx-specs">
          {b.specStrip.map((s) => (
            <div className="bx-spec" key={s.label}>
              <div className="v bx-serif">{s.value}</div>
              <div className="l">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="bx-pricerow">
          <div className="bx-price">
            {priceMain}
            {obo && <span className="obo">{obo}</span>}
          </div>
          <div className="bx-port">
            <div className="h">Hailing Port</div>
            <div>{vessel.location}</div>
            {b.documentation?.officialNo && <div>USCG Doc #{b.documentation.officialNo}</div>}
          </div>
        </div>
        <hr className="bx-rule" />
        <div className="bx-eyebrow">The Vessel</div>
        <h1 className="bx-headline">
          {b.tagline.lead} <em>{b.tagline.emphasis}</em> {b.tagline.tail}
        </h1>
        <div className="bx-body">
          <p>{b.narrative[0]}</p>
        </div>
      </section>

      {/* PAGE 2 */}
      <section className="bx-page">
        <div className="bx-body">
          {b.narrative.slice(1).map((p, i) => (
            <p key={i}>{p}</p>
          ))}
        </div>
        <div className="bx-eyebrow" style={{ marginTop: "0.3in" }}>Vessel Highlights</div>
        <div className="bx-highlights">
          {b.highlights.map((h, i) => (
            <div className="bx-hl" key={i}>{h}</div>
          ))}
        </div>
      </section>

      {/* PAGE 3 */}
      <section className="bx-page">
        {b.documentation?.note && (
          <div className="bx-doc">
            <span className="anchor">⚓</span>
            <div>
              <div className="bx-eyebrow">USCG Documented &amp; Passenger Inspected</div>
              <p className="bx-body" style={{ marginTop: "8px", color: "var(--muted)" }}>
                {b.documentation.officialNo && <>Official #{b.documentation.officialNo} · </>}
                {b.documentation.callSign && <>Call Sign {b.documentation.callSign} · </>}
                {b.documentation.note}
              </p>
            </div>
          </div>
        )}
        {b.photoCredit && (
          <>
            <div className="bx-eyebrow" style={{ marginTop: "0.3in" }}>Photography</div>
            <p className="bx-body" style={{ marginTop: "8px" }}>
              Photographed at {b.photoCredit} · Gray Yachts Media
            </p>
          </>
        )}
        <div className="bx-cta">
          <div className="bx-eyebrow">Serious Inquiries Welcome</div>
          <div className="ci">Request a private showing or full survey packet</div>
          <div style={{ color: "var(--muted)", fontSize: "13px" }}>
            Full documentation, survey history, and spec sheet on file. Talk soon.
          </div>
          <span className="btn">Message Gray Yachts</span>
        </div>
        <div className="bx-footer">
          <span className="bx-serif" style={{ fontSize: "14px", letterSpacing: 0, textTransform: "none" }}>
            Gray Yachts
          </span>
          <span>Sell Correctly · Pacific Northwest</span>
        </div>
      </section>
    </div>
  );
}
```

- [ ] **Step 3: Verify it renders in the browser**

Run: `npm run dev` (separate terminal), then open `http://localhost:3000/listings/seawulff/brochure`.
Expected: 3-page white brochure with hero, spec strip, gold headline, highlights table, USCG block, CTA. Confirm an unknown slug 404s: `http://localhost:3000/listings/nope/brochure` → 404.

- [ ] **Step 4: Type-check + lint**

Run: `npx tsc --noEmit && npx eslint src/app/listings`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/listings/\[slug\]/brochure
git commit -m "feat(brochures): add print template route"
```

---

## Task 4: Brochure manifest route

**Files:**
- Create: `src/app/listings/brochure-manifest/route.ts`

- [ ] **Step 1: Write the manifest route**

Create `src/app/listings/brochure-manifest/route.ts`:

```ts
import { NextResponse } from "next/server";
import { brochures } from "@/lib/brochures";

// Used by scripts/generate-brochure.ts (--all) to discover slugs without
// importing TS modules into the Node generator process.
export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({ slugs: Object.keys(brochures) });
}
```

- [ ] **Step 2: Verify**

With `npm run dev` running, run: `curl -s http://localhost:3000/listings/brochure-manifest`
Expected: `{"slugs":["seawulff"]}`

- [ ] **Step 3: Commit**

```bash
git add src/app/listings/brochure-manifest/route.ts
git commit -m "feat(brochures): add brochure slug manifest route"
```

---

## Task 5: PDF generator script

**Files:**
- Create: `scripts/generate-brochure.ts`
- Modify: `package.json` (add `playwright` devDep + `brochure` script)

- [ ] **Step 1: Install Playwright + Chromium**

Run: `npm install -D playwright && npx playwright install chromium`
Expected: `playwright` in devDependencies; Chromium downloaded.

- [ ] **Step 2: Write the generator**

Create `scripts/generate-brochure.ts`:

```ts
// Renders /listings/<slug>/brochure to public/listings/<slug>.pdf via Playwright.
// Spawns its own `next dev` server, prints, then tears it down.
// Usage: tsx scripts/generate-brochure.ts <slug> [<slug> ...]
//        tsx scripts/generate-brochure.ts --all
import { spawn } from "node:child_process";
import { chromium } from "playwright";

const PORT = 4399;
const BASE = `http://localhost:${PORT}`;

async function waitForServer(url: string, timeoutMs = 60_000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await fetch(url);
      if (r.ok || r.status === 404) return;
    } catch {}
    await new Promise((res) => setTimeout(res, 500));
  }
  throw new Error(`Server did not start at ${url}`);
}

async function main() {
  const args = process.argv.slice(2);
  if (args.length === 0) throw new Error("Pass <slug> ... or --all");

  const server = spawn("npx", ["next", "dev", "-p", String(PORT)], {
    stdio: "inherit",
    env: process.env,
  });
  const shutdown = () => server.kill("SIGTERM");
  process.on("exit", shutdown);

  try {
    await waitForServer(`${BASE}/listings/brochure-manifest`);

    let slugs = args;
    if (args.includes("--all")) {
      const r = await fetch(`${BASE}/listings/brochure-manifest`);
      slugs = (await r.json()).slugs as string[];
    }

    const browser = await chromium.launch();
    const page = await browser.newPage();
    for (const slug of slugs) {
      const url = `${BASE}/listings/${slug}/brochure`;
      const resp = await page.goto(url, { waitUntil: "networkidle" });
      if (!resp || resp.status() !== 200) throw new Error(`${slug}: route returned ${resp?.status()}`);
      await page.evaluate(() => (document as any).fonts.ready);
      await page.pdf({
        path: `public/listings/${slug}.pdf`,
        format: "Letter",
        printBackground: true,
        margin: { top: "0", bottom: "0", left: "0", right: "0" },
      });
      console.log(`✓ public/listings/${slug}.pdf`);
    }
    await browser.close();
  } finally {
    shutdown();
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
```

- [ ] **Step 3: Add the npm script**

In `package.json` `scripts`, add:

```json
"brochure": "tsx scripts/generate-brochure.ts"
```

- [ ] **Step 4: Commit (generator code, before the fidelity run)**

```bash
git add scripts/generate-brochure.ts package.json package-lock.json
git commit -m "feat(brochures): add Playwright PDF generator"
```

---

## Task 6: Fidelity gate — reproduce Seawulff and compare

**Files:**
- Temp: `public/listings/seawulff.original.pdf` (comparison copy, deleted at end)
- Modify (as needed): `brochure.css` / `page.tsx` until the match is right

- [ ] **Step 1: Back up the original for comparison**

Run: `cp public/listings/seawulff.pdf public/listings/seawulff.original.pdf`

- [ ] **Step 2: Regenerate Seawulff from the template**

Run: `npm run brochure seawulff`
Expected: `✓ public/listings/seawulff.pdf` (no dev server needs to be already running — the script starts its own).

- [ ] **Step 3: Compare against the original**

Open both `public/listings/seawulff.original.pdf` and the regenerated `public/listings/seawulff.pdf`. Compare page-by-page: header strip, hero crop, 5-cell spec strip, price + hailing-port block, headline with gold italic, narrative flow across pages 1→2, the 2-column highlights table, the USCG block, CTA box, and footer. The regenerated PDF should be 3 pages and read as the same brochure.

- [ ] **Step 4: Iterate the template until it matches**

Adjust `brochure.css` (font sizes, hero height, margins, page breaks) and `page.tsx` as needed, re-running `npm run brochure seawulff` after each change. The gate is met when the regenerated brochure visually matches the original. Note: minor kerning/line-break differences are acceptable; layout, hierarchy, and content parity are the bar.

- [ ] **Step 5: Run the enforcement check**

Run: `npm run check:brochures`
Expected: `✓ Brochure check passed (1 brochure(s)).`

- [ ] **Step 6: Remove the comparison copy and commit the regenerated PDF**

```bash
rm public/listings/seawulff.original.pdf
git add public/listings/seawulff.pdf
git commit -m "feat(brochures): regenerate Seawulff PDF from template (fidelity gate)"
```

---

## Task 7: Author + generate the other four brochures

> **This task is interactive — it requires Connor's per-boat facts** (specs for the spec strip, raw material for the narrative, ~12 highlight bullets, any documentation/registration numbers, photo location). Do NOT invent specs. Repeat Steps 2–5 for each of: `playa-linda`, `dub-sea`, `yamaha-252se`, `moby-dick`.

**Files (per boat):**
- Modify: `src/lib/brochures.ts` (add the boat's `BrochureContent`)
- Modify: `src/lib/fleet.ts` (add `slug` + `href: "/listings/<slug>.pdf"` to the vessel)
- Use existing hero at `public/listings/<slug>/hero.jpg`

- [ ] **Step 1: Collect facts from Connor for the boat**

Ask Connor for: the 5 spec-strip cells (e.g. Length, Year, Engine, Sleeps/Beam, Hull/Power), 1–3 paragraphs of narrative material, up to 12 highlight bullets, any documentation numbers, and the photo location. Draft narrative/highlights copy from these; confirm numbers with Connor.

- [ ] **Step 2: Add the BrochureContent entry**

Add a new keyed entry to `brochures` in `src/lib/brochures.ts` following the Seawulff shape exactly (slug, tagline {lead, emphasis, tail}, specStrip[], narrative[], highlights[], optional documentation, photoCredit). Omit `documentation` for boats with no formal docs; the template hides that block when absent. Use fewer than 5 spec cells if a boat has no "Construction"/"Sleeps" equivalent.

- [ ] **Step 3: Wire the vessel**

In `src/lib/fleet.ts`, add to that vessel: `slug: "<slug>"` under its `name`, and `href: "/listings/<slug>.pdf"`.

- [ ] **Step 4: Generate the PDF**

Run: `npm run brochure <slug>`
Expected: `✓ public/listings/<slug>.pdf`. Open it and sanity-check the layout (no overflow, all sections present).

- [ ] **Step 5: Per-boat commit**

```bash
git add src/lib/brochures.ts src/lib/fleet.ts public/listings/<slug>.pdf
git commit -m "feat(brochures): add <slug> listing brochure"
```

- [ ] **Step 6: After all four — run the full check + regenerate all**

Run: `npm run brochure --all && npm run check:brochures`
Expected: 5 PDFs regenerated; `✓ Brochure check passed (5 brochure(s)).`

---

## Task 8: The `gy-listing-brochure` skill

**Files:**
- Create: `~/.claude/skills/gy-listing-brochure/SKILL.md`

- [ ] **Step 1: Write the skill**

Create `~/.claude/skills/gy-listing-brochure/SKILL.md`:

```markdown
---
name: gy-listing-brochure
description: Use when Connor lists a new boat on grayyachts.com, or says "list a boat", "make a brochure for <boat>", "add <boat> to the fleet", or wants the listing PDF for a grayyachts.com vessel. Creates the Seawulff-style branded 3-page brochure PDF, wires fleet.ts, and enforces the every-listing-has-a-PDF rule.
---

# Gray Yachts Listing Brochure

Repo: `/Users/connorgray/Desktop/Claude OS/grayyachts.com`. Every boat listed MUST have a
`/listings/<slug>.pdf` brochure matching `public/listings/seawulff.pdf`.

## Steps
1. Pick a kebab-case `<slug>` (e.g. `playa-linda`). Ensure the hero photo exists at
   `public/listings/<slug>/hero.jpg`.
2. Collect facts from Connor (do NOT invent specs): 5 spec-strip cells, narrative material,
   up to 12 highlight bullets, any documentation/registration numbers, photo location.
3. Add a `BrochureContent` entry to `src/lib/brochures.ts` (shape = the Seawulff entry:
   slug, tagline{lead,emphasis,tail}, specStrip[], narrative[], highlights[], optional
   documentation{officialNo,callSign,note}, photoCredit). Draft the prose; confirm numbers.
4. In `src/lib/fleet.ts`, set the vessel's `slug` and `href: "/listings/<slug>.pdf"`.
5. Generate: `npm run brochure <slug>` → writes `public/listings/<slug>.pdf`.
6. Verify: `npm run check:brochures` (must pass) and open the PDF to confirm layout.
7. Commit, and offer to deploy (`npm run build:cf && npm run deploy`).

## Rules
- Mirror the Seawulff brochure look; don't redesign per boat.
- Never publish a vessel whose href is a PDF without generating that PDF.
- The brochure route `src/app/listings/[slug]/brochure` is noindex/print-only — not a public page.
```

- [ ] **Step 2: Verify the skill is discoverable**

Confirm the file exists and frontmatter parses (name + description present).
Run: `head -5 ~/.claude/skills/gy-listing-brochure/SKILL.md`
Expected: shows the YAML frontmatter.

- [ ] **Step 3: Commit (skill lives outside the repo; commit happens in the repo only for in-repo files — this step is just a checkpoint)**

No repo commit needed for the skill file. Note in the task tracker that the skill was created.

---

## Task 9: Save the hard rule (memory + CLAUDE.md)

**Files:**
- Create: `/Users/connorgray/.claude/projects/-Users-connorgray/memory/feedback_grayyachts_listing_pdf.md`
- Modify: `/Users/connorgray/.claude/projects/-Users-connorgray/memory/MEMORY.md`
- Modify: `grayyachts.com/CLAUDE.md`

- [ ] **Step 1: Write the memory**

Create `feedback_grayyachts_listing_pdf.md`:

```markdown
---
name: feedback_grayyachts_listing_pdf
description: Every boat listed on grayyachts.com MUST get a Seawulff-style branded PDF brochure; use the gy-listing-brochure skill
metadata:
  type: feedback
---

Whenever a boat is listed (or about to be listed) on grayyachts.com, it MUST have a matching
Gray Yachts–branded 3-page PDF brochure at `public/listings/<slug>.pdf`, modeled on
`public/listings/seawulff.pdf`, with the `fleet.ts` vessel `href` wired to it.

**Why:** Connor made this a hard rule (2026-06-03) — the Seawulff PDF (opened when you click that
boat on the site) is the standard every listing should match.

**How to apply:** Use the [[gy-listing-brochure]] skill — author `BrochureContent` in
`src/lib/brochures.ts`, wire `slug`/`href` in `src/lib/fleet.ts`, run `npm run brochure <slug>`,
verify with `npm run check:brochures`. Never invent specs; get facts from Connor. Related: [[grayyachts-com]].
```

- [ ] **Step 2: Add the MEMORY.md pointer**

Under the grayyachts.com section of `MEMORY.md`, add:

```markdown
- [Every grayyachts.com listing needs a brochure PDF](feedback_grayyachts_listing_pdf.md) — Seawulff-style 3-page PDF per boat; use the gy-listing-brochure skill
```

- [ ] **Step 3: Document the rule in the repo CLAUDE.md**

Append a section to `grayyachts.com/CLAUDE.md`:

```markdown
## Listing Brochures (hard rule)

Every boat in `src/lib/fleet.ts` that is publicly listed MUST have a Gray Yachts–branded
3-page PDF brochure at `public/listings/<slug>.pdf`, modeled on `seawulff.pdf`.

- Content: `src/lib/brochures.ts` (`BrochureContent` keyed by slug).
- Template: `src/app/listings/[slug]/brochure` (noindex, print-only).
- Generate: `npm run brochure <slug>` (or `--all`).
- Enforce: `npm run check:brochures` — fails if a PDF-linked vessel lacks brochure content/hero.
- One-command workflow: the `gy-listing-brochure` skill.
```

- [ ] **Step 4: Commit the repo CLAUDE.md change**

```bash
git add CLAUDE.md
git commit -m "docs: document listing-brochure hard rule"
```

---

## Task 10: Deploy + verify live

- [ ] **Step 1: Final check + type-check + lint**

Run: `npm run check:brochures && npx tsc --noEmit && npx eslint src/`
Expected: brochure check passes; no type/lint errors.

- [ ] **Step 2: Build + deploy**

Run: `npm run build:cf && npm run deploy`
Expected: OpenNext build succeeds; Wrangler deploys.

- [ ] **Step 3: Verify each PDF opens on the live site**

For each slug, run e.g.: `curl -s -o /dev/null -w "%{http_code} %{content_type}\n" https://grayyachts.com/listings/seawulff.pdf`
Expected: `200 application/pdf` for all five.

- [ ] **Step 4: Open the site and click through**

Run: `open -a "Google Chrome" "https://grayyachts.com/fleet"`
Confirm each boat card's link opens its brochure PDF.

- [ ] **Step 5: Merge the branch**

Use the superpowers:finishing-a-development-branch skill to merge `feat/listing-brochures` (PR or fast-forward to `main`), then push.

---

## Self-review notes

- **Spec coverage:** data model (T1), template (T3), generator (T5), skill (T8), hard rule memory+CLAUDE.md (T9), Seawulff-first validation gate (T6), other four (T7), deploy (T10). Manifest route (T4) + check script (T2) support the generator/enforcement. All spec sections covered.
- **Open item resolved:** `playwright` is added as a devDependency (spec's open question) rather than relying on the MCP, so the generator is self-contained and skill/script-runnable.
- **Type consistency:** `BrochureContent`, `SpecCell`, `getBrochure`, `brochures`, `vessel.slug`, `/listings/<slug>.pdf`, and `npm run brochure` / `npm run check:brochures` are used identically across tasks.
- **No test runner:** repo has none; we add `tsx` to run the check + generator in TS, and use the check script + visual fidelity (T6) as gates instead of introducing vitest for one data module.
```
