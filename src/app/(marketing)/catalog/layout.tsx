import { searchMetadata } from '@/lib/search-metadata';

export const metadata = searchMetadata(
  'Yacht Catalog: Save Listings From Any Broker | Gray Yachts',
  "Build your own yacht catalog. Add listings from any broker's website, keep them in one place, and pin two for a side by side comparison.",
  '/catalog',
);

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
