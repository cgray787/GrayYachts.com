"use client";

import type { DragEvent } from "react";
import { GripVertical, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { YachtListing } from "@/lib/yacht-catalog";
import { YachtImage } from "./yacht-image";

/**
 * Single row in a catalog list. Draggable into the comparison slots, with
 * inline LEFT / RIGHT pickers and a delete button. `onAssign` is the only
 * thing that's page-specific — on /portal/compare-yachts it sets the slot
 * locally; on /portal/yacht-catalog it persists the slot then navigates to
 * the comparison page.
 */
export function CatalogCard({
  yacht,
  isActive,
  onAssign,
  onRemove,
}: {
  yacht: YachtListing;
  isActive: boolean;
  onAssign: (slot: "a" | "b") => void;
  onRemove: () => void;
  /** @deprecated kept for backwards compatibility, no longer used. */
  isSeed?: boolean;
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
          : "border-border hover:border-gold/30",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-text-secondary/40" />

      <div
        className={cn(
          "relative h-10 w-14 shrink-0 overflow-hidden rounded-md bg-gradient-to-br",
          yacht.gradient,
        )}
      >
        <YachtImage yacht={yacht} />
      </div>

      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium text-text-primary">
          {yacht.name}
        </p>
        <p className="truncate text-xs text-text-secondary">
          {yacht.builder} &middot; {yacht.year} &middot; {yacht.price}
        </p>
      </div>

      <span
        className={cn(
          "hidden shrink-0 rounded-full px-2 py-0.5 text-[10px] font-medium sm:inline-block",
          yacht.sourceBadgeColor,
        )}
      >
        {yacht.source}
      </span>

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
