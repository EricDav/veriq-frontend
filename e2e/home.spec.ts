import { expect, test } from '@playwright/test';

/** The home page is matched to the design prototype screen by screen; these are its own sections. */
test('Home page follows the prototype, section by section', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/home', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [] }) });
  });
  await page.route('**/api/v1/properties**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Properties', data: [] }),
    });
  });

  await page.goto('/');

  await expect(page.getByRole('heading', { name: /A property is more\s*than an address\./ })).toBeVisible();
  await expect(page.getByText('Agent-verified details')).toBeVisible();
  await expect(page.getByText('No agency or inspection fee')).toBeVisible();
  await expect(page.getByLabel('WHERE ARE YOU LOOKING?')).toHaveValue('Port Harcourt');
  await expect(page.getByRole('heading', { name: 'Places worth knowing more about.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Less guesswork. More confidence.' })).toBeVisible();
  await expect(page.getByRole('heading', { name: /A street has a story/ })).toBeVisible();
  await expect(page.getByRole('heading', { name: /Own a property\? Let.s make it known\./ })).toBeVisible();

  // The prototype paints every page flat on --background; no page carries a background image.
  await expect
    .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundImage))
    .toBe('none');

  // The search bar hands its category to the browse page rather than dropping it.
  await page.getByLabel('PROPERTY CATEGORY').selectOption('short_let');
  await page.getByRole('button', { name: 'Explore properties' }).click();
  await expect(page).toHaveURL(/\/properties\?q=Port\+Harcourt&category=short_let/);

  await page.goBack();
  await page.screenshot({ path: 'test-results/home-desktop.png', fullPage: true });
  await page.setViewportSize({ width: 390, height: 844 });
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth)).toBe(390);
  await page.screenshot({ path: 'test-results/home-mobile.png', fullPage: true });
});
