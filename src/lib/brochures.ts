// Per-listing brochure copy, keyed by vessel slug. Consumed only by the
// print route at /listings/[slug]/brochure. Fleet cards do NOT import this.
// Hero image, name, year, make, length, location, price, badge come from the
// matching Vessel in fleet.ts (linked by slug); this file holds brochure-only copy.

export type SpecCell = { value: string; label: string; sub?: string };

export type BrochureContent = {
  slug: string;
  // Headline: renders as `${lead} <gold-italic>${emphasis}</gold-italic> ${tail}`
  tagline: { lead: string; emphasis: string; tail: string };
  specStrip: SpecCell[];        // up to 5 cells; powerboats may use fewer
  narrative: string[];          // body paragraphs, in order
  highlights: string[];         // 2-column bullet table, in order
  documentation?: { officialNo?: string; callSign?: string; note?: string };
  photoCredit?: string;         // place shown in "Photographed at <x> · Gray Yachts Media"
};

export const brochures: Record<string, BrochureContent> = {
  seawulff: {
    slug: "seawulff",
    tagline: {
      lead: "A",
      emphasis: "classic Pacific Northwest",
      tail: "wooden sail vessel — built to last, documented to prove it.",
    },
    specStrip: [
      { value: "34.5'", label: "Length" },
      { value: "1981", label: "Year Built" },
      { value: "Saab", label: "30hp Diesel" },
      { value: "4–6", label: "Sleeps" },
      { value: "Wood", label: "Construction" },
    ],
    narrative: [
      "Seawulff is a 1981 wood-hulled auxiliary sailboat built in Olympia, Washington and hailing from Port Townsend — one of the most storied wooden boat communities on the West Coast. Yellow Cedar, Port Orford Cedar, and Western Red Cedar planking over steam-bent White Oak frames. Teak-planked cabin tops. Bronze hardware throughout. This is a vessel built the old way, for the long run.",
      "She carries a full Dacron sail inventory — main, staysail, jib, and drifter — along with 1x19 stainless standing rigging and a double forestay. The Saab 2-cylinder diesel starts clean, with injector pump rebuilt and injectors checked. Two trunk cabins, V-berth forward, main salon with U-shaped settee, galley aft to port, and a dedicated aft cabin with counter workspace.",
      "Previously USCG-certified for passenger operation on Puget Sound — a level of inspection most private vessels never see. Clean documentation. Survey history on file. Ready for her next chapter.",
    ],
    highlights: [
      "Cedar & Teak construction throughout",
      "Saab 2-cyl diesel, 30hp — starts clean",
      "Full Dacron sail inventory included",
      "140 gal water capacity — dual S/steel tanks",
      "Dickinson diesel cabin heater",
      "Bronze fastenings & keel bolts w/ backing plates",
      "30A shore power, 4x 12V battery bank",
      "Electro Guard galvanic protection system",
      "VHF, depthfinder, binnacle compass",
      "8-person life raft, full USCG safety kit",
      "Stern arch w/ dedicated hydraulic winch",
      "Plow anchor + 160 ft chain rode",
    ],
    documentation: {
      officialNo: "634426",
      callSign: "WTS4768",
      note: "Certified for Puget Sound, Lakes, Bays & Sounds. Inspected and approved for up to 10 passengers under USCG Sector Puget Sound — a standard of documentation that sets this vessel apart from typical private listings.",
    },
    photoCredit: "Port Townsend, WA",
  },
};

export function getBrochure(slug: string): BrochureContent | undefined {
  return brochures[slug];
}
