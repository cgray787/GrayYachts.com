"use client";

import { useState } from "react";
import { Ship } from "lucide-react";
import { cn } from "@/lib/utils";
import { yachtImageSrc, type YachtListing } from "@/lib/yacht-catalog";

export function YachtImage({ yacht, className }: { yacht: YachtListing; className?: string }) {
  const src = yacht.imageUrl?.startsWith('/api/yacht-image?id=')
    ? yacht.imageUrl : yachtImageSrc(yacht.url, yacht.imageUrl);
  const [failedSrc, setFailedSrc] = useState<string | null>(null);
  return <div className={cn('absolute inset-0 bg-bg-secondary', className)}>
    <div className="flex h-full flex-col items-center justify-center gap-2 text-text-secondary">
      <Ship className="h-7 w-7 text-gold/60" />
      <span className="text-xs">Photo unavailable</span>
    </div>
    {src !== failedSrc && yacht.url && (
      /* eslint-disable-next-line @next/next/no-img-element */
      <img key={src} src={src} alt={yacht.name} loading="lazy"
        className="absolute inset-0 h-full w-full object-cover"
        onError={() => setFailedSrc(src)} />
    )}
  </div>;
}
