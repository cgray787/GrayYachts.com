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
  const src = yachtImageSrc(yacht.url, yacht.imageUrl);
  return (
    <>
      {/* A blurred copy fills the cinematic frame without forcing a portrait
          or tall-mast source into an aggressive crop. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt=""
        aria-hidden="true"
        loading="lazy"
        className="absolute inset-0 h-full w-full scale-110 object-cover opacity-45 blur-xl"
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={yacht.name}
        loading="lazy"
        className={cn("absolute inset-0 z-[1] h-full w-full object-contain", className)}
        onError={(e) => {
          const img = e.target as HTMLImageElement;
          img.style.display = "none";
          if (typeof window !== "undefined") {
            console.warn("[YachtImage] failed to load", img.src);
          }
        }}
      />
    </>
  );
}
