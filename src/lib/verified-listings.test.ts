import { describe, expect, it } from "vitest";

import { getVerifiedListingOverride } from "@/lib/verified-listings";

const HUNTER_URL =
  "https://www.boats.com/sailing-boats/2007-hunter-44-deck-salon-10266716/";

describe("verified screenshot-backed listings", () => {
  it("returns the Hunter 44 facts read from the source-page screenshot", () => {
    expect(getVerifiedListingOverride(HUNTER_URL)).toMatchObject({
      name: '2007 Hunter 44 Deck Salon "Pure Sterling"',
      builder: "Hunter",
      model: "44 Deck Salon",
      type: "Sail",
      year: 2007,
      price: "$139,000",
      priceNum: 139000,
      lengthFt: 43.17,
      beamFt: 14.5,
      cabins: 2,
      engine: "Yanmar 4JH4E 56 hp",
      location: "Seattle, Washington",
    });
  });

  it("does not guess for an unreviewed URL", () => {
    expect(getVerifiedListingOverride("https://example.com/unknown-boat")).toBeNull();
  });
});
