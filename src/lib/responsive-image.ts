// srcset/sizes for public/ images that have pre-built WebP variants
// (scripts/build-image-variants.py writes them and image-variants.json).
// Spread into an <img>: <img {...responsive(src, '(min-width: 1024px) 40vw, 82vw')} alt="..." />
// Images without variants (external URLs, small files) come back as { src } only.
import variants from './image-variants.json';

type Entry = { w: number; v: number[] };
const MANIFEST = variants as Record<string, Entry>;

export function responsive(src: string, sizes: string): { src: string; srcSet?: string; sizes?: string } {
  const entry = MANIFEST[src.split('?')[0]];
  if (!entry) return { src };
  const base = src.split('?')[0].replace(/\.(jpe?g|png)$/i, '');
  const srcSet = [...entry.v.map(w => `${base}.w${w}.webp ${w}w`), `${src} ${entry.w}w`].join(', ');
  return { src, srcSet, sizes };
}
