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

    // Extract year: 4-digit number between 1970–2030
    const yearMatch = slug.match(/\b(19[7-9]\d|20[0-3]\d)\b/);
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
        if (afterBuilder.length > 1) {
          result.model = afterBuilder.split(" ").map(w => w[0]?.toUpperCase() + w.slice(1)).join(" ");
        }
      }
      result.name = `${result.year} ${result.builder}${result.model ? " " + result.model : ""}`;
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

async function lookupSpecsFromDatabase(
  builder: string | null,
  model: string | null
): Promise<Partial<ScrapedYacht>> {
  if (!builder) return {};

  const searchTerm = `${builder}${model ? " " + model : ""}`.toLowerCase().replace(/\s+/g, "-");

  // Try superyachts.com — they allow server-side access
  const specUrls = [
    `https://www.superyachts.com/new-build/models/${searchTerm}-specification/specs/`,
    `https://www.superyachts.com/new-build/models/${searchTerm}/specs/`,
  ];

  for (const specUrl of specUrls) {
    try {
      const res = await fetch(specUrl, { headers: FETCH_HEADERS });
      if (!res.ok) continue;
      const html = await res.text();
      if (html.length < 500) continue;

      // Found a spec page! Extract data
      const result: Partial<ScrapedYacht> = {};

      // Length
      const lengthMatch = html.match(/(?:length|loa)[^>]*?(\d+(?:\.\d+)?)\s*m/i);
      if (lengthMatch) {
        const m = parseFloat(lengthMatch[1]);
        if (m > 5 && m < 200) {
          result.lengthM = m;
          result.lengthFt = Math.round(m * 3.281 * 10) / 10;
        }
      }

      // Beam
      const beamMatch = html.match(/beam[^>]*?(\d+(?:\.\d+)?)\s*m/i);
      if (beamMatch) {
        const m = parseFloat(beamMatch[1]);
        if (m > 2 && m < 30) {
          result.beamM = m;
          result.beamFt = Math.round(m * 3.281 * 10) / 10;
        }
      }

      // Speed
      const speedMatch = html.match(/(?:max|top)\s*speed[^>]*?(\d+(?:\.\d+)?)\s*(?:kn|knots)/i)
        || html.match(/(\d+(?:\.\d+)?)\s*(?:kn|knots)/i);
      if (speedMatch) {
        const s = parseFloat(speedMatch[1]);
        if (s > 3 && s < 80) result.maxSpeed = s;
      }

      // Cabins
      const cabinMatch = html.match(/(\d+)\s*(?:cabin|stateroom)/i)
        || html.match(/cabin[s]?\s*[:\-]?\s*(\d+)/i);
      if (cabinMatch) {
        const c = parseInt(cabinMatch[1]);
        if (c >= 1 && c <= 20) result.cabins = c;
      }

      // Guests
      const guestMatch = html.match(/(\d+)\s*(?:guest|passenger)/i)
        || html.match(/(?:guest|passenger)[s]?\s*[:\-]?\s*(\d+)/i);
      if (guestMatch) {
        const g = parseInt(guestMatch[1] || guestMatch[2] || "0");
        if (g >= 1 && g <= 50) result.guests = g;
      }

      // Engine
      const enginePatterns = [
        /(?:engine|power|propulsion)[^<]{0,10}[:\-]\s*([^<]{5,80})/i,
        /(?:MTU|Caterpillar|Rolls[\s-]Royce|CAT|MAN|Volvo\s*Penta|Cummins|Yanmar)[^<]{0,60}/i,
      ];
      for (const p of enginePatterns) {
        const m = html.match(p);
        if (m) {
          const val = (m[1] || m[0]).trim().replace(/<[^>]*>/g, "").replace(/\s+/g, " ");
          if (val.length > 4 && val.length < 100 && !/[{}<>=]/.test(val)) {
            result.engine = val;
            break;
          }
        }
      }

      // Range
      const rangeMatch = html.match(/range[^>]*?(\d[\d,]*)\s*(?:nm|nmi|nautical)/i);
      if (rangeMatch) {
        const r = parseFloat(rangeMatch[1].replace(/,/g, ""));
        if (r > 50 && r < 20000) result.range = r;
      }

      // Hull material
      const hullMatch = html.match(/(?:hull|material)[^>]*?(aluminum|aluminium|steel|fiberglass|composite|carbon\s*fiber|grp)/i);
      if (hullMatch) {
        result.type = hullMatch[1].charAt(0).toUpperCase() + hullMatch[1].slice(1) + " Yacht";
      }

      return result;
    } catch { /* try next URL */ }
  }

  return {};
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

  // If listing page blocked, try spec database sites
  const specData = (!html) ? await lookupSpecsFromDatabase(urlData.builder ?? null, urlData.model ?? null) : {};

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
    name: (htmlName && htmlName !== "Unknown Yacht" && isClean(htmlName) && !htmlName.toLowerCase().includes("yacht sales") && !htmlName.toLowerCase().includes("boats for sale")) ? htmlName : urlData.name || "Unknown Yacht",
    builder: (isClean(htmlBuilder) ? htmlBuilder : null) || urlData.builder || null,
    model: (isClean(htmlModel) ? htmlModel : null) || urlData.model || null,
    type: isClean(htmlType) ? htmlType : (specData.type || null),
    year: htmlYear || urlData.year || null,
    price: htmlPrice,
    priceNum: htmlPriceNum,
    lengthFt: htmlLengthFt || specData.lengthFt || urlData.lengthFt || null,
    lengthM: htmlLengthM || specData.lengthM || urlData.lengthM || null,
    beamFt: htmlBeamFt || specData.beamFt || null,
    beamM: htmlBeamM || specData.beamM || null,
    maxSpeed: htmlSpeed || specData.maxSpeed || null,
    cabins: htmlCabins || specData.cabins || null,
    guests: htmlGuests || specData.guests || null,
    range: htmlRange || specData.range || null,
    engine: (isClean(htmlEngine) ? htmlEngine : null) || specData.engine || null,
    engineHours: htmlEngineHours,
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
      headers: { "Cache-Control": "public, max-age=3600" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to scrape";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
