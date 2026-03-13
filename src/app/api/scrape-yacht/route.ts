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

  // JSON-LD
  if (jsonLd?.image) {
    const img = jsonLd.image;
    if (typeof img === "string") return img;
    if (Array.isArray(img) && img[0]) return typeof img[0] === "string" ? img[0] : (img[0] as Record<string, string>).url;
    if (typeof img === "object") return (img as Record<string, string>).url;
  }

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

async function tryFetchHtml(url: string): Promise<string | null> {
  // Strategy 1: Direct fetch
  try {
    const res = await fetch(url, { headers: FETCH_HEADERS });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  // Strategy 2: allorigins.win proxy
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  return null;
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

        // 1. Extract param names
        const pStart = nuxtBlock.indexOf("(") + 1;
        const pEnd = nuxtBlock.indexOf(")");
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
/*  Main scraper — URL parsing + optional HTML scraping                */
/* ------------------------------------------------------------------ */

async function scrapeYacht(url: string): Promise<ScrapedYacht> {
  const source = detectSource(url);

  // ALWAYS parse the URL slug first — this never fails
  const urlData = parseUrlSlug(url);

  // Try to fetch HTML for richer data (but don't fail if blocked)
  const html = await tryFetchHtml(url);

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

  // Validate HTML-extracted fields: reject values that look like code/CSS/JS garbage
  function isClean(val: string | null): boolean {
    if (!val) return false;
    if (val.length > 80) return false;
    if (/[{}<>="\/\\]|function|class=|style=|data-|\.js|\.css|\.jpg|\.png|\.com\/|width|height|padding|margin|display|position|action=|label=|href|src=|react-|select\s/i.test(val)) return false;
    return true;
  }

  // Merge priority: HTML scraped > spec database > URL-parsed > defaults
  return {
    name: (htmlName && htmlName !== "Unknown Yacht" && htmlName.length > 5 && isClean(htmlName) && !/yacht sales|boats for sale|not found|error|^boats?$/i.test(htmlName)) ? htmlName : urlData.name || "Unknown Yacht",
    builder: (isClean(htmlBuilder) ? htmlBuilder : null) || urlData.builder || null,
    model: (isClean(htmlModel) ? htmlModel : null) || urlData.model || null,
    type: isClean(htmlType) ? htmlType : (specData.type || null),
    year: htmlYear || urlData.year || null,
    price: htmlPrice,
    priceNum: htmlPriceNum,
    lengthFt: htmlLengthFt ?? specData.lengthFt ?? urlData.lengthFt ?? null,
    lengthM: htmlLengthM ?? specData.lengthM ?? urlData.lengthM ?? null,
    beamFt: htmlBeamFt ?? specData.beamFt ?? null,
    beamM: htmlBeamM ?? specData.beamM ?? null,
    maxSpeed: htmlSpeed ?? specData.maxSpeed ?? null,
    cabins: htmlCabins ?? specData.cabins ?? null,
    guests: htmlGuests ?? specData.guests ?? null,
    range: htmlRange ?? specData.range ?? null,
    engine: (isClean(htmlEngine) ? htmlEngine : null) ?? specData.engine ?? null,
    engineHours: htmlEngineHours ?? null,
    location: isClean(htmlLocation) ? htmlLocation : null,
    imageUrl: htmlImageUrl,
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

  // Basic URL validation
  try {
    new URL(url);
  } catch {
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
