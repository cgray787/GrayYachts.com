// Cloudflare Images binding (wrangler.jsonc "images"). Transformations at /cdn-cgi/image/ are
// not enabled on the grayyachts.com zone (404, checked 2026-10-18); the binding needs no zone
// setting and worked from this account the same day (598,920-byte JPEG -> 37,514-byte 640px WebP).
export type ImagesBinding = {
 input(stream: ReadableStream): { transform(o: { width: number; fit?: 'scale-down' }): { output(o: { format: string; quality?: number }): Promise<{ response(): Response }> } };
};
export const WIDTHS = [640, 960, 1280] as const;
export async function resize(images: ImagesBinding | undefined, bytes: ArrayBuffer, width: number, format: 'image/webp' | 'image/jpeg', quality = 75) {
 if (!images) throw new Error('Images binding is not configured');
 const out = await images.input(new Response(bytes).body!).transform({ width, fit: 'scale-down' }).output({ format, quality });
 return out.response().arrayBuffer();
}
// Pixel size from the file header (JPEG SOFn, PNG IHDR, WebP VP8/VP8L/VP8X), for width/height
// attributes that stop the page shifting as photos load.
export function imageSize(buffer: ArrayBuffer): { width: number; height: number } | null {
 const b = new Uint8Array(buffer); const v = new DataView(buffer);
 if (b[0] === 0x89 && b[1] === 0x50) return b.length > 24 ? { width: v.getUint32(16), height: v.getUint32(20) } : null;
 if (b[0] === 0xff && b[1] === 0xd8) {
  for (let i = 2; i + 9 < b.length;) {
   if (b[i] !== 0xff) return null;
   const m = b[i + 1], len = v.getUint16(i + 2);
   if (m >= 0xc0 && m <= 0xcf && m !== 0xc4 && m !== 0xc8 && m !== 0xcc) return { width: v.getUint16(i + 7), height: v.getUint16(i + 5) };
   i += 2 + len;
  }
  return null;
 }
 if (String.fromCharCode(...b.slice(8, 12)) === 'WEBP' && b.length > 30) {
  const kind = String.fromCharCode(...b.slice(12, 16));
  if (kind === 'VP8 ') return { width: v.getUint16(26, true) & 0x3fff, height: v.getUint16(28, true) & 0x3fff };
  if (kind === 'VP8L') { const n = v.getUint32(21, true); return { width: (n & 0x3fff) + 1, height: ((n >> 14) & 0x3fff) + 1 }; }
  if (kind === 'VP8X') return { width: 1 + (b[24] | b[25] << 8 | b[26] << 16), height: 1 + (b[27] | b[28] << 8 | b[29] << 16) };
 }
 return null;
}
