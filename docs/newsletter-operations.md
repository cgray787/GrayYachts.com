# Brokerage newsletter operations

GrayYachts.com publishes approved brokerage newsletters at `/newsletter` and `/newsletter/<slug>`. The homepage, navigation, and footer link to the section. New drafts remain private.

## Schedule and review

Cloudflare calls `newsletter-worker.ts` hourly. `scheduleSlot` selects every second Pacific calendar day starting September 8, 2026, at or after 9am America/Los_Angeles. This preserves the interval across month boundaries and daylight-saving changes. Hourly invocations on the due day allow retries; a unique slot and atomic database lease prevent duplicate runs. Five attempts per slot are allowed. No local computer is required.

Buyer and seller editions alternate. The generator uses the brokerage brief and evergreen advice; it does not currently collect current market statistics or sold comparables. Topic history and rejection feedback inform subsequent editions. Add sourced market research before introducing numerical market reports.

Each edition receives a writing pass, the complete Humanizer v3.0.0 editing pass, structured-content validation, and an AI factual check against the brief and original. The latter is an editorial aid; Connor still reviews the article. Original and edited JSON are saved. Humanizer is vendored from https://github.com/blader/humanizer under MIT, with the original skill and license in `src/lib/newsletter/vendor`. `humanizer.ts` is its serialized runtime copy.

Resend emails `NEWSLETTER_REVIEW_TO` a private link and article excerpt/body. The link opens a review page; GET never approves or rejects. A POST carrying an issue-specific HMAC token can change a pending draft exactly once. Approve publishes the exact stored article; reject keeps it private and saves notes. No action emails subscribers. The token remains valid for viewing that issue; repeat decisions cannot alter a reviewed issue. Keep review emails private.

## Configuration

The existing website Worker uses its existing `ANTHROPIC_API_KEY` and `RESEND_API_KEY`. Added bindings are `NEWSLETTER_DB` (D1), `NEWSLETTER_AUTOMATION_SECRET`, `NEWSLETTER_REVIEW_TO`, `NEWSLETTER_FROM`, and `NEWSLETTER_START_DATE`.

`node scripts/newsletter-ops.mjs configure` creates a signing credential under `~/.config/grayyachts/` with mode 0600 and uploads it to the Worker. It never prints the credential. Preserve the file: rotating it invalidates old review links. `node scripts/newsletter-ops.mjs run` requests the currently due issue through the authenticated endpoint. It does not bypass the due-day or duplicate checks.

Apply `migrations/newsletter/0001_newsletter.sql` with `wrangler d1 migrations apply grayyachts-newsletter --remote`. Deploy only through `npm run deploy`, which preserves the project's preflight checks. The base for this change is `feat/home-hero-megayacht` (ea8cbb8), including the current home hero and all ancestors of the local `origin/main`. Changes are isolated in `.worktrees/brokerage-newsletter`.

## Monitoring and recovery

Inspect Cloudflare cron invocation logs and D1 issue records (`slot,status,attempts,email_sent_at,email_id,error`). Do not include the signing secret or review tokens in logs. A successful email API response means the provider accepted the email; confirm delivery in Resend or the recipient inbox.

Model/schema/factual-check failures leave a failed row and preserve the error; email failure leaves the completed pending draft, so retries do not regenerate it. Resend idempotency keys prevent duplicates on delivery retries within its retention window. After five failed attempts or the end of the due day, inspect the recorded error before manually resetting attempts/retrying. Unreviewed drafts stay private indefinitely.

Public pages and the newsletter sitemap query only `published` rows. Review pages use noindex and no-referrer metadata. No subscriber import or send automation is included.

## Validation

`vitest run src/lib/newsletter/core.test.ts` exercises calendar boundaries, DST, token binding, unauthorized decisions, rejected-draft replay, and single-publication state changes against an actual in-memory SQLite database. Use Node 22+ for these tests. Run TypeScript, targeted ESLint, the production build, and Cloudflare preview checks before deployment. Verify desktop/mobile layouts, draft exclusion from archive/sitemap, and approve/reject behavior with local fixtures.
