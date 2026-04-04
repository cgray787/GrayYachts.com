"use client";

import { useState, useCallback, useEffect, type DragEvent } from "react";
import {
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  MapPin,
  ArrowUpDown,
  Ship,
  Link2,
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
  YachtWorld: "bg-emerald-400/10 text-emerald-400",
  BoatTrader: "bg-blue-400/10 text-blue-400",
  "boats.com": "bg-purple-400/10 text-purple-400",
  Denison: "bg-amber-400/10 text-amber-400",
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
  };
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

const STORAGE_KEY = "gy-compare-catalog-v3"; // v3: added imageUrl field

function loadCatalog(): YachtListing[] {
  if (typeof window === "undefined") return SEED_YACHTS;
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

function SpecRow({
  label,
  value,
  winner,
  side,
  isLocation,
}: {
  label: string;
  value: string;
  winner?: Winner;
  side: "a" | "b";
  isLocation?: boolean;
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
        {value}
        {isWinner && !isLocation && (
          <span className="ml-1.5 text-[10px] text-success">&#9650;</span>
        )}
      </span>
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
              {yacht.imageUrl && (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={yacht.imageUrl}
                  alt={yacht.name}
                  className="absolute inset-0 h-full w-full object-cover"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
                />
              )}
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
}: {
  yacht: YachtListing;
  other: YachtListing;
  side: "a" | "b";
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
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
          : "border-border"
      )}
    >
      {/* Drop hint */}
      {dragOver && (
        <div className="bg-gold/10 px-4 py-2 text-center text-xs font-medium text-gold">
          Drop here to compare
        </div>
      )}

      {/* Yacht image / gradient fallback */}
      <div className={cn("relative h-44 w-full bg-gradient-to-br", yacht.gradient)}>
        {yacht.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={yacht.imageUrl}
            alt={yacht.name}
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
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
          {yacht.name}
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
            {yacht.price}
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
        {yacht.imageUrl && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={yacht.imageUrl}
            alt=""
            className="absolute inset-0 h-full w-full object-cover"
            onError={(e) => { (e.target as HTMLImageElement).style.display = "none"; }}
          />
        )}
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

      {/* Actions */}
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
        {!isSeed && (
          <button
            onClick={onRemove}
            className="rounded p-1 text-text-secondary transition-colors hover:text-error"
            title="Remove from catalog"
          >
            <Trash2 className="h-3 w-3" />
          </button>
        )}
      </div>

      {isActive && (
        <span className="absolute -right-1 -top-1 flex h-4 w-4 items-center justify-center rounded-full bg-gold text-[8px] font-bold text-bg-primary">
          ✓
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CompareYachtsPage() {
  const [catalog, setCatalog] = useState<YachtListing[]>(() => loadCatalog());
  const [leftId, setLeftId] = useState(catalog[0]?.id ?? "");
  const [rightId, setRightId] = useState(catalog[1]?.id ?? "");
  const [dragOverSlot, setDragOverSlot] = useState<"a" | "b" | null>(null);
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [urlLeft, setUrlLeft] = useState("");
  const [urlRight, setUrlRight] = useState("");
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);

  // Persist catalog
  useEffect(() => {
    saveCatalog(catalog);
  }, [catalog]);

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
    if (yachtId === leftId || yachtId === rightId) return;
    setCatalog((prev) => prev.filter((y) => y.id !== yachtId));
  };

  const handleSwap = () => {
    setLeftId(rightId);
    setRightId(leftId);
  };

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
            <div className="flex-1">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Yacht 1
              </label>
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
              </div>
            </div>

            {/* VS label */}
            <div className="flex items-end justify-center pb-2.5 lg:px-2">
              <span className="text-xs font-bold tracking-widest text-text-secondary">
                VS
              </span>
            </div>

            {/* Right URL */}
            <div className="flex-1">
              <label className="mb-1.5 block text-[11px] font-medium uppercase tracking-wider text-text-secondary">
                Yacht 2
              </label>
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
        <div className="mb-8 rounded-lg border border-success/20 bg-success/5 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">Comparing</span>
            <span className="text-sm text-text-secondary">
              — {leftYacht.name} vs {rightYacht.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Green specs indicate the better value. Drag yachts from your catalog
            below to swap them in.
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
          />
          <ComparisonCard
            yacht={rightYacht}
            other={leftYacht}
            side="b"
            dragOver={dragOverSlot === "b"}
            onDragOver={handleDragOver("b")}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop("b")}
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
