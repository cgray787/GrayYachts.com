"use client";
/* eslint-disable @next/next/no-img-element */
import {useState} from "react";
import inventory from "../../../content/yachts/jby-inventory.json";
export default function DiscoveryInventory(){
 const [brand,setBrand]=useState('All');const [search,setSearch]=useState('');const [limit,setLimit]=useState(12);
 const brands=['All',...new Set(inventory.yachts.map(y=>y.brand))];
 const filtered=inventory.yachts.filter(y=>(brand==='All'||y.brand===brand)&&`${y.name} ${y.location}`.toLowerCase().includes(search.toLowerCase()));
 return <div>
  <div className="mb-7 flex flex-wrap gap-2" aria-label="Filter yachts by brand">{brands.map(b=><button key={b} aria-pressed={brand===b} onClick={()=>{setBrand(b);setLimit(12);}} className={`min-h-11 border px-4 py-2 text-sm transition-colors ${brand===b?'border-[#172c3b] bg-[#172c3b] text-white':'border-[#172c3b]/20 hover:border-[#172c3b]'}`}>{b==='Brokerage'?'Other builders':b}</button>)}</div>
  <label className="block max-w-md text-sm">Find your yacht<input type="search" value={search} onChange={e=>{setSearch(e.target.value);setLimit(12);}} placeholder="Try Seattle, Riva, Sabre or 48…" className="mt-2 w-full border border-[#172c3b]/25 bg-transparent px-4 py-3 outline-offset-4"/></label>
  <p className="my-6 text-sm" role="status">{filtered.length} yachts to explore · Inventory checked {inventory.checkedAt}</p>
  <div className="grid gap-x-7 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">{filtered.slice(0,limit).map(y=><article key={y.url} className="group">
   <a href={y.url} target="_blank" rel="noopener noreferrer" aria-label={`Explore ${y.name} at Jeff Brown Yachts`}><div className="overflow-hidden bg-[#e1ded7]"><img src={y.image} alt={y.name+' — Jeff Brown Yachts listing photograph'} width={800} height={460} loading="lazy" className="aspect-[16/10] w-full object-cover transition-transform duration-700 group-hover:scale-105"/></div><p className="mt-4 text-[10px] uppercase tracking-[.2em] opacity-70">{y.location}{y.status==='pending'?' · Pending':''}</p><h3 className="mt-2 font-[family-name:var(--font-cormorant)] text-3xl leading-tight">{y.name}</h3><p className="mt-3 text-lg font-semibold">{y.price}</p><p className="mt-4 text-xs font-semibold uppercase tracking-widest underline underline-offset-8">Explore this yacht ↗</p></a>
  </article>)}</div>
  {filtered.length===0&&<p className="py-10">No matches. Try another brand or location, or ask Connor to source your yacht.</p>}
  {limit<filtered.length&&<button onClick={()=>setLimit(v=>v+12)} className="mx-auto mt-12 block border border-[#172c3b] px-9 py-4 text-sm">Discover more yachts ({filtered.length-limit} remaining)</button>}
  <p className="mt-10 max-w-3xl text-xs leading-6 opacity-70">Listing photographs and asking prices supplied by Jeff Brown Yachts. This is a dated inventory snapshot, not a live availability feed. Confirm price, status, configuration and location with Connor. Sold cards without active listing links are omitted. <a href={inventory.source} className="underline">View JBY’s latest inventory ↗</a></p>
 </div>;
}
