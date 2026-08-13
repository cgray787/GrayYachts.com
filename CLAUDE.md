# Gray Yachts - grayyachts.com

## Project Overview

Luxury yacht management platform with a client portal for yacht owners. Features yacht comparison (with live web scraping), document management, maintenance tracking, and service provider directory.

## Tech Stack

- **Framework:** Next.js 16 (App Router) with TypeScript
- **Styling:** Tailwind CSS v4
- **Backend:** Supabase (Auth, Database, Storage)
- **Deployment:** Cloudflare Workers via OpenNext (`@opennextjs/cloudflare`)
- **UI Libraries:** Framer Motion, Lucide React icons

## Design Scheme

- **Primary BG:** Dark navy `#060a12`
- **Secondary BG:** `#0c1220`
- **Card BG:** `#111827`
- **Gold Accent:** `#C9A96E` (hover: `#d4b87e`, muted: `rgba(201,169,110,0.15)`)
- **Borders:** `#1e293b` (light: `#334155`)
- **Text Primary:** `#f1f5f9`
- **Text Secondary:** `#8892A5`
- **Status Colors:** success `#22c55e`, error `#ef4444`, warning `#f59e0b`, info `#3b82f6`
- **Body Font:** Geist Sans (via `next/font`)
- **Heading Font:** Cormorant Garamond (weights 300-700), used via `font-[family-name:var(--font-cormorant)]`
- **Theme:** All colors defined as CSS vars in `globals.css` → mapped to Tailwind via `@theme inline`

## Commands

```bash
# Development
npm run dev

# Build & deploy to Cloudflare Workers — ALWAYS use this, never raw wrangler.
# `predeploy` runs check:brochures + preflight-deploy first and ABORTS if the
# build would remove pages that are currently live.
npm run deploy

# Preview locally with Wrangler
npm run preview

# Type check
npx tsc --noEmit

# Lint
npx eslint src/
```

## ⚠️ Deploying — read before you publish

**Production has been silently reverted once already.** On 2026-08-10 the site
was overwritten by a deploy from a checkout ~26 commits behind: every
`/fleet/<slug>` listing page started 404ing and the enquiry form, payment
calculator and price sort disappeared. The deploy reported success.

Two protections now exist — do not route around them:

1. **`npm run deploy`**, never a bare `npx wrangler deploy`. The `predeploy`
   hook runs `check:brochures` and `scripts/preflight-deploy.ts`, which
   compares the working tree against **what the live site is currently
   serving** and aborts if any live listing page would 404 after the deploy.
   Override only to genuinely withdraw a listing:
   `DEPLOY_ALLOW_REMOVALS=1 npm run deploy`.
2. **Deploy from a ref that contains all the work.** Check
   `git rev-list --count origin/main..HEAD` before deploying; if it is
   non-zero you are about to publish something older than the branch.

The preflight checks the deployed site rather than git on purpose, so it
protects regardless of branch, worktree or machine.

## Custom Domain

- **Live:** https://grayyachts.com (+ www.grayyachts.com)
- **Workers.dev:** https://grayyachts-com.connorgray41.workers.dev

## GitHub Repo

https://github.com/cgray787/GrayYachts.com.git

## Supabase

