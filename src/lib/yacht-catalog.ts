/**
 * Shared yacht-catalog data + helpers used by both the
 * /catalog management page and the /compare
 * comparison page. Both pages persist into the same localStorage key, so
 * adding a yacht in one tab is immediately available in the other.
 */

export interface YachtListing {
  id: string;
  source: string;
  sourceBadgeColor: string;
  name: string;
  builder: string;
  type: string;
  year: number;
  price: string;
  priceNum: number;
  length: string;
  lengthNum: number;
  beam: string;
  beamNum: number;
  maxSpeed: string;
  maxSpeedNum: number;
  cabins: string;
  cabinsNum: number;
  range: string;
  rangeNum: number;
  location: string;
  engine: string;
  engineHours: string;
  engineHoursNum: number;
  url: string;
  gradient: string;
  imageUrl: string | null;
  /** Server-flagged sanity issues (length mismatch, implausible range, etc.). */
  flags?: string[];
  confidence?: "high" | "medium" | "low";
  /** User has explicitly confirmed the values are accurate. */
  verified?: boolean;
  /** Field paths the user manually edited; never overwritten by a re-scrape. */
  edited?: string[];
}

export interface ScrapeResult {
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
  flags?: string[];
  confidence?: "high" | "medium" | "low";
  error?: string;
}

export const SOURCE_COLORS: Record<string, string> = {
  // High-volume aggregators
  YachtWorld: "bg-emerald-400/10 text-emerald-400",
  BoatTrader: "bg-blue-400/10 text-blue-400",
  "boats.com": "bg-purple-400/10 text-purple-400",
  "Yacht.de": "bg-cyan-400/10 text-cyan-400",
  RightBoat: "bg-cyan-400/10 text-cyan-400",
  TheYachtMarket: "bg-cyan-400/10 text-cyan-400",
  YachtBroker: "bg-cyan-400/10 text-cyan-400",
  YATCO: "bg-emerald-400/10 text-emerald-400",
  // Brokerage houses
  Denison: "bg-amber-400/10 text-amber-400",
  Fraser: "bg-amber-400/10 text-amber-400",
  Burgess: "bg-amber-400/10 text-amber-400",
  "Northrop & Johnson": "bg-amber-400/10 text-amber-400",
  "Camper & Nicholsons": "bg-amber-400/10 text-amber-400",
  IYC: "bg-amber-400/10 text-amber-400",
  Moran: "bg-amber-400/10 text-amber-400",
  Edmiston: "bg-amber-400/10 text-amber-400",
  HMY: "bg-amber-400/10 text-amber-400",
  "SI Yachts": "bg-amber-400/10 text-amber-400",
  Galati: "bg-amber-400/10 text-amber-400",
  "United Yacht": "bg-amber-400/10 text-amber-400",
  "Worth Avenue Yachts": "bg-amber-400/10 text-amber-400",
  // Misc
  "Yacht Way": "bg-teal-400/10 text-teal-400",
  Listing: "bg-text-secondary/10 text-text-secondary",
};

export const GRADIENTS = [
  "from-slate-700 via-slate-600 to-blue-900",
  "from-blue-900 via-indigo-800 to-slate-700",
  "from-slate-800 via-teal-900 to-slate-700",
  "from-slate-800 via-emerald-900 to-slate-700",
  "from-indigo-900 via-purple-900 to-slate-800",
  "from-slate-700 via-cyan-900 to-slate-800",
  "from-slate-800 via-rose-900 to-slate-700",
];

