"use client";
/* eslint-disable @next/next/no-img-element */
import {useState} from "react";
import {Play} from "lucide-react";
import type {CampaignYacht} from "@/lib/campaign-yachts";

export default function YachtFilm({yacht}:{yacht:CampaignYacht}) {
 const [playing,setPlaying]=useState(false);
 const src=yacht.video.provider==='vimeo'
  ? `https://player.vimeo.com/video/${yacht.video.id}?autoplay=1&dnt=1`
  : `https://www.youtube-nocookie.com/embed/${yacht.video.id}?autoplay=1&rel=0`;
 return <div>
  <div className="relative aspect-video overflow-hidden bg-black">
   {playing ? <iframe src={src} title={`${yacht.name} model film`} className="absolute inset-0 h-full w-full border-0" allow="autoplay; fullscreen; encrypted-media; picture-in-picture" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen/> :
    <button onClick={()=>setPlaying(true)} aria-label={`Play ${yacht.name} film`} className="group absolute inset-0 h-full w-full cursor-pointer focus-visible:outline-2 focus-visible:outline-gold focus-visible:outline-offset-[-4px]">
     <img src={yacht.photos[0].src} alt="" width={1600} height={1067} loading="lazy" className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-[1.025]"/>
     <span className="absolute inset-0 bg-black/20"/>
     <span className="absolute inset-0 flex flex-col items-center justify-center gap-5"><span className="flex size-20 items-center justify-center rounded-full border border-white/70 bg-black/25 text-white backdrop-blur-sm transition-colors group-hover:bg-gold group-hover:text-bg-primary"><Play className="ml-1" size={26} fill="currentColor"/></span><span className="text-[11px] font-medium uppercase tracking-[0.24em] text-white">Watch the film</span></span>
    </button>}
  </div>
  <div className="mt-4 flex flex-wrap justify-between gap-3 text-[11px] text-text-secondary"><span>{yacht.video.provider==='vimeo'?'Film courtesy of Jeff Brown Yachts':'Official Sirena Yachts film'} · Model shown; specification may vary.</span><a href={yacht.video.source} target="_blank" rel="noopener noreferrer" className="text-gold underline underline-offset-4">Watch on {yacht.video.provider==='vimeo'?'Vimeo':'YouTube'}</a></div>
 </div>;
}
