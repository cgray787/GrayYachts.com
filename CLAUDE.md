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

# Build & deploy to Cloudflare Workers
npx opennextjs-cloudflare build && npx wrangler deploy

# Preview locally with Wrangler
npm run preview

# Type check
npx tsc --noEmit

# Lint
npx eslint src/
```

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
- **Env vars:** `.env.local` (local) + `wrangler.jsonc` vars + wrangler secrets (for service_role key)

## Project Structure

```
src/
├── app/
│   ├── (auth)/login/             # Login page (Supabase auth, bot check, show password)
│   ├── (marketing)/              # Public homepage (layout includes Navbar + Footer)
│   ├── (portal)/portal/          # Authenticated client portal (layout includes Sidebar)
│   │   ├── dashboard/            # Server + client component (fetches Supabase data)
│   │   ├── my-yachts/            # Yacht grid + [id] detail page (tabs: services, maintenance, docs, location)
│   │   ├── compare-yachts/       # URL scraping comparison tool (localStorage + drag-and-drop)
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
│       └── sidebar.tsx           # Fixed sidebar with nav, logout, user profile
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

**Tables:**
- `profiles` — User accounts (linked to auth.users), roles: client | admin
- `yachts` — Vessels owned by users (name, builder, model, year, length, beam, type, status, location)
- `documents` — Uploaded files (title, file_url, category, yacht_id)
- `maintenance_records` — Service history per yacht (service_date, category, title, cost, technician)
- `service_providers` — Directory of professionals (name, category, phone, email)
- `activity_log` — Audit trail (action, description, yacht_id)

## API Routes

### `GET /api/scrape-yacht?url=<encoded-url>`
Scrapes yacht specifications from listing URLs. Multi-strategy pipeline:
1. Parse URL slug for year/builder/model (always works)
2. Infer length from model number (handles decifeet builders + spelled-out numbers)
3. Estimate specs from 25+ builder profiles (beam, speed, cabins, engine, range)
4. Look up superyachts.com spec database via sitemap discovery + NUXT state parsing
5. Fetch HTML and extract specs from meta tags, JSON-LD, and page content
6. Validate HTML data matches URL (prevents wrong data from redirected pages)

**Note:** NUXT parsing uses regex-based variable resolution (no `eval` — blocked by Cloudflare Workers).

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
