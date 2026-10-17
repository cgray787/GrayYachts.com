import { searchMetadata } from '@/lib/search-metadata';

export const metadata = searchMetadata(
  'Compare Yachts Side by Side | Gray Yachts',
  'Compare two yachts side by side: length, beam, price, cabins, engines and more, pulled from the listings you choose.',
  '/compare',
);

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
