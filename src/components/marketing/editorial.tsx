import Link from 'next/link';
import EditorialTabs from './editorial-tabs';
import type { ReactNode, CSSProperties } from 'react';
import EditorialHero, {type EditorialHeroProps} from './editorial-hero';
export function EditorialShell({eyebrow,title,intro,children,hero}: {eyebrow:string;title:string;intro:string;children:ReactNode;hero?:Omit<EditorialHeroProps,'eyebrow'|'intro'>}) {
  if(hero) return <main><EditorialHero {...hero} eyebrow={eyebrow} intro={intro}/><div className="bg-[#f7f4ee] text-[#162636]" style={{'--bg-card':'#fffdf9','--border':'#16263626','--gold':'#806336','--text-secondary':'#526172'} as CSSProperties}><div id="editorial-content" className="mx-auto max-w-7xl scroll-mt-20 px-6 py-16 md:px-12 md:py-24">{children}</div></div></main>;
  return <div className="mx-auto max-w-6xl px-6 pb-24 pt-36 lg:px-12">
    <p className="text-xs uppercase tracking-[0.2em] text-gold">{eyebrow}</p>
    <h1 className="mt-5 max-w-4xl font-[family-name:var(--font-cormorant)] text-5xl leading-tight md:text-7xl">{title}</h1>
    <p className="mt-6 max-w-3xl text-lg leading-relaxed text-text-secondary">{intro}</p>
    <EditorialTabs className="my-10"/>{children}
  </div>;
}
export function SellerContact() {
  return <aside className="mt-14 rounded-xl border border-gold/30 bg-bg-card p-8">
    <h2 className="font-[family-name:var(--font-cormorant)] text-3xl">Thinking about selling your boat?</h2>
    <p className="mt-3 max-w-2xl leading-relaxed text-text-secondary">Talk with Connor Gray about your boat, your timing and a Pacific Northwest market valuation.</p>
    <Link className="mt-6 inline-block rounded bg-gold px-6 py-3 font-medium text-bg-primary" href="/sell">Discuss your boat with Connor</Link>
  </aside>;
}
