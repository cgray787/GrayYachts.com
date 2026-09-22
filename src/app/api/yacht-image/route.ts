import { NextRequest, NextResponse } from 'next/server';
import { assertPublicHttpUrl } from '@/lib/scrape-shared';
import { photoBucket, photoKey, savedPhotoUrl, photoContentType } from '@/lib/yacht-photo-store';
import { resolveYachtPhoto } from '@/lib/resolve-yacht-photo';

function unavailable(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store', 'X-Image-Fallback': 'photo unavailable' };
  return request.nextUrl.searchParams.get('format') === 'json'
    ? NextResponse.json({ error: 'Photo could not be imported. Retry or upload a photo.', imageUrl: null }, { status: 502, headers })
    : new NextResponse(null, { status: 404, headers });
}

export async function GET(request: NextRequest) {
  try {
    const id = request.nextUrl.searchParams.get('id');
    const listing = request.nextUrl.searchParams.get('url');
    const source = request.nextUrl.searchParams.get('source');
    if (id && !/^[a-f0-9]{64}$/.test(id)) return new NextResponse(null, { status: 400 });
    if (!id && !listing) return new NextResponse(null, { status: 400 });
    if (listing) assertPublicHttpUrl(listing);
    const bucket = await photoBucket();
    const imageUrl = id ? savedPhotoUrl(id) : await resolveYachtPhoto(bucket, listing!, [source]);
    if (!imageUrl) return unavailable(request);
    const key = new URL(imageUrl, request.url).searchParams.get('id')!;
    const saved = await bucket.get(key);
    if (!saved) return unavailable(request);
    if (request.nextUrl.searchParams.get('format') === 'json') {
      return NextResponse.json({ imageUrl }, { headers: { 'Cache-Control': 'no-store' } });
    }
    return new NextResponse(await saved.arrayBuffer(), { headers: {
      'Content-Type': saved.httpMetadata?.contentType ?? 'image/jpeg',
      'Cache-Control': 'public, max-age=604800, immutable',
      'X-Content-Type-Options': 'nosniff',
      'X-Image-Provider': 'r2-saved-photo',
    }});
  } catch {
    return unavailable(request);
  }
}

/** Content-addressed uploads cannot replace another customer's saved photo. */
export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  if (request.headers.get('origin') !== request.nextUrl.origin)
    return NextResponse.json({ error: 'Please upload from this website.' }, { status: 403, headers });
  const limit = 8 * 1024 * 1024;
  if (!request.body || Number(request.headers.get('content-length')) > limit)
    return NextResponse.json({ error: 'Choose a photo under 8 MB.' }, { status: 413, headers });
  const reader = request.body.getReader();
  const chunks: Uint8Array[] = [];
  let size = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      size += value.length;
      if (size > limit) {
        await reader.cancel();
        return NextResponse.json({ error: 'Choose a photo under 8 MB.' }, { status: 413, headers });
      }
      chunks.push(value);
    }
    const bytes = new Uint8Array(size);
    let offset = 0;
    for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length; }
    const contentType = photoContentType(bytes);
    if (!contentType) return NextResponse.json({ error: 'Choose a JPEG, PNG, WebP, GIF or AVIF photo.' }, { status: 415, headers });
    const digest = await crypto.subtle.digest('SHA-256', bytes);
    const hash = Array.from(new Uint8Array(digest), b => b.toString(16).padStart(2, '0')).join('');
    const key = await photoKey('uploaded-photo:' + hash);
    const bucket = await photoBucket();
    if (!await bucket.get(key)) await bucket.put(key, bytes.buffer, { httpMetadata: { contentType } });
    return NextResponse.json({ imageUrl: savedPhotoUrl(key) }, { headers });
  } catch {
    return NextResponse.json({ error: 'Photo could not be saved. Please retry.' }, { status: 503, headers });
  }
}
