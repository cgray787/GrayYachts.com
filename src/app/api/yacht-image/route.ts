import { NextRequest, NextResponse } from "next/server";
import { heroImageFor } from "@/lib/scrape-providers";
import { assertPublicHttpUrl } from "@/lib/scrape-shared";
import { archivePhoto, photoBucket, photoKey, isListingPhoto } from "@/lib/yacht-photo-store";

const FALLBACK_CACHE_SECONDS = 0;

function placeholderImage(reason: string): NextResponse {
  /* Wide and sparse on purpose. The card's hero slot is about 3.3:1 and the
     catalog thumbnail about 2.2:1, both filled with object-cover — a 4:3 image
     gets blown up and centre-cropped, which turned an earlier version of this
     into a giant line drawing with the caption sliced off. A 3:1 canvas with a
     small, centred mark survives the crop at either size. */
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="400" viewBox="0 0 1200 400" role="img" aria-label="Photo unavailable">
  <defs>
    <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#0c1a2e"/>
      <stop offset="100%" stop-color="#060a12"/>
    </linearGradient>
  </defs>
  <rect width="1200" height="400" fill="url(#g)"/>
  <g fill="none" stroke="#C9A96E" stroke-opacity="0.45" stroke-width="3.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M556 176h88l-12 26h-64z"/>
    <path d="M600 176v-32"/>
    <path d="M600 148l22 22h-22"/>
    <path d="M560 214c7 5 14 5 21 0s14-5 21 0 14 5 21 0 14-5 21 0"/>
  </g>
  <text x="600" y="252" text-anchor="middle" fill="#8892A5"
        font-family="Inter,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif"
        font-size="15" letter-spacing="1.5">Photo unavailable</text>
</svg>`;
  return new NextResponse(svg, {
    status: 200,
    headers: {
      "Content-Type": "image/svg+xml; charset=utf-8",
      "Cache-Control": `public, max-age=${FALLBACK_CACHE_SECONDS}, s-maxage=${FALLBACK_CACHE_SECONDS}`,
      "X-Content-Type-Options": "nosniff",
      // Why the real photo is missing, for debugging from the network tab.
      "X-Image-Fallback": reason.slice(0, 120),
    },
  });
}


export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const listing = request.nextUrl.searchParams.get('url');
    const source = request.nextUrl.searchParams.get('source');
    if (id && !/^[a-f0-9]{64}$/.test(id)) return new NextResponse(null, { status: 400 });
    if (!id && !listing) return new NextResponse(null, { status: 400 });
    if (listing) assertPublicHttpUrl(listing);
    const key = id ?? await photoKey(listing! + (source ? '\n' + source : ''));
    const bucket = await photoBucket();
    let saved = await bucket.get(key);
    if (!saved && listing && !id) {
      const candidate = source && isListingPhoto(source) ? source : (await heroImageFor(listing))?.imageUrl;
      if (!candidate) return placeholderImage('no listing photo available');
      await archivePhoto(bucket, key, candidate, listing);
      saved = await bucket.get(key);
    }
    if (!saved) return placeholderImage('saved photo not found');
    return new NextResponse(await saved.arrayBuffer(), { headers: {
      'Content-Type': saved.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Provider': 'r2-saved-photo',
    }});
  } catch (error) {
    console.error('[yacht-image]', error instanceof Error ? error.message : 'Photo failed');
    const message = error instanceof Error ? error.message : '';
    const safeReason = /^(Photo HTTP \d{3}|Photo too large|Response is not a supported photo|Yacht photo storage is not configured|Not a listing photo)$/.test(message)
      ? message : 'photo temporarily unavailable';
    return placeholderImage(safeReason);
  }
}
