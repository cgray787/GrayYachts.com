"use client";

import { useState, useCallback } from "react";
import {
  CheckCircle,
  RefreshCw,
  ExternalLink,
  MapPin,
  Link2,
  Loader2,
  X,
  Plus,
  ArrowUpDown,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface YachtListing {
  source: string;
  sourceBadgeColor: string;
  name: string;
  builder: string;
  type: string;
  year: number;
  price: string;
  length: string;
  beam: string;
  maxSpeed: string;
  cabins: string;
  range: string;
  rangeHighlight?: boolean;
  location: string;
  engine: string;
  url: string;
}

type SlotState =
  | { status: "empty" }
  | { status: "loading"; url: string }
  | { status: "error"; url: string; message: string }
  | { status: "loaded"; url: string; data: YachtListing; fetchedAt: Date };

/* ------------------------------------------------------------------ */
/*  Demo yacht catalog (simulates fetched data)                        */
/* ------------------------------------------------------------------ */

const YACHT_CATALOG: YachtListing[] = [
  {
    source: "YachtWorld",
    sourceBadgeColor: "bg-success/10 text-success",
    name: "Serenity II",
    builder: "Benetti",
    type: "Motor Yacht",
    year: 2022,
    price: "$8,200,000",
    length: "42m (137.8 ft)",
    beam: "8.5m (27.9 ft)",
    maxSpeed: "18 knots",
    cabins: "5 cabins / 10 guests",
    range: "3,200 nm",
    location: "Monaco",
    engine: "2\u00d7 MTU 12V 2000 M72",
    url: "https://www.yachtworld.com/yacht/2022-benetti-oasis-40m-8267590",
  },
  {
    source: "BoatTrader",
    sourceBadgeColor: "bg-info/10 text-info",
    name: "Windchaser",
    builder: "Oyster",
    type: "Sailing Yacht",
    year: 2021,
    price: "$4,750,000",
    length: "28m (91.9 ft)",
    beam: "6.8m (22.3 ft)",
    maxSpeed: "12 knots",
    cabins: "3 cabins / 6 guests",
    range: "Unlimited (sail)",
    rangeHighlight: true,
    location: "Palma de Mallorca",
    engine: "1\u00d7 Yanmar 4JH80",
    url: "https://www.boattrader.com/boat/2021-oyster-745-8150322",
  },
  {
    source: "YachtWorld",
    sourceBadgeColor: "bg-success/10 text-success",
    name: "Aegean Star",
    builder: "Lagoon",
    type: "Catamaran",
    year: 2020,
    price: "$3,100,000",
    length: "35m (114.8 ft)",
    beam: "10.2m (33.5 ft)",
    maxSpeed: "10 knots",
    cabins: "4 cabins / 8 guests",
    range: "1,800 nm",
    location: "Athens",
    engine: "2\u00d7 Volvo D4-300",
    url: "https://www.yachtworld.com/yacht/2020-lagoon-seventy-7-8194001",
  },
  {
    source: "Denison",
    sourceBadgeColor: "bg-amber-400/10 text-amber-400",
    name: "Pacific Horizon",
    builder: "Nordhavn",
    type: "Trawler",
    year: 2019,
    price: "$5,900,000",
    length: "36m (118.1 ft)",
    beam: "7.8m (25.6 ft)",
    maxSpeed: "12 knots",
    cabins: "4 cabins / 8 guests",
    range: "4,500 nm",
    rangeHighlight: true,
    location: "Seattle, WA",
    engine: "2\u00d7 John Deere 6135",
    url: "https://www.denisonyachtsales.com/yacht/nordhavn-120",
  },
  {
    source: "boats.com",
    sourceBadgeColor: "bg-purple-400/10 text-purple-400",
    name: "Blue Marlin",
    builder: "Viking",
    type: "Sportfisher",
    year: 2023,
    price: "$6,450,000",
    length: "24m (80 ft)",
    beam: "6.4m (21 ft)",
    maxSpeed: "38 knots",
    cabins: "3 cabins / 6 guests",
    range: "600 nm",
    location: "Fort Lauderdale, FL",
    engine: "2\u00d7 MTU 16V 2000 M96L",
    url: "https://www.boats.com/power-boats/2023-viking-80-8301234",
  },
];

/* ------------------------------------------------------------------ */
/*  Helpers                                                            */
/* ------------------------------------------------------------------ */

function timeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSec = Math.floor(diffMs / 1000);
  if (diffSec < 10) return "Fetched just now";
  if (diffSec < 60) return `Fetched ${diffSec}s ago`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `Fetched ${diffMin} min ago`;
  return `Fetched ${Math.floor(diffMin / 60)}h ago`;
}

