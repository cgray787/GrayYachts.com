"use client";

import { useState, useCallback, useEffect, useRef, type DragEvent } from "react";
import Link from "next/link";
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
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  type YachtListing,
  SLOTS_KEY,
  loadCatalog,
  saveCatalog,
  scrapeYachtFromUrl,
  compareKnownSpec,
  comparePrice,
} from "@/lib/yacht-catalog";
import { YachtImage } from "@/components/yachts/yacht-image";
import { ToolShell } from "@/components/yachts/tool-shell";
import { CatalogStrip } from "@/components/yachts/catalog-strip";


/* ------------------------------------------------------------------ */
/*  Comparison helpers                                                 */
/* ------------------------------------------------------------------ */

type Winner = "a" | "b" | "tie";

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


/**
 * Read-only spec row. Compare Yachts is a *reference* surface: every
 * value here is sourced from the live listing scrape, so we deliberately
 * don't allow clients (or anyone else) to mutate the displayed specs —
 * a typo here would silently propagate into shared comparisons.
 */
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
        <span>{value}</span>
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
  // Oriented left-vs-right, matching winnerColor's "a"/"b" sides below.
  const priceWinner = comparePrice(left.priceNum, right.priceNum);

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
              winner = compareKnownSpec(leftNum, rightNum, field.lowerIsBetter);
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
  onMarkVerified,
}: {
  yacht: YachtListing;
  other: YachtListing;
  side: "a" | "b";
  dragOver: boolean;
  onDragOver: (e: DragEvent) => void;
  onDragLeave: () => void;
  onDrop: (e: DragEvent) => void;
  onMarkVerified: (verified: boolean) => void;
}) {
  /* Relative to THIS card: "a" means this yacht is the cheaper one. The badge
     used to test `priceWinner === side`, but "b" means the *other* boat won —
     so the right-hand card rendered "(lower)" exactly when it lost, and both
     cards claimed the lower price at once. */
  const priceVerdict = comparePrice(yacht.priceNum, other.priceNum);
  const thisYachtIsCheaper = priceVerdict === "a";

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
      <div className={cn("relative aspect-[16/7] w-full overflow-hidden bg-gradient-to-br", yacht.gradient)}>
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
              thisYachtIsCheaper
                ? "text-success"
                : priceVerdict === "tie"
                  ? "text-text-primary"
                  : "text-text-secondary/60"
            )}
          >
            {yacht.price}
          </span>
          <span className="ml-2 text-xs text-text-secondary">
            asking price
            {thisYachtIsCheaper && (
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
              const raw = compareKnownSpec(myNum, otherNum, field.lowerIsBetter);
              if (raw) {
                winner = raw === "a" ? side : raw === "b" ? (side === "a" ? "b" : "a") : "tie";
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
        const saved = JSON.parse(localStorage.getItem(SLOTS_KEY) || "{}");
        if (saved.leftId) return saved.leftId as string;
      } catch { /* ignore */ }
    }
    return catalog[0]?.id ?? "";
  });
  const [rightId, setRightId] = useState(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(SLOTS_KEY) || "{}");
        if (saved.rightId) return saved.rightId as string;
      } catch { /* ignore */ }
    }
    return catalog[1]?.id ?? "";
  });
  const [dragOverSlot, setDragOverSlot] = useState<"a" | "b" | null>(null);
  const [urlLeft, setUrlLeft] = useState("");
  const [urlRight, setUrlRight] = useState("");
  const [loadingLeft, setLoadingLeft] = useState(false);
  const [loadingRight, setLoadingRight] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  const [openRecentSlot, setOpenRecentSlot] = useState<"a" | "b" | null>(null);
  const recentRefA = useRef<HTMLDivElement | null>(null);
  const recentRefB = useRef<HTMLDivElement | null>(null);
  // Header-level catalog dropdown — quick read-only view of the catalog
  // anchored to the page title, so the user can pin LEFT/RIGHT without
  // scrolling. The full management UI lives at /catalog.

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
      localStorage.setItem(SLOTS_KEY, JSON.stringify({ leftId, rightId }));
    } catch { /* ignore */ }
  }, [leftId, rightId]);

  const leftYacht = catalog.find((y) => y.id === leftId) ?? catalog[0];
  const rightYacht = catalog.find((y) => y.id === rightId) ?? catalog[1];

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

  // Deep link: the public homepage hands us a listing URL as ?add=<url> so a
  // visitor can go from "paste a link" to a populated comparison in one step.
  // Read from window.location rather than useSearchParams — the latter forces
  // this whole client page under a Suspense boundary at prerender time.
  const [hydrated, setHydrated] = useState(false);
  useEffect(() => setHydrated(true), []);

  const deepLinkHandled = useRef(false);
  useEffect(() => {
    if (deepLinkHandled.current) return;
    deepLinkHandled.current = true;

    const incoming = new URLSearchParams(window.location.search).get("add");
    if (!incoming) return;

    // Drop the param so a refresh doesn't re-scrape the same listing.
    window.history.replaceState({}, "", window.location.pathname);

    // Fill whichever slot is still empty; default to the left.
    const slot: "a" | "b" = leftId && !rightId ? "b" : "a";
    void loadUrlToSlot(incoming, slot, () => {}, () => {});
    // Intentionally mount-only: the ref guard makes re-runs a no-op anyway.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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

  // See ToolShell: localStorage is invisible to the server, so hold off on
  // rendering the comparison until the client has mounted.
  if (!hydrated) {
    return (
      <ToolShell
        title="Compare Yachts"
        description="Compare any two yachts side-by-side. Paste listing URLs to add yachts to your catalog, then drag them into the comparison slots."
      />
    );
  }

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-7xl px-6 pb-24 pt-32 sm:px-10">
        {/* ── Header ── */}
        <div className="mb-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
                Compare Yachts
              </h1>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
                Compare any two yachts side-by-side. Paste listing URLs to add
                yachts to your catalog, then drag them into the comparison slots.
              </p>
            </div>

          </div>
        </div>

        {/* ── Catalog rail. Anything added through the URL box below lands   */}
        {/*    here automatically — it renders straight off `catalog` state.  */}
        <CatalogStrip
          catalog={catalog}
          leftId={leftId}
          rightId={rightId}
          onAssign={handleAssign}
          onRemove={handleRemove}
        />

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
            onMarkVerified={(v) => handleMarkVerified(rightYacht.id, v)}
          />
        </div>

        {/* ── Manage catalog link ── */}
        <div className="mt-12 flex items-center justify-center border-t border-border pt-6">
          <Link
            href="/catalog"
            className="inline-flex items-center gap-2 rounded-lg border border-border bg-bg-card px-5 py-2.5 text-sm font-medium text-text-secondary transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Ship className="h-4 w-4" />
            Manage in Yacht Catalog
            <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-primary">
              {catalog.length}
            </span>
          </Link>
        </div>
      </div>
    </div>
  );
}
