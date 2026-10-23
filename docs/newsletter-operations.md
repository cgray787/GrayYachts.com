# Brokerage newsletter operations

GrayYachts.com publishes approved brokerage newsletters at `/newsletter` and `/newsletter/<slug>`. The homepage, navigation and footer link to the section. Drafts remain private until Connor approves them.

## Generation and schedule

Hermes Agent on the VPS (the host is not in this public repo; `scripts/hermes-newsletter/sync.sh` reads it from `GRAYYACHTS_VPS` or `~/.config/grayyachts/vps-host` on the Mac) owns job `4c4b201a5833`, “Gray Yachts newsletter — every other day.” Its hourly native cron runs `~/.hermes/scripts/grayyachts-newsletter.py`. The Python wrapper checks every second Pacific calendar day, starting September 8, 2026, at or after 9am America/Los_Angeles. It accounts for daylight saving and month boundaries. Outside that window it exits without model usage. Unique database slots, a VPS file lock and a check for stored content prevent duplicate generation. Failed generation gets up to three attempts on its due day. No laptop is required.

The job invokes `hermes --model gpt-6-astra --provider openai-codex` using the VPS's existing ChatGPT authentication. An actual Astra connection test succeeded. No separate model API key was added. The general Hermes default remains Terra. The wrapper pins Astra only for this newsletter. Hermes's `cron.script_timeout_seconds` is 1900; the child agent timeout is 1800 seconds. The previous config was backed up privately on the VPS.

The job's project directory is `~/.hermes/workspaces/grayyachts-newsletter`. Source-controlled copies of its Python wrapper and brief are under `scripts/hermes-newsletter/`. The complete Humanizer v3.0.0 skill and MIT license are copied from `src/lib/newsletter/vendor/`. Upstream: https://github.com/blader/humanizer. Original and edited JSON, factual-review notes, private agent logs and model usage reports are saved on the VPS.

Buyer and seller editions alternate. The brief requires a useful direct answer, natural headings, buyer/seller questions and evidence for factual claims. Research uses relevant brokerage pages and primary sources when necessary. It forbids invented prices, market trends, inventory, testimonials and first-person experiences. History and rejection feedback inform subsequent editions. Humanizer editing and a factual review precede submission; Connor remains the final editor. The server validates structure, length, source references, date and the agent's editorial attestation; it does not independently verify every claim.

## Review and publication

`POST /api/newsletter/draft` requires the private automation credential. It stores the original and edited article as pending and triggers Resend delivery to `connorgray@jeffbrownyachts.com`. It cannot replace stored content for an existing slot. Cloudflare's hourly cron runs delivery retries only (`NEWSLETTER_AI_PROVIDER=hermes`); the Cloudflare AI binding was removed. The newsletter does not use the website's existing Anthropic key.

The email opens a private review page. GET never approves or rejects. A POST with an issue-specific HMAC token changes a pending draft exactly once. Approve publishes the stored article; reject keeps it private and saves feedback. No action emails subscribers. Public archive, article pages and sitemap select only published issues. Review pages have noindex and no-referrer metadata. Keep approval links private.

## Configuration and recovery

The transport/signing credential lives at `~/.config/grayyachts/newsletter-automation-secret` with mode 0600 on the local machine and VPS, and as the Worker secret `NEWSLETTER_AUTOMATION_SECRET`. It is not committed. Preserve it: rotation invalidates existing review links. ChatGPT account credentials stay on the VPS and were not copied.

Other Worker bindings: `NEWSLETTER_DB` (D1 database `grayyachts-newsletter`), `RESEND_API_KEY`, `NEWSLETTER_REVIEW_TO`, `NEWSLETTER_FROM`, and `NEWSLETTER_START_DATE`. Current sender is the site's existing Resend testing sender, `Gray Yachts <onboarding@resend.dev>`. The provider identified `connorgray@jeffbrownyachts.com` as its account owner and rejected the initially selected admin Gmail address under its testing-sender restriction. Approval delivery uses the confirmed owner address. A verified branded sender can be configured separately.

