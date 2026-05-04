"use client";

import { useState, useCallback, useEffect, useRef, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  MapPin,
  ArrowUpDown,
  Ship,
  ShieldCheck,
  Link2,
  Pencil,
  Plus,
  GripVertical,
  Loader2,
  Trash2,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface YachtListing {
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
  // Self-check metadata. flags are produced by the server's sanity-check
  // pass; verified is set by the user clicking "Mark Reviewed". The UI
  // requires verified === true (or zero flags) before it considers the card
  // safe to share with a client.
  flags?: string[];
  confidence?: "high" | "medium" | "low";
  verified?: boolean;
  /** Field paths the user manually edited; never overwritten by a re-scrape. */
  edited?: string[];
}

/* ------------------------------------------------------------------ */
/*  Seed catalog                                                       */
/* ------------------------------------------------------------------ */

const SEED_YACHTS: YachtListing[] = [
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

/* ------------------------------------------------------------------ */
/*  URL → yacht resolver (real scraper)                                */
/* ------------------------------------------------------------------ */

const SOURCE_COLORS: Record<string, string> = {
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

const GRADIENTS = [
  "from-slate-700 via-slate-600 to-blue-900",
  "from-blue-900 via-indigo-800 to-slate-700",
  "from-slate-800 via-teal-900 to-slate-700",
  "from-slate-800 via-emerald-900 to-slate-700",
  "from-indigo-900 via-purple-900 to-slate-800",
  "from-slate-700 via-cyan-900 to-slate-800",
  "from-slate-800 via-rose-900 to-slate-700",
];

interface ScrapeResult {
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

async function scrapeYachtFromUrl(url: string): Promise<YachtListing> {
  // Check if URL matches a seed yacht
  const seed = SEED_YACHTS.find(
    (y) => y.url.toLowerCase() === url.toLowerCase()
  );
  if (seed) return { ...seed };

  // Call our server-side scraper API
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
    cabins: cabinsN ? `${cabinsN} cabins / ${guestsN} guests` : "N/A",
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

/* ------------------------------------------------------------------ */
/*  Yacht image (durable, proxy-backed)                                */
/* ------------------------------------------------------------------ */

/**
 * Build a stable image URL from a yacht listing URL. Routed through our
 * own /api/yacht-image proxy so the image survives Firecrawl's signed-URL
 * expiry, vendor downtime, and stale localStorage entries with a null
 * `imageUrl`. The proxy fetches via Firecrawl on first hit and is then
 * cached at Cloudflare's edge.
 *
 * The trailing `&v=N` is a manual cache-buster: bump it whenever the proxy
 * logic changes (e.g. og:image vs screenshot preference) so existing edge
 * cache entries don't keep serving the old bad image.
 */
const IMAGE_PROXY_VERSION = 2;
function yachtImageSrc(listingUrl: string): string {
  return `/api/yacht-image?url=${encodeURIComponent(listingUrl)}&v=${IMAGE_PROXY_VERSION}`;
}

function YachtImage({
  yacht,
  className,
}: {
  yacht: YachtListing;
  className?: string;
}) {
  if (!yacht.url) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={yachtImageSrc(yacht.url)}
      alt={yacht.name}
      loading="lazy"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        img.style.display = "none";
        // Surface failures so they're at least diagnosable in DevTools
        // instead of silently degrading to a gradient.
        if (typeof window !== "undefined") {
          console.warn("[YachtImage] failed to load", img.src);
        }
      }}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison helpers                                                 */
/* ------------------------------------------------------------------ */

type Winner = "a" | "b" | "tie";

function compareSpec(a: number, b: number, lowerIsBetter = false): Winner {
  if (a === b) return "tie";
  if (lowerIsBetter) return a < b ? "a" : "b";
  return a > b ? "a" : "b";
}

interface SpecField {
  label: string;
  key: keyof YachtListing;
  numKey: keyof YachtListing;
  lowerIsBetter?: boolean;
  isLocation?: boolean;
}

const SPEC_FIELDS: SpecField[] = [
  { label: "Length", key: "length", numKey: "lengthNum" },
  { label: "Beam", key: "beam", numKey: "beamNum" },
  { label: "Max Speed", key: "maxSpeed", numKey: "maxSpeedNum" },
  { label: "Cabins", key: "cabins", numKey: "cabinsNum" },
  { label: "Range", key: "range", numKey: "rangeNum" },
  { label: "Engine", key: "engine", numKey: "engine" },
  { label: "Engine Hours", key: "engineHours", numKey: "engineHoursNum", lowerIsBetter: true },
  { label: "Location", key: "location", numKey: "location", isLocation: true },
];

/* ------------------------------------------------------------------ */
/*  localStorage persistence                                           */
/* ------------------------------------------------------------------ */

// v6: post-merge sanity-check + per-yacht flags/verified/edited fields. Bumping
// the key force-wipes catalog entries scraped before the hallucination
// guardrails landed, since those entries carry baked-in wrong specs.
const STORAGE_KEY = "gy-compare-catalog-v6";

function loadCatalog(): YachtListing[] {
  if (typeof window === "undefined") return SEED_YACHTS;
  // One-time cleanup: drop any legacy gy-compare-catalog-* entries from older schemas.
  try {
    for (let i = localStorage.length - 1; i >= 0; i--) {
      const k = localStorage.key(i);
      if (k && k.startsWith("gy-compare-catalog-") && k !== STORAGE_KEY) {
        localStorage.removeItem(k);
      }
    }
  } catch { /* ignore */ }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as YachtListing[];
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { /* ignore */ }
  return SEED_YACHTS;
}

function saveCatalog(catalog: YachtListing[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(catalog));
  } catch { /* ignore */ }
}

/* ------------------------------------------------------------------ */
/*  Spec Row                                                           */
/* ------------------------------------------------------------------ */

/** Pull the first numeric value out of a display string like "12.5m (40 ft)" or "$2,000,000". */
function extractFirstNumber(text: string): number {
  const cleaned = text.replace(/,/g, "");
  const m = cleaned.match(/(-?\d+(?:\.\d+)?)/);
  return m ? parseFloat(m[1]) : 0;
}

/**
 * Inline-editable spec value. The parent always controls the value; on save
 * we hand the new string up so the parent can update the catalog (and any
 * numeric mirror of the field). Falls back to read-only when no `onSave`
 * is provided (used by the mobile comparison table).
 */
function EditableSpec({
  value,
  onSave,
  className,
  inputWidthClass = "w-44",
  textAlign = "right",
}: {
  value: string;
  onSave?: (next: string) => void;
  className?: string;
  inputWidthClass?: string;
  textAlign?: "left" | "right" | "center";
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  if (!onSave || !editing) {
    return (
      <button
        type="button"
        disabled={!onSave}
        onClick={() => {
          if (!onSave) return;
          setDraft(value); // seed the draft from the current value each time we enter edit mode
          setEditing(true);
        }}
        className={cn(
          "group inline-flex items-center gap-1.5 -mx-1 rounded px-1 transition-colors",
          onSave && "hover:bg-gold/5 cursor-text",
          className,
        )}
        title={onSave ? "Click to edit" : undefined}
      >
        <span>{value}</span>
        {onSave && <Pencil className="h-3 w-3 text-text-secondary opacity-0 transition-opacity group-hover:opacity-100" />}
      </button>
    );
  }

  return (
    <input
      autoFocus
      value={draft}
      onChange={(e) => setDraft(e.target.value)}
      onBlur={() => {
        if (draft !== value) onSave(draft);
        setEditing(false);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          if (draft !== value) onSave(draft);
          setEditing(false);
        } else if (e.key === "Escape") {
          setDraft(value);
          setEditing(false);
        }
      }}
      className={cn(
        "rounded border border-gold bg-bg-primary px-2 py-0.5 text-sm text-text-primary focus:outline-none",
        inputWidthClass,
        textAlign === "right" && "text-right",
        textAlign === "center" && "text-center",
      )}
    />
  );
}

function SpecRow({
  label,
  value,
  winner,
  side,
  isLocation,
  onSave,
}: {
  label: string;
  value: string;
  winner?: Winner;
  side: "a" | "b";
  isLocation?: boolean;
  onSave?: (next: string) => void;
}) {
  const isWinner = winner === side;
  const isLoser = winner !== undefined && winner !== "tie" && winner !== side;

  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span
        className={cn(
          "text-sm font-medium",
          isLocation
            ? "text-gold"
            : isWinner
              ? "text-success"
              : isLoser
                ? "text-text-secondary/60"
                : "text-text-primary"
        )}
      >
        {isLocation && <MapPin className="mr-1 inline h-3 w-3" />}
        <EditableSpec value={value} onSave={onSave} />
        {isWinner && !isLocation && (
          <span className="ml-1.5 text-[10px] text-success">&#9650;</span>
        )}
      </span>
    </div>
  );
}

/**
 * Self-check banner shown above each ComparisonCard.
 * - When the server flagged issues, it shows the count + a click-to-expand
 *   list and asks the user to confirm.
 * - When the user has manually marked the card reviewed, it shows a green
 *   "safe to share" badge with an undo button.
 * Until a card is reviewed (or has zero flags), the user has an explicit
 * affordance to confirm — the whole point being to never accidentally hand
 * a hallucinated number to a client.
 */
function ReviewBanner({
  yacht,
  onMarkVerified,
}: {
  yacht: YachtListing;
  onMarkVerified: (next: boolean) => void;
}) {
  const flags = yacht.flags ?? [];
  const verified = yacht.verified === true;
  const [open, setOpen] = useState(false);

  if (verified) {
    return (
      <div className="flex items-center justify-between border-b border-success/30 bg-success/5 px-4 py-2">
        <div className="flex items-center gap-2 text-xs">
          <ShieldCheck className="h-4 w-4 text-success" />
          <span className="font-medium text-success">Reviewed by you</span>
          <span className="text-text-secondary">— safe to share</span>
        </div>
        <button
          onClick={() => onMarkVerified(false)}
          className="rounded px-2 py-0.5 text-[10px] font-medium text-text-secondary transition-colors hover:bg-bg-primary hover:text-text-primary"
        >
          Unverify
        </button>
      </div>
    );
  }

  if (flags.length === 0) {
    return (
      <div className="flex items-center justify-between border-b border-border bg-bg-primary/40 px-4 py-2">
        <div className="flex items-center gap-2 text-xs text-text-secondary">
          <CheckCircle className="h-4 w-4 text-text-secondary" />
          <span>
            Confidence:{" "}
            <span className={cn(
              "font-semibold",
              yacht.confidence === "high" && "text-success",
              yacht.confidence === "medium" && "text-warning",
              yacht.confidence === "low" && "text-error",
            )}>
              {yacht.confidence ?? "medium"}
            </span>
            {" "}— confirm before sharing
          </span>
        </div>
        <button
          onClick={() => onMarkVerified(true)}
          className="rounded bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold transition-colors hover:bg-gold/20"
        >
          Mark Reviewed
        </button>
      </div>
    );
  }

  return (
    <div className="border-b border-warning/30 bg-warning/5">
      <div className="flex items-center justify-between px-4 py-2">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex items-center gap-2 text-xs"
        >
          <AlertTriangle className="h-4 w-4 text-warning" />
          <span className="font-medium text-warning">
            Needs review — {flags.length} issue{flags.length === 1 ? "" : "s"}
          </span>
          <ChevronDown className={cn("h-3 w-3 text-warning transition-transform", open && "rotate-180")} />
        </button>
        <button
          onClick={() => onMarkVerified(true)}
          className="rounded bg-gold/10 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-wide text-gold transition-colors hover:bg-gold/20"
          title="Confirm the values are correct (or fix them above) before sharing"
        >
          Mark Reviewed
        </button>
      </div>
      {open && (
        <ul className="space-y-1 px-4 pb-3 text-[11px] text-warning/90">
          {flags.map((f, i) => (
            <li key={i} className="flex gap-2">
              <span className="text-warning">·</span>
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Mobile Comparison Table                                            */
/* ------------------------------------------------------------------ */

function ComparisonTable({
  left,
  right,
}: {
  left: YachtListing;
  right: YachtListing;
}) {
  const priceWinner = compareSpec(left.priceNum, right.priceNum, true);

  const winnerColor = (winner: Winner, side: "a" | "b") =>
    winner === side
      ? "text-success font-medium"
      : winner === "tie"
        ? "text-text-primary"
        : "text-text-secondary/60";

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      {/* Yacht headers */}
      <div className="grid grid-cols-2 gap-px bg-border">
        {[left, right].map((yacht) => (
          <div key={yacht.id} className="bg-bg-card">
            <div className={cn("relative h-24 w-full bg-gradient-to-br", yacht.gradient)}>
              <YachtImage yacht={yacht} />
              <span className={cn("absolute left-2 top-2 z-10 rounded-full px-2 py-0.5 text-[10px] font-medium backdrop-blur-sm", yacht.sourceBadgeColor)}>
                {yacht.source}
              </span>
            </div>
            <div className="px-3 py-2">
              <p className="font-[family-name:var(--font-cormorant)] text-base font-light text-text-primary truncate">
                {yacht.name}
              </p>
              <p className="text-[11px] text-text-secondary truncate">
                {yacht.builder} &middot; {yacht.type} &middot; {yacht.year}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Spec table */}
      <table className="w-full table-fixed text-sm">
        <tbody>
          {/* Price row */}
          <tr className="border-t border-border">
            <td className="w-[38%] px-3 py-2.5 text-xs text-text-secondary">Price</td>
            <td className={cn("w-[31%] px-2 py-2.5 text-center truncate", winnerColor(priceWinner, "a"))}>
              {left.price}
            </td>
            <td className={cn("w-[31%] px-2 py-2.5 text-center truncate", winnerColor(priceWinner, "b"))}>
              {right.price}
            </td>
          </tr>

          {/* Spec rows */}
          {SPEC_FIELDS.map((field) => {
            const leftVal = String(left[field.key]);
            const rightVal = String(right[field.key]);
            const leftNum = typeof left[field.numKey] === "number" ? (left[field.numKey] as number) : 0;
            const rightNum = typeof right[field.numKey] === "number" ? (right[field.numKey] as number) : 0;

            let winner: Winner | undefined;
            if (!field.isLocation && leftNum !== 0 && rightNum !== 0) {
              winner = compareSpec(leftNum, rightNum, field.lowerIsBetter);
            }

            return (
              <tr key={field.label} className="border-t border-border/50">
                <td className="px-3 py-2.5 text-xs text-text-secondary">{field.label}</td>
                <td className={cn("px-2 py-2.5 text-center text-xs truncate", field.isLocation ? "text-gold" : winner ? winnerColor(winner, "a") : "text-text-primary")}>
                  {field.isLocation && <MapPin className="mr-0.5 inline h-3 w-3" />}
                  {leftVal}
                </td>
                <td className={cn("px-2 py-2.5 text-center text-xs truncate", field.isLocation ? "text-gold" : winner ? winnerColor(winner, "b") : "text-text-primary")}>
                  {field.isLocation && <MapPin className="mr-0.5 inline h-3 w-3" />}
                  {rightVal}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>

      {/* Footer links */}
      <div className="flex border-t border-border">
        {[left, right].map((yacht) => (
          <a
            key={yacht.id}
            href={yacht.url}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-1 items-center justify-center gap-1 py-3 text-[11px] text-gold transition-colors hover:text-gold-hover"
          >
            <ExternalLink className="h-3 w-3" />
            View Listing
          </a>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Comparison Card                                                    */
/* ------------------------------------------------------------------ */

function ComparisonCard({
  yacht,
  other,
  side,
  dragOver,
  onDragOver,
  onDragLeave,
  onDrop,
  onUpdate,
  onMarkVerified,
}: {
  yacht: YachtListing;
  other: YachtListing;
  side: "a" | "b";
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onUpdate: (
    field: keyof YachtListing,
    value: string,
    numField?: keyof YachtListing,
  ) => void;
  onMarkVerified: (verified: boolean) => void;
}) {
  const priceWinner = compareSpec(yacht.priceNum, other.priceNum, true);

  return (
    <div
      onDragOver={onDragOver}
      onDragLeave={onDragLeave}
      onDrop={onDrop}
      className={cn(
        "overflow-hidden rounded-xl border-2 bg-bg-card transition-all",
        dragOver
          ? "border-gold shadow-lg shadow-gold/10 scale-[1.01]"
          : yacht.verified
            ? "border-success/40"
            : (yacht.flags?.length ?? 0) > 0
              ? "border-warning/40"
              : "border-border",
      )}
    >
      {/* Drop hint */}
      {dragOver && (
        <div className="bg-gold/10 px-4 py-2 text-center text-xs font-medium text-gold">
          Drop here to compare
        </div>
      )}

      {/* Self-check banner */}
      <ReviewBanner yacht={yacht} onMarkVerified={onMarkVerified} />

      {/* Yacht image / gradient fallback */}
      <div className={cn("relative h-44 w-full bg-gradient-to-br", yacht.gradient)}>
        <YachtImage yacht={yacht} />
        <span
          className={cn(
            "absolute left-4 top-4 z-10 rounded-full px-3 py-1 text-xs font-medium backdrop-blur-sm",
            yacht.sourceBadgeColor
          )}
        >
          {yacht.source}
        </span>
      </div>

      {/* Content */}
      <div className="p-6">
        <h2 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
          <EditableSpec
            value={yacht.name}
            onSave={(next) => onUpdate("name", next)}
            inputWidthClass="w-full"
            textAlign="left"
          />
        </h2>
        <p className="mt-1 text-sm text-text-secondary">
          {yacht.builder} &middot; {yacht.type} &middot; {yacht.year}
        </p>

        {/* Price */}
        <div className="mt-4 mb-6">
          <span
            className={cn(
              "text-3xl font-semibold",
              priceWinner === side
                ? "text-success"
                : priceWinner === "tie"
                  ? "text-text-primary"
                  : "text-text-secondary/60"
            )}
          >
            <EditableSpec
              value={yacht.price}
              onSave={(next) => onUpdate("price", next, "priceNum")}
              inputWidthClass="w-44"
              textAlign="left"
            />
          </span>
          <span className="ml-2 text-xs text-text-secondary">
            asking price
            {priceWinner === side && (
              <span className="ml-1 text-success">(lower)</span>
            )}
          </span>
        </div>

        {/* Spec rows */}
        <div className="space-y-0">
          {SPEC_FIELDS.map((field) => {
            const val = String(yacht[field.key]);
            const myNum = typeof yacht[field.numKey] === "number" ? (yacht[field.numKey] as number) : 0;
            const otherNum = typeof other[field.numKey] === "number" ? (other[field.numKey] as number) : 0;

            let winner: Winner | undefined;
            if (!field.isLocation && typeof yacht[field.numKey] === "number") {
              // Compare this card's value vs the other card's value
              // Result "a" means first arg wins => this card wins => side wins
              const raw = compareSpec(myNum, otherNum, field.lowerIsBetter);
              winner = raw === "a" ? side : raw === "b" ? (side === "a" ? "b" : "a") : "tie";
            }

            return (
              <SpecRow
                key={field.label}
                label={field.label}
                value={val}
                winner={winner}
                side={side}
                isLocation={field.isLocation}
                onSave={(next) =>
                  onUpdate(
                    field.key,
                    next,
                    typeof yacht[field.numKey] === "number" ? field.numKey : undefined,
                  )
                }
              />
            );
          })}
        </div>

        {/* Footer */}
        <div className="mt-6 flex items-center justify-end border-t border-border pt-4">
          <a
            href={yacht.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-xs text-gold transition-colors hover:text-gold-hover"
          >
            <ExternalLink className="h-3 w-3" />
            View Listing
          </a>
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Catalog Yacht Thumbnail (draggable)                                */
/* ------------------------------------------------------------------ */

function CatalogCard({
  yacht,
  isActive,
  onAssign,
  onRemove,
  isSeed,
}: {
  yacht: YachtListing;
  isActive: boolean;
  onAssign: (slot: "a" | "b") => void;
  onRemove: () => void;
  isSeed: boolean;
}) {
  const handleDragStart = (e: DragEvent<HTMLDivElement>) => {
    e.dataTransfer.setData("text/plain", yacht.id);
    e.dataTransfer.effectAllowed = "move";
  };

  return (
    <div
      draggable
      onDragStart={handleDragStart}
      className={cn(
        "group relative flex cursor-grab items-center gap-3 rounded-lg border bg-bg-card p-3 transition-all active:cursor-grabbing",
        isActive
          ? "border-gold/50 bg-gold/5"
          : "border-border hover:border-gold/30"
      )}
    >
      {/* Drag handle */}
      <GripVertical className="h-4 w-4 shrink-0 text-text-secondary/40" />

      {/* Mini thumbnail / gradient swatch */}
      <div
        className={cn(
          "relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br",
          yacht.gradient
        )}
      >
        <YachtImage yacht={yacht} />
      </div>

      {/* Info */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {yacht.name}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {yacht.builder} &middot; {yacht.year} &middot; {yacht.price}
        </p>
      </div>

      {/* Source badge */}
      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block",
          yacht.sourceBadgeColor
        )}
      >
        {yacht.source}
      </span>

      {/* Actions – LEFT/RIGHT on hover */}
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <button
          onClick={() => onAssign("a")}
          className="rounded px-1.5 py-1 text-[10px] font-semibold text-gold transition-colors hover:bg-gold/10"
          title="Compare as Left"
        >
          LEFT
        </button>
        <button
          onClick={() => onAssign("b")}
          className="rounded px-1.5 py-1 text-[10px] font-semibold text-gold transition-colors hover:bg-gold/10"
          title="Compare as Right"
        >
          RIGHT
        </button>
      </div>

      {/* Delete – always visible */}
      <button
        onClick={onRemove}
        className="shrink-0 rounded p-1 text-text-secondary/40 transition-colors hover:text-error"
        title="Remove from catalog"
      >
        <Trash2 className="h-3 w-3" />
      </button>

      {isActive && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-bg-primary">
          ✓
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Recently-added Yachts dropdown                                     */
/* ------------------------------------------------------------------ */

function RecentDropdown({
  catalog,
  onPick,
}: {
  catalog: YachtListing[];
  onPick: (yacht: YachtListing) => void;
}) {
  // Newest first — catalog appends new yachts at the end
  const recent = [...catalog].reverse().slice(0, 8);

  return (
    <div className="absolute left-0 right-0 top-full z-30 mt-2 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl shadow-black/40">
      <div className="border-b border-border/60 px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-text-secondary">
        Recently Added
      </div>
      {recent.length === 0 ? (
        <div className="px-3 py-4 text-center text-xs text-text-secondary">
          No yachts in catalog yet.
        </div>
      ) : (
        <ul className="max-h-72 overflow-y-auto py-1">
          {recent.map((yacht) => (
            <li key={yacht.id}>
              <button
                type="button"
                onClick={() => onPick(yacht)}
                className="flex w-full items-center gap-3 px-3 py-2 text-left transition-colors hover:bg-gold/5"
              >
                <div
                  className={cn(
                    "relative h-9 w-12 shrink-0 overflow-hidden rounded-md bg-gradient-to-br",
                    yacht.gradient
                  )}
                >
                  <YachtImage yacht={yacht} />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium text-text-primary">
                    {yacht.name}
                  </p>
                  <p className="truncate text-[11px] text-text-secondary">
                    {yacht.builder} &middot; {yacht.year} &middot; {yacht.price}
                  </p>
                </div>
                <span
                  className={cn(
                    "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block",
                    yacht.sourceBadgeColor
                  )}
                >
                  {yacht.source}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CompareYachtsPage() {
  const [catalog, setCatalog] = useState<YachtListing[]>(() => loadCatalog());
  const [leftId, setLeftId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("gy-compare-slots") || "{}");
        if (saved.leftId) return saved.leftId as string;
      } catch { /* ignore */ }
    }
    return catalog[0]?.id ?? "";
  });
  const [rightId, setRightId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem("gy-compare-slots") || "{}");
        if (saved.rightId) return saved.rightId as string;
      } catch { /* ignore */ }
    }
    return catalog[1]?.id ?? "";
  });
  const [dragOverSlot, setDragOverSlot] = useState<"a" | "b" | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlLeft, setUrlLeft] = useState("");
  const [urlRight, setUrlRight] = useState("");
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [openRecentSlot, setOpenRecentSlot] = useState<"a" | "b" | null>(null);
  const recentRefA = useRef<HTMLDivElement | null>(null);
  const recentRefB = useRef<HTMLDivElement | null>(null);
  // Inline catalog dropdown next to the "Add Yacht from URL" input — lets the
  // user peek at every yacht they've added without scrolling to the bottom of
  // the page.
  const [addUrlCatalogOpen, setAddUrlCatalogOpen] = useState(false);

  // Close the Recent dropdown when clicking outside it
  useEffect(() => {
    if (!openRecentSlot) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node;
      const ref = openRecentSlot === "a" ? recentRefA.current : recentRefB.current;
      if (ref && !ref.contains(target)) setOpenRecentSlot(null);
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [openRecentSlot]);

  // Persist catalog
  useEffect(() => {
    saveCatalog(catalog);
  }, [catalog]);

  // Persist slot selections
  useEffect(() => {
    try {
      localStorage.setItem("gy-compare-slots", JSON.stringify({ leftId, rightId }));
    } catch { /* ignore */ }
  }, [leftId, rightId]);

  const leftYacht = catalog.find((y) => y.id === leftId) ?? catalog[0];
  const rightYacht = catalog.find((y) => y.id === rightId) ?? catalog[1];

  const seedIds = new Set(SEED_YACHTS.map((y) => y.id));

  // Load a URL into a specific comparison slot and add to catalog
  const loadUrlToSlot = useCallback(
    async (
      url: string,
      slot: "a" | "b",
      setLoadingFn: (v: boolean) => void,
      setUrlFn: (v: string) => void
    ) => {
      const trimmed = url.trim();
      if (!trimmed) return;

      try { new URL(trimmed); } catch {
        setScrapeError("Please enter a valid URL (e.g. https://www.yachtworld.com/...)");
        return;
      }

      setLoadingFn(true);
      setScrapeError(null);

      try {
        // Check if already in catalog
        const existingMatch = catalog.find(
          (y) => y.url.toLowerCase() === trimmed.toLowerCase()
        );
        if (existingMatch) {
          if (slot === "a") setLeftId(existingMatch.id);
          else setRightId(existingMatch.id);
          setLoadingFn(false);
          setUrlFn("");
          return;
        }

        // Scrape real data from the URL
        const newYacht = await scrapeYachtFromUrl(trimmed);

        setCatalog((prev) => {
          // Double-check (in case of race condition)
          const existing = prev.find(
            (y) => y.url.toLowerCase() === trimmed.toLowerCase()
          );
          if (existing) {
            if (slot === "a") setLeftId(existing.id);
            else setRightId(existing.id);
            return prev;
          }
          if (slot === "a") setLeftId(newYacht.id);
          else setRightId(newYacht.id);
          return [...prev, newYacht];
        });
        setUrlFn("");
      } catch (err) {
        setScrapeError(
          err instanceof Error ? err.message : "Failed to load listing"
        );
      } finally {
        setLoadingFn(false);
      }
    },
    [catalog]
  );

  // Add yacht from URL (catalog section)
  const handleAddUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    setLoading(true);
    setScrapeError(null);

    try {
      const existingMatch = catalog.find(
        (y) => y.url.toLowerCase() === trimmed.toLowerCase()
      );
      if (existingMatch) {
        setRightId(existingMatch.id);
        setLoading(false);
        setUrlInput("");
        return;
      }

      const newYacht = await scrapeYachtFromUrl(trimmed);

      setCatalog((prev) => {
        const existing = prev.find(
          (y) => y.url.toLowerCase() === trimmed.toLowerCase()
        );
        if (existing) {
          setRightId(existing.id);
          return prev;
        }
        setRightId(newYacht.id);
        return [...prev, newYacht];
      });
      setUrlInput("");
    } catch (err) {
      setScrapeError(
        err instanceof Error ? err.message : "Failed to load listing"
      );
    } finally {
      setLoading(false);
    }
  }, [urlInput, catalog]);

  // Drag & drop handlers for comparison slots
  const handleDragOver = (slot: "a" | "b") => (e: DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOverSlot(slot);
  };

  const handleDragLeave = () => setDragOverSlot(null);

  const handleDrop = (slot: "a" | "b") => (e: DragEvent) => {
    e.preventDefault();
    setDragOverSlot(null);
    const id = e.dataTransfer.getData("text/plain");
    if (!id) return;
    if (slot === "a") {
      if (id === rightId) {
        // Swap
        setLeftId(rightId);
        setRightId(leftId);
      } else {
        setLeftId(id);
      }
    } else {
      if (id === leftId) {
        setLeftId(rightId);
        setRightId(leftId);
      } else {
        setRightId(id);
      }
    }
  };

  const handleAssign = (yachtId: string, slot: "a" | "b") => {
    if (slot === "a") {
      if (yachtId === rightId) {
        setLeftId(rightId);
        setRightId(leftId);
      } else {
        setLeftId(yachtId);
      }
    } else {
      if (yachtId === leftId) {
        setLeftId(rightId);
        setRightId(leftId);
      } else {
        setRightId(yachtId);
      }
    }
  };

  const handleRemove = (yachtId: string) => {
    const remaining = catalog.filter((y) => y.id !== yachtId);
    if (remaining.length < 2) return; // need at least 2 yachts

    if (yachtId === leftId) {
      // Reassign left slot to another yacht that isn't in the right slot
      const alt = remaining.find((y) => y.id !== rightId);
      if (alt) setLeftId(alt.id);
    } else if (yachtId === rightId) {
      // Reassign right slot to another yacht that isn't in the left slot
      const alt = remaining.find((y) => y.id !== leftId);
      if (alt) setRightId(alt.id);
    }

    setCatalog(remaining);
  };

  const handleSwap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

  /**
   * Apply a single-field edit from a comparison card. We update both the
   * display string and (when present) the numeric mirror so winner-comparison
   * still works. Manual edits dismiss any sanity-check flags that mention
   * the field, since the user has now overridden the questionable value.
   * The field path is recorded in `edited[]` so future logic can avoid
   * clobbering it.
   */
  const handleFieldUpdate = useCallback(
    (
      yachtId: string,
      field: keyof YachtListing,
      value: string,
      numField?: keyof YachtListing,
    ) => {
      setCatalog((prev) =>
        prev.map((y) => {
          if (y.id !== yachtId) return y;
          const numericPart = numField ? extractFirstNumber(value) : null;
          const fieldKeyLower = String(field).toLowerCase();
          const remainingFlags = (y.flags ?? []).filter(
            (f) => !f.toLowerCase().startsWith(fieldKeyLower + ":"),
          );
          const editedSet = new Set([...(y.edited ?? []), String(field)]);
          return {
            ...y,
            [field]: value,
            ...(numField && numericPart !== null ? { [numField]: numericPart } : {}),
            flags: remainingFlags,
            edited: Array.from(editedSet),
          } as YachtListing;
        }),
      );
    },
    [],
  );

  const handleMarkVerified = useCallback(
    (yachtId: string, verified: boolean) => {
      setCatalog((prev) =>
        prev.map((y) => (y.id === yachtId ? { ...y, verified } : y)),
      );
    },
    [],
  );

  const bothReady =
    (leftYacht.verified === true || (leftYacht.flags?.length ?? 0) === 0) &&
    (rightYacht.verified === true || (rightYacht.flags?.length ?? 0) === 0);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
            Compare Yachts
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Compare any two yachts side-by-side. Paste listing URLs to add
            yachts to your catalog, then drag them into the comparison slots.
          </p>
        </div>

        {/* ── Quick Compare via URLs ── */}
        <div className="mb-8 rounded-xl border border-border bg-bg-card p-6">
          <h2 className="mb-1 text-sm font-semibold text-text-primary">
            Compare by URL
          </h2>
          <p className="mb-4 text-xs text-text-secondary">
            Paste two yacht listing links below and hit Compare to view them
            side-by-side instantly.
          </p>

          <div className="flex flex-col items-stretch gap-3 lg:flex-row lg:items-end">
            {/* Left URL */}
            <div className="flex-1" ref={recentRefA}>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Yacht 1
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2.5 focus-within:border-gold transition-colors">
                  <Link2 className="h-4 w-4 shrink-0 text-text-secondary" />
                  <input
                    type="url"
                    value={urlLeft}
                    onChange={(e) => setUrlLeft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlLeft.trim())
                        loadUrlToSlot(urlLeft, "a", setLoadingLeft, setUrlLeft);
                    }}
                    placeholder="Paste first listing URL..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none"
                  />
                  {loadingLeft && (
                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRecentSlot((s) => (s === "a" ? null : "a"))
                    }
                    className="flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-bg-primary/60 px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
                    title="Pick from recently added yachts"
                  >
                    Recent
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        openRecentSlot === "a" && "rotate-180"
                      )}
                    />
                  </button>
                </div>
                {openRecentSlot === "a" && (
                  <RecentDropdown
                    catalog={catalog}
                    onPick={(yacht) => {
                      handleAssign(yacht.id, "a");
                      setUrlLeft("");
                      setOpenRecentSlot(null);
                    }}
                  />
                )}
              </div>
            </div>

            {/* VS label */}
            <div className="flex items-end justify-center pb-2.5 lg:px-2">
              <span className="text-xs font-bold tracking-widest text-text-secondary">
                VS
              </span>
            </div>

            {/* Right URL */}
            <div className="flex-1" ref={recentRefB}>
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Yacht 2
              </label>
              <div className="relative">
                <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-secondary px-4 py-2.5 focus-within:border-gold transition-colors">
                  <Link2 className="h-4 w-4 shrink-0 text-text-secondary" />
                  <input
                    type="url"
                    value={urlRight}
                    onChange={(e) => setUrlRight(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter" && urlRight.trim())
                        loadUrlToSlot(urlRight, "b", setLoadingRight, setUrlRight);
                    }}
                    placeholder="Paste second listing URL..."
                    className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/40 focus:outline-none"
                  />
                  {loadingRight && (
                    <Loader2 className="h-4 w-4 animate-spin text-gold" />
                  )}
                  <button
                    type="button"
                    onClick={() =>
                      setOpenRecentSlot((s) => (s === "b" ? null : "b"))
                    }
                    className="flex shrink-0 items-center gap-1 rounded-md border border-border/60 bg-bg-primary/60 px-2 py-1 text-[10px] font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
                    title="Pick from recently added yachts"
                  >
                    Recent
                    <ChevronDown
                      className={cn(
                        "h-3 w-3 transition-transform",
                        openRecentSlot === "b" && "rotate-180"
                      )}
                    />
                  </button>
                </div>
                {openRecentSlot === "b" && (
                  <RecentDropdown
                    catalog={catalog}
                    onPick={(yacht) => {
                      handleAssign(yacht.id, "b");
                      setUrlRight("");
                      setOpenRecentSlot(null);
                    }}
                  />
                )}
              </div>
            </div>

            {/* Compare button */}
            <button
              onClick={() => {
                if (urlLeft.trim())
                  loadUrlToSlot(urlLeft, "a", setLoadingLeft, setUrlLeft);
                if (urlRight.trim())
                  loadUrlToSlot(urlRight, "b", setLoadingRight, setUrlRight);
              }}
              disabled={
                (!urlLeft.trim() && !urlRight.trim()) ||
                loadingLeft ||
                loadingRight
              }
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-6 py-2.5 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed lg:self-end"
            >
              {loadingLeft || loadingRight ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <CheckCircle className="h-4 w-4" />
              )}
              Compare
            </button>
          </div>

          <div className="mt-3 flex flex-wrap items-center gap-2">
            <span className="text-[10px] text-text-secondary">Works with:</span>
            {["YachtWorld", "BoatTrader", "boats.com", "Denison", "Any URL"].map(
              (site) => (
                <span
                  key={site}
                  className="rounded-full border border-border/50 bg-bg-primary px-2 py-0.5 text-[10px] text-text-secondary"
                >
                  {site}
                </span>
              )
            )}
          </div>
        </div>

        {/* ── Error banner ── */}
        {scrapeError && (
          <div className="mb-4 flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-5 py-3">
            <AlertTriangle className="h-4 w-4 shrink-0 text-error" />
            <span className="text-sm text-error">{scrapeError}</span>
            <button
              onClick={() => setScrapeError(null)}
              className="ml-auto text-xs text-text-secondary hover:text-text-primary"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* ── Status bar ── */}
        <div
          className={cn(
            "mb-8 rounded-lg px-5 py-3.5",
            bothReady
              ? "border border-success/20 bg-success/5"
              : "border border-warning/30 bg-warning/5",
          )}
        >
          <div className="flex items-center gap-2">
            {bothReady ? (
              <ShieldCheck className="h-4 w-4 text-success" />
            ) : (
              <AlertTriangle className="h-4 w-4 text-warning" />
            )}
            <span
              className={cn(
                "text-sm font-medium",
                bothReady ? "text-success" : "text-warning",
              )}
            >
              {bothReady ? "Ready to share" : "Review required before sharing"}
            </span>
            <span className="text-sm text-text-secondary">
              — {leftYacht.name} vs {rightYacht.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            {bothReady
              ? "Both cards have been reviewed (or have no flagged issues). Specs in green are the better value."
              : "One or both cards need review. Click any value to edit it, then hit \"Mark Reviewed\" before sending to a client."}
          </p>
        </div>

        {/* ── Comparison area ── */}
        <div className="mb-6 flex items-center justify-center">
          <button
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
            Swap Sides
          </button>
        </div>

        {/* Mobile: unified comparison table */}
        <div className="mb-12 lg:hidden">
          <ComparisonTable left={leftYacht} right={rightYacht} />
        </div>

        {/* Desktop: side-by-side cards */}
        <div className="mb-12 hidden gap-6 lg:grid lg:grid-cols-2">
          <ComparisonCard
            yacht={leftYacht}
            other={rightYacht}
            side="a"
            dragOver={dragOverSlot === "a"}
            onDragOver={handleDragOver("a")}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop("a")}
            onUpdate={(field, value, numField) =>
              handleFieldUpdate(leftYacht.id, field, value, numField)
            }
            onMarkVerified={(v) => handleMarkVerified(leftYacht.id, v)}
          />
          <ComparisonCard
            yacht={rightYacht}
            other={leftYacht}
            side="b"
            dragOver={dragOverSlot === "b"}
            onDragOver={handleDragOver("b")}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop("b")}
            onUpdate={(field, value, numField) =>
              handleFieldUpdate(rightYacht.id, field, value, numField)
            }
            onMarkVerified={(v) => handleMarkVerified(rightYacht.id, v)}
          />
        </div>

        {/* ── Divider ── */}
        <div className="mb-8 border-t border-border" />

        {/* ── Add via URL ── */}
        <div className="mb-8">
          <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Add Yacht from URL
          </h2>
          <div className="flex items-center gap-3">
            <div className="flex flex-1 items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3 focus-within:border-gold transition-colors">
              <Link2 className="h-4 w-4 shrink-0 text-text-secondary" />
              <input
                type="url"
                value={urlInput}
                onChange={(e) => setUrlInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAddUrl()}
                placeholder="Paste a yacht listing URL (YachtWorld, BoatTrader, boats.com, etc.)"
                className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
              />
            </div>
            <button
              type="button"
              onClick={() => setAddUrlCatalogOpen((o) => !o)}
              className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3 text-sm font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
              title="Show every yacht in your catalog"
            >
              <Ship className="h-4 w-4" />
              Catalog
              <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-primary">
                {catalog.length}
              </span>
              <ChevronDown
                className={cn(
                  "h-3.5 w-3.5 transition-transform",
                  addUrlCatalogOpen && "rotate-180",
                )}
              />
            </button>
            <button
              onClick={handleAddUrl}
              disabled={!urlInput.trim() || loading}
              className="inline-flex items-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {loading ? "Loading..." : "Add to Catalog"}
            </button>
          </div>

          {/* Inline catalog dropdown — shows every yacht the user has added, with
              the same LEFT/RIGHT/Delete actions as the bottom-of-page list, so
              users can swap comparisons without scrolling. */}
          {addUrlCatalogOpen && (
            <div className="mt-3 overflow-hidden rounded-lg border border-border bg-bg-card">
              <div className="flex items-center justify-between border-b border-border/60 px-4 py-2">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-text-secondary">
                  Your Catalog · {catalog.length} yacht{catalog.length === 1 ? "" : "s"}
                </span>
                <span className="text-[10px] text-text-secondary">
                  Click LEFT or RIGHT to compare
                </span>
              </div>
              {catalog.length === 0 ? (
                <div className="px-4 py-6 text-center text-xs text-text-secondary">
                  No yachts yet. Paste a listing URL above to add one.
                </div>
              ) : (
                <div className="max-h-96 space-y-1 overflow-y-auto p-2">
                  {catalog.map((yacht) => (
                    <CatalogCard
                      key={yacht.id}
                      yacht={yacht}
                      isActive={yacht.id === leftId || yacht.id === rightId}
                      onAssign={(slot) => handleAssign(yacht.id, slot)}
                      onRemove={() => handleRemove(yacht.id)}
                      isSeed={seedIds.has(yacht.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          )}

          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="text-xs text-text-secondary">Supported:</span>
            {["YachtWorld", "BoatTrader", "boats.com", "Denison", "Any URL"].map(
              (site) => (
                <span
                  key={site}
                  className="rounded-full border border-border bg-bg-secondary px-2.5 py-0.5 text-[10px] text-text-secondary"
                >
                  {site}
                </span>
              )
            )}
          </div>
        </div>

        {/* ── Yacht Catalog ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
              Your Yacht Catalog
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({catalog.length} yachts)
              </span>
            </h2>
            <p className="text-xs text-text-secondary">
              Drag to comparison slots or click LEFT / RIGHT
            </p>
          </div>

          <div className="grid grid-cols-1 gap-2">
            {catalog.map((yacht) => (
              <CatalogCard
                key={yacht.id}
                yacht={yacht}
                isActive={yacht.id === leftId || yacht.id === rightId}
                onAssign={(slot) => handleAssign(yacht.id, slot)}
                onRemove={() => handleRemove(yacht.id)}
                isSeed={seedIds.has(yacht.id)}
              />
            ))}
          </div>

          {catalog.length === 0 && (
            <div className="rounded-xl border border-dashed border-border bg-bg-card/50 py-12 text-center">
              <Ship className="mx-auto mb-3 h-8 w-8 text-text-secondary/40" />
              <p className="text-sm text-text-secondary">
                No yachts in catalog. Paste a listing URL above to get started.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
