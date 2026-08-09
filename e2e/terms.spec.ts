import { expect, test } from '@playwright/test';

test('Terms page renders the complete approved legal document', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/terms', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Terms content', data: [] }),
    });
  });

  await page.goto('/terms');

  await expect(page.getByRole('heading', { name: 'Terms & Conditions' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '1. About Veriq Property' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '19. Refund Protection and Credits' })).toBeVisible();
  await expect(page.getByRole('heading', { name: '32. Contact' })).toBeVisible();
  await expect(page.getByText('Last Updated: 8 August 2026')).toBeVisible();

  await page.getByRole('link', { name: 'Street Intelligence', exact: true }).click();
  await expect(page).toHaveURL(/#street-intelligence$/);
  await expect(page.getByRole('heading', { name: '8. Street Intelligence' })).toBeVisible();
});
