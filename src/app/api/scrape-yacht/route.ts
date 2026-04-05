import { NextRequest, NextResponse } from "next/server";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface ScrapedYacht {
  name: string | null;
  builder: string | null;
  model: string | null;
  type: string | null;
  year: number | null;
  price: string | null;
  priceNum: number | null;
  lengthFt: number | null;
  lengthM: number | null;
  beamFt: number | null;
  beamM: number | null;
  maxSpeed: number | null;
  cabins: number | null;
  guests: number | null;
  range: number | null;
  engine: string | null;
  engineHours: number | null;
  location: string | null;
  imageUrl: string | null;
  source: string;
  url: string;
}

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function firstMatch(html: string, ...patterns: RegExp[]): string | null {
  for (const p of patterns) {
    const m = html.match(p);
    if (m?.[1]?.trim()) return m[1].trim();
  }
  return null;
}

function parseNumber(str: string | null): number | null {
  if (!str) return null;
  const cleaned = str.replace(/[,$\s]/g, "");
  const n = parseFloat(cleaned);
  return isNaN(n) ? null : n;
}

function ftToM(ft: number): number {
  return Math.round(ft * 0.3048 * 10) / 10;
}

function mToFt(m: number): number {
  return Math.round(m * 3.281 * 10) / 10;
}

function detectSource(url: string): string {
  const l = url.toLowerCase();
  if (l.includes("yachtworld")) return "YachtWorld";
  if (l.includes("boattrader")) return "BoatTrader";
  if (l.includes("boats.com")) return "boats.com";
  if (l.includes("denison")) return "Denison";
  if (l.includes("yacht.de") || l.includes("yachtall")) return "Yacht.de";
  if (l.includes("rightboat")) return "RightBoat";
  if (l.includes("theyachtmarket")) return "TheYachtMarket";
  return "Listing";
}

/* ------------------------------------------------------------------ */
/*  JSON-LD structured data extractor                                  */
/* ------------------------------------------------------------------ */

function extractJsonLd(html: string): Record<string, unknown> | null {
  const pattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    try {
      const data = JSON.parse(match[1]);
      // Could be array or single object
      const items = Array.isArray(data) ? data : [data];
      for (const item of items) {
        const t = (item["@type"] || "").toLowerCase();
        if (
          t.includes("product") ||
          t.includes("vehicle") ||
          t.includes("boat") ||
          t.includes("offer")
        ) {
          return item as Record<string, unknown>;
        }
      }
      // If no specific type, return first with a name
      for (const item of items) {
        if (item.name) return item as Record<string, unknown>;
      }
    } catch {
      // invalid JSON, skip
    }
  }
  return null;
}

/* ------------------------------------------------------------------ */
/*  Open Graph extractor                                               */
/* ------------------------------------------------------------------ */

