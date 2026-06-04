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
  "playa-linda": {
    slug: "playa-linda",
    tagline: {
      lead: "A",
      emphasis: "capable center cockpit",
      tail: "cruiser — built for short-handed bluewater passages.",
    },
    specStrip: [
      { value: "42.5'", label: "Length" },
      { value: "1994", label: "Year Built" },
      { value: "Yanmar", label: "62hp Diesel" },
      { value: "14'", label: "Beam" },
      { value: "Sloop", label: "B&R Rig" },
    ],
    narrative: [
      "The Hunter Passage 42 is one of the most capable center cockpit cruisers ever produced — two private staterooms, two heads, a 14-foot beam, and a B&R masthead rig designed for short-handed sailing. This 1994 example, Playa Linda, has been actively cruised on Pacific Northwest waters and is ready for her next passage.",
      "Below, warm teak and holly soles run throughout with 6'6\" headroom. A spacious salon with an L-shaped settee and convertible dining opens to a fully equipped galley with refrigerator and stove. The forward stateroom carries a V-berth and private head with shower; the aft owner's cabin a queen berth with en-suite head, tub, and shower.",
      "On deck, a protected center cockpit under dodger and bimini keeps the crew comfortable, with all lines led aft, a roller-furling jib, and self-tailing winches for easy handling. Solar panels on the arch cut shore-power dependence, and a walk-through transom with swim platform makes boarding effortless. Service records available; sea trial welcome.",
    ],
    highlights: [
      "Two private staterooms, two heads",
      "Yanmar 4JH2TE, 62hp diesel — direct drive",
      "B&R masthead sloop — 949 sq ft sail area",
      "14' beam, wing keel, 4.9' draft",
      "Roller-furling jib, all lines led aft",
      "Self-tailing winches, dodger & bimini",
      "Solar array on stern arch",
      "Teak & holly soles, 6'6\" headroom",
      "Fully equipped galley — fridge & stove",
      "Aft owner's cabin — queen, en-suite tub & shower",
      "Walk-through transom, swim platform",
      "70 gal fuel · 150 gal water · ~900 engine hours",
    ],
    photoCredit: "the San Juan Islands, WA",
  },
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
  "dub-sea": {
    slug: "dub-sea",
    tagline: {
      lead: "The",
      emphasis: "flagship of the Cobalt line",
      tail: "— twin power, a deep-vee hull, and a proven Pacific Northwest track record.",
    },
    specStrip: [
      { value: "29'", label: "Length" },
      { value: "2016", label: "Year Built" },
      { value: "Twin", label: "MerCruiser 600hp" },
      { value: "9.5'", label: "Beam" },
      { value: "Deep Vee", label: "Fiberglass Hull" },
    ],
    narrative: [
      "The Cobalt 293 is the flagship of the legendary Cobalt line — a deep-vee fiberglass cruiser built with Hydrolam construction and a Kevlar-reinforced keel for confident performance in Pacific Northwest water. Dub Sea is maintained, turn-key, and comes trailer-ready.",
      "Twin MerCruiser 350 MAG MPI stern drives deliver 600 horsepower with 780 hours logged, moving the 29-foot hull with the ease Cobalt is known for. A roomy cuddy cabin offers weekend-ready shelter below, while the open cockpit seats a crowd for a day on the Sound.",
      "A tri-axle trailer is included, making haul-out, storage, and trailering to new water effortless. Cared for and ready to run — sea trial welcome.",
    ],
    highlights: [
      "Twin MerCruiser 350 MAG MPI — 600hp total",
      "780 hours logged",
      "Deep-vee fiberglass hull — Hydrolam construction",
      "Kevlar-reinforced keel",
      "29' LOA · 9.5' beam",
      "110 gallon fuel capacity",
      "Cuddy cabin — weekend-ready shelter",
      "Tri-axle trailer included",
      "Maintained, turn-key & trailer-ready",
      "Proven Pacific Northwest track record",
    ],
    photoCredit: "Seattle, WA",
  },
  "moby-dick": {
    slug: "moby-dick",
    tagline: {
      lead: "A",
      emphasis: "nearly-new weekend cruiser",
      tail: "— comfort, practicality, and style for day trips and overnights alike.",
    },
    specStrip: [
      { value: "23'", label: "Length" },
      { value: "2023", label: "Year Built" },
      { value: "Mercury", label: "175hp Outboard" },
      { value: "8", label: "Capacity" },
      { value: "Cuddy", label: "Weekender" },
    ],
    narrative: [
      "This 2023 Quicksilver 675 Weekend blends comfort, practicality, and style for new and experienced boaters alike. Lightly used and presented in excellent condition throughout, Moby Dick is the rare opportunity to step aboard a nearly-new cruiser without the wait.",
      "The layout is built for day cruising and overnight stays: a comfortable saloon converts to a berth with in-fill cushions, and an enclosed heads compartment houses a manual toilet. The galley is neatly equipped with a sink and tap, refrigerator, and ample storage for weekends away.",
      "The helm is well-appointed with a Simrad chartplotter, Lowrance VHF, Mercury engine dials, and a double USB charger, all paired with a comfortable bolster seat. A Webasto heating system, interior curtains, an opening roof hatch, and full surround canvas keep her comfortable in any weather, while the cockpit offers a table, cushioned seating, and rod holders for relaxed days on the water.",
    ],
    highlights: [
      "Mercury 175hp outboard — low hours",
      "Saloon converts to an overnight berth",
      "Enclosed heads with manual toilet",
      "Galley — sink, tap & refrigerator",
      "Simrad chartplotter & Lowrance VHF",
      "Webasto cabin heating system",
      "Opening roof hatch & full surround canvas",
      "Electric anchor windlass",
      "Cockpit table, cushioned seating & rod holders",
      "Fusion entertainment system w/ speakers",
      "Waste tank with pump-out",
      "Stainless railings, nav & exterior lighting",
    ],
    photoCredit: "Puget Sound, WA",
  },
  "yamaha-252se": {
    slug: "yamaha-252se",
    tagline: {
      lead: "A",
      emphasis: "turn-key Yamaha jet boat",
      tail: "— twin-engine performance and effortless day-boat versatility.",
    },
    specStrip: [
      { value: "25'", label: "Length" },
      { value: "2022", label: "Year Built" },
      { value: "Twin 1.8L", label: "Yamaha HO Jet" },
      { value: "8'6\"", label: "Beam" },
      { value: "12", label: "Capacity" },
    ],
    narrative: [
      "The Yamaha 252SE is the do-everything Pacific Northwest day boat — twin Yamaha 1.8-liter High Output jet engines deliver quick, confident performance with no outboard to clutter the swim platform. This 2022 example is presented in turn-key condition, ready for summer on the water.",
      "Jet propulsion means a shallow draft, easy beaching, and a wide-open swim platform with integrated sundeck and reboarding ladder — ideal for swimming, watersports, and rafting up. The helm centers on Yamaha's Connext touchscreen with cruise assist and No Wake Mode for low-speed control.",
      "Seating wraps the cockpit and bow for a full crew, with a filler cushion to convert the bow to a sun lounge. A premium audio system, bimini top, and ample stowage round out a boat built to make the most of short Northwest seasons.",
    ],
    highlights: [
      "Twin Yamaha 1.8L High Output jet engines",
      "Yamaha Connext touchscreen helm",
      "No Wake Mode & cruise assist",
      "Integrated swim platform with sundeck",
      "Reboarding ladder & transom shower",
      "Bow filler cushion — converts to sun lounge",
      "Premium audio system",
      "Bimini top & full canvas",
      "Shallow-draft jet propulsion",
      "Wraparound cockpit & bow seating",
    ],
    photoCredit: "Lake Washington, WA",
  },
};

export function getBrochure(slug: string): BrochureContent | undefined {
  return brochures[slug];
}
