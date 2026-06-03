# Listing Brochures — Design

**Date:** 2026-06-03
**Repo:** grayyachts.com
**Status:** Approved (design), pending implementation plan

## Goal

Every boat listed on grayyachts.com gets a Gray Yachts–branded 3-page PDF brochure
matching the existing `public/listings/seawulff.pdf`. The brochures are produced from a
single reusable template, wired into the fleet so clicking a boat opens its PDF, generated
by a one-command skill, and governed by a standing rule so no future listing ships without one.

The existing Seawulff PDF is the canonical visual target — the template must reproduce it.

## Reference: the Seawulff brochure (the look to match)

3 pages, Letter, Cormorant Garamond + gold `#C9A96E` on white:

- **Page 1** — Header strip `GRAY YACHTS · PACIFIC NORTHWEST BROKERAGE` (left) + `NEW LISTING`
  (right); full-width hero photo; a 5-cell spec strip (`34.5' / LENGTH`, `1981 / YEAR BUILT`,
  `Saab / 30HP DIESEL`, `4–6 / SLEEPS`, `Wood / CONSTRUCTION`); large price `$35,000` with
  `or best offer`, and a right-aligned `HAILING PORT / Port Townsend, WA / USCG Doc #634426`
  block; gold hairline rule; `THE VESSEL` eyebrow; a serif headline with a gold-italicized
  emphasis phrase (`A classic Pacific Northwest wooden sail vessel — built to last,
  documented to prove it.`); opening narrative paragraph.
- **Page 2** — Remaining narrative paragraphs; `VESSEL HIGHLIGHTS` eyebrow; a 2-column,
  bordered highlights table (each cell a gold em-dash + line of text).
- **Page 3** — Anchor-icon `USCG DOCUMENTED & PASSENGER INSPECTED` callout with doc/call-sign
  detail; `PHOTOGRAPHY` credit (`Photographed at <place> · Gray Yachts Media`); a bordered
  CTA box (`SERIOUS INQUIRIES WELCOME` / italic headline / `MESSAGE GRAY YACHTS` /
  `VIEW FULL SPEC SHEET`); footer `Gray Yachts ⚓ SELL CORRECTLY · PACIFIC NORTHWEST`.

## Decisions (from brainstorming)

1. **Per-boat content** — Connor provides the facts (specs, narrative material, ~12 highlight
   bullets, doc/registration numbers) for each boat. Claude drafts narrative/highlights copy
   from those facts; no invented specs.
2. **Generation** — HTML template rendered to PDF via headless Chrome (Playwright). Reuses the
   site's real theme so it matches Seawulff exactly.
3. **Enforcement** — Standing rule saved to memory + `grayyachts.com/CLAUDE.md`, plus a reusable
   skill so generating a brochure + wiring the fleet is one command. No build-fail check.

## Architecture

### Component 1 — Brochure content model (`src/lib/brochures.ts`, new)
Brochure data lives separately from the fleet cards (keeps `fleet.ts` lean for the homepage /
`/fleet` consumers). Keyed by slug.

```ts
export type BrochureContent = {
  slug: string;                    // "seawulff" → /listings/seawulff.pdf
  tagline: { lead: string; emphasis: string; tail: string }; // headline; `emphasis` renders gold italic
  specStrip: { value: string; label: string; sub?: string }[]; // up to 5 cells
  narrative: string[];             // body paragraphs in order
  highlights: string[];            // 2-column bullet table, in order
  documentation?: { officialNo?: string; callSign?: string; note?: string };
  photoCredit?: string;            // e.g. "Port Townsend, WA"
};

export const brochures: Record<string, BrochureContent> = { /* one entry per listing */ };
```

`fleet.ts` `Vessel` keeps its existing shape; each vessel with a brochure sets
`href: "/listings/<slug>.pdf"` (as Seawulff already does). Hero/price/location for the brochure
are read from the matching `Vessel`; `BrochureContent` supplies only the brochure-specific copy.
The slug links the two.