function extractOg(html: string): Record<string, string> {
  const og: Record<string, string> = {};
  const pattern = /<meta[^>]*property=["'](og:[^"']+)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;
  let m;
  while ((m = pattern.exec(html)) !== null) {
    og[m[1]] = m[2];
  }
  // Also try reversed attribute order
  const pattern2 = /<meta[^>]*content=["']([^"']*)["'][^>]*property=["'](og:[^"']+)["'][^>]*\/?>/gi;
  while ((m = pattern2.exec(html)) !== null) {
    og[m[2]] = m[1];
  }
  // Twitter card meta tags (name= instead of property=)
  const twitterPattern = /<meta[^>]*name=["'](twitter:[^"']+)["'][^>]*content=["']([^"']*)["'][^>]*\/?>/gi;
  while ((m = twitterPattern.exec(html)) !== null) {
    og[m[1]] = m[2];
  }
  const twitterPattern2 = /<meta[^>]*content=["']([^"']*)["'][^>]*name=["'](twitter:[^"']+)["'][^>]*\/?>/gi;
  while ((m = twitterPattern2.exec(html)) !== null) {
    og[m[2]] = m[1];
  }
  return og;
}

/* ------------------------------------------------------------------ */
/*  HTML meta / title extractor                                        */
/* ------------------------------------------------------------------ */

function extractTitle(html: string): string | null {
  const m = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return m?.[1]?.trim()?.replace(/\s+/g, " ") ?? null;
}

/* ------------------------------------------------------------------ */
/*  Price extractor                                                    */
/* ------------------------------------------------------------------ */

function extractPrice(html: string, jsonLd: Record<string, unknown> | null): { price: string | null; priceNum: number | null } {
  // Try JSON-LD first
  if (jsonLd) {
    const offers = jsonLd.offers as Record<string, unknown> | undefined;
    if (offers?.price) {
      const num = parseNumber(String(offers.price));
      if (num && num > 1000) {
        return { price: `$${num.toLocaleString()}`, priceNum: num };
      }
    }
    if (jsonLd.price) {
      const num = parseNumber(String(jsonLd.price));
      if (num && num > 1000) {
        return { price: `$${num.toLocaleString()}`, priceNum: num };
      }
    }
  }

  // Try common HTML patterns
  const pricePatterns = [
    /class=["'][^"']*price[^"']*["'][^>]*>\s*\$?([\d,]+)/i,
    /itemprop=["']price["'][^>]*content=["']([\d,.]+)["']/i,
    /(?:asking|list|sale)\s*price[^$]*\$([\d,]+)/i,
    /data-price=["']([\d,.]+)["']/i,
    />\s*(?:USD\s*)?\$([\d,]{6,})/,
    /(?:€|EUR)\s*([\d,. ]+)/i,
  ];

  for (const p of pricePatterns) {
    const m = html.match(p);
    if (m?.[1]) {
      const num = parseNumber(m[1]);
      if (num && num > 10000) {
        return { price: `$${num.toLocaleString()}`, priceNum: num };
      }
    }
  }

  return { price: null, priceNum: null };
}

/* ------------------------------------------------------------------ */
/*  Spec extractors                                                    */
/* ------------------------------------------------------------------ */

function extractLength(html: string, jsonLd: Record<string, unknown> | null): { ft: number | null; m: number | null } {
  // JSON-LD
  if (jsonLd) {
    for (const key of ["length", "vehicleLength", "boatLength"]) {
      const val = jsonLd[key];
      if (val) {
        const num = parseNumber(String(typeof val === "object" ? (val as Record<string, unknown>).value : val));
        if (num) {
          if (num > 100) return { ft: num, m: ftToM(num) }; // likely feet
          return { ft: mToFt(num), m: num }; // likely meters
        }
      }
    }
  }

  // HTML patterns
  const ftMatch = firstMatch(html,
    /(?:length|loa)[^>]*?(\d+(?:\.\d+)?)\s*(?:'|ft|feet)/i,
    /(\d+(?:\.\d+)?)\s*(?:'|ft|feet)\s*(?:length|loa)?/i,
    />(\d{2,3})\s*(?:'|ft|feet)</i,
  );
  if (ftMatch) {
    const ft = parseNumber(ftMatch);
    if (ft && ft > 10 && ft < 500) return { ft, m: ftToM(ft) };
  }

  const mMatch = firstMatch(html,
    /(?:length|loa)[^>]*?(\d+(?:\.\d+)?)\s*m(?:eter|etre)?s?\b/i,
    /(\d+(?:\.\d+)?)\s*m(?:eter|etre)?s?\s*(?:length|loa)/i,
  );
  if (mMatch) {
    const m = parseNumber(mMatch);
    if (m && m > 3 && m < 150) return { ft: mToFt(m), m };
  }

  return { ft: null, m: null };
}

function extractBeam(html: string): { ft: number | null; m: number | null } {
  const ftMatch = firstMatch(html,
    /beam[^>]*?(\d+(?:\.\d+)?)\s*(?:'|ft|feet)/i,
    /(?:beam|width)\D{0,30}(\d+(?:\.\d+)?)\s*(?:'|ft)/i,
  );
  if (ftMatch) {
    const ft = parseNumber(ftMatch);
    if (ft && ft > 3 && ft < 80) return { ft, m: ftToM(ft) };
  }

  const mMatch = firstMatch(html,
    /beam[^>]*?(\d+(?:\.\d+)?)\s*m(?:eter)?/i,
    /(?:beam|width)\D{0,30}(\d+(?:\.\d+)?)\s*m\b/i,
  );
  if (mMatch) {
    const m = parseNumber(mMatch);
    if (m && m > 1 && m < 25) return { ft: mToFt(m), m };
  }

  return { ft: null, m: null };
}

function extractSpeed(html: string): number | null {
  const s = firstMatch(html,
    /(?:max|top)\s*speed[^>]*?(\d+(?:\.\d+)?)\s*(?:kn|knots|kts)/i,
    /(\d+(?:\.\d+)?)\s*(?:kn|knots|kts)\s*(?:max|top)/i,
    /(?:cruising|cruise)\s*speed[^>]*?(\d+(?:\.\d+)?)\s*(?:kn|knots|kts)/i,
    /speed[^>]*?(\d+(?:\.\d+)?)\s*(?:kn|knots|kts)/i,
  );
  const n = parseNumber(s);
  return (n && n > 2 && n < 100) ? n : null;
}

function extractCabins(html: string): number | null {
  const s = firstMatch(html,
    /(\d+)\s*(?:cabin|stateroom|berth)/i,
    /cabin[s]?\s*[:\-]?\s*(\d+)/i,
    /stateroom[s]?\s*[:\-]?\s*(\d+)/i,
  );
  const n = parseNumber(s);
  return (n && n >= 1 && n <= 30) ? n : null;
}

function extractGuests(html: string): number | null {
  const s = firstMatch(html,
    /(\d+)\s*(?:guest|passenger|sleep)/i,
    /(?:guest|passenger|sleep)[s]?\s*[:\-]?\s*(\d+)/i,
    /(?:accommodat|sleep)[es]*\s*(?:up\s*to\s*)?(\d+)/i,
  );
  const n = parseNumber(s);
  return (n && n >= 1 && n <= 50) ? n : null;
}

function extractRange(html: string): number | null {
  const s = firstMatch(html,
    /range[^>]*?(\d[\d,]*)\s*(?:nm|nmi|nautical)/i,
    /(\d[\d,]*)\s*(?:nm|nmi|nautical\s*mile)/i,
  );
  const n = parseNumber(s);
  return (n && n >= 50 && n <= 20000) ? n : null;
}

function extractEngine(html: string): string | null {
  const patterns = [
    /(?:engine|power|propulsion)[^<]{0,10}[:\-]\s*([^<]{5,80})/i,
    /(?:caterpillar|cummins|mtu|yanmar|volvo\s*penta|man|detroit|john\s*deere|mercury|honda|suzuki|yamaha|mercruiser)[^<]{0,60}/i,
  ];
  for (const p of patterns) {
    const m = html.match(p);
    if (m) {
      const val = (m[1] || m[0]).trim().replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
      if (val.length > 4 && val.length < 100) return val;
    }
  }
  return null;
}

function extractEngineHours(html: string): number | null {
  const s = firstMatch(html,
    /(?:engine\s*)?hours?[^>]*?(\d[\d,]*)\s*(?:hr|hour)?/i,
    /(\d[\d,]*)\s*(?:hr|hours?)\b/i,
    /hours?\s*[:\-]?\s*(\d[\d,]*)/i,
  );
  const n = parseNumber(s);
  return (n && n >= 1 && n <= 50000) ? n : null;
}

function extractYear(html: string, jsonLd: Record<string, unknown> | null): number | null {
  if (jsonLd) {
    for (const key of ["modelYear", "productionDate", "year"]) {
      const val = jsonLd[key];
      if (val) {
        const n = parseNumber(String(val).slice(0, 4));
        if (n && n >= 1950 && n <= new Date().getFullYear() + 2) return n;
      }
    }
  }

  const s = firstMatch(html,
    /(?:year|model\s*year)[^>]*?(\d{4})/i,
    /(?:built|launched)\s*(?:in)?\s*(\d{4})/i,
  );
  const n = parseNumber(s);
  return (n && n >= 1950 && n <= new Date().getFullYear() + 2) ? n : null;
}

function extractLocation(html: string, jsonLd: Record<string, unknown> | null): string | null {
  if (jsonLd) {
    const loc = jsonLd.location || jsonLd.availableAtOrFrom;
    if (loc) {
      if (typeof loc === "string") return loc;
      if (typeof loc === "object") {
        const place = loc as Record<string, unknown>;
        const addr = place.address;
        if (typeof addr === "string") return addr;
        if (typeof addr === "object") {
          const a = addr as Record<string, string>;
          return [a.addressLocality, a.addressRegion, a.addressCountry]
            .filter(Boolean).join(", ");
        }
        if (place.name) return String(place.name);
      }
    }
  }

  const s = firstMatch(html,
    /(?:location|located|port)[^>]*?[:\-]\s*([A-Z][^<,]{2,40}(?:,\s*[A-Z]{2})?)/i,
  );
  return s;
}

function extractImage(html: string, og: Record<string, string>, jsonLd: Record<string, unknown> | null): string | null {
  // OG image first
  if (og["og:image"]) return og["og:image"];

  // Twitter card image
  if (og["twitter:image"]) return og["twitter:image"];

  // JSON-LD
  if (jsonLd?.image) {
    const img = jsonLd.image;
    if (typeof img === "string") return img;
    if (Array.isArray(img) && img[0]) return typeof img[0] === "string" ? img[0] : (img[0] as Record<string, string>).url;
    if (typeof img === "object") return (img as Record<string, string>).url;
  }

  // HTML meta fallbacks
  const metaImg = html.match(/<meta[^>]+(?:name|property)=["'](?:image|thumbnail)["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:image|thumbnail)["']/i);
  if (metaImg?.[1]) return metaImg[1];

  // Common gallery/hero image patterns on listing sites
  const heroImg = html.match(/<img[^>]+class=["'][^"']*(?:hero|gallery|listing|main|primary|featured)[^"']*["'][^>]+src=["']([^"']+)["']/i)
    ?? html.match(/<img[^>]+src=["']([^"']+)["'][^>]+class=["'][^"']*(?:hero|gallery|listing|main|primary|featured)[^"']*["']/i);
  if (heroImg?.[1] && !heroImg[1].includes("logo") && !heroImg[1].includes("icon")) return heroImg[1];

  return null;
}

function extractNameAndBuilder(
  html: string,
  og: Record<string, string>,
  jsonLd: Record<string, unknown> | null,
  title: string | null,
): { name: string; builder: string | null; model: string | null } {
  // JSON-LD name
  let fullName = jsonLd?.name ? String(jsonLd.name) : null;
  // OG title
  if (!fullName) fullName = og["og:title"] ?? null;
  // Page title
  if (!fullName) fullName = title;
  // Fallback
  if (!fullName) fullName = "Unknown Yacht";

  // Clean common suffixes
  fullName = fullName
    .replace(/\s*[-|]\s*(YachtWorld|BoatTrader|boats\.com|Denison|for sale).*$/i, "")
    .replace(/\s*for\s*sale.*$/i, "")
    .trim();

  // Try to extract builder (manufacturer) from JSON-LD
  let builder: string | null = null;
  if (jsonLd?.brand) {
    const brand = jsonLd.brand;
    builder = typeof brand === "string" ? brand : (brand as Record<string, string>).name ?? null;
  }
  if (!builder && jsonLd?.manufacturer) {
    const mfr = jsonLd.manufacturer;
    builder = typeof mfr === "string" ? mfr : (mfr as Record<string, string>).name ?? null;
  }

  // Try HTML patterns for builder
  if (!builder) {
    builder = firstMatch(html,
      /(?:builder|manufacturer|make|brand)[^>]*?[:\-]\s*([A-Z][^<,]{2,30})/i,
    );
  }

  // Model from JSON-LD
  let model: string | null = null;
  if (jsonLd?.model) {
    model = typeof jsonLd.model === "string" ? jsonLd.model : (jsonLd.model as Record<string, string>).name ?? null;
  }

  return { name: fullName, builder, model };
}

/* ------------------------------------------------------------------ */
/*  Main scraper                                                       */
/* ------------------------------------------------------------------ */

/* ------------------------------------------------------------------ */
/*  URL slug parser — always works, no network needed                  */
/* ------------------------------------------------------------------ */

/** Known yacht builders for matching in URL slugs */
const KNOWN_BUILDERS = [
  "absolute", "azimut", "bayliner", "benetti", "bertram", "beneteau",
  "boston-whaler", "boston whaler", "cabo", "carver", "catalina",
  "chris-craft", "chris craft", "cruisers", "dufour", "fairline",
  "ferretti", "formula", "fountain", "galeon", "grady-white", "grady white",
  "hatteras", "hinckley", "hunter", "hylas", "island-packet", "island packet",
  "jeanneau", "lagoon", "lazzara", "leopard", "lurssen", "malibu",
  "meridian", "monte-carlo", "monte carlo", "nordhavn", "ocean-alexander",
  "ocean alexander", "oyster", "pacific-mariner", "pacific mariner",
  "pershing", "prestige", "princess", "ranger", "regal", "regulator",
  "riva", "riviera", "robalo", "sailfish", "sabre", "san-lorenzo",
  "san lorenzo", "sea-ray", "sea ray", "searay", "sunseeker", "tiara",
  "viking", "wellcraft", "yellowfin",
];

function parseUrlSlug(url: string): Partial<ScrapedYacht> {
  const source = detectSource(url);
  const result: Partial<ScrapedYacht> = { source, url };

  try {
    const parsed = new URL(url);
    // Combine path + any slug
    const slug = decodeURIComponent(parsed.pathname)
      .toLowerCase()
      .replace(/[_/]/g, "-")
      .replace(/[^a-z0-9\-.\s]/g, " ");

    // Extract year: 4-digit number between 1970–current+2
    const yearMatch = slug.match(/\b(19[7-9]\d|20[0-4]\d)\b/);
    if (yearMatch) result.year = parseInt(yearMatch[1]);

    // Extract builder
    for (const b of KNOWN_BUILDERS) {
      const pattern = b.replace(/[- ]/g, "[- ]?");
      if (new RegExp(`\\b${pattern}\\b`, "i").test(slug)) {
        result.builder = b.split(/[- ]/).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
        break;
      }
    }

    // Extract model — anything after builder or year in the slug
    const parts = slug.split("-").filter(Boolean);
    const nonNumericParts = parts.filter(p => !/^\d+$/.test(p));

    // Try to build a name: "year builder model" from slug
    if (result.builder && result.year) {
      // Find model text after builder in slug
      const builderIdx = slug.indexOf(result.builder.toLowerCase().replace(/ /g, "-"));
      if (builderIdx >= 0) {
        const afterBuilder = slug.slice(builderIdx + result.builder.length)
          .replace(/^[-\s]+/, "")
          .split(/[-\s]+/)
          .filter(p => !/^\d{7,}$/.test(p)) // remove listing IDs
          .slice(0, 4)
          .join(" ");
        if (afterBuilder.trim().length > 0) {
          const modelStr = afterBuilder.trim().split(/\s+/).filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1)).join(" ");
          if (modelStr) result.model = modelStr;
        }
      }
      result.name = [result.year, result.builder, result.model].filter(Boolean).join(" ");
    } else if (nonNumericParts.length > 0) {
      result.name = nonNumericParts
        .slice(0, 5)
        .filter(p => !/^\d{6,}$/.test(p))
        .map(w => w[0]?.toUpperCase() + w.slice(1))
        .join(" ");
    }

    // Try to extract length from slug (e.g. "80ft" or "40m")
    const ftMatch = slug.match(/(\d{2,3})\s*(?:ft|foot|feet)/);
    if (ftMatch) {
      const ft = parseInt(ftMatch[1]);
      if (ft > 10 && ft < 500) {
        result.lengthFt = ft;
        result.lengthM = Math.round(ft * 0.3048 * 10) / 10;
      }
    }
    const mMatch = slug.match(/(\d{2,3})\s*m\b/);
    if (mMatch && !ftMatch) {
      const m = parseInt(mMatch[1]);
      if (m > 3 && m < 150) {
        result.lengthM = m;
        result.lengthFt = Math.round(m * 3.281 * 10) / 10;
      }
    }

  } catch { /* invalid URL, return what we have */ }

  return result;
}

/* ------------------------------------------------------------------ */
/*  HTML fetch helpers                                                 */
/* ------------------------------------------------------------------ */

const FETCH_HEADERS = {
  "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9",
};

interface FetchResult {
  html: string | null;
  markdown?: string | null;
  firecrawlImageUrl?: string | null;
  firecrawlScreenshot?: string | null;
}

async function tryFetchHtml(url: string): Promise<FetchResult> {
  // Strategy 0: Firecrawl — JS-rendered pages, better image/data extraction
  const firecrawlKey = process.env.FIRECRAWL_API_KEY;
  if (firecrawlKey) {
    try {
      const res = await fetch("https://api.firecrawl.dev/v1/scrape", {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${firecrawlKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ url, formats: ["html", "markdown", "screenshot"] }),
        signal: AbortSignal.timeout(20000),
      });
      if (res.ok) {
        const json = await res.json() as {
          success: boolean;
          data?: {
            html?: string;
            markdown?: string;
            screenshot?: string;
            metadata?: { ogImage?: string; title?: string };
          };
        };
        const html = json?.data?.html ?? "";
        const markdown = json?.data?.markdown ?? null;
        const firecrawlImageUrl = json?.data?.metadata?.ogImage ?? null;
        const firecrawlScreenshot = json?.data?.screenshot ?? null;
        if (html.length > 500 && !html.includes("cf-challenge")) {
          return { html, markdown, firecrawlImageUrl, firecrawlScreenshot };
        }
        // Even if HTML is bad, we might still have markdown/screenshot/image
        return { html: null, markdown, firecrawlImageUrl, firecrawlScreenshot };
      }
    } catch { /* fall through to other strategies */ }
  }

  // Strategy 1: Direct fetch
  try {
    const res = await fetch(url, {
      headers: FETCH_HEADERS,
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      // Check for Cloudflare challenge pages
      if (html.length > 500 && !html.includes("Just a moment...") && !html.includes("cf-challenge")) {
        return { html };
      }
    }
  } catch { /* try next */ }

  // Strategy 2: Jina AI Reader — renders JS, bypasses some bot protection
  try {
    const jinaUrl = `https://r.jina.ai/${url}`;
    const res = await fetch(jinaUrl, {
      headers: {
        "Accept": "text/html",
        "X-Return-Format": "html",
      },
      signal: AbortSignal.timeout(15000),
    });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500 && !html.includes("Target URL returned error")) {
        return { html };
      }
    }
  } catch { /* try next */ }

  // Strategy 3: allorigins.win proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, {
      signal: AbortSignal.timeout(8000),
    });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500 && !html.includes("Just a moment...")) {
        return { html };
      }
    }
  } catch { /* try next */ }

  return { html: null };
}

/* ------------------------------------------------------------------ */
/*  Spec database lookup — superyachts.com, manufacturer sites         */
/* ------------------------------------------------------------------ */

/** Cache the sitemap in memory for the lifetime of the worker */
let sitemapCache: string | null = null;

async function discoverSpecUrl(builder: string, model: string | null): Promise<string | null> {
  // Fetch and cache the superyachts.com yacht-models sitemap
  // Contains all model URLs with their unpredictable numeric suffixes
  if (!sitemapCache) {
    try {
      const res = await fetch(
        "https://www.superyachts.com/sitemap-yacht-models.xml.gz",
        { headers: FETCH_HEADERS }
      );
      if (!res.ok) return null;
      // .gz file needs explicit decompression
      const ds = new DecompressionStream("gzip");
      const decompressed = res.body!.pipeThrough(ds);
      sitemapCache = await new Response(decompressed).text();
    } catch { return null; }
  }

  if (!sitemapCache) return null;

  // Search for matching model URL in sitemap
  const searchTerm = `${builder}${model ? "-" + model : ""}`.toLowerCase().replace(/\s+/g, "-");
  const pattern = new RegExp(
    `https://www\\.superyachts\\.com/new-build/models/${searchTerm.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}[^<\\s]*/specs`,
    "i"
  );
  const match = sitemapCache.match(pattern);
  if (match) return match[0];

  // Also try without model number (just builder name)
  if (model) {
    const builderOnly = builder.toLowerCase().replace(/\s+/g, "-");
    const loosePattern = new RegExp(
      `https://www\\.superyachts\\.com/new-build/models/${builderOnly}-[^<\\s]*/specs`,
      "gi"
    );
    const allMatches = [...sitemapCache.matchAll(loosePattern)].map(m => m[0]);
    // Find the best match by checking if the model number appears in the URL
    if (model) {
      const modelLower = model.toLowerCase().replace(/\s+/g, "-");
      const best = allMatches.find(u => u.includes(modelLower));
      if (best) return best;
    }
    // Return first match as fallback
    if (allMatches.length > 0) return allMatches[0];
  }

  return null;
}

async function lookupSpecsFromDatabase(
  builder: string | null,
  model: string | null
): Promise<Partial<ScrapedYacht>> {
  if (!builder) return {};

  // Step 1: Discover the correct superyachts.com URL via their sitemap
  const discoveredUrl = await discoverSpecUrl(builder, model);
  if (!discoveredUrl) return {};

  try {
    const res = await fetch(discoveredUrl, { headers: FETCH_HEADERS });
    if (!res.ok) return {};
    const html = await res.text();
    if (html.length < 500) return {};

    const result: Partial<ScrapedYacht> = {};

    // superyachts.com is a Nuxt SSR app — data in window.__NUXT__ IIFE
    // Parse the function params and args to resolve variable values
    const nuxtIdx = html.indexOf("window.__NUXT__=(function(");
    if (nuxtIdx >= 0) {
      try {
        const nuxtEnd = html.indexOf("</script>", nuxtIdx);
        const nuxtBlock = html.slice(nuxtIdx, nuxtEnd);

        // 1. Extract param names from "function(a,b,c,...)"
        const funcParamStart = nuxtBlock.indexOf("function(");
        const pStart = funcParamStart >= 0 ? funcParamStart + "function(".length : nuxtBlock.indexOf("(") + 1;
        const pEnd = nuxtBlock.indexOf(")", pStart);
        const params = nuxtBlock.slice(pStart, pEnd).split(",").map(s => s.trim());

        // 2. Find the return object to identify which vars hold which fields
        const retIdx = nuxtBlock.indexOf("return ");
        const retBody = nuxtBlock.slice(retIdx, retIdx + 200000);

        // 3. For each spec field, find what variable name is used
        const fieldVars: Record<string, string> = {};
        for (const field of ["length_m", "length_ft", "beam", "max_speed", "cabins", "guests"]) {
          const m = retBody.match(new RegExp(`\\b${field}:(\\w+)`));
          if (m) fieldVars[field] = m[1];
        }

        // 4. Find which param indices we need (only need the highest index)
        const neededIndices = new Map<number, string>(); // paramIndex -> fieldName
        let maxNeeded = 0;
        for (const [field, varName] of Object.entries(fieldVars)) {
          const idx = params.indexOf(varName);
          if (idx >= 0) {
            neededIndices.set(idx, field);
            if (idx > maxNeeded) maxNeeded = idx;
          } else {
            // It might be a literal number, not a variable
            const num = parseFloat(varName);
            if (!isNaN(num)) {
              fieldVars[field] = String(num); // store as literal
            }
          }
        }

        // 5. Parse args list — only up to maxNeeded + buffer
        // Args start after the function body closing }(
        // Find the function body end by searching for }( after the return object
        const funcBodyEnd = nuxtBlock.lastIndexOf("}(");
        const argsStartIdx = funcBodyEnd + 2;
        const argsEndIdx = nuxtBlock.lastIndexOf("))");
        const argsStr = nuxtBlock.slice(argsStartIdx, argsEndIdx);

        // Parse args one at a time up to maxNeeded
        const argValues: string[] = [];
        let ai = 0;
        let argCount = 0;
        while (ai < argsStr.length && argCount <= maxNeeded + 5) {
          const c = argsStr[ai];
          if (c === " " || c === "\n" || c === "\r" || c === "\t") { ai++; continue; }
          if (c === ",") { ai++; continue; }
          if (c === '"' || c === "'") {
            let end = ai + 1;
            while (end < argsStr.length) {
              if (argsStr[end] === "\\") { end += 2; continue; }
              if (argsStr[end] === c) break;
              end++;
            }
            argValues.push(argsStr.slice(ai + 1, end));
            ai = end + 1;
            argCount++;
          } else {
            let end = ai;
            let depth = 0;
            while (end < argsStr.length) {
              if (argsStr[end] === "(" || argsStr[end] === "[" || argsStr[end] === "{") depth++;
              if (argsStr[end] === ")" || argsStr[end] === "]" || argsStr[end] === "}") depth--;
              if (argsStr[end] === "," && depth === 0) break;
              end++;
            }
            argValues.push(argsStr.slice(ai, end).trim());
            ai = end;
            argCount++;
          }
        }

        // 6. Build resolved values
        const resolved: Record<string, number | null> = {};
        for (const [field, varName] of Object.entries(fieldVars)) {
          // Check if it's already a literal number
          const directNum = parseFloat(varName);
          if (!isNaN(directNum)) {
            resolved[field] = directNum;
            continue;
          }
          // Resolve from args
          const idx = params.indexOf(varName);
          if (idx >= 0 && idx < argValues.length) {
            const val = argValues[idx];
            if (val === "null" || val === "void 0" || val === "") {
              resolved[field] = null;
            } else {
              const n = parseFloat(val);
              resolved[field] = isNaN(n) ? null : n;
            }
          }
        }

        // 7. Apply resolved values
        const lm = resolved["length_m"];
        const lf = resolved["length_ft"];
        if (lm && lm > 5 && lm < 200) {
          result.lengthM = Math.round(lm * 10) / 10;
          result.lengthFt = Math.round(lm * 3.281 * 10) / 10;
        } else if (lf && lf > 15 && lf < 600) {
          result.lengthFt = Math.round(lf * 10) / 10;
          result.lengthM = Math.round(lf * 0.3048 * 10) / 10;
        }

        const beamVal = resolved["beam"];
        if (beamVal && beamVal > 1 && beamVal < 30) {
          result.beamM = beamVal;
          result.beamFt = Math.round(beamVal * 3.281 * 10) / 10;
        }

        const speedVal = resolved["max_speed"];
        if (speedVal && speedVal > 3 && speedVal < 80) {
          result.maxSpeed = speedVal;
        }

        const cabinsVal = resolved["cabins"];
        if (cabinsVal && cabinsVal >= 1 && cabinsVal <= 30) {
          result.cabins = cabinsVal;
        }

        const guestsVal = resolved["guests"];
        if (guestsVal && guestsVal >= 1 && guestsVal <= 50) {
          result.guests = guestsVal;
        }

        // 8. Engine — from description text embedded in the args
        // Look for engine manufacturer names followed by model numbers (not just the word alone)
        const engineMatch = nuxtBlock.match(
          /(?:(?:two|three|four|twin|triple|quad)\s+)?(?:MTU\s+\d|Caterpillar\s+\w|Rolls[\s-]?Royce|Volvo\s*Penta|Cummins\s+\w|Yanmar\s+\w)[^."\\]*(?:HP|hp|kW|bhp|ps)/i
        );
        if (engineMatch) {
          result.engine = engineMatch[0].replace(/\\u002F/g, "/").replace(/\\r\\n/g, " ").trim();
        } else {
          // Fallback: just grab the manufacturer + model
          const engineFallback = nuxtBlock.match(
            /(?:(?:two|three|four|twin|triple|quad)\s+)?(?:MTU\s+\d[\w\s-]{5,40}|Caterpillar\s+[\w\s-]{5,30}|Rolls[\s-]?Royce[\w\s-]{5,30}|Volvo\s*Penta[\w\s-]{5,30}|Cummins\s+[\w\s-]{5,30}|Yanmar\s+[\w\s-]{5,30})/i
          );
          if (engineFallback) {
            result.engine = engineFallback[0].replace(/\\u002F/g, "/").trim();
          }
        }
      } catch { /* NUXT parse failed */ }
    }

    return result;
  } catch { return {}; }
}

/* ------------------------------------------------------------------ */
/*  Builder spec profiles — estimate specs from builder + length       */
/* ------------------------------------------------------------------ */

interface BuilderProfile {
  type: string;
  /** beam as fraction of length */
  beamRatio: number;
  /** typical max speed range [min, max] in knots */
  speedRange: [number, number];
  /** cabins per 10ft of length above 30ft (motor) or 25ft (sail) */
  cabinsPerUnit: number;
  /** cabin base length threshold */
  cabinBaseFt: number;
  /** engine template by length bucket */
  engines: Record<string, string>;
  /** default guests per cabin */
  guestsPerCabin: number;
  /** typical range in nm by length bucket */
  rangeByLength: Record<string, number>;
}

const BUILDER_PROFILES: Record<string, BuilderProfile> = {
  // Performance motor yachts
  pershing: {
    type: "Motor Yacht", beamRatio: 0.20, speedRange: [32, 45],
    cabinsPerUnit: 0.6, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× MAN V8", "60": "2× MAN V12", "80": "2× MTU 16V 2000", "100": "4× MTU 16V 2000 M96L" },
    rangeByLength: { "40": 300, "60": 400, "80": 500, "100": 600 },
  },
  sunseeker: {
    type: "Motor Yacht", beamRatio: 0.22, speedRange: [28, 38],
    cabinsPerUnit: 0.55, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "50": "2× Volvo Penta IPS", "70": "2× MAN V12", "90": "2× MTU 16V 2000", "100": "2× MTU 16V 2000 M96" },
    rangeByLength: { "50": 300, "70": 400, "90": 500, "100": 600 },
  },
  princess: {
    type: "Motor Yacht", beamRatio: 0.23, speedRange: [25, 35],
    cabinsPerUnit: 0.55, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× Volvo Penta IPS500", "60": "2× MAN V8", "75": "2× MAN V12", "90": "2× MTU 12V 2000" },
    rangeByLength: { "40": 300, "60": 350, "75": 400, "90": 500 },
  },
  azimut: {
    type: "Motor Yacht", beamRatio: 0.23, speedRange: [26, 34],
    cabinsPerUnit: 0.55, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "40": "2× Volvo Penta IPS", "55": "2× MAN V8", "70": "2× MAN V12", "80": "2× MTU 12V 2000" },
    rangeByLength: { "40": 300, "55": 350, "70": 400, "80": 500 },
  },
  ferretti: {
    type: "Motor Yacht", beamRatio: 0.23, speedRange: [28, 36],
    cabinsPerUnit: 0.55, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "50": "2× MAN V8", "70": "2× MAN V12", "85": "2× MTU 12V 2000", "100": "2× MTU 16V 2000" },
    rangeByLength: { "50": 350, "70": 400, "85": 500, "100": 600 },
  },
  riva: {
    type: "Motor Yacht", beamRatio: 0.22, speedRange: [30, 40],
    cabinsPerUnit: 0.5, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× Volvo Penta IPS", "56": "2× MAN V8", "76": "2× MAN V12", "100": "2× MTU 16V 2000" },
    rangeByLength: { "40": 250, "56": 300, "76": 400, "100": 500 },
  },
  benetti: {
    type: "Motor Yacht", beamRatio: 0.21, speedRange: [14, 20],
    cabinsPerUnit: 0.5, cabinBaseFt: 40, guestsPerCabin: 2,
    engines: { "80": "2× MAN V12", "100": "2× MTU 12V 4000", "130": "2× MTU 16V 4000", "160": "2× MTU 20V 4000" },
    rangeByLength: { "80": 2500, "100": 3000, "130": 3500, "160": 4000 },
  },
  viking: {
    type: "Sportfisher", beamRatio: 0.24, speedRange: [32, 42],
    cabinsPerUnit: 0.45, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× Cummins QSB6.7", "54": "2× MAN V8", "72": "2× MAN V12", "80": "2× MTU 16V 2000 M96L" },
    rangeByLength: { "40": 400, "54": 450, "72": 500, "80": 600 },
  },
  hatteras: {
    type: "Motor Yacht", beamRatio: 0.25, speedRange: [25, 35],
    cabinsPerUnit: 0.45, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× Cummins QSB6.7", "54": "2× Caterpillar C12", "60": "2× CAT C18", "75": "2× CAT C32" },
    rangeByLength: { "40": 400, "54": 500, "60": 600, "75": 700 },
  },
  "sea ray": {
    type: "Motor Yacht", beamRatio: 0.26, speedRange: [28, 38],
    cabinsPerUnit: 0.4, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "25": "1× MerCruiser 350", "32": "2× MerCruiser 350", "40": "2× Cummins QSB6.7", "50": "2× Cummins QSC8.3" },
    rangeByLength: { "25": 200, "32": 250, "40": 300, "50": 350 },
  },
  "boston whaler": {
    type: "Center Console", beamRatio: 0.30, speedRange: [35, 50],
    cabinsPerUnit: 0.2, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "17": "1× Mercury 150", "23": "2× Mercury 300", "28": "2× Mercury 400", "38": "3× Mercury 400V" },
    rangeByLength: { "17": 150, "23": 250, "28": 350, "38": 400 },
  },
  "grady white": {
    type: "Center Console", beamRatio: 0.30, speedRange: [35, 48],
    cabinsPerUnit: 0.2, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "18": "1× Yamaha F200", "23": "2× Yamaha F250", "28": "2× Yamaha F300", "37": "3× Yamaha F350" },
    rangeByLength: { "18": 200, "23": 300, "28": 350, "37": 400 },
  },
  lagoon: {
    type: "Catamaran", beamRatio: 0.50, speedRange: [8, 12],
    cabinsPerUnit: 0.5, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "40": "2× Yanmar 4JH57", "46": "2× Yanmar 4JH80", "55": "2× Yanmar 4LHA-STP", "65": "2× Volvo D3-150" },
    rangeByLength: { "40": 1500, "46": 1800, "55": 2000, "65": 2500 },
  },
  beneteau: {
    type: "Sailing Yacht", beamRatio: 0.32, speedRange: [7, 10],
    cabinsPerUnit: 0.45, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "30": "1× Yanmar 3YM20", "38": "1× Yanmar 3JH40", "45": "1× Yanmar 4JH57", "55": "1× Yanmar 4JH80" },
    rangeByLength: { "30": 99999, "38": 99999, "45": 99999, "55": 99999 },
  },
  jeanneau: {
    type: "Sailing Yacht", beamRatio: 0.32, speedRange: [7, 10],
    cabinsPerUnit: 0.45, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "30": "1× Yanmar 3YM20", "38": "1× Yanmar 3JH40", "45": "1× Yanmar 4JH57", "55": "1× Yanmar 4JH80" },
    rangeByLength: { "30": 99999, "38": 99999, "45": 99999, "55": 99999 },
  },
  oyster: {
    type: "Sailing Yacht", beamRatio: 0.28, speedRange: [8, 11],
    cabinsPerUnit: 0.4, cabinBaseFt: 35, guestsPerCabin: 2,
    engines: { "50": "1× Yanmar 4JH80", "62": "1× Yanmar 4LHA-STP", "75": "1× Yanmar 6LPA-STP2", "88": "1× Scania DI13" },
    rangeByLength: { "50": 99999, "62": 99999, "75": 99999, "88": 99999 },
  },
  nordhavn: {
    type: "Trawler", beamRatio: 0.24, speedRange: [8, 12],
    cabinsPerUnit: 0.4, cabinBaseFt: 35, guestsPerCabin: 2,
    engines: { "40": "1× John Deere 4045", "55": "1× John Deere 6068", "68": "2× John Deere 6090", "96": "2× John Deere 6135" },
    rangeByLength: { "40": 3000, "55": 3500, "68": 4000, "96": 5000 },
  },
  riviera: {
    type: "Motor Yacht", beamRatio: 0.26, speedRange: [28, 36],
    cabinsPerUnit: 0.45, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "39": "2× Volvo Penta IPS500", "50": "2× Volvo Penta IPS700", "58": "2× MAN V8", "72": "2× MAN V12" },
    rangeByLength: { "39": 350, "50": 400, "58": 450, "72": 500 },
  },
  absolute: {
    type: "Motor Yacht", beamRatio: 0.24, speedRange: [26, 34],
    cabinsPerUnit: 0.5, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "40": "2× Volvo Penta IPS400", "50": "2× Volvo Penta IPS600", "60": "2× Volvo Penta IPS800", "72": "2× MAN V12" },
    rangeByLength: { "40": 300, "50": 350, "60": 400, "72": 450 },
  },
  galeon: {
    type: "Motor Yacht", beamRatio: 0.25, speedRange: [26, 34],
    cabinsPerUnit: 0.5, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "32": "2× Volvo Penta D6", "42": "2× Volvo Penta IPS500", "50": "2× Volvo Penta IPS700", "64": "2× MAN V8" },
    rangeByLength: { "32": 250, "42": 300, "50": 350, "64": 400 },
  },
  prestige: {
    type: "Motor Yacht", beamRatio: 0.24, speedRange: [25, 32],
    cabinsPerUnit: 0.5, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "42": "2× Volvo Penta IPS500", "52": "2× Volvo Penta IPS700", "59": "2× Volvo Penta IPS800", "69": "2× MAN V8" },
    rangeByLength: { "42": 300, "52": 350, "59": 400, "69": 450 },
  },
  "monte carlo": {
    type: "Motor Yacht", beamRatio: 0.24, speedRange: [24, 30],
    cabinsPerUnit: 0.5, cabinBaseFt: 30, guestsPerCabin: 2,
    engines: { "52": "2× Volvo Penta IPS700", "66": "2× Volvo Penta IPS950", "76": "2× MAN V12" },
    rangeByLength: { "52": 350, "66": 400, "76": 500 },
  },
  "ocean alexander": {
    type: "Motor Yacht", beamRatio: 0.24, speedRange: [22, 30],
    cabinsPerUnit: 0.45, cabinBaseFt: 35, guestsPerCabin: 2,
    engines: { "45": "2× Caterpillar C9", "70": "2× Caterpillar C18", "84": "2× Caterpillar C32", "100": "2× MTU 12V 2000" },
    rangeByLength: { "45": 400, "70": 500, "84": 600, "100": 700 },
  },
  wellcraft: {
    type: "Center Console", beamRatio: 0.28, speedRange: [32, 45],
    cabinsPerUnit: 0.25, cabinBaseFt: 25, guestsPerCabin: 2,
    engines: { "22": "1× Mercury 250", "26": "2× Mercury 300", "30": "2× Mercury 400", "35": "3× Mercury 400" },
    rangeByLength: { "22": 200, "26": 250, "30": 300, "35": 350 },
  },
  regulator: {
    type: "Center Console", beamRatio: 0.30, speedRange: [35, 48],
    cabinsPerUnit: 0.15, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "23": "2× Yamaha F250", "28": "2× Yamaha F350", "34": "3× Yamaha F350", "41": "4× Yamaha F350" },
    rangeByLength: { "23": 250, "28": 300, "34": 350, "41": 400 },
  },
  yellowfin: {
    type: "Center Console", beamRatio: 0.28, speedRange: [35, 50],
    cabinsPerUnit: 0.15, cabinBaseFt: 28, guestsPerCabin: 2,
    engines: { "24": "2× Yamaha F300", "32": "2× Yamaha F425", "36": "3× Yamaha F425", "42": "4× Yamaha F425" },
    rangeByLength: { "24": 250, "32": 300, "36": 350, "42": 400 },
  },
};

