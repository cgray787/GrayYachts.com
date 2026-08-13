"use client";

import { motion } from "framer-motion";

import { testimonials } from "@/lib/testimonials";

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.7, delay: i * 0.08, ease: "easeOut" as const },
  }),
};

/**
 * Renders nothing while src/lib/testimonials.ts is empty — the site never
 * shows placeholder or invented social proof.
 */
export function Testimonials() {
  if (testimonials.length === 0) return null;

  return (
    <section className="bg-bg-secondary px-6 py-24 lg:px-12">
      <div className="mx-auto max-w-6xl">
        <div className="text-center">
          <p className="text-[10px] tracking-[0.35em] text-gold">IN THEIR WORDS</p>
          <h2 className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light text-text-primary sm:text-5xl">
            What Owners Say
          </h2>
        </div>

        <div className="mt-14 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {testimonials.map((t, i) => (
            <motion.figure
              key={t.name + i}
              variants={fadeUp}
              custom={i}
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.3 }}
              className="flex flex-col rounded-2xl border border-border bg-bg-card p-7 transition-colors duration-500 hover:border-gold"
            >
              <span
                aria-hidden
                className="font-[family-name:var(--font-cormorant)] text-5xl leading-none text-gold/50"
              >
                &ldquo;
              </span>
              <blockquote className="mt-3 flex-1 text-sm leading-relaxed text-text-secondary">
                {t.quote}
              </blockquote>
              <figcaption className="mt-6 border-t border-border pt-4">
                <p className="font-[family-name:var(--font-cormorant)] text-lg font-light text-text-primary">
                  {t.name}
                </p>
                {t.context && (
                  <p className="mt-1 text-[11px] tracking-[0.15em] text-text-secondary">
                    {t.context}
                  </p>
                )}
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  );
}
