# grayyachts.media — Cloudflare Workers Deployment

## Worker Name
`grayyachts-media`

## Deploy URL
https://grayyachts-media.connorgray41.workers.dev

## Source Repository
https://github.com/cgray787/grayyachts.media.git

## Local Path
`/Users/connorgray/Desktop/grayyachts.media`

## Configuration

### wrangler.jsonc (grayyachts.media project root)
```jsonc
{
  "name": "grayyachts-media",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### open-next.config.ts
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

## Build & Deploy
```bash
cd /Users/connorgray/Desktop/grayyachts.media
npx opennextjs-cloudflare build && npx wrangler deploy
```

## Environment Variables
Set via Cloudflare dashboard or `wrangler secret put`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## Tech Stack
- Next.js 16 (App Router) + TypeScript
- Tailwind CSS v4
- Supabase (Auth, Database, Storage)
- Framer Motion, Lucide React

## Design Scheme
- Dark navy (#060a12), gold accent (#C9A96E)
- Inter (body), Cormorant Garamond (headings)

## Routes
- `/` — Marketing landing page
- `/blog` — Blog
- `/portal/*` — Client portal (dashboard, yachts, documents, maintenance, services, compare)
- `/portal/admin/*` — Admin panel (clients management)

## Notes
- Uses `nodejs_compat` flag for Node.js APIs in Workers
- OpenNext converts Next.js output to Cloudflare Workers format
- Separate repo from grayyachts.com — deployed as independent Worker
