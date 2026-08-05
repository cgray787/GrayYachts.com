"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

import type { Vessel } from "@/lib/fleet";

/* ------------------------------------------------------------------ */
/*  Parsing helpers — fleet.ts stores display strings, not numbers.    */
/* ------------------------------------------------------------------ */

/** "$1,100,000" -> 1100000 · "$35,000 OBO" -> 35000 · "Price on Application" -> null */
export function parsePrice(price: string): number | null {
  const m = price.replace(/,/g, "").match(/\$\s*(\d+(?:\.\d+)?)/);
  return m ? Number(m[1]) : null;
}

/** `30'5"` -> 30.42 · `34.5'` -> 34.5 · `42'` -> 42 */
export function parseLength(length: string): number | null {
  const feet = length.match(/(\d+(?:\.\d+)?)\s*'/);
  if (!feet) return null;
  const inches = length.match(/'\s*(\d+(?:\.\d+)?)\s*"/);
  return Number(feet[1]) + (inches ? Number(inches[1]) / 12 : 0);
}

/** Sail / Workboat / Power, derived from the vessel prefix and builder. */
export function vesselType(v: Vessel): "Sail" | "Power" | "Workboat" {
  if (/^S\/[YV]\b/.test(v.name)) return "Sail";
  if (/rozema/i.test(v.make)) return "Workboat";
  return "Power";
}

type Band = { label: string; test: (v: Vessel) => boolean };

const PRICE_BANDS: Band[] = [
  { label: "Under $50k", test: (v) => { const p = parsePrice(v.price); return p !== null && p < 50_000; } },
  { label: "$50k – $100k", test: (v) => { const p = parsePrice(v.price); return p !== null && p >= 50_000 && p < 100_000; } },
  { label: "$100k – $350k", test: (v) => { const p = parsePrice(v.price); return p !== null && p >= 100_000 && p < 350_000; } },
  { label: "$350k+", test: (v) => { const p = parsePrice(v.price); return p !== null && p >= 350_000; } },
  { label: "Price on Application", test: (v) => parsePrice(v.price) === null },
];

const LENGTH_BANDS: Band[] = [
  { label: "Under 25'", test: (v) => { const l = parseLength(v.length); return l !== null && l < 25; } },
  { label: "25' – 35'", test: (v) => { const l = parseLength(v.length); return l !== null && l >= 25 && l < 35; } },
  { label: "35' – 50'", test: (v) => { const l = parseLength(v.length); return l !== null && l >= 35 && l < 50; } },
  { label: "50' and up", test: (v) => { const l = parseLength(v.length); return l !== null && l >= 50; } },
];

const YEAR_BANDS: Band[] = [
  { label: "2020 and newer", test: (v) => v.year >= 2020 },
  { label: "2010 – 2019", test: (v) => v.year >= 2010 && v.year <= 2019 },
  { label: "2000 – 2009", test: (v) => v.year >= 2000 && v.year <= 2009 },
  { label: "Before 2000", test: (v) => v.year < 2000 },
];

const SORTS = [
  "Featured",
  "Price: Low to High",
  "Price: High to Low",
  "Length: Small to Large",
  "Length: Large to Small",
  "Year: Newest",
  "Year: Oldest",
] as const;
type Sort = (typeof SORTS)[number];

/* ------------------------------------------------------------------ */
/*  Dropdown                                                           */
/* ------------------------------------------------------------------ */

function FilterSelect({
  value,
  allLabel,
  options,
  onChange,
  icon,
}: {
  value: string | null;
  allLabel: string;
  options: string[];
  onChange: (v: string | null) => void;
  icon?: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const active = value !== null;

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        onBlur={() => window.setTimeout(() => setOpen(false), 150)}
        aria-expanded={open}
        className={`flex h-10 items-center gap-2 rounded-full border px-4 text-xs tracking-wide transition-colors duration-300 ${
          active
            ? "border-gold bg-gold/10 text-gold"
            : "border-border bg-bg-card text-text-secondary hover:border-border-light hover:text-text-primary"
        }`}
      >
        {icon}
        <span>{value ?? allLabel}</span>
        <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
      </button>

      {open && (
        <div className="absolute left-0 top-12 z-30 min-w-[13rem] overflow-hidden rounded-xl border border-border bg-bg-card py-1 shadow-[0_24px_60px_-20px_rgba(0,0,0,0.8)]">
          <button
            type="button"
            onMouseDown={() => { onChange(null); setOpen(false); }}
            className={`block w-full px-4 py-2 text-left text-xs transition-colors ${
              !active ? "bg-gold/15 text-gold" : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
            }`}
          >
            {allLabel}
          </button>
          {options.map((o) => (
            <button
              key={o}
              type="button"
              onMouseDown={() => { onChange(o); setOpen(false); }}
              className={`block w-full px-4 py-2 text-left text-xs transition-colors ${
                value === o ? "bg-gold/15 text-gold" : "text-text-secondary hover:bg-bg-secondary hover:text-text-primary"
              }`}
            >
              {o}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Card                                                               */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, delay: Math.min(i, 8) * 0.06, ease: "easeOut" as const },
  }),
};

function VesselCard({ vessel, index }: { vessel: Vessel; index: number }) {
  return (
    <motion.div
      variants={fadeUp}
      custom={index}
      initial="hidden"
      animate="visible"
      className="group relative flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition-all duration-500 hover:-translate-y-2 hover:border-gold hover:shadow-[0_28px_70px_-24px_rgba(201,169,110,0.4)] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
    >
      <div className="relative aspect-[4/3] overflow-hidden">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={vessel.image}
          alt={vessel.name}
          loading="lazy"
          className="h-full w-full object-cover transition-transform duration-[1200ms] ease-out group-hover:scale-110"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-primary/70 via-transparent to-transparent" />

        {vessel.badge && (
          <span className="absolute left-4 top-4 z-10 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-bg-primary shadow-md">
            {vessel.badge}
          </span>
        )}

        {vessel.tour3DUrl && (
          <a
            href={vessel.tour3DUrl}
            target="_blank"
            rel="noopener noreferrer"
            aria-label={`${vessel.name} 360° tour`}
            className="absolute right-4 top-4 z-20 inline-flex items-center gap-1.5 rounded-full border border-gold/40 bg-bg-primary/75 px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-gold shadow-md backdrop-blur transition-colors hover:bg-gold hover:text-bg-primary"
          >
            360&deg; TOUR
          </a>
        )}

        <span className="absolute bottom-4 right-4 z-10 rounded-full border border-border-light/60 bg-bg-primary/80 px-3 py-1 text-[10px] tracking-[0.2em] text-text-secondary backdrop-blur transition-colors duration-300 group-hover:border-gold group-hover:text-gold">
          {vesselType(vessel).toUpperCase()}
        </span>
      </div>

      <div className="flex flex-1 flex-col gap-2 p-6">
        <p className="text-[10px] font-medium tracking-[0.3em] text-gold">
          {vessel.year} &middot; {vessel.make.toUpperCase()}
        </p>
        <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light leading-tight text-text-primary transition-colors duration-300 group-hover:text-gold">
          {vessel.name}
        </h3>
        <div className="flex items-center gap-2.5 text-sm text-text-secondary">
          <span>{vessel.length}</span>
          <span className="h-1 w-1 rounded-full bg-border-light" />
          <span className="truncate">{vessel.location}</span>
        </div>

        <div className="mt-auto pt-4">
          <div className="h-px w-full bg-border" />
          <div className="flex items-end justify-between pt-3">
            <p className="font-[family-name:var(--font-cormorant)] text-xl font-medium text-text-primary">
              {vessel.price}
            </p>
            <span className="text-[10px] tracking-[0.25em] text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
              VIEW LISTING &rarr;
            </span>
          </div>
        </div>
      </div>

      {/* Card now opens the full listing page; the brochure PDF lives there. */}
      {vessel.slug && (
        <Link
          href={`/fleet/${vessel.slug}`}
          aria-label={`${vessel.name} listing`}
          className="absolute inset-0 z-10"
        />
      )}
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Browser                                                            */
/* ------------------------------------------------------------------ */

export function FleetBrowser({ vessels }: { vessels: Vessel[] }) {
  const [query, setQuery] = useState("");
  const [price, setPrice] = useState<string | null>(null);
  const [length, setLength] = useState<string | null>(null);
  const [year, setYear] = useState<string | null>(null);
  const [location, setLocation] = useState<string | null>(null);
  const [type, setType] = useState<string | null>(null);
  const [sort, setSort] = useState<Sort>("Featured");

  const locations = useMemo(
    () => Array.from(new Set(vessels.map((v) => v.location))).sort(),
    [vessels],
  );
  const types = useMemo(
    () => Array.from(new Set(vessels.map(vesselType))).sort(),
    [vessels],
  );

  const results = useMemo(() => {
    const q = query.trim().toLowerCase();
    let out = vessels.filter((v) => {
      if (q) {
        const hay = `${v.name} ${v.make} ${v.location} ${v.year}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      if (price && !PRICE_BANDS.find((b) => b.label === price)?.test(v)) return false;
      if (length && !LENGTH_BANDS.find((b) => b.label === length)?.test(v)) return false;
      if (year && !YEAR_BANDS.find((b) => b.label === year)?.test(v)) return false;
      if (location && v.location !== location) return false;
      if (type && vesselType(v) !== type) return false;
      return true;
    });

    // Unknowns ("Price on Application", unparseable length) must sink to the
    // BOTTOM in both directions — so the sentinel flips with the sort order.
    // Using +Infinity for both would float POA to the top of a High-to-Low sort.
    const asc = (n: number | null) => n ?? Number.POSITIVE_INFINITY;
    const desc = (n: number | null) => n ?? Number.NEGATIVE_INFINITY;
    const p = (v: Vessel) => parsePrice(v.price);
    const l = (v: Vessel) => parseLength(v.length);

    out = [...out];
    switch (sort) {
      case "Price: Low to High": out.sort((a, b) => asc(p(a)) - asc(p(b))); break;
      case "Price: High to Low": out.sort((a, b) => desc(p(b)) - desc(p(a))); break;
      case "Length: Small to Large": out.sort((a, b) => asc(l(a)) - asc(l(b))); break;
      case "Length: Large to Small": out.sort((a, b) => desc(l(b)) - desc(l(a))); break;
      case "Year: Newest": out.sort((a, b) => b.year - a.year); break;
      case "Year: Oldest": out.sort((a, b) => a.year - b.year); break;
      default: break; // Featured = fleet.ts order
    }
    return out;
  }, [vessels, query, price, length, year, location, type, sort]);

  const activeCount =
    [price, length, year, location, type].filter(Boolean).length + (query.trim() ? 1 : 0);

  const clearAll = () => {
    setQuery(""); setPrice(null); setLength(null);
    setYear(null); setLocation(null); setType(null);
  };

  return (
    <div className="mt-12">
      {/* Search */}
      <div className="relative mx-auto max-w-md">
        <Search
          size={16}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-text-secondary"
        />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, builder, or location…"
          aria-label="Search the fleet"
          className="h-11 w-full rounded-full border border-border bg-bg-card pl-11 pr-4 text-sm text-text-primary outline-none transition-colors duration-300 placeholder:text-text-secondary/70 focus:border-gold"
        />
      </div>

      {/* Filters */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
        <div className="flex items-center gap-2 text-text-secondary">
          <SlidersHorizontal size={15} />
          <span className="hidden text-xs tracking-[0.2em] sm:inline">FILTERS</span>
        </div>
        <FilterSelect value={price} allLabel="All Prices" options={PRICE_BANDS.map((b) => b.label)} onChange={setPrice} />
        <FilterSelect value={length} allLabel="All Lengths" options={LENGTH_BANDS.map((b) => b.label)} onChange={setLength} />
        <FilterSelect value={year} allLabel="All Years" options={YEAR_BANDS.map((b) => b.label)} onChange={setYear} />
        <FilterSelect value={location} allLabel="All Locations" options={locations} onChange={setLocation} />
        <FilterSelect value={type} allLabel="All Types" options={types} onChange={setType} />
      </div>

      {/* Sort + count */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
        <FilterSelect
          value={sort === "Featured" ? null : sort}
          allLabel="Featured"
          options={SORTS.filter((s) => s !== "Featured") as unknown as string[]}
          onChange={(v) => setSort((v ?? "Featured") as Sort)}
          icon={<ArrowUpDown size={14} />}
        />
        <p className="text-xs tracking-[0.2em] text-text-secondary">
          {results.length} {results.length === 1 ? "VESSEL" : "VESSELS"} FOUND
        </p>
        {activeCount > 0 && (
          <button
            type="button"
            onClick={clearAll}
            className="inline-flex items-center gap-1.5 text-xs tracking-[0.2em] text-gold transition-opacity hover:opacity-70"
          >
            <X size={13} /> CLEAR
          </button>
        )}
      </div>

      {/* Grid */}
      {results.length > 0 ? (
        <div className="mt-12 flex flex-wrap justify-center gap-6">
          {results.map((v, i) => (
            <VesselCard key={v.slug ?? v.name} vessel={v} index={i} />
          ))}
        </div>
      ) : (
        <div className="mt-20 text-center">
          <p className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary">
            No vessels match those filters
          </p>
          <p className="mt-3 text-sm text-text-secondary">
            Try widening your search — or tell me what you&rsquo;re after and I&rsquo;ll go find it.
          </p>
          <button
            type="button"
            onClick={clearAll}
            className="mt-8 inline-block border border-gold px-8 py-3 text-[11px] font-semibold tracking-[0.25em] text-gold transition-colors duration-300 hover:bg-gold hover:text-bg-primary"
          >
            CLEAR FILTERS
          </button>
        </div>
      )}
    </div>
  );
}
