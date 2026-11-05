"use client";

import { useMemo, useRef, useSyncExternalStore } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ChevronDown, Search, SlidersHorizontal, ArrowUpDown, X } from "lucide-react";

import type { Vessel } from "@/lib/fleet";
import { responsive } from "@/lib/responsive-image";
import { InquiryForm } from "@/components/marketing/inquiry-form";
import { readFleetSearch, writeFleetSearch, fleetRequirements, FLEET_SORTS, type FleetSearch } from "@/lib/fleet-search";

const FLEET_CHANGE = "fleet-search-change";
function subscribeToSearch(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(FLEET_CHANGE, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(FLEET_CHANGE, onChange);
  };
}
const browserSearch = () => window.location.search;
const serverSearch = () => "";

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

const SORTS = FLEET_SORTS;

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
  return (
    <div className="relative max-w-full">
      {icon && <span aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gold">{icon}</span>}
      <select
        aria-label={allLabel === "Featured" ? "Sort vessels" : allLabel.replace("All ", "Filter by ")}
        value={value ?? ""}
        onChange={(event) => onChange(event.target.value || null)}
        className={`h-11 max-w-full appearance-none rounded-full border bg-bg-card py-2 pr-9 text-sm tracking-wide transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold ${icon ? "pl-9" : "pl-4"} ${
          value !== null ? "border-gold text-gold" : "border-border text-text-secondary hover:border-border-light hover:text-text-primary"
        }`}
      >
        <option value="">{allLabel}</option>
        {options.map((option) => <option key={option} value={option}>{option}</option>)}
      </select>
      <ChevronDown aria-hidden="true" size={14} className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-text-secondary" />
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
          {...responsive(vessel.image, "(min-width: 1024px) 33vw, (min-width: 640px) 50vw, 100vw")}
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
  const search = useSyncExternalStore(subscribeToSearch, browserSearch, serverSearch);
  const editingSearch = useRef(false);
  const locations = useMemo(
    () => Array.from(new Set(vessels.map((v) => v.location))).sort(),
    [vessels],
  );
  const types = useMemo(
    () => Array.from(new Set(vessels.map(vesselType))).sort(),
    [vessels],
  );

  const choices = useMemo(() => ({
    price: PRICE_BANDS.map((band) => band.label),
    length: LENGTH_BANDS.map((band) => band.label),
    year: YEAR_BANDS.map((band) => band.label),
    location: locations,
    type: types,
  }), [locations, types]);
  const filters = useMemo(() => readFleetSearch(new URLSearchParams(search), choices), [search, choices]);
  const { query, price, length, year, location, type, sort } = filters;
  const requirements = fleetRequirements(filters);

  function updateFilters(patch: Partial<FleetSearch>, replace = false) {
    const current = readFleetSearch(new URLSearchParams(window.location.search), choices);
    const params = writeFleetSearch(new URLSearchParams(window.location.search), { ...current, ...patch });
    const next = `${window.location.pathname}${params.size ? `?${params}` : ""}${window.location.hash}`;
    if (next === `${window.location.pathname}${window.location.search}${window.location.hash}`) return;
    if (replace) window.history.replaceState(null, "", next);
    else window.history.pushState(null, "", next);
    window.dispatchEvent(new Event(FLEET_CHANGE));
  }

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
    editingSearch.current = false;
    updateFilters({ query: "", price: null, length: null, year: null, location: null, type: null });
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
          onChange={(e) => {
            updateFilters({ query: e.target.value }, editingSearch.current);
            editingSearch.current = true;
          }}
          onBlur={() => { editingSearch.current = false; }}
          onKeyDown={(e) => { if (e.key === "Enter") editingSearch.current = false; }}
          maxLength={160}
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
        <FilterSelect value={price} allLabel="All Prices" options={PRICE_BANDS.map((b) => b.label)} onChange={(value) => updateFilters({ price: value })} />
        <FilterSelect value={length} allLabel="All Lengths" options={LENGTH_BANDS.map((b) => b.label)} onChange={(value) => updateFilters({ length: value })} />
        <FilterSelect value={year} allLabel="All Years" options={YEAR_BANDS.map((b) => b.label)} onChange={(value) => updateFilters({ year: value })} />
        <FilterSelect value={location} allLabel="All Locations" options={locations} onChange={(value) => updateFilters({ location: value })} />
        <FilterSelect value={type} allLabel="All Types" options={types} onChange={(value) => updateFilters({ type: value })} />
      </div>

      {/* Sort + count */}
      <div className="mt-5 flex flex-wrap items-center justify-center gap-4">
        <FilterSelect
          value={sort === "Featured" ? null : sort}
          allLabel="Featured"
          options={SORTS.filter((s) => s !== "Featured")}
          onChange={(value) => updateFilters({ sort: (value ?? "Featured") as FleetSearch["sort"] })}
          icon={<ArrowUpDown size={14} />}
        />
        <p role="status" aria-live="polite" aria-atomic="true" className="text-xs tracking-[0.2em] text-text-secondary">
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
          <details className="mx-auto mt-6 max-w-lg text-left">
            <summary className="cursor-pointer rounded-full bg-gold px-6 py-3 text-center text-sm font-semibold text-bg-primary hover:bg-gold-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold">
              Ask Connor to find a match
            </summary>
            <div className="mt-6 rounded-xl border border-border bg-bg-card p-6">
              <p className="mb-6 text-sm leading-relaxed text-text-secondary">Your preferences: {requirements}</p>
              <InquiryForm vessel={`Fleet search: ${requirements}`} />
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
