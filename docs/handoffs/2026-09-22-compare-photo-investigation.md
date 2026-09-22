# Compare photo investigation — 2026-09-22

Scope: investigate recurring missing photos when pasting listing URLs; no application changes or deployment authorized in this phase. Source checkout: restore/prod-plus-leads, 5e75187504c2971f3a050a379523a75d044a95c2. Existing unrelated changes preserved.

## Reproduced against production

- `https://grayyachts.com/fleet/poulsbo`: live page og:image and `/api/scrape-yacht` imageUrl both contain `http://localhost:3000/listings/poulsbo/hero.jpg`. Image proxy returns HTTP 200 SVG with X-Image-Fallback: photo temporarily unavailable. Root layout lacks metadataBase; fleet metadata supplies a relative image. Preserve private-address protections; fix public metadata.
- `https://www.yachtworld.com/yacht/2021-axopar-37-xc-cross-cabin-10162884/`: direct page request returned 403 Access Denied. Production import returned HTTP 200, name Access Denied, imageUrl null. Photo proxy returns HTTP 200 SVG, no listing photo available. Success cache policy permits 24-hour shared caching of the incomplete import.
- `https://www.denisonyachtsales.com/yachts-for-sale/37-axopar-XXVIII`: photo proxy returned an actual JPEG (2,880,631 bytes), X-Image-Provider: r2-saved-photo. Permanent storage works for valid images. Imported source URL retains HTML entities; normalize those.
- Previously stored Poulsbo original remains available by legacy listing-plus-source hash (317,375-byte JPEG). Listing-only hash returns saved photo not found. Importer and legacy proxy use different identities; reconcile without deleting existing objects.

Raw production response evidence: /private/tmp/grayyachts-compare-investigation/{scrape-0,scrape-1,scrape-2,photo-0,photo-1,photo-2}.json. Temporary evidence may be cleaned by macOS. Automated browser follow-up timed out waiting for all images to finish; do not count it as a passing browser check.

## Code evidence

- src/app/(marketing)/fleet/[slug]/page.tsx:43 and src/app/layout.tsx: relative social image without metadataBase.
- src/app/(marketing)/compare/page.tsx:616–625: an existing URL selects the old card and returns before fetching again. Re-pasting cannot repair its photo.
- src/app/api/scrape-yacht/route.ts:1878–1886: chooses the first photo candidate; archive failure falls back to the remote URL rather than trying remaining candidates. Structured extraction imageUrl is not part of candidate selection.
- src/app/api/scrape-yacht/route.ts:2281: successful imports use s-maxage=86400, including observed blocked-page result.
- src/app/api/yacht-image/route.ts: placeholderImage returns HTTP 200 SVG. src/components/yachts/yacht-image.tsx uses onError, which does not detect a valid placeholder image as a failed import.
- src/lib/yacht-photo-store.ts and src/app/api/yacht-image/route.ts: mismatched photo identity between import and legacy source-based resolution.
- scripts/check-catalog-photos.ts mocks scraper/image routes; scripts/check-live-catalog-photos.ts supplies a known valid photo source directly. These checks do not cover actual URL-only discovery end to end.

## Proposed implementation

1. Correct public metadata URLs; centralize candidate discovery and normalization, validate each candidate, and try the next after failure. Reject blocked pages as successful listings.
2. Use a canonical listing/photo record with compatible lookups for existing objects. Persist validated original bytes before declaring a photo ready; preserve saved originals through reimports and provider outages.
3. Represent photo/import failures explicitly, avoid long caching of failed imports, add retry/upload recovery, and repair existing cards without overwriting user-edited specifications.
4. Verify real URL-only imports (own fleet, YachtWorld, Denison), reload persistence, recovery of existing bad cards, storage retrieval after upstream failure, and blocked-source behavior. Keep deterministic regression tests as well as real-provider checks.

Third-party sites may block initial imports. Do not promise universal automatic retrieval; show a recoverable failure and allow an original-photo upload. No evidence that restarting the website deletes stored originals.
