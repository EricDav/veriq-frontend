import { expect, test } from '@playwright/test';

/**
 * The FAQ is the prototype's `#faq` exactly: nine questions, a search field, no category bar.
 *
 * Note that the prototype's own answer to "Can I unlock an unavailable property?" says Residential,
 * Short Let and Hostel listings stay unlockable, which is not what Master Blueprint §5 says. The page
 * carries the prototype's wording because the prototype is the agreed reference; if the Blueprint is
 * meant to win, this answer and the unlock gate are the two places to change.
 */
test('FAQ is the prototype question set and stays keyboard operable', async ({ page }) => {
  await page.route('**/api/v1/site-content/page/faq', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'FAQ content', data: [] }),
    });
  });

  await page.goto('/faq');

  await expect(page.getByRole('heading', { name: 'A little clarity goes a long way.', level: 1 })).toBeVisible();
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(9);
  await expect(page.getByRole('button', { name: 'Do I need to top up a wallet?' })).toBeVisible();
  await expect(
    page.getByRole('button', { name: 'Can a caretaker create a Residential Property owner account?' }),
  ).toBeVisible();

  await page.getByPlaceholder('Search a question…').fill('refunds');
  await expect(page.getByRole('main').getByRole('button')).toHaveCount(1);

  await page.getByPlaceholder('Search a question…').fill('minimum withdrawal');
  await expect(page.getByText('No question matches that yet.')).toBeVisible();

  await page.getByPlaceholder('Search a question…').clear();

  const unavailable = page.getByRole('button', { name: 'Can I unlock an unavailable property?' });
  await expect(unavailable).toHaveAttribute('aria-expanded', 'false');
  await unavailable.focus();
  await page.keyboard.press('Enter');
  await expect(unavailable).toHaveAttribute('aria-expanded', 'true');
  await expect(page.getByText('remain unlockable for planning with a clear unavailable disclosure')).toBeVisible();

  await page.keyboard.press('Enter');
  await expect(unavailable).toHaveAttribute('aria-expanded', 'false');
});
