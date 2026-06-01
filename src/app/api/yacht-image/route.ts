import { NextRequest, NextResponse } from "next/server";
import { heroImageFor, providerStats } from "@/lib/scrape-providers";
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

  // Provider chain: direct → jina → firecrawl. Returns the URL of the
  // best image we could find, plus which backend served it.
  const lookup = await heroImageFor(listingUrl);
  if (!lookup) {
    return badRequest("No image found", 502);
  }

  // Pull the actual bytes from the (possibly signed/expiring) upstream
  // URL so we can re-host them under our stable URL. The `lookup.imageUrl`
  // came from attacker-controlled HTML (og:image, JSON-LD, etc.), so
  // we walk redirects manually and re-validate every hop against
  // private hosts — see safeFetchPublic.
  let imgRes: Response;
  try {
    imgRes = await safeFetchPublic(lookup.imageUrl, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
      headers: {
        // Some CDNs gate hot-linking on a Referer matching their host.
        // Sending the listing page as Referer is the friendliest hint.
        Referer: listingUrl,
        "User-Agent":
          "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.startsWith("Disallowed")) {
      return badRequest(`Rejected upstream URL: ${msg}`, 400);
    }
    return badRequest("Image fetch timeout", 504);
  }
  if (!imgRes.ok) {
    return badRequest(`Upstream image returned ${imgRes.status}`, 502);
  }

  const contentType = imgRes.headers.get("content-type") || "image/png";
  // Reject upstream responses that aren't actually images. This happens
  // when a fallback <img> URL points at an HTML page (some sites serve
  // a "hot-link not allowed" HTML page on 200) or when the extracted
  // src was actually a page link the regex picked up incorrectly.
  if (!/^image\//i.test(contentType)) {
    return badRequest(
      `Upstream returned non-image content-type: ${contentType}`,
      502
    );
  }

  const buf = await imgRes.arrayBuffer();

  const response = new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}, s-maxage=${CACHE_MAX_AGE_SECONDS}, immutable`,
      "X-Content-Type-Options": "nosniff",
      // Surface which provider served the image — useful for debugging
      // when something looks off in the Compare Yachts UI.
      "X-Image-Provider": lookup.provider,
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
