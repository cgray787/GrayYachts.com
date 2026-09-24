# SEO editorial program handoff — September 24, 2026

Branch: `seo/international-editorial-20260924`, isolated under `.worktrees/seo-international-20260924`. Original working changes were preserved. No push or deployment performed.

## Delivered

31 source-linked show records, seven brand profiles, 136 keyword candidates, eight sourced article drafts, editorial critiques, owner-guide/show/brand/Connor pages, descriptive metadata and canonical fixes, published-only sitemap, Organization/ProfilePage/Article structured data as applicable. Drafts are development-preview-only and excluded from production routes and sitemap. See [operating guide](../seo/README.md), [draft collection](../seo/first-articles.md), and [editorial review](../seo/editorial-review.md).

## Running automation

Installed `~/Library/LaunchAgents/com.grayyachts.seo-editorial.plist`, daily 07:15 local Mac time. Monday/Wednesday/Friday allow one candidate draft each. Requires awake Mac and logged-in user. State: `~/Library/Application Support/GrayYachts/seo-editorial/`. The first real research run completed with nine topic updates; Thursday correctly generated no draft. LaunchAgent startup and same-day duplicate prevention were verified with exit code zero. Future scheduled draft generation has not yet been observed.

The job points into this worktree. Reinstall after moving or merging it; do not delete this checkout while the schedule points here. Candidate drafts and critiques remain local. No automatic publishing or messages. The workflow remembers editorial lessons; actual ranking improvement remains unmeasured.

## Validation

Final `npx next build --webpack` passed with 50 generated pages. 34 TypeScript tests (31 existing scrape sanity tests and three editorial tests) plus six Python workflow tests passed. All eight drafts passed mechanical checks; scoped ESLint and git diff whitespace checks passed. Eight HTTP smoke checks covered development routes, production draft rejection, sitemap exclusion and fleet canonical metadata. Safari desktop preview of the hub and seller article was visually inspected. Footer consultation link was repaired to work from nested pages.

A pre-existing Next route export build error required moving unchanged scrape sanity helpers into `src/lib/scrape-sanity.ts`; the route imports them and the existing tests follow the new location. Existing middleware/Edge deprecation notices remain.

## Search Console and next action

Browser check of the three relevant Google accounts found grayyachts.media in two accounts and no properties in the third. No grayyachts.com property was visible. This does not rule out ownership elsewhere. No DNS or Search Console changes were made. User requested setup afterward. The .media figures are not a brokerage baseline.

Content awaits Connor review under the existing editorial approval convention. After approved content is marked with reviewer/date/status, use the repository deployment wrapper and its safeguards. Recheck time-sensitive show facts immediately before publication. Then connect or locate the grayyachts.com Search Console property, submit the deployed sitemap, and collect actual data before making performance claims. Qualified seller conversion instrumentation remains a follow-up.
