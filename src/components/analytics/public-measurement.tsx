'use client';
import Script from 'next/script';
import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
declare global {
  interface Window { GYMeasurement?: { page: () => void } }
}
export default function PublicMeasurement() {
  const pathname = usePathname();
  useEffect(() => { window.GYMeasurement?.page(); }, [pathname]);
  if (/^\/(portal|login|auth|api|marine-tech|newsletter\/review)(\/|$)/.test(pathname)) return null;
  return <Script src="/measurement.js" strategy="afterInteractive" onLoad={() => window.GYMeasurement?.page()} />;
}
