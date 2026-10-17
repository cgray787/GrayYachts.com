import HomePage from "./home-page";
import { businessSchema, searchMetadata } from '@/lib/search-metadata';

// The homepage body is a client component, which cannot export metadata, so this
// server wrapper gives "/" its own title, description and canonical. Without it the
// homepage, /fleet, /catalog and /compare all shared the root layout's title.
export const metadata = searchMetadata(
  'Yacht Broker in Seattle and the Pacific Northwest | Gray Yachts',
  'Buy or sell a yacht in Seattle and the Pacific Northwest with Connor Gray at Gray Yachts and Jeff Brown Yachts. Request a free market valuation.',
  '/',
);

export default function Page() {
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{__html: JSON.stringify(businessSchema).replace(/</g, '\\u003c')}} /><HomePage /></>;
}
