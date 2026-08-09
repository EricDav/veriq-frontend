import { expect, test } from '@playwright/test';

test('Home page presents property, street, and agent intelligence journeys', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/home', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /Know Before You Go/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: '2-Bed Flat, Rumuola' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Everything you need to inspect smarter' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /How Veriq Property Works/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Know the street before/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Built for smarter property decisions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Ready to inspect smarter?' })).toBeVisible();

  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
});
