/* eslint-disable @next/next/no-img-element -- Licensed archival and venue photographs. */
import photos from '../../../../content/seo/show-images.json';
import shows from '../../../../content/seo/shows.json';
import { pageMetadata } from '@/lib/editorial';
import { EditorialShell, SellerContact } from '@/components/marketing/editorial';
export const metadata=pageMetadata('International boat and yacht shows | Gray Yachts','Research major international yacht shows, official dates and new boat announcements, with source checks for Pacific Northwest owners.','/boat-shows');
export default function BoatShowsPage(){return <EditorialShell eyebrow="Around the world" title="International boat shows." hero={{title:<>International shows.<br/><span className="italic text-[#d8bd8c]">A world of yachts.</span></>, action:"Explore the shows", image:"/shows/monaco.jpg", imageAlt:"Yachts at the 2022 Monaco Yacht Show", credit:<>2022 Monaco Yacht Show · 102Legobrick · <a className="underline" href="https://commons.wikimedia.org/wiki/File:MYS_2022_2.jpg">Source</a> · <a className="underline" href="https://creativecommons.org/licenses/by-sa/4.0/">CC BY-SA 4.0</a> · Cropped and shaded for display.</>,}} intro="A research directory of major yacht shows and relevant regional events. Each entry separates confirmed information from details that still need checking.">
 <p className="mb-8 text-sm leading-6 text-text-secondary">Research checked September 24, 2026. These are the latest verified editions in our research, including completed shows. Confirm dates and access with the organizer before travel. Historical announcements are identified as such.</p>
 <div className="grid gap-6 md:grid-cols-2">{shows.map(s=><article id={s.id} key={s.id} className="rounded-xl border border-border bg-bg-card p-7">
  {photos.filter(p=>p.showId===s.id).map(p=><figure key={p.showId} className="mb-6"><div className="flex aspect-[3/2] items-center justify-center overflow-hidden rounded-lg bg-[#0c1220]"><img src={p.url} alt={p.alt} loading="lazy" width="1000" height="667" className="h-full w-full object-contain"/></div><figcaption className="mt-3 text-[11px] leading-5 text-text-secondary">{p.caption}<span className="mt-1 block">{p.author} · <a href={p.source} className="underline">Source</a> · <a href={p.licenseUrl} className="underline">{p.license}</a></span></figcaption></figure>)}<p className="text-xs uppercase tracking-widest text-gold">{s.region} · {s.status}</p>
  <h2 className="mt-3 font-[family-name:var(--font-cormorant)] text-3xl">{s.name}</h2>
  <p className="mt-2 text-sm text-text-secondary">{s.location}</p>
  <p className="mt-4 text-sm">{s.start ? `${s.start} to ${s.end}`:'Dates awaiting verification'}</p>
  <p className="mt-4 leading-7 text-text-secondary">{s.update}</p>
  <p className="mt-3 leading-7 text-text-secondary">{s.angle}</p>
  <a href={s.sourceUrl} className="mt-5 inline-block text-sm text-gold underline underline-offset-4">Official source</a>
  <p className="mt-2 text-xs text-text-secondary">Checked {s.checkedAt}{s.sourcePublishedAt ? ` · Announcement ${s.sourcePublishedAt}`:''}</p>
 </article>)}</div><SellerContact/></EditorialShell>}
