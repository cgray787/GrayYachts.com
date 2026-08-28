export interface VerifiedListingOverride {
  name: string;
  builder: string;
  model: string;
  type: string;
  year: number;
  price: string;
  priceNum: number;
  lengthFt: number;
  lengthM: number;
  beamFt: number;
  beamM: number;
  cabins: number;
  engine: string;
  location: string;
  imageUrl: string;
}

function canonicalListingUrl(value: string): string {
  try {
    const url = new URL(value);
    url.hash = "";
    url.search = "";
    return url.toString().replace(/\/$/, "");
  } catch {
    return value.replace(/[?#].*$/, "").replace(/\/$/, "");
  }
}

/**
 * Facts manually read from captured source-page screenshots when a listing
 * blocks server-side scraping. Values belong here only after visual review;
 * unknown fields stay absent rather than being estimated.
 */
const VERIFIED_LISTINGS: Record<string, VerifiedListingOverride> = {
  [canonicalListingUrl(
    "https://www.boats.com/sailing-boats/2007-hunter-44-deck-salon-10266716/",
  )]: {
    // Source reviewed 2026-08-27 from the rendered boats.com listing.
    name: '2007 Hunter 44 Deck Salon "Pure Sterling"',
    builder: "Hunter",
    model: "44 Deck Salon",
    type: "Sail",
    year: 2007,
    price: "$139,000",
    priceNum: 139000,
    lengthFt: 43.17,
    lengthM: 13.16,
    beamFt: 14.5,
    beamM: 4.42,
    cabins: 2,
    engine: "Yanmar 4JH4E 56 hp",
    location: "Seattle, Washington",
    imageUrl:
      "https://images.boats.com/resize/1/67/16/2007-hunter-44-deck-salon-sail-10266716-20260805121259939-1.jpg?t=1785345687000",
  },
};

export function getVerifiedListingOverride(
  url: string,
): VerifiedListingOverride | null {
  const listing = VERIFIED_LISTINGS[canonicalListingUrl(url)];
  return listing ? { ...listing } : null;
}
