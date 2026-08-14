import { expect, test } from '@playwright/test';

test('Free Listing toggle filters through the property API', async ({ page }) => {
  const propertyRequests: URL[] = [];

  await page.route('**/properties?**', async (route) => {
    propertyRequests.push(new URL(route.request().url()));
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Properties retrieved',
        data: [],
        meta: { total: 0, page: 1, limit: 12, pages: 0 },
      }),
    });
  });
  await page.route('**/agents?**', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, data: [], meta: { total: 0, page: 1, limit: 100, pages: 0 } }),
  }));
  await page.route('**/locations/states/active', (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, data: [] }),
  }));

  await page.goto('/properties');
  const toggle = page.getByRole('switch', { name: 'Free Listing only' });
  await expect(toggle).toHaveAttribute('aria-checked', 'false');
  await toggle.click();
  await expect(toggle).toHaveAttribute('aria-checked', 'true');
  await expect.poll(() => propertyRequests.some((url) => url.searchParams.get('freeIntelligenceOnly') === 'true')).toBe(true);
});
