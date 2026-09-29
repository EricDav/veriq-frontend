import { expect, test } from '@playwright/test';

test('FAQ answers the unlock journey, filters by topic and stays keyboard operable', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/faq', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'FAQ content', data: [] }),
    });
  });

  await page.goto('/faq');

  await expect(page.getByRole('heading', { name: 'A little clarity goes a long way.', level: 1 })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Do I need to top up a wallet?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'How do I reach Veriq?' })).toBeVisible();

  await page.getByRole('button', { name: 'Street Intelligence', exact: true }).click();
  await expect(page.getByRole('button', { name: 'What does Street Intelligence cover?' })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Do I need to top up a wallet?' })).toHaveCount(0);

  await page.getByPlaceholder('Search a question…').fill('minimum withdrawal');
  await expect(page.getByText('No question matches that yet.')).toBeVisible();

  await page.getByPlaceholder('Search a question…').clear();
  await page.getByRole('button', { name: 'All', exact: true }).click();

  // A property with no available unit cannot be unlocked (Master Blueprint §5), whatever the
  // design prototype's own answer says.
  const unavailable = page.getByRole('button', { name: 'Can I unlock an unavailable property?' });
  await expect(unavailable).toHaveAttribute('aria-expanded', 'false');
  await unavailable.focus();
  await page.keyboard.press('Enter');
  await expect(unavailable).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('both paid unlock and direct operator or caretaker contact are disabled')).toBeVisible();
  await expect(page.getByText('ask to be notified when a unit becomes available')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(unavailable).toHaveAttribute('aria-expanded', 'false');
});
