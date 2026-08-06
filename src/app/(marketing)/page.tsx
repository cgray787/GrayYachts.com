"use client";

import { motion } from "framer-motion";
import {
  Anchor,
  Ship,
  Camera,
  Shield,
  Lock,
  Phone,
  Mail,
  MapPin,
  Instagram,
  ArrowRight,
  ChevronDown,
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

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

/* ================================================================== */
/*  PAGE                                                               */
/* ================================================================== */

export default function HomePage() {
  return (
    <>
      {/* ============================================================ */}
      {/*  HERO                                                        */}
      {/* ============================================================ */}
      <section className="relative flex h-screen flex-col items-center justify-center overflow-hidden">
        {/* Background gradient (placeholder for drone image) */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#060a12] via-[#0a1422] to-[#0c1a2e]" />
        {/* Subtle vignette overlay */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,#060a12_75%)]" />

        <motion.div
          initial="hidden"
          animate="visible"
          variants={stagger}
          className="relative z-10 flex flex-col items-center text-center px-6"
        >
          <motion.h1
            variants={fadeUp}
            custom={0}
            className="font-[family-name:var(--font-cormorant)] text-6xl font-light tracking-[0.35em] text-text-primary sm:text-7xl md:text-8xl lg:text-9xl"
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

          <motion.div variants={fadeUp} custom={2}>
            <Link
              href="#fleet"
              className="mt-10 inline-block border border-text-secondary/40 px-10 py-3.5 text-[11px] font-medium tracking-[0.25em] text-text-primary transition-all duration-500 hover:border-gold hover:text-gold"
            >
              EXPLORE THE FLEET
            </Link>
          </motion.div>
        </motion.div>

        {/* Scroll indicator */}
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
      {/*  EDITORIAL INTRO                                             */}
      {/* ============================================================ */}
      <section className="relative bg-bg-primary py-32 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.blockquote
            variants={fadeUp}
            custom={0}
            className="font-[family-name:var(--font-cormorant)] text-2xl font-light italic leading-relaxed text-text-primary sm:text-3xl md:text-4xl"
          >
            &ldquo;The vessel sells itself. We simply ensure the world sees
            it.&rdquo;
          </motion.blockquote>

          <motion.p
            variants={fadeUp}
            custom={1}
            className="mt-6 text-[10px] tracking-[0.35em] text-text-secondary"
          >
            &mdash; EST. PACIFIC NORTHWEST &mdash;
          </motion.p>

          <motion.div
            variants={fadeUp}
            custom={2}
            className="mx-auto mt-10 h-px w-16 bg-gold/40"
          />

          <motion.h2
            variants={fadeUp}
            custom={3}
            className="mt-10 font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl"
          >
            The Art of Yacht Brokerage
          </motion.h2>

          <motion.p
            variants={fadeUp}
            custom={4}
            className="mt-6 text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Gray Yachts brings a cinematic approach to yacht representation.
            Every vessel in our portfolio receives the full weight of our
            production capability — drone cinematography, professional
            photography, 3D walkthroughs, and authority content — creating an
            unmatched digital presence that attracts qualified buyers
            worldwide.
          </motion.p>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  OUR SERVICES                                                */}
      {/* ============================================================ */}
      <section id="services" className="relative bg-bg-secondary py-32 px-6 lg:px-12">
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

          {/* Service grid with overlay */}
          <div className="relative mt-16">
            <motion.div
              initial="hidden"
              whileInView="visible"
              viewport={{ once: true, amount: 0.1 }}
              variants={stagger}
              className="grid gap-6 sm:grid-cols-2"
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
                  <p className="text-[10px] tracking-[0.25em] text-text-secondary">
                    WHAT WE OFFER
                  </p>
                  <h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-2xl font-light text-text-primary">
                    {service.title}
                  </h3>
                  <p className="mt-3 text-sm leading-relaxed text-text-secondary">
                    {service.description}
                  </p>
                  <Link
                    href="#contact"
                    className="mt-5 inline-flex items-center gap-1.5 text-[11px] tracking-[0.15em] text-gold transition-colors duration-300 hover:text-gold-hover"
                  >
                    Learn More{" "}
                    <ArrowRight
                      size={12}
                      className="transition-transform duration-300 group-hover:translate-x-1"
                    />
                  </Link>
                </motion.div>
              ))}
            </motion.div>

            {/* Exclusive Member Access overlay */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.7, delay: 0.6 }}
              className="absolute inset-0 z-10 flex flex-col items-center justify-center rounded-lg bg-bg-primary/85 backdrop-blur-sm"
            >
              <div className="flex flex-col items-center text-center px-6">
                <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-full border border-border bg-bg-card">
                  <Lock size={22} className="text-gold" />
                </div>
                <h3 className="font-[family-name:var(--font-cormorant)] text-3xl font-light text-text-primary sm:text-4xl">
                  Exclusive Member Access
                </h3>
                <p className="mt-3 max-w-md text-sm text-text-secondary">
                  Full service details, pricing, and scheduling are available
                  through our client portal. Request access to view our
                  complete capabilities.
                </p>
                <Link
                  href="/portal"
                  className="mt-8 inline-block bg-gold px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
                >
                  ACCESS PORTAL
                </Link>
              </div>
            </motion.div>
          </div>
        </motion.div>
      </section>

      {/* ============================================================ */}
      {/*  STATS                                                       */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-bg-primary py-24 px-6 lg:px-12">
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
      {/*  FEATURED VESSELS                                            */}
      {/* ============================================================ */}
      <section id="fleet" className="bg-bg-primary py-32 px-6 lg:px-12">
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

          <motion.div
            variants={fadeUp}
            custom={3}
            className="mt-12 text-center"
          >
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
      {/*  TESTIMONIAL                                                 */}
      {/* ============================================================ */}
      <section className="bg-bg-secondary py-32 px-6 lg:px-12">
        <motion.div
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, amount: 0.3 }}
          variants={stagger}
          className="mx-auto max-w-3xl text-center"
        >
          <motion.blockquote
            variants={fadeUp}
            custom={0}
            className="font-[family-name:var(--font-cormorant)] text-xl font-light italic leading-relaxed text-text-primary sm:text-2xl md:text-3xl"
          >
            &ldquo;Gray Yachts transformed how we presented our 72-foot
            Viking. The drone cinematography and 3D walkthrough generated more
            qualified leads in two weeks than our previous broker did in six
            months.&rdquo;
          </motion.blockquote>

          <motion.div variants={fadeUp} custom={1} className="mt-8">
            <p className="text-[11px] font-medium tracking-[0.25em] text-gold">
              JAMES &amp; CATHERINE MERCER
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              Former Owners, M/Y Endeavour
            </p>
          </motion.div>
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
      <section id="contact" className="bg-bg-primary py-32 px-6 lg:px-12">
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

          {/* Connor Gray photo */}
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

          {/* Social / contact info */}
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
