"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

import type { Vessel } from "@/lib/fleet";

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.12, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.1 } },
};

const GAP_PX = 24;

/**
 * Single-row carousel: 3 cards visible on desktop, 2 on tablet, 1 on
 * mobile. Arrows page one card at a time; the track also swipes /
 * scroll-snaps natively on touch.
 */
export function FleetGrid({ vessels }: { vessels: Vessel[] }) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(true);

  const updateArrows = useCallback(() => {
    const track = trackRef.current;
    if (!track) return;
    setCanPrev(track.scrollLeft > 4);
    setCanNext(track.scrollLeft < track.scrollWidth - track.clientWidth - 4);
  }, []);

  useEffect(() => {
    updateArrows();
    window.addEventListener("resize", updateArrows);
    return () => window.removeEventListener("resize", updateArrows);
  }, [updateArrows]);

  const scrollByCard = (dir: 1 | -1) => {
    const track = trackRef.current;
    if (!track) return;
    const card = track.querySelector<HTMLElement>("[data-fleet-card]");
    const amount = (card?.offsetWidth ?? track.clientWidth) + GAP_PX;
    track.scrollBy({ left: dir * amount, behavior: "smooth" });
  };

  return (
    <div className="relative mt-16">
      <motion.div
        ref={trackRef}
        onScroll={updateArrows}
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.05 }}
        variants={stagger}
        className="flex snap-x snap-mandatory gap-6 overflow-x-auto pb-2 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
      >
        {vessels.map((vessel, i) => {
          const Wrapper = vessel.href ? motion.a : motion.div;
          const wrapperProps = vessel.href
            ? { href: vessel.href, target: "_blank", rel: "noopener noreferrer" }
            : {};
          return (
            <Wrapper
              key={vessel.name}
              data-fleet-card
              variants={fadeUp}
              custom={i}
              {...wrapperProps}
              className="group flex w-full shrink-0 snap-start flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition-all duration-500 hover:-translate-y-1 hover:border-gold hover:shadow-[0_24px_60px_-24px_rgba(201,169,110,0.35)] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
            >
              {/* Image — 16:10 cinematic ratio (was 4:3) */}
              <div className="relative aspect-[16/10] overflow-hidden">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={vessel.image}
                  alt={vessel.name}
                  loading="lazy"
                  className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
                />
                {vessel.badge && (
                  <span className="absolute left-4 top-4 rounded-full bg-gold px-3 py-1 text-[10px] font-semibold tracking-[0.2em] text-bg-primary shadow-md">
                    {vessel.badge}
                  </span>
                )}
              </div>
              {/* Info stack */}
              <div className="flex flex-1 flex-col gap-2 p-6">
                <p className="text-[10px] font-medium tracking-[0.3em] text-gold">
                  {vessel.year} &middot; {vessel.make.toUpperCase()}
                </p>
                <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light leading-tight text-text-primary">
                  {vessel.name}
                </h3>
                <p className="text-sm text-text-secondary">
                  {vessel.length} &middot; {vessel.location}
                </p>
                <div className="mt-auto flex items-end justify-between pt-3">
                  <p className="font-[family-name:var(--font-cormorant)] text-xl font-medium text-text-primary">
                    {vessel.price}
                  </p>
                  {vessel.href && (
                    <span className="text-[10px] tracking-[0.25em] text-gold opacity-0 transition-opacity duration-300 group-hover:opacity-100">
                      VIEW &rarr;
                    </span>
                  )}
                </div>
              </div>
            </Wrapper>
          );
        })}
      </motion.div>

      <CarouselArrow side="left" enabled={canPrev} onClick={() => scrollByCard(-1)} />
      <CarouselArrow side="right" enabled={canNext} onClick={() => scrollByCard(1)} />
    </div>
  );
}

function CarouselArrow({
  side,
  enabled,
  onClick,
}: {
  side: "left" | "right";
  enabled: boolean;
  onClick: () => void;
}) {
  const Icon = side === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      aria-label={side === "left" ? "Previous boats" : "More boats"}
      onClick={onClick}
      disabled={!enabled}
      className={`absolute top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-gold/60 bg-bg-primary/80 text-gold shadow-lg backdrop-blur transition-all duration-300 hover:bg-gold hover:text-bg-primary ${
        side === "left" ? "-left-3 lg:-left-6" : "-right-3 lg:-right-6"
      } ${enabled ? "opacity-100" : "pointer-events-none opacity-0"}`}
    >
      <Icon className="h-5 w-5" />
    </button>
  );
}
