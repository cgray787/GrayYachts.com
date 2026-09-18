# Catalog photos and comparison page

Deployed to https://grayyachts.com/compare. Worker version: `51c755dc-1ed1-473c-87d5-8db90b8dab7f`.

## Proven causes

- Live image response for the built-in Serenity II entry returned `X-Image-Provider: firecrawl-screenshot`, with seven-day immutable caching. The rendered image was a website error screenshot.
- `YachtImage` ignored the listing's saved `imageUrl` and always re-scraped the listing through the proxy.
- The proxy used only ephemeral `caches.default`, not persistent image storage.
- Five built-in demonstration yachts had no original photos. Catalog loading also deleted older storage versions and resurrected demos after emptying the catalog.

## Changes

- Dedicated R2 bucket `grayyachts-catalog-photos`, binding `YACHT_PHOTOS`; do not remove this binding or bucket on future deployments.
- Import archives real listing metadata/HTML photos and returns `/api/yacht-image?id=<sha256 key>`. Legacy remote originals are archived on display. Existing stored bytes are reused before any upstream request.
- Screenshots, stock and model-search replacements are excluded. Image downloads validate magic bytes, limit size, and validate each redirect against private hosts. Same-site `/listings/` photos use the ASSETS binding (same-zone network fetch failed in the initial live check).
- Catalog thumbnails and comparison cards share the saved photo source. An unavailable photo uses a local fallback, not a broken image icon. An upstream photo that was never accessible cannot be recovered from nothing; no substitute boat photo is invented.
- Larger catalog photo cards, Yacht 1 / Yacht 2 buttons, import form first, useful empty state, visible remove buttons, and honest review status.
- Preserve imported/edited yachts and older localStorage keys; remove only untouched built-in examples. Empty catalogs stay empty. Browser-storage failure now displays an error.

## Verification

- 75 unit tests pass, including original-byte persistence with upstream offline, fake-image rejection, private redirect rejection, same-site asset routing, and catalog migration.
- TypeScript and production builds pass. Deployment went through `npm run deploy`; brochure and production preflight checks preserved all 16 listings.
- `scripts/check-catalog-photos.ts [base URL]`: passed against both a production build locally and the deployed site. Uses explicit API fixtures in an isolated browser: import, reload, reopen with persisted browser state, image loading, mobile overflow, delete-to-empty, demo migration. Screenshots under local `artifacts/catalog/` are test fixtures, not actual customer yachts.
- `scripts/check-live-catalog-photos.ts`: real live save/read passed 2026-09-18T21:37:15Z. Saved public Poulsbo hero photo: 317375 bytes; SHA256 `2b96f44fbcea003007bd873fcb6f15b81c6f9be0847cc6449b44f49c1c758fc5`. Read by ID with cache-busting query and no upstream URL matched original bytes exactly; `X-Image-Provider: r2-saved-photo`.

Catalog records are still local to the same browser; photos are durably server-stored. Clearing browser site data removes that browser's catalog. Account synchronization was not part of this change.

Production source is `restore/prod-plus-leads`, not the older divergent `main`; the seller-page work from main was already restored on this production branch via 1532adc and subsequent improvements. Existing unrelated working-tree edits were left intact.
