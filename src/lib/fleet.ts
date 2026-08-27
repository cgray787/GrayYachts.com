// Shared fleet data + slide-list helpers.
// Used by the homepage (#fleet section, hero-only carousel) and the
// dedicated /fleet page (full grid + interior-only Step Inside gallery).

export type GalleryPhoto = {
  src: string;
  caption: string;
  /**
   * true = cabin / pilothouse / nav station / engine room — anywhere
   * you'd be after stepping aboard and into the boat. The Step Inside
   * carousel on /fleet filters to these. Defaults to false.
   */
  interior?: boolean;
};

export type Vessel = {
  name: string;
  slug?: string;        // links a vessel to its BrochureContent + /listings/<slug>.pdf
  year: number;
  make: string;
  length: string;
  location: string;
  price: string;
  image: string;
  gallery: GalleryPhoto[];
  href?: string;
  badge?: string;
  /**
   * Full URL to this vessel's published 360° walkthrough on grayyachts.media,
   * e.g. "https://grayyachts.media/360tour/<slug>". When set, the fleet card
   * shows a "360° TOUR" button. Leave unset until a tour is published.
   */
  tour3DUrl?: string;
};

export const vessels: Vessel[] = [
  {
    // JBY brokerage listing (seller Shawn Hinz), entered Aug 21 2026.
    // Current brokerage record is authoritative for public advertising: 2023
    // Custom Norsco, 38'. A supplied WA registration shows a legacy 2007 DZP,
    // 32' record and is deliberately NOT used for year/builder/HIN claims here.
    name: "R/V Poulsbo",
    slug: "poulsbo",
    year: 2023,
    make: "Custom Norsco Aluminum Patrol",
    length: "38'",
    location: "Fall City, WA",
    price: "$300,000",
    image: "/listings/poulsbo/hero.jpg",
    href: "/listings/poulsbo.pdf",
    gallery: [
      { src: "/listings/poulsbo/hero.jpg", caption: "Dockside Bow Quarter" },
      { src: "/listings/poulsbo/g1.jpg", caption: "Aft Control Station" },
      { src: "/listings/poulsbo/i1.jpg", caption: "Cabin Work Space", interior: true },
      { src: "/listings/poulsbo/i2.jpg", caption: "Cabin Entry & Storage", interior: true },
      { src: "/listings/poulsbo/i3.jpg", caption: "Forward Crew Berths", interior: true },
      { src: "/listings/poulsbo/i4.jpg", caption: "Enclosed Head", interior: true },
      { src: "/listings/poulsbo/i5.jpg", caption: "Main Helm & Survey Electronics", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    name: "S/Y Playa Linda",
    slug: "playa-linda",
    year: 1994,
    make: "Hunter Passage",
    length: "42'",
    location: "Seattle, WA",
    price: "$110,000",
    image: "/listings/playa-linda/hero.jpg",
    href: "/listings/playa-linda.pdf",
    gallery: [
      { src: "/listings/playa-linda/hero.jpg", caption: "At Her Berth" },
      { src: "/listings/playa-linda/g1.jpg", caption: "Main Salon", interior: true },
      { src: "/listings/playa-linda/g2.jpg", caption: "Nav Station", interior: true },
      { src: "/listings/playa-linda/g3.jpg", caption: "Cockpit & Tender" },
      { src: "/listings/playa-linda/i1.jpg", caption: "Master Cabin", interior: true },
      { src: "/listings/playa-linda/i2.jpg", caption: "Galley Storage", interior: true },
      { src: "/listings/playa-linda/i3.jpg", caption: "Engine Room", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    name: "S/V Seawulff",
    slug: "seawulff",
    year: 1981,
    make: "Wood Sloop",
    length: "34.5'",
    location: "Port Townsend, WA",
    price: "$35,000 OBO",
    image: "/listings/seawulff/hero.jpg",
    gallery: [
      { src: "/listings/seawulff/hero.jpg", caption: "Boat Haven Marina" },
    ],
    href: "/listings/seawulff.pdf",
    badge: "NEW LISTING",
  },
  {
    name: "M/Y Dub Sea",
    slug: "dub-sea",
    year: 2016,
    make: "Cobalt 293",
    length: "29'",
    location: "Seattle, WA",
    price: "$30,000",
    image: "/listings/dub-sea/hero.jpg",
    gallery: [
      { src: "/listings/dub-sea/hero.jpg", caption: "Dockside" },
      { src: "/listings/dub-sea/g1.jpg", caption: "At Sunset" },
      { src: "/listings/dub-sea/g2.jpg", caption: "Cockpit" },
      { src: "/listings/dub-sea/g3.jpg", caption: "Stern at Marina" },
    ],
    href: "/listings/dub-sea.pdf",
    badge: "NEW LISTING",
  },
  {
    name: "Yamaha 252SE",
    slug: "yamaha-252se",
    year: 2022,
    make: "Yamaha 252SE",
    length: "25'",
    location: "Renton, WA",
    price: "$100,000",
    href: "/listings/yamaha-252se.pdf",
    image: "/listings/yamaha-252se/hero.jpg",
    gallery: [
      { src: "/listings/yamaha-252se/hero.jpg", caption: "Profile View" },
      { src: "/listings/yamaha-252se/g1.jpg", caption: "Helm Seats" },
      { src: "/listings/yamaha-252se/g2.jpg", caption: "Helm Detail" },
      { src: "/listings/yamaha-252se/g3.jpg", caption: "Stern Quarter" },
    ],
    badge: "NEW LISTING",
  },
  {
    name: "M/Y Moby Dick",
    slug: "moby-dick",
    year: 2023,
    make: "Quicksilver 675 Weekend",
    length: "23'",
    location: "Seattle, WA",
    price: "$68,000",
    image: "/listings/moby-dick/hero.jpg",
    gallery: [
      { src: "/listings/moby-dick/hero.jpg", caption: "Underway" },
      { src: "/listings/moby-dick/g1.jpg", caption: "Pilothouse", interior: true },
      { src: "/listings/moby-dick/g2.jpg", caption: "V-Berth", interior: true },
      { src: "/listings/moby-dick/g3.jpg", caption: "From Above" },
      { src: "/listings/moby-dick/i1.jpg", caption: "Pilothouse Lounge", interior: true },
      { src: "/listings/moby-dick/i2.jpg", caption: "Helm View", interior: true },
    ],
    href: "/listings/moby-dick.pdf",
  },
  {
    name: "M/Y Neverland",
    slug: "neverland",
    // ⚠️ UNCONFIRMED — model ran 2012–2022; exact year not yet supplied by the
    // seller. NOT rendered in the brochure PDF, but it IS shown on the public
    // fleet card. Confirm with Connor before merging this vessel to main.
    year: 2019,
    make: "Bénéteau Antares 7",
    length: "24'6\"",
    location: "Seattle, WA",
    price: "$75,000",
    image: "/listings/neverland/hero.jpg",
    href: "/listings/neverland.pdf",
    gallery: [
      { src: "/listings/neverland/hero.jpg", caption: "Underway" },
      { src: "/listings/neverland/g1.jpg", caption: "Stern Quarter" },
      { src: "/listings/neverland/g2.jpg", caption: "Bow Profile" },
      { src: "/listings/neverland/i1.jpg", caption: "Helm & Garmin", interior: true },
      { src: "/listings/neverland/i2.jpg", caption: "Pilothouse", interior: true },
      { src: "/listings/neverland/i3.jpg", caption: "Cabin Dinette", interior: true },
      { src: "/listings/neverland/i4.jpg", caption: "Aft Cabin", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    // ⚠️ NOT a Gray Yachts listing. This is Union Marine's boat (Ed Robinson),
    // listed on FB Marketplace. Brochure was built for a buyer-side client
    // presentation. Photos are captures of the seller's own listing images —
    // get originals + permission from Union Marine before any external use,
    // and do NOT publish this vessel to the live fleet as our own inventory.
    name: "Un Reel 2",
    slug: "un-reel-2",
    year: 2023,
    make: "Defiance San Juan 220",
    length: "24'6\"",
    location: "Tacoma, WA",
    price: "$70,000",
    image: "/listings/un-reel-2/hero.jpg",
    href: "/listings/un-reel-2.pdf",
    gallery: [
      { src: "/listings/un-reel-2/hero.jpg", caption: "Dockside, Tacoma" },
      { src: "/listings/un-reel-2/g1.jpg", caption: "Transom & Mercury 175XL" },
      { src: "/listings/un-reel-2/g2.jpg", caption: "Cockpit" },
      { src: "/listings/un-reel-2/i1.jpg", caption: "Pilothouse", interior: true },
      { src: "/listings/un-reel-2/i2.jpg", caption: "Dinette Converted", interior: true },
      { src: "/listings/un-reel-2/i3.jpg", caption: "Dinette & Galley", interior: true },
      { src: "/listings/un-reel-2/i4.jpg", caption: "Helm & Forward Berth", interior: true },
    ],
  },
  {
    // ⚠️ NOT a Gray Yachts listing. Victory Boats' boat, listed on FB
    // Marketplace by Ed Robinson at $64,862; $70,000 here is Connor's
    // presentation figure. Photos are captures of the seller's own listing
    // images — get originals + permission before external use, and do NOT
    // publish this vessel to the live fleet as our own inventory.
    name: "Jeanneau NC 695",
    slug: "jeanneau-nc-695",
    year: 2022,
    make: "Jeanneau NC 695",
    length: "24'5\"",
    location: "Tacoma, WA",
    price: "$70,000",
    image: "/listings/jeanneau-nc-695/hero.jpg",
    href: "/listings/jeanneau-nc-695.pdf",
    gallery: [
      { src: "/listings/jeanneau-nc-695/hero.jpg", caption: "Stern & Mercury 150" },
      { src: "/listings/jeanneau-nc-695/g1.jpg", caption: "Profile" },
      { src: "/listings/jeanneau-nc-695/g2.jpg", caption: "Cockpit & Sliding Door" },
      { src: "/listings/jeanneau-nc-695/i1.jpg", caption: "Helm & Garmin", interior: true },
      { src: "/listings/jeanneau-nc-695/i2.jpg", caption: "Helm Seat & Galley", interior: true },
      { src: "/listings/jeanneau-nc-695/i3.jpg", caption: "Saloon Dinette", interior: true },
      { src: "/listings/jeanneau-nc-695/i4.jpg", caption: "Forward Berths", interior: true },
    ],
  },
  {
    // JBY central listing (owner Brian White), Connor listing broker.
    // Specs from the signed listing agreement; beam is the published
    // Back Cove 30 figure. Photos are Connor's own edited set.
    name: "M/V Miss Maggie II",
    slug: "miss-maggie-ii",
    year: 2016,
    make: "Back Cove 30",
    length: "30'5\"",
    location: "Edmonds, WA",
    price: "$325,000",
    image: "/listings/miss-maggie-ii/hero.jpg",
    href: "/listings/miss-maggie-ii.pdf",
    gallery: [
      { src: "/listings/miss-maggie-ii/hero.jpg", caption: "Covered Moorage" },
      { src: "/listings/miss-maggie-ii/g1.jpg", caption: "Bow Profile" },
      { src: "/listings/miss-maggie-ii/g2.jpg", caption: "Starboard Side" },
      { src: "/listings/miss-maggie-ii/g3.jpg", caption: "At Her Slip" },
      { src: "/listings/miss-maggie-ii/g4.jpg", caption: "Transom" },
      { src: "/listings/miss-maggie-ii/g5.jpg", caption: "Cockpit" },
      { src: "/listings/miss-maggie-ii/i1.jpg", caption: "Helm", interior: true },
      { src: "/listings/miss-maggie-ii/i2.jpg", caption: "Salon & Dinette", interior: true },
      { src: "/listings/miss-maggie-ii/i3.jpg", caption: "Settee", interior: true },
      { src: "/listings/miss-maggie-ii/i4.jpg", caption: "Forward Cabin", interior: true },
      { src: "/listings/miss-maggie-ii/i5.jpg", caption: "Galley", interior: true },
      { src: "/listings/miss-maggie-ii/i6.jpg", caption: "Engine Space", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    // JBY central listing (owner Cathy Hayes), signed Jul 10 2026, 180 days.
    // Commercial aluminum shellfish workboat, NOT a pleasure yacht.
    // ⚠️ Outboard make/hp, capacity and tonnage are NOT in the listing
    // agreement and are deliberately not claimed — confirm with Connor.
    name: "M/V Jimmie",
    slug: "jimmie",
    year: 1997,
    make: "Rozema 50' Aluminum",
    length: "50'0\"",
    location: "Seabeck, WA",
    price: "$1,100,000",
    image: "/listings/jimmie/hero.jpg",
    href: "/listings/jimmie.pdf",
    gallery: [
      { src: "/listings/jimmie/hero.jpg", caption: "On the Hook" },
      { src: "/listings/jimmie/g1.jpg", caption: "Working Deck" },
      { src: "/listings/jimmie/g2.jpg", caption: "Foredeck" },
      { src: "/listings/jimmie/g3.jpg", caption: "Deck Davit" },
      { src: "/listings/jimmie/g4.jpg", caption: "Outboard Power" },
      { src: "/listings/jimmie/g5.jpg", caption: "Twin Outboards" },
      { src: "/listings/jimmie/i1.jpg", caption: "Helm", interior: true },
      { src: "/listings/jimmie/i2.jpg", caption: "Pilothouse", interior: true },
      { src: "/listings/jimmie/i3.jpg", caption: "Console & Controls", interior: true },
      { src: "/listings/jimmie/i4.jpg", caption: "Forward Sightlines", interior: true },
      { src: "/listings/jimmie/i5.jpg", caption: "Battery Bank", interior: true },
      { src: "/listings/jimmie/i6.jpg", caption: "Hull Compartment", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    // JBY central listing (owner Charlie Brown), signed Jun 30 2026.
    // Price is $400,000 per the JBY agreement — the older Hampton Yacht
    // Group listing sheet in the folder says $409,995; JBY's is current.
    // Equipment detail comes from the seller's own walkthrough write-up.
    name: "M/Y Sau Ping",
    slug: "sau-ping",
    year: 2021,
    make: "Sea Ray Sundancer 350",
    length: "35'0\"",
    location: "Des Moines, WA",
    price: "$400,000",
    image: "/listings/sau-ping/hero.jpg",
    href: "/listings/sau-ping.pdf",
    gallery: [
      { src: "/listings/sau-ping/hero.jpg", caption: "Aerial Profile" },
      { src: "/listings/sau-ping/g1.jpg", caption: "Golden Hour" },
      { src: "/listings/sau-ping/g2.jpg", caption: "Underway" },
      { src: "/listings/sau-ping/g3.jpg", caption: "At Sunset" },
      { src: "/listings/sau-ping/g4.jpg", caption: "Marina Entrance" },
      { src: "/listings/sau-ping/g5.jpg", caption: "On Puget Sound" },
      { src: "/listings/sau-ping/i1.jpg", caption: "Helm", interior: true },
      { src: "/listings/sau-ping/i2.jpg", caption: "Cockpit & Sunroof", interior: true },
      { src: "/listings/sau-ping/i3.jpg", caption: "Salon", interior: true },
      { src: "/listings/sau-ping/i4.jpg", caption: "Galley", interior: true },
      { src: "/listings/sau-ping/i5.jpg", caption: "Forward Berth", interior: true },
      { src: "/listings/sau-ping/i6.jpg", caption: "Head", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    // JBY NET listing (owner Mark Hayes), Connor sales exec, Jul 6 2026.
    // 21'2" is the hull length from the agreement (LOA w/ pulpit is ~24'5").
    // ⚠️ Registration conflict: agreement says OR 785AJB, but the photos
    // show CA "CF 9179 LE" — older shots, presumably re-registered. Reg is
    // deliberately omitted from the brochure. Engine make/hp not stated.
    // ⚠️ No interior photos exist in the folder — gallery is exteriors only.
    name: "Jeanneau NC 695 Weekender",
    slug: "nc-695-weekender",
    year: 2019,
    make: "Jeanneau NC 695 Weekender",
    length: "21'2\"",
    location: "Portland, OR",
    price: "$72,000",
    image: "/listings/nc-695-weekender/hero.jpg",
    href: "/listings/nc-695-weekender.pdf",
    gallery: [
      { src: "/listings/nc-695-weekender/hero.jpg", caption: "Bow Quarter" },
      { src: "/listings/nc-695-weekender/g1.jpg", caption: "Profile on Trailer" },
      { src: "/listings/nc-695-weekender/g2.jpg", caption: "Stored Ashore" },
      { src: "/listings/nc-695-weekender/i1.jpg", caption: "Wheelhouse Detail" },
      { src: "/listings/nc-695-weekender/i2.jpg", caption: "Hardtop & Glazing" },
      { src: "/listings/nc-695-weekender/i3.jpg", caption: "On Her Trailer" },
    ],
    badge: "NEW LISTING",
  },
  {
    // JBY central listing (owner Tyeson Doughty), signed Jul 10 2026.
    // 181 hours read off the Hobbs meter in the photos (0181.3). Twin
    // MerCruiser confirmed from the engine-bay shot. Beam/fuel are NOT
    // claimed — the window sticker in the photos is too low-res to read.
    // ⚠️ Source photos are small screenshots (max 846px); replace with
    // originals before this goes to print.
    name: "Cobalt 343",
    slug: "cobalt-343",
    year: 2005,
    // Short form: the full "Cobalt 343 Performance Cruiser" wraps to two
    // lines on the fleet card and knocks that row out of alignment.
    make: "Cobalt 343",
    length: "35'4\"",
    location: "Madrona Marina, WA",
    price: "$89,000",
    image: "/listings/cobalt-343/hero.jpg",
    href: "/listings/cobalt-343.pdf",
    gallery: [
      { src: "/listings/cobalt-343/hero.jpg", caption: "Dockside Profile" },
      { src: "/listings/cobalt-343/g1.jpg", caption: "Bow Quarter" },
      { src: "/listings/cobalt-343/g2.jpg", caption: "Foredeck" },
      { src: "/listings/cobalt-343/i1.jpg", caption: "Engine Bay", interior: true },
      { src: "/listings/cobalt-343/i2.jpg", caption: "Cockpit", interior: true },
      { src: "/listings/cobalt-343/i3.jpg", caption: "Helm", interior: true },
      { src: "/listings/cobalt-343/i4.jpg", caption: "Original Manuals & Keys", interior: true },
    ],
    badge: "NEW LISTING",
  },
  {
    // Owner Spark Carlander. ⚠️ NO listing agreement exists in the folder —
    // there is no signed price, length or location on file.
    //   price:    $575,000 — supplied directly by Connor 2026-08-05.
    //   length:   "54'" is still INFERRED from the 548 model designation.
    //   location: "Puget Sound, WA" is still a placeholder — the photos
    //             show an unidentified marina.
    // Model confirmed as an Ocean Alexander 548 from the engraved
    // electrical panel in IMG_3747. Length + location still need confirming.
    name: "Ocean Alexander 548",
    slug: "ocean-alexander-548",
    year: 1996,
    make: "Ocean Alexander 548",
    length: "54'",
    location: "Puget Sound, WA",
    price: "$575,000",
    image: "/listings/ocean-alexander-548/hero.jpg",
    href: "/listings/ocean-alexander-548.pdf",
    gallery: [
      { src: "/listings/ocean-alexander-548/hero.jpg", caption: "Dockside" },
      { src: "/listings/ocean-alexander-548/g1.jpg", caption: "Bow Quarter" },
      { src: "/listings/ocean-alexander-548/g2.jpg", caption: "Foredeck" },
      { src: "/listings/ocean-alexander-548/g3.jpg", caption: "Flybridge" },
      { src: "/listings/ocean-alexander-548/g4.jpg", caption: "Flybridge Seating" },
      { src: "/listings/ocean-alexander-548/g5.jpg", caption: "Radar Arch" },
      { src: "/listings/ocean-alexander-548/i1.jpg", caption: "Pilothouse", interior: true },
      { src: "/listings/ocean-alexander-548/i2.jpg", caption: "Saloon", interior: true },
      { src: "/listings/ocean-alexander-548/i3.jpg", caption: "Saloon Settee", interior: true },
      { src: "/listings/ocean-alexander-548/i4.jpg", caption: "Galley", interior: true },
      { src: "/listings/ocean-alexander-548/i5.jpg", caption: "Master Stateroom", interior: true },
      { src: "/listings/ocean-alexander-548/i6.jpg", caption: "Guest Cabin", interior: true },
    ],
    badge: "NEW LISTING",
  },
];

export type GallerySlide = {
  src: string;
  caption: string;
  vessel: Vessel;
};

// Hero-only slide list — used by the homepage carousel.
// One card per vessel, exterior shots only.
export const heroSlides: GallerySlide[] = vessels.map((v) => ({
  src: v.gallery[0].src,
  caption: v.gallery[0].caption,
  vessel: v,
}));

// Interior-only slide list, round-robin interleaved across vessels.
// Used by the /fleet page's Step Inside carousel.
// Tier 0 = every vessel's first interior shot, tier 1 = second, etc.
// Vessels with no interior photos (Seawulff, Dub Sea, Yamaha 252SE —
// either open boats or no cabin shots in the source folder) are
// silently skipped so the carousel stays on theme.
export const interiorSlides: GallerySlide[] = (() => {
  const buckets = vessels.map((v) => ({
    vessel: v,
    photos: v.gallery.filter((p) => p.interior),
  }));
  const maxLen = Math.max(...buckets.map((b) => b.photos.length));
  const out: GallerySlide[] = [];
  for (let tier = 0; tier < maxLen; tier++) {
    for (const { vessel, photos } of buckets) {
      const photo = photos[tier];
      if (photo) {
        out.push({ src: photo.src, caption: photo.caption, vessel });
      }
    }
  }
  return out;
})();

// Legacy export kept so a stale import wouldn't break the build.
// /fleet now uses interiorSlides instead. Remove once nothing else
// references it.
export const gallerySlides = interiorSlides;
