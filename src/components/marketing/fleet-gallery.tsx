"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import type { GallerySlide } from "@/lib/fleet";

type FleetGalleryProps = {
  slides: GallerySlide[];
  eyebrow?: string;
  heading?: string;
  /**
   * Show the photo-specific caption (e.g. "Main Salon"). Set false when
   * slides are all hero shots and the caption would be redundant with
   * the vessel name.
   */
  showCaption?: boolean;
};

/**
 * Horizontal scroll-snap carousel with arrow controls + pagination dots.
 * Used by:
 *   - homepage #fleet section (heroSlides, captions hidden)
 *   - /fleet page (gallerySlides, captions shown)
 */
export function FleetGallery({
  slides,
  eyebrow,
  heading,
  showCaption = true,
}: FleetGalleryProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [activeIdx, setActiveIdx] = useState(0);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  // Which slide sits closest to the centre of the viewport.
  const updateProgress = () => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.firstElementChild
      ? (track.firstElementChild as HTMLElement).offsetWidth + 16
      : 1;
    const idx = Math.round(track.scrollLeft / slideWidth);
    setActiveIdx(Math.min(idx, slides.length - 1));
    setCanPrev(track.scrollLeft > 8);
    setCanNext(
      track.scrollLeft + track.clientWidth < track.scrollWidth - 8,
    );
  };

  const scrollBy = (dir: -1 | 1) => {
    const track = trackRef.current;
    if (!track) return;
    const slideWidth = track.firstElementChild
      ? (track.firstElementChild as HTMLElement).offsetWidth + 16
      : 0;
    track.scrollBy({ left: dir * slideWidth, behavior: "smooth" });
  };

  // Keyboard ←/→ when the carousel is on screen.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const track = trackRef.current;
      if (!track) return;
      const rect = track.getBoundingClientRect();
      const visible = rect.top < window.innerHeight && rect.bottom > 0;
      if (!visible) return;
      if (e.key === "ArrowLeft") scrollBy(-1);
      if (e.key === "ArrowRight") scrollBy(1);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    updateProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="mt-20">
      {(eyebrow || heading) && (
        <div className="text-center">
          {eyebrow && (
            <p className="text-[10px] tracking-[0.35em] text-gold">{eyebrow}</p>
          )}
          {heading && (
            <h3 className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl">
              {heading}
            </h3>
          )}
        </div>
      )}

      {/* Track */}
      {/*
        Real padding-inline on the track gives the first/last slides
        room to sit inset from the container edge instead of clipping
        against it. The scroll-padding-inline on the snap port matches
        so snap math agrees with the visual layout. The trailing 8%
        margin on the last slide compensates for the well-known
        WebKit/Chromium quirk where end padding on a horizontal scroll
        container is not always included in scrollWidth.
      */}
      <div
        ref={trackRef}
        onScroll={updateProgress}
        className="mt-10 flex gap-4 overflow-x-auto scroll-smooth pb-4 [padding-inline:8%] [scroll-padding-inline:8%] [scroll-snap-type:x_mandatory] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        role="region"
        aria-label="Vessel gallery"
      >
        {slides.map((slide, i) => {
          // First slide snaps flush to start, last to end, everything else
          // to centre. Combined with the 8% padding above, the first slide
          // sits 8% in from the container edge at scrollLeft=0 instead of
          // clipping against it.
          const snapAlign =
            i === 0
              ? "[scroll-snap-align:start]"
              : i === slides.length - 1
                ? "[scroll-snap-align:end]"
                : "[scroll-snap-align:center]";
          const edgeMargin =
            i === slides.length - 1 ? "[margin-inline-end:8%]" : "";
          return (
          <figure
            key={`${slide.vessel.name}-${i}`}
            className={`group relative shrink-0 overflow-hidden rounded-2xl border border-border bg-bg-card ${snapAlign} ${edgeMargin} w-[82%] sm:w-[55%] lg:w-[40%]`}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={slide.src}
              alt={`${slide.vessel.name} — ${slide.caption}`}
              loading="lazy"
              className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-bg-primary/95 via-bg-primary/20 to-transparent" />
            <figcaption className="absolute bottom-0 left-0 right-0 p-6">
              <p className="text-[10px] font-medium tracking-[0.3em] text-gold">
                {slide.vessel.year} &middot; {slide.vessel.make.toUpperCase()}
              </p>
              <p className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl font-light leading-tight text-text-primary">
                {slide.vessel.name}
              </p>
              {showCaption && (
                <p className="mt-1 font-[family-name:var(--font-cormorant)] text-base italic text-gold/80">
                  {slide.caption}
                </p>
              )}
              <p className="mt-1 text-xs text-text-secondary">
                {slide.vessel.length} &middot; {slide.vessel.location} &middot;{" "}
                <span className="text-text-primary">{slide.vessel.price}</span>
              </p>
            </figcaption>
          </figure>
          );
        })}
      </div>

      {/* Controls */}
      <div className="mt-8 flex items-center justify-center gap-6">
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          disabled={!canPrev}
          aria-label="Previous yacht"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-bg-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gold"
        >
          <ChevronLeft size={18} strokeWidth={1.5} />
        </button>

        <div className="flex items-center gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                const track = trackRef.current;
                if (!track) return;
                const slideWidth = track.firstElementChild
                  ? (track.firstElementChild as HTMLElement).offsetWidth + 16
                  : 0;
                track.scrollTo({ left: i * slideWidth, behavior: "smooth" });
              }}
              aria-label={`Go to slide ${i + 1}`}
              aria-current={i === activeIdx}
              className={`h-1.5 rounded-full transition-all duration-300 ${
                i === activeIdx
                  ? "w-8 bg-gold"
                  : "w-1.5 bg-border-light hover:bg-text-secondary"
              }`}
            />
          ))}
        </div>

        <button
          type="button"
          onClick={() => scrollBy(1)}
          disabled={!canNext}
          aria-label="Next yacht"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-gold/60 text-gold transition-all duration-300 hover:border-gold hover:bg-gold hover:text-bg-primary disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:bg-transparent disabled:hover:text-gold"
        >
          <ChevronRight size={18} strokeWidth={1.5} />
        </button>
      </div>
    </div>
  );
}
