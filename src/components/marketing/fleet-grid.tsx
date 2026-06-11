"use client";

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

/**
 * Flex-wrap layout so that orphan cards in the last row CENTRE instead
 * of pinning to the left edge (the typical 5-in-a-3-col-grid problem).
 * Card widths use calc() to match a 3-col / 2-col / 1-col responsive
 * grid with 24px gaps.
 */
export function FleetGrid({ vessels }: { vessels: Vessel[] }) {
  return (
    <motion.div
      initial="hidden"
      whileInView="visible"
      viewport={{ once: true, amount: 0.05 }}
      variants={stagger}
      className="mt-16 flex flex-wrap justify-center gap-6"
    >
      {vessels.map((vessel, i) => {
        const Wrapper = vessel.href ? motion.a : motion.div;
        const wrapperProps = vessel.href
          ? { href: vessel.href, target: "_blank", rel: "noopener noreferrer" }
          : {};
        return (
          <Wrapper
            key={vessel.name}
            variants={fadeUp}
            custom={i}
            {...wrapperProps}
            className="group flex w-full flex-col overflow-hidden rounded-2xl border border-border bg-bg-card transition-all duration-500 hover:-translate-y-1 hover:border-gold hover:shadow-[0_24px_60px_-24px_rgba(201,169,110,0.35)] sm:w-[calc(50%-12px)] lg:w-[calc(33.333%-16px)]"
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
  );
}