`node scripts/newsletter-ops.mjs status` reports recent drafts and provider delivery status. `node scripts/newsletter-ops.mjs run` retries pending delivery; generation remains in Hermes. `hermes cron list`, `hermes cron runs 4c4b201a5833`, and the private per-date agent logs show VPS health. `hermes cron run 4c4b201a5833` manually triggers the same due-date and duplicate checks. Inspect errors before resetting a date's `.attempts` file after three failed generations.

Email failure preserves the completed draft and is retried up to five times using an atomic lease and Resend idempotency key. After five attempts, inspect the D1 `error` before resetting attempts. A provider acceptance ID is not proof of inbox delivery; check the provider's last event. Unreviewed drafts remain private indefinitely.

Apply migrations with `wrangler d1 migrations apply grayyachts-newsletter --remote`. Deploy only with `npm run deploy`, including existing brochure and live-listing preservation checks. Never deploy an older checkout that omits these changes.

## Validation

Nine Vitest tests cover Pacific calendar/DST boundaries, token binding, unauthorized decisions, immutable approval/rejection, malformed articles, failed factual checks, email retries, Hermes draft deduplication, and no cloud AI calls in Hermes mode. Tests use actual in-memory SQLite (Node 22+). TypeScript, targeted ESLint, production build and Cloudflare deployment passed. Local Cloudflare/Playwright tests verified desktop and mobile layouts, draft exclusion from public archive and sitemap, invalid tokens, safe GET review links, explicit approval, rejection, replay protection and Article JSON-LD. Deployment preflight preserved all 16 live yacht listings and brochures.

## Launch record — September 8, 2026

Production version `3cc304cb-8d6b-43fb-ad13-f39d17caa321`. Native Hermes job completed successfully with `gpt-6-astra` / `openai-codex`. First seller edition: “What should you prepare before a yacht broker evaluates your boat?” Issue `cfc0df00-a2a9-4f61-a7b2-146a647728cf` is pending Connor's approval. Resend accepted its approval email at 2026-09-09T02:25:15Z, ID `ba0efb78-89ad-443c-ab07-be2fbe593126`. The configured API key cannot query delivery events (401), so inbox delivery was not independently confirmed. Connor explicitly confirmed `connorgray@jeffbrownyachts.com` as the destination. Next new edition is due September 10 at 9am Pacific.

`node scripts/newsletter-ops.mjs verify` passed against production: desktop/mobile archive, private article 404, sitemap exclusion, signed review page and visible decision controls. This is read-only and does not approve content. Screenshots are machine-local under `~/.config/grayyachts/newsletter-checks/`.

## Image policy — added September 8, 2026

> Superseded in part. Editions now carry `sections.length + 2` images (5–9: lead, one per section, questions) chosen by relevance first; see "Newsletter data model" and "Image records" below. The no-reuse rule still holds.

Every new edition must include 2–3 different photos, including its lead image. Never reuse an image within an edition or across editions. Renaming, cropping, resizing or recoloring a used photo does not make it new. Hermes must inspect photos and avoid near duplicates, poor images or embedded screenshot controls. It selects from the authenticated unused-photo catalog, writes descriptive alt text/captions, and never implies that unrelated boats are the same vessel or currently available.

The image catalog is built from existing Gray Yachts listing photography using `node scripts/newsletter-image-catalog.mjs`. Content SHA-256 IDs deduplicate identical files regardless of filename. The initial catalog contains 124 distinct files; visual inspection remains necessary for different crops or encodings of a photo. New assets must be reviewed for these variants before adding them. Retain registered photo URLs for archived newsletters. If fewer than two suitable unused photos remain, Hermes stops and reports that the library needs replenishing; it cannot recycle photos.

Migration `0002_images.sql` adds a permanent image-use ledger with a unique image ID and a transactional trigger: reserving photos and saving an issue happen atomically. Rejected-draft photos remain reserved. Intake validates 2–3 catalog photos and rejects duplicate/unknown selections. Images appear once each in the issue, approval email and private review page. The archive uses the edition's lead image as its thumbnail.

The first existing pending draft can receive its images through authenticated `POST /api/newsletter/images`; this cannot replace an existing photo set or change a reviewed issue. It increments the review revision, invalidating the older approval token and requesting a new review email with a distinct idempotency key. New approvals are tied to the stored revision. The first selection is Seawulff exterior, Neverland helm and Playa Linda salon. Twelve tests now include image-count validation, duplicate rejection, cross-edition atomic reservations, rejection retention and old-link invalidation.

