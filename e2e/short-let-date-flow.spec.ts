import { expect, test } from '@playwright/test';
import { API_BASE, json, signIn } from './helpers/session';

/**
 * Master Blueprint §5: Short Let availability is checked against the selected dates, and no qualifying unit for
 * those dates means no paid unlock for that search. The chosen nights travel from the search into the unlock quote
 * and into the unlock itself, and ranges are half-open `[checkIn, checkOut)`.
 */

const propertyId = 'short-let-1';
const CHECK_IN = '2027-03-10';
const CHECK_OUT = '2027-03-13';
const EXACT_ADDRESS = '9 Aba Road';

const shortLet = {
  id: propertyId,
  agentId: 'agent-1',
  title: 'Serviced studio in GRA',
  category: 'short_let',
  propertyType: 'short_stay',
  bedrooms: 1,
  bathrooms: 1,
  rentAmount: 0,
  serviceCharge: 0,
  agencyFee: 0,
  legalFee: 0,
  cautionFee: 0,
  inspectionFee: 0,
  consultationFee: 1000,
  isFreeUnlock: false,
  state: 'Rivers',
  city: 'Port Harcourt',
  area: 'GRA',
  status: 'active',
  freshnessScore: 'freshly_verified',
  coverImageUrl: null,
  accessLevel: 'public',
  units: [
    {
      id: 'unit-1',
      displayLabel: 'Studio 1',
      unitType: 'Studio Apartment',
      subtype: null,
      availabilityStatus: 'available',
      facts: {},
      price: { shortStayDailyRate: 45_000 },
    },
  ],
  availabilitySummary: { overall: 'available', documentedUnits: 1, availableUnits: 1, availableUnitTypes: ['Studio Apartment'] },
  canUnlock: true,
  unlockBlockedReason: null,
  notifyMeAvailable: false,
  similarAvailable: [],
  createdAt: '2026-01-01T00:00:00.000Z',
  updatedAt: '2026-01-01T00:00:00.000Z',
};

const quote = (overrides: Record<string, unknown> = {}) => ({
  listing: {
    targetType: 'property',
    targetId: propertyId,
    title: shortLet.title,
    category: 'short_let',
    area: 'GRA',
    city: 'Port Harcourt',
  },
  price: 1000,
  priceFormatted: '₦1,000',
  standardPrice: 1000,
  isFreeUnlock: false,
  freeUnlockEndsAt: null,
  walletCreditAvailable: 0,
  walletCreditApplied: 0,
  remainingToPay: 1000,
  noAdditionalPaymentNeeded: false,
  accessHours: 24,
  refundWindowHours: 24,
  availability: {
    overall: 'available',
    documentedUnits: 1,
    availableUnits: 1,
    requestedDates: { checkIn: CHECK_IN, checkOut: CHECK_OUT, nights: 3 },
    disclosure: null,
  },
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
  access: {
    level: 'unlocked',
    consultationId: 'unlock-1',
    unlockedAt: '2026-01-02T00:00:00.000Z',
    accessExpiresAt: '2030-01-01T00:00:00.000Z',
  },
  property: { ...shortLet, accessLevel: 'unlocked', address: EXACT_ADDRESS },
  units: [],
  media: [],
  bookingLink: null,
  contactDisabledReason: null,
  propertyContacts: [],
  agentSupport: null,
  streetIntelligence: null,
};

test.beforeEach(async ({ page, context }) => {
  await signIn(page, context, 'renter');
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill(json(shortLet)));
});