/** Estimate specs from builder name + length using builder profiles */
function estimateFromProfile(builder: string | null, lengthFt: number | null): Partial<ScrapedYacht> {
  if (!builder || !lengthFt || lengthFt < 15) return {};

  const key = builder.toLowerCase();
  const profile = BUILDER_PROFILES[key];
  if (!profile) return {};

  const result: Partial<ScrapedYacht> = {};
  result.type = profile.type;

  // Beam
  const beamFt = Math.round(lengthFt * profile.beamRatio * 10) / 10;
  result.beamFt = beamFt;
  result.beamM = Math.round(beamFt * 0.3048 * 10) / 10;

  // Speed — interpolate within range based on length
  const [minSpd, maxSpd] = profile.speedRange;
  result.maxSpeed = Math.round((minSpd + maxSpd) / 2);

  // Cabins
  const rawCabins = (lengthFt - profile.cabinBaseFt) / 10 * profile.cabinsPerUnit;
  const cabins = Math.max(1, Math.round(rawCabins * 2) / 2);
  result.cabins = Math.round(cabins);
  result.guests = result.cabins * profile.guestsPerCabin;

  // Engine — find closest length bucket
  const buckets = Object.keys(profile.engines).map(Number).sort((a, b) => a - b);
  let engineKey = String(buckets[0]);
  for (const b of buckets) {
    if (lengthFt >= b) engineKey = String(b);
  }
  result.engine = profile.engines[engineKey] ?? null;

  // Range
  const rangeBuckets = Object.keys(profile.rangeByLength).map(Number).sort((a, b) => a - b);
  let rangeKey = String(rangeBuckets[0]);
  for (const b of rangeBuckets) {
    if (lengthFt >= b) rangeKey = String(b);
  }
  result.range = profile.rangeByLength[rangeKey] ?? null;

  return result;
}

