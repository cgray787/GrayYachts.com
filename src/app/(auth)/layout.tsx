import type { Metadata } from "next";

// Sign-in pages have no search value; keep them out of results.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <>{children}</>;
}
