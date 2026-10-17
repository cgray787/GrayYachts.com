#!/usr/bin/env python3
"""Write smaller WebP copies of large public/ images and a manifest the site reads.

Lighthouse (2026-10-17, mobile) put the homepage and listing pages at 8.5 to 9.9 MB,
mostly full size 1350 to 1800 px JPEGs shown in phone sized slots. Cloudflare image
resizing is not enabled on the zone, so the variants are pre-built and committed:
  public/listings/jimmie/g2.jpg -> public/listings/jimmie/g2.w640.webp, g2.w1280.webp
src/lib/image-variants.json maps "/listings/jimmie/g2.jpg" -> {"w": 1350, "v": [640]}
(w = original width, v = variant widths).

Re-run after adding photos:  python3 scripts/build-image-variants.py
Needs cwebp (brew install webp) and macOS sips.
"""
import json, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PUBLIC = ROOT / 'public'
MANIFEST = ROOT / 'src/lib/image-variants.json'
WIDTHS = (640, 1280)
MIN_BYTES = 60_000

def width(p: Path) -> int:
    out = subprocess.run(['sips', '-g', 'pixelWidth', str(p)], capture_output=True, text=True).stdout
    return int(out.split('pixelWidth:')[1].split()[0])

manifest = {}
for p in sorted(PUBLIC.rglob('*')):
    if p.suffix.lower() not in ('.jpg', '.jpeg', '.png') or p.stat().st_size < MIN_BYTES:
        continue
    if '.w' in p.stem and p.stem.rsplit('.w', 1)[-1].isdigit():
        continue
    w = width(p)
    made = []
    for target in WIDTHS:
        if w <= target * 1.1:
            continue
        out = p.with_name(f'{p.stem}.w{target}.webp')
        if not out.exists() or out.stat().st_mtime < p.stat().st_mtime:
            r = subprocess.run(['cwebp', '-quiet', '-q', '72', '-resize', str(target), '0', str(p), '-o', str(out)])
            if r.returncode != 0:
                print('cwebp failed:', p, file=sys.stderr); continue
        made.append(target)
    if made:
        manifest['/' + str(p.relative_to(PUBLIC))] = {'w': w, 'v': made}

MANIFEST.write_text(json.dumps(manifest, indent=0, sort_keys=True) + '\n')
print(f'{len(manifest)} images have variants; manifest -> {MANIFEST.relative_to(ROOT)}')
