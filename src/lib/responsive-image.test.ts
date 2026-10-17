import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import variants from './image-variants.json';
import { responsive } from './responsive-image';
import { vessels } from './fleet';

describe('responsive images', () => {
  it('every variant in the manifest exists on disk', () => {
    for (const [src, { v }] of Object.entries(variants as Record<string, { w: number; v: number[] }>)) {
      for (const w of v) expect(existsSync(`public${src.replace(/\.(jpe?g|png)$/i, '')}.w${w}.webp`), `${src} w${w}`).toBe(true);
    }
  });
  it('builds a srcset ending in the original at its real width', () => {
    const r = responsive('/listings/jimmie/g2.jpg', '100vw');
    expect(r.srcSet).toMatch(/^\/listings\/jimmie\/g2\.w640\.webp 640w, /);
    expect(r.srcSet).toMatch(/\/listings\/jimmie\/g2\.jpg \d+w$/);
    expect(r.sizes).toBe('100vw');
  });
  it('leaves images without variants alone', () => {
    expect(responsive('https://example.com/a.jpg', '100vw')).toEqual({ src: 'https://example.com/a.jpg' });
  });
  it.runIf(process.platform === 'darwin')('covers every listing hero photo wider than the smallest variant', () => {
    for (const v of vessels) {
      const src = v.gallery[0].src;
      const width = Number(execFileSync('sips', ['-g', 'pixelWidth', `public${src}`]).toString().match(/pixelWidth: (\d+)/)![1]);
      if (width > 704) expect(responsive(src, '100vw').srcSet, `${v.name} (${width}px)`).toBeTruthy();
    }
  });
});