## Licensed imagery and art direction

Eleven commercially licensed Pexels images extend the catalog to 135 images. See `newsletter-photo-licenses.md` and `newsletter-licensed-images.json` for provenance and usage restrictions. Existing ledger reservations still apply. The scheduled context rotates suggested perspectives across editions; Hermes must adapt those suggestions to the topic and available unused photos. Prefer a sharp landscape lead, one or two complementary photos, accurate restrained captions and coherent light/color. Reject poor images and screenshot controls. The email distributes images through the article instead of placing every photo at the top. Two strong photos are preferable to a weak third.

The image-direction rotation now also includes marine equipment, boatyards, working harbors, coastal scenery and life aboard. Hermes treats the broader category list as a sourcing brief and only selects suitable reviewed photos actually present in the catalog.

## Server relevance check and image sizes — added October 18, 2026

`POST /api/newsletter/draft` and `POST /api/newsletter/images` now show each photo, with the text it illustrates (lead: title and introduction; section i: heading and first ~600 characters; last: the questions), to Workers AI `@cf/google/gemma-4-26b-a4b-it` (`src/lib/newsletter/relevance.ts`). A clear mismatch returns HTTP 409 naming `images[i]` and the model's reason. If the check itself fails (AI error, timeout after 30 s, unreadable verdict, missing bytes) the image is accepted and stored with `check: 'skipped'` and `checkReason`; passed images carry `check: 'passed'`, plus pixel `width`/`height`. No migration: these fields live in the edition's `images` JSON.

R2 media is served resized: `/newsletter-media/<id>?w=640|960|1280` (WebP) and `&f=jpeg` (the review email uses `?w=960&f=jpeg`). Variants are made once with the Images binding (`IMAGES` in `wrangler.jsonc`) and stored in R2 as `newsletter-media/<id>.w<width>.<webp|jpg>`; a resize failure serves the original. `/cdn-cgi/image/` transformations are not enabled on the zone. Catalog photos use the pre-built WebP variants from `scripts/build-image-variants.py`.

## Newsletter data model — migrations 0003–0005

D1 database `grayyachts-newsletter` (binding `NEWSLETTER_DB`, `migrations_dir: migrations/newsletter`). Each edition's photo set is the `images` JSON column of `newsletter_issues`; `newsletter_image_uses` is the permanent reuse ledger (unique `image_id`). The trigger `newsletter_reserve_images` (`AFTER UPDATE OF images ... WHEN NEW.images <> OLD.images`) reserves every image in the new set inside the same statement, so a reused id aborts the whole update. Each migration below drops and recreates that trigger; only the last one is live.

| Migration | What it does | Who can change an edition's images | Applied remotely (`d1_migrations.applied_at`, UTC) | Reached `restore/prod-plus-leads` |
|---|---|---|---|---|
| `0003_section_images.sql` | Allows 2–9 images (was 2–3) so each section can be illustrated | Only an edition with no images yet (first attachment); any non-empty set is immutable | 2026-09-24 18:42:45 | 2026-10-18, PR #52 (`ae631ca`). Written 2026-09-24 in `b022a8d` on `seo/international-editorial-20260924` and applied from there; prod lacked the file for 24 days |
| `0004_media.sql` | Adds `newsletter_media` (per-edition licensed/generated media: `id`, `url`, `kind` ∈ licensed/generated, `source`, `credit`, `license`, `license_url`, `title`, `prompt`, `created_at`). Trigger: a **pending** draft may replace its images; its old reservations are deleted and the new set reserved atomically | Empty set, or status `pending` | 2026-10-18 22:01:23 | PR #53 (`6efac0a`) |
| `0005_published_image_corrections.sql` | Same trigger, also allows status `published` (the Barcelona boat-show edition went live with unrelated brokerage photos; publication emails no subscriber list, so the web page is the only copy) | Empty set, or status `pending` or `published`. `rejected`/`failed` editions stay immutable | 2026-10-18 22:06:16 | PR #53 (`a49c6d1`) |

