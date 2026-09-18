import { chromium } from 'playwright';
import { SEED_YACHTS, STORAGE_KEY } from '../src/lib/yacht-catalog';
import { strict as assert } from 'node:assert';
import { mkdir } from 'node:fs/promises';

async function main() {
await mkdir('artifacts/catalog', { recursive: true });
const base = process.argv[2] ?? 'http://localhost:3117';
const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1440, height: 1100 } });
const page = await context.newPage();
const errors: string[] = [];
page.on('pageerror', error => { errors.push(error.message); console.log('PAGE ERROR', error.message); });
await page.route('**/api/scrape-yacht?*', route => route.fulfill({ json: {
  name: route.request().url().includes('second') ? 'Second yacht' : 'Original yacht',
  builder: 'Test builder', year: 2022, price: '$750,000', priceNum: 750000,
  imageUrl: '/api/yacht-image?id=' + 'a'.repeat(64), confidence: 'high', flags: [],
}}));
await page.route('**/api/yacht-image?*', route => route.fulfill({ path: 'public/listings/poulsbo/hero.jpg', contentType: 'image/jpeg' }));
await page.goto(`${base}/compare`);
await page.getByText('Start with a yacht you love').waitFor();
await page.screenshot({ path: 'artifacts/catalog/empty-desktop.png', fullPage: true });
await page.getByPlaceholder('Paste first listing URL...').fill('https://broker.com/first');
await page.getByPlaceholder('Paste second listing URL...').fill('https://broker.com/second');
await page.getByRole('button', { name: 'Compare', exact: true }).click();
await page.getByRole('heading', { name: 'Side-by-side comparison' }).waitFor();
const original = await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY);
assert(original?.includes('/api/yacht-image?id='));
assert(!original?.includes('Serenity II'));
await page.reload();
await page.getByRole('heading', { name: 'Side-by-side comparison' }).waitFor();
assert.equal(await page.evaluate(key => localStorage.getItem(key), STORAGE_KEY), original);
await page.locator('img[alt="Original yacht"]').first().waitFor();
await page.waitForFunction(() => (document.querySelector('img[alt="Original yacht"]') as HTMLImageElement)?.naturalWidth > 0);
await page.screenshot({ path: 'artifacts/catalog/saved-desktop.png', fullPage: true });
await context.storageState({ path: 'artifacts/catalog/browser-state.json' });
await context.close();
const reopened = await browser.newContext({ storageState: 'artifacts/catalog/browser-state.json', viewport: { width: 390, height: 844 } });
const mobile = await reopened.newPage();
await mobile.route('**/api/yacht-image?*', route => route.fulfill({ path: 'public/listings/poulsbo/hero.jpg', contentType: 'image/jpeg' }));
await mobile.goto(`${base}/compare`);
await mobile.getByRole('heading', { name: 'Side-by-side comparison' }).waitFor();
assert.equal(await mobile.evaluate(key => localStorage.getItem(key), STORAGE_KEY), original);
assert(await mobile.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth));
await mobile.screenshot({ path: 'artifacts/catalog/saved-mobile.png', fullPage: true });
await mobile.getByRole('button', { name: 'Remove Original yacht from your catalog' }).click();
await mobile.getByText('Choose two yachts to compare').waitFor();
await mobile.getByRole('button', { name: 'Remove Second yacht from your catalog' }).click();
await mobile.getByText('Start with a yacht you love').waitFor();
await mobile.reload();
await mobile.getByText('Start with a yacht you love').waitFor();
await mobile.evaluate(({ key, seeds }) => localStorage.setItem(key, JSON.stringify(seeds)), { key: STORAGE_KEY, seeds: SEED_YACHTS });
await mobile.reload();
await mobile.getByText('Start with a yacht you love').waitFor();
assert.equal(errors.length, 0, errors.join('\n'));
console.log('PASS: import, original photo source, reload, reopened browser storage, mobile width, removal, empty persistence, demo migration; no page errors.');
await browser.close();

}
main().catch(error => { console.error(error); process.exit(1); });
