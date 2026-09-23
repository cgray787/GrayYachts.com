/** Operator-only: after reviewing a saved import, publish its URL fallback.
 * Usage: npx tsx scripts/publish-reviewed-yacht-capture.ts <saved-import-uuid>
 * Uses machine-local Wrangler credentials; public visitors cannot publish.
 */
import { createHash } from 'node:crypto';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { execFileSync } from 'node:child_process';
import { canonicalListingUrl } from '../src/lib/yacht-photo-candidates';
async function main() {
  const id = process.argv[2];
  if (!/^[a-f0-9-]{36}$/.test(id ?? '')) throw new Error('Supply a reviewed saved-import UUID.');
  const response = await fetch(`https://grayyachts.com/api/import-yacht-screenshots?id=${id}`);
  if (!response.ok) throw new Error(`Saved import HTTP ${response.status}`);
  const data = await response.json();
  if (!data.name || !data.builder || !data.capturedAt || !/^\/api\/yacht-image\?id=[a-f0-9]{64}$/.test(data.imageUrl)) throw new Error('Incomplete capture');
  const photo = await fetch(new URL(data.imageUrl, 'https://grayyachts.com'));
  if (!photo.ok || !photo.headers.get('content-type')?.startsWith('image/')) throw new Error('Photo unavailable');
  const key = createHash('sha256').update(canonicalListingUrl(data.url)).digest('hex');
  const dir = await mkdtemp(join(tmpdir(), 'reviewed-yacht-'));
  try {
    const file = join(dir, 'capture.json');
    await writeFile(file, JSON.stringify(data));
    execFileSync('npx', ['wrangler', 'r2', 'object', 'put', `grayyachts-catalog-photos/captured-listings/${key}.json`, '--file', file, '--content-type', 'application/json', '--remote'], {stdio:'inherit'});
    console.log(`Published reviewed capture: ${data.name}, captured ${data.capturedAt}`);
  } finally { await rm(dir, {recursive:true,force:true}); }
}
main().catch(error => {console.error(error.message);process.exitCode=1;});