Every version also enforces 2–9 images per set. Replacing a set releases the edition's previous reservations (0004+), so the replaced photos become available to later editions again.

Application rules (`attachImages` in `src/lib/newsletter/images.ts`): only `pending` or `published` rows are selected. A pending replacement bumps `review_revision` and clears `email_sent_at`/`email_id`/`attempts`/`error`, so the old approval link dies and a new review email goes out. A published correction updates `images` and `hero` in place and sends nothing.

Verified 2026-10-20: `npx wrangler d1 migrations list grayyachts-newsletter --remote` → "No migrations to apply!" (all five local files applied); timestamps above from a read-only `SELECT id,name,applied_at FROM d1_migrations`.

## Image records

`NewsletterImage` (`src/lib/newsletter/images.ts`), stored per edition in `newsletter_issues.images`. No column per field; adding a field needs no migration.

| Field | Meaning | Added |
|---|---|---|
| `id` | Catalog id (`src/lib/newsletter/image-catalog.json`) or 64-hex SHA-256 of the media bytes. The reuse key | original (`99aec01`, Sept 8) |
| `url` | `/newsletter/...` static asset (catalog) or `/newsletter-media/<id>` (R2) | original |
| `alt`, `caption` | Written by Hermes, 10–300 chars, no `<>`. Generated images get " (AI-generated illustration)" appended if the caption doesn't say so | original |
| `credit`, `source` | Photographer/library credit and source page; for imported media the library name is appended to the credit | original |
| `license`, `licenseUrl` | Licence name and official licence page (optional on older catalog photos) | PR #52 (`ae631ca`) |
| `kind` | `catalog` \| `licensed` (imported) \| `generated` (Workers AI) | PR #53 (`6efac0a`) |
| `relevance` | Required, 20–400 chars: one sentence on how the image fits its section | PR #53 (`6efac0a`) |
| `width`, `height` | Pixel size read from the bytes during the relevance check | PR #56 (`42ae291`) |
| `check` | `passed` \| `rejected` \| `skipped` (rejected never gets stored: the request fails with 409) | PR #56 (`42ae291`) |
| `checkReason` | Model's one-sentence reason, or why the check was skipped | PR #56 (`42ae291`) |

Count rule: when the article is known, exactly `sections.length + 2` images (lead, one per section in order, questions); otherwise 2–9. No id may repeat within the set.

**Media libraries and licences** (`src/lib/newsletter/media.ts`, `POST /api/newsletter/media/import`): `downloadUrl` must be the library's own file host and `sourceUrl` its photo page — Wikimedia Commons (`upload.`/`thumb.wikimedia.org`, `c901a48`), Pexels (`images.pexels.com`), Unsplash (`images.unsplash.com`). A redirect away from the file host is rejected. Licences: Pexels License, Unsplash License, CC0 1.0 / Public domain (no attribution), CC BY or CC BY-SA 2.0/2.5/3.0/4.0 (credit must name the author), each with its official licence URL. JPEG/PNG/WebP, 20 KB–15 MB. Bytes go to R2 bucket `grayyachts-catalog-photos` (binding `YACHT_PHOTOS`) at `newsletter-media/<sha256>`; a row is inserted into `newsletter_media` (`INSERT OR IGNORE`) and the response says `alreadyUsed` if the ledger already holds that hash.

**Generated media** (`POST /api/newsletter/media/generate`): Workers AI `@cf/black-forest-labs/flux-1-schnell`, 8 steps; the server appends "No text, no lettering, no logos, no brand names, no identifiable people". Stored as `kind: generated`, credit "AI-generated illustration".

