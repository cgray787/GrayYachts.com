import type { MetadataRoute } from 'next';
import { vessels } from '@/lib/fleet';
import { getBrochure } from '@/lib/brochures';
import { campaignYachts } from '@/lib/campaign-yachts';
import { publishedArticles, SITE } from '@/lib/editorial';
export default function sitemap(): MetadataRoute.Sitemap {
 const posts=publishedArticles();
 return [
  {url:`${SITE}/yachts`},
  ...campaignYachts.map(y=>({url:`${SITE}/yachts/${y.slug}`})),
  ...['','/sell','/fleet','/boat-shows','/brands','/about-connor-gray',...(posts.length?['/insights']:[])].map(path=>({url:`${SITE}${path}`})),
  ...vessels.filter(v=>v.slug&&getBrochure(v.slug)).map(v=>({url:`${SITE}/fleet/${v.slug}`})),
  ...posts.map(a=>({url:`${SITE}/insights/${a.slug}`,lastModified:a.updatedAt})),
 ];
}
