# Compare imports from a phone — September 22, 2026

## Shipped
Screenshot imports now store an immutable extracted listing in the YACHT_PHOTOS R2 bucket under `imports/<random UUID>.json`. The returned saved link opens `/compare?import=<UUID>` on another device, fetching the record through GET `/api/import-yacht-screenshots?id=<UUID>`. Existing matching catalog entries and user edits are preserved. These links grant read access to the captured public listing; there is no list endpoint or public mutation endpoint. Photos retain their existing content-addressed R2 URLs.

Screenshot UI exposes the saved link and hides desktop screen-capture buttons when getDisplayMedia is unavailable. Upload remains available on phones. This does not synchronize whole catalogs or make URL scraping universally successful.

## Real listing acceptance
Source: https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/
Captured through the explicitly approved Playwright Extension browser connection. The initial navigation returned a challenge/403, then the actual listing loaded. Saved the actual hero-photo element and title/price, description, engines and specifications screenshots. The extension's path-based file upload timed out; standard Playwright uploaded the same captured files successfully through the real website UI.

Saved result: https://grayyachts.com/compare?import=fe10c01a-d95a-414a-a35c-4b3bf0492d4e
Visible asking price at capture: USD 566,246, tax not paid. Screenshot-derived specs require review. Source conflicts include title length 48.5 ft versus specification LOA 48.4 ft, and description six double cabins plus two single forepeaks versus the table's eight guest cabins. Engine hours differ: 3362 and 3414. Do not represent extraction as verified brokerage data.

## Validation
- 88 Vitest tests pass, including storage/retrieval across requests and invalid/missing/unavailable saved imports.
- TypeScript and targeted ESLint pass; production build succeeds.
- Live end-to-end screenshot upload and extraction pass.
- Separate empty mobile browser context opens the saved link and loads the archived photo.
- No horizontal overflow at 390 px; reload and existing-edit preservation pass.
- Login, protected portal routes and lead-route deployment smoke checks pass.
- Deployment b20ca311-edde-4153-ac85-7508f1b4cc24, using `npm run deploy`; all 16 listing/brochure guards pass.
- Evidence: artifacts/catalog/lagoon-9727102/ (machine-local), script scripts/check-live-lagoon-import.ts. The script requires the captured fixture files in that artifact folder.

## Still unresolved: arbitrary URL-only YachtWorld import
Firecrawl v2 scrape with auto proxies, no cache and a 5-second render wait returned HTTP success containing an Access Denied page. Enhanced proxy with an 8-second wait also returned Access Denied. A standalone Firecrawl browser session connected by CDP likewise stayed on Access Denied after waiting for the listing heading. Test cloud session was deleted. No provider account or billing plan was created or changed. Do not ship these as working fallbacks or tell the user automatic imports are fixed.

The local approved Chrome capture works, but is not the website backend and is not required to open saved import links. A different hosted retrieval provider still needs an actual successful acceptance test against this URL before integration. No provider secrets belong in this document or repository.

Sources: https://docs.firecrawl.dev/features/stealth-mode ; https://docs.firecrawl.dev/api-reference/endpoint/browser-create ; https://docs.firecrawl.dev/api-reference/endpoint/browser-execute .
