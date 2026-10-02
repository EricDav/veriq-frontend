import { expect, test } from '@playwright/test';

/** The About page is the prototype's `#about` exactly: one prose column, three blocks, two actions. */
test('About page is the prototype prose column, word for word', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/about', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'About content', data: [] }),
    });
  });

  await page.goto('/about');

  await expect(
    page.getByRole('heading', { name: 'Better property decisions start with better information.', level: 1 }),
  ).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Know the property' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Understand the street' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Connect directly' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Back to Veriq' })).toHaveAttribute('href', '/');
  await expect(page.getByRole('link', { name: 'Explore properties' })).toHaveAttribute('href', '/properties');
  await expect(page.getByRole('link', { name: 'Get help' })).toHaveAttribute('href', '/contact');

  // The prototype has exactly three headings below the title; anything more is ours, not its.
  await expect(page.getByRole('main').getByRole('heading', { level: 2 })).toHaveCount(3);

  await page.screenshot({ path: 'test-results/about-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).resolves.toBe(true);
  await page.screenshot({ path: 'test-results/about-mobile.png', fullPage: true });
});