export const SEED_YACHTS: YachtListing[] = [
  {
    id: "serenity-ii",
    source: "YachtWorld",
    sourceBadgeColor: "bg-emerald-400/10 text-emerald-400",
    name: "Serenity II",
    builder: "Benetti",
    type: "Motor Yacht",
    year: 2022,
    price: "$8,200,000",
    priceNum: 8200000,
    length: "42m (137.8 ft)",
    lengthNum: 42,
    beam: "8.5m (27.9 ft)",
    beamNum: 8.5,
    maxSpeed: "18 knots",
    maxSpeedNum: 18,
    cabins: "5 cabins / 10 guests",
    cabinsNum: 5,
    range: "3,200 nm",
    rangeNum: 3200,
    location: "Monaco",
    engine: "2× MTU 12V 2000 M72",
    engineHours: "620 hrs",
    engineHoursNum: 620,
    url: "https://www.yachtworld.com/yacht/2022-benetti-oasis-40m-8267590",
    gradient: "from-slate-700 via-slate-600 to-blue-900",
    imageUrl: null,
  },
  {
    id: "windchaser",
    source: "BoatTrader",
    sourceBadgeColor: "bg-blue-400/10 text-blue-400",
    name: "Windchaser",
    builder: "Oyster",
    type: "Sailing Yacht",
    year: 2021,
    price: "$4,750,000",
    priceNum: 4750000,
    length: "28m (91.9 ft)",
    lengthNum: 28,
    beam: "6.8m (22.3 ft)",
    beamNum: 6.8,
    maxSpeed: "12 knots",
    maxSpeedNum: 12,
    cabins: "3 cabins / 6 guests",
    cabinsNum: 3,
    range: "Unlimited (sail)",
    rangeNum: 99999,
    location: "Palma de Mallorca",
    engine: "1× Yanmar 4JH80",
    engineHours: "1,450 hrs",
    engineHoursNum: 1450,
    url: "https://www.boattrader.com/boat/2021-oyster-745-8150322",
    gradient: "from-blue-900 via-indigo-800 to-slate-700",
    imageUrl: null,
  },
  {
    id: "aegean-star",
    source: "YachtWorld",
    sourceBadgeColor: "bg-emerald-400/10 text-emerald-400",
    name: "Aegean Star",
    builder: "Lagoon",
    type: "Catamaran",
    year: 2020,
    price: "$3,100,000",
    priceNum: 3100000,
    length: "35m (114.8 ft)",
    lengthNum: 35,
    beam: "10.2m (33.5 ft)",
    beamNum: 10.2,
    maxSpeed: "10 knots",
    maxSpeedNum: 10,
    cabins: "4 cabins / 8 guests",
    cabinsNum: 4,
    range: "1,800 nm",
    rangeNum: 1800,
    location: "Athens",
    engine: "2× Volvo D4-300",
    engineHours: "2,100 hrs",
    engineHoursNum: 2100,
    url: "https://www.yachtworld.com/yacht/2020-lagoon-seventy-7-8194001",
    gradient: "from-slate-800 via-teal-900 to-slate-700",
    imageUrl: null,
  },
  {
    id: "pacific-horizon",
    source: "Denison",
    sourceBadgeColor: "bg-amber-400/10 text-amber-400",
    name: "Pacific Horizon",
    builder: "Nordhavn",
    type: "Trawler",
    year: 2019,
    price: "$5,900,000",
    priceNum: 5900000,
    length: "36m (118.1 ft)",
    lengthNum: 36,
    beam: "7.8m (25.6 ft)",
    beamNum: 7.8,
    maxSpeed: "12 knots",
    maxSpeedNum: 12,
    cabins: "4 cabins / 8 guests",
    cabinsNum: 4,
    range: "4,500 nm",
    rangeNum: 4500,
    location: "Seattle, WA",
    engine: "2× John Deere 6135",
    engineHours: "3,800 hrs",
    engineHoursNum: 3800,
    url: "https://www.denisonyachtsales.com/yacht/nordhavn-120",
    gradient: "from-slate-800 via-emerald-900 to-slate-700",
    imageUrl: null,
  },
  {
    id: "blue-marlin",
    source: "boats.com",
    sourceBadgeColor: "bg-purple-400/10 text-purple-400",
    name: "Blue Marlin",
    builder: "Viking",
    type: "Sportfisher",
    year: 2023,
    price: "$6,450,000",
    priceNum: 6450000,
    length: "24m (80 ft)",
    lengthNum: 24,
    beam: "6.4m (21 ft)",
    beamNum: 6.4,
    maxSpeed: "38 knots",
    maxSpeedNum: 38,
    cabins: "3 cabins / 6 guests",
    cabinsNum: 3,
    range: "600 nm",
    rangeNum: 600,
    location: "Fort Lauderdale, FL",
    engine: "2× MTU 16V 2000 M96L",
    engineHours: "280 hrs",
    engineHoursNum: 280,
    url: "https://www.boats.com/power-boats/2023-viking-80-8301234",
    gradient: "from-indigo-900 via-purple-900 to-slate-800",
    imageUrl: null,
  },
];

// v6: post-merge sanity-check + per-yacht flags/verified/edited fields.
export const STORAGE_KEY = "gy-compare-catalog-v6";

/** localStorage key holding which catalog yachts are pinned to LEFT/RIGHT. */
export const SLOTS_KEY = "gy-compare-slots";