**Relevance check** (`src/lib/newsletter/relevance.ts`, PR #56): on `POST /api/newsletter/draft` and `POST /api/newsletter/images`, each image (resized to a 768 px JPEG via `IMAGES`, original if resizing fails) is sent with its section text to Workers AI `@cf/google/gemma-4-26b-a4b-it` (14/14 on labelled pairs, 2026-10-18). Lead ↔ title + introduction; section i ↔ heading + first ~600 chars; last ↔ the questions. Any `fits: false` → HTTP 409 `Image does not fit its section. images[i] (...): <reason>`. **Fail-open:** an AI error, 30 s timeout, unreadable verdict, missing bytes or missing article stores the image with `check: 'skipped'` and the reason — an AI outage cannot block an edition, so `skipped` images were not machine-checked.

**`IMAGES` binding** (`wrangler.jsonc`: `"images": { "binding": "IMAGES" }`): Cloudflare Image Transformations (`/cdn-cgi/image/`) are not enabled on the zone, so resizing is done in the Worker (`src/lib/newsletter/resize.ts`). `GET /newsletter-media/<id>?w=640|960|1280` returns WebP; `&f=jpeg` returns JPEG for email clients (the review email uses `?w=960&f=jpeg`). Other widths 404. Each variant is made once and cached in R2 as `newsletter-media/<id>.w<width>.<webp|jpg>`; if it would be larger than the original, the original bytes are stored instead. A resize failure serves the original with a 5-minute cache; everything else is `immutable`, 1 year.

## Hermes pipeline (repo `scripts/hermes-newsletter/`)

| Repo file | VPS path |
|---|---|
| `newsletter.py` | `/root/.hermes/scripts/grayyachts-newsletter.py` |
| `show_calendar.py` | `/root/.hermes/scripts/show_calendar.py` |
| `BRIEF.md` | `/root/.hermes/workspaces/grayyachts-newsletter/BRIEF.md` |
| `sync.sh` | runs on the Mac only |

The repo is the source of truth. `show_calendar.py`, the show-calendar / visual-direction / featured-brand-priority sections of the brief (Connor, 2026-09-24) and migration 0003 were first written on the SEO branch (`b022a8d`) and deployed to the VPS from there; they reached prod with PR #53 (`6efac0a`) and PR #52.

**Schedule.** Due daily during a verified show window (`show_calendar.py` + workspace `shows.json`), otherwise every second Pacific day from 2026-09-08, at or after 09:00 PT. At most one edition a day.

**BRIEF.md — Image rule (revised 2026-10-18).** Every image must clearly show its section's subject; unrelated filler is not allowed. `sections.length + 2` images, chosen in order: (1) a freely licensed photo of the actual subject via `import-media` (Wikimedia Commons preferred for real events/venues/named boats; reject NC, ND, editorial-only, watermarked or unclear rights); (2) a catalog photo only when it genuinely shows the section's subject; (3) a generated illustration of a concept scene, at most half the edition, never a real named show/venue/brand/model/logo/person as if photographed. Each image needs `relevance`; archival photos state their year. On a 409 replace the image rather than rewording captions. `replace-images` fixes a pending draft (new review email) or a published edition (in place).

October 18 brief changes:
- `6efac0a` (PR #53) — relevant licensed or generated photos per edition; import/generate commands; relevance notes; pending drafts may replace photos.
- `cc71839` (PR #53) — no text-bearing objects (documents, signs, screens, hull names, flags) in generation prompts; inspect and regenerate garbled output.
- `a49c6d1` (PR #53) — `replace-images` also corrects published editions in place.
- `2c6b9df` (PR #57) — explains the server's 409 relevance check.

**`newsletter.py` commands**

| Command | Does |
|---|---|
| `run` (default; hourly Hermes cron job `4c4b201a5833`) | File lock → `context` → if due, up to 3 attempts per slot → Hermes `gpt-6-astra` / `openai-codex`, 1800 s → confirms a draft was stored |
| `context` | Prints the task context: `asOf`, `show_windows`, `topic_rotation`, calendar refresh targets, `image_direction`, `due`, `slot`, `audience`, `recent_editions` (slot/slug/title/status/feedback + image ids only), `image_library` |
| `submit <slot>.json` | `POST /api/newsletter/draft` |
| `import-media <file.json>` | `POST /api/newsletter/media/import` (`downloadUrl`, `sourceUrl`, `license`, `licenseUrl`, `credit`, `title`) |
| `generate-media "<prompt>"` | `POST /api/newsletter/media/generate` |
| `replace-images <issue-id> <images.json>` | `POST /api/newsletter/images` |
| `preflight` | Builds the real prompt from live data and checks `hermes auth status openai-codex`; exits 1 if the prompt is over the inline limit, fewer than 9 unused images, or the Codex login is inactive |

**Alerting.** PR #58 (`a682892`): Codex OAuth expired and every run failed 2026-10-02 → 10-18 with output only in a local file. The wrapper now emails Connor via Resend (`RESEND_API_KEY` from the environment, else from the SEO agent's private env file on the VPS) once per slot (`<slot>.alerted` marker), including the last error line of `<slot>.agent.log`. PR #59 (`4bf52d7`) also alerts on any exception in the agent step, not just at the three-attempt cap.

**Prompt size.** PR #59: on 2026-10-19 BRIEF + context reached 138 KB, over Linux's 128 KB single-argument limit (`MAX_ARG_STRLEN`), and every run crashed before Hermes started. `recent_editions` is now summarised (~103 KB). Over `ARG_LIMIT = 120_000` bytes the prompt is written to `<slot>.prompt.md` and Hermes is told to read that file.

**`sync.sh`** (PR #54 `f873bef`, preflight added PR #60 `f6fffa6`): `scp`s the three files to the VPS, compares `shasum -a 256` locally with `sha256sum` remotely (prints `ok` / `DRIFT`, exits 1 on drift), then runs `preflight` on the VPS and exits 1 if it fails. `sync.sh --check` compares hashes without copying. The VPS host is read from `GRAYYACHTS_VPS` or `~/.config/grayyachts/vps-host` (mode 600, Mac only, never committed); the script exits 2 with a message if neither is set.

**Daily health email** (PR #60, `scripts/ops/vps-health.py`, installed as `/opt/grayyachts-health/vps_health.py`; units `scripts/ops/deploy/grayyachts-health.{service,timer}`, 08:00 PT). One email to Connor covering: SEO agent (today's run exists, not paused, fewer than half the topics show web-tool failures), newsletter (preflight, failed cron runs in 24 h, no edition for >4 days), Hermes Codex token (logged in, >24 h left, no last error), failing systemd units (unrelated services on the same VPS are listed but not counted) and disk <85%. A check that cannot run counts as a failure. `--dry-run` prints instead of emailing.

### Repo ↔ VPS verification — 2026-10-20

| File | Repo (`restore/prod-plus-leads` @ `c8dd244`) sha256 | VPS sha256 |
|---|---|---|
| `BRIEF.md` | `733d632962f1…` | `733d632962f1…` — match |
| `newsletter.py` | `0de23202f9e6…` | `0de23202f9e6…` — match |
| `show_calendar.py` | `3929ca59fdd0…` | `3929ca59fdd0…` — match |
| `scripts/ops/vps-health.py` | `27c49606772e…` | `/opt/grayyachts-health/vps_health.py` `27c49606772e…` — match |

The repo BRIEF contains the 2026-09-24 sections "Show calendar and timely reporting", "Visual direction" and "Featured-brand priority"; nothing on the VPS is missing from the repo. `grayyachts-health.timer` was enabled but had not fired yet (first run 2026-10-21 08:00 PT).

Known brief inconsistencies (not yet fixed): step 6's envelope example shows images with only `id`/`alt`/`caption` and "catalog image id" although `relevance` is required and media ids are allowed; the "Art direction" paragraph still says "use two excellent images if a third adds nothing", which conflicts with the `sections.length + 2` count the server enforces.

## Where things live / how to change them safely

- **Website + API + D1 migrations:** this repo, branch `restore/prod-plus-leads`. Apply migrations with `npx wrangler d1 migrations apply grayyachts-newsletter --remote`; check with `... migrations list ... --remote`. Deploy only with `npm run deploy` after `git pull`.
- **Newsletter agent files:** edit in `scripts/hermes-newsletter/`, merge, then run `scripts/hermes-newsletter/sync.sh` from an up-to-date checkout. It must print `ok` three times and a preflight with `"problems": []`. Never edit the VPS copies directly; if you must, copy the change back and confirm `sync.sh --check`.
- **Health check:** edit `scripts/ops/vps-health.py`, `scp` it to `/opt/grayyachts-health/vps_health.py`, compare `sha256sum`, and run it there with `--dry-run`.
- **SEO editorial agent:** lives on a separate branch; see `docs/seo/editorial-agent.md`.
