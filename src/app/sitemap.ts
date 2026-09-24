import type { MetadataRoute } from 'next';
import { vessels } from '@/lib/fleet';
import { getBrochure } from '@/lib/brochures';
import { publishedArticles, SITE } from '@/lib/editorial';
export default function sitemap(): MetadataRoute.Sitemap {
 const posts=publishedArticles();
 return [
  ...['','/sell','/fleet','/boat-shows','/brands','/about-connor-gray',...(posts.length?['/insights']:[])].map(path=>({url:`${SITE}${path}`})),
  ...vessels.filter(v=>v.slug&&getBrochure(v.slug)).map(v=>({url:`${SITE}/fleet/${v.slug}`})),
  ...posts.map(a=>({url:`${SITE}/insights/${a.slug}`,lastModified:a.updatedAt})),
 ];
}
