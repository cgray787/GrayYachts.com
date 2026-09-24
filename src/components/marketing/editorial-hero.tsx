/* eslint-disable @next/next/no-img-element -- Existing local editorial photography. */
import {ArrowRight} from 'lucide-react';
import EditorialTabs from './editorial-tabs';
import type {ReactNode} from 'react';

export type EditorialHeroProps = {
  eyebrow: string;
  title: ReactNode;
  intro: string;
  image?: string;
  imageAlt?: string;
  action: string;
  target?: string;
  credit?: ReactNode;
};

export default function EditorialHero({eyebrow,title,intro,image='/sell/img/hero.jpg',imageAlt='Yacht on the water',action,target='#editorial-content',credit}:EditorialHeroProps) {
  return <section className="relative overflow-hidden bg-[#091722]" data-editorial-hero>
    <img src={image} alt={imageAlt} className="absolute inset-0 h-full w-full object-cover opacity-50" fetchPriority="high"/>
    <div className="absolute inset-0 bg-gradient-to-t from-[#060a12] via-[#060a12]/30 to-[#060a12]/40"/>
    <div className="relative mx-auto w-full max-w-7xl px-6 pt-32 pb-20 md:px-12">
      <EditorialTabs className="mb-12"/>
      <div className="flex items-center gap-4 text-xs uppercase tracking-[0.25em] text-[#d8bd8c]"><span className="h-px w-12 bg-[#d8bd8c]"/>{eyebrow}</div>
      <h1 className="mt-7 max-w-4xl font-[family-name:var(--font-cormorant)] text-6xl leading-[0.98] text-[#f7f4ee] md:text-8xl md:min-h-[188px]">{title}</h1>
      <p className="mt-8 max-w-xl text-lg leading-relaxed text-slate-200 md:min-h-[84px]">{intro}</p>
      <a href={target} className="mt-9 inline-flex items-center gap-4 text-sm text-[#e4c99c]">{action}<ArrowRight size={18}/></a>
    </div>
    {credit&&<div className="absolute bottom-4 right-6 left-6 text-right text-[10px] leading-4 text-slate-300 md:right-12">{credit}</div>}
  </section>;
}
