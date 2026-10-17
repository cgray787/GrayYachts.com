import { searchMetadata } from '@/lib/search-metadata';

// /fleet/[slug] sets its own canonical; metadata merges shallowly, so without that
// every listing would inherit this "/fleet" canonical.
export const metadata = searchMetadata(
  'Yachts and Boats for Sale in the Pacific Northwest | Gray Yachts',
  'Yachts and boats currently represented by Gray Yachts and Jeff Brown Yachts in the Pacific Northwest, with prices, specifications and brochures. Set a showing with Connor Gray.',
  '/fleet',
);

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
