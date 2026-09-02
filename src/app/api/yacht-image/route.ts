import { NextRequest, NextResponse } from "next/server";
import {
  heroImageFor,
  modelReferenceImageFor,
  providerStats,
} from "@/lib/scrape-providers";
import { assertPublicHttpUrl, isPrivateHost } from "@/lib/scrape-shared";

/**
 * Durable yacht image proxy.
 *
 * The Compare Yachts feature stores listing URLs in localStorage and
 * renders a hero image. This endpoint acts as a stable, never-expiring
 * image URL keyed on the yacht *listing* URL. It runs through the
 * scrape provider chain (direct fetch → Jina → Firecrawl), pulls the
 * actual bytes, and re-hosts them under our own URL with a long
 * Cache-Control window.
 *
 * Old localStorage entries with `imageUrl: null` heal on next render
 * because the frontend builds the proxy URL from `yacht.url`, not from
 * the stored `imageUrl`.
 *
 * Redundancy: see src/lib/scrape-providers.ts. We mirror the
 * GrayYachts Listing Intake agent's provider failover so this never
 * goes fully dark when one provider is out of credits.
 */

const IMAGE_FETCH_TIMEOUT_MS = 15_000;
// 7 days — listing photos rarely change, and a re-scrape is cheap if they do.
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

function badRequest(msg: string, status = 400): NextResponse {
  return NextResponse.json({ error: msg }, { status });
}

/**
 * This endpoint is the `src` of an <img>. A browser handed JSON there fires
 * `onError`, the component hides the tag, and the card renders as a bare
 * gradient — which is how a listing ends up with no picture at all. Every
 * outcome an ordinary visitor can reach therefore has to be image bytes.
 *
 * The placeholder is generated locally rather than fetched, so it cannot fail
 * for the same reasons the real photo just did, and it is deliberately styled
 * like the rest of the card so a missing photo reads as intentional.
 *
 * Cached for minutes, not the seven days a real photo gets: a hot-link block
 * or a timeout is usually transient, and caching the failure would keep the
 * photo missing long after the cause cleared.
 */
const FALLBACK_CACHE_SECONDS = 600;

function placeholderImage(reason: string): NextResponse {
  /* Wide and sparse on purpose. The card's hero slot is about 3.3:1 and the
     catalog thumbnail about 2.2:1, both filled with object-cover — a 4:3 image
     gets blown up and centre-cropped, which turned an earlier version of this
     into a giant line drawing with the caption sliced off. A 3:1 canvas with a
     small, centred mark survives the crop at either size. */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-label="Photo unavailable">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1a2e"/>
      <stop offset="100%" stop-color="#060a12"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#g)"/>
  <g fill="none" stroke="#C9A96E" stroke-opacity="0.45" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M556 176h88l-12 26h-64z"/>
    <path d="M600 176v-32"/>
    <path d="M600 148l22 22h-22"/>
    <path d="M560 214c7 5 14 5 21 0s14-5 21 0 14 5 21 0 14-5 21 0"/>
  </g>
  <text x="600" y="252" text-anchor="middle" fill="#8892A5"
        font-family="Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
        font-size="15" letter-spacing="1.5">Photo unavailable</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${FALLBACK_CACHE_SECONDS}, s-maxage=${FALLBACK_CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      // Why the real photo is missing, for debugging from the network tab.
      "X-Image-Fallback": reason.slice(0, 120),
    },
  });
}

/**
 * Fetch an attacker-influenced URL safely: reject non-HTTP(S) and
 * private/loopback/link-local hosts up front, then follow up to 4
 * redirects manually, re-running the same check on every hop. This
 * stops a malicious og:image pointing at 169.254.169.254 (AWS/GCE
 * metadata), `localhost`, or RFC1918 ranges via a chained 302.
 */
async function safeFetchPublic(
  rawUrl: string,
  init: RequestInit,
  maxRedirects = 4
): Promise<Response> {
  let current = rawUrl;
  for (let hop = 0; hop <= maxRedirects; hop++) {
    assertPublicHttpUrl(current);
    const res = await fetch(current, { ...init, redirect: "manual" });
    if (res.status < 300 || res.status >= 400) return res;
    const location = res.headers.get("location");
    if (!location) return res;
    current = new URL(location, current).toString();
  }
  throw new Error("Too many redirects");
}

export async function GET(request: NextRequest) {
  const listingUrl = request.nextUrl.searchParams.get("url");
  const exactImageUrl = request.nextUrl.searchParams.get("image");
  if (!listingUrl) return badRequest("Missing url parameter");

  let parsed: URL;
  try {
    parsed = new URL(listingUrl);
  } catch {
    return badRequest("Invalid URL");
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return badRequest("Invalid URL protocol");
  }
  if (isPrivateHost(parsed.hostname)) {
    return badRequest("Invalid URL");
  }

  // Cloudflare Workers edge cache. Same request URL = same cached
  // response. `caches.default` exists in the Workers runtime; on local
  // dev (Node) it may be absent — we just skip the cache layer there.
  const cache: Cache | undefined = (
    globalThis as unknown as { caches?: { default?: Cache } }
  ).caches?.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  // Prefer the exact gallery/og:image already extracted alongside the specs.
  // Only fall back to a fresh provider lookup when no exact image was stored.
  let lookup: { imageUrl: string; provider: string } | null = null;
  if (exactImageUrl) {
    try {
      const exact = new URL(exactImageUrl);
      if ((exact.protocol === "https:" || exact.protocol === "http:") && !isPrivateHost(exact.hostname)) {
        lookup = { imageUrl: exactImageUrl, provider: "scrape-exact" };
      }
    } catch {
      // Invalid exact image URL: continue into the provider lookup.
    }
  }
  if (!lookup) lookup = await heroImageFor(listingUrl);
  if (!lookup) {
    return placeholderImage("no image found on the listing page");
  }

  // Pull the actual bytes from each candidate. If an exact or page-derived
  // URL hot-links to HTML/403, retry with a clean model-reference image before
  // giving up to the branded placeholder.
  const candidates = [lookup];
  if (lookup.provider !== "serpapi-google-images") {
    const reference = await modelReferenceImageFor(listingUrl);
    if (reference) candidates.push(reference);
  }

  let imgRes: Response | null = null;
  let activeLookup = lookup;
  let failureReason = "no usable image bytes";
  for (const candidate of candidates) {
    try {
      const upstream = await safeFetchPublic(candidate.imageUrl, {
        signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        headers: {
          Referer: listingUrl,
          "User-Agent":
            "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        },
      });
      const type = upstream.headers.get("content-type") || "";
      if (upstream.ok && /^image\//i.test(type)) {
        imgRes = upstream;
        activeLookup = candidate;
        break;
      }
      failureReason = upstream.ok
        ? `upstream returned non-image content-type: ${type}`
        : `upstream image returned ${upstream.status}`;
    } catch (err) {
      failureReason = err instanceof Error ? err.message : String(err);
    }
  }
  if (!imgRes) return placeholderImage(failureReason);

  const contentType = imgRes.headers.get("content-type") || "image/png";

  const buf = await imgRes.arrayBuffer();

  const response = new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}, s-maxage=${CACHE_MAX_AGE_SECONDS}, immutable`,
      "X-Content-Type-Options": "nosniff",
      // Surface which provider served the image — useful for debugging
      // when something looks off in the Compare Yachts UI.
      "X-Image-Provider": activeLookup.provider,
      "X-Image-Provider-Stats": JSON.stringify(providerStats()),
    },
  });

  if (cache) {
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      // Cache writes are best-effort; never fail the request because of
      // a cache hiccup.
    }
  }

  return response;
}
