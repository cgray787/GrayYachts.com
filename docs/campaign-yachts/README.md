# Yacht campaign landing pages

Updated October 6, 2026. Branch: feat/yacht-campaign-live, isolated from deployed base af81cb2. The newer seller-measurement branch was deliberately excluded because its rollout is incomplete.

Routes: /yachts, /yachts/pershing-6x, /yachts/sirena-48.

Design follows the existing navy/gold site with Cormorant headings, large real yacht photography, brief specification strips, two gallery photographs and one contact section. The discovery-call link opens a prefilled email draft; no calendar booking, campaign sending or database write is implemented. Phone, email and Seattle address match the user's supplied business details.

Sources checked October 6, 2026:
- https://jeffbrownyachts.com/inventory/boat/2027-pershing-6x-10332235
- https://jeffbrownyachts.com/inventory/boat/2027-sirena-48-48-46
- https://www.irs.gov/taxtopics/tc704
- https://www.irs.gov/publications/p463

Exact photo provenance is in image-sources.json. All six photographs are listing sistership images, labeled accordingly. They are not represented as copyright-free. Pershing cabin count is omitted because the source narrative and table conflict. Pricing and availability require confirmation. Tax text is conditional and expandable; no personal-use deduction or guaranteed tax savings is promised.

Validation: targeted ESLint and diff whitespace checks passed. Desktop layout inspected in Chrome. Production TypeScript build and 55-page generation passed. Guarded deployment checks validated 16 fleet brochures and image coverage for 14 brands, 31 shows and 8 articles; no live fleet route would be removed.

Published via npm run deploy to Cloudflare version 2ca6bd67-4be5-49aa-9cd7-5b5ecb8ea0d0. Live grayyachts.com checks passed for all three routes, both page contact links, one H1 each, all six images and sitemap inclusion; unknown yacht returns 404. Removed dynamicParams=false after live verification found it incompatible with this adapter's cache configuration; route lookup still rejects unknown slugs, matching the existing fleet routing pattern. Mobile visual inspection was not completed.

## Photography and films update

October 6, 2026: added a full-width Pershing cruising photograph, replaced the Sirena hero with a wider aerial shot and replaced its deck-detail image with a guest-cabin photograph. Galleries retain native image proportions instead of cropping interiors. Each page now has four yacht photographs, a hero film anchor and a click-to-load video component with provider attribution and an external fallback link. Source photographs were selected, not synthetically altered.

Pershing film: Jeff Brown Yachts listing embeds https://vimeo.com/1229950847 (oEmbed confirmed title Pershing 6X, uploader Jeff Brown). Sirena film: https://www.youtube.com/watch?v=MQmlljWDDHk (oEmbed confirmed Sirena 48, SIRENA YACHTS). New image URLs are recorded in media-upgrade.json. No media ownership transfer is implied; all remain model/sistership media.

Deployment 5871c2df-8492-445b-b05f-2c8768d5372c. ESLint, production TypeScript/static build, guarded deployment, live route/image/contact/sitemap checks and media markup checks passed. Sirena iframe loaded its titled YouTube player and duration in Chrome; complete playback and mobile visual QA were not verified.

## Email drafts and visible prices

Added emails/pershing-6x.html and emails/sirena-48.html plus matching plain-text drafts and draft-status.json. These are local review artifacts, not Gmail drafts and not sent or scheduled. Each has the Gray Yachts logo, two sistership photos, UTM-tagged landing links, a film link and a discovery-call mailto invitation. Business phone/email/address are included; opt-out replies require manual suppression before any future sends. Pricing awaits Connor's supplied amounts: both listings advertise request price. No estimates were substituted. Tax language remains conditional and was checked against IRS Topic 704 on October 6.

Price styling is now a dark panel with large bold gold type in email drafts and detail-page heroes, and bold gold type on /yachts cards. Email markup checks validated images, link schemes, campaign links, video anchors and price styles. Website lint, TypeScript build and guarded deployment checks passed.

## User-authorized estimated prices

