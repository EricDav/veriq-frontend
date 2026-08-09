import { expect, test } from '@playwright/test';

test('FAQ uses the complete approved content and category filters', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/faq', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'FAQ content', data: [] }),
    });
  });

  await page.goto('/faq');

  await expect(page.getByRole('heading', { name: 'FAQ' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'What is Veriq Property?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'How can I contact Veriq Property?' })).toBeVisible();

  await page.getByRole('button', { name: 'Street Intelligence', exact: true }).click();
  await expect(page.getByRole('button', { name: 'What is Street Intelligence?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'How are agents verified?' })).toHaveCount(0);

  await page.getByPlaceholder('Search questions...').fill('minimum withdrawal');
  await expect(page.getByText('No results found for “minimum withdrawal”')).toBeVisible();

  await page.getByRole('button', { name: 'Agents', exact: true }).click();
  await expect(page.getByRole('button', { name: 'What is the minimum withdrawal amount for agents?' })).toBeVisible();
});
