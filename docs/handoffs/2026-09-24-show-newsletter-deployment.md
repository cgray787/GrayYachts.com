# SEO and show newsletter deployment

Isolated branch `seo/international-editorial-20260924`, worktree `.worktrees/seo-international-20260924`. Preserve it: local launchd SEO job points here. Canonical root's unrelated dirty work remains untouched.

Guarded deployment completed: `638e88fd-dcd6-4b7b-82b6-620edb605d96`. Includes eight approved SEO articles, show/brand/profile routes, metadata/sitemap, sell indexability fix, OpenNext webpack build configuration and supported nodejs runtimes for three Marine Tech routes. Scraper helper relocation keeps route exports valid without changing behavior. Login verifier now recognizes nested webpack chunk paths.

VPS newsletter wrapper/calendar/brief installed, with originals backed up at `~/.hermes/backups/newsletter-20260924/`. Existing Hermes hourly job and credentials unchanged. Show-aware daily eligibility, duplicate prevention, no-news skip, rotating topics and source/image critique instructions active. Read-only context succeeded and prevented a second issue for September 24. No manual email sent.

Monaco draft and illustrated standalone review are in docs/newsletters; machine-readable draft is content/newsletter-drafts/2026-09-24-monaco.json. Not published or submitted. Existing review requirement retained pending user's optional answer about future automatic web publication. Never infer subscriber-email permission.

Google Search Console domain ownership verified; DNS TXT must remain. Sitemap https://grayyachts.com/sitemap.xml is live with 31 URLs, plus existing newsletter sitemap in robots. Submission UI is pending because user was using Chrome and actions were interrupted. GSC processing data; no imported performance baseline yet.

Validation: 17 targeted TypeScript tests, three newsletter Python tests, six SEO-loop Python tests, 31 scraper tests, TypeScript, guarded production build; live smoke 15 routes, eight article schemas, 31 sitemap URLs, protected endpoints. Source details and editorial limitations: ../newsletters/2026-09-24-monaco-review.md and ../newsletter-operations.md.

## Subsequent visual expansion

Visual deployment `6aba6498-40f7-4292-9fdd-68b7f06287c8` verified live: 7 brand thumbnails at that stage, 8 Insights thumbnails, 31 show photos, all 7 published newsletter hero/card images (6 older-card thumbnails plus featured), 39 asset HEAD checks passed. Login and portal checks passed. Migration 0003 applied remotely, preserving photo deduplication and immutable existing editions while permitting new section-by-section photo sets. Monaco local review has 7 photos and logo, remains unpublished.

User then requested every JBY brand. Expanded to 9 verified JBY brands with regional labels plus 5 independent research brands. Primary sources and photo gaps in ../seo/jby-brand-sources.md. Latest JBY deploy and final checks to be recorded below. No change to GSC pending state; Chrome still playing user's training video, not interrupted.

## Saved design direction

Connor requested retaining the existing navy/gold editorial style and restoring subtabs, then explicitly asked to save and deploy. Shared `EditorialTabs` now connects Newsletter, Featured Brands, Boat Shows, Owner Guides and Connor Gray with an active underline. It appears on editorial routes and both newsletter archive/article pages. Preserve this navigation and the thumbnail cards in future iterations.

Final visual asset/catalog deployment before tabs: `1b30a6b6-d6bc-40d8-b54c-55930de47e38`. Catalog now contains 177 licensed/owned photographs. Brand cards: 9 verified JBY brands plus 5 research brands; 9 licensed photos and 5 clearly labeled original graphics. BRABUS and Everglades remain graphics pending suitable licensed photography or confirmation of dealer photo rights. No unsupported photo-rights assumptions.

Local D1 migrations applied to fix the empty preview's missing-table error; local newsletter now responds 200 but does not contain production newsletter records. Live archive remains the review target. TypeScript passed after shared navigation changes.

Subtab deployment completed: `29c2bd2c-5ee3-490c-93c1-67858d9fcaf8`. All five editorial section routes return 200 with shared navigation and active-section markup. Both production CSS assets return 200 with text/css. Safari initially retained an incomplete stylesheet response during deployment; a reload from origin restored styling, then screenshot confirmed navy/gold hero and all five subtabs. Login, Supabase client chunk and protected portal checks passed.
