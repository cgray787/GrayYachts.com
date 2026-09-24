import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";
import { jsonLd, SITE } from "@/lib/editorial";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const cormorant = Cormorant_Garamond({
  variable: "--font-cormorant",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://grayyachts.com"),
  title: "Gray Yachts — Pacific Northwest's Premier Yacht Experience",
  description:
    "Cinematic yacht brokerage in the Pacific Northwest. Sell-side advisory, buy-side representation, drone cinematography, and full-spectrum yacht services.",
  openGraph: {
    title: "Gray Yachts",
    description: "Pacific Northwest's Premier Yacht Experience. Brokerage, cinematography, and full-spectrum yacht services.",
    siteName: "Gray Yachts",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gray Yachts — Pacific Northwest's Premier Yacht Experience",
    description: "Cinematic yacht brokerage in the Pacific Northwest.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${cormorant.variable} antialiased`}
      >
        <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLd({
          "@context": "https://schema.org", "@type": "Organization", "@id": `${SITE}/#organization`,
          name: "Gray Yachts", url: SITE, telephone: "+1-425-671-8474",
          logo: `${SITE}/sell/img/logo-gy.png`,
          sameAs: ["https://instagram.com/grayyachts_"],
          contactPoint: { "@type": "ContactPoint", contactType: "Yacht brokerage", telephone: "+1-425-671-8474", areaServed: "Pacific Northwest" },
        }) }} />
        {children}
      </body>
    </html>
  );
}
