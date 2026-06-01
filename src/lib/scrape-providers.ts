/**
 * Scrape provider chain with auto-failover, mirrored from the
 * GrayYachts Listing Intake agent (`tools/comps/providers.py`).
 *
 * Each operation (hero-image lookup, HTML fetch) tries a sequence of
 * backends and falls back automatically:
 *
 *   image:  direct-fetch -> jina -> firecrawl
 *
 * Why this order? Direct fetch + Jina cover the common case (og:image is
 * a `<meta>` tag — Jina returns the raw HTML, no JS render or screenshot
 * needed) for ZERO marginal cost. Firecrawl is reserved as the heaviest
 * fallback because its credits are paid + limited.
 *
 * Circuit breaker: a provider that errors with a "402 / out of credits /
 * quota exceeded" signal is suppressed for the rest of the worker
 * lifetime (in-memory, per-isolate) so we don't re-burn time on a dead
 * provider for every listing in a session. Workers recycle isolates
 * often enough that recovery is automatic.
 */
import { GENERIC_IMAGE_RE } from "@/lib/scrape-shared";

const EXHAUSTION_MARKERS = [
  "402",
  "payment required",
  "insufficient credit",
  "out of credits",
  "run out of credit",
  "no credits",
  "credit balance",
  "quota",
  "exceeded your",
  "upgrade your plan",
  "out of tokens",
  "token limit",
];

const BROWSER_HEADERS: HeadersInit = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
    "(KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

const OG_IMAGE_RE =
  /<meta[^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["'][^>]+content=["']([^"']+)["']|<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["'](?:og:image(?::secure_url)?|twitter:image(?::src)?)["']/i;

const JSONLD_RE =
  /<script[^>]+application\/ld\+json[^>]*>([\s\S]*?)<\/script>/gi;

const IMG_RE =
  /<img[^>]+(?:data-src|data-original|srcset|src)=["']([^"']+)["']/gi;

// Process-lifetime circuit breaker. Keyed by provider name.
const dead = new Set<string>();
// What this worker actually used last — surfaced in response headers for
// debugging.
let lastUsed: string | null = null;

function isExhaustion(err: unknown): boolean {
  const m = String(err instanceof Error ? err.message : err).toLowerCase();
  return EXHAUSTION_MARKERS.some((k) => m.includes(k));
}

function pickJsonLdImage(node: unknown): string | null {
  if (!node) return null;
  if (typeof node === "string") return node;
  if (Array.isArray(node)) {
    for (const item of node) {
      const out = pickJsonLdImage(item);
      if (out) return out;
    }
    return null;
  }
  if (typeof node === "object") {
    const obj = node as Record<string, unknown>;
    if (typeof obj.image === "string") return obj.image;
    if (typeof obj.image === "object" && obj.image) {
      const out = pickJsonLdImage(obj.image);
      if (out) return out;
    }
    if (typeof obj.url === "string") return obj.url;
    if (typeof obj.contentUrl === "string") return obj.contentUrl;
    for (const v of Object.values(obj)) {
      const out = pickJsonLdImage(v);
      if (out) return out;
    }
  }
  return null;
}

/** Pull the best hero image URL out of a chunk of HTML. */
function heroFromHtml(html: string, baseUrl: string): string | null {
  if (!html) return null;
  // 1. og:image / twitter:image — the canonical share photo.
  const og = OG_IMAGE_RE.exec(html);
  const ogUrl = og?.[1] || og?.[2];
  if (ogUrl && !GENERIC_IMAGE_RE.test(ogUrl)) {
    return absolutize(ogUrl, baseUrl);
  }
  // 2. JSON-LD `image` field — most listing sites embed this.
  JSONLD_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = JSONLD_RE.exec(html))) {
    try {
      const parsed = JSON.parse(match[1].trim());
      const candidate = pickJsonLdImage(parsed);
      if (candidate && !GENERIC_IMAGE_RE.test(candidate)) {
        return absolutize(candidate, baseUrl);
      }
    } catch {
      // ignore malformed JSON-LD blocks
    }
  }
  // 3. First non-asset <img>. Lazy data-src takes precedence over src.
  IMG_RE.lastIndex = 0;
  let imgMatch: RegExpExecArray | null;
  while ((imgMatch = IMG_RE.exec(html))) {
    const raw = imgMatch[1];
    if (!raw || GENERIC_IMAGE_RE.test(raw)) continue;
    // srcset format: "url 1x, url2 2x" — pick the first URL.
    const url = raw.split(/[,\s]/)[0];
    if (url && /^https?:|^\/\//.test(url) && !GENERIC_IMAGE_RE.test(url)) {
      return absolutize(url, baseUrl);
    }
  }
  // 4. Fall back to ogUrl even if it looked generic — better than nothing.
  if (ogUrl) return absolutize(ogUrl, baseUrl);
  return null;
}

