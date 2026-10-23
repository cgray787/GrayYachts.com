import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import staticAssetsIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/static-assets-incremental-cache";

// Build-time pages are read from Workers Static Assets (populated at deploy time).
// Dynamic APIs, authenticated pages and newsletters stay dynamic.
//
// Cache interception is OFF on purpose (audit W-01, 2026-10-23). With it on, the
// interceptor in @opennextjs/aws <= 4.1.5 answers every `Next-Router-Segment-Prefetch`
// request with the full-page RSC payload instead of the requested segment (its
// segment branch is gated on `!experimental.prefetchInlining`, which Next 16 defaults
// to an object). The Next 16 client never records the prefetch as satisfied and
// re-requests it forever: ~1,000 `?_rsc=` Worker requests per 10 s per open tab on
// live, 12,000+ in a local `wrangler dev` with the cache populated. Upstream fix:
// opennextjs/opennextjs-aws#1248 (aws 4.1.6, @opennextjs/cloudflare 1.20.7), which
// requires next >= 16.3.6. Re-enable only together with that upgrade, and re-check
// that `/_tree` prefetches return the ~700-byte segment with `x-nextjs-postponed: 2`.
export default defineCloudflareConfig({
  incrementalCache: staticAssetsIncrementalCache,
  enableCacheInterception: false,
});
