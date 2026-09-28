import { expect, test } from '@playwright/test';

/**
 * Direct unlock checkout (v1.6.2 §12.8, AC 37): the renter sees the effective price, the wallet credit applied,
 * the remaining payment and the refund-to-wallet disclosure, and access is only opened after the server settles
 * the unlock. A Free Unlock listing costs ₦0 and uses the same checkout.
 */

const API_BASE = 'http://localhost:3007/api/v1';
const propertyId = 'checkout-property-1';
const EXACT_ADDRESS = '14B Doxa Road';

const json = (data: unknown, status = 200, message = 'OK') => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ success: status < 400, statusCode: status, message, data }),
});

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub: 'renter-1', role: 'renter', exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

const publicProperty = (overrides: Record<string, unknown> = {}) => ({
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
      availabilityStatus: 'available',
      facts: {},
      price: { rentAmount: 1_200_000 },
    },
  ],
  availabilitySummary: { overall: 'available', documentedUnits: 1, availableUnits: 1 },
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
  ...overrides,
});

const quote = (overrides: Record<string, unknown> = {}) => ({
  listing: {
    targetType: 'property',
    targetId: propertyId,
    title: 'Residential compound in Rumuokoro',
    category: 'residential',
    area: 'Rumuokoro',
    city: 'Obio-Akpor',
  },
  price: 1500,
  priceFormatted: '₦1,500',
  standardPrice: 1500,
  isFreeUnlock: false,
  freeUnlockEndsAt: null,
  walletCreditAvailable: 600,
  walletCreditApplied: 600,
  remainingToPay: 900,
  noAdditionalPaymentNeeded: false,
  accessHours: 24,
  refundWindowHours: 24,
  availability: { overall: 'available', documentedUnits: 1, availableUnits: 1, requestedDates: null, disclosure: null },
  canUnlock: true,
  blockedReason: null,
  notifyMeAvailable: false,
  included: ['Exact verified address', 'Verified contact', 'Veriq Intelligence'],
  disclosures: {
    refund: 'Approved refunds are credited to your Veriq Wallet and applied automatically to a future unlock.',
    value: 'You are paying for verified property intelligence, not for an inspection or a guarantee of availability.',
  },
  alreadyUnlocked: null,
  viewerIsManager: false,
  signInRequired: false,
  ...overrides,
});

const unlockedPackage = {
  access: { level: 'unlocked', consultationId: 'unlock-1', unlockedAt: '2026-01-02T00:00:00.000Z', accessExpiresAt: '2030-01-01T00:00:00.000Z' },
  property: { ...publicProperty(), accessLevel: 'unlocked', address: EXACT_ADDRESS, verifiedAddress: { address: EXACT_ADDRESS, latitude: 4.84, longitude: 7.01 } },
  units: [],
  media: [],
  bookingLink: null,
  propertyContacts: [],
  agentSupport: null,
  streetIntelligence: null,
};

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: 'renter', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('veriq_access_token', token);
    localStorage.setItem('veriq_refresh_token', 'refresh-token');
    localStorage.setItem(
      'veriq_user',
      JSON.stringify({
        id: 'renter-1',
        firstName: 'Rita',
        lastName: 'Renter',
        email: 'renter@example.com',
        role: 'renter',
        isActive: true,
        isEmailVerified: true,
      }),
    );
  }, { token: fakeJwt() });

  await page.route(`${API_BASE}/auth/me`, (route) =>
    route.fulfill(json({ id: 'renter-1', firstName: 'Rita', lastName: 'Renter', email: 'renter@example.com', role: 'renter', isActive: true, isEmailVerified: true })),
  );
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(`${API_BASE}/notifications/unread-count`, (route) => route.fulfill(json({ unread: 0 })));
  await page.route(`${API_BASE}/community/free-unlocks/*/status`, (route) => route.fulfill(json({ available: false })));
  await page.route(`${API_BASE}/street-links/**`, (route) => route.fulfill(json(null)));
});