export function loadCatalog(): YachtListing[] {
  if (typeof window === "undefined") return SEED_YACHTS;
  // One-time cleanup: drop any legacy gy-compare-catalog-* entries from older schemas.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("gy-compare-catalog-") && k !== STORAGE_KEY) {
        localStorage.removeItem(k);
      }
    }
  } catch {
    /* ignore */
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as YachtListing[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch {
    /* ignore */
  }
  return SEED_YACHTS;
}

export function saveCatalog(catalog: YachtListing[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch {
    /* ignore */
  }
}

/**
 * Routed through the /api/yacht-image proxy so images survive Firecrawl's
 * signed-URL expiry. Bump the version when proxy logic changes so existing
 * edge cache entries don't keep serving the old image.
 */
// v5: the proxy now answers every failure with a placeholder image instead of
// JSON, so a listing whose photo cannot be fetched still renders something.
const IMAGE_PROXY_VERSION = 5;
export function yachtImageSrc(listingUrl: string): string {
  return `/api/yacht-image?url=${encodeURIComponent(listingUrl)}&v=${IMAGE_PROXY_VERSION}`;
}

/** Pull the first numeric value out of a display string like "12.5m (40 ft)" or "$2,000,000". */
export function extractFirstNumber(text: string): number {
  const cleaned = text.replace(/,/g, "");
  const m = cleaned.match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

export async function scrapeYachtFromUrl(url: string): Promise<YachtListing> {
  // Check if URL matches a seed yacht (so demo URLs don't hit the API)
  const seed = SEED_YACHTS.find(
    (y) => y.url.toLowerCase() === url.toLowerCase(),
  );
  if (seed) return { ...seed };

  const res = await fetch(`/api/scrape-yacht?url=${encodeURIComponent(url)}`);
  const data: ScrapeResult = await res.json();

  if (!res.ok || data.error) {
    throw new Error(data.error || "Failed to scrape listing");
  }

  // Hash for gradient selection
  let hash = 0;
  for (let i = 0; i < url.length; i++) {
    hash = (hash * 31 + url.charCodeAt(i)) | 0;
  }

  const source = data.source || "Listing";
  const lengthM = data.lengthM ?? (data.lengthFt ? Math.round(data.lengthFt * 0.3048 * 10) / 10 : null);
  const beamM = data.beamM ?? (data.beamFt ? Math.round(data.beamFt * 0.3048 * 10) / 10 : null);
  const lengthFt = data.lengthFt ?? (data.lengthM ? Math.round(data.lengthM * 3.281 * 10) / 10 : null);
  const beamFt = data.beamFt ?? (data.beamM ? Math.round(data.beamM * 3.281 * 10) / 10 : null);
  const cabinsN = data.cabins ?? 0;
  const guestsN = data.guests ?? (cabinsN ? cabinsN * 2 : 0);

  return {
    id: `scraped-${Date.now()}-${Math.abs(hash)}`,
    source,
    sourceBadgeColor: SOURCE_COLORS[source] ?? SOURCE_COLORS.Listing,
    name: data.name ?? "Unknown Yacht",
    builder: data.builder ?? data.model ?? "Unknown",
    type: data.type ?? "Yacht",
    year: data.year ?? 0,
    price: data.price ?? "Price on Request",
    priceNum: data.priceNum ?? 0,
    length: lengthM && lengthFt ? `${lengthM}m (${lengthFt} ft)` : lengthFt ? `${lengthFt} ft` : lengthM ? `${lengthM}m` : "N/A",
    lengthNum: lengthM ?? 0,
    beam: beamM && beamFt ? `${beamM}m (${beamFt} ft)` : beamFt ? `${beamFt} ft` : beamM ? `${beamM}m` : "N/A",
    beamNum: beamM ?? 0,
    maxSpeed: data.maxSpeed ? `${data.maxSpeed} knots` : "N/A",
    maxSpeedNum: data.maxSpeed ?? 0,
    cabins: cabinsN
      ? `${cabinsN} cabin${cabinsN === 1 ? "" : "s"} / ${guestsN} guest${guestsN === 1 ? "" : "s"}`
      : "N/A",
    cabinsNum: cabinsN,
    range: data.range ? `${data.range.toLocaleString()} nm` : "N/A",
    rangeNum: data.range ?? 0,
    location: data.location ?? "Unknown",
    engine: data.engine ?? "N/A",
    engineHours: data.engineHours ? `${data.engineHours.toLocaleString()} hrs` : "N/A",
    engineHoursNum: data.engineHours ?? 0,
    url,
    gradient: GRADIENTS[Math.abs(hash) % GRADIENTS.length],
    imageUrl: data.imageUrl ?? null,
    flags: data.flags ?? [],
    confidence: data.confidence ?? "medium",
    verified: false,
    edited: [],
  };
}

/**
 * Which of two listings is the cheaper one, relative to the FIRST argument:
 * "a" = the first, "b" = the second, "tie" = no winner.
 *
 * Two traps this closes. A missing price is stored as 0, so a plain numeric
 * compare ranked a "price on request" listing as the cheapest boat on the
 * page. And the result is argument-relative, not slot-relative — reading it as
 * a slot is what made the right-hand card announce "(lower)" every time it
 * lost, so both cards claimed the lower price at once.
 */
export function comparePrice(mine: number, theirs: number): "a" | "b" | "tie" {
  if (!(mine > 0) || !(theirs > 0)) return "tie";
  if (mine === theirs) return "tie";
  return mine < theirs ? "a" : "b";
}
