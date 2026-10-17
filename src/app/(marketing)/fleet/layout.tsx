import type { Metadata } from "next";

// /fleet/[slug] sets its own canonical; metadata merges shallowly, so without that
// every listing would inherit this "/fleet" canonical.
export const metadata: Metadata = {
  title: "Yachts and Boats for Sale in the Pacific Northwest | Gray Yachts",
  description:
    "Yachts and boats for sale with Gray Yachts and Jeff Brown Yachts in the Pacific Northwest, with prices, specifications and brochures. Book a showing.",
  alternates: { canonical: "/fleet" },
};

export default function FleetLayout({ children }: { children: React.ReactNode }) {
  return children;
}
