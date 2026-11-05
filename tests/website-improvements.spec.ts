import { test, expect } from '@playwright/test';

const base = 'http://localhost:3107';

test('fleet filters support keyboards, reloads, and browser history', async ({ page }) => {
  await page.goto(`${base}/fleet?utm_source=test`);
  const price = page.getByRole('combobox', { name: 'Filter by Prices' });
  await price.focus();
  // Native select type-ahead works across operating systems without popup automation.
  await price.press('u');
  await price.press('Tab');
  await expect(price).toHaveValue('Under $50k');
  await expect(page).toHaveURL(/price=Under/);
  await page.getByRole('combobox', { name: 'Filter by Lengths' }).selectOption("25' – 35'");
  await page.reload();
  await expect(price).toHaveValue('Under $50k');
  await expect(page.getByRole('combobox', { name: 'Filter by Lengths' })).toHaveValue("25' – 35'");
  await page.goBack();
  await expect(page.getByRole('combobox', { name: 'Filter by Lengths' })).toHaveValue('');
  await page.goForward();
  await expect(page.getByRole('combobox', { name: 'Filter by Lengths' })).toHaveValue("25' – 35'");
  expect(new URL(page.url()).searchParams.get('utm_source')).toBe('test');
  await expect(page.locator('link[rel="canonical"]')).toHaveAttribute('href', 'https://grayyachts.com/fleet');
});

test('empty search opens a working inquiry form with the search context', async ({ page }) => {
  let payload: Record<string, string> | undefined;
  await page.route('**/api/inquiry', async route => {
    payload = route.request().postDataJSON();
    await route.fulfill({ json: { ok: true } });
  });
  await page.goto(`${base}/fleet?q=unmatched-test-yacht`);
  await page.getByText('Ask Connor to find a match', { exact: true }).click();
  await page.getByLabel('NAME', { exact: false }).fill('Local Test');
  await page.getByLabel('EMAIL', { exact: false }).fill('test@example.invalid');
  await page.getByRole('button', { name: 'REQUEST INFO' }).click();
  await expect(page.getByText('Message sent', { exact: true })).toBeVisible();
  expect(payload?.vessel).toContain('unmatched-test-yacht');
});

test('catalog link is in the initial comparison HTML', async ({ request }) => {
  const response = await request.get(`${base}/compare`);
  expect(response.ok()).toBe(true);
  expect(await response.text()).toMatch(/<a[^>]*href="\/catalog"/);
});

test('homepage content works without JavaScript and portrait is not preloaded', async ({ browser, request }) => {
  const html = await (await request.get(base)).text();
  expect(html).not.toMatch(/<link[^>]*rel="preload"[^>]*href="\/connor-gray-sm.jpeg"/);
  const context = await browser.newContext({ javaScriptEnabled: false, viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.goto(base);
  await expect(page.getByRole('heading', { name: 'What is your yacht worth today?' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connor Gray', exact: true })).toBeVisible();
  await expect(page.locator('img[src="/connor-gray-sm.jpeg"]')).toHaveAttribute('loading', 'lazy');
  await context.close();
});

test('mobile valuation hero selects a single responsive image without overflow', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  const images: string[] = [];
  page.on('request', request => { if (/\/sell\/img\/hero\./.test(request.url())) images.push(request.url()); });
  await page.goto(`${base}/sell.html`);
  const hero = page.locator('.hero-bg img');
  await expect(hero).toBeVisible();
  await expect.poll(() => hero.evaluate((img: HTMLImageElement) => img.currentSrc)).toContain('.webp');
  expect(images).toHaveLength(1);
  const box = await hero.boundingBox();
  expect(box!.height).toBeGreaterThan(300);
  expect(box!.width).toBe(390);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
  await page.screenshot({ path: '/private/tmp/grayyachts-sell-mobile-optimized.png' });
});
