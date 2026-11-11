# Connor's Owner Photo Library

Part of the "fresh-photo-mix" hard rule (added 2026-11-11 — see `src/lib/newsletter/images.ts`,
`checkFreshMix`): every newsletter edition and every insights article must include at least one
of Connor's own photos (never used before) plus at least one freshly-imported licensed photo or
AI illustration. The lead photo is never AI-generated.

This doc covers how Connor gets his own photos into the system, and how the rule behaves while
that library is still being built out.

This is **not** a one-time setup. Steps 1-2 below are "the thing Connor does each time he wants to
add a batch of his own photos" — repeat them whenever the library needs topping up (see
[Adding more photos later](#adding-more-photos-later)).

## 1. Export a batch from the Mac

1. In Photos.app (or wherever the photos live), pick an album and export the **originals** —
   full-size, not the Mac-optimized/resized versions — to a local folder.
2. While the Mac is awake and on the network, copy that folder to the VPS inbox directory:

   ```
   /opt/grayyachts-automation/private/owner-photos/inbox
   ```

   Either of these works. Replace `connor@grayyachts-vps` with the actual VPS host.

   **rsync (preferred — resumable):**
   ```bash
   rsync -avP --progress \
     ~/Desktop/photo-export/ \
     connor@grayyachts-vps:/opt/grayyachts-automation/private/owner-photos/inbox/
   ```

   **scp:**
   ```bash
   scp -r ~/Desktop/photo-export/* \
     connor@grayyachts-vps:/opt/grayyachts-automation/private/owner-photos/inbox/
   ```

This is the **only** step in the whole feature that ever touches the Mac's data over the network.
Once the files have landed in the inbox directory, nothing else depends on the Mac being awake or
connected — not for this batch, and not again until Connor wants to bring in a future batch.

## 2. Run the ingest script (on the VPS)

Dry run first — shows what *would* be uploaded or skipped as a duplicate, without changing
anything:

```bash
node scripts/owner-photos/ingest.mjs \
  --inbox /opt/grayyachts-automation/private/owner-photos/inbox \
  --dry-run
```

What it does, per file (JPEG/PNG/HEIC/WEBP):

- Strips EXIF/GPS metadata **before anything leaves the VPS**. This happens as part of
  processing the image on the VPS itself — the original's location/camera metadata never reaches
  the server or any upload request.
- Resizes to fit within 2400x2400 (no upscaling).
- Computes a perceptual hash (dHash) and compares it against already-uploaded photos to skip
  near-duplicates, plus a sha256 to skip exact duplicates.

Once the dry run looks right, run it for real (same command, drop `--dry-run`):

```bash
node scripts/owner-photos/ingest.mjs \
  --inbox /opt/grayyachts-automation/private/owner-photos/inbox
```

The script prints a summary JSON when it finishes, with counts like:

```json
{ "uploaded": 12, "duplicate": 2, "near_duplicate": 1, "failed": 0 }
```

### `--done`

Defaults to `<inbox>/../done` (i.e. `/opt/grayyachts-automation/private/owner-photos/done`).
Originals that were **successfully uploaded or identified as duplicates** get moved here.
Anything that **failed** stays in the inbox so it's easy to find and retry.

What happens to the originals after a successful ingest is entirely Connor's call — the script
only *moves* them to `--done`, it never deletes them. He can delete the contents of the `done`
folder himself later, once he's confident the upload went through — purely at his discretion,
not something the script does automatically.

### Upload credential

The script authenticates its uploads using a secret read from (in order of preference):

- the `NEWSLETTER_AUTOMATION_SECRET` environment variable, or
- the file `$HOME/.config/grayyachts/newsletter-automation-secret`

The script never prints this value, and it is not reproduced here.

## 3. The rollout switch

The fresh-photo-mix rule lives in application code (`checkFreshMix` in
`src/lib/newsletter/images.ts`). It has two independent parts, and they roll out differently:

- **"Must include an owner photo"** — automatically downgraded from a hard rejection to a logged
  warning for as long as Connor's photo library has zero approved photos. This lets the
  newsletter/insights pipeline keep running before any of his photos have been ingested. As soon
  as one approved owner photo exists, this part of the rule becomes a hard requirement.
- **"Must include a freshly-licensed-or-generated photo"** and **"the lead photo is never
  AI-generated"** — enforced as hard requirements immediately, from day one, regardless of the
  state of the owner photo library.

### Emergency escape hatch

There's a separate Cloudflare Worker var/secret, `NEWSLETTER_FRESH_PHOTO_RULE=warn`, that
downgrades **all** parts of the rule to warnings, including the two that are normally enforced
immediately. This is an emergency-only override — use it if the rule is somehow blocking a
legitimate edition and needs to be relaxed while someone investigates, and remove it again once
the investigation is done. It is not meant to be left set.

## 4. D1 migration (not yet applied)

`migrations/newsletter/0007_owner_photos_fresh_rule.sql` adds:

- `newsletter_owner_photos` — Connor's private photo library (id = sha256, phash, dimensions,
  taken-on date, AI caption, approval flag).
- `insights_image_uses` — the insights-article side of the never-reuse ledger (mirrors the
  existing `newsletter_image_uses` table).
- An updated `newsletter_reserve_images` trigger that also checks the insights ledger, so a
  newsletter edition can't claim a photo an insights article already used, and vice versa.

**This migration has not been applied to the live (production) D1 database as of this writing.**
Applying it is a real schema change against production data and requires **Connor's explicit
yes before anyone runs it** — do not treat it as safe to just apply.

Project D1 binding/database (from `wrangler.jsonc`): binding `NEWSLETTER_DB`, database name
`grayyachts-newsletter`. Applying it would look like:

```bash
npx wrangler d1 migrations apply grayyachts-newsletter --remote
```

Confirm this is still the project's actual deploy convention before running it — and get
Connor's go-ahead first regardless.

## 5. Health check / low-water warning

`GET /api/newsletter/images` (bearer-authenticated, used internally by the Hermes automation)
reports `owner.unused` — the number of Connor's uploaded photos that haven't been used in any
newsletter edition or insights article yet.

When `owner.unused` drops below 10, the response includes a `warning` string. The Hermes job
wrapper (`scripts/hermes-newsletter/newsletter.py`):

- emails Connor an alert about it (once per run), and
- flags it in `preflight()` diagnostics.

That's the signal that it's time to export and ingest another batch (steps 1-2 above).

The threshold is `OWNER_LOW_WATER` in code — currently `10` in both
`src/lib/newsletter/owner-photos.ts` and mirrored in `scripts/hermes-newsletter/newsletter.py`.
Change both if it ever needs to move.

## Adding more photos later

Just repeat steps 1-2 with a new export/batch. Dedup is handled automatically:

- Exact re-uploads are caught by sha256 match → reported as `duplicate`.
- Near-identical shots (e.g. burst-mode variants) are caught by perceptual-hash (dHash) distance
  → reported as `near_duplicate`.

Either way, accidentally copying old photos into a new batch is harmless — they're skipped and
moved to `--done`, not re-uploaded.
