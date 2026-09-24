import type { Metadata } from 'next';
import articleImages from '../../content/seo/article-images.json';
import type {EditorialPhoto} from '@/components/marketing/post-thumbnail';
import articleData from '../../content/seo/articles.json';

export const SITE = 'https://grayyachts.com';
export type Article = {
  slug: string; title: string; description: string; category: string; primaryKeyword: string;
  status: 'draft' | 'published'; author: string; createdAt: string; updatedAt: string;
  publishedAt: string | null; reviewedBy: string | null; revision: number;
  sections: {heading: string; paragraphs: string[]; bullets: string[]; sourceIndexes: number[]}[];
  sources: {title: string; url: string; publishedAt: string | null; checkedAt: string}[];
  faq: {question: string; answer: string}[]; relatedPaths: string[];
};
export const articles = articleData as Article[];
// Preview is deliberately unavailable in production, including with an env override.
export const editorialPreview = process.env.NODE_ENV === 'development' && process.env.SEO_EDITORIAL_PREVIEW === '1';
export function isPublished(a: Article): boolean {
  return a.status === 'published' && Boolean(a.reviewedBy?.trim()) && Boolean(a.publishedAt) &&
    Number.isFinite(Date.parse(a.publishedAt!)) && Date.parse(a.publishedAt!) <= Date.now();
}
export const publishedArticles = () => articles.filter(isPublished);
export const visibleArticles = () => articles.filter(a => isPublished(a) || editorialPreview);
export function pageMetadata(title: string, description: string, path: string): Metadata {
  return { title, description, alternates: {canonical: `${SITE}${path}`},
    openGraph: {title, description, url: `${SITE}${path}`, siteName: 'Gray Yachts', type: 'website'},
    twitter: {card: 'summary', title, description} };
}
export function articleSchema(a: Article) {
  return { '@context': 'https://schema.org', '@type': 'Article', headline: a.title,
    image: `${SITE}${articlePhoto(a.slug).url}`, description: a.description, mainEntityOfPage: `${SITE}/insights/${a.slug}`,
    datePublished: a.publishedAt, dateModified: a.updatedAt,
    author: {'@type': 'Organization', name: a.author, url: `${SITE}/about-connor-gray`},
    publisher: {'@type': 'Organization', '@id': `${SITE}/#organization`, name: 'Gray Yachts', url: SITE},
    citation: a.sources.map(s => s.url) };
}
export function jsonLd(value: unknown) { return JSON.stringify(value).replace(/</g, '\\u003c'); }

export function articlePhoto(slug:string):EditorialPhoto { return (articleImages as Record<string,EditorialPhoto>)[slug] || {url:'/sell/img/hero.jpg',alt:'Gray Yachts brokerage photography',credit:'Gray Yachts'}; }
