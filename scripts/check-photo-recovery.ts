import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';
import { SEED_YACHTS, STORAGE_KEY } from '../src/lib/yacht-catalog';

async function main() {
  const base = process.argv[2] ?? 'http://localhost:3139';
  await mkdir('artifacts/catalog', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const errors: string[] = [];
    page.on('pageerror', e => errors.push(e.message));
    const stable = '/api/yacht-image?id=' + 'b'.repeat(64);
    let available = false;
    let repairs = 0;
    let uploads = 0;
    await page.route('**/api/yacht-image**', async route => {
      const request = route.request();
      if (request.method() === 'POST') {
        uploads++; return route.fulfill({ json: { imageUrl: stable } });
      }
      if (request.url().includes('format=json')) {
        repairs++;
        return route.fulfill(available ? { json: { imageUrl: stable } }
          : { status: 502, json: { error: 'Photo could not be imported. Retry or upload a photo.' } });
      }
      return route.fulfill({ path: 'public/listings/poulsbo/hero.jpg', contentType: 'image/jpeg' });
    });
    await page.goto(base + '/compare');
    await page.evaluate(({ key, seed }) => {
      localStorage.setItem(key, JSON.stringify([{ ...seed, id: 'saved-manual', name: 'My edited yacht', price: '$123,456', edited: ['name','price'], verified: true, imageUrl: null, url: 'https://broker.example/yacht/123' }]));
    }, { key: STORAGE_KEY, seed: SEED_YACHTS[0] });
    await page.reload();
    await page.getByRole('button', { name: 'Retry photo', exact: true }).first().waitFor();
    await page.getByText('Photo unavailable', { exact: true }).first().waitFor();
    available = true;
    await page.getByRole('button', { name: 'Retry photo', exact: true }).first().click();
    await page.waitForFunction(({ key, photo }) => JSON.parse(localStorage.getItem(key) ?? '[]')[0]?.imageUrl === photo, { key: STORAGE_KEY, photo: stable });
    const saved = await page.evaluate(key => JSON.parse(localStorage.getItem(key)!)[0], STORAGE_KEY);
    assert.equal(saved.name, 'My edited yacht'); assert.equal(saved.price, '$123,456'); assert.equal(saved.verified, true);
    await page.reload();
    await page.locator('img[alt="My edited yacht"]').first().waitFor();
    await page.waitForFunction(() => (document.querySelector('img[alt="My edited yacht"]') as HTMLImageElement)?.naturalWidth > 0);
    await page.getByPlaceholder('Paste first listing URL...').fill('https://broker.example/yacht/123');
    await page.getByRole('button', { name: 'Compare', exact: true }).click();
    await page.waitForFunction(key => JSON.parse(localStorage.getItem(key) ?? '[]').length === 1, STORAGE_KEY);
    assert(repairs >= 2);
    await page.screenshot({ path: 'artifacts/catalog/recovered-mobile.png', fullPage: true });
    // Start with a new missing-photo card and verify explicit upload persistence.
    available = false;
    await page.evaluate(key => {
      const yachts = JSON.parse(localStorage.getItem(key)!); yachts[0].imageUrl = null; localStorage.setItem(key, JSON.stringify(yachts));
    }, STORAGE_KEY);
    await page.reload();
    await page.getByLabel('Upload photo for My edited yacht').first().setInputFiles('public/listings/poulsbo/hero.jpg');
    await page.waitForFunction(({ key, photo }) => JSON.parse(localStorage.getItem(key) ?? '[]')[0]?.imageUrl === photo, { key: STORAGE_KEY, photo: stable });
    assert.equal(uploads, 1);
    await page.reload();
    await page.locator('img[alt="My edited yacht"]').first().waitFor();
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
    assert.deepEqual(errors, []);
    console.log('PASS: failed import recovery, retry, edit preservation, same-URL reuse, upload persistence, reload and mobile width.');
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
