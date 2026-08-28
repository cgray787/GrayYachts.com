import type { Metadata } from "next";
import { Geist } from "next/font/google";
import { Cormorant_Garamond } from "next/font/google";
import "./globals.css";

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
  title: "Gray Yachts — Pacific Northwest Yacht Brokerage",
  description:
    "Cinematic yacht brokerage in the Pacific Northwest. Sell-side advisory, buy-side representation, drone cinematography, and full-spectrum yacht services.",
  openGraph: {
    title: "Gray Yachts",
    description: "Pacific Northwest yacht brokerage, cinematic listing presentation, and buyer representation.",
    url: "https://grayyachts.com",
    siteName: "Gray Yachts",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gray Yachts — Pacific Northwest Yacht Brokerage",
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
        {children}
      </body>
    </html>
  );
}
