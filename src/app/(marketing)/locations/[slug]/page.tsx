import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { pageMetadata } from '@/lib/editorial';
import { findLanding, landingPages, landingPath } from '@/lib/landing-pages';
import { LandingPageView } from '@/components/marketing/landing-page';

type Props = { params: Promise<{ slug: string }> };
export const dynamicParams = false;
export function generateStaticParams() {
  return landingPages.filter(p => p.kind === 'location').map(p => ({ slug: p.slug }));
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = findLanding('location', (await params).slug);
  return page ? pageMetadata(page.title, page.description, landingPath(page)) : { title: 'Not found', robots: { index: false } };
}
export default async function Page({ params }: Props) {
  const page = findLanding('location', (await params).slug);
  if (!page) notFound();
  return <LandingPageView page={page} />;
}
