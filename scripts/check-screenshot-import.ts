import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
import { STORAGE_KEY } from '../src/lib/yacht-catalog';
async function main() {
  const base = process.argv[2] ?? 'http://localhost:3139';
  await mkdir('artifacts/catalog', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    const photo = '/api/yacht-image?id=' + 'c'.repeat(64);
    await page.route('**/api/yacht-image**', route => route.request().method() === 'POST'
      ? route.fulfill({ json: { imageUrl: photo } })
      : route.fulfill({ path: 'public/listings/poulsbo/hero.jpg', contentType: 'image/jpeg' }));
    await page.route('**/api/import-yacht-screenshots', route => {
      const body = route.request().postDataJSON(); assert.equal(body.specIds.length, 2);
      assert.equal(body.url, 'https://broker.example/sabre');
      return route.fulfill({ json: { name: '2007 Sabre 34', builder: 'Sabre', year: 2007, lengthFt: 34, cabins: 1, source: 'Screenshots', imageUrl: photo, flags: ['Read from screenshots'], confidence: 'low' } });
    });
    await page.goto(base + '/compare');
    await page.getByRole('button', { name: 'Import from listing screenshots', exact: true }).click();
    await page.getByLabel('Original listing URL').fill('https://broker.example/sabre');
    await page.getByLabel('Boat photo screenshot').setInputFiles('public/listings/poulsbo/hero.jpg');
    await page.getByLabel('Specification screenshots').setInputFiles(['public/listings/poulsbo/hero.jpg', 'public/listings/poulsbo/hero.jpg']);
    await page.getByRole('button', { name: 'Read screenshots and add yacht' }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? '[]').some((y: { name: string }) => y.name === '2007 Sabre 34'), STORAGE_KEY);
    await page.reload();
    const data = await page.evaluate(key => JSON.parse(localStorage.getItem(key) ?? '[]'), STORAGE_KEY);
    assert.equal(data[0].imageUrl, photo); assert.equal(data[0].cabins, '1 cabin'); assert.equal(data[0].range, 'N/A');
    assert.equal(data[0].verified, false); assert.equal(data[0].source, 'Screenshots');
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'artifacts/catalog/screenshot-import-mobile.png', fullPage: true });
    console.log('PASS: screenshot uploads, extraction-to-card mapping, saved photo, no inferred specs, reload persistence and mobile width.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