function absolutize(url: string, baseUrl: string): string {
  if (url.startsWith("//")) return "https:" + url;
  if (url.startsWith("http://") || url.startsWith("https://")) return url;
  try {
    return new URL(url, baseUrl).toString();
  } catch {
    return url;
  }
}

/* ---------------- direct fetch ---------------- */

async function tryDirectFetch(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  // Cloudflare extends RequestInit with a `cf` field; the standard
  // TypeScript lib types don't know about it. Cast to a permissive
  // shape so we keep the per-request cache override locally.
  const init = {
    headers: BROWSER_HEADERS,
    signal: AbortSignal.timeout(timeoutMs),
    cf: { cacheTtl: 0 },
  } as RequestInit;
  const res = await fetch(url, init);
  if (!res.ok) {
    // Treat 403/429 like quota — escalate to next provider.
    if (res.status === 403 || res.status === 429) {
      throw new Error(`direct-fetch HTTP ${res.status}`);
    }
    return null;
  }
  return await res.text();
}

/* ---------------- Jina Reader ---------------- */

async function tryJinaHtml(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  const headers: Record<string, string> = {
    Accept: "text/html",
    "X-Return-Format": "html",
  };
  const key = process.env.JINA_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 402 || res.status === 429) {
    throw new Error(`jina HTTP ${res.status} (quota)`);
  }
  if (!res.ok) return null;
  return await res.text();
}

interface JinaMarkdownResponse {
  code?: number;
  data?: {
    title?: string;
    content?: string;
    images?: Record<string, string>;
  };
}

/**
 * Jina Reader in default markdown mode — returns rendered article text
 * with `![alt](url)` image links. This mode SUCCEEDS on Cloudflare-
 * protected sites (YachtWorld/boats.com) where HTML mode hits the
 * anti-bot challenge. Markdown drops `<meta>` tags so we extract the
 * first non-asset inline image from the rendered content.
 */
async function tryJinaMarkdown(
  url: string,
  timeoutMs: number
): Promise<JinaMarkdownResponse | null> {
  const headers: Record<string, string> = {
    Accept: "application/json",
  };
  const key = process.env.JINA_API_KEY;
  if (key) headers.Authorization = `Bearer ${key}`;
  const res = await fetch(`https://r.jina.ai/${url}`, {
    headers,
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 402 || res.status === 429) {
    throw new Error(`jina HTTP ${res.status} (quota)`);
  }
  if (!res.ok) return null;
  return (await res.json()) as JinaMarkdownResponse;
}

const MD_IMAGE_RE = /!\[[^\]]*\]\((https?:\/\/[^)\s]+)\)/gi;

function firstListingImageFromMarkdown(md: string): string | null {
  if (!md) return null;
  MD_IMAGE_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MD_IMAGE_RE.exec(md))) {
    const u = m[1];
    if (!u) continue;
    if (GENERIC_IMAGE_RE.test(u)) continue;
    // Skip flags/SVG icons that slip past GENERIC_IMAGE_RE
    if (/\/flags?\//i.test(u) || /\.svg(\?|$)/i.test(u)) continue;
    return u;
  }
  return null;
}

/* ---------------- Firecrawl screenshot ---------------- */

interface FirecrawlScreenshotResponse {
  success?: boolean;
  data?: {
    screenshot?: string;
    metadata?: { ogImage?: string };
  };
  error?: string;
}

