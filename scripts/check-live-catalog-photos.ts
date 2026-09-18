import { strict as assert } from 'node:assert';
import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
  await mkdir('artifacts/catalog', { recursive: true });
  const base = 'https://grayyachts.com';
  const listing = `${base}/fleet/poulsbo`;
  const source = `${base}/listings/poulsbo/hero.jpg`;
  const key = createHash('sha256').update(listing + '\n' + source).digest('hex');
  const url = `${base}/api/yacht-image?url=${encodeURIComponent(listing)}&source=${encodeURIComponent(source)}&v=6`;
  const first = await fetch(url, { signal: AbortSignal.timeout(60000) });
  assert.equal(first.headers.get('x-image-provider'), 'r2-saved-photo', JSON.stringify(Object.fromEntries(first.headers)));
  const original = Buffer.from(await first.arrayBuffer());
  // This URL has no listing or upstream photo address, and bypasses browser/URL caches.
  const second = await fetch(`${base}/api/yacht-image?id=${key}&verify=${Date.now()}`, { signal: AbortSignal.timeout(30000) });
  assert.equal(second.headers.get('x-image-provider'), 'r2-saved-photo');
  const saved = Buffer.from(await second.arrayBuffer());
  assert(original.equals(saved));
  const upstream = Buffer.from(await (await fetch(source)).arrayBuffer());
  assert(original.equals(upstream), 'Saved image must match the original photo exactly');
  const result = { status: 'PASS', provider: second.headers.get('x-image-provider'), bytes: saved.length, key, sha256: createHash('sha256').update(saved).digest('hex'), checkedAt: new Date().toISOString() };
  await writeFile('artifacts/catalog/live-storage-check.json', JSON.stringify(result, null, 2));
  console.log(result);
}
main().catch(error => { console.error(error); process.exit(1); });
