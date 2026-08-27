"use client";

import { motion } from "framer-motion";
import {
  Phone,
  Mail,
  MapPin,
  Instagram,
  ArrowRight,
  ChevronDown,
  Ship,
  LineChart,
} from "lucide-react";
import Link from "next/link";

import { FleetGallery } from "@/components/marketing/fleet-gallery";
import { Testimonials } from "@/components/marketing/testimonials";
import { heroSlides } from "@/lib/fleet";

/* ------------------------------------------------------------------ */
/*  Animation helpers                                                  */
/* ------------------------------------------------------------------ */

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number = 0) => ({
    opacity: 1,
    y: 0,
    transition: { duration: 0.8, delay: i * 0.15, ease: "easeOut" as const },
  }),
};

const stagger = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

/* ------------------------------------------------------------------ */
/*  Data                                                               */
/* ------------------------------------------------------------------ */

const stats = [
  { value: "$250M+", label: "VESSELS REPRESENTED" },
  { value: "15+", label: "YEARS EXPERIENCE" },
  { value: "PNW", label: "EXCLUSIVE TERRITORY" },
];



/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default function HomePage() {
  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a12] via-[#0a1422] to-[#0c1a2e]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#060a12_75%)]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex flex-col items-center px-6 text-center"
        >
          <motion.h1
            variants={fadeUp}
            custom={0}
            className="font-[family-name:var(--font-cormorant)] text-5xl font-light tracking-[0.3em] text-text-primary sm:text-7xl md:text-8xl"
          >
            GRAY YACHTS
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-6 text-[11px] font-medium tracking-[0.35em] text-gold sm:text-xs"
          >
            PACIFIC NORTHWEST&apos;S PREMIER YACHT EXPERIENCE
          </motion.p>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-8 max-w-2xl font-[family-name:var(--font-cormorant)] text-2xl font-light leading-snug text-text-primary sm:text-3xl md:text-4xl"
          >
            Explore the fleet, or find out what yours is worth.
          </motion.p>

          {/* Two paths, one per audience: buyers go to the fleet, owners go to
              the valuation questionnaire at /sell. Equal weight — we do not
              know which one a given visitor is. */}
          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-4"
          >
            <Link
              href="/fleet"
              className="inline-flex items-center justify-center gap-2.5 bg-gold px-9 py-4 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <Ship size={14} />
              EXPLORE YACHTS
            </Link>
            <a
              href="/sell"
              className="inline-flex items-center justify-center gap-2.5 border border-gold/50 px-9 py-4 text-[11px] font-medium tracking-[0.25em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <LineChart size={14} />
              GET AN EVALUATION
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-6 text-xs text-text-secondary"
          >
            Free market valuation &middot; about 60 seconds &middot; no obligation
          </motion.p>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.8, duration: 1 }}
          className="absolute bottom-10 z-10 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-[0.3em] text-text-secondary">
            SCROLL
          </span>
          <ChevronDown size={14} className="animate-bounce text-text-secondary" />
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  SELL — the second path out of the hero. Routes to /sell,     */}
      {/*  the existing valuation questionnaire.                        */}
      {/* ============================================================ */}
      <section
        id="sell"
        className="relative border-y border-border bg-bg-secondary py-24 px-6 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            THINKING OF SELLING
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-light leading-tight text-text-primary sm:text-4xl"
          >
            What is your yacht worth today?
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-5 text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Six quick questions and you will get a real Pacific Northwest
            market valuation with recent sold comps — read by a working
            broker, not generated by an algorithm.
          </motion.p>

          <motion.div variants={fadeUp} custom={3}>
            <a
              href="/sell"
              className="mt-9 inline-flex items-center gap-2.5 bg-gold px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              GET AN EVALUATION <ArrowRight size={14} />
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-5 text-xs text-text-secondary"
          >
            About 60 seconds &middot; No obligation
          </motion.p>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURED VESSELS                                            */}
      {/* ============================================================ */}
      <section
        id="fleet"
        className="border-y border-border bg-bg-secondary py-28 px-6 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          {/* Hero-only scroller — one card per vessel, no interior shots. */}
          {/* The full Step Inside gallery lives on /fleet.                */}
          <FleetGallery
            slides={heroSlides}
            eyebrow="BROWSE THE FLEET"
            heading="Swipe Through Listings"
            showCaption={false}
          />

          <motion.div variants={fadeUp} custom={3} className="mt-12 text-center">
            <Link
              href="/fleet"
              className="inline-flex items-center gap-2.5 border border-gold/60 px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-gold transition-all duration-300 hover:bg-gold hover:text-bg-primary"
            >
              EXPLORE FULL FLEET <ArrowRight size={14} />
            </Link>
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  STATS                                                       */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-bg-secondary py-24 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3"
        >
          {stats.map((stat, i) => (
            <motion.div
              key={stat.label}
              variants={fadeUp}
              custom={i}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-cormorant)] text-5xl font-light text-text-primary md:text-6xl">
                {stat.value}
              </p>
              <p className="mt-3 text-[10px] tracking-[0.3em] text-text-secondary">
                {stat.label}
              </p>
            </motion.div>
          ))}
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS — self-hides while src/lib/testimonials.ts is  */}
      {/*  empty, so no invented social proof can ship.                */}
      {/* ============================================================ */}
      <Testimonials />

      {/* ============================================================ */}
      {/*  CONTACT / BIO                                               */}
      {/* ============================================================ */}
      <section id="contact" className="bg-bg-primary py-28 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mx-auto max-w-2xl text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            GET IN TOUCH
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-10 h-32 w-32 overflow-hidden rounded-full border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/connor-gray-sm.jpeg"
              alt="Connor Gray"
              className="h-full w-full object-cover"
            />
          </motion.div>

          <motion.h2
            variants={fadeUp}
            custom={2}
            className="mt-6 font-[family-name:var(--font-cormorant)] text-4xl font-light text-text-primary sm:text-5xl"
          >
            Connor Gray
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={3}
            className="mt-2 text-sm tracking-wide text-gold"
          >
            Premier Yacht Broker &middot; Pacific Northwest
          </motion.p>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-6 text-sm leading-relaxed text-text-secondary"
          >
            With over fifteen years navigating the Pacific Northwest marine
            market, Connor Gray brings an unmatched combination of market
            knowledge, cinematic marketing capability, and white-glove client
            service to every engagement. Whether you&apos;re listing a vessel or
            searching for your next acquisition, Gray Yachts delivers a
            brokerage experience without parallel.
          </motion.p>

          <motion.div variants={fadeUp} custom={5}>
            <a
              href="tel:4256718474"
              className="mt-8 inline-flex items-center gap-2.5 bg-gold px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              <Phone size={14} />
              CALL NOW
            </a>
          </motion.div>

          <motion.div
            variants={fadeUp}
            custom={6}
            className="mt-10 flex flex-col items-center gap-3 sm:flex-row sm:justify-center sm:gap-8"
          >
            <a
              href="https://instagram.com/grayyachts_"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
            >
              <Instagram size={15} />
              @grayyachts_
            </a>
            <a
              href="mailto:connor@grayyachts.com"
              className="inline-flex items-center gap-2 text-sm text-text-secondary transition-colors duration-300 hover:text-text-primary"
            >
              <Mail size={15} />
              connor@grayyachts.com
            </a>
            <span className="inline-flex items-center gap-2 text-sm text-text-secondary">
              <MapPin size={15} />
              Seattle, WA
            </span>
          </motion.div>
        </motion.div>
      </section>
    </>
  );
}
