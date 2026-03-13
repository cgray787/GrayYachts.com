# grayyachts.com — Cloudflare Workers Deployment

## Worker Name
`grayyachts-com`

## Deploy URL
https://grayyachts-com.connorgray41.workers.dev

## Configuration

### wrangler.jsonc (project root)
```jsonc
{
  "name": "grayyachts-com",
  "main": ".open-next/worker.js",
  "compatibility_date": "2025-12-01",
  "compatibility_flags": ["nodejs_compat"],
  "assets": {
    "directory": ".open-next/assets",
    "binding": "ASSETS"
  }
}
```

### open-next.config.ts (project root)
```ts
import { defineCloudflareConfig } from "@opennextjs/cloudflare";
export default defineCloudflareConfig({});
```

## Build & Deploy
```bash
cd /Users/connorgray/Desktop/grayyachts.com
npx opennextjs-cloudflare build && npx wrangler deploy
```

## Environment Variables
Set via Cloudflare dashboard or `wrangler secret put`:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

## API Routes
- `POST /api/scrape-yacht` — Yacht spec scraping (uses fetch, DecompressionStream for gzip)

## Notes
- Uses `nodejs_compat` flag for Node.js APIs in Workers
- No `eval` available — NUXT parsing uses regex-based variable resolution
- OpenNext converts Next.js output to Cloudflare Workers format
