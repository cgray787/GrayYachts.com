"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Anchor,
  Ship,
  Camera,
  Shield,
  Phone,
  Mail,
  MapPin,
  Instagram,
  ArrowRight,
  ArrowUpDown,
  ChevronDown,
  Link2,
  Bookmark,
  Scale,
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

const services = [
  {
    icon: Ship,
    title: "Dealership",
    description:
      "Full-service new and pre-owned yacht dealership partnerships across the Pacific Northwest's premier marine brands.",
  },
  {
    icon: Anchor,
    title: "Captain Services",
    description:
      "Licensed captains for delivery, sea trials, and owner training — ensuring your vessel is in expert hands at every stage.",
  },
  {
    icon: Shield,
    title: "Brokerage Listing",
    description:
      "Strategic listing representation with cinematic marketing, global syndication, and white-glove negotiation from contract to close.",
  },
  {
    icon: Camera,
    title: "Photography",
    description:
      "Drone cinematography, professional photography, 3D Matterport walkthroughs, and authority content that commands attention.",
  },
];

const stats = [
  { value: "$250M+", label: "VESSELS REPRESENTED" },
  { value: "15+", label: "YEARS EXPERIENCE" },
  { value: "PNW", label: "EXCLUSIVE TERRITORY" },
];

const compareSteps = [
  {
    icon: Link2,
    title: "Paste any listing",
    description:
      "YachtWorld, Boat Trader, or any broker's page. We pull the specs, photos, and asking price automatically.",
  },
  {
    icon: Bookmark,
    title: "Build your catalog",
    description:
      "Every yacht you add is saved to your own catalog so you can pick the shortlist back up whenever you like.",
  },
  {
    icon: ArrowUpDown,
    title: "Compare side by side",
    description:
      "Length, beam, speed, cabins, range, engine hours, and location — lined up so the better boat is obvious.",
  },
];

/* A static illustration of the comparison output. Deliberately not live data —
   it's a preview of the tool, and inventing numbers on a real vessel would be
   worse than showing an obviously generic example. */
