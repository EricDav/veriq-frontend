import { expect, test } from '@playwright/test';

test('About page presents the intelligence story and primary journeys', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/about', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'About content', data: [] }),
    });
  });

  await page.goto('/about');

  await expect(page.getByRole('heading', { name: /Building The Intelligence Layer/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Know Before You Go.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Trust Is Earned. Not Claimed.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /What You Can Do On Veriq/ })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Browse Properties' }).first()).toHaveAttribute('href', '/properties');
  await expect(page.getByRole('link', { name: 'Explore Street Intelligence' })).toHaveAttribute('href', '/street-intelligence');

  await page.screenshot({ path: 'test-results/about-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await page.screenshot({ path: 'test-results/about-mobile.png', fullPage: true });
});
