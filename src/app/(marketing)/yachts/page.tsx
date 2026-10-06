/* eslint-disable @next/next/no-img-element */
import type {Metadata} from "next";
import Link from "next/link";
import {ArrowRight} from "lucide-react";
import {campaignYachts} from "@/lib/campaign-yachts";
export const metadata:Metadata={
 title:"Pershing & Sirena | Featured Yachts | Gray Yachts",
 description:"Two different ways to enjoy life on the water. Explore the Pershing 6X and Sirena 48 with Connor Gray.",
 alternates:{canonical:"https://grayyachts.com/yachts"}
};
export default function Page(){
 return <div className="bg-bg-primary text-text-primary">
  <section className="bg-bg-primary px-6 pb-20 pt-40 text-[#f7f4ee] lg:px-12"><div className="mx-auto max-w-6xl">
   <p className="text-[11px] font-medium uppercase tracking-[0.24em] text-[#d8bd8c]">Featured yachts</p>
   <h1 className="mt-7 max-w-4xl font-[family-name:var(--font-cormorant)] text-6xl leading-none md:text-8xl">Life’s too short.<br/><span className="italic text-[#d8bd8c]">Find your yacht.</span></h1>
   <p className="mt-8 max-w-xl text-lg leading-8 text-slate-300">Explore the Pershing 6X and Sirena 48. Contact Connor for current pricing and availability.</p>
  </div></section>
  <section className="mx-auto grid max-w-7xl gap-12 px-6 py-16 md:grid-cols-2 lg:px-12">
   {campaignYachts.map(y=><Link key={y.slug} href={"/yachts/"+y.slug} className="group">
    <div className="overflow-hidden"><img src={y.photos[0].src} alt={y.photos[0].alt} width={1600} height={1067} className="aspect-[4/3] w-full object-cover transition-transform duration-500 group-hover:scale-[1.025]"/></div>
    <p className="mt-5 text-[10px] uppercase tracking-[0.2em] text-gold">{y.year} · {y.location}</p>
    <h2 className="mt-3 flex items-center justify-between font-[family-name:var(--font-cormorant)] text-4xl">{y.name}<ArrowRight size={22}/></h2>
    <p className="mt-3 text-text-secondary">{y.slug === "pershing-6x" ? "62 feet. Twin MAN V12 engines. Italian performance." : "Three guest cabins. A spacious flybridge. Room for a weekend away."}</p><p className="mt-4 text-xs text-text-secondary">Price on request · Sistership photography</p>
   </Link>)}
  </section>
 </div>;
}

