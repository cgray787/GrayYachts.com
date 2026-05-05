"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertTriangle,
  Link2,
  Loader2,
  Plus,
  Ship,
} from "lucide-react";
import { CatalogCard } from "@/components/portal/catalog-card";
import {
  loadCatalog,
  saveCatalog,
  scrapeYachtFromUrl,
  SLOTS_KEY,
  type YachtListing,
} from "@/lib/yacht-catalog";

/**
 * Yacht Catalog page — the user's personal collection of yacht listings
 * they've pulled in from YachtWorld, BoatTrader, brokerage URLs, etc.
 *
 * This page manages the catalog (add / list / remove). Comparison happens
 * on /portal/compare-yachts; clicking LEFT or RIGHT here pins the yacht to
 * that slot and routes to the comparison page so the cards render
 * immediately.
 */
export default function YachtCatalogPage() {
  const router = useRouter();
  const [catalog, setCatalog] = useState<YachtListing[]>(() => loadCatalog());
  const [urlInput, setUrlInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [scrapeError, setScrapeError] = useState<string | null>(null);
  // Mirror the comparison page's slot state so LEFT / RIGHT actions feel
  // continuous across the two pages.
  const [leftId, setLeftId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(SLOTS_KEY) || "{}");
        if (saved.leftId) return saved.leftId as string;
      } catch {
        /* ignore */
      }
    }
    return "";
  });
  const [rightId, setRightId] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = JSON.parse(localStorage.getItem(SLOTS_KEY) || "{}");
        if (saved.rightId) return saved.rightId as string;
      } catch {
        /* ignore */
      }
    }
    return "";
  });

  useEffect(() => {
    saveCatalog(catalog);
  }, [catalog]);

  useEffect(() => {
    try {
      localStorage.setItem(SLOTS_KEY, JSON.stringify({ leftId, rightId }));
    } catch {
      /* ignore */
    }
  }, [leftId, rightId]);

  const handleAddUrl = useCallback(async () => {
    const trimmed = urlInput.trim();
    if (!trimmed) return;

    try {
      new URL(trimmed);
    } catch {
      setScrapeError(
        "Please enter a valid URL (e.g. https://www.yachtworld.com/...)",
      );
      return;
    }

    setLoading(true);
    setScrapeError(null);

    try {
      const existing = catalog.find(
        (y) => y.url.toLowerCase() === trimmed.toLowerCase(),
      );
      if (existing) {
        setUrlInput("");
        setLoading(false);
        return;
      }

      const newYacht = await scrapeYachtFromUrl(trimmed);

      setCatalog((prev) => {
        const dup = prev.find(
          (y) => y.url.toLowerCase() === trimmed.toLowerCase(),
        );
        if (dup) return prev;
        return [...prev, newYacht];
      });
      setUrlInput("");
    } catch (err) {
      setScrapeError(
        err instanceof Error ? err.message : "Failed to load listing",
      );
    } finally {
      setLoading(false);
    }
  }, [urlInput, catalog]);

  const handleRemove = (yachtId: string) => {
    setCatalog((prev) => prev.filter((y) => y.id !== yachtId));
    if (yachtId === leftId) setLeftId("");
    if (yachtId === rightId) setRightId("");
  };

  /**
   * Pin a yacht to LEFT or RIGHT and bounce to the comparison page so the
   * cards render right away. If the same yacht is being moved to the slot
   * it's already in, swap with the other.
   */
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
    router.push("/portal/compare-yachts");
  };

  return (
    <div className="min-h-screen bg-bg-primary">
      <div className="mx-auto max-w-5xl px-6 py-12 sm:px-10">
        {/* ── Header ── */}
        <div className="mb-10">
          <h1 className="font-[family-name:var(--font-cormorant)] text-4xl font-light tracking-wide text-text-primary sm:text-5xl">
            Yacht Catalog
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-text-secondary">
            Your personal collection of yacht listings. Add yachts from any
            broker URL — when you&rsquo;re ready, click LEFT or RIGHT on a row
            to pin it for side-by-side comparison.
          </p>
        </div>

        {/* ── Add via URL ── */}
        <div className="mb-8">
          <h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
            Add Yacht from URL
          </h2>
          <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
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
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-gold px-5 py-3 text-sm font-semibold text-bg-primary transition-colors hover:bg-gold-hover disabled:cursor-not-allowed disabled:opacity-40"
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {loading ? "Loading…" : "Add to Catalog"}
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
              ),
            )}
          </div>
        </div>

        {/* ── Error banner ── */}
        {scrapeError && (
          <div className="mb-6 flex items-center gap-2 rounded-lg border border-error/30 bg-error/5 px-5 py-3">
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

        {/* ── Catalog list ── */}
        <div>
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-cormorant)] text-xl font-semibold text-text-primary">
              Your Yacht Catalog
              <span className="ml-2 text-sm font-normal text-text-secondary">
                ({catalog.length} yacht{catalog.length === 1 ? "" : "s"})
              </span>
            </h2>
            <p className="hidden text-xs text-text-secondary sm:block">
              Click LEFT or RIGHT to compare
            </p>
          </div>

          {catalog.length === 0 ? (
            <div className="rounded-xl border border-dashed border-border bg-bg-card/50 py-12 text-center">
              <Ship className="mx-auto mb-3 h-8 w-8 text-text-secondary/40" />
              <p className="text-sm text-text-secondary">
                No yachts in catalog. Paste a listing URL above to get started.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {catalog.map((yacht) => (
                <CatalogCard
                  key={yacht.id}
                  yacht={yacht}
                  isActive={yacht.id === leftId || yacht.id === rightId}
                  onAssign={(slot) => handleAssign(yacht.id, slot)}
                  onRemove={() => handleRemove(yacht.id)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
