import { NextRequest, NextResponse } from "next/server";

/**
 * Durable yacht image proxy.
 *
 * The Compare Yachts feature stores listing URLs in localStorage and renders
 * a hero image. Originally we hot-linked the Firecrawl screenshot URL —
 * which is a Google Cloud Storage *signed* URL with an `Expires=` query
 * param. After it expires, every cached catalog entry shows a broken image
 * (and the UI falls back to a coloured gradient).
 *
 * This endpoint acts as a stable, never-expiring image URL keyed on the
 * yacht *listing* URL. On each cache miss we ask Firecrawl for a fresh
 * screenshot, fetch the bytes, and stream them back with a long
 * Cache-Control window so Cloudflare's edge cache (and the browser) hold on
 * to the image. Old localStorage entries with `imageUrl: null` heal on
 * next render because the frontend builds the proxy URL from `yacht.url`,
 * not from the stored `imageUrl`.
 */

const FIRECRAWL_TIMEOUT_MS = 30_000;
const IMAGE_FETCH_TIMEOUT_MS = 15_000;
// 7 days — listing photos rarely change, and a re-scrape is cheap if they do.
const CACHE_MAX_AGE_SECONDS = 60 * 60 * 24 * 7;

const GENERIC_OG_IMAGE_RE = /logo|icon|sprite|placeholder|default|share[-_]?image/i;

function badRequest(msg: string, status = 400): NextResponse {
  return NextResponse.json({ error: msg }, { status });
}

function isPrivateHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "localhost" ||
    h.endsWith(".local") ||
    /^127\./.test(h) ||
    /^10\./.test(h) ||
    /^192\.168\./.test(h) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(h) ||
    h === "169.254.169.254" ||
    h === "[::1]" ||
    h === "0.0.0.0"
  );
}

interface FirecrawlScreenshotResponse {
  success?: boolean;
  data?: {
    screenshot?: string;
    metadata?: { ogImage?: string };
  };
}

async function fetchScreenshotUrl(listingUrl: string, apiKey: string): Promise<string | null> {
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      url: listingUrl,
      // Just the screenshot — much faster/cheaper than the full extract pipeline
      // that /api/scrape-yacht runs.
      formats: ["screenshot"],
    }),
    signal: AbortSignal.timeout(FIRECRAWL_TIMEOUT_MS),
  });
  if (!res.ok) return null;
  const json = (await res.json()) as FirecrawlScreenshotResponse;
  const screenshot = json?.data?.screenshot;
  const ogImage = json?.data?.metadata?.ogImage;
  // Prefer the screenshot — it's reliably the listing page (often the hero
  // photo of *this* yacht). Fall back to og:image only when no screenshot
  // came back, and skip obvious generic share-images.
  if (screenshot) return screenshot;
  if (ogImage && !GENERIC_OG_IMAGE_RE.test(ogImage)) return ogImage;
  return null;
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

  // Cloudflare Workers edge cache. Same request URL = same cached response.
  // `caches.default` exists in the Workers runtime; on local dev (Node) it
  // may be absent — we just skip the cache layer there.
  const cache: Cache | undefined = (globalThis as unknown as { caches?: { default?: Cache } })
    .caches?.default;
  const cacheKey = new Request(request.url, { method: "GET" });

  if (cache) {
    const cached = await cache.match(cacheKey);
    if (cached) return cached;
  }

  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (!firecrawlKey) {
    return badRequest("Image service unavailable", 503);
  }

  let screenshotUrl: string | null = null;
  try {
    screenshotUrl = await fetchScreenshotUrl(listingUrl, firecrawlKey);
  } catch {
    return badRequest("Upstream screenshot timeout", 504);
  }
  if (!screenshotUrl) {
    return badRequest("No screenshot available", 502);
  }

  // Pull the actual bytes from the (signed, expiring) upstream URL so we can
  // re-host them under our stable URL.
  let imgRes: Response;
  try {
    imgRes = await fetch(screenshotUrl, {
      signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
    });
  } catch {
    return badRequest("Image fetch timeout", 504);
  }
  if (!imgRes.ok) {
    return badRequest(`Upstream image returned ${imgRes.status}`, 502);
  }

  const buf = await imgRes.arrayBuffer();
  const contentType = imgRes.headers.get("content-type") || "image/png";

  const response = new NextResponse(buf, {
    status: 200,
    headers: {
      "Content-Type": contentType,
      "Cache-Control": `public, max-age=${CACHE_MAX_AGE_SECONDS}, s-maxage=${CACHE_MAX_AGE_SECONDS}, immutable`,
      // Strip Set-Cookie etc. — none of that is meaningful for images.
      "X-Content-Type-Options": "nosniff",
    },
  });

  if (cache) {
    // Clone before returning so we can put a fresh body into the cache.
    try {
      await cache.put(cacheKey, response.clone());
    } catch {
      // Cache writes are best-effort; never fail the request because of a
      // cache hiccup.
    }
  }

  return response;
}
