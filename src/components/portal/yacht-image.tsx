"use client";

import { cn } from "@/lib/utils";
import { yachtImageSrc, type YachtListing } from "@/lib/yacht-catalog";

/**
 * Hero image for a yacht. Always builds the src from the listing URL so
 * stale localStorage entries with a null `imageUrl` heal themselves on next
 * render. The proxy at /api/yacht-image fetches via Firecrawl and is
 * cached at Cloudflare's edge.
 */
export function YachtImage({
  yacht,
  className,
}: {
  yacht: YachtListing;
  className?: string;
}) {
  if (!yacht.url) return null;
  return (
    /* eslint-disable-next-line @next/next/no-img-element */
    <img
      src={yachtImageSrc(yacht.url)}
      alt={yacht.name}
      loading="lazy"
      className={cn("absolute inset-0 h-full w-full object-cover", className)}
      onError={(e) => {
        const img = e.target as HTMLImageElement;
        img.style.display = "none";
        if (typeof window !== "undefined") {
          console.warn("[YachtImage] failed to load", img.src);
        }
      }}
    />
  );
}