/** Builders that use decifeet naming (e.g., "350" = 35ft) */
const DECIFEET_BUILDERS = new Set([
  "boston whaler", "grady white", "wellcraft", "regulator",
  "yellowfin", "robalo", "sailfish", "sea ray", "searay",
  "bayliner", "chaparral", "cobalt", "formula",
]);

/** Spelled-out numbers for model names like "Seventy 7", "Sixty 5" */
const WORD_NUMBERS: Record<string, number> = {
  twenty: 20, thirty: 30, forty: 40, fifty: 50,
  sixty: 60, seventy: 70, eighty: 80, ninety: 90,
  hundred: 100,
};

/** Try to infer length from model name/number — most yachts encode length in name */
function inferLengthFromModel(model: string | null, builder: string | null): number | null {
  if (!model) return null;

  const isDecifeetBuilder = builder ? DECIFEET_BUILDERS.has(builder.toLowerCase()) : false;

  // Common patterns: "62", "95 Yacht", "400 SLX", "350 Outrage"
  const numMatch = model.match(/^(\d{2,3})\b/);
  if (numMatch) {
    let num = parseInt(numMatch[1]);
    // Decifeet builders: "350" = 35ft, "280" = 28ft
    if (isDecifeetBuilder && num >= 150 && num <= 999) {
      num = Math.round(num / 10);
    }
    if (num >= 15 && num <= 200) return num;
  }

  // Try end-of-string number: "Oasis 40M"
  const endMatch = model.match(/(\d{2,3})\s*(?:m|ft)?$/i);
  if (endMatch) {
    const num = parseInt(endMatch[1]);
    if (num >= 15 && num <= 200) return num;
  }

  // Try spelled-out numbers: "Seventy 7" → 77, "Sixty 5" → 65
  const modelLower = model.toLowerCase();
  for (const [word, base] of Object.entries(WORD_NUMBERS)) {
    if (modelLower.includes(word)) {
      // Check for trailing digit: "Seventy 7" → 77
      const trailingDigitMatch = modelLower.match(new RegExp(`${word}\\s*(\\d)?`));
      const ones = trailingDigitMatch?.[1] ? parseInt(trailingDigitMatch[1]) : 0;
      const total = base + ones;
      if (total >= 20 && total <= 200) return total;
    }
  }

  return null;
}

