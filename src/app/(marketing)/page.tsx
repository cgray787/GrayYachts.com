import type { Metadata } from "next";
import HomePage from "./home-page";

// The homepage body is a client component, which cannot export metadata, so this
// server wrapper gives "/" its own title, description and canonical. Without it the
// homepage, /fleet, /catalog and /compare all shared the root layout's title.
export const metadata: Metadata = {
  title: "Yacht Broker in Seattle and the Pacific Northwest | Gray Yachts",
  description:
    "Gray Yachts and Jeff Brown Yachts: a Seattle based yacht brokerage for Pacific Northwest owners. Find out what your yacht is worth, sell it, or buy with representation.",
  alternates: { canonical: "/" },
};

export default function Page() {
  return <HomePage />;
}