test('checkout shows price, wallet credit and remaining payment before the renter confirms', async ({ page }) => {
  let unlocked = false;
  let initiatePayload: Record<string, unknown> | null = null;

  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill(json(publicProperty())));
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    unlocked
      ? route.fulfill(json(unlockedPackage))
      : route.fulfill(json(null, 403, 'Unlock this property to view protected information')),
  );
  await page.route(`${API_BASE}/unlocks/quote**`, (route) => route.fulfill(json(quote())));
  await page.route(`${API_BASE}/unlocks`, async (route) => {
    initiatePayload = route.request().postDataJSON() as Record<string, unknown>;
    unlocked = true;
    await route.fulfill(
      json(
        {
          state: 'unlocked',
          unlock: {
            id: 'unlock-1',
            targetType: 'property',
            targetId: propertyId,
            status: 'unlocked',
            isActive: true,
            feeAmount: 1500,
            walletAmount: 600,
            externalAmount: 900,
            priceSource: 'category',
            paymentReference: 'VRQ-UNL-1',
            unlockedAt: '2026-01-02T00:00:00.000Z',
            accessExpiresAt: '2030-01-01T00:00:00.000Z',
            refundDeadlineAt: '2030-01-01T00:00:00.000Z',
            refundWindowOpen: true,
            failureReason: null,
            checkoutUrl: null,
            createdAt: '2026-01-02T00:00:00.000Z',
          },
          checkout: null,
        },
        201,
        'Unlock confirmed',
      ),
    );
  });

  await page.goto(`/properties/${propertyId}`);
  await expect(page.getByText(EXACT_ADDRESS)).toHaveCount(0);
  await page.getByRole('button', { name: /Unlock Full Report/ }).click();

  const checkout = page.getByRole('dialog');
  await expect(checkout.getByText('₦1,500').first()).toBeVisible();
  await expect(checkout.getByText('− ₦600')).toBeVisible();
  await expect(checkout.getByText('₦900').first()).toBeVisible();
  await expect(checkout.getByText(/credited to your Veriq Wallet/i)).toBeVisible();

  await checkout.getByRole('button', { name: /Continue to pay ₦900/ }).click();
  await expect.poll(() => initiatePayload).not.toBeNull();
  expect(initiatePayload).toEqual(
    expect.objectContaining({ targetType: 'property', targetId: propertyId }),
  );
  await expect(page.getByText(EXACT_ADDRESS).first()).toBeVisible();
});

test('a Free Unlock listing is unlocked at ₦0 through the same checkout', async ({ page }) => {
  let unlocked = false;
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) =>
    route.fulfill(json(publicProperty({ consultationFee: 0, isFreeUnlock: true }))),
  );
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    unlocked ? route.fulfill(json(unlockedPackage)) : route.fulfill(json(null, 403, 'Unlock this property first')),
  );
  await page.route(`${API_BASE}/unlocks/quote**`, (route) =>
    route.fulfill(
      json(
        quote({
          price: 0,
          priceFormatted: '₦0',
          isFreeUnlock: true,
          walletCreditApplied: 0,
          remainingToPay: 0,
          noAdditionalPaymentNeeded: true,
        }),
      ),
    ),
  );
  await page.route(`${API_BASE}/unlocks`, async (route) => {
    unlocked = true;
    await route.fulfill(
      json(
        {
          state: 'unlocked',
          unlock: {
            id: 'unlock-2',
            targetType: 'property',
            targetId: propertyId,
            status: 'unlocked',
            isActive: true,
            feeAmount: 0,
            walletAmount: 0,
            externalAmount: 0,
            priceSource: 'free_unlock',
            paymentReference: 'VRQ-UNL-2',
            unlockedAt: '2026-01-02T00:00:00.000Z',
            accessExpiresAt: '2030-01-01T00:00:00.000Z',
            refundDeadlineAt: null,
            refundWindowOpen: false,
            failureReason: null,
            checkoutUrl: null,
            createdAt: '2026-01-02T00:00:00.000Z',
          },
          checkout: null,
        },
        201,
        'Unlock confirmed',
      ),
    );
  });

  await page.goto(`/properties/${propertyId}`);
  await page.getByRole('button', { name: /Unlock Full Report Free/ }).click();
  const checkout = page.getByRole('dialog');
  await expect(checkout.getByText(/Free · ₦0/)).toBeVisible();
  await checkout.getByRole('button', { name: /Unlock free — ₦0/ }).click();
  await expect(page.getByText(EXACT_ADDRESS).first()).toBeVisible();
});
