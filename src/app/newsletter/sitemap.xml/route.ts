import {publishedIssues} from '@/lib/newsletter/db';
import {escapeHtml,SITE} from '@/lib/newsletter/core';
export const dynamic='force-dynamic';
export async function GET() {
 const issues=await publishedIssues();
 return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${SITE}/newsletter</loc></url>${issues.map(i=>`<url><loc>${SITE}/newsletter/${escapeHtml(i.slug)}</loc><lastmod>${i.published_at}</lastmod></url>`).join('')}</urlset>`,{headers:{'content-type':'application/xml'}});
}
