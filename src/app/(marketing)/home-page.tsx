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
import { responsive } from "@/lib/responsive-image";

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
        {/* The hero used to be two bare CSS gradients with no vessel in it at
            all, while /sell opened on a mega yacht. This is that same shot and
            the same navy wash, so both entry points read as one brand.

            It deliberately points at the file public/sell.html already
            preloads rather than a second copy: one asset, no drift, and it is
            already warm in the CDN. Swap the photo and both pages change —
            that coupling is the point. Decorative only, hence alt="". */}
        <img
          {...responsive("/sell/img/hero.jpg", "100vw")}
          alt=""
          aria-hidden="true"
          fetchPriority="high"
          className="absolute inset-0 h-full w-full object-cover object-[center_40%]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(6,10,18,0.72)_0%,rgba(6,10,18,0.80)_45%,rgba(6,10,18,0.97)_100%)]" />

        {/* CSS fade (globals.css .hero-rise), not framer-motion: the motion version
            rendered the hero at opacity 0 until hydration, so the H1 (the LCP
            element) painted at 7.4 s on mobile Lighthouse (2026-10-17). */}
        <div className="relative z-10 flex flex-col items-center px-6 text-center">
          <h1
            className="hero-rise [animation-delay:0ms] font-[family-name:var(--font-cormorant)] text-5xl font-light tracking-[0.3em] text-text-primary sm:text-7xl md:text-8xl"
          >
            GRAY YACHTS
          </h1>

          <p
            className="hero-rise [animation-delay:150ms] mt-6 text-[11px] font-medium tracking-[0.35em] text-gold sm:text-xs"
          >
            SEATTLE YACHT BROKERAGE · PACIFIC NORTHWEST
          </p>

          <p
            className="hero-rise [animation-delay:300ms] mt-8 max-w-2xl font-[family-name:var(--font-cormorant)] text-2xl font-light leading-snug text-text-primary sm:text-3xl md:text-4xl"
          >
            Explore the fleet, or find out what yours is worth.
          </p>

          {/* Two paths, one per audience: buyers go to the fleet, owners go to
              the valuation questionnaire at /sell. Equal weight — we do not
              know which one a given visitor is. */}
          <div
            className="hero-rise [animation-delay:450ms] mt-10 flex w-full max-w-md flex-col items-stretch gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:items-center sm:gap-4"
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
          </div>

          <p
            className="hero-rise [animation-delay:600ms] mt-6 text-xs text-text-secondary"
          >
            Free market valuation &middot; about 60 seconds &middot; no obligation
          </p>
        </div>

        <div
          className="hero-rise [animation-delay:1800ms] [animation-duration:1000ms] absolute bottom-10 z-10 flex flex-col items-center gap-2"
        >
          <span className="text-[10px] tracking-[0.3em] text-text-secondary">
            SCROLL
          </span>
          <ChevronDown size={14} className="animate-bounce text-text-secondary" />
        </div>
      </section>

      {/* ============================================================ */}
      {/*  SELL — the second path out of the hero. Routes to /sell,     */}
      {/*  the existing valuation questionnaire.                        */}
      {/* ============================================================ */}
      <section
        id="sell"
        className="relative border-y border-border bg-bg-secondary py-24 px-6 lg:px-12"
      >
        <div
          className="mx-auto max-w-3xl text-center"
        >
          <p
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            THINKING OF SELLING
          </p>

          <h2
            className="mt-4 font-[family-name:var(--font-cormorant)] text-3xl font-light leading-tight text-text-primary sm:text-4xl"
          >
            What is your yacht worth today?
          </h2>

          <p
            className="mt-5 text-sm leading-relaxed text-text-secondary sm:text-base"
          >
            Six quick questions and you will get a real Pacific Northwest
            market review with current asking-price comparables — read by a working
            broker, not generated by an algorithm.
          </p>

          <div>
            <a
              href="/sell"
              className="mt-9 inline-flex items-center gap-2.5 bg-gold px-9 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              GET AN EVALUATION <ArrowRight size={14} />
            </a>
          </div>

          <p
            className="mt-5 text-xs text-text-secondary"
          >
            About 60 seconds &middot; No obligation
          </p>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  FEATURED VESSELS                                            */}
      {/* ============================================================ */}
      <section
        id="fleet"
        className="border-y border-border bg-bg-secondary py-28 px-6 lg:px-12"
      >
        <div
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

          <div className="mt-12 text-center">
            <Link
              href="/fleet"
              className="inline-flex items-center gap-2.5 border border-gold/60 px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-gold transition-all duration-300 hover:bg-gold hover:text-bg-primary"
            >
              EXPLORE FULL FLEET <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  STATS                                                       */}
      {/* ============================================================ */}
      <section className="border-y border-border bg-bg-secondary py-24 px-6 lg:px-12">
        <div
          className="mx-auto grid max-w-5xl gap-12 sm:grid-cols-3"
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="text-center"
            >
              <p className="font-[family-name:var(--font-cormorant)] text-5xl font-light text-text-primary md:text-6xl">
                {stat.value}
              </p>
              <p className="mt-3 text-[10px] tracking-[0.3em] text-text-secondary">
                {stat.label}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ============================================================ */}
      {/*  TESTIMONIALS — self-hides while src/lib/testimonials.ts is  */}
      {/*  empty, so no invented social proof can ship.                */}
      {/* ============================================================ */}
      <Testimonials />

      <section className="border-y border-[#c9a96e]/20 bg-[#f7f4ee] px-6 py-20 text-[#162636] lg:px-12">
        <div className="mx-auto flex max-w-7xl flex-col justify-between gap-8 md:flex-row md:items-end">
          <div className="max-w-2xl">
            <p className="text-xs uppercase tracking-[0.22em] text-[#756447]">The Gray Yachts newsletter</p>
            <h2 className="mt-5 font-[family-name:var(--font-cormorant)] text-4xl md:text-5xl">A little perspective before your next move.</h2>
            <p className="mt-5 max-w-xl leading-relaxed text-slate-600">Practical advice on buying and selling yachts in the Pacific Northwest, from your first viewing to preparing a boat for sale.</p>
          </div>
          <Link href="/newsletter" className="inline-flex shrink-0 items-center gap-5 self-start border-b border-[#ad9163] pb-3 text-sm md:self-auto">Read the newsletter <ArrowRight size={18}/></Link>
        </div>
      </section>

      {/* ============================================================ */}
      {/*  CONTACT / BIO                                               */}
      {/* ============================================================ */}
      <section id="contact" className="bg-bg-primary py-28 px-6 lg:px-12">
        <div
          className="mx-auto max-w-2xl text-center"
        >
          <p
            className="text-[10px] tracking-[0.35em] text-gold"
          >
            GET IN TOUCH
          </p>

          <div
            className="mx-auto mt-10 h-32 w-32 overflow-hidden rounded-full border border-border"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/connor-gray-sm.jpeg"
              alt="Connor Gray"
              loading="lazy"
              decoding="async"
              width={128}
              height={128}
              className="h-full w-full object-cover"
            />
          </div>

          <h2
            className="mt-6 font-[family-name:var(--font-cormorant)] text-4xl font-light text-text-primary sm:text-5xl"
          >
            Connor Gray
          </h2>

          <p
            className="mt-2 text-sm tracking-wide text-gold"
          >
            Premier Yacht Broker &middot; Pacific Northwest
          </p>

          <p
            className="mt-6 text-sm leading-relaxed text-text-secondary"
          >
            With over fifteen years navigating the Pacific Northwest marine
            market, Connor Gray brings an unmatched combination of market
            knowledge, cinematic marketing capability, and white-glove client
            service to every engagement. Whether you&apos;re listing a vessel or
            searching for your next acquisition, Gray Yachts delivers a
            brokerage experience without parallel.
          </p>

          <div>
            <a
              href="tel:4256718474"
              className="mt-8 inline-flex items-center gap-2.5 bg-gold px-10 py-3.5 text-[11px] font-semibold tracking-[0.25em] text-bg-primary transition-colors duration-300 hover:bg-gold-hover"
            >
              <Phone size={14} />
              CALL NOW
            </a>
          </div>

          <div
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
          </div>
        </div>
      </section>
    </>
  );
}
