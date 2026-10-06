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
