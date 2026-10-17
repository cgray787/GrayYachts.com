# Google search, lead measurement, and public-page reliability

Completed October 17, 2026. Worktree: `fix/search-indexing-20261015`.
Production branch: `restore/prod-plus-leads`.

## Deployed changes

- Deployment `17d1ebf9-27f1-4af9-a66c-d7d27b0b1620`, through the required `npm run deploy` workflow.
- Public pages have individual canonical, Open Graph, and Twitter metadata. Homepage organization/site schema and listing breadcrumb schema added. Consultation links resolve to the homepage contact section.
- Existing service/location pages, the Washington State page, and the 359-keyword map were preserved by merging production through `2c82910`. Earlier implementation commit: `9e4c0c1`; merge commit: `bccf73d`.
- Valuation conversion fires only after a successful form API response, once per loaded form. Validation failures, rejected submissions, missing analytics, and analytics exceptions are covered. No personal data is sent in this event.

## Runtime fix

Cloudflare error logs showed `exceededCpu` during public-page rendering. A request to increase the CPU limit was rejected because the account is on the free plan (error 100328). That configuration was removed; no plan or billing change was made.

OpenNext now uses its supported Workers Static Assets incremental cache with cache interception. Build-time pages avoid starting NextServer for each request. The generated cache had 45 entries; portal, API, and private review routes were absent. Dynamic routes remain dynamic. This does not establish a guarantee that every dynamic route will remain within CPU limits.

Deployment preflight now bounds two network probes to 20 seconds. Existing brochure and public-route removal guards remain active. The read-only SEO audit retries curl HTTP/2 framing errors once over HTTP/1.1.

## Verification

- 31 tests passed across valuation conversion, SEO metadata, sitemap, landing pages, Google Ads tag, and public-route guard tests.
- Production build and deployment preflight passed, preserving 47 main sitemap URLs and 16 fleet listings.
- Full live audit at 18:43 UTC checked 56 pages: 54 returned successfully without detected SEO issues; two had local HTTP/2 transport failures, with no origin HTTP status.
- Focused audit at 18:45 UTC successfully checked `/fleet/dub-sea`, `/insights/palm-beach-2027-planning`, and `/sell`. Combined evidence covers 56 HTTP 200 pages with zero issues detected by this audit. Reports retain both runs and explicitly describe the recheck.
- `/fleet/poulsbo` rendered successfully in Chrome after deployment. No additional error events were returned during the brief post-deployment error-tail observation; the tail was stopped afterward.
- These checks verify site accessibility and technical SEO fields, not Google indexing or ranking. No synthetic lead was submitted.

## Google Ads state verified in the account UI

- **Valuation request accepted**: Primary, count One, included in account-level goals; awaiting its first conversion. Manual event installed on `/sell`. Enhanced conversions disabled.
- **Sell page visit (legacy, not a lead)**: renamed from the misleading lead action, Secondary, excluded from account-level goals. Existing historical counts are page visits and must not be reported as genuine leads.
- Created visitor audiences: valuation visitors for 30 days and fleet visitors for 90 days. Both are collecting members and are not attached to campaigns. Audience eligibility remains a prerequisite for remarketing delivery.
- Keyword Search campaign copy, targeting, negatives, and budget proposal are prepared locally. No new campaign was launched and no budgets changed in this work.
- Proposed next step: replace the existing Smart campaign with seller Search using its existing average daily budget; retain the other campaign budget. Specific budget approval was requested and remains pending at this handoff.
- Google displays an advertiser verification deadline of November 14, 2026. The account owner needs to complete that verification.

## Saved review material

In the primary checkout, `artifacts/google-growth-2026-10-15/` contains the private account review plan, ad copy, screenshots, original audit runs, and `seo-verified-20261017.json`. Those account artifacts are intentionally untracked.

No recurring monitoring job was created. Next genuine form submission should be checked for receipt in Google Ads; automated form tests cannot prove Google has received a real conversion.

## References

- [OpenNext Cloudflare caching](https://opennext.js.org/cloudflare/caching)
- [Cloudflare Workers limits](https://developers.cloudflare.com/workers/platform/limits/)
- [Google Ads website conversion setup](https://support.google.com/google-ads/answer/12718882?hl=en-GB)
- [Google Search title links](https://developers.google.com/search/docs/appearance/title-link)
- [Google Search breadcrumb structured data](https://developers.google.com/search/docs/appearance/structured-data/breadcrumb)

Future deployments must continue using `npm run deploy` from a checkout containing current production. Preserve unrelated working-tree edits and keep credentials machine-local.
