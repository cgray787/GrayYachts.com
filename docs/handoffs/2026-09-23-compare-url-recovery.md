# Compare URL recovery — September 23, 2026

## Observed failure
The user's Lagoon URL returned HTTP 502 from production in 4.54 seconds. The existing provider returned access-denied content. Previously captured screenshots were accessible by saved-import UUID but were not recoverable when pasting the original URL. Failed URL imports kept unrelated old slot selections; empty selections also reverted to the first catalog entries on reload. Existing entries skipped fresh extraction even when they had no photo.

## Changes
- New requests clear only their target selection, preserving saved catalog entries. Independent error messages appear immediately under the URL form. Empty selections survive reload.
- Photo-less or unrecoverable imports run extraction again, preserving explicitly edited fields. URL matching uses canonical identity. Inputs disable while requests run; fetch has a 90-second deadline.
- On live extraction failure, API may load an exact matching operator-reviewed R2 capture with a verified stored photo. It identifies the result as `Saved capture`, includes capture date and warns price/availability may have changed. Public screenshot uploads cannot publish into this fallback namespace.
- `scripts/publish-reviewed-yacht-capture.ts <UUID>` publishes reviewed captures using machine-local Wrangler auth. Lagoon import `50eab366-840f-495d-b755-687604b7bbe1` was published. No other source URLs were populated in this turn.

## Evidence
- 93 Vitest checks, TypeScript and targeted ESLint passed.
- `scripts/check-compare-url-flow.ts`: browser regression for concurrent success/failure, preserved catalog, empty selection persistence and mobile width. Local requests simulated.
- Same script against production with `--live`: actual Lagoon URL/API/photo succeeded; second failure deliberately simulated. Screenshot `artifacts/catalog/url-flow/production.png` (machine-local).
- Guarded deploy preserved all 16 live listings/brochures. Deployment `dfc2c9ea-a7cb-45af-bc8f-9cd00f34a73c`; postdeploy checks passed.

## Still unresolved
Universal automatic screenshots/import for arbitrary blocked sites is NOT solved. Hosted Firecrawl attempts previously returned access denied, and no additional working hosted browser provider is connected. Screenshot uploads remain the general fallback. Full 2019 Squalt Marine URL was requested asynchronously but not received. Do not portray the dated Lagoon archive as a fresh successful YachtWorld scrape, or the simulated second failure as testing the user's actual second listing.
