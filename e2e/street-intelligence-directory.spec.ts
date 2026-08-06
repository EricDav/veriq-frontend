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

const secondStreet = {
  ...street,
  id: 'second-street-id',
  readableId: 'RV-LOC-000002',
  canonicalUuid: '1db91e3d-ded9-4e86-a6d8-e126b03f6793',
  streetName: 'Peter Odili Road',
  area: 'Trans Amadi',
  areaId: 'area-2',
};

const property = {
  id: 'property-1',
  agentId: 'agent-1',
  title: 'Two Bedroom Flat on Forces Avenue',
  propertyType: 'flat',
  bedrooms: 2,
  bathrooms: 2,
  isFurnished: false,
  rentAmount: 1_200_000,
  state: 'Rivers',
  city: 'Port Harcourt',
  area: 'GRA',
  streetId: street.id,
  status: 'active',
  freshnessScore: 'freshly_verified',
  coverImageUrl: null,
  agent: { id: 'agent-1', verificationLevel: 1, user: { firstName: 'Ada', lastName: 'Agent' } },
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
    const url = new URL(route.request().url());
    const query = url.searchParams.get('q')?.toLowerCase();
    const data = query ? [street, secondStreet].filter((item) => item.streetName.toLowerCase().includes(query)) : [street, secondStreet];
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200,
      message: 'Streets',
      data,
      meta: { total: data.length, page: Number(url.searchParams.get('page') ?? 1), limit: 10, pages: 1 },
    }) });
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
  await page.route('**/properties?**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Properties', data: [property], meta: { total: 1, page: 1, limit: 3, pages: 1 } }),
    });
  });
  await page.route('**/community/free-unlocks/property-1/status', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Status', data: { available: false } }) });
  });

  await page.goto('/street-intelligence');
  await expect(page.getByRole('heading', { name: 'Need intelligence on a specific property?' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Explore Property Intelligence' })).toHaveAttribute('href', '/properties');
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('LGA').selectOption('Port Harcourt');
  await expect(page.getByText('Forces Avenue')).toBeVisible();
  await expect(page.getByText('Peter Odili Road')).toBeVisible();
  await page.getByLabel('Street name').fill('Forces');
  await expect(page.getByRole('link', { name: /Peter Odili Road/ })).not.toBeVisible();
  await page.getByRole('button', { name: /Forces Avenue/ }).click();
  await page.getByRole('button', { name: 'View intelligence' }).click();

  await expect(page).toHaveURL(/\/street-intelligence\/internal-street-id$/);
  await expect(page.getByRole('heading', { name: 'Forces Avenue', exact: true })).toBeVisible();
  await expect(page.getByText('This report includes Veriq Initial Intelligence.')).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Properties on Forces Avenue' })).toBeVisible();
  await expect(page.getByText('Two Bedroom Flat on Forces Avenue')).toBeVisible();
  await expect(page.getByRole('link', { name: /Browse properties/ })).toHaveAttribute('href', /state=Rivers.*city=Port\+Harcourt.*area=GRA/);
});
