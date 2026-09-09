import type {Article} from '@/lib/newsletter/core';
export default function NewsletterArticle({article}:{article:Article}) {
 return <div className="space-y-12"><p className="text-xl leading-relaxed text-slate-700">{article.introduction}</p>
  {article.sections.map((section,i)=><section key={section.heading} id={`section-${i}`} className="scroll-mt-28"><h2 className="mb-5 font-[family-name:var(--font-cormorant)] text-3xl md:text-4xl text-slate-900">{section.heading}</h2><div className="space-y-5 text-base md:text-lg leading-[1.85] text-slate-700">{section.paragraphs.map((p,j)=><p key={j}>{p}</p>)}</div></section>)}
  <section className="border-t border-slate-300 pt-10"><h2 className="mb-7 font-[family-name:var(--font-cormorant)] text-3xl text-slate-900">Questions worth asking</h2><div className="space-y-8">{article.questions.map(q=><div key={q.question}><h3 className="mb-2 text-lg font-medium text-slate-900">{q.question}</h3><p className="leading-relaxed text-slate-700">{q.answer}</p></div>)}</div></section>
 </div>;
}
