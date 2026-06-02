"use client";

import { motion } from "framer-motion";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

import { FleetGallery } from "@/components/marketing/fleet-gallery";
import { FleetGrid } from "@/components/marketing/fleet-grid";
import { interiorSlides, vessels } from "@/lib/fleet";

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

export default function FleetPage() {
  return (
    <>
      {/* Spacer so the fixed navbar doesn't crash into the header */}
      <div className="h-24" />

      {/* ============================================================ */}
      {/*  PAGE HEADER                                                 */}
      {/* ============================================================ */}
      <section className="bg-bg-primary px-6 pb-12 pt-16 lg:px-12 lg:pt-24">
        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="mx-auto max-w-6xl text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            THE FLEET
          </motion.p>
          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-4 font-[family-name:var(--font-cormorant)] text-5xl font-light text-text-primary sm:text-6xl md:text-7xl"
          >
            Currently Representing
          </motion.h1>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Every vessel below is personally surveyed and represented out of
            the Pacific Northwest by Connor Gray. Walk the decks, step into
            the salons, and reach out when one earns your second look.
          </motion.p>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FULL FLEET GRID                                             */}
      {/* ============================================================ */}
      <section className="bg-bg-primary px-6 pb-16 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <FleetGrid vessels={vessels} />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STEP INSIDE — full interior + alternate-angle gallery       */}
      {/* ============================================================ */}
      <section className="bg-bg-secondary px-6 py-24 lg:px-12">
        <div className="mx-auto max-w-6xl">
          <FleetGallery
            slides={interiorSlides}
            eyebrow="ABOARD THE FLEET"
            heading="Step Inside"
          />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FOOTER CTA                                                  */}
      {/* ============================================================ */}
      <section className="bg-bg-primary px-6 py-24 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.4 }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            INTERESTED?
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 font-[family-name:var(--font-cormorant)] text-4xl font-light text-text-primary sm:text-5xl"
          >
            Let&rsquo;s Set a Showing
          </motion.h2>
          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-6 text-sm leading-relaxed text-text-secondary"
          >
            Each vessel can be viewed by appointment. Tell me which one caught
            your eye and I&apos;ll have the deck swept and the boat ready when
            you arrive.
          </motion.p>
          <motion.div variants={fadeUp} custom={3} className="mt-10">
            <Link
              href="/#contact"
              className="inline-block bg-gold px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              CONTACT CONNOR
            </Link>
          </motion.div>
          <motion.div variants={fadeUp} custom={4} className="mt-10">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-[11px] tracking-[0.25em] text-text-secondary transition-colors duration-300 hover:text-gold"
            >
              <ArrowLeft size={14} /> BACK HOME
            </Link>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