test('the selected nights reach the unlock quote and the unlock itself', async ({ page }) => {
  let unlocked = false;
  const quoteUrls: string[] = [];
  let initiateBody: Record<string, unknown> | null = null;

  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    unlocked ? route.fulfill(json(unlockedPackage)) : route.fulfill(json(null, 403, 'Unlock this property first')),
  );
  await page.route(`${API_BASE}/unlocks/quote**`, (route) => {
    quoteUrls.push(route.request().url());
    return route.fulfill(json(quote()));
  });
  await page.route(`${API_BASE}/unlocks`, async (route) => {
    initiateBody = route.request().postDataJSON() as Record<string, unknown>;
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
            feeAmount: 1000,
            walletAmount: 0,
            externalAmount: 1000,
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

  // A Short Let asks for the stay before anything is quoted.
  await expect(page.getByRole('heading', { name: 'Choose your dates' })).toBeVisible();
  await page.getByLabel('Check-in').fill(CHECK_IN);
  await page.getByLabel('Check-out').fill(CHECK_OUT);
  // Half-open range: three nights, free again on the check-out date.
  await expect(page.getByText(/3 nights/)).toBeVisible();
  await expect(page.getByText(new RegExp(`check out on ${CHECK_OUT}`))).toBeVisible();

  await page.getByRole('button', { name: /Unlock Full Report/ }).click();
  const checkout = page.getByRole('dialog');
  await expect(checkout.getByText(/Checked for/)).toBeVisible();

  await expect.poll(() => quoteUrls.some((url) => url.includes(`checkIn=${CHECK_IN}`) && url.includes(`checkOut=${CHECK_OUT}`))).toBe(true);

  await checkout.getByRole('button', { name: /Continue to pay ₦1,000/ }).click();
  await expect.poll(() => initiateBody).not.toBeNull();
  expect(initiateBody).toEqual(
    expect.objectContaining({ targetType: 'property', targetId: propertyId, checkIn: CHECK_IN, checkOut: CHECK_OUT }),
  );
  await expect(page.getByText(EXACT_ADDRESS).first()).toBeVisible();
});

test('no unit free for the chosen nights blocks the unlock and offers different dates', async ({ page }) => {
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    route.fulfill(json(null, 403, 'Unlock this property first')),
  );
  await page.route(`${API_BASE}/unlocks/quote**`, (route) =>
    route.fulfill(
      json(
        quote({
          canUnlock: false,
          blockedReason: 'no_unit_for_dates',
          notifyMeAvailable: false,
          availability: {
            overall: 'available',
            documentedUnits: 1,
            availableUnits: 1,
            requestedDates: { checkIn: CHECK_IN, checkOut: CHECK_OUT, nights: 3 },
            disclosure:
              'No unit on this property is free for the dates you selected. Paid unlock is disabled for this search; try different dates.',
          },
        }),
      ),
    ),
  );

  await page.goto(`/properties/${propertyId}`);
  await page.getByLabel('Check-in').fill(CHECK_IN);
  await page.getByLabel('Check-out').fill(CHECK_OUT);
  await page.getByRole('button', { name: /Unlock Full Report/ }).click();

  const checkout = page.getByRole('dialog');
  await expect(checkout.getByText('No unit is free for the dates you chose')).toBeVisible();
  // A blocked quote is never a dead end: a watch is wrong here, different dates are the fix.
  await expect(checkout.getByRole('button', { name: 'Notify me when available' })).toHaveCount(0);
  await expect(checkout.getByRole('button', { name: 'Change dates' })).toBeVisible();
  await expect(checkout.getByRole('button', { name: /Continue to pay/ })).toHaveCount(0);
});

test('check-out is constrained to at least one night after check-in', async ({ page }) => {
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) =>
    route.fulfill(json(null, 403, 'Unlock this property first')),
  );
  await page.route(`${API_BASE}/unlocks/quote**`, (route) => route.fulfill(json(quote())));

  await page.goto(`/properties/${propertyId}`);
  await page.getByLabel('Check-out').fill(CHECK_OUT);
  // Moving check-in past the chosen check-out re-anchors the stay rather than leaving an impossible range.
  await page.getByLabel('Check-in').fill('2027-03-20');
  await expect(page.getByLabel('Check-out')).toHaveValue('2027-03-21');
  await expect(page.getByText(/1 night\b/)).toBeVisible();
});
