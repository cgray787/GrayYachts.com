import { chromium } from 'playwright';
import { strict as assert } from 'node:assert';
import { mkdir, writeFile } from 'node:fs/promises';

async function main() {
  const base = process.argv[2] ?? 'https://grayyachts.com';
  await mkdir('artifacts/catalog', { recursive: true });
  const browser = await chromium.launch({ headless: true });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1050 } });
    const errors: string[] = []; page.on('pageerror', error => errors.push(error.message));
    // Real screenshots, live extraction, no mocked routes or image sources.
    await page.goto(base + '/fleet/poulsbo', { waitUntil: 'networkidle' });
    await page.screenshot({ path: 'artifacts/catalog/poulsbo-listing-top.png' });
    await page.getByText('$300,000', { exact: true }).first().scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/catalog/poulsbo-listing-price.png' });
    await page.getByRole('heading', { name: 'Specifications', exact: true }).scrollIntoViewIfNeeded();
    await page.screenshot({ path: 'artifacts/catalog/poulsbo-listing-specs.png' });
    await page.goto(base + '/compare');
    await page.getByRole('button', { name: 'Import from listing screenshots', exact: true }).click();
    await page.getByLabel('Original listing URL').fill(base + '/fleet/poulsbo');
    await page.getByLabel('Boat photo screenshot').setInputFiles('public/listings/poulsbo/hero.jpg');
    await page.getByLabel('Specification screenshots').setInputFiles([
      'artifacts/catalog/poulsbo-listing-top.png', 'artifacts/catalog/poulsbo-listing-price.png', 'artifacts/catalog/poulsbo-listing-specs.png',
    ]);
    await page.getByRole('button', { name: 'Read screenshots and add yacht' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6') ?? '[]').some((y: { source: string }) => y.source === 'Screenshots'), {}, { timeout: 90000 });
    await page.reload();
    await page.locator('img[src^="/api/yacht-image?id="]').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (document.querySelector('img[src^="/api/yacht-image?id="]') as HTMLImageElement)?.naturalWidth > 100);
    const yacht = await page.evaluate(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6')!)[0]);
    assert.equal(yacht.year, 2023); assert.equal(yacht.priceNum, 300000); assert.equal(yacht.maxSpeedNum, 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'artifacts/catalog/live-screenshot-import-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/catalog/live-screenshot-import-mobile.png', fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const result = { status: 'PASS', errors, name: yacht.name, price: yacht.price, year: yacht.year, imageUrl: yacht.imageUrl };
    await writeFile('artifacts/catalog/live-screenshot-browser-check.json', JSON.stringify(result, null, 2));
    console.log(result);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