- **Project:** GrayYachts Main Website
- **Project ID:** `eorkwxzhtidstznpzlyg`
- **URL:** `https://eorkwxzhtidstznpzlyg.supabase.co`
- **Region:** US East (us-east-1)
- **Admin email:** connorgray41@gmail.com
- **Env vars:** `.env.local` (local) + `wrangler.jsonc` vars + wrangler secrets (`SUPABASE_SERVICE_ROLE_KEY`, `FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`)

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/             # Login page (Supabase auth, bot check, show password)
│   ├── (marketing)/              # Public homepage (layout includes Navbar + Footer)
│   ├── (portal)/portal/          # Authenticated client portal (layout includes Sidebar)
│   │   ├── dashboard/            # Server + client component (fetches Supabase data)
│   │   ├── my-yachts/            # Yacht grid + [id] detail page (tabs: services, maintenance, docs, location)
│   │   ├── compare-yachts/       # URL scraping comparison tool (localStorage, drag-and-drop, mobile comparison table, URL validation)
│   │   ├── documents/            # Document management UI (demo data)
│   │   ├── maintenance/          # Maintenance tracking UI (demo data)
│   │   └── services/             # Service provider directory
│   │       ├── insurance/        # 3 agent profiles + coverage types
│   │       ├── captain-crew/     # Captain profile + crew list
│   │       ├── berth-marina/     # 2 marina listings + amenities
│   │       └── engine-boat/      # Lead tech + 4 specialists
│   ├── api/scrape-yacht/         # Multi-strategy yacht spec scraper
│   └── auth/callback/            # OAuth callback handler
├── components/
│   ├── marketing/
│   │   ├── navbar.tsx            # Fixed header with SIGN IN button
│   │   └── footer.tsx            # 3-column footer
│   └── portal/
│       └── sidebar.tsx           # Fixed sidebar + mobile drawer nav (hamburger, backdrop, slide-out, auto-close, aria)
├── lib/
│   ├── utils.ts                  # cn() helper (clsx wrapper)
│   ├── admin.ts                  # isAdmin() check (hardcoded email list)
│   └── supabase/
│       ├── client.ts             # Browser client (returns null if unconfigured)
│       ├── server.ts             # Server client with cookie handling
│       └── admin.ts              # Admin client with service_role key
└── middleware.ts                 # Auth guard for /portal/* routes
```

## Database Schema

Supabase PostgreSQL with RLS enabled on all tables.

**Portal tables (product-facing):**
- `profiles` — User accounts (linked to auth.users), roles: client | admin
- `yachts` — Vessels owned by users (name, builder, model, year, length, beam, type, status, location)
- `documents` — Uploaded files (title, file_url, category, yacht_id)
- `maintenance_records` — Service history per yacht (service_date, category, title, cost, technician)
- `service_providers` — Directory of professionals (name, category, phone, email)
- `activity_log` — Audit trail (action, description, yacht_id)
- `listings` — Yacht listings

**Paperclip agent tables (shared with grayyachts-agents repo):**
- `prospects` — Lead gen pipeline (name, email, source_url, status, hot_lead)
- `content_drafts` — Social content drafts (platform, content, status, hashtags)
- `outreach_sequences` — Gmail outreach state machine (prospect_id, lead_type, status, thread_id, emails_sent)
- `inbound_messages` — Reply Handler inbound email tracking (gmail_message_id, classification, draft_id, status)
- `blog_posts` — SEO blog content with QA workflow (qa_status, qa_last_feedback, qa_attempt)
- `blog_images` — Image dedup + branding tracking (source, source_photo_id, source_platform, branded_url, alt_text). UNIQUE(source_photo_id, source_platform)
- `qa_reviews` — Per-pass QA results from QA Reviewer (pass_num, pass_name, status, issues jsonb)
- `seo_keywords` — Keyword backlog + ranking tracking
- `seo_performance` — SERP position + AI citation tracking
- `seo_strategy_log` — Strategy shifts + content wins

## API Routes

### `GET /api/scrape-yacht?url=<encoded-url>`
Scrapes yacht specifications from listing URLs. Multi-strategy pipeline:
0. **Firecrawl** — JS-rendered pages, returns HTML + markdown + AI extract + full-page screenshot + og:image. Requires `FIRECRAWL_API_KEY` Cloudflare secret.
1. **Claude Haiku 4.5 vision** (primary spec source) — sends the Firecrawl screenshot to `claude-haiku-4-5-20251001` with a strict JSON schema and reads specs the way a human would. Highest priority in the merge for every spec field (name, builder, year, length, beam, price, cabins, guests, maxSpeed, range, engine, engineHours, location, type). Requires `ANTHROPIC_API_KEY` Cloudflare secret. Cost ~$0.003/scrape.
2. Parse URL slug for year/builder/model (always works)
3. Infer length from model number (handles decifeet builders + spelled-out numbers)
4. Estimate specs from 25+ builder profiles (beam, speed, cabins, engine, range)
5. Look up superyachts.com spec database via sitemap discovery + NUXT state parsing
6. Fetch HTML (direct fetch → Jina AI Reader → allorigins proxy) and extract specs from meta tags, JSON-LD, Twitter cards, and page content
7. Validate HTML data matches URL (token-based builder match — lenient, avoids wiping specs for minor layout differences)
8. **SSRF protection** — blocks internal/private IPs and non-HTTP protocols

**Merge priority (per field):** Claude vision → Firecrawl AI extract → HTML regex → markdown regex → spec database → builder-profile estimation → URL-parsed → defaults.

**Image source (separate chain):** Firecrawl `og:image` → Firecrawl full-page screenshot → branded Unsplash fallback. HTML hero and AI-guessed hero URLs are intentionally excluded; Firecrawl is the only image source.

**Notes:**
- NUXT parsing uses regex-based variable resolution (no `eval` — blocked by Cloudflare Workers).
- Firecrawl and Anthropic both use native `fetch` (no SDK packages) for Cloudflare Workers compatibility.
- Secrets (`FIRECRAWL_API_KEY`, `ANTHROPIC_API_KEY`, `SUPABASE_SERVICE_ROLE_KEY`) must be set via `npx wrangler secret put`, not `wrangler.jsonc` vars.
- Compare-yachts localStorage key is `gy-compare-catalog-v5`; `loadCatalog()` auto-drops any `gy-compare-catalog-*` keys that don't match the current version, so bumping the key in code force-invalidates stale client caches on next page load.

## Authentication Flow

1. Middleware (`middleware.ts`) guards all `/portal/*` routes
2. Unauthenticated users redirected to `/login?redirect=<original-path>`
3. Login page uses Supabase `signInWithPassword` + bot checkbox
4. On success, redirects to original path or `/portal/dashboard`
5. Sidebar has logout button (signs out of Supabase + redirects to `/`)
6. If Supabase env vars are missing, middleware skips auth and pages show demo data

## Related Project

- **grayyachts.media** — Marketing/media production site
  - Local: `/Users/connorgray/Desktop/grayyachts.media`
  - Repo: `https://github.com/cgray787/grayyachts.media.git`
  - Live: https://grayyachts.media
  - Workers.dev: `https://grayyachts-media.connorgray41.workers.dev`

## Listing Brochures (hard rule)

Every boat in `src/lib/fleet.ts` that is publicly listed MUST have a Gray Yachts–branded
3-page PDF brochure at `public/listings/<slug>.pdf`, modeled on `seawulff.pdf`.

- Content: `src/lib/brochures.ts` (`BrochureContent` keyed by slug).
- Template: `src/app/listings/[slug]/brochure` (noindex, print-only Next route).
- Generate: `npm run brochure <slug>` (or `--all`). The script spawns its own `next dev`.
- Enforce: `npm run check:brochures` — fails if a PDF-linked vessel lacks brochure content/hero.
- One-command workflow: the `gy-listing-brochure` skill. Never invent specs — get them from
  a broker sheet or confirm with Connor; flag YachtWorld auto-field conflicts before publishing.