/** Detect source from a URL */
function detectSource(url: string): string {
  const lower = url.toLowerCase();
  if (lower.includes("yachtworld")) return "YachtWorld";
  if (lower.includes("boattrader")) return "BoatTrader";
  if (lower.includes("boats.com")) return "boats.com";
  if (lower.includes("denison")) return "Denison";
  if (lower.includes("yachtway")) return "Yacht Way";
  return "Other";
}

function sourceBadgeColor(source: string): string {
  switch (source) {
    case "YachtWorld":
      return "bg-success/10 text-success";
    case "BoatTrader":
      return "bg-info/10 text-info";
    case "boats.com":
      return "bg-purple-400/10 text-purple-400";
    case "Denison":
      return "bg-amber-400/10 text-amber-400";
    default:
      return "bg-text-secondary/10 text-text-secondary";
  }
}

/** Match a URL to a catalog yacht, or generate a random one */
function resolveYacht(url: string): YachtListing {
  const match = YACHT_CATALOG.find(
    (y) => y.url.toLowerCase() === url.toLowerCase()
  );
  if (match) return { ...match, url };

  // Generate plausible data from unrecognized URLs
  const source = detectSource(url);
  const names = [
    "Northern Light",
    "Odyssey",
    "Tranquility",
    "Sea Breeze",
    "Aurora",
    "Meridian",
  ];
  const builders = ["Azimut", "Sunseeker", "Princess", "Ferretti", "Riviera"];
  const name = names[Math.floor(Math.random() * names.length)];
  const builder = builders[Math.floor(Math.random() * builders.length)];
  const year = 2018 + Math.floor(Math.random() * 7);
  const lengthM = 20 + Math.floor(Math.random() * 30);
  const price = (2 + Math.random() * 8).toFixed(1);

  return {
    source,
    sourceBadgeColor: sourceBadgeColor(source),
    name,
    builder,
    type: "Motor Yacht",
    year,
    price: `$${price}M`,
    length: `${lengthM}m (${(lengthM * 3.281).toFixed(1)} ft)`,
    beam: `${(lengthM * 0.2).toFixed(1)}m`,
    maxSpeed: `${14 + Math.floor(Math.random() * 20)} knots`,
    cabins: `${2 + Math.floor(Math.random() * 4)} cabins`,
    range: `${1000 + Math.floor(Math.random() * 3000)} nm`,
    location: "Pacific Northwest",
    engine: `2\u00d7 ${builder} Marine V8`,
    url,
  };
}

/* ------------------------------------------------------------------ */
/*  Spec comparison helpers                                            */
/* ------------------------------------------------------------------ */

const SPEC_FIELDS: {
  label: string;
  key: keyof YachtListing;
  isLocation?: boolean;
}[] = [
  { label: "Length", key: "length" },
  { label: "Beam", key: "beam" },
  { label: "Max Speed", key: "maxSpeed" },
  { label: "Cabins", key: "cabins" },
  { label: "Range", key: "range" },
  { label: "Location", key: "location", isLocation: true },
  { label: "Engine", key: "engine" },
];

/** Extract a numeric value from a spec string for comparison */
function extractNumber(val: string): number | null {
  const match = val.match(/([\d,.]+)/);
  if (!match) return null;
  return parseFloat(match[1].replace(",", ""));
}

type CompareResult = "better" | "worse" | "equal" | "neutral";

function compareValues(
  a: string,
  b: string,
  key: string
): [CompareResult, CompareResult] {
  const numA = extractNumber(a);
  const numB = extractNumber(b);
  if (numA === null || numB === null) return ["neutral", "neutral"];
  if (numA === numB) return ["equal", "equal"];

  // For price, lower is "better" (for buyer)
  if (key === "price") {
    return numA < numB ? ["better", "worse"] : ["worse", "better"];
  }
  // For most specs, higher is better
  return numA > numB ? ["better", "worse"] : ["worse", "better"];
}

