/* eslint-disable @next/next/no-img-element -- Existing brokerage photos served by Cloudflare. */
import type {NewsletterImage} from '@/lib/newsletter/images';
import type {Article} from '@/lib/newsletter/core';
function Photo({photo}:{photo:NewsletterImage}) {
 return <figure data-newsletter-image={photo.id} className="my-10"><img src={photo.url} alt={photo.alt} className="h-auto max-h-[650px] w-full object-contain"/><figcaption className="mt-3 text-sm leading-relaxed text-slate-500">{photo.caption}<span className="mt-1 block text-xs">{photo.credit}</span></figcaption></figure>;
}
export default function NewsletterArticle({article,images=[]}:{article:Article;images?:NewsletterImage[]}) {
 return <div className="space-y-12">{images[0]&&<Photo photo={images[0]}/>}<p className="text-xl leading-relaxed text-slate-700">{article.introduction}</p>
  {article.sections.map((section,i)=><section key={section.heading} id={`section-${i}`} className="scroll-mt-28"><h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl text-slate-900">{section.heading}</h2><div className="space-y-5 text-base md:text-lg leading-[1.85] text-slate-700">{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</div>{i===1&&images[1]&&<Photo photo={images[1]}/>} {i===article.sections.length-1&&images[2]&&<Photo photo={images[2]}/>}</section>)}
  <section className="border-t border-slate-300 pt-10"><h2 className="mb-7 font-[family-name:var(--font-cormorant)] text-3xl text-slate-900">Questions worth asking</h2><div className="space-y-8">{article.questions.map(q=><div key={q.question}><h3 className="mb-2 text-lg font-medium text-slate-900">{q.question}</h3><p className="leading-relaxed text-slate-700">{q.answer}</p></div>)}</div></section>
 </div>;
}
