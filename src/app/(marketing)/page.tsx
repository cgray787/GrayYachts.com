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

const proofPoints = [
  {
    eyebrow: "BROKER-LED",
    title: "Valuations grounded in the market",
    description:
      "Your estimate is reviewed against current listings and recent sold comps — not produced by a generic calculator.",
  },
  {
    eyebrow: "BUILT TO BE SEEN",
    title: "Cinematic listing presentation",
    description:
      "Professional photography, video, drone media, and digital walkthroughs give serious buyers a reason to engage.",
  },
  {
    eyebrow: "PACIFIC NORTHWEST",
    title: "Local knowledge, clear guidance",
    description:
      "Practical advice for the region's boats, buyers, marinas, and market — from first conversation through closing.",
  },
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
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sell/img/hero.jpg"
          alt="Motor yacht underway"
          className="absolute inset-0 h-full w-full object-cover object-[58%_center]"
        />
        <div className="absolute inset-0 bg-[#040812]/70" />
        <div className="absolute inset-0 bg-gradient-to-b from-[#040812]/65 via-transparent to-[#060a12]" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#040812]/65 via-transparent to-[#040812]/30" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex flex-col items-center px-6 text-center"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-[10px] font-semibold tracking-[0.38em] text-gold sm:text-xs"
          >
            GRAY YACHTS · PACIFIC NORTHWEST
          </motion.p>

          <motion.h1
            variants={fadeUp}
            custom={1}
            className="mt-6 max-w-5xl font-[family-name:var(--font-cormorant)] text-5xl font-light leading-[0.95] text-white sm:text-7xl md:text-8xl"
          >
            Buy well. Sell with confidence.
          </motion.h1>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-7 max-w-2xl text-sm leading-relaxed text-white/75 sm:text-base md:text-lg"
          >
            Yacht brokerage and cinematic marketing for owners and buyers
            across the Pacific Northwest.
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
              BROWSE YACHTS
            </Link>
            <a
              href="/sell"
              className="inline-flex items-center justify-center gap-2.5 border border-gold/50 px-9 py-4 text-[11px] font-medium tracking-[0.25em] text-gold transition-all duration-300 hover:border-gold hover:bg-gold/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold"
            >
              <LineChart size={14} />
              VALUE MY YACHT
            </a>
          </motion.div>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-6 text-xs text-text-secondary"
          >
            Broker-reviewed valuation &middot; about 60 seconds &middot; no obligation
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
            Answer six quick questions and receive a Pacific Northwest market
            opinion informed by current listings and recent sold comps —
            reviewed by a broker, not generated by a generic calculator.
          </motion.p>

          <motion.div variants={fadeUp} custom={3}>
            <a
              href="/sell"
              className="mt-9 inline-flex items-center gap-2.5 bg-gold px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              VALUE MY YACHT <ArrowRight size={14} />
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
      {/*  CREDIBILITY                                                 */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-bg-primary py-24 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-center text-[10px] tracking-[0.35em] text-gold"
          >
            THE GRAY YACHTS APPROACH
          </motion.p>
          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 text-center font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl"
          >
            Clear advice. Strong presentation. No guesswork.
          </motion.h2>
          <div className="mt-14 grid gap-px overflow-hidden border border-border bg-border md:grid-cols-3">
            {proofPoints.map((point, i) => (
              <motion.article
                key={point.eyebrow}
                variants={fadeUp}
                custom={i + 2}
                className="bg-bg-secondary p-8 sm:p-10"
              >
                <p className="text-[10px] font-semibold tracking-[0.25em] text-gold">
                  {point.eyebrow}
                </p>
                <h3 className="mt-4 font-[family-name:var(--font-cormorant)] text-2xl font-light leading-tight text-text-primary">
                  {point.title}
                </h3>
                <p className="mt-4 text-sm leading-relaxed text-text-secondary">
                  {point.description}
                </p>
              </motion.article>
            ))}
          </div>
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
            Yacht Broker &middot; Pacific Northwest
          </motion.p>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-6 text-sm leading-relaxed text-text-secondary"
          >
            Connor Gray helps owners and buyers make clear, well-supported
            decisions in the Pacific Northwest yacht market. Each engagement
            combines responsive brokerage guidance with polished digital
            presentation — from the first conversation through closing.
          </motion.p>

          <motion.div variants={fadeUp} custom={5}>
            <a
              href="tel:4256718474"
              className="mt-8 inline-flex items-center gap-2.5 bg-gold px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              <Phone size={14} />
              CALL CONNOR
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