Connor explicitly requested approximate online pricing rather than exact quotes. Added prominently labeled estimated purchase budgets in USD: Pershing 6X $3.3–$3.8 million and Sirena 48 $1.9–$2.3 million, across both detail pages, collection cards, specs and both HTML/plain-text email drafts. These ranges are inferred budgeting guidance, not dealer-confirmed asks. Adjacent copy explains options, taxes, duties and delivery may change the total. Evidence and method are in pricing-estimates.json. Actual JBY listings remain request price. No email was sent.

## Approved business-sale tax copy

User approved the conditional business-sale wording after discussion of deductions versus tax savings. Applied to both HTML/plain-text email drafts and both shared yacht detail pages. On pages it is a visible gold-bordered block immediately before the contact section, with bold headings and the conditional up-to-100% first-year bonus depreciation sentence. The adjacent explanation retains CPA review and eligibility limitations and distinguishes deductions from tax savings. No 70–80% tax-savings claim was added. Existing IRS references retained. Earlier deployment was stopped before publish to incorporate the subsequent bold/visible placement request.

## Short inquiry form

Added a campaign-specific client form to both yacht pages under #contact-connor. Required name/email, optional phone/message, automatic yacht name, honeypot, length limits, disabled submitting state, explicit failure fallback and confirmed-success state. Uses existing POST /api/inquiry without modifying global fleet forms or backend routing. Existing API delivers to connorgray@jeffbrownyachts.com; visitor fallback uses the user-specified grayyachts@gmail.com and phone. No automatic calendar booking or newsletter subscription. Production end-to-end inbox delivery was not exercised because no test email was authorized. Targeted lint and production TypeScript/static build passed.

## Campaign tracking — October 6, 2026

Deployed version: `1622ac6a-aa6d-4210-8170-51c34d191508`.

- `emails/jamie-hillend-preview.html`: untracked source mockup with short biography and existing Connor portrait.
- `emails/jamie-hillend-tracked-preview.html`: registered TEST invitation. All ten links pass through `/c/[opaque-token]/[placement]`; the open pixel loads `/api/campaign/open/[token]`. Opening this file records test events only. Nothing sent.
- Private reporting: `/portal/campaign-activity`; `?test=1` includes only preview records, `?prospect=<research-document-id>` narrows to the cold-call case. Access requires the existing website admin account. This is a separate website dashboard, not an embedded live view inside Command Center. Jamie’s saved cold-call notes link to it.
- Clicks preserve the precise placement ID. Counts are request events, not unique human readers. Basic scanner/prefetch detection flags suspicious traffic; proxies, forwarding and image blocking prevent reliable individual read receipts.
- `/discovery-call?t=<token>` saves a preferred time, contact details and time zone atomically with its event. It does not show calendar availability or automatically reserve a slot. The operator can mark a request booked only after agreeing the time. No calendar booking provider was supplied. No email/push notifications are configured; review the dashboard for activity.
- Reporting stores no raw IP/user-agent. Random 192-bit tokens are not email addresses and cannot read recipient details through public endpoints. A brief measurement disclosure is included in tracked drafts and `/campaign-privacy`.
- Additive schema in `migrations/newsletter/0004_campaign_tracking.sql`, applied to the existing D1 database. File-import endpoint rejected authentication; the authorized D1 query endpoint applied the same SQL successfully.
- Reusable draft generation (never sends): `node scripts/prepare-campaign-email.mjs --name=NAME --input=template.html --output=draft.html --prospect=ID`. Defaults to a test invitation. For a real authorized recipient, supply `--live=yes --email=ADDRESS`; generate one file per recipient. Do not send a shared token or the TEST preview. Preserve the HTML and remote pixel when importing into an email tool; plain-text copies cannot track opens.
- Validation: TypeScript and guarded production deployment passed; eight focused tests cover fixed redirects, unknown tokens, non-counting HEAD, scanner flags, invalid form data and persistence failures. Live HTTP checks verified pixel, redirect, invalid-token rejection, anonymous dashboard login redirect and a TEST call request. D1 read-back confirmed open/click/request events and an unconfirmed request. Browser verified tracked mockup and discovery-call form. No real recipient email sent; calendar delivery and actual Gmail rendering/open behavior have not been tested.