/* ------------------------------------------------------------------ */
/*  Fallback image — curated yacht photos by type                      */
/* ------------------------------------------------------------------ */

/** Curated Unsplash photo IDs by yacht type — free, high-quality, reliable */
const FALLBACK_IMAGES: Record<string, string[]> = {
  "Motor Yacht": [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&h=500&fit=crop",
  ],
  "Sailing Yacht": [
    "https://images.unsplash.com/photo-1534854638093-bada1813ca19?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1540946485063-a40da27545f8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1559304022-afbf28bc53e0?w=800&h=500&fit=crop",
  ],
  "Catamaran": [
    "https://images.unsplash.com/photo-1605005997079-d4443d180c65?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1544551763-46a013bb70d5?w=800&h=500&fit=crop",
  ],
  "Sportfisher": [
    "https://images.unsplash.com/photo-1544551763-77932f4e30c8?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800&h=500&fit=crop",
  ],
  "Center Console": [
    "https://images.unsplash.com/photo-1551524164-687a55dd1126?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1544551763-77932f4e30c8?w=800&h=500&fit=crop",
  ],
  "Trawler": [
    "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
    "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
  ],
};

const DEFAULT_YACHT_IMAGES = [
  "https://images.unsplash.com/photo-1567899378494-47b22a2ae96a?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1605281317010-fe5ffe798166?w=800&h=500&fit=crop",
  "https://images.unsplash.com/photo-1569263979104-865ab7cd8d13?w=800&h=500&fit=crop",
];

