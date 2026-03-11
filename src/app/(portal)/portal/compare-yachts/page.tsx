"use client";

import { useState } from "react";
import {
  CheckCircle,
  RefreshCw,
  ExternalLink,
  MapPin,
} from "lucide-react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  Static demo data                                                   */
/* ------------------------------------------------------------------ */

const SUPPORTED_SITES = [
  "YachtWorld",
  "BoatTrader",
  "Yacht Way",
  "boats.com",
  "Denison",
  "Any URL",
] as const;

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
  fetchedAgo: string;
}

const LISTINGS: [YachtListing, YachtListing] = [
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
    fetchedAgo: "Fetched 2 min ago",
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
    fetchedAgo: "Fetched just now",
  },
];

const URLS = [
  "https://www.yachtworld.com/yacht/2022-benetti-oasis-40m-8267590",
  "https://www.boattrader.com/boat/2021-oyster-745-8150322",
] as const;

/* ------------------------------------------------------------------ */
/*  Spec row helper                                                    */
/* ------------------------------------------------------------------ */

interface SpecRowProps {
  label: string;
  value: string;
  highlight?: boolean;
  isLocation?: boolean;
}

function SpecRow({ label, value, highlight, isLocation }: SpecRowProps) {
  return (
    <div className="flex items-center justify-between border-b border-border/50 py-2.5 last:border-b-0">
      <span className="text-xs text-text-secondary">{label}</span>
      {isLocation ? (
        <span className="flex items-center gap-1 text-sm font-medium text-gold">
          <MapPin className="h-3 w-3" />
          {value}
        </span>
      ) : highlight ? (
        <span className="text-sm font-medium text-success">{value}</span>
      ) : (
        <span className="text-sm font-medium text-text-primary">{value}</span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export default function CompareYachtsPage() {
  const [urlLeft] = useState(URLS[0]);
  const [urlRight] = useState(URLS[1]);

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 py-12 sm:px-10">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
            Compare Yachts
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Import listings from any site and compare side-by-side
          </p>
        </div>

        {/* ── Status bar ── */}
        <div className="mb-8 rounded-lg border border-success/20 bg-success/5 px-5 py-3.5">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-success" />
            <span className="text-sm font-medium text-success">
              Listings Loaded
            </span>
            <span className="text-sm text-text-secondary">&mdash; Comparing</span>
          </div>
          <p className="mt-1 text-xs text-text-secondary">
            Data auto-fetched from listing URLs. Paste new links anytime to
            update.
          </p>
        </div>

        {/* ── URL inputs ── */}
        <div className="mb-8 flex flex-col items-stretch gap-4 lg:flex-row lg:items-center">
          {/* Left URL */}
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-success" />
              <span className="truncate text-sm text-text-primary">
                {urlLeft}
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                Loaded
              </span>
            </div>
          </div>

          {/* VS divider */}
          <div className="flex items-center justify-center lg:px-4">
            <span className="text-xs font-bold tracking-widest text-text-secondary">
              V S
            </span>
          </div>

          {/* Right URL */}
          <div className="flex-1">
            <div className="flex items-center gap-2 rounded-lg border border-border bg-bg-card px-4 py-3">
              <CheckCircle className="h-4 w-4 shrink-0 text-success" />
              <span className="truncate text-sm text-text-primary">
                {urlRight}
              </span>
              <span className="ml-auto shrink-0 rounded-full bg-success/10 px-2.5 py-0.5 text-xs font-medium text-success">
                Loaded
              </span>
              <button className="shrink-0 rounded-md bg-success/10 px-3 py-1 text-xs font-medium text-success transition-colors hover:bg-success/20">
                Compared
              </button>
            </div>
          </div>
        </div>

        {/* ── Supported sites ── */}
        <div className="mb-10 flex flex-wrap items-center gap-2">
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

        {/* ── Comparison cards ── */}
        <div className="grid gap-6 lg:grid-cols-2">
          {LISTINGS.map((yacht, i) => (
            <div
              key={yacht.name}
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
                  {yacht.builder} &middot; {yacht.type} &middot; {yacht.year}
                </p>

                {/* Price */}
                <div className="mt-4 mb-6">
                  <span className="text-3xl font-semibold text-text-primary">
                    {yacht.price}
                  </span>
                  <span className="ml-2 text-xs text-text-secondary">
                    asking price
                  </span>
                </div>

                {/* Spec rows */}
                <div className="space-y-0">
                  <SpecRow label="Length" value={yacht.length} />
                  <SpecRow label="Beam" value={yacht.beam} />
                  <SpecRow label="Max Speed" value={yacht.maxSpeed} />
                  <SpecRow label="Cabins" value={yacht.cabins} />
                  <SpecRow
                    label="Range"
                    value={yacht.range}
                    highlight={yacht.rangeHighlight}
                  />
                  <SpecRow
                    label="Location"
                    value={yacht.location}
                    isLocation
                  />
                  <SpecRow label="Engine" value={yacht.engine} />
                </div>

                {/* Footer actions */}
                <div className="mt-6 flex items-center justify-between border-t border-border pt-4">
                  <span className="text-xs text-text-secondary">
                    {yacht.fetchedAgo}
                  </span>
                  <div className="flex items-center gap-3">
                    <button className="inline-flex items-center gap-1.5 text-xs text-text-secondary transition-colors hover:text-text-primary">
                      <RefreshCw className="h-3 w-3" />
                      Refresh
                    </button>
                    <a
                      href="#"
                      className="inline-flex items-center gap-1.5 text-xs text-gold transition-colors hover:text-gold-hover"
                    >
                      <ExternalLink className="h-3 w-3" />
                      View Listing
                    </a>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
