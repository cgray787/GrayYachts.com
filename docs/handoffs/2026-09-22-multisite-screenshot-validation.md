# Screenshot imports across boat websites

## Scope
User asked which approach fixes comparison photos and requested screenshot verification for major boat sites. The working fallback is uploading actual listing screenshots to the public website, with photos archived in R2 and immutable import links usable on other devices. This is not an automatic URL-to-screenshot service. The existing provider's hosted YachtWorld capture remains blocked. Browserbase credentials are not configured in the checked app/agent environments; its performance was not tested and no plan was purchased.

## Changes
- Preserve screenshot-derived listing-status and photo notices in review flags.
- Read notices in a separate focused pass for multi-image imports: the original broad spec prompt sometimes missed small notices or included advertising copy. Do not copy generic prompt examples into notices.
- Keep separately visible engine-hour values. Equal values yield the common hours; different values yield an unknown combined value plus an explicit review flag, never a sum.
- Add a live, unmocked acceptance script: `scripts/check-multisite-screenshot-import.ts`. Requires local screenshot fixtures under `artifacts/catalog/`.

## Test fixtures
- YachtWorld: https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/ — 2018 Lagoon 50, displayed USD 566,246. The engine screenshot fully shows only the first engine's 3362 hours. Other engine values must not be inferred from the model or URL. Broader source conflicts remain subject to review.
- BoatTrader: https://www.boattrader.com/boat/2023-axopar-37-xc-cross-cabin-9589437/ — 2023 Axopar, USD 339,000. Source explicitly labels images Photos of Sistership. Visible maximum 56 knots, 280 nautical miles range; two engines each 5 hours.
- boats.com: https://www.boats.com/power-boats/2023-axopar-37-xc-cross-cabin-9589437/ — same syndicated listing and sistership-photo notice, different layout. This is a layout acceptance fixture, not an independent market comparable.
- Denison: https://www.denisonyachtsales.com/yachts-for-sale/37-axopar-XXVIII — 2021 Axopar, USD 290,000, explicitly Off Market. Source cruising speed 30 knots must not be presented as maximum speed.

Source screenshots are actual browser captures, not recreated pages. Early captures caught the wrong section during smooth scrolling; the affected fixtures were replaced with stable captures and inspected. Denison was recaptured in standard Playwright when the extension connection stalled. Source cookie/ad overlays can obscure details: upload clear images and inspect the result. No physical iPhone test is claimed; the automated UI uses an iPhone-sized Chromium browser context with touch/mobile emulation.

## Validation and limits
91 unit tests pass, plus TypeScript and targeted ESLint. Live acceptance uploads through the website UI, checks identity/year/price and selected visible specs/notices, follows saved links in an empty mobile browser context, reloads, verifies original archived images and checks horizontal overflow. Results and example links are saved in `artifacts/catalog/multisite/results.json`; source fixtures, extracted responses and mobile evidence live alongside it. Do not claim exhaustive coverage of every listing or perfect OCR. Every screenshot import retains the review-required flag.

Provider reference: https://docs.browserbase.com/platform/identity/overview — hosted browser identity features exist, but documentation is not proof that a specific boat site permits access. A successful live acceptance test is required before integrating or recommending a paid provider.

## Final live acceptance
Deployment: `49704961-f252-4222-b97c-fb67347479bf`, shipped through `npm run deploy`. Listing/brochure guards and post-deploy login/portal smoke checks passed.

- YachtWorld: PASS — https://grayyachts.com/compare?import=50eab366-840f-495d-b755-687604b7bbe1
- BoatTrader: PASS — https://grayyachts.com/compare?import=98273b16-a431-456b-a721-f2c17308f4ab
- boats.com: PASS — https://grayyachts.com/compare?import=56692175-400d-44ed-bd29-c5c4d83de48a
- Denison: PASS — https://grayyachts.com/compare?import=21e19583-11b7-4c9c-9948-c721c23cf132