function generateFallbackImage(builder: string | null, type: string | null): string {
  const images = (type && FALLBACK_IMAGES[type]) || DEFAULT_YACHT_IMAGES;
  // Deterministic selection based on builder name for consistency
  let hash = 0;
  const seed = builder || "yacht";
  for (let i = 0; i < seed.length; i++) {
    hash = (hash * 31 + seed.charCodeAt(i)) | 0;
  }
  return images[Math.abs(hash) % images.length];
}

/* ------------------------------------------------------------------ */
/*  Main scraper — URL parsing + optional HTML scraping                */
/* ------------------------------------------------------------------ */

async function scrapeYacht(url: string): Promise<ScrapedYacht> {
  const source = detectSource(url);

  // ALWAYS parse the URL slug first — this never fails
  const urlData = parseUrlSlug(url);

  // Infer length from model number if not already parsed
  let inferredLengthFt = urlData.lengthFt ?? null;
  if (!inferredLengthFt && urlData.model) {
    inferredLengthFt = inferLengthFromModel(urlData.model, urlData.builder ?? null);
  }

  // Estimate specs from builder profile + length
  const profileData = estimateFromProfile(urlData.builder ?? null, inferredLengthFt);

  // Try to fetch HTML for richer data (but don't fail if blocked)
  const fetchResult = await tryFetchHtml(url);
  const html = fetchResult.html;

  // Always try spec database as fallback for missing fields
  const specData = await lookupSpecsFromDatabase(urlData.builder ?? null, urlData.model ?? null);

  let htmlName: string | null = null;
  let htmlBuilder: string | null = null;
  let htmlModel: string | null = null;
  let htmlPrice: string | null = null;
  let htmlPriceNum: number | null = null;
  let htmlYear: number | null = null;
  let htmlLengthFt: number | null = null;
  let htmlLengthM: number | null = null;
  let htmlBeamFt: number | null = null;
  let htmlBeamM: number | null = null;
  let htmlSpeed: number | null = null;
  let htmlCabins: number | null = null;
  let htmlGuests: number | null = null;
  let htmlRange: number | null = null;
  let htmlEngine: string | null = null;
  let htmlEngineHours: number | null = null;
  let htmlLocation: string | null = null;
  let htmlImageUrl: string | null = null;
  let htmlType: string | null = null;

  if (html) {
    const jsonLd = extractJsonLd(html);
    const og = extractOg(html);
    const title = extractTitle(html);

    const nameData = extractNameAndBuilder(html, og, jsonLd, title);
    htmlName = nameData.name;
    htmlBuilder = nameData.builder;
    htmlModel = nameData.model;

    const priceData = extractPrice(html, jsonLd);
    htmlPrice = priceData.price;
    htmlPriceNum = priceData.priceNum;

    const length = extractLength(html, jsonLd);
    htmlLengthFt = length.ft;
    htmlLengthM = length.m;

    const beam = extractBeam(html);
    htmlBeamFt = beam.ft;
    htmlBeamM = beam.m;

    htmlYear = extractYear(html, jsonLd);
    htmlSpeed = extractSpeed(html);
    htmlCabins = extractCabins(html);
    htmlGuests = extractGuests(html);
    htmlRange = extractRange(html);
    htmlEngine = extractEngine(html);
    htmlEngineHours = extractEngineHours(html);
    htmlLocation = extractLocation(html, jsonLd);
    htmlImageUrl = extractImage(html, og, jsonLd);
    htmlType = firstMatch(html,
      /(?:boat|vessel|hull)\s*type[^>]*?[:\-]\s*([^<,]{3,30})/i,
      /(?:motor\s*yacht|sailing\s*yacht|catamaran|sportfish|trawler|center\s*console|flybridge|express)/i,
    );
  }

  // Fallback: extract specs from Firecrawl markdown (clean text, much easier to parse)
  const md = fetchResult.markdown;
  if (md && md.length > 100) {
    // Price
    if (!htmlPrice) {
      const pMatch = md.match(/(?:\$|USD\s*)\s*([\d,]+(?:\.\d{2})?)/);
      if (pMatch) {
        const num = parseInt(pMatch[1].replace(/,/g, ""));
        if (num > 1000) { htmlPrice = `$${num.toLocaleString()}`; htmlPriceNum = num; }
      }
      if (!htmlPrice) {
        const askMatch = md.match(/(?:asking|price|listed)[:\s]*\$?([\d,]+)/i);
        if (askMatch) {
          const num = parseInt(askMatch[1].replace(/,/g, ""));
          if (num > 1000) { htmlPrice = `$${num.toLocaleString()}`; htmlPriceNum = num; }
        }
      }
    }
    // Length
    if (!htmlLengthFt) {
      const lMatch = md.match(/(?:length|LOA|overall)[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|')/i)
        ?? md.match(/(\d+(?:\.\d+)?)\s*(?:ft|feet|')\s*(?:length|LOA|overall)/i)
        ?? md.match(/(?:length|LOA)[:\s]*(\d+(?:\.\d+)?)\s*m/i);
      if (lMatch) {
        const isMeters = /m$/i.test(lMatch[0]);
        const val = parseFloat(lMatch[1]);
        if (isMeters && val > 3 && val < 200) { htmlLengthM = val; htmlLengthFt = Math.round(val * 3.281 * 10) / 10; }
        else if (val > 10 && val < 500) { htmlLengthFt = val; htmlLengthM = Math.round(val * 0.3048 * 10) / 10; }
      }
    }
    // Beam
    if (!htmlBeamFt) {
      const bMatch = md.match(/beam[:\s]*(\d+(?:\.\d+)?)\s*(?:ft|feet|')/i)
        ?? md.match(/beam[:\s]*(\d+(?:\.\d+)?)\s*m/i);
      if (bMatch) {
        const isMeters = /m$/i.test(bMatch[0]);
        const val = parseFloat(bMatch[1]);
        if (isMeters && val > 1 && val < 30) { htmlBeamM = val; htmlBeamFt = Math.round(val * 3.281 * 10) / 10; }
        else if (val > 3 && val < 80) { htmlBeamFt = val; htmlBeamM = Math.round(val * 0.3048 * 10) / 10; }
      }
    }
    // Speed
    if (!htmlSpeed) {
      const sMatch = md.match(/(?:max|top|cruising)?\s*speed[:\s]*(\d+(?:\.\d+)?)\s*(?:knots|kn|kts)/i)
        ?? md.match(/(\d+(?:\.\d+)?)\s*(?:knots|kn|kts)/i);
      if (sMatch) { const v = parseFloat(sMatch[1]); if (v > 3 && v < 80) htmlSpeed = v; }
    }
    // Cabins
    if (!htmlCabins) {
      const cMatch = md.match(/(\d+)\s*(?:cabin|stateroom|berth)/i);
      if (cMatch) { const v = parseInt(cMatch[1]); if (v > 0 && v < 30) htmlCabins = v; }
    }
    // Guests
    if (!htmlGuests) {
      const gMatch = md.match(/(\d+)\s*(?:guest|passenger|sleeps)/i);
      if (gMatch) { const v = parseInt(gMatch[1]); if (v > 0 && v < 50) htmlGuests = v; }
    }
    // Engine
    if (!htmlEngine) {
      const eMatch = md.match(/(?:engine|power|propulsion)[:\s]*((?:\d+\s*[×x]\s*)?(?:Cat(?:erpillar)?|Volvo|MAN|MTU|Cummins|Yanmar|Mercury|Yamaha|John Deere|Detroit)[^,\n]{3,50})/i)
        ?? md.match(/((?:\d+\s*[×x]\s*)?(?:Cat(?:erpillar)?|Volvo|MAN|MTU|Cummins|Yanmar|Mercury|Yamaha|John Deere|Detroit)[^,\n]{3,50})/i);
      if (eMatch) htmlEngine = eMatch[1].trim();
    }
    // Engine hours
    if (!htmlEngineHours) {
      const hMatch = md.match(/(?:engine\s*)?hours?[:\s]*(\d[\d,]*)/i)
        ?? md.match(/(\d[\d,]*)\s*(?:engine\s*)?hours/i);
      if (hMatch) { const v = parseInt(hMatch[1].replace(/,/g, "")); if (v > 0 && v < 50000) htmlEngineHours = v; }
    }
    // Range
    if (!htmlRange) {
      const rMatch = md.match(/range[:\s]*(\d[\d,]*)\s*(?:nm|nautical|nmi)/i)
        ?? md.match(/(\d[\d,]*)\s*(?:nm|nautical miles)/i);
      if (rMatch) { const v = parseInt(rMatch[1].replace(/,/g, "")); if (v > 10 && v < 20000) htmlRange = v; }
    }
    // Location
    if (!htmlLocation || htmlLocation.includes("bgrp.io")) {
      const locMatch = md.match(/(?:location|port|city|marina)[:\s]*([A-Z][a-zA-Z\s,]+(?:,\s*[A-Z]{2})?)/m);
      if (locMatch) { const loc = locMatch[1].trim(); if (loc.length > 2 && loc.length < 60) htmlLocation = loc; }
    }
    // Name from markdown title
    if (!htmlName || htmlName === "Unknown Yacht") {
      const nameMatch = md.match(/^#\s+(.+)/m);
      if (nameMatch) {
        const n = nameMatch[1].replace(/\s*[-|]\s*(YachtWorld|BoatTrader|boats\.com|Denison|for sale).*$/i, "").trim();
        if (n.length > 3 && n.length < 80) htmlName = n;
      }
    }
    // Builder from markdown
    if (!htmlBuilder) {
      const builderMatch = md.match(/(?:builder|manufacturer|make|brand)[:\s]*([A-Z][a-zA-Z\s&-]+)/im);
      if (builderMatch) { const b = builderMatch[1].trim(); if (b.length > 2 && b.length < 40) htmlBuilder = b; }
    }
  }

  // Clean up garbage location values
  if (htmlLocation && (htmlLocation.includes("bgrp.io") || htmlLocation.includes("detected"))) {
    htmlLocation = null;
  }

  // Validate HTML-extracted fields: reject values that look like code/CSS/JS garbage
  function isClean(val: string | null): boolean {
    if (!val) return false;
    if (val.length > 80) return false;
    if (/[{}<>="\/\\]|function|class=|style=|data-|\.js|\.css|\.jpg|\.png|\.com\/|width|height|padding|margin|display|position|action=|label=|href|src=|react-|select\s/i.test(val)) return false;
    return true;
  }

  // Detect if HTML came from a DIFFERENT page (redirect/search results)
  // Check both builder AND model — "Sea Ray SPX 210" ≠ "Sea Ray 400 SLX"
  const htmlMatchesUrl = (() => {
    if (!htmlBuilder && !htmlName) return true; // no HTML data to validate
    if (!urlData.builder) return true; // no URL builder to compare against
    const urlBuilder = urlData.builder.toLowerCase();
    const hBuilder = (htmlBuilder || "").toLowerCase();
    const hName = (htmlName || "").toLowerCase();

    // Step 1: Builder must match
    const builderMatches = hBuilder.includes(urlBuilder) || hName.includes(urlBuilder) ||
           urlBuilder.includes(hBuilder);
    if (!builderMatches) return false;

    // Step 2: If we have a model number from the URL, check it appears in HTML name
    // This catches cases like "Sea Ray SPX 210" (HTML) vs "Sea Ray 400 SLX" (URL)
    if (urlData.model) {
      const urlModelNum = urlData.model.match(/\d{2,3}/)?.[0];
      if (urlModelNum && hName) {
        // HTML name should contain the model number from the URL
        if (!hName.includes(urlModelNum)) return false;
      }
    }

    return true;
  })();

  // If HTML came from wrong page, discard ALL HTML-scraped data
  if (!htmlMatchesUrl) {
    htmlName = null;
    htmlBuilder = null;
    htmlModel = null;
    htmlPrice = null;
    htmlPriceNum = null;
    htmlYear = null;
    htmlLengthFt = null;
    htmlLengthM = null;
    htmlBeamFt = null;
    htmlBeamM = null;
    htmlSpeed = null;
    htmlCabins = null;
    htmlGuests = null;
    htmlRange = null;
    htmlEngine = null;
    htmlEngineHours = null;
    htmlLocation = null;
    // Wipe HTML-extracted image since HTML didn't match — but Firecrawl image/screenshot may still be valid
    htmlImageUrl = null;
    htmlType = null;
  }

  // Validate spec database length against inferred length — if >40% off, it matched a wrong model
  let trustedSpecLengthFt = specData.lengthFt ?? null;
  let trustedSpecLengthM = specData.lengthM ?? null;
  if (inferredLengthFt && trustedSpecLengthFt) {
    const ratio = trustedSpecLengthFt / inferredLengthFt;
    if (ratio > 1.4 || ratio < 0.6) {
      trustedSpecLengthFt = null;
      trustedSpecLengthM = null;
    }
  }

  // Merge priority: HTML scraped > validated spec database > inferred from model > URL-parsed > defaults
  const mergedLengthFt = htmlLengthFt ?? trustedSpecLengthFt ?? inferredLengthFt ?? urlData.lengthFt ?? null;
  const mergedLengthM = htmlLengthM ?? trustedSpecLengthM ?? (inferredLengthFt ? ftToM(inferredLengthFt) : null) ?? urlData.lengthM ?? null;

  // Build the name: prefer URL-parsed name when HTML is unreliable
  const finalName = (() => {
    if (htmlName && htmlName !== "Unknown Yacht" && htmlName.length > 5 &&
        isClean(htmlName) && !/yacht sales|boats for sale|not found|error|^boats?$/i.test(htmlName)) {
      return htmlName;
    }
    if (urlData.name) return urlData.name;
    // Construct from parts
    const parts = [urlData.year, urlData.builder, urlData.model].filter(Boolean);
    return parts.length > 0 ? parts.join(" ") : "Unknown Yacht";
  })();

  return {
    name: finalName,
    builder: (isClean(htmlBuilder) ? htmlBuilder : null) || urlData.builder || null,
    model: (isClean(htmlModel) ? htmlModel : null) || urlData.model || null,
    type: isClean(htmlType) ? htmlType : (specData.type || profileData.type || null),
    year: htmlYear || urlData.year || null,
    price: htmlPrice ?? null,
    priceNum: htmlPriceNum ?? null,
    lengthFt: mergedLengthFt,
    lengthM: mergedLengthM,
    beamFt: htmlBeamFt ?? specData.beamFt ?? profileData.beamFt ?? null,
    beamM: htmlBeamM ?? specData.beamM ?? profileData.beamM ?? null,
    maxSpeed: htmlSpeed ?? specData.maxSpeed ?? profileData.maxSpeed ?? null,
    cabins: htmlCabins ?? ((specData.cabins && (specData.cabins > 1 || (mergedLengthFt ?? 0) < 50)) ? specData.cabins : null) ?? profileData.cabins ?? null,
    guests: htmlGuests ?? ((specData.guests && (specData.guests > 1 || (mergedLengthFt ?? 0) < 50)) ? specData.guests : null) ?? profileData.guests ?? null,
    range: htmlRange ?? specData.range ?? profileData.range ?? null,
    engine: (isClean(htmlEngine) ? htmlEngine : null) ?? specData.engine ?? profileData.engine ?? null,
    engineHours: htmlEngineHours ?? null,
    location: isClean(htmlLocation) ? htmlLocation : null,
    imageUrl: htmlImageUrl || fetchResult.firecrawlImageUrl || fetchResult.firecrawlScreenshot || generateFallbackImage(urlData.builder ?? null, profileData.type ?? specData.type ?? null),
    source,
    url,
  };
}

/* ------------------------------------------------------------------ */
/*  API Handler                                                        */
/* ------------------------------------------------------------------ */

export async function GET(request: NextRequest) {
  const url = request.nextUrl.searchParams.get("url");

  if (!url) {
    return NextResponse.json({ error: "Missing url parameter" }, { status: 400 });
  }

  // URL validation + SSRF protection
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return NextResponse.json({ error: "Invalid URL protocol" }, { status: 400 });
  }

  const hostname = parsed.hostname.toLowerCase();
  if (
    hostname === "localhost" ||
    hostname.endsWith(".local") ||
    /^127\./.test(hostname) ||
    /^10\./.test(hostname) ||
    /^192\.168\./.test(hostname) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(hostname) ||
    hostname === "169.254.169.254" ||
    hostname === "[::1]" ||
    hostname === "0.0.0.0"
  ) {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  try {
    const data = await scrapeYacht(url);
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-cache" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scrape";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