/* ------------------------------------------------------------------ */
/*  Supported Sites                                                    */
/* ------------------------------------------------------------------ */

const SUPPORTED_SITES = [
  "YachtWorld",
  "BoatTrader",
  "Yacht Way",
  "boats.com",
  "Denison",
  "Any URL",
] as const;

/* ------------------------------------------------------------------ */
/*  Spec Row with comparison highlighting                              */
/* ------------------------------------------------------------------ */

interface SpecRowProps {
  label: string;
  value: string;
  compareResult?: CompareResult;
  highlight?: boolean;
  isLocation?: boolean;
}

function SpecRow({
  label,
  value,
  compareResult,
  highlight,
  isLocation,
}: SpecRowProps) {
  const valueColor =
    compareResult === "better"
      ? "text-success"
      : compareResult === "worse"
        ? "text-error/70"
        : isLocation
          ? "text-gold"
          : "text-text-primary";

  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      <span className={cn("text-sm font-medium", valueColor)}>
        {isLocation && <MapPin className="mr-1 inline h-3 w-3" />}
        {value}
        {compareResult === "better" && (
          <span className="ml-1.5 text-[10px] text-success">&uarr;</span>
        )}
        {compareResult === "worse" && (
          <span className="ml-1.5 text-[10px] text-error/70">&darr;</span>
        )}
      </span>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  URL Input Slot                                                     */
/* ------------------------------------------------------------------ */

function UrlInputSlot({
  slot,
  onLoad,
  onClear,
  onRefresh,
  label,
}: {
  slot: SlotState;
  onLoad: (url: string) => void;
  onClear: () => void;
  onRefresh: () => void;
  label: string;
}) {
  const [inputValue, setInputValue] = useState(
    slot.status === "loaded" || slot.status === "loading"
      ? slot.url
      : slot.status === "error"
        ? slot.url
        : ""
  );

  const handleSubmit = () => {
    const trimmed = inputValue.trim();
    if (!trimmed) return;
    onLoad(trimmed);
  };

  if (slot.status === "loaded") {
    return (
      <div className="flex-1">
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-bg-card px-4 py-3">
          <CheckCircle className="h-4 w-4 shrink-0 text-success" />
          <span className="truncate text-sm text-text-primary">{slot.url}</span>
          <span className="ml-auto shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
            Loaded
          </span>
          <button
            onClick={onRefresh}
            className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-text-primary"
            title="Refresh"
          >
            <RefreshCw className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => {
              setInputValue("");
              onClear();
            }}
            className="shrink-0 rounded-md p-1 text-text-secondary transition-colors hover:text-error"
            title="Remove"
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>
    );
  }

  if (slot.status === "loading") {
    return (
      <div className="flex-1">
        <div className="flex items-center gap-2 rounded-lg border border-gold/30 bg-bg-card px-4 py-3">
          <Loader2 className="h-4 w-4 shrink-0 animate-spin text-gold" />
          <span className="truncate text-sm text-text-secondary">
            Fetching listing data...
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1">
      <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3 focus-within:border-gold">
        <Link2 className="h-4 w-4 shrink-0 text-text-secondary" />
        <input
          type="url"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={`Paste ${label} listing URL...`}
          className="min-w-0 flex-1 bg-transparent text-sm text-text-primary placeholder:text-text-secondary/50 focus:outline-none"
        />
        <button
          onClick={handleSubmit}
          disabled={!inputValue.trim()}
          className="shrink-0 rounded-md bg-gold px-3 py-1 text-xs font-semibold text-bg-primary transition-colors hover:bg-gold-hover disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Load
        </button>
      </div>
      {slot.status === "error" && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-error">
          <AlertCircle className="h-3 w-3" />
          {slot.message}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Quick-pick yacht selector                                          */
/* ------------------------------------------------------------------ */

function QuickPick({
  onSelect,
}: {
  onSelect: (url: string) => void;
}) {
  return (
    <div className="rounded-xl border border-border bg-bg-card p-6">
      <h3 className="mb-1 text-sm font-medium text-text-primary">
        Quick Compare
      </h3>
      <p className="mb-4 text-xs text-text-secondary">
        Select from sample listings to try the comparison tool
      </p>
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
        {YACHT_CATALOG.map((yacht) => (
          <button
            key={yacht.url}
            onClick={() => onSelect(yacht.url)}
            className="flex items-center gap-3 rounded-lg border border-border bg-bg-secondary px-3 py-2.5 text-left transition-colors hover:border-gold/50"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-gold-muted text-xs font-semibold text-gold">
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
                {yacht.builder} &middot; {yacht.year} &middot; {yacht.price}
              </p>
            </div>
            <Plus className="h-4 w-4 shrink-0 text-text-secondary" />
          </button>
        ))}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main Component                                                     */
/* ------------------------------------------------------------------ */

export default function CompareYachtsPage() {
  const [slotA, setSlotA] = useState<SlotState>({ status: "empty" });
  const [slotB, setSlotB] = useState<SlotState>({ status: "empty" });
  const [quickPickTarget, setQuickPickTarget] = useState<"a" | "b" | null>(
    null
  );

  const loadSlot = useCallback(
    (
      setter: React.Dispatch<React.SetStateAction<SlotState>>,
      url: string
    ) => {
      setter({ status: "loading", url });

      // Simulate network delay
      setTimeout(() => {
        try {
          // Basic URL validation
          if (!url.startsWith("http")) {
            setter({
              status: "error",
              url,
              message: "Please enter a valid URL starting with http:// or https://",
            });
            return;
          }
          const yacht = resolveYacht(url);
          setter({ status: "loaded", url, data: yacht, fetchedAt: new Date() });
        } catch {
          setter({
            status: "error",
            url,
            message: "Could not fetch listing. Please check the URL.",
          });
        }
      }, 800 + Math.random() * 700);
    },
    []
  );

  const handleQuickPick = (url: string) => {
    if (slotA.status === "empty" || quickPickTarget === "a") {
      loadSlot(setSlotA, url);
      setQuickPickTarget(null);
    } else if (slotB.status === "empty" || quickPickTarget === "b") {
      loadSlot(setSlotB, url);
      setQuickPickTarget(null);
    }
  };

  const handleSwap = () => {
    const temp = slotA;
    setSlotA(slotB);
    setSlotB(temp);
  };

  const bothLoaded =
    slotA.status === "loaded" && slotB.status === "loaded";
  const eitherLoaded =
    slotA.status === "loaded" || slotB.status === "loaded";

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
            Compare Yachts
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Paste listing URLs from any yacht marketplace to compare
            side-by-side. Specs, pricing, and details are auto-extracted.
          </p>
        </div>

        {/* ── Status bar ── */}
        {bothLoaded && (
          <div className="mb-8 rounded-lg border border-success/20 bg-success/5 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-success" />
              <span className="text-sm font-medium text-success">
                Comparison Ready
              </span>
              <span className="text-sm text-text-secondary">
                &mdash; {slotA.data.name} vs {slotB.data.name}
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Green specs indicate the better value. Paste new links anytime to
              update.
            </p>
          </div>
        )}

        {!bothLoaded && eitherLoaded && (
          <div className="mb-8 rounded-lg border border-gold/20 bg-gold/5 px-5 py-3.5">
            <div className="flex items-center gap-2">
              <Loader2 className="h-4 w-4 text-gold" />
              <span className="text-sm font-medium text-gold">
                Add Second Yacht
              </span>
            </div>
            <p className="mt-1 text-xs text-text-secondary">
              Paste another listing URL or pick from the catalog below to start
              comparing.
            </p>
          </div>
        )}

        {/* ── URL inputs ── */}
        <div className="mb-8 flex flex-col items-stretch gap-4 lg:flex-row lg:items-start">
          <UrlInputSlot
            slot={slotA}
            label="first"
            onLoad={(url) => loadSlot(setSlotA, url)}
            onClear={() => setSlotA({ status: "empty" })}
            onRefresh={() =>
              slotA.status === "loaded" && loadSlot(setSlotA, slotA.url)
            }
          />

          {/* VS divider + swap button */}
          <div className="flex items-center justify-center gap-2 lg:flex-col lg:px-2 lg:pt-2">
            <span className="text-xs font-bold tracking-widest text-text-secondary">
              VS
            </span>
            {bothLoaded && (
              <button
                onClick={handleSwap}
                className="rounded-md border border-border p-1.5 text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
                title="Swap positions"
              >
                <ArrowUpDown className="h-3.5 w-3.5" />
              </button>
            )}
          </div>

          <UrlInputSlot
            slot={slotB}
            label="second"
            onLoad={(url) => loadSlot(setSlotB, url)}
            onClear={() => setSlotB({ status: "empty" })}
            onRefresh={() =>
              slotB.status === "loaded" && loadSlot(setSlotB, slotB.url)
            }
          />
        </div>

        {/* ── Supported sites ── */}
        <div className="mb-8 flex flex-wrap items-center gap-2">
          <span className="mr-1 text-xs text-text-secondary">
            Supported sites:
          </span>
          {SUPPORTED_SITES.map((site) => (
            <span
              key={site}
              className="rounded-full border border-border bg-bg-secondary px-3 py-1 text-xs text-text-secondary"
            >
              {site}
            </span>
          ))}
        </div>

        {/* ── Quick Pick (when slots are empty) ── */}
        {(!eitherLoaded ||
          slotA.status === "empty" ||
          slotB.status === "empty") && (
          <div className="mb-10">
            <QuickPick onSelect={handleQuickPick} />
          </div>
        )}

        {/* ── Comparison cards ── */}
        {eitherLoaded && (
          <div className="grid gap-6 lg:grid-cols-2">
            {[
              { slot: slotA, otherSlot: slotB, side: "a" as const },
              { slot: slotB, otherSlot: slotA, side: "b" as const },
            ].map(({ slot, otherSlot, side }) => {
              if (slot.status !== "loaded") {
                return (
                  <div
                    key={side}
                    className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-border bg-bg-card/50 py-20"
                  >
                    <Plus className="mb-3 h-8 w-8 text-text-secondary/40" />
                    <p className="text-sm text-text-secondary">
                      Add a yacht to compare
                    </p>
                    <button
                      onClick={() => setQuickPickTarget(side)}
                      className="mt-3 rounded-md border border-border px-4 py-2 text-xs font-medium text-text-primary transition-colors hover:border-gold/50 hover:text-gold"
                    >
                      Pick from catalog
                    </button>
                  </div>
                );
              }

              const yacht = slot.data;
              const other =
                otherSlot.status === "loaded" ? otherSlot.data : null;

              return (
                <div
                  key={side}
                  className="overflow-hidden rounded-xl border border-border bg-bg-card"
                >
                  {/* Image placeholder */}
                  <div className="relative h-48 w-full bg-gradient-to-b from-blue-900/20 to-bg-card">
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
                      {yacht.builder} &middot; {yacht.type} &middot;{" "}
                      {yacht.year}
                    </p>

                    {/* Price */}
                    <div className="mt-4 mb-6">
                      <span
                        className={cn(
                          "text-3xl font-semibold",
                          other
                            ? (() => {
                                const [res] = compareValues(
                                  yacht.price,
                                  other.price,
                                  "price"
                                );
                                return res === "better"
                                  ? "text-success"
                                  : res === "worse"
                                    ? "text-error/70"
                                    : "text-text-primary";
                              })()
                            : "text-text-primary"
                        )}
                      >
                        {yacht.price}
                      </span>
                      <span className="ml-2 text-xs text-text-secondary">
                        asking price
                      </span>
                    </div>

                    {/* Spec rows */}
                    <div className="space-y-0">
                      {SPEC_FIELDS.map((field) => {
                        const val = String(yacht[field.key]);
                        let result: CompareResult = "neutral";
                        if (other) {
                          const otherVal = String(other[field.key]);
                          const [res] = compareValues(
                            val,
                            otherVal,
                            field.key
                          );
                          result = res;
                        }
                        return (
                          <SpecRow
                            key={field.label}
                            label={field.label}
                            value={val}
                            compareResult={other ? result : undefined}
                            isLocation={field.isLocation}
                          />
                        );
                      })}
                    </div>

                    {/* Footer actions */}
                    <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                      <span className="text-xs text-text-secondary">
                        {timeAgo(slot.fetchedAt)}
                      </span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => loadSlot(side === "a" ? setSlotA : setSlotB, slot.url)}
                          className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Refresh
                        </button>
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
                </div>
              );
            })}
          </div>
        )}

        {/* ── Empty state ── */}
        {!eitherLoaded && slotA.status !== "loading" && slotB.status !== "loading" && (
          <div className="mt-4 text-center">
            <p className="text-sm text-text-secondary">
              Paste listing URLs above or use Quick Compare to get started
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
