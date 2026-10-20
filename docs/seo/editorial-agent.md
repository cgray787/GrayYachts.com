# SEO editorial agent — operations (2026-10-20)

The daily SEO research/drafting agent is **not on the production branch**. Its code lives on `origin/seo/international-editorial-20260924` and is deployed from there to the VPS. Do not merge that branch into `restore/prod-plus-leads`: it forked on 2026-09-23 (`910a67f`) and carries 19 commits, including Sept 24 site/editorial UI commits that were never reviewed for prod. Articles it drafts reach the site only when they are added to prod's `content/seo/articles.json` through a normal PR.

## Where it runs

| What | Where |
|---|---|
| Code | `/opt/grayyachts-seo` on the VPS (45.132.242.109): `scripts/seo/editorial_loop.py`, `research-prompt.md`, `PROMPT-SOURCES.md`, `test_editorial_loop.py`, `content/seo/*.json` |
| Schedule | systemd `grayyachts-seo-editorial.timer`, `OnCalendar=*-*-* 07:15:00 America/Los_Angeles`, `RandomizedDelaySec=5m`, `Persistent=true` (unit files: `scripts/seo/deploy/` on the branch) |
| Service | `ExecStart=/usr/bin/python3 /opt/grayyachts-seo/scripts/seo/editorial_loop.py run`; `EnvironmentFile=-/opt/grayyachts-automation/private/config/graycapital/n8n/valuation-providers.env` and `-/opt/grayyachts-automation/private/seo.env` |
| State / runs | `/opt/grayyachts-automation/private/seo-editorial` (`state.json`, `lessons.json`, `report.json`, `runs/<date>.json` + `.md`) |
| Mac copy | launchd `com.grayyachts.seo-runs-pull` → `~/Library/Scripts/grayyachts-seo-pull.sh` (branch: `scripts/seo/deploy/mac-pull-runs.sh`, `com.grayyachts.seo-runs-pull.plist`), hourly at :20 and on wake/login; rsyncs `runs/` to `~/Library/Application Support/GrayYachts/seo-editorial/runs` and posts a macOS notification once per day that produced a draft |
| Health | Daily 08:00 PT email from `scripts/ops/vps-health.py` (prod branch) checks today's run, pause state and web-tool failures — see `docs/newsletter-operations.md` |

Publishing is manual: `program.json` has `automaticPublishing: false`, cadence research daily / 3 drafts a week, `dailyBudgetUsd: 3`.

## Relationship to production

| File | Branch | Prod (`restore/prod-plus-leads`) | VPS (2026-10-20) |
|---|---|---|---|
| `content/seo/program.json` | v1.4.0, 60 measured `keywordTargets` (`0662893`) | absent | = branch |
| `content/seo/keywords.json` | 172 entries | absent | = branch |
| `content/seo/articles.json` | synced from prod (`dce7aba`) | **source of truth** (last change `fb1ea38`, PR #50) | = prod = branch (`3b346346…`) |
| `content/seo/article-images.json` | older 8-entry copy from `b022a8d` (Sept 24) | 9 entries (updated `cc95845`, `fb1ea38`) | = branch (stale) |
| `content/seo/{brands,brand-images,show-images,shows}.json` | identical to prod | identical | identical |
| `scripts/seo/*` | yes | absent | = branch |

`article-images.json` differs between branch and prod, but `editorial_loop.py` does not read it (0 matches for `article-images` under `scripts/seo` on the branch), so the stale copy has no effect on the agent. The site uses prod's copy.

Verified 2026-10-20: `git show origin/seo/international-editorial-20260924:content/seo/program.json` → version `1.4.0`, 60 `keywordTargets`. Every non-cache file under `/opt/grayyachts-seo` matches the branch tip `8fbd189` by sha256 (the VPS also holds `*.bak-20261019` copies and `__pycache__`, not in git). The Mac pull script matches the branch copy by sha256.

## Fixes on the branch (not on prod)

| Commit | Date | Change |
|---|---|---|
| `ffca982` | 10-19 | Run on the VPS (systemd timer, Hermes provider); moved off the Mac launchd job 2026-10-18. `GRAYYACHTS_SEO_PROVIDER` selects `claude` or `hermes` |
| `e34d797` | 10-19 | Fail the run when research tools are down: if at least half the topics report retrieval/provider failures the run raises and alerts (2026-10-19 "completed" with 8/8 topics unverified) |
| `9229d9d` | 10-19 | Call Hermes with `--ignore-rules`, not `--safe-mode` (safe mode also drops `~/.hermes/config.yaml`, which holds the web backend) |
| `c4117e1` | 10-19 | Pull VPS run reports to the Mac and notify on new drafts |
| `dce7aba` | 10-19 | Check all past drafts for duplicates; a same-day lesson replaces the earlier one; pull notifies on late drafts |
| `8fbd189` | 10-20 | Mac pull job uses `StartCalendarInterval` so it catches up on wake |

## Hermes web backend

VPS `~/.hermes/config.yaml` (modified 2026-10-19 14:54 UTC): `web.backend`, `web.search_backend` and `web.extract_backend` are all `firecrawl` (`hermes config get web.backend` etc., verified 2026-10-20). Firecrawl needs `FIRECRAWL_API_KEY` in the process environment:

- The SEO service gets it from `EnvironmentFile=/opt/grayyachts-automation/private/config/graycapital/n8n/valuation-providers.env` (`grep -c ^FIRECRAWL_API_KEY=` → 1).
- `/root/.hermes/.env` does **not** contain it (count 0).

**Open item:** the newsletter cron job (`hermes cron` → `grayyachts-newsletter.py`) and the Hermes Slack gateway do not load that EnvironmentFile, so they have no working web search/extract even though the config names Firecrawl. The newsletter brief requires primary-source research. Fix by giving those processes the key (not by copying it into the repo), then confirm a run's research notes cite fetched pages.

## How to change it safely

1. Work on `seo/international-editorial-20260924` (or a branch off it); run `python3 -m pytest scripts/seo/test_editorial_loop.py`. Push the branch.
2. Copy only the changed files: `scp <file> root@45.132.242.109:/opt/grayyachts-seo/<same path>`.
3. Verify by hash: `shasum -a 256 <file>` locally vs `ssh root@45.132.242.109 sha256sum /opt/grayyachts-seo/<path>`.
4. Unit file changes: copy to `/etc/systemd/system/`, `systemctl daemon-reload`, `systemctl list-timers | grep seo`.
5. After a published article changes on prod, sync prod's `content/seo/articles.json` to the branch and to `/opt/grayyachts-seo/content/seo/articles.json`, and check the three hashes match.
6. Check the next morning's run (`runs/<date>.md`, `state.json` `lastSuccess`/`failures`/`blocked`) or the 08:00 health email, not just the service exit status.
