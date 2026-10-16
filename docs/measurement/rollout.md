# Seller funnel measurement — implementation and rollout

Prepared October 1, 2026. Implementation is not deployed. No real inquiries or emails were submitted in testing.

## Production source

The live `/sell` HTML matched `seo/international-editorial-20260924` at `af81cb2` byte-for-byte before edits. `main` (`92ce4ac`) is older and lacks the current engine-hours question and photo upload. This branch is based on the matching SEO branch, not main. Confirm the latest deployed ref before merging. Never replace the live site with the older main branch. Existing deploy safeguards in CLAUDE.md still apply.

## What this change does

- Shared public-page measurement with optional GA4, loaded only after visitor consent; authenticated portal, login, auth, newsletter review and Marine Tech pages are excluded. Form functionality is independent of analytics availability.
- Page views, questionnaire start, seven step views/completions, contact-step views, validation failures, submit attempts/failures, confirmed inquiries, internal/outbound and telephone/email clicks.
- `generate_lead` fires only after the API returns an accepted inquiry ID. API acceptance requires both a durable inquiry record and a saved Resend acceptance receipt. Email-provider acceptance does not prove inbox delivery.
- The inquiry ledger keeps contact/answers, first/last campaign context, OpenAI `oppref`, Google/Meta click IDs and source tags. Photos remain email attachments; only the photo count is stored in the ledger.
- Stable request IDs suppress duplicate storage; Resend idempotency keys protect notification retries within the provider's retention window (currently 24 hours). Already accepted inquiries return their existing ID without another email. Conflicting payloads under one ID are rejected.
- `/portal/seller-inquiries` is admin-only and shows the latest 100 inquiries, campaign labels, notification status and editable qualification/appointment/listing outcomes. Failed notifications remain visible for manual follow-up. There is no background email retry worker in this change.
- A private SQL view `valuation_campaign_outcomes` aggregates stored/accepted inquiries, notification failures, qualified inquiries, appointments and signed listings by Pacific date/source/campaign/creative. This is an inquiry cohort report by creation date, not an event-date sales report.
- Names, email, phone, answers, photos, raw click IDs and arbitrary URL parameters do not enter our GA4 events. Google receives a pseudonymous analytics identifier and optional random inquiry ID for reconciliation. Do not register inquiry ID as a custom dimension.
- Questionnaire promise corrected from five/six to seven questions.

## Required deployment gates

1. Connect Google Analytics in GSC Wizard under the same account already connected to Search Console. As of this audit, Analytics consent is absent and no GA4 property is linked. Identify the correct web data stream; do not create a duplicate property blindly.
2. Apply `supabase/migrations/202610010001_valuation_inquiries.sql` to the existing main website Supabase project. Confirm service-role insert/read/update succeeds and anonymous/authenticated client-role reads fail. The new API deliberately fails closed if storage is missing.
3. Configure server environment `GA4_MEASUREMENT_ID` using that web stream's actual `G-...` ID. Confirm existing `SUPABASE_SERVICE_ROLE_KEY`, `NEXT_PUBLIC_SUPABASE_URL`, `RESEND_API_KEY`, `LEAD_TO`, `LEAD_FROM`. Never put service credentials in public JavaScript or GitHub. No credentials were added by this change.
4. In GA4, disable enhanced-measurement automatic form interactions and automatic history-based page views for this stream; the application owns these events. Disable unwanted automatic URL/form capture and review data retention. Mark `generate_lead` as the inquiry key event. Do not use button clicks or generic form_submit as the conversion.
5. Register event-scoped custom dimensions `form_id`, `step_name`, `error_type`, `link_type` if those breakdowns are desired. Campaign dimensions use the normal UTM fields. Configure session source/medium reporting for `chatgpt / paid` (or an agreed paid medium); do not equate organic ChatGPT referrals with ads.
6. Publish/approve an accurate website privacy notice. `/privacy` is referenced by the existing seller page but this source branch does not contain that route. This implementation does not claim legal compliance or modify the Marine Tech policy.
7. Complete the browser test suite below on a machine with Chromium and verify the migrated database integration on a preview. Confirm optional photo delivery and notification failure recovery. Any real test email/inquiry must be explicitly labelled and approved before submission.
8. Deploy through `npm run deploy` and its predeploy guards. Cloudflare CLI was unauthenticated in this workspace. No live deployment was attempted.
9. Verify GA4 DebugView with consent granted, then denied; no double pageviews, no PII, seven steps, failure never increments generate_lead, one accepted inquiry emits once. Confirm actual inquiry ID in the private ledger and notification receipt. Browser events are best effort, not exactly-once durable delivery.
10. OpenAI Ads still has no conversion source or event settings. Configure its real Pixel/CAPI source and event mapping in Ads Manager before implementing that provider's code. Preserve `oppref` and use the same event ID if browser/server deduplication is configured. This PR captures the ID with the inquiry but does NOT send OpenAI conversion events, configure a pixel, or change campaign goals. Never fabricate a source ID or API contract.