async function tryFirecrawl(
  url: string,
  timeoutMs: number
): Promise<{ ogImage: string | null; screenshot: string | null } | null> {
  const key = process.env.FIRECRAWL_API_KEY;
  if (!key) return null;
  const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${key}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ url, formats: ["screenshot"] }),
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (res.status === 402) {
    throw new Error("firecrawl 402 insufficient credits");
  }
  if (!res.ok) {
    // Read body so circuit-breaker can recognise quota strings.
    let body = "";
    try {
      body = await res.text();
    } catch {
      /* ignore */
    }
    if (isExhaustion(body)) {
      throw new Error(`firecrawl ${res.status}: ${body.slice(0, 200)}`);
    }
    return null;
  }
  const json = (await res.json()) as FirecrawlScreenshotResponse;
  if (json.error && isExhaustion(json.error)) {
    throw new Error(`firecrawl error: ${json.error}`);
  }
  return {
    ogImage: json.data?.metadata?.ogImage ?? null,
    screenshot: json.data?.screenshot ?? null,
  };
}

/* ---------------- public: heroImageFor() ---------------- */

export interface HeroLookup {
  imageUrl: string;
  provider:
    | "direct"
    | "jina-html"
    | "jina-markdown"
    | "firecrawl-og"
    | "firecrawl-screenshot";
}

/**
 * Find a hero image URL for a yacht listing. Tries the cheap providers
 * first, falls back to Firecrawl screenshot only as a last resort.
 * Returns null if every provider fails.
 */
export async function heroImageFor(
  listingUrl: string,
  opts: { directTimeoutMs?: number; jinaTimeoutMs?: number; firecrawlTimeoutMs?: number } = {}
): Promise<HeroLookup | null> {
  const directTimeout = opts.directTimeoutMs ?? 8_000;
  const jinaTimeout = opts.jinaTimeoutMs ?? 20_000;
  const firecrawlTimeout = opts.firecrawlTimeoutMs ?? 30_000;

  // 1. Direct HTML fetch
  if (!dead.has("direct")) {
    try {
      const html = await tryDirectFetch(listingUrl, directTimeout);
      const hero = html ? heroFromHtml(html, listingUrl) : null;
      if (hero) {
        lastUsed = "direct";
        return { imageUrl: hero, provider: "direct" };
      }
    } catch (err) {
      if (isExhaustion(err)) dead.add("direct");
      // else: fall through to next provider
    }
  }

  // 2. Jina Reader (HTML mode) — defeats anti-bot on most sites and
  //    preserves <meta> tags so og:image still works.
  if (!dead.has("jina")) {
    try {
      const html = await tryJinaHtml(listingUrl, jinaTimeout);
      const hero = html ? heroFromHtml(html, listingUrl) : null;
      if (hero) {
        lastUsed = "jina-html";
        return { imageUrl: hero, provider: "jina-html" };
      }
    } catch (err) {
      if (isExhaustion(err)) dead.add("jina");
    }
  }

  // 3. Jina Reader (markdown mode) — bypasses Cloudflare anti-bot pages
  //    that even Jina HTML mode gets challenged on (verified with
  //    YachtWorld). Markdown drops <meta og:image> but we extract the
  //    first non-asset image from the rendered content.
  if (!dead.has("jina")) {
    try {
      const r = await tryJinaMarkdown(listingUrl, jinaTimeout);
      const hero = r?.data?.content
        ? firstListingImageFromMarkdown(r.data.content)
        : null;
      if (hero) {
        lastUsed = "jina-markdown";
        return { imageUrl: hero, provider: "jina-markdown" };
      }
    } catch (err) {
      if (isExhaustion(err)) dead.add("jina");
    }
  }

  // 3. Firecrawl — paid; last resort. Hands back either og:image or a
  // full-page screenshot URL.
  if (!dead.has("firecrawl")) {
    try {
      const fc = await tryFirecrawl(listingUrl, firecrawlTimeout);
      if (fc?.ogImage && !GENERIC_IMAGE_RE.test(fc.ogImage)) {
        lastUsed = "firecrawl-og";
        return { imageUrl: fc.ogImage, provider: "firecrawl-og" };
      }
      if (fc?.screenshot) {
        lastUsed = "firecrawl-screenshot";
        return { imageUrl: fc.screenshot, provider: "firecrawl-screenshot" };
      }
    } catch (err) {
      if (isExhaustion(err)) dead.add("firecrawl");
    }
  }

  return null;
}

export function providerStats(): { lastUsed: string | null; dead: string[] } {
  return { lastUsed, dead: [...dead] };
}
