# Compare photo recovery — deployed 2026-09-22

User authorized implementation after the investigation. Production Worker version: `51de85c8-fc20-4ec4-882d-1e89714caa32`. Built from the current production lineage `restore/prod-plus-leads` (base `5e75187`), not divergent `main`. Deployment used `npm run deploy`; brochure and live-page guards passed.

## Changes

- Set production metadataBase so fleet share images use public URLs. Repair the known legacy localhost metadata only for GrayYachts listing assets; private-address protections remain intact.
- Share photo normalization and HTML discovery across import and image recovery. Decode HTML entities, resolve relative URLs, reject blocked pages and non-listing assets, include structured extraction photos, and try alternate candidates after failed downloads.
- Resolve imports and existing cards through a normalized listing identity. Read/migrate legacy source-key objects without deleting old objects; reuse saved originals before contacting upstream sites.
- Return actual failures (no-store) instead of HTTP 200 placeholder images. Bump extraction/browser request cache versions; do not cache incomplete photo imports for 24 hours.
- Retry photos from existing URLs in both Compare and Catalog without replacing manually edited yacht details. Older cards automatically attempt photo recovery and persist stable saved IDs.
- Add explicit Retry photo and Upload photo controls. Uploads are same-origin, limited to 8 MB, validated as supported raster formats and stored under content-addressed keys; uploads never overwrite a shared listing photo. Saved uploaded photos are preserved when a URL is re-entered.

## Verification

- 83 Vitest tests passed, including alternate-candidate recovery, blocked import rejection, legacy-object migration, original retention during upstream failure, upload behavior, private-address rejection and failed-image cache handling.
- TypeScript passed. Targeted ESLint: no errors, two pre-existing unused fallback-image constant warnings in scrape-yacht.
- Deterministic browser checks: `scripts/check-catalog-photos.ts` and `scripts/check-photo-recovery.ts` passed. Covered import, failure/retry, edited field preservation, upload, reload, browser reopening, empty catalogs, mobile width and demo migration.
- `scripts/check-live-catalog-photos.ts` now exercises real pasted URLs without supplying an image URL. Live Poulsbo import returned a stored 317,375-byte photo; Denison returned a stored 19,686-byte photo. Subsequent ID-only reads matched the bytes exactly. Public Poulsbo metadata no longer contains localhost.
- The YachtWorld test listing remains blocked upstream. The API now returns 502/no-store with a readable error; no Access Denied yacht is created.
- Live browser: imported both successful URLs, verified visible photos in catalog and comparison, reloaded, checked desktop/mobile and no page errors/overflow. Screenshots and JSON results saved in `artifacts/catalog/` (machine-local evidence).
- Live upload: stored the known Poulsbo photo and verified exact bytes on retrieval.
- `node scripts/verify-deploy.mjs`: public login, signed-out portal redirects and admin-gated leads checks passed.

The initial isolated-worktree build hit a Turbopack restriction on an external node_modules symlink. Replaced that symlink with an APFS clone of installed dependencies and reran the normal guarded deployment successfully. An initial live browser selector assumed the prior scraped yacht name; corrected the check to inspect saved photo URLs, then reran successfully.

## Limits

Third-party access restrictions cannot be guaranteed away. Blocked whole-listing imports show an error and require retry or another listing link. For an existing/imported card with a missing photo, the visitor can retry or upload an original. Catalogs remain browser-local; original photo bytes are in R2. Do not claim account-wide catalog sync or that clearing browser storage preserves catalog records.
