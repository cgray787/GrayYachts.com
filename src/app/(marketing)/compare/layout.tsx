import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Compare Yachts Side by Side | Gray Yachts",
  description:
    "Compare two yachts side by side: length, beam, price, cabins, engines and more, pulled from the listings you choose.",
  alternates: { canonical: "/compare" },
};

export default function CompareLayout({ children }: { children: React.ReactNode }) {
  return children;
}
