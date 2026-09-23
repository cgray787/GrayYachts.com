import { NextRequest, NextResponse } from 'next/server';
import { photoBucket, savedPhotoUrl } from '@/lib/yacht-photo-store';
import { extractScreenshots, type VisionSource } from '@/lib/yacht-screenshot-extract';
import { assertPublicHttpUrl } from '@/lib/scrape-shared';

export async function POST(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const fail = (error: string, status: number) => NextResponse.json({ error }, { status, headers });
  if (request.headers.get('origin') !== request.nextUrl.origin) return fail('Please import from this website.', 403);
  if (Number(request.headers.get('content-length')) > 4096) return fail('Import request too large.', 413);
  try {
    const text = await request.text();
    if (text.length > 4096) return fail('Import request too large.', 413);
    const { url, photoId, specIds } = JSON.parse(text);
    if (typeof url !== 'string') return fail('Enter the original listing URL.', 400);
    assertPublicHttpUrl(url);
    if (typeof photoId !== 'string' || !/^[a-f0-9]{64}$/.test(photoId)
      || !Array.isArray(specIds) || specIds.length < 1 || specIds.length > 4
      || specIds.some(id => typeof id !== 'string' || !/^[a-f0-9]{64}$/.test(id)))
      return fail('Add one boat photo and one to four specification screenshots.', 400);
    const bucket = await photoBucket();
    if (!await bucket.get(photoId)) return fail('Boat photo is missing. Upload it again.', 400);
    const sources: VisionSource[] = [];
    for (const id of [...new Set(specIds as string[])]) {
      const image = await bucket.get(id);
      if (!image) return fail('A screenshot is missing. Upload it again.', 400);
      const type = image.httpMetadata?.contentType;
      if (!type || !['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(type))
        return fail('Use JPEG, PNG or WebP screenshots.', 400);
      const bytes = await image.arrayBuffer();
      if (bytes.byteLength > 5 * 1024 * 1024) return fail('Use screenshots under 5 MB.', 413);
      sources.push({ type: 'base64', media_type: type as 'image/jpeg', data: Buffer.from(bytes).toString('base64') });
    }
    const result = await extractScreenshots(sources);
    if (!result) return fail('Screenshot reading is temporarily unavailable. Your images are saved; please retry.', 503);
    if (!result.name || !result.builder || (!result.year && !result.lengthFt && !result.lengthM))
      return fail('Could not read enough listing details. Include the yacht title and specification table in your screenshots.', 422);
    const savedImportId = crypto.randomUUID();
    const data = { ...result, url, source: 'Screenshots', imageUrl: savedPhotoUrl(photoId),
      confidence: 'low', capturedAt: new Date().toISOString(),
      flags: ['Read from listing screenshots. Review the extracted specifications before sharing.', ...(result.warnings ?? [])] };
    await bucket.put(`imports/${savedImportId}.json`, new TextEncoder().encode(JSON.stringify(data)).buffer,
      { httpMetadata: { contentType: 'application/json' } });
    return NextResponse.json({ ...data, savedImportId }, { headers });
  } catch {
    return fail('Could not import these screenshots. Check the listing URL and try again.', 400);
  }
}

/** Immutable captured listing, accessible across devices through its saved link. */
export async function GET(request: NextRequest) {
  const headers = { 'Cache-Control': 'no-store' };
  const id = request.nextUrl.searchParams.get('id') ?? '';
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(id))
    return NextResponse.json({ error: 'Invalid saved import link.' }, { status: 400, headers });
  try {
    const saved = await (await photoBucket()).get(`imports/${id}.json`);
    if (!saved) return NextResponse.json({ error: 'Saved import not found.' }, { status: 404, headers });
    return new NextResponse(await saved.arrayBuffer(), { headers: { ...headers, 'Content-Type': 'application/json' } });
  } catch {
    return NextResponse.json({ error: 'Could not load the saved import. Please retry.' }, { status: 503, headers });
  }
}
