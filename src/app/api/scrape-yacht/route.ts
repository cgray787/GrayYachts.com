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
        if (n && n >= 1950 && n <= 2030) return n;
      }
    }
  }

  const s = firstMatch(html,
    /(?:year|model\s*year)[^>]*?(\d{4})/i,
    /(?:built|launched)\s*(?:in)?\s*(\d{4})/i,
  );
  const n = parseNumber(s);
  return (n && n >= 1950 && n <= 2030) ? n : null;
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

async function fetchWithFallbacks(url: string): Promise<string> {
  const headers = {
    "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36",
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-US,en;q=0.9",
  };

  // Strategy 1: Direct fetch
  try {
    const res = await fetch(url, { headers });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  // Strategy 2: allorigins.win proxy (CORS proxy with different IP)
  try {
    const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl);
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  // Strategy 3: Google Webcache
  try {
    const cacheUrl = `https://webcache.googleusercontent.com/search?q=cache:${encodeURIComponent(url)}`;
    const res = await fetch(cacheUrl, { headers });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  // Strategy 4: archive.org Wayback Machine (latest snapshot)
  try {
    const wbUrl = `https://web.archive.org/web/2024/${url}`;
    const res = await fetch(wbUrl, { headers });
    if (res.ok) {
      const html = await res.text();
      if (html.length > 500) return html;
    }
  } catch { /* try next */ }

  throw new Error("All fetch strategies failed — site may be blocking automated access");
}

async function scrapeYacht(url: string): Promise<ScrapedYacht> {
  const source = detectSource(url);

  const html = await fetchWithFallbacks(url);

  // Extract structured data sources
  const jsonLd = extractJsonLd(html);
  const og = extractOg(html);
  const title = extractTitle(html);

  // Extract all fields
  const { name, builder, model } = extractNameAndBuilder(html, og, jsonLd, title);
  const { price, priceNum } = extractPrice(html, jsonLd);
  const length = extractLength(html, jsonLd);
  const beam = extractBeam(html);
  const year = extractYear(html, jsonLd);

  return {
    name,
    builder,
    model,
    type: firstMatch(html,
      /(?:boat|vessel|hull)\s*type[^>]*?[:\-]\s*([^<,]{3,30})/i,
      /(?:motor\s*yacht|sailing\s*yacht|catamaran|sportfish|trawler|center\s*console|flybridge|express)/i,
    ),
    year,
    price,
    priceNum,
    lengthFt: length.ft,
    lengthM: length.m,
    beamFt: beam.ft,
    beamM: beam.m,
    maxSpeed: extractSpeed(html),
    cabins: extractCabins(html),
    guests: extractGuests(html),
    range: extractRange(html),
    engine: extractEngine(html),
    engineHours: extractEngineHours(html),
    location: extractLocation(html, jsonLd),
    imageUrl: extractImage(html, og, jsonLd),
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
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scrape";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
