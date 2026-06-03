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
};

export const vessels: Vessel[] = [
  {
    name: "S/Y Playa Linda",
    year: 1994,
    make: "Hunter Passage",
    length: "42'",
    location: "Seattle, WA",
    price: "$110,000",
    image: "/listings/playa-linda/hero.jpg",
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
    year: 1998,
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
    badge: "NEW LISTING",
  },
  {
    name: "Yamaha 252SE",
    year: 2022,
    make: "Yamaha 252SE",
    length: "25'",
    location: "Renton, WA",
    price: "$100,000",
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
