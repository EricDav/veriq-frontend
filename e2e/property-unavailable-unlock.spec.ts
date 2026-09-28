import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';

test('published property with no available units remains visible but cannot be unlocked', async ({ page }) => {
  await page.route(`${API_BASE}/properties/public-unavailable`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        data: {
          id: 'public-unavailable',
          title: 'Maple Court Apartments',
          description: 'A verified residential property.',
          category: 'residential',
          propertyType: 'flat',
          state: 'Rivers',
          city: 'Port Harcourt',
          area: 'Rumuola',
          bedrooms: 2,
          bathrooms: 2,
          rentAmount: 1500000,
          isAvailable: false,
          availableUnits: 0,
          totalUnits: 4,
          coverImageUrl: null,
          media: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });
  await page.route(`${API_BASE}/unlocks/properties/public-unavailable/quote`, async (route) => {
    await route.fulfill({ status: 409, contentType: 'application/json', body: JSON.stringify({ message: 'No units are currently available.' }) });
  });

  await page.goto('/properties/public-unavailable');

  await expect(page.getByRole('heading', { level: 2, name: 'Maple Court Apartments' })).toBeVisible();
  await expect(page.getByText(/visible for reference/i)).toBeVisible();
  await expect(page.getByRole('button', { name: 'Currently unavailable' })).toBeDisabled();
});
