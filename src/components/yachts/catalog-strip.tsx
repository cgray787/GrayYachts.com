"use client";

import { Ship, X } from "lucide-react";

import { cn } from "@/lib/utils";
import type { YachtListing } from "@/lib/yacht-catalog";
import { YachtImage } from "./yacht-image";

/**
 * The always-visible catalog rail that sits above "Compare by URL".
 *
 * Every yacht added through the URL box lands in `catalog`, so new additions
 * show up here automatically — this component is purely a view over that
 * state and holds none of its own.
 *
 * Fixed height (~2.5in) with horizontal overflow: the rail keeps its footprint
 * whether the visitor has two yachts or twenty, and long catalogs scroll
 * sideways instead of pushing the comparison off the screen.
 */
export function CatalogStrip({
  catalog,
  leftId,
  rightId,
  onAssign,
  onRemove,
}: {
  catalog: YachtListing[];
  leftId: string;
  rightId: string;
  onAssign: (yachtId: string, slot: "a" | "b") => void;
  onRemove: (yachtId: string) => void;
}) {
  return (
    <div className="mb-6 rounded-xl border border-border bg-bg-card p-4">
      <div className="mb-3 flex items-baseline justify-between gap-3">
        <h2 className="flex items-center gap-2 text-sm font-semibold text-text-primary">
          <Ship className="h-4 w-4 text-gold" />
          Your Yacht Catalog
          <span className="rounded-full bg-bg-secondary px-2 py-0.5 text-[10px] font-semibold text-text-secondary">
            {catalog.length}
          </span>
        </h2>
        <span className="hidden text-[11px] text-text-secondary sm:block">
          Scroll sideways &middot; click L or R to load a slot
        </span>
      </div>

      {catalog.length === 0 ? (
        <div className="flex h-[190px] items-center justify-center rounded-lg border border-dashed border-border text-xs text-text-secondary">
          No yachts yet — paste a listing URL below and it lands here.
        </div>
      ) : (
        <div className="flex gap-3 overflow-x-auto pb-2">
          {catalog.map((yacht) => {
            const isLeft = yacht.id === leftId;
            const isRight = yacht.id === rightId;
            return (
              <div
                key={yacht.id}
                className={cn(
                  "group relative flex h-[190px] w-44 shrink-0 flex-col overflow-hidden rounded-lg border bg-bg-secondary transition-colors",
                  isLeft || isRight
                    ? "border-gold/60"
                    : "border-border hover:border-border-light",
                )}
              >
                {/* Thumbnail */}
                <div
                  className={cn(
                    "relative h-20 w-full shrink-0 overflow-hidden bg-gradient-to-br",
                    yacht.gradient,
                  )}
                >
                  <YachtImage yacht={yacht} />
                  {(isLeft || isRight) && (
                    <span className="absolute left-1.5 top-1.5 z-10 rounded bg-gold px-1.5 py-0.5 text-[9px] font-bold text-bg-primary">
                      {isLeft ? "LEFT" : "RIGHT"}
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onRemove(yacht.id)}
                    aria-label={`Remove ${yacht.name} from your catalog`}
                    className="absolute right-1.5 top-1.5 z-20 rounded bg-bg-primary/80 p-1 text-text-secondary opacity-0 transition-opacity hover:text-red-400 focus-visible:opacity-100 group-hover:opacity-100"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>

                {/* Title + meta */}
                <div className="flex flex-1 flex-col justify-between p-2.5">
                  <div>
                    <p
                      className="truncate text-xs font-semibold text-text-primary"
                      title={yacht.name}
                    >
                      {yacht.name}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] text-text-secondary">
                      {[yacht.builder, yacht.year].filter(Boolean).join(" · ")}
                    </p>
                    <p className="mt-0.5 truncate text-[10px] font-medium text-gold">
                      {yacht.price}
                    </p>
                  </div>

                  <div className="mt-1.5 flex gap-1">
                    <button
                      type="button"
                      onClick={() => onAssign(yacht.id, "a")}
                      className={cn(
                        "flex-1 rounded border py-1 text-[10px] font-semibold transition-colors",
                        isLeft
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border text-text-secondary hover:border-gold/50 hover:text-gold",
                      )}
                    >
                      L
                    </button>
                    <button
                      type="button"
                      onClick={() => onAssign(yacht.id, "b")}
                      className={cn(
                        "flex-1 rounded border py-1 text-[10px] font-semibold transition-colors",
                        isRight
                          ? "border-gold bg-gold/15 text-gold"
                          : "border-border text-text-secondary hover:border-gold/50 hover:text-gold",
                      )}
                    >
                      R
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
