import { expect, test } from '@playwright/test';
import { API_BASE, json, signIn } from './helpers/session';

/**
 * Master Blueprint §5 and §9: Veriq does not accept money for a property with no available unit. The property stays
 * visible as Currently Unavailable, the unlock is switched off, and the renter is offered "Notify me when available"
 * plus similar available properties and independent Street Intelligence.
 */

const propertyId = 'blocked-property-1';
const similarId = 'available-property-9';

const blockedProperty = {
  id: propertyId,
  agentId: 'agent-1',
  title: 'Residential compound in Rumuokoro',
  category: 'residential',
  propertyType: 'flat',
  bedrooms: 2,
  bathrooms: 2,
  rentAmount: 1_200_000,
  serviceCharge: 0,
  agencyFee: 0,
  legalFee: 0,
  cautionFee: 0,
  inspectionFee: 0,
  consultationFee: 1500,
  isFreeUnlock: false,
  state: 'Rivers',
  city: 'Obio-Akpor',
  area: 'Rumuokoro',
  status: 'active',
  freshnessScore: 'freshly_verified',
  coverImageUrl: null,
  accessLevel: 'public',
  units: [
    {
      id: 'unit-1',
      displayLabel: 'Apartment 1',
      unitType: '2-Bedroom Flat',
      subtype: null,
      availabilityStatus: 'unavailable',
      facts: {},
      price: { rentAmount: 1_200_000 },
    },
  ],
  availabilitySummary: { overall: 'unavailable', documentedUnits: 1, availableUnits: 0, availableUnitTypes: [] },
  // The unlock gate the public detail payload now carries (§5).
  canUnlock: false,
  unlockBlockedReason: 'no_available_unit',
  notifyMeAvailable: true,
  similarAvailable: [
    {
      id: similarId,
      title: 'Mini flat in Eliozu',
      category: 'residential',
      area: 'Eliozu',
      city: 'Obio-Akpor',
      coverImageUrl: null,
      rentAmount: 900_000,
    },
  ],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

test.beforeEach(async ({ page, context }) => {
  await signIn(page, context, 'renter');
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill(json(blockedProperty)));
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    route.fulfill(json(null, 403, 'Unlock this property to view protected information')),
  );
});

test('a property with no available unit cannot be unlocked and offers notify-me plus similar listings', async ({ page }) => {
  let watchBody: string | null = null;
  await page.route(`${API_BASE}/availability-notifications/property/${propertyId}`, async (route) => {
    watchBody = route.request().method();
    await route.fulfill(
      json(
        {
          id: 'watch-1',
          targetType: 'property',
          targetId: propertyId,
          title: blockedProperty.title,
          area: 'Rumuokoro',
          city: 'Obio-Akpor',
          status: 'waiting',
          notifiedAt: null,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
        201,
        'We will let you know as soon as a unit on this property becomes available',
      ),
    );
  });

  await page.goto(`/properties/${propertyId}`);

  const main = page.locator('main');
  await expect(main.getByText('Currently unavailable — this property cannot be unlocked')).toBeVisible();
  await expect(main.getByText(/paid unlock and direct Operator or Caretaker contact are switched off/i)).toBeVisible();

  // The paid unlock call to action is gone entirely: there is nothing to buy.
  await expect(page.getByRole('button', { name: /Unlock Full Report/ })).toHaveCount(0);

  // Similar available properties and independent Street Intelligence are both offered.
  await expect(main.getByRole('heading', { name: 'Similar properties available now' })).toBeVisible();
  await expect(main.getByRole('link', { name: /Mini flat in Eliozu/ })).toHaveAttribute('href', `/properties/${similarId}`);
  await expect(main.getByRole('link', { name: /Street Intelligence for this area/ })).toHaveAttribute(
    'href',
    '/street-intelligence',
  );

  await main.getByRole('button', { name: 'Notify me when available' }).click();
  await expect.poll(() => watchBody).toBe('POST');
  await expect(main.getByText('We will let you know as soon as a unit is available')).toBeVisible();
  await expect(main.getByRole('link', { name: 'Availability alerts' })).toHaveAttribute(
    'href',
    '/dashboard/availability-notifications',
  );
});

test('the availability alerts page lists a waiting watch and cancels it', async ({ page }) => {
  let cancelled = false;
  await page.route(`${API_BASE}/availability-notifications`, (route) =>
    route.fulfill(
      json([
        {
          id: 'watch-1',
          targetType: 'property',
          targetId: propertyId,
          title: 'Residential compound in Rumuokoro',
          area: 'Rumuokoro',
          city: 'Obio-Akpor',
          status: cancelled ? 'cancelled' : 'waiting',
          notifiedAt: null,
          createdAt: '2026-01-02T00:00:00.000Z',
        },
      ]),
    ),
  );
  await page.route(`${API_BASE}/availability-notifications/watch-1`, async (route) => {
    cancelled = true;
    await route.fulfill(json({ id: 'watch-1', status: 'cancelled' }, 200, 'Notification request cancelled'));
  });

  await page.goto('/dashboard/availability-notifications');
  await expect(page.getByRole('heading', { name: 'Availability alerts' })).toBeVisible();
  const watch = page.getByRole('listitem').filter({ hasText: 'Residential compound in Rumuokoro' });
  await expect(watch.getByText('Waiting', { exact: true })).toBeVisible();

  await watch.getByRole('button', { name: /Cancel this alert/ }).click();
  await expect(watch.getByText('Cancelled', { exact: true })).toBeVisible();
  await expect(watch.getByRole('button', { name: /Cancel this alert/ })).toHaveCount(0);
});
