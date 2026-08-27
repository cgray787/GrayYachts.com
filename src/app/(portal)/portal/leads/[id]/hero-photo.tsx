"use client";

import { Camera } from "lucide-react";
import { useState } from "react";

export default function LeadHeroPhoto({
  listingId,
  storedUrl,
  facebookUrl,
  title,
}: {
  listingId: string;
  storedUrl: string | null;
  facebookUrl: string | null;
  title: string;
}) {
  const [source, setSource] = useState<"stored" | "captured" | "facebook" | "missing">(
    storedUrl ? "stored" : "captured",
  );
  const src =
    source === "stored"
      ? storedUrl
      : source === "captured"
      ? `/leads/${listingId}.jpg`
      : source === "facebook"
        ? facebookUrl
        : null;

  if (!src) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-[radial-gradient(circle_at_30%_20%,rgba(201,169,110,0.18),transparent_35%),linear-gradient(135deg,#101827,#060a12)]">
        <div className="flex flex-col items-center gap-2 text-text-secondary/70">
          <Camera className="h-9 w-9" />
          <span className="text-xs uppercase tracking-[0.18em]">Listing photo unavailable</span>
        </div>
      </div>
    );
  }

  return (
    // Correct listing image only. Never substitute an unrelated stock yacht.
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={title}
      className="absolute inset-0 h-full w-full object-cover object-center"
      onError={() =>
        setSource((current) => {
          if (current === "stored") return "captured";
          if (current === "captured" && facebookUrl) return "facebook";
          return "missing";
        })
      }
    />
  );
}
