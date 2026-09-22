import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
  await mkdir('artifacts/catalog', { recursive: true });
  const base = process.argv[2] ?? 'https://grayyachts.com';
  const listings = [
    'https://grayyachts.com/fleet/poulsbo',
    'https://www.denisonyachtsales.com/yachts-for-sale/37-axopar-XXVIII',
    'https://www.yachtworld.com/yacht/2021-axopar-37-xc-cross-cabin-10162884/',
  ];
  const results = await Promise.all(listings.map(async (listing, index) => {
    // Exercise actual pasted-URL discovery. Do not supply a known photo URL.
    const response = await fetch(`${base}/api/scrape-yacht?url=${encodeURIComponent(listing)}&v=4&retry=1`, { signal: AbortSignal.timeout(180000) });
    const data = await response.json() as { error?: string; imageUrl?: string; name?: string };
    if (!response.ok && index === 2) {
      assert.equal(response.status, 502);
      assert.equal(response.headers.get('cache-control'), 'no-store');
      assert(data.error); assert(!data.name);
      return { listing, status: 'BLOCKED_SOURCE_HANDLED', error: data.error };
    }
    assert(response.ok, JSON.stringify(data));
    assert(data.imageUrl?.startsWith('/api/yacht-image?id='), JSON.stringify(data));
    const photo = await fetch(base + data.imageUrl, { signal: AbortSignal.timeout(30000) });
    assert.equal(photo.headers.get('x-image-provider'), 'r2-saved-photo');
    const bytes = Buffer.from(await photo.arrayBuffer());
    assert(bytes.length > 1000);
    // No upstream URL supplied on the second read; original bytes must survive.
    const second = await fetch(base + data.imageUrl + '&verify=' + Date.now());
    assert.equal(second.headers.get('x-image-provider'), 'r2-saved-photo');
    assert(bytes.equals(Buffer.from(await second.arrayBuffer())));
    return { listing, status: 'PASS', name: data.name, imageUrl: data.imageUrl, bytes: bytes.length, sha256: createHash('sha256').update(bytes).digest('hex') };
  }));
  const html = await (await fetch(base + '/fleet/poulsbo')).text();
  assert(!/<meta[^>]+content="http:\/\/localhost:3000\/listings/.test(html), 'Public metadata must not reference localhost');
  await writeFile('artifacts/catalog/live-storage-check.json', JSON.stringify({ checkedAt: new Date().toISOString(), results }, null, 2));
  console.log(JSON.stringify(results, null, 2));
}
main().catch(error => { console.error(error); process.exit(1); });
