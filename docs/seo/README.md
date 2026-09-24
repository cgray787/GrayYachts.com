# Gray Yachts SEO and editorial program

Prepared September 24, 2026. Primary property: **grayyachts.com**. Primary business outcome: qualified seller inquiries for Connor Gray. This program supports Google's regular search results and source visibility in AI search; it cannot guarantee either.

## What is ready

* 31 international and regional show research records, with official sources, dates where verified, publication dates where known, and explicit conflicts or gaps.
* Fourteen featured/researched brands: nine JBY brands (Sirena, BRABUS Marine, Axopar, Riva, Pershing, Wally, Everglades, Four Winns, Jeanneau), plus five independent industry profiles. Regional representation is labeled; established brands are not described as new companies.
* Eight published initial articles in [first-articles.md](first-articles.md). Machine-readable content lives in `content/seo/articles.json`.
* 172 keyword candidates in `content/seo/keywords.json`. Volume, difficulty and position are unknown, not invented estimates.
* Website sections at `/insights`, `/boat-shows`, `/brands`, and `/about-connor-gray`, plus selling, home, fleet and listing metadata improvements.
* A sitewide sitemap alongside the existing newsletter sitemap. Drafts never appear in the production sitemap or public article routes.
* A local daily research workflow, three weekly draft opportunities, critique memory and a real-data performance import/report path.

The eight initial articles and SEO routes were deployed September 24 after Connor approved publication. Future local SEO drafts still require review. The separate VPS newsletter workflow now prioritizes active shows; see ../newsletter-operations.md.

## Read the first batch

Start with the seller article, then Monaco, FLIBS, Palm Beach, Cannes, boot Düsseldorf, the brand watchlist and the worldwide show guide. Every article is labeled a draft. Sources are shown beside the sections they support. We do not claim Connor attended a show or tested a boat.

A local preview is available by running:

```sh
SEO_EDITORIAL_PREVIEW=1 npm run dev -- --webpack -p 3107
```

Open `http://localhost:3107/insights`. Preview routes have `noindex`. Production rejects drafts even if the preview environment variable is set. Publication requires status `published`, a nonempty `reviewedBy`, and a valid, nonfuture `publishedAt`. The automatic process cannot change the public content manifest.

## Search Console check

On September 24, 2026, `sc-domain:grayyachts.com` was added and verified in Google Search Console under `connorgray@jeffbrownyachts.com`. The verification TXT record was added at the domain root in the existing Cloudflare account. Cloudflare's DNS dashboard and an authoritative DNS query both confirmed the record; Google displayed **Ownership verified**, then opened the grayyachts.com overview.

Google currently says “Processing data, please check again in a day or so.” This is not a zero-traffic baseline. Keep the verification TXT record in DNS. No website deployment was needed. The site's new sitemap is live; Search Console submission remains pending because Chrome was in active use. The local performance importer/API has not been connected automatically; `metricsStatus` remains `not_connected` until actual measurements are imported.

Earlier account checks found only grayyachts.media. Those checks are superseded by the successful .com verification. Never combine the two domains' performance data.

## The improvement loop

1. **Research:** check official organizer/manufacturer sources, compare with the previous run, and record what changed. Active shows get daily attention. Other shows rotate, and one brand is checked daily. Undated material cannot become breaking news. A source checked today can still describe an old event.
2. **Choose:** prioritize seller questions, useful show developments and practical brand comparisons. Avoid a second page targeting the same intent unless the distinction helps the reader. Historical recaps do not become new news merely because they are rewritten.
3. **Write and critique:** write a useful draft, challenge its factual support, date accuracy, original contribution, search intent and relevance to owners, then revise. No unsupported pricing, resale outcomes, licensing, dealer relationships or test claims.
4. **Remember:** save concrete editorial findings from accepted mechanical checks and include the recent lessons in the next run. This improves the working process; it does not train a model or demonstrate a ranking gain.
5. **Review and publish:** Connor reviews the article's claims and the site's business representations. A reviewed version is promoted to the public manifest and deployed through `npm run deploy`, including its existing safeguards. Do not use a raw deploy or bypass those safeguards. Review image rights separately if imagery is added.
6. **Measure:** import actual Search Console page/query exports after the property is connected. Track qualified inquiries separately from page views. AI citation observations require a saved answer or screenshot, the engine, exact prompt, date, locale and cited URL.
7. **Experiment:** after comparable observation windows, propose one change with a baseline, intended result and rollback condition. Look at click-through rate alongside position and query mix. Favor seller conversions over unrelated show traffic. Keep, revise or revert only with sufficient evidence; record uncertainty and seasonality.

