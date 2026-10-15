# grayyachts.com keyword strategy — 2026-10-15

## Data
- 267 candidate keywords from Google autocomplete (seller, broker, buyer and location phrases) → Google Keyword Planner (account 828-849-8843, plan "Plan from Oct 15, 2026", United States, Oct 2025 to Sep 2026).
- 258 accepted; **160 with measurable volume**, saved in `keyword-volumes-2026-10-15.tsv` (ranges; the account has no ad spend, so Google shows bands, not exact numbers). Keywords without data had too few searches to report, not zero.
- Baseline (Search Console, 90 days to 2026-10-10): 2 clicks, brand look-alike queries only, homepage the only indexed page.

## What the volumes say
| Band | Keywords | Owner page |
|---|---|---|
| 10K–100K | boat valuation (Low competition), yacht broker (Low), yachts for sale (High) | /services/boat-valuation, /services/yacht-brokerage, /fleet |
| 1K–10K | boat brokerage, boat valuation guide, boats for sale seattle (wa), marine survey, ocean alexander for sale, trawler for sale, boat show seattle wa, boat bill of sale example | brokerage, valuation, /locations/seattle, buyer page, listing, /boat-shows |
| 100–1K | yacht/boat broker seattle, sell my boat, what is my boat worth, boat appraisal, boat consignment, boats for sale anacortes / bellingham / tacoma, vehicle vessel bill of sale washington, how to transfer a boat title, sea ray / back cove / axopar for sale | service and location pages, listings, future WA seller guide |

**Biggest opportunity:** "boat valuation" and "yacht broker" are high volume with Low competition, and both match the offer on /sell.

## Page map (one page per intent, no duplicates)
| Page | Primary | Secondary (sample) |
|---|---|---|
| /services/yacht-brokerage | yacht broker | boat brokerage, sell my boat, broker fees and commission, brokerage vs consignment |
| /services/boat-valuation | boat valuation | boat valuation guide, what is my boat worth, boat appraisal, survey cost, best time to sell |
| /services/buyer-representation | boat buyer broker | how to buy a used yacht, marine survey, sea trials, yachts for sale pacific northwest |
| /services/yacht-marketing | yacht marketing | yacht photography, drone, 3D walkthroughs |
| /locations/seattle | yacht broker seattle | boat broker seattle, boats for sale seattle, sailboats for sale seattle, seattle boat show 2027 |
| /locations/tacoma | boats for sale tacoma | yachts for sale tacoma, puget sound |
| /locations/anacortes | yachts for sale anacortes | boats for sale anacortes, bellingham, san juan islands |
| /sell | what is my boat worth to sell | sell my yacht online, boat valuation tool |
| /fleet/<slug> | "<make model> for sale" | ocean alexander for sale (1K–10K), back cove / sea ray for sale |

114 unique keywords are mapped to the seven new pages (`src/lib/landing-pages.ts`); the rest map to /sell, listings, /boat-shows, /insights and the planned guides below. Keywords are used naturally in titles, headings and answers, never stuffed (Google spam policy).

## Rules followed
- **No doorway pages.** Location pages exist only where there is real inventory (Seattle 7 listings, Tacoma/South Sound 3, Anacortes 2) and measured demand. Gig Harbor, Olympia, Everett, Friday Harbor, Port Townsend: no measurable volume and/or no listings → no page. Bellingham is covered on the Anacortes page (no listings there).
- Every claim is sourced: services (site footer), valuation process (/sell), listings (`src/lib/fleet.ts`), show dates (organizers). No invented commission rates, years in business or sales volume.
- Tests (`src/lib/landing-pages.test.ts`) enforce: unique titles/descriptions, no dashes in copy, ≥300 words, primary keyword present, only live internal links, real listings on location pages, sitemap + footer coverage.

## Next (not built yet)
1. **Washington seller guide** (`/insights`): how to sell a boat in WA, title transfer, vessel bill of sale. Targets "vehicle vessel bill of sale washington" (100–1K), "how to transfer a boat title" (100–1K), "selling a boat in washington state". Must cite WA Department of Licensing directly. The SEO agent drafted it 2026-10-12 (needs a dash fix and a shorter opening).
2. **Marine survey cost guide** ("marine survey" 1K–10K, Low competition).
3. **Model pages / listing copy** for "ocean alexander for sale", "back cove for sale", "trawler for sale".
4. Re-measure in Search Console ~2026-11-15.
