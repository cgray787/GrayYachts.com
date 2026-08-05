"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import type { GalleryPhoto } from "@/lib/fleet";

/**
 * Hero + thumbnail strip. Thumbnails swap the hero in place (no lightbox),
 * with an "n / total" counter over the image.
 */
export function ListingGallery({
  photos,
  alt,
  badge,
}: {
  photos: GalleryPhoto[];
  alt: string;
  badge?: string;
}) {
  const [i, setI] = useState(0);
  const total = photos.length;
  if (total === 0) return null;

  const go = (n: number) => setI((n + total) % total);
  const active = photos[i];

  return (
    <div>
      <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-border bg-bg-card">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          key={active.src}
          src={active.src}
          alt={`${alt} — ${active.caption}`}
          className="h-full w-full object-cover"
        />

        {badge && (
          <span className="absolute left-5 top-5 z-10 rounded-full bg-gold px-3.5 py-1.5 text-[10px] font-semibold tracking-[0.2em] text-bg-primary shadow-md">
            {badge}
          </span>
        )}

        <span className="absolute bottom-5 left-5 z-10 rounded-full border border-border-light/50 bg-bg-primary/80 px-3 py-1 text-[11px] tracking-[0.15em] text-text-primary backdrop-blur">
          {i + 1} / {total}
        </span>

        <span className="absolute bottom-5 right-5 z-10 hidden rounded-full border border-border-light/50 bg-bg-primary/80 px-3 py-1 text-[10px] tracking-[0.15em] text-text-secondary backdrop-blur sm:block">
          {active.caption.toUpperCase()}
        </span>

        {total > 1 && (
          <>
            <button
              type="button"
              onClick={() => go(i - 1)}
              aria-label="Previous photo"
              className="absolute left-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-light/50 bg-bg-primary/70 text-text-primary backdrop-blur transition-colors duration-300 hover:border-gold hover:text-gold"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => go(i + 1)}
              aria-label="Next photo"
              className="absolute right-4 top-1/2 z-10 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full border border-border-light/50 bg-bg-primary/70 text-text-primary backdrop-blur transition-colors duration-300 hover:border-gold hover:text-gold"
            >
              <ChevronRight size={18} />
            </button>
          </>
        )}
      </div>

      {total > 1 && (
        <div className="mt-4 flex gap-3 overflow-x-auto pb-2">
          {photos.map((p, n) => (
            <button
              key={p.src}
              type="button"
              onClick={() => setI(n)}
              aria-label={`View ${p.caption}`}
              aria-current={n === i}
              className={`relative h-16 w-24 shrink-0 overflow-hidden rounded-lg border transition-all duration-300 sm:h-20 sm:w-28 ${
                n === i
                  ? "border-gold opacity-100"
                  : "border-border opacity-50 hover:opacity-90"
              }`}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={p.src} alt={p.caption} loading="lazy" className="h-full w-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
