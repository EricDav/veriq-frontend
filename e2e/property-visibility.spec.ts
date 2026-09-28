import { expect, test, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';
const propertyId = 'visibility-property-1';
const EXACT_ADDRESS = '14B Doxa Road';

const json = (data: unknown, status = 200) => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ statusCode: status, message: status === 200 ? 'OK' : 'Forbidden', data }),
});

function publicProperty(overrides: Record<string, unknown> = {}) {
  return {
    id: propertyId,
    agentId: 'agent-1',
    title: 'Residential compound in Rumuokoro',
    category: 'residential',
    propertyType: 'flat',
    bedrooms: 2,
    bathrooms: 2,
    isFurnished: false,
    rentAmount: 1_200_000,
    serviceCharge: 0,
    agencyFee: 0,
    legalFee: 0,
    cautionFee: 0,
    inspectionFee: 0,
    consultationFee: 1500,
    state: 'Rivers',
    city: 'Obio-Akpor',
    area: 'Rumuokoro',
    status: 'active',
    freshnessScore: 'freshly_verified',
    coverImageUrl: null,
    agent: { id: 'agent-1', username: 'agent', verificationLevel: 1, isPlatformVerified: true, trustTier: 'bronze', profilePhotoUrl: null, businessName: null, bio: null, user: { firstName: 'Ada', lastName: 'Agent' } },
    units: [
      { id: 'u1', displayLabel: 'Apartment 1', unitType: '2-Bedroom Flat', subtype: null, availabilityStatus: 'unavailable', facts: {}, price: { rentAmount: 1_200_000 } },
      { id: 'u2', displayLabel: 'Apartment 2', unitType: 'Self-Contain', subtype: null, availabilityStatus: 'unavailable', facts: {}, price: { rentAmount: 600_000 } },
    ],
    availabilitySummary: { documentedUnits: 2, availableUnits: 0, overall: 'unavailable', availableUnitTypes: [] },
    // No available unit means no paid unlock (Master Blueprint §5).
    canUnlock: false,
    unlockBlockedReason: 'no_available_unit',
    notifyMeAvailable: true,
    similarAvailable: [],
    accessLevel: 'public',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    ...overrides,
  };
}

async function mockPublicShell(page: Page) {
  await page.route(`${API_BASE}/community/free-unlocks/*/status`, (route) => route.fulfill(json({ available: false })));
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
}

test('locked preview discloses unit availability and never renders protected location', async ({ page }) => {
  let unlockedPackageRequests = 0;
  await mockPublicShell(page);
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill(json(publicProperty())));
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) => {
    unlockedPackageRequests += 1;
    return route.fulfill(json(null, 403));
  });

  await page.goto(`/properties/${propertyId}`);

  await expect(page.getByRole('heading', { name: 'Preview this Property' })).toBeVisible();
  await expect(page.getByText('2 documented units')).toBeVisible();
  await expect(page.getByText('0 available now')).toBeVisible();
  await expect(page.getByText(/Veriq does not take payment for a property with no available unit/)).toBeVisible();
  await expect(page.getByText('Apartment 2')).toBeVisible();
  await expect(page.getByText('Self-Contain')).toBeVisible();
  await expect(page.getByText(EXACT_ADDRESS)).toHaveCount(0);
  await expect(page.getByRole('link', { name: /WhatsApp/ })).toHaveCount(0);
  // Anonymous visitors never request the protected package.
  expect(unlockedPackageRequests).toBe(0);
});

test('shows a not-found state instead of protected data when the public record is withdrawn and no unlock exists', async ({ page }) => {
  await mockPublicShell(page);
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill({ status: 404, contentType: 'application/json', body: JSON.stringify({ statusCode: 404, message: 'Property not found' }) }));

  await page.goto(`/properties/${propertyId}`);

  await expect(page.getByRole('heading', { name: 'Property Not Found' })).toBeVisible();
  await expect(page.getByText(EXACT_ADDRESS)).toHaveCount(0);
});
