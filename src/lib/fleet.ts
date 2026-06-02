// Shared fleet data + slide-list helpers.
// Used by the homepage (#fleet section, hero-only carousel) and the
// dedicated /fleet page (full Step Inside gallery).

export type GalleryPhoto = { src: string; caption: string };

export type Vessel = {
  name: string;
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
      { src: "/listings/playa-linda/g1.jpg", caption: "Main Salon" },
      { src: "/listings/playa-linda/g2.jpg", caption: "Nav Station" },
      { src: "/listings/playa-linda/g3.jpg", caption: "Cockpit & Tender" },
    ],
    badge: "NEW LISTING",
  },
  {
    name: "S/V Seawulff",
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
      { src: "/listings/moby-dick/g1.jpg", caption: "Pilothouse" },
      { src: "/listings/moby-dick/g2.jpg", caption: "V-Berth" },
      { src: "/listings/moby-dick/g3.jpg", caption: "From Above" },
    ],
  },
];

export type GallerySlide = {
  src: string;
  caption: string;
  vessel: Vessel;
};

// Hero-only slide list — used by the homepage carousel.
// One card per vessel, exterior shots only, no interiors.
export const heroSlides: GallerySlide[] = vessels.map((v) => ({
  src: v.gallery[0].src,
  caption: v.gallery[0].caption,
  vessel: v,
}));

// Full round-robin interleaved slide list — used by the /fleet page's
// Step Inside section. Tier 0 = every vessel's hero, tier 1 = every g1,
// tier 2 = g2, tier 3 = g3. Vessels with fewer photos drop out of later
// tiers (Seawulff only appears in tier 0). Result: adjacent slides
// always come from different yachts.
export const gallerySlides: GallerySlide[] = (() => {
  const maxLen = Math.max(...vessels.map((v) => v.gallery.length));
  const out: GallerySlide[] = [];
  for (let tier = 0; tier < maxLen; tier++) {
    for (const v of vessels) {
      const photo = v.gallery[tier];
      if (photo) {
        out.push({ src: photo.src, caption: photo.caption, vessel: v });
      }
    }
  }
  return out;
})();
