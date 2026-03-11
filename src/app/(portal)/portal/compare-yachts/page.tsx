"use client";

import { useState } from "react";
import {
  CheckCircle,
  ExternalLink,
  MapPin,
  ChevronDown,
  ArrowUpDown,
  Ship,
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
  url: string;
  gradient: string;
}

/* ------------------------------------------------------------------ */
/*  Yacht catalog                                                      */
/* ------------------------------------------------------------------ */

const YACHT_CATALOG: YachtListing[] = [
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
    engine: "2\u00d7 MTU 12V 2000 M72",
    url: "https://www.yachtworld.com/yacht/2022-benetti-oasis-40m-8267590",
    gradient: "from-slate-700 via-slate-600 to-blue-900",
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
    engine: "1\u00d7 Yanmar 4JH80",
    url: "https://www.boattrader.com/boat/2021-oyster-745-8150322",
    gradient: "from-blue-900 via-indigo-800 to-slate-700",
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
    engine: "2\u00d7 Volvo D4-300",
    url: "https://www.yachtworld.com/yacht/2020-lagoon-seventy-7-8194001",
    gradient: "from-slate-800 via-teal-900 to-slate-700",
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
    engine: "2\u00d7 John Deere 6135",
    url: "https://www.denisonyachtsales.com/yacht/nordhavn-120",
    gradient: "from-slate-800 via-emerald-900 to-slate-700",
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
    engine: "2\u00d7 MTU 16V 2000 M96L",
    url: "https://www.boats.com/power-boats/2023-viking-80-8301234",
    gradient: "from-indigo-900 via-purple-900 to-slate-800",
  },
];

/* ------------------------------------------------------------------ */
/*  Comparison helpers                                                 */
/* ------------------------------------------------------------------ */

type Winner = "a" | "b" | "tie";

function compareSpec(
  a: number,
  b: number,
  lowerIsBetter = false
): Winner {
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
  { label: "Location", key: "location", numKey: "location", isLocation: true },
  { label: "Engine", key: "engine", numKey: "engine" },
];

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
/*  Yacht Selector Dropdown                                            */
/* ------------------------------------------------------------------ */

function YachtSelector({
  selectedId,
  otherId,
  onChange,
}: {
  selectedId: string;
  otherId: string;
  onChange: (id: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const available = YACHT_CATALOG.filter((y) => y.id !== otherId);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3 text-left transition-colors hover:border-gold/50"
      >
        <Ship className="h-4 w-4 shrink-0 text-gold" />
        <span className="flex-1 truncate text-sm text-text-primary">
          {YACHT_CATALOG.find((y) => y.id === selectedId)?.name ?? "Select yacht"}
        </span>
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-text-secondary transition-transform",
            open && "rotate-180"
          )}
        />
      </button>
      {open && (
        <div className="absolute left-0 right-0 top-full z-30 mt-1 overflow-hidden rounded-lg border border-border bg-bg-card shadow-xl">
          {available.map((yacht) => (
            <button
              key={yacht.id}
              onClick={() => {
                onChange(yacht.id);
                setOpen(false);
              }}
              className={cn(
                "flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-bg-secondary",
                yacht.id === selectedId && "bg-gold-muted"
              )}
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-xs font-semibold",
                  yacht.id === selectedId
                    ? "bg-gold text-bg-primary"
                    : "bg-bg-secondary text-text-secondary"
                )}
              >
                {yacht.name
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)}
              </div>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-text-primary">
                  {yacht.name}
                </p>
                <p className="truncate text-xs text-text-secondary">
                  {yacht.builder} &middot; {yacht.type} &middot; {yacht.price}
                </p>
              </div>
              {yacht.id === selectedId && (
                <CheckCircle className="h-4 w-4 shrink-0 text-gold" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Yacht Card                                                         */
/* ------------------------------------------------------------------ */

function YachtCard({
  yacht,
  other,
  side,
}: {
  yacht: YachtListing;
  other: YachtListing;
  side: "a" | "b";
}) {
  const priceWinner = compareSpec(yacht.priceNum, other.priceNum, true);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-bg-card">
      {/* Image placeholder */}
      <div
        className={cn(
          "relative h-48 w-full bg-gradient-to-br",
          yacht.gradient
        )}
      >
        <span
          className={cn(
            "absolute left-4 top-4 rounded-full px-3 py-1 text-xs font-medium",
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
            const numA = typeof yacht[field.numKey] === "number" ? (yacht[field.numKey] as number) : 0;
            const numB = typeof other[field.numKey] === "number" ? (other[field.numKey] as number) : 0;

            let winner: Winner | undefined;
            if (!field.isLocation && typeof yacht[field.numKey] === "number") {
              winner =
                side === "a"
                  ? compareSpec(numA, numB, field.lowerIsBetter)
                  : compareSpec(numB, numA, field.lowerIsBetter);
              // flip it so winner is from perspective of this card's side
              if (side === "b") {
                winner =
                  winner === "a" ? "b" : winner === "b" ? "a" : winner;
              }
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
/*  Main Page                                                          */
/* ------------------------------------------------------------------ */

export default function CompareYachtsPage() {
  const [leftId, setLeftId] = useState(YACHT_CATALOG[0].id);
  const [rightId, setRightId] = useState(YACHT_CATALOG[1].id);

  const leftYacht = YACHT_CATALOG.find((y) => y.id === leftId)!;
  const rightYacht = YACHT_CATALOG.find((y) => y.id === rightId)!;

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
            Select any two yachts to compare side-by-side. Specs are
            highlighted to show which vessel leads in each category.
          </p>
        </div>

        {/* ── Status bar ── */}
        <div className="mb-8 rounded-lg border border-success/20 bg-success/5 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Comparing
            </span>
            <span className="text-sm text-text-secondary">
              &mdash; {leftYacht.name} vs {rightYacht.name}
            </span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Green values indicate the better spec. Use the dropdowns to switch
            yachts.
          </p>
        </div>

        {/* ── Yacht selectors ── */}
        <div className="mb-8 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
          <div className="flex-1">
            <YachtSelector
              selectedId={leftId}
              otherId={rightId}
              onChange={setLeftId}
            />
          </div>

          {/* VS + swap */}
          <div className="flex items-center justify-center gap-2 lg:flex-col lg:px-2 lg:pt-2">
            <span className="text-xs font-bold tracking-widest text-text-secondary">
              VS
            </span>
            <button
              onClick={handleSwap}
              className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
              title="Swap positions"
            >
              <ArrowUpDown className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="flex-1">
            <YachtSelector
              selectedId={rightId}
              otherId={leftId}
              onChange={setRightId}
            />
          </div>
        </div>

        {/* ── Supported sites ── */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-text-secondary">
            Supported sites:
          </span>
          {["YachtWorld", "BoatTrader", "Yacht Way", "boats.com", "Denison"].map(
            (site) => (
              <span
                key={site}
                className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs text-text-secondary"
              >
                {site}
              </span>
            )
          )}
        </div>

        {/* ── Comparison cards ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          <YachtCard yacht={leftYacht} other={rightYacht} side="a" />
          <YachtCard yacht={rightYacht} other={leftYacht} side="b" />
        </div>
      </div>
    </div>
  );
}
