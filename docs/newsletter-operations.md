# Brokerage newsletter operations

GrayYachts.com publishes approved brokerage newsletters at `/newsletter` and `/newsletter/<slug>`. The homepage, navigation and footer link to the section. Drafts remain private until Connor approves them.

## Generation and schedule

Hermes Agent on the existing VPS (45.132.242.109) owns job `4c4b201a5833`, “Gray Yachts newsletter — every other day.” Its hourly native cron runs `~/.hermes/scripts/grayyachts-newsletter.py`. The Python wrapper checks every second Pacific calendar day, starting September 8, 2026, at or after 9am America/Los_Angeles. It accounts for daylight saving and month boundaries. Outside that window it exits without model usage. Unique database slots, a VPS file lock and a check for stored content prevent duplicate generation. Failed generation gets up to three attempts on its due day. No laptop is required.

The job invokes `hermes --model gpt-6-astra --provider openai-codex` using the VPS's existing ChatGPT authentication. An actual Astra connection test succeeded. No separate model API key was added. The general Hermes default remains Terra. The wrapper pins Astra only for this newsletter. Hermes's `cron.script_timeout_seconds` is 1900; the child agent timeout is 1800 seconds. The previous config was backed up privately on the VPS.

The job's project directory is `~/.hermes/workspaces/grayyachts-newsletter`. Source-controlled copies of its Python wrapper and brief are under `scripts/hermes-newsletter/`. The complete Humanizer v3.0.0 skill and MIT license are copied from `src/lib/newsletter/vendor/`. Upstream: https://github.com/blader/humanizer. Original and edited JSON, factual-review notes, private agent logs and model usage reports are saved on the VPS.

Buyer and seller editions alternate. The brief requires a useful direct answer, natural headings, buyer/seller questions and evidence for factual claims. Research uses relevant brokerage pages and primary sources when necessary. It forbids invented prices, market trends, inventory, testimonials and first-person experiences. History and rejection feedback inform subsequent editions. Humanizer editing and a factual review precede submission; Connor remains the final editor. The server validates structure, length, source references, date and the agent's editorial attestation; it does not independently verify every claim.

## Review and publication

`POST /api/newsletter/draft` requires the private automation credential. It stores the original and edited article as pending and triggers Resend delivery to `connorgray41@gmail.com`. It cannot replace stored content for an existing slot. Cloudflare's hourly cron runs delivery retries only (`NEWSLETTER_AI_PROVIDER=hermes`); the Cloudflare AI binding was removed. The newsletter does not use the website's existing Anthropic key.

The email opens a private review page. GET never approves or rejects. A POST with an issue-specific HMAC token changes a pending draft exactly once. Approve publishes the stored article; reject keeps it private and saves feedback. No action emails subscribers. Public archive, article pages and sitemap select only published issues. Review pages have noindex and no-referrer metadata. Keep approval links private.

## Configuration and recovery

The transport/signing credential lives at `~/.config/grayyachts/newsletter-automation-secret` with mode 0600 on the local machine and VPS, and as the Worker secret `NEWSLETTER_AUTOMATION_SECRET`. It is not committed. Preserve it: rotation invalidates existing review links. ChatGPT account credentials stay on the VPS and were not copied.

Other Worker bindings: `NEWSLETTER_DB` (D1 database `grayyachts-newsletter`), `RESEND_API_KEY`, `NEWSLETTER_REVIEW_TO`, `NEWSLETTER_FROM`, and `NEWSLETTER_START_DATE`. Current sender is the site's existing Resend testing sender, `Gray Yachts <onboarding@resend.dev>`. A verified branded sender can be configured separately.

`node scripts/newsletter-ops.mjs status` reports recent drafts and provider delivery status. `node scripts/newsletter-ops.mjs run` retries pending delivery; generation remains in Hermes. `hermes cron list`, `hermes cron runs 4c4b201a5833`, and the private per-date agent logs show VPS health. `hermes cron run 4c4b201a5833` manually triggers the same due-date and duplicate checks. Inspect errors before resetting a date's `.attempts` file after three failed generations.

Email failure preserves the completed draft and is retried up to five times using an atomic lease and Resend idempotency key. After five attempts, inspect the D1 `error` before resetting attempts. A provider acceptance ID is not proof of inbox delivery; check the provider's last event. Unreviewed drafts remain private indefinitely.

Apply migrations with `wrangler d1 migrations apply grayyachts-newsletter --remote`. Deploy only with `npm run deploy`, including existing brochure and live-listing preservation checks. Never deploy an older checkout that omits these changes.

## Validation

Nine Vitest tests cover Pacific calendar/DST boundaries, token binding, unauthorized decisions, immutable approval/rejection, malformed articles, failed factual checks, email retries, Hermes draft deduplication, and no cloud AI calls in Hermes mode. Tests use actual in-memory SQLite (Node 22+). TypeScript, targeted ESLint, production build and Cloudflare deployment passed. Local Cloudflare/Playwright tests verified desktop and mobile layouts, draft exclusion from public archive and sitemap, invalid tokens, safe GET review links, explicit approval, rejection, replay protection and Article JSON-LD. Deployment preflight preserved all 16 live yacht listings and brochures.
