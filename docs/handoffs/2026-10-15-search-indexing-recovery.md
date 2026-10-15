# Search indexing recovery — 2026-10-15

## Request and production source

Fix the Search Console page-indexing exclusions for grayyachts.com. Work started from production branch `restore/prod-plus-leads` at `323b3cf`, in isolated branch `fix/search-indexing-20261015`. Do not deploy the stale `main` branch. Existing unrelated changes in the canonical checkout were left untouched.

## Findings

The report last updated October 11 listed 31 discovered/unindexed pages. Live HTTP checks found 15 of these returning 404 with noindex: five public hubs, eight Insights articles, and two yacht campaign pages. The other 16 were working fleet listings. Their original content remained in saved branches; the production branch had omitted it. The prior deployment guard only protected fleet content.

The three redirect examples are valid HTTP/www homepage aliases that lead to the HTTPS non-www homepage. They should stay excluded as separate search results. The single crawled/unindexed example was an obsolete favicon URL, not a content page.

Three submitted "sitemaps" were ordinary HTML pages (`http://grayyachts.com/valuation`, `http://grayyachts.com/fleet`, `https://grayyachts.com/sell`), which Google reported as "Sitemap is HTML".

## Changes

- Restored the original editorial pages, content and local image assets from `seo/international-editorial-20260924` (`d4fd414`). Restored the yacht hub/campaign pages and their dependencies from `feat/yacht-campaign-live` (`738cf2d`). Existing fleet and inquiry APIs remain intact.
- Main XML sitemap now contains 39 public URLs, including all 31 discovered examples. Article modification dates come from the original editorial data. Newsletter issue URLs retain their separate sitemap.
- Added crawlable footer links to the restored hubs and self-canonicals to Marine Tech and support pages.
- Redirected legacy `/favicon.ico` requests permanently to the existing `/icon.png` asset, retaining the existing valuation redirect.
- Extended `preflight-deploy.ts` to compare the live public sitemap against the candidate build and reject removed URLs or an unreadable sitemap. Existing fleet/brochure checks remain. An intentional removal requires the existing `DEPLOY_ALLOW_REMOVALS=1` override. This guard must be present in the checkout used to deploy; older checkout versions cannot enforce new checks.

## Deployment and verification

- Deployed using the required `npm run deploy` pipeline. Cloudflare version: `367fb06b-6eb4-424a-8860-a09062a03e47`.
- 19 focused tests passed across sitemap, SEO metadata, editorial validation, and the new public-route guard suites.
- Build and TypeScript checks passed; brochure checks passed for all 16 listings; preflight preserved all 24 previously published sitemap URLs and all 16 fleet listings.
- Post-deployment audit: all 45 audited URLs resolve to HTTP 200. All 31 discovered page URLs return 200 directly, have their own canonical, and have no noindex directive. The main sitemap includes every discovered URL. The old favicon now resolves to the icon successfully.
- `node scripts/verify-deploy.mjs` passed all login/portal access checks.
- Browser inspection of the restored Insights hub showed the hero, published guide links, source attribution and new footer links rendering correctly.
- Evidence: `../seo/2026-10-15-indexing-audit.json` records before/after HTTP responses, canonical tags, robots directives and sitemap contents. No account secrets are included.

## Search Console actions completed

The user explicitly approved removing the three invalid sitemap submissions. All three were removed; their web pages were not deleted.

- Resubmitted `https://grayyachts.com/sitemap.xml`: **Success**, last read October 15, **39 discovered pages**.
- Submitted `https://grayyachts.com/newsletter/sitemap.xml`: **Success**, last read October 15, **10 discovered pages** (the newsletter hub overlaps the main sitemap).
- Started validation for the 31 "Discovered - currently not indexed" pages; Search Console visibly confirmed **Validation started — October 15, 2026**.
- Kept the valid homepage redirects. Did not request indexing of the favicon image as a content page.

## Remaining external work

Google must recrawl and make its indexing decisions. Successful sitemap ingestion and validation initiation do not mean pages are already indexed. Check this existing validation after Google processes it; repeated requests do not guarantee faster inclusion. No recurring job was created.

Sources: [Google Page indexing report](https://support.google.com/webmasters/answer/7440203?hl=en), [Google recrawl guidance](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl), [sitemap guidance](https://developers.google.com/search/docs/crawling-indexing/sitemaps/build-sitemap). Live production and authenticated Search Console observations were captured October 15, 2026.
