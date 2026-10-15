import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/editorial';
import { findLanding, landingPages, landingPath } from '@/lib/landing-pages';
import { LandingPageView } from '@/components/marketing/landing-page';

type Props = { params: Promise<{ slug: string }> };
// No `dynamicParams = false`: OpenNext on Cloudflare has no incremental cache configured
// (open-next.config.ts is empty), so prerendered pages render on demand; with dynamicParams
// off every request 404'd in production (2026-10-15). Unknown slugs still 404 via notFound().
export function generateStaticParams() {
  return landingPages.filter(p => p.kind === 'service').map(p => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findLanding('service', (await params).slug);
  return page ? pageMetadata(page.title, page.description, landingPath(page)) : { title: 'Not found', robots: { index: false } };
}
export default async function Page({ params }: Props) {
  const page = findLanding('service', (await params).slug);
  if (!page) notFound();
  return <LandingPageView page={page} />;
}
