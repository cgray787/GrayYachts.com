import Link from 'next/link';
import {notFound} from 'next/navigation';
import type {Metadata} from 'next';
import {publishedIssue, publishedIssues} from '@/lib/newsletter/db';
import {clip, withBrand} from '@/lib/editorial';
import {breadcrumbSchema, faqSchema, searchMetadata} from '@/lib/search-metadata';
import {SITE,type Article} from '@/lib/newsletter/core';
import NewsletterArticle from '@/components/marketing/newsletter-article';
export const dynamic='force-dynamic';
type Props={params:Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
 const {slug}=await params;const issue=await publishedIssue(slug);
 if(!issue)return {title:'Newsletter not found'};
 // Shared helper: complete Open Graph and Twitter fields; brand only when the title fits Google's display.
 const meta=searchMetadata(withBrand(issue.title),clip(issue.excerpt),`/newsletter/${slug}`,issue.hero);
 return {...meta,openGraph:{...meta.openGraph,type:'article',publishedTime:issue.published_at??undefined}};
}
export default async function IssuePage({params}:Props) {
 const {slug}=await params;const issue=await publishedIssue(slug);if(!issue)notFound();
 const article=JSON.parse(issue.content) as Article;
 const images=JSON.parse(issue.images) as {url:string}[];
 const sources=JSON.parse(issue.sources) as {title:string;url:string}[];
 // Cross links: each crawled edition leads Google to three others (none were indexed, 2026-10-17).
 const more=(await publishedIssues()).filter(m=>m.slug!==slug).slice(0,3);
 const schema={'@context':'https://schema.org','@type':'Article',headline:issue.title,description:issue.excerpt,datePublished:issue.published_at,dateModified:issue.published_at,author:{'@type':'Organization','@id':`${SITE}/#organization`,name:'Gray Yachts',url:SITE},publisher:{'@type':'Organization','@id':`${SITE}/#organization`,name:'Gray Yachts',url:SITE},image:images.length?images.map(i=>`${SITE}${i.url}`):`${SITE}${issue.hero}`,mainEntityOfPage:`${SITE}/newsletter/${slug}`};
 return <main className="pt-32"><script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify([schema,breadcrumbSchema([{name:'Home',path:'/'},{name:'Newsletter',path:'/newsletter'},{name:issue.title,path:`/newsletter/${slug}`}]),faqSchema(article.questions??[])].filter(Boolean)).replace(/</g,'\\u003c')}}/><header className="mx-auto max-w-4xl px-6 pb-14"><Link href="/newsletter" className="text-xs uppercase tracking-[0.2em] text-gold">← The Gray Yachts newsletter</Link><p className="mt-10 text-xs uppercase tracking-widest text-slate-400">{issue.audience==='seller'?'For yacht sellers':'For yacht buyers'}</p><h1 className="mt-5 font-[family-name:var(--font-cormorant)] text-5xl md:text-7xl leading-[1.05]">{issue.title}</h1><p className="mt-7 text-sm text-slate-400">Gray Yachts · {new Date(issue.published_at!).toLocaleDateString('en-US',{month:'long',day:'numeric',year:'numeric',timeZone:'UTC'})}</p></header>

 <div className="bg-[#f7f4ee]"><article className="mx-auto max-w-3xl px-6 py-16 md:py-24"><NewsletterArticle article={article} images={JSON.parse(issue.images)}/><aside className="mt-12 border-t border-slate-300 pt-7"><h2 className="text-sm font-medium text-slate-800">Related resources</h2><ul className="mt-3 space-y-2 text-sm text-slate-600">{sources.map(s=><li key={s.url}><a href={s.url} className="underline underline-offset-4">{s.title}</a></li>)}</ul></aside><div className="mt-12 bg-[#162636] p-8 text-white"><h2 className="font-[family-name:var(--font-cormorant)] text-3xl">{issue.audience==='seller'?'Let’s talk about your yacht.':'Ready to take a closer look?'}</h2><p className="mt-4 text-slate-300">{issue.audience==='seller'?'Tell us what you own and what you’re considering.':'Browse the current fleet and ask us about a boat you’d like to see.'}</p><a href={issue.audience==='seller'?'/sell':'/fleet'} className="mt-6 inline-block bg-[#c9a96e] px-5 py-3 text-sm text-[#162636]">{issue.audience==='seller'?'Request an evaluation':'Explore the fleet'}</a></div></article>{more.length>0&&<nav aria-label="More from the newsletter" className="mx-auto max-w-3xl px-6 pb-20"><h2 className="font-[family-name:var(--font-cormorant)] text-3xl text-[#162636]">More from the newsletter</h2><ul className="mt-6 space-y-5">{more.map(m=><li key={m.slug}><Link href={`/newsletter/${m.slug}`} className="text-[#162636] underline underline-offset-4 hover:text-[#8a6c3d]">{m.title}</Link><p className="mt-1 text-sm text-slate-600">{m.excerpt}</p></li>)}</ul></nav>}</div></main>;
}
