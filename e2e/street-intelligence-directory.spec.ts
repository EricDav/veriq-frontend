import { expect, test } from '@playwright/test';

const street = {
  id: 'internal-street-id',
  readableId: 'RV-LOC-000001',
  canonicalUuid: '6d5a3f54-a18a-4b44-a7cc-83ac12218d30',
  state: 'Rivers',
  city: 'Port Harcourt',
  area: 'GRA',
  locationId: 'lga-1',
  areaId: 'area-1',
  streetName: 'Forces Avenue',
  status: 'approved',
  isPopular: false,
  popularRank: 0,
};

test('suggests database streets by state and LGA and opens imported intelligence', async ({ page }) => {
  await page.route('**/community/streets/locations**', async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state');
    const city = url.searchParams.get('city');
    const data = city
      ? { states: ['Rivers'], cities: ['Port Harcourt'], areas: ['GRA'], locations: [{ id: 'lga-1', state: 'Rivers', name: 'Port Harcourt', isActive: true }], areaRecords: [{ id: 'area-1', locationId: 'lga-1', name: 'GRA', isActive: true }] }
      : state
        ? { states: ['Rivers'], cities: ['Port Harcourt'], areas: [], locations: [{ id: 'lga-1', state: 'Rivers', name: 'Port Harcourt', isActive: true }], areaRecords: [] }
        : { states: ['Rivers'], cities: [], areas: [], locations: [], areaRecords: [] };
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Locations', data }),
    });
  });
  await page.route('**/community/streets/search?**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Streets', data: [street] }) });
  });
  await page.route('**/community/streets/internal-street-id', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Street Intelligence retrieved',
        data: {
          street,
          contributors: 0,
          lastUpdated: '2026-08-02T00:00:00.000Z',
          sourceNotice: 'This report includes Veriq Initial Intelligence.',
          results: [],
          usage: { limit: 3, used: 1, remaining: 2, requiresSignup: false },
        },
      }),
    });
  });

  await page.goto('/street-intelligence');
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('LGA').selectOption('Port Harcourt');
  await page.getByLabel('Street name').fill('Forces');
  await page.getByRole('button', { name: /Forces Avenue/ }).click();
  await page.getByRole('button', { name: 'View intelligence' }).click();

  await expect(page).toHaveURL(/\/street-intelligence\/internal-street-id$/);
  await expect(page.getByRole('heading', { name: 'Forces Avenue' })).toBeVisible();
  await expect(page.getByText('This report includes Veriq Initial Intelligence.')).toBeVisible();
});
