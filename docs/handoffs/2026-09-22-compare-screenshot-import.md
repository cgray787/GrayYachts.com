# Compare screenshot import — 2026-09-22

Follow-up to the photo recovery fix: user reported that actual YachtWorld URLs still failed and requested capturing boat photos and visible specifications from listing pages. Exact URLs in their screenshot were truncated; requested the full URLs but did not receive them during implementation.

## Findings

- Fresh Chrome and Firecrawl v2 browser/screenshot requests to the tested YachtWorld Axopar page both returned HTTP 403 Access Denied. Firecrawl returned a screenshot of that error page, not a yacht. Never substitute that screenshot for a boat photo.
- The existing Anthropic vision endpoint returns HTTP 400 invalid_request_error classified as billing. Its account balance was not changed. A Cloudflare Workers AI vision fallback was tested with real images on the existing account and added through the AI binding.

## Implementation

- New `Import from listing screenshots` panel on `/compare` accepts a boat photo plus 1–4 screenshots containing the listing title, price and specifications. Original URL and comparison side are explicit.
- Desktop Capture buttons use browser `getDisplayMedia`: the visitor selects the listing tab, one frame is captured, then sharing stops. Upload works as the alternative on unsupported devices. This is user-mediated capture, not an automatic server-side bypass of YachtWorld's restrictions.
- Original images are saved through the content-addressed R2 photo route. The screenshot API reads those stored images, extracts visible facts and returns a review-required comparison card. Reload persists the card and saved image ID.
- Existing manually edited fields are retained when importing screenshots for an existing URL. Unknown guest capacity is no longer inferred from cabin count.
- Extractor accepts multiple images, validates text/numeric output, distinguishes cruise from maximum speed and converts explicit statute miles to nautical miles. Unknown values remain null.
- Shared screenshot extraction now falls back to the account-bound `@cf/mistralai/mistral-small-3.1-24b-instruct` model when the primary provider fails. Binding responses may be parsed objects rather than text; both forms are normalized.

## Verification and deployment

- 86 Vitest tests passed; TypeScript and targeted ESLint passed.
- `scripts/check-screenshot-import.ts` passed deterministic browser checks for uploads, extraction-to-card mapping, no inferred guest count, photo persistence, reload and mobile width.
- `scripts/check-live-screenshot-import.ts` passed with real screenshots of the public Poulsbo listing, real image uploads, real vision extraction and actual browser imports. Verified 2023, US$300,000, 38ft, 12ft beam, engine details; maximum speed remained null because only cruise was visible. Live API converted 500 statute miles to 434.488nm. No page errors or mobile overflow; photo and card survived reload.
- Existing site deployment verification passed (login, portal redirects and gated leads).
- Deployed through normal `npm run deploy` including brochure/live-page guards. Final Worker version: `16d728c2-8930-45b2-888e-d8b981d2422a`.
- Machine-local evidence: `artifacts/catalog/live-screenshot-extraction.json`, `live-screenshot-browser-check.json`, and desktop/mobile screenshots. Initial failed live attempts exposed the primary provider billing error and fallback response-shape mismatch; final live tests passed after fixes.

## Limits and sources

URL-only YachtWorld importing remains blocked for the tested page. The new path requires the visitor to capture or upload a listing they can open. Native screen-selection permission UI is browser-controlled and was not exercised by the headless upload test. No claim of successful capture for the user's exact two URLs has been made.

Sources: production API/browser traces; `src/lib/yacht-screenshot-extract.ts`; `src/app/api/import-yacht-screenshots/route.ts`; `src/components/yachts/screenshot-import.tsx`; test scripts above. Official API references: https://docs.firecrawl.dev/api-reference/endpoint/scrape and https://developers.cloudflare.com/workers-ai/models/mistral-small-3.1-24b-instruct/ .