### Component 2 — Brochure template (`src/app/listings/[slug]/brochure/page.tsx`, new)
A print-oriented Next.js route that renders the 3-page brochure for `<slug>` using the site's
existing theme tokens (Cormorant Garamond, gold, navy from `globals.css`). Pulls the `Vessel`
(hero, name, year, make, length, location, price, badge) + `BrochureContent` (tagline,
specStrip, narrative, highlights, documentation, photoCredit). Print CSS: Letter page size,
`-webkit-print-color-adjust: exact`, page breaks between the 3 sections, margins matched to
Seawulff. Marked `noindex` (robots meta) — it exists to be printed, not browsed; not linked
from any public nav. Returns 404 for an unknown slug.

### Component 3 — Generator (`scripts/generate-brochure.mjs`, new)
Node script using `playwright` (added as a devDependency). Starts/uses a local Next server,
navigates to `/listings/<slug>/brochure`, waits for fonts + hero image to load, and prints to
`public/listings/<slug>.pdf` (Letter, `printBackground: true`). Usage:
`node scripts/generate-brochure.mjs <slug>` or `--all` to regenerate every brochure in
`brochures.ts`.

### Component 4 — Listing skill (`~/.claude/skills/gy-listing-brochure/`, new)
A personal skill that makes listing a boat one step. Input: the boat's facts. Actions:
draft + write its `BrochureContent` entry, add/update the `fleet.ts` vessel + `href`, place the
hero image under `public/listings/<slug>/`, run the generator, and verify the PDF exists. This
is the operational mechanism behind the hard rule.

### Component 5 — The hard rule (saved)
- **Memory** (`feedback_*.md` + MEMORY.md pointer): every boat listed on grayyachts.com MUST
  have a matching `/listings/<slug>.pdf` brochure, generated via the template/skill, with the
  `fleet.ts` `href` wired.
- **`grayyachts.com/CLAUDE.md`**: the same rule documented in-repo.

## Data flow

List/edit a boat → `BrochureContent` entry (+ `fleet.ts` vessel & `href`) →
`/listings/[slug]/brochure` route renders from that data →
Playwright prints → `public/listings/<slug>.pdf` →
fleet card `href` opens the PDF on the live site.

## Build sequence

1. **Prove the template on Seawulff.** Build Components 1–3; author Seawulff's existing content
   into `brochures.ts`; regenerate `seawulff.pdf` from the template and compare against the
   current file. The template is correct only when it reproduces the original. Fix the template
   before scaling.
2. **Author the other four.** Connor provides info for Playa Linda, Dub Sea, Yamaha 252SE, Moby
   Dick → write each `BrochureContent` → generate 4 PDFs → wire `href`s.
3. **Skill + rule.** Build Component 4; save Component 5.
4. **Deploy.** `npx opennextjs-cloudflare build && npx wrangler deploy`; verify each boat's PDF
   opens on the live site.

## Error handling / edge cases

- Unknown slug at the brochure route → 404; generator errors clearly if a slug is missing from
  `brochures.ts`.
- Missing hero image → generator fails loudly rather than printing a blank hero.
- Variable content length: 1–3 narrative paragraphs and a variable highlight count must lay out
  without overflowing page boundaries; spec-strip supports fewer than 5 cells (a powerboat may
  omit "Construction"/"Sleeps").
- Boats with no formal documentation (no USCG doc #) omit the documentation block gracefully.

## Out of scope

- Public, indexable listing web pages (the route is print-only/`noindex`).
- A build/deploy check that fails on a missing PDF (explicitly declined).
- Changes to the homepage `#fleet` / `/fleet` card UI beyond setting `href`.

## Open items for implementation

- Per-boat facts for the four boats (gathered during build step 2).
- Confirm `playwright` is acceptable as a devDependency in this repo (alternative: drive the
  existing Playwright MCP for generation without adding a dep).