A mechanical pass or an editorial critique is not independent fact verification. An ordinary search result is not a ChatGPT, Gemini or Perplexity citation. Missing data stays missing. Small samples trigger observation, not a claim of success.

## Cadence and limits

The launchd installer schedules 07:15 in the Mac's local timezone (currently America/Los_Angeles). Research runs daily; draft opportunities are Monday, Wednesday and Friday, at most three generated drafts per week. The initial eight articles are a separate seed batch. No substantive evidence means no new article. Runtime is capped at ten minutes and a $3 API-equivalent budget per run through the existing native Claude login. Actual billing depends on that account's plan. No new API key is created.

The Mac must be awake and the user logged in. This is **not** an always-on cloud service or instant breaking-news monitoring. launchd may coalesce missed timers; there is no guarantee a sleeping/offline Mac checks a show on time.

Two failed executions pause the runner. Overlapping executions are locked out, successful same-day reruns are skipped, and credentials remain machine-local. No Slack, email, social posting or automated publishing is enabled. The separate VPS newsletter workflow was updated for event timing; its existing approval email and manual publication behavior remain unchanged.

## Operations

Run from this checkout:

```sh
python3 scripts/seo/editorial_loop.py check
python3 scripts/seo/editorial_loop.py run --dry-run
python3 scripts/seo/editorial_loop.py run
python3 scripts/seo/editorial_loop.py report
```

State, research reviews, candidate drafts and lessons live under `~/Library/Application Support/GrayYachts/seo-editorial/`. Read `runs/YYYY-MM-DD.md` for a human-readable review, `state.json` for run status and `report.json` for measured performance. This directory is machine-local and contains no account credentials. Do not delete this checkout while its installed job points to it; reinstall the job after relocating or merging.

Install once:

```sh
python3 scripts/seo/editorial_loop.py install
launchctl print gui/$(id -u)/com.grayyachts.seo-editorial
```

Stop the schedule:

```sh
launchctl bootout gui/$(id -u)/com.grayyachts.seo-editorial
```

After fixing a recorded two-failure blocker:

```sh
python3 scripts/seo/editorial_loop.py resume
```

### Search Console imports

Use a Pages CSV export for the entire property, or a Queries export filtered to **one page** and supply that exact `--page`. Record the export's real inclusive date range. Aggregate tables and daily data are not interchangeable. Use nonoverlapping 28-day windows for the first comparison.

```sh
python3 scripts/seo/editorial_loop.py import-gsc /path/to/Pages.csv --start YYYY-MM-DD --end YYYY-MM-DD
python3 scripts/seo/editorial_loop.py import-gsc /path/to/Queries.csv --start YYYY-MM-DD --end YYYY-MM-DD --page https://grayyachts.com/sell
```

The importer rejects other domains, future windows, invalid counts and nonfinite metrics. Reimporting the same page/query/window replaces that measurement. Reports do not sum overlapping exports. A minimum of 200 impressions in each equally sized window of at least 28 days enables a review suggestion, **not** statistical proof or an automatic title rewrite. Thresholds are operational heuristics, not Google rules.

### AI observations and conversion evidence

`ai-observations.json` is an optional machine-local array with `engine`, `prompt`, `observedAt`, `country`, `evidence` (path or saved answer), and `citedUrl` (null for a checked answer with no citation). An unavailable engine is an unperformed test, not a negative citation observation. Repeat a stable prompt panel and record model/product differences. The tool reports only the supplied sample.

Useful prompts: “I need to sell a boat in Seattle”; “Who can help me sell my yacht in the Pacific Northwest?”; “How should I prepare my boat for sale?”; “What did [show] announce about [brand]?”

Qualified seller leads are not yet instrumented in this change. Once analytics is connected, preserve first landing page and campaign attribution through valuation submission, obtain consent where applicable, and count successful submissions and qualified conversations rather than button clicks alone. Do not use internal UTM links that overwrite acquisition attribution.

## Editorial and technical basis

* [Google: AI features and your website](https://developers.google.com/search/docs/appearance/ai-features): indexing eligibility, useful content and normal SEO still apply. Special AI markup does not guarantee inclusion.
* [Google: choosing canonical URLs](https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls): use consistent preferred URLs and sitemap entries.
* [Google: title links](https://developers.google.com/search/docs/appearance/title-link): clear, descriptive page titles.
* Organizer/manufacturer sources are recorded in the content JSON and the first draft collection.

No claim is made that FAQ markup, `llms.txt`, more statistics, repeated brand mentions or a fixed article length will produce rankings. No special AI file was added. Article structured data reflects visible published content. Connor's profile uses only information already present on the brokerage's seller page.
