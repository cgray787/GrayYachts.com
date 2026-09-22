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
    await page.goto(base + '/compare');
    await page.getByRole('button', { name: 'Import from listing screenshots', exact: true }).click();
    await page.getByLabel('Original listing URL').fill('https://www.yachtworld.com/yacht/2018-lagoon-50-9727102/');
    await page.getByLabel('Boat photo screenshot').setInputFiles('artifacts/catalog/lagoon-9727102/photo.png');
    await page.getByLabel('Specification screenshots').setInputFiles([
      ...['info','description','engines','specifications'].map(n => 'artifacts/catalog/lagoon-9727102/' + n + '.png'),
    ]);
    await page.getByRole('button', { name: 'Read screenshots and add yacht' }).click();
    await page.waitForFunction(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6') ?? '[]').some((y: { source: string }) => y.source === 'Screenshots'), {}, { timeout: 90000 });
    const savedLink = await page.getByLabel('Saved yacht link').inputValue();
    await writeFile('artifacts/catalog/lagoon-9727102/saved-link.json', JSON.stringify({savedLink}));
    await page.reload();
    await page.locator('img[src^="/api/yacht-image?id="]').first().scrollIntoViewIfNeeded();
    await page.waitForFunction(() => (document.querySelector('img[src^="/api/yacht-image?id="]') as HTMLImageElement)?.naturalWidth > 100);
    const yacht = await page.evaluate(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6')!)[0]);
    assert.equal(yacht.year, 2018); assert.equal(yacht.priceNum, 566246); assert.equal(yacht.maxSpeedNum, 0);
    assert.deepEqual(errors, []);
    await page.screenshot({ path: 'artifacts/catalog/lagoon-9727102/live-screenshot-import-desktop.png', fullPage: true });
    await page.setViewportSize({ width: 390, height: 844 });
    await page.screenshot({ path: 'artifacts/catalog/lagoon-9727102/live-screenshot-import-mobile.png', fullPage: true });
    assert(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    const phone = await browser.newContext({ viewport: {width:390,height:844}, isMobile:true, hasTouch:true });
    const mobilePage = await phone.newPage();
    await mobilePage.goto(savedLink);
    await mobilePage.waitForFunction(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6') ?? '[]').some((y: { year: number }) => y.year === 2018));
    await mobilePage.waitForFunction(() => (document.querySelector('img[src^=\"/api/yacht-image?id=\"]') as HTMLImageElement)?.naturalWidth > 100);
    assert(await mobilePage.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
    await mobilePage.screenshot({path:'artifacts/catalog/lagoon-9727102/fresh-phone.png',fullPage:true});
    await mobilePage.evaluate(() => {const key='gy-compare-catalog-v6';const items=JSON.parse(localStorage.getItem(key)!);items[0].name='My saved Lagoon';items[0].edited=['name'];localStorage.setItem(key,JSON.stringify(items));});
    await mobilePage.reload();
    await mobilePage.waitForTimeout(1500);
    assert.equal(await mobilePage.evaluate(() => JSON.parse(localStorage.getItem('gy-compare-catalog-v6')!)[0].name),'My saved Lagoon');
    await phone.close();
    const result = { savedLink, freshMobileContext: true, editsPreserved: true, status: 'PASS', errors, name: yacht.name, price: yacht.price, year: yacht.year, imageUrl: yacht.imageUrl };
    await writeFile('artifacts/catalog/lagoon-9727102/live-screenshot-browser-check.json', JSON.stringify(result, null, 2));
    console.log(result);
  } finally { await browser.close(); }
}
main().catch(error => { console.error(error); process.exit(1); });
