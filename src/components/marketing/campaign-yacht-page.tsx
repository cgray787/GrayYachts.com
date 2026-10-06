/* eslint-disable @next/next/no-img-element */
import Link from "next/link";
import YachtFilm from "./yacht-film";
import { ArrowRight, Phone } from "lucide-react";
import { campaignYachts, discoveryEmail, type CampaignYacht } from "@/lib/campaign-yachts";

const shell = "mx-auto max-w-6xl px-6 lg:px-12";
const serif = "font-[family-name:var(--font-cormorant)]";
const label = "text-[10px] font-medium uppercase tracking-[0.22em]";
const cta = "inline-flex min-h-12 items-center justify-center gap-3 bg-gold px-7 py-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-bg-primary transition-colors hover:bg-gold-hover focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-gold";

export default function CampaignYachtPage({ yacht }: { yacht: CampaignYacht }) {
 const other = campaignYachts.find(y => y.slug !== yacht.slug)!;
 const pershing = yacht.slug === "pershing-6x";
 return <article className="bg-bg-primary text-text-primary">
  <section className="relative isolate overflow-hidden">
   <img src={yacht.photos[0].src} alt={yacht.photos[0].alt} fetchPriority="high" width={1600} height={1067} className="absolute inset-0 -z-20 h-full w-full object-cover"/>
   <div className="absolute inset-0 -z-10 bg-gradient-to-r from-[#060a12]/80 via-[#060a12]/35 to-transparent"/>
   <div className="absolute inset-0 -z-10 bg-gradient-to-t from-[#060a12] via-transparent to-[#060a12]/40"/>
   <div className={shell + " flex min-h-[680px] flex-col justify-end pb-14 pt-36 md:min-h-[760px] md:pb-20"}>
    <p className={label + " text-gold"}>{yacht.year} · {yacht.location}</p>
    <h1 className={serif + " mt-5 text-7xl font-light leading-none sm:text-8xl lg:text-[112px]"}>{yacht.name}</h1>
    <p className={serif + " mt-5 text-3xl text-[#e2c79d]"}>Life’s too short. Buy the yacht.</p>
    <p className="mt-5 max-w-md text-base leading-7 text-slate-200">{pershing ? "A 62-foot Pershing for the owner who enjoys the run as much as the destination." : "Three guest cabins and a flybridge made for weekends with family and friends."}</p>
    <div className="mt-8 flex flex-wrap items-center gap-6"><a href="#contact-connor" className={cta}>Request pricing & a call <ArrowRight size={15}/></a><a href="#yacht-film" className="text-[11px] uppercase tracking-[0.16em] text-white underline underline-offset-8">Watch the film</a></div>
    <div className="mt-7 w-fit border-l-2 border-gold bg-bg-primary/75 px-5 py-4"><p className={label + " text-slate-300"}>Asking price</p><p className="mt-2 text-3xl font-bold tracking-tight text-gold sm:text-4xl">Price on request</p></div><p className="mt-3 text-[11px] text-slate-300">Sistership shown</p>
   </div>
  </section>

  <div className="border-y border-border">
   <dl className={shell + " grid grid-cols-2 gap-x-6 gap-y-8 py-9 md:grid-cols-4"}>
    {yacht.specs.map(s=><div key={s.label}><dt className={label + " text-text-secondary"}>{s.label}</dt><dd className={serif + " mt-2 text-3xl font-light"}>{s.value}</dd></div>)}
   </dl>
  </div>

  <section className={shell + " py-14 md:py-20"}>
   <div className="mb-9 flex flex-wrap items-end justify-between gap-4">
    <div><p className={label + " text-gold"}>A closer look</p><h2 className={serif + " mt-3 text-4xl font-light"}>{pershing ? "On board the 6X." : "Room to spend the weekend."}</h2></div>
    <a href={yacht.source} target="_blank" rel="noopener noreferrer" className="text-xs text-gold underline underline-offset-4">View full specifications</a>
   </div>
   <div className="grid gap-5 md:grid-cols-2">
    {yacht.photos.slice(1).map((p,i)=><figure key={p.src} className={i===0 ? "md:col-span-2" : ""}><img src={p.src} alt={p.alt} loading="lazy" width={1600} height={1067} className="h-auto w-full"/><figcaption className="mt-3 text-[11px] text-text-secondary">{p.alt.replace(" sistership", "")} · Sistership shown</figcaption></figure>)}
   </div>
   <p className="mt-8 max-w-2xl text-sm leading-7 text-text-secondary">{pershing ? "The listing includes twin MAN V12 engines, a full-beam master suite and a hydraulic swim platform. Ask Connor for the current specification, delivery options and pricing." : "The listing includes three guest cabins, two guest heads and a flybridge with outdoor seating. Ask Connor about the current configuration, delivery options and pricing."}</p>
   <p className="mt-3 text-[11px] leading-5 text-text-secondary">Details checked October 6, 2026. Photos show a sistership. Equipment, specifications and availability require confirmation.</p>
  </section>

  <section id="yacht-film" className={shell + " scroll-mt-24 pb-14 md:pb-20"}>
   <p className={label + " text-gold"}>The film</p>
   <h2 className={serif + " mb-8 mt-3 text-4xl font-light"}>See the {yacht.name} in motion.</h2>
   <YachtFilm yacht={yacht}/>
  </section>

  <section id="contact-connor" className="scroll-mt-24 border-y border-border bg-bg-secondary">
   <div className={shell + " grid gap-10 py-14 md:grid-cols-[1.3fr_1fr] md:gap-20 md:py-20"}>
    <div>
     <p className={label + " text-gold"}>Talk with Connor</p>
     <h2 className={serif + " mt-4 text-4xl font-light leading-tight md:text-5xl"}>Is this the yacht<br/>you’ve been looking for?</h2>
     <p className="mt-5 max-w-md text-sm leading-7 text-text-secondary">Let’s spend 15 minutes on your plans, current pricing and what ownership would involve. Send a time that works for you and I’ll confirm.</p>
     <div className="mt-7"><a href={discoveryEmail(yacht.name)} className={cta}>Email Connor <ArrowRight size={15}/></a></div>
     <p className="mt-3 text-[11px] text-text-secondary">Opens a draft in your email app.</p>
    </div>
    <address className="self-center border-l border-gold/30 pl-7 not-italic">
     <p className={serif + " text-3xl"}>Connor Gray</p><p className={label + " mt-2 text-gold"}>Gray Yachts</p>
     <a href="tel:+14256718474" className="mt-6 flex items-center gap-3 text-lg hover:text-gold"><Phone size={16}/>425-671-8474</a>
     <a href="mailto:grayyachts@gmail.com" className="mt-3 block break-all text-sm text-text-secondary hover:text-gold">grayyachts@gmail.com</a>
     <p className="mt-5 text-xs leading-6 text-text-secondary">2288 W Commodore Way<br/>Seattle, WA 98199</p>
    </address>
   </div>
  </section>

  <section className={shell + " py-10"}>
   <details className="border-b border-border pb-6">
    <summary className="cursor-pointer text-sm text-gold">Considering charter ownership and potential tax benefits?</summary>
    <div className="mt-4 max-w-3xl text-xs leading-6 text-text-secondary">
     <p>Qualifying business property may be eligible for 100% first-year bonus depreciation on its eligible basis. Buying a yacht alone does not establish eligibility; personal entertainment use generally does not qualify. Your tax adviser must assess business use, timing, loss limitations and potential recapture. Deductions are not dollar-for-dollar tax savings. Charter suitability and tax eligibility have not been established for this yacht.</p>
     <p className="mt-3"><a href="https://www.irs.gov/taxtopics/tc704" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">IRS depreciation guidance</a><span className="mx-3">·</span><a href="https://www.irs.gov/publications/p463" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4">Entertainment-use rules</a></p>
    </div>
   </details>
   <div className="flex flex-wrap items-center justify-between gap-5 pt-7">
    <Link href="/yachts" className={label + " text-text-secondary hover:text-gold"}>Both yachts</Link>
    <Link href={"/yachts/"+other.slug} className="inline-flex items-center gap-3 text-sm text-gold">Explore the {other.name}<ArrowRight size={15}/></Link>
   </div>
  </section>
 </article>;
}

