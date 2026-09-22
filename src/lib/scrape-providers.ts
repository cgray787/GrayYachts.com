import { photosFromHtml, normalizePhotoUrl } from "./yacht-photo-candidates";
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
import { GENERIC_IMAGE_RE, assertPublicHttpUrl } from "@/lib/scrape-shared";

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

// Process-lifetime circuit breaker. Keyed by provider name.
const dead = new Set<string>();
// What this worker actually used last — surfaced in response headers for
// debugging.
let lastUsed: string | null = null;

function isExhaustion(err: unknown): boolean {
  const m = String(err instanceof Error ? err.message : err).toLowerCase();
  return EXHAUSTION_MARKERS.some((k) => m.includes(k));
}

/** Pull the best hero image URL out of a chunk of HTML. */
export function heroFromHtml(html: string, baseUrl: string): string | null {
  return photosFromHtml(html, baseUrl)[0] ?? null;
}

/* ---------------- direct fetch ---------------- */

async function tryDirectFetch(
  url: string,
  timeoutMs: number
): Promise<string | null> {
  assertPublicHttpUrl(url);
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
    body: JSON.stringify({ url, formats: ["html"] }),
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
    | "firecrawl-og";
}

/**
 * Find a hero image URL for a yacht listing. Tries the cheap providers
 * first, then listing metadata from Firecrawl. Never use page screenshots.
 * Returns null if every provider fails.
 */
export async function heroImageFor(
  listingUrl: string,
  opts: { directTimeoutMs?: number; jinaTimeoutMs?: number; firecrawlTimeoutMs?: number; accept?: (url: string) => Promise<boolean> } = {}
): Promise<HeroLookup | null> {
  const directTimeout = opts.directTimeoutMs ?? 8_000;
  const jinaTimeout = opts.jinaTimeoutMs ?? 20_000;
  const firecrawlTimeout = opts.firecrawlTimeoutMs ?? 30_000;

  // 1. Direct HTML fetch
  if (!dead.has("direct")) {
    try {
      const html = await tryDirectFetch(listingUrl, directTimeout);
      let hero: string | undefined;
      for (const candidate of photosFromHtml(html ?? '', listingUrl)) {
        if (!opts.accept || await opts.accept(candidate)) { hero = candidate; break; }
      }
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
      let hero: string | undefined;
      for (const candidate of photosFromHtml(html ?? '', listingUrl)) {
        if (!opts.accept || await opts.accept(candidate)) { hero = candidate; break; }
      }
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
      if (hero && (!opts.accept || await opts.accept(hero))) {
        lastUsed = "jina-markdown";
        return { imageUrl: hero, provider: "jina-markdown" };
      }
    } catch (err) {
      if (isExhaustion(err)) dead.add("jina");
    }
  }

  // 4. Firecrawl listing metadata. Screenshots are never yacht photos.
  if (!dead.has("firecrawl")) {
    try {
      const fc = await tryFirecrawl(listingUrl, firecrawlTimeout);
      const candidate = normalizePhotoUrl(fc?.ogImage, listingUrl);
      if (candidate && (!opts.accept || await opts.accept(candidate))) {
        lastUsed = "firecrawl-og";
        return { imageUrl: candidate, provider: "firecrawl-og" };
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
