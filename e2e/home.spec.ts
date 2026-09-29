import { expect, test } from '@playwright/test';

test('Home page presents the new property intelligence journey', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/home', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Know Before You Go/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Peace Court, Rumuola' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Everything you need to inspect smarter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Explore by Category' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Short Lets' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Verified Availability' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Less guesswork. More confidence.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /A street has a story/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Built for smarter property decisions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Own a property\? Let.s make it known\./ })).toBeVisible();

  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
});
