import PostThumbnail from '@/components/marketing/post-thumbnail';
import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { articlePhoto, visibleArticles, isPublished, pageMetadata, articleSchema, jsonLd } from '@/lib/editorial';
import { EditorialShell, SellerContact } from '@/components/marketing/editorial';
type Props = {params: Promise<{slug:string}>};
export async function generateMetadata({params}:Props):Promise<Metadata> {
 const {slug}=await params; const a=visibleArticles().find(a=>a.slug===slug);
 if(!a) return {title:'Article not found',robots:{index:false}};
 return {...pageMetadata(`${a.title} | Gray Yachts`,a.description,`/insights/${a.slug}`),robots:{index:isPublished(a),follow:true},openGraph:{images:[`https://grayyachts.com${articlePhoto(a.slug).url}`],type:'article',title:a.title,description:a.description,url:`https://grayyachts.com/insights/${a.slug}`}};
}
export default async function ArticlePage({params}:Props) {
 const {slug}=await params; const a=visibleArticles().find(a=>a.slug===slug); if(!a)notFound();
 return <EditorialShell eyebrow={a.category} title={a.title} intro={a.description}>
  {isPublished(a) ? <script type="application/ld+json" dangerouslySetInnerHTML={{__html:jsonLd(articleSchema(a))}}/> : <p className="mb-6 text-amber-300">Draft for editorial review. Not published.</p>}
  <div className="max-w-3xl"><PostThumbnail photo={articlePhoto(a.slug)} priority/>
  <p className="mb-10 text-sm text-text-secondary">{a.author} · Updated <time dateTime={a.updatedAt}>{a.updatedAt}</time>{a.reviewedBy && ` · Reviewed by ${a.reviewedBy}`}</p>
  {a.sections.map((s,i)=><section key={i} className="mb-10"><h2 className="mb-4 font-[family-name:var(--font-cormorant)] text-3xl">{s.heading}</h2>
    {s.paragraphs.map((p,j)=><p key={j} className="mb-4 text-lg leading-8 text-text-secondary">{p}</p>)}
    {s.bullets.length>0 && <ul className="my-5 list-disc space-y-3 pl-6 leading-7 text-text-secondary">{s.bullets.map(b=><li key={b}>{b}</li>)}</ul>}
    {s.sourceIndexes.map(idx=><p key={idx} className="mt-2 text-sm"><a className="text-gold underline underline-offset-4" href={a.sources[idx].url}>{a.sources[idx].title}</a></p>)}
  </section>)}
  <section><h2 className="font-[family-name:var(--font-cormorant)] text-3xl">Questions owners ask</h2>{a.faq.map(f=><div key={f.question} className="mt-6"><h3 className="text-lg font-medium">{f.question}</h3><p className="mt-2 leading-7 text-text-secondary">{f.answer}</p></div>)}</section>
  <section className="mt-10 border-t border-border pt-6"><h2 className="text-xl">Sources and reporting</h2><p className="mt-3 text-sm leading-6 text-text-secondary">Published sources and our editorial analysis are identified separately. Manufacturer claims are not independent boat tests. Send corrections to <Link href="/#contact" className="text-gold">Gray Yachts</Link>.</p><ul className="mt-4 space-y-2">{a.sources.map(s=><li key={s.url} className="text-sm"><a href={s.url} className="text-gold underline">{s.title}</a><span className="text-text-secondary"> · checked {s.checkedAt}</span></li>)}</ul></section>
  </div><SellerContact/>
 </EditorialShell>;
}