## Conversion reporting

Use aligned completed Pacific reporting windows and comparable cohorts:

| Metric | Definition |
| --- | --- |
| Landing conversion rate | GA4 sessions landing on `/sell` that contain `generate_lead` / GA4 sessions landing on `/sell` |
| Questionnaire completion | Sessions with questionnaire_start followed by generate_lead / sessions with questionnaire_start |
| Step drop-off | Sessions reaching a step without reaching the next step / sessions reaching that step |
| Qualified-inquiry rate | Qualified/appointment/listing_signed inquiries / stored inquiries in the selected inquiry cohort |
| Cost per qualified inquiry | Matched campaign spend / qualified inquiries in the agreed attribution cohort |
| Listing rate | Signed-listing inquiries / inquiries in the same cohort |

GA4 session conversion rate is separate from Ads Manager's attributed post-click conversion rate. Do not divide all inquiry records (including visitors declining analytics) by only consented GA4 sessions. Do not replace missing conversion data with zero. Ad clicks and website sessions are different counts. Reconcile provider-attributed conversions and ledger records rather than expecting them to match exactly.

Attribution persists for 30 days only after analytics consent, in origin-scoped browser storage. Without consent, the current page's campaign context can accompany the submitted inquiry but is not persisted across visits. `www` and apex have separate local storage; use a consistent canonical ad destination and test cross-host navigation before making cross-visit attribution claims. Blockers, consent, device changes and private browsing mean not every visitor is measurable.

For per-creative reporting, give each ad an agreed unique `utm_content`. Existing new ads currently share campaign-level tags; the original live ad has no UTM tags. Adding labels requires a separate Ads Manager change and may trigger another ad review. Buyer-oriented dealer copy also needs alignment with the seller destination before launch.

## Verified live findings

- GSC September 1–28: 100 impressions, 1 click, 1% search CTR, average position 8.83. Previous comparison window empty; no trend claim.
- GSC inspection of `https://grayyachts.com/sell`: URL unknown to Google, no crawl time. This does not prevent paid visitors reaching the page.
- No submitted sitemaps initially. Verified the live `https://grayyachts.com/sitemap.xml` includes `/sell`, then submitted it through GSC. Accepted and confirmed, pending Google download; submission is not indexing.
- Ads original campaign reported September 28–30: $320.91, 11,591 impressions, 64 clicks, 0.55% CTR, $5.01 CPC. Two new campaigns remain paused. All seven ads approved and point to `/sell`. Conversion sources/settings empty.

## Validation

- `npx vitest run src/lib/measurement.test.ts src/app/api/valuation/route.test.ts`: 14 tests passed (synthetic, mocked providers).
- `npx tsc --noEmit`: passed.
- Targeted ESLint: passed.
- `npm run build`: passed, including the final shared public-page layout.
- `npx playwright test tests/seller-measurement.spec.ts`: blocked before execution because Chromium was not installed. Download attempts returned invalid/truncated archives. These two browser tests remain a deployment gate; do not call them passed.
- SQL migration, live GA4 collection, real email delivery, OpenAI conversions and Cloudflare deployment remain unverified.

References: https://developers.google.com/analytics/devguides/collection/ga4/reference/events ; https://resend.com/docs/dashboard/emails/idempotency-keys ; https://help.openai.com/en/articles/20001409-conversion-measurement
