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

- **Colors:** Dark navy (`#060a12`), gold accent (`#C9A96E`)
- **Fonts:** Inter (body), Cormorant Garamond (headings)

## Commands

```bash
# Development
npm run dev

# Build & deploy to Cloudflare Workers
npx opennextjs-cloudflare build && npx wrangler deploy

# Preview locally with Wrangler
npm run preview
```

## Deploy URL

https://grayyachts-com.connorgray41.workers.dev

## GitHub Repo

https://github.com/cgray787/GrayYachts.com.git

## Project Structure

```
src/app/
├── (auth)/           # Login/signup pages
├── (marketing)/      # Public marketing pages
├── (portal)/portal/  # Authenticated client portal
│   ├── dashboard/
│   ├── my-yachts/
│   ├── compare-yachts/
│   ├── documents/
│   ├── maintenance/
│   └── services/
├── api/
│   └── scrape-yacht/  # Yacht spec scraping API
└── auth/              # Auth callbacks
```

## Database Schema

Supabase PostgreSQL with RLS. See `supabase/migrations/` for full schema.

**Tables:**
- `profiles` — User accounts (linked to auth.users), roles: client | admin
- `yachts` — Vessels owned by users (specs, status, location)
- `documents` — Uploaded files (certificates, insurance, manuals)
- `maintenance_records` — Service history per yacht
- `service_providers` — Directory of professionals (insurance, captains, marinas)
- `activity_log` — Audit trail of user actions

## API Routes

### `POST /api/scrape-yacht`
Scrapes yacht specifications from listing URLs. Multi-strategy approach:
1. Parse URL slug for year/builder/model (always works)
2. Fetch HTML and extract specs from meta tags, JSON-LD, and page content
3. Look up superyachts.com spec database via sitemap discovery + NUXT state parsing

**Note:** NUXT parsing uses regex-based variable resolution (no `eval` — blocked by Cloudflare Workers).

## Related Project

- **grayyachts.media** — Marketing site at `/Users/connorgray/Desktop/grayyachts.media`
  - Repo: `https://github.com/cgray787/grayyachts.media.git`
  - Deploy: `https://grayyachts-media.connorgray41.workers.dev`
