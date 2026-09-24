import PostThumbnail from '@/components/marketing/post-thumbnail';
import Link from 'next/link';
import { articlePhoto, pageMetadata, visibleArticles, publishedArticles, editorialPreview } from '@/lib/editorial';
import { EditorialShell, SellerContact } from '@/components/marketing/editorial';
export const metadata = { ...pageMetadata('Yacht news and boat selling guides | Gray Yachts','Boat selling guidance, international yacht show coverage and new boat research for Pacific Northwest owners.','/insights'), robots: {index: publishedArticles().length > 0 && !editorialPreview, follow: true} };
export default function InsightsPage() {
 const posts = visibleArticles();
 return <EditorialShell eyebrow="The owner’s perspective" title="A clearer view of your next move." hero={{title:<>A clearer view<br/><span className="italic text-[#d8bd8c]">of your next move.</span></>, action:"Explore the guides", image:"/sell/img/seawulff.jpg", imageAlt:"Yacht featured by Gray Yachts",}} intro="Boat selling guides, international show coverage and new boat research from Gray Yachts.">
  {editorialPreview && <p className="mb-6 text-amber-300">Editorial preview. Drafts have not been published.</p>}
  <div className="grid gap-6 md:grid-cols-2">{posts.map(a=><article key={a.slug} className="rounded-xl border border-border bg-bg-card p-7">
    <PostThumbnail photo={articlePhoto(a.slug)} href={`/insights/${a.slug}`}/><p className="text-xs uppercase tracking-widest text-gold">{a.category}</p>
    <h2 className="mt-3 font-[family-name:var(--font-cormorant)] text-3xl"><Link href={`/insights/${a.slug}`}>{a.title}</Link></h2>
    <p className="mt-4 leading-relaxed text-text-secondary">{a.description}</p>
    <Link href={`/insights/${a.slug}`} className="mt-5 inline-block text-sm text-gold">Read the guide →</Link>
  </article>)}</div>
  {posts.length===0 && <p className="text-text-secondary">Our first owner guides are being prepared. Explore the show directory and featured brands, or talk with Connor about your boat.</p>}
  <SellerContact/>
 </EditorialShell>;
}