const previewRows = [
  { label: "Length", a: "62 ft", b: "58 ft", winner: "a" },
  { label: "Max Speed", a: "32 kn", b: "36 kn", winner: "b" },
  { label: "Cabins", a: "4", b: "3", winner: "a" },
  { label: "Engine Hours", a: "1,240", b: "610", winner: "b" },
];

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default function HomePage() {
  const router = useRouter();
  const [url, setUrl] = useState("");

  // Hand the URL to /compare, which scrapes it and drops it into a slot.
  // Validation lives on the comparison page so there is exactly one copy of it.
  const startComparison = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = url.trim();
    router.push(trimmed ? `/compare?add=${encodeURIComponent(trimmed)}` : "/compare");
  };

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
            className="mt-8 max-w-xl text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Browse the fleet, build a shortlist, and compare any two yachts on
            the market side by side. No account, no gatekeeping — just the
            numbers you need to choose the right boat.
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              href="/compare"
              className="inline-flex items-center gap-2.5 bg-gold px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              <Scale size={14} />
              COMPARE YACHTS
            </Link>
            <Link
              href="/fleet"
              className="inline-block border border-text-secondary/40 px-9 py-3.5 text-[11px] font-medium tracking-[0.25em] text-text-primary transition-all duration-500 hover:border-gold hover:text-gold"
            >
              EXPLORE THE FLEET
            </Link>
          </motion.div>
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
      {/*  COMPARE YACHTS — the front-and-centre attraction            */}
      {/* ============================================================ */}
      <section
        id="compare"
        className="relative border-y border-border bg-bg-secondary py-28 px-6 lg:px-12"
      >
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-center text-[10px] tracking-[0.35em] text-gold"
          >
            FREE TO USE &middot; NO SIGN-IN REQUIRED
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mx-auto mt-4 max-w-3xl text-center font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl md:text-5xl"
          >
            Compare Any Two Yachts, Side by Side
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-5 max-w-2xl text-center text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Paste a listing link from anywhere on the web. We pull the specs
            into a clean comparison so you can see exactly how two boats stack
            up — without opening a dozen tabs.
          </motion.p>

          {/* URL entry — the primary call to action on the page */}
          <motion.form
            variants={fadeUp}
            custom={3}
            onSubmit={startComparison}
            className="mx-auto mt-10 flex w-full max-w-2xl flex-col gap-3 sm:flex-row"
          >
            <div className="relative flex-1">
              <Link2 className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary" />
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste a yacht listing URL…"
                aria-label="Yacht listing URL"
                className="w-full rounded-md border border-border bg-bg-card py-3.5 pl-11 pr-4 text-sm text-text-primary placeholder:text-text-secondary/70 transition-colors focus:border-gold/60 focus:outline-none"
              />
            </div>
            <button
              type="submit"
              className="inline-flex items-center justify-center gap-2 rounded-md bg-gold px-8 py-3.5 text-[11px] font-semibold tracking-[0.2em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              COMPARE <ArrowRight size={14} />
            </button>
          </motion.form>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-4 text-center text-xs text-text-secondary"
          >
            No link handy?{" "}
            <Link href="/compare" className="text-gold hover:text-gold-hover">
              Open the comparison tool
            </Link>{" "}
            and start from our fleet.
          </motion.p>

          {/* Preview of the comparison output */}
          <motion.div
            variants={fadeUp}
            custom={5}
            className="mx-auto mt-14 max-w-2xl overflow-hidden rounded-lg border border-border bg-bg-card"
          >
            <div className="grid grid-cols-3 border-b border-border bg-bg-primary/40 px-5 py-3 text-[10px] tracking-[0.2em] text-text-secondary">
              <span>SPEC</span>
              <span className="text-center">YACHT A</span>
              <span className="text-center">YACHT B</span>
            </div>
            {previewRows.map((row) => (
              <div
                key={row.label}
                className="grid grid-cols-3 items-center border-b border-border/60 px-5 py-3.5 text-sm last:border-b-0"
              >
                <span className="text-text-secondary">{row.label}</span>
                <span
                  className={`text-center ${
                    row.winner === "a"
                      ? "font-semibold text-gold"
                      : "text-text-primary"
                  }`}
                >
                  {row.a}
                </span>
                <span
                  className={`text-center ${
                    row.winner === "b"
                      ? "font-semibold text-gold"
                      : "text-text-primary"
                  }`}
                >
                  {row.b}
                </span>
              </div>
            ))}
            <p className="bg-bg-primary/40 px-5 py-2.5 text-center text-[10px] tracking-[0.15em] text-text-secondary">
              EXAMPLE OUTPUT — GOLD MARKS THE STRONGER SPEC
            </p>
          </motion.div>

          {/* How it works */}
          <motion.div
            variants={fadeUp}
            custom={6}
            className="mt-16 grid gap-6 sm:grid-cols-3"
          >
            {compareSteps.map((step) => (
              <div
                key={step.title}
                className="rounded-lg border border-border bg-bg-card p-6 transition-colors duration-300 hover:border-border-light"
              >
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-md bg-gold-muted">
                  <step.icon size={18} className="text-gold" />
                </div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-xl font-light text-text-primary">
                  {step.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-text-secondary">
                  {step.description}
                </p>
              </div>
            ))}
          </motion.div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  YACHT CATALOG                                               */}
      {/* ============================================================ */}
      <section className="bg-bg-primary py-28 px-6 lg:px-12">
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
            YOUR YACHT CATALOG
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl"
          >
            Keep Every Boat You&rsquo;re Considering in One Place
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mt-5 text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Shopping a yacht means juggling listings across half a dozen
            brokerages. Add them all to your catalog as you go — it stays in
            your browser, it&rsquo;s yours alone, and it&rsquo;s one click from
            a full side-by-side comparison.
          </motion.p>

          <motion.div variants={fadeUp} custom={3}>
            <Link
              href="/catalog"
              className="mt-9 inline-flex items-center gap-2.5 border border-gold/60 px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-gold transition-all duration-300 hover:bg-gold hover:text-bg-primary"
            >
              OPEN YOUR CATALOG <ArrowRight size={14} />
            </Link>
          </motion.div>
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
      {/*  OUR SERVICES — open to everyone. This section used to sit    */}
      {/*  behind a blurred "Exclusive Member Access" overlay.          */}
      {/* ============================================================ */}
      <section id="services" className="relative bg-bg-primary py-28 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.2 }}
          variants={stagger}
          className="mx-auto max-w-6xl"
        >
          <motion.p
            variants={fadeUp}
            custom={0}
            className="text-center text-[10px] tracking-[0.35em] text-gold"
          >
            OUR SERVICES
          </motion.p>

          <motion.h2
            variants={fadeUp}
            custom={1}
            className="mt-4 text-center font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl md:text-5xl"
          >
            Full-Spectrum Yacht Representation
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-4 max-w-xl text-center text-sm text-text-secondary"
          >
            From listing to closing, every detail handled with precision and
            cinematic craft.
          </motion.p>

          <motion.div
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.1 }}
            variants={stagger}
            className="mt-14 grid gap-6 sm:grid-cols-2"
          >
            {services.map((service, i) => (
              <motion.div
                key={service.title}
                variants={fadeUp}
                custom={i}
                className="group relative rounded-lg border border-border bg-bg-card p-8 transition-all duration-500 hover:border-border-light hover:bg-bg-card-hover"
              >
                <div className="mb-4 flex h-11 w-11 items-center justify-center rounded-md bg-gold-muted">
                  <service.icon size={20} className="text-gold" />
                </div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
                  {service.title}
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                  {service.description}
                </p>
                <Link
                  href="#contact"
                  className="mt-5 inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-gold transition-colors duration-300 hover:text-gold-hover"
                >
                  Talk to Connor{" "}
                  <ArrowRight
                    size={12}
                    className="transition-transform duration-300 group-hover:translate-x-1"
                  />
                </Link>
              </motion.div>
            ))}
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
