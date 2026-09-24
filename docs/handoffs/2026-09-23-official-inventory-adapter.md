# Boats Group official inventory adapter

## Scope and status
User explicitly asked to find and use the official API. Adapter implemented behind `BOATS_GROUP_API_KEY`; absent key means no API call and unchanged existing fallbacks. **No account-issued key found, no live authenticated feed verified, no API service purchased or activated.**

Searched relevant canonical Gray Yachts projects and machine-local agents config by filename-only matches, checked deployed Wrangler secret names, and searched the connected connorgray@jeffbrownyachts.com mailbox read-only for API/feed provisioning. The Notion email tool was unavailable, so used the existing local Gmail integration. Exact API/feed searches found no setup message; seven Boats Group/BoatWizard sender messages were leads or product notices. Do not conclude that the brokerage has no entitlement—only that this search did not locate it. No outbound message sent.

## Implementation
- `src/lib/boats-group-api.ts` recognizes YachtWorld, BoatTrader and boats.com hosts and extracts the source listing ID.
- Requests the official HTTPS inventory/search endpoint using YachtWorldID/BtolID/BcnaID, server-only key, 12-second timeout, no redirects, versioned JSON Accept header.
- Requires one exact source-ID match. Maps explicit specifications with unit conversions. Does not invent missing values, treat cruising speed as maximum, expose hidden prices, compare non-USD raw prices as USD or use combined engine hours as individual hours.
- Existing scrape route tries the configured API first and archives original image candidates through existing R2 machinery. Existing providers remain fallback if unavailable/unconfigured.
- `scripts/check-boats-group-api.ts` is a read-only live verification command; it reports only mapped data and photo count, never credentials.
- Tests use representative fixtures, not a captured authenticated API response. Actual feed shape/coverage must be checked before declaring activation successful.

## Access required
Official auth instructions: https://api.boats.com/docs/overview
Fields and source-ID parameters: https://api.boats.com/docs/services/details?s=inventory
Request API access: https://www.boatsgroup.com/about-us/contact-us/
Feed coverage/offer: https://www.boatsgroup.com/solutions/co-brokerage-api/

A brokerage administrator or Boats Group representative must provide account-issued website API access and confirm coverage for grayyachts.com. Configure the key machine-locally, validate a known listing with the script, then install it as a Cloudflare secret using `npx wrangler secret put BOATS_GROUP_API_KEY`. Do not paste credentials in chat, commit them or borrow public-site keys. Verify photo-storage/display permissions and update/removal requirements with the actual account agreement.

## Validation and deployment
97 tests passed; TypeScript and targeted ESLint passed. Guarded production deployment preserved 16 listing pages and brochures. Worker version `40786f99-abd6-46ab-8bc0-d1cae23db430`. Postdeploy smoke checks passed. Production Lagoon saved-capture URL regression passed (second-slot failure simulated), confirming existing fallback remains functional while the official feed is unconfigured. These checks do not establish live official API access.

Final deployment includes concurrent Sell-page logo changes from origin/restore/prod-plus-leads after a clean rebase: Worker `ab8b54bc-b1e9-467b-99ec-701f89f45a80`. Direct unauthenticated HTTPS inventory/search request for YachtWorldID 9727102 returned HTTP 200 with JSON `error.message` = `Authentication error: invalid API key.` The adapter checks this error envelope as well as HTTP status.
