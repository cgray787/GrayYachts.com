import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Yacht Catalog: Save Listings From Any Broker | Gray Yachts",
  description:
    "Build your own yacht catalog. Add listings from any broker's website, keep them in one place, and pin two for a side by side comparison.",
  alternates: { canonical: "/catalog" },
};

export default function CatalogLayout({ children }: { children: React.ReactNode }) {
  return children;
}
