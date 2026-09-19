import { expect, test, type BrowserContext, type Page } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';
const propertyId = 'free-unlock-property-1';

function fakeJwt(role: 'user' | 'admin' = 'user') {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: role === 'admin' ? 'admin-user-1' : 'renter-user-1',
      email: role === 'admin' ? 'admin@example.com' : 'renter@example.com',
      role,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function userFixture(role: 'user' | 'admin' = 'user') {
  return {
    id: role === 'admin' ? 'admin-user-1' : 'renter-user-1',
    firstName: role === 'admin' ? 'Ada' : 'Rita',
    lastName: role === 'admin' ? 'Admin' : 'Renter',
    email: role === 'admin' ? 'admin@example.com' : 'renter@example.com',
    phone: '08000000000',
    role,
    isActive: true,
    isEmailVerified: true,
    isPhoneVerified: true,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function propertyFixture() {
  return {
    id: propertyId,
    agentId: 'agent-1',
    title: 'Free Unlock Choba Flat',
    description: 'A clean property with a sponsored intelligence report.',
    propertyType: 'flat',
    state: 'Rivers',
    city: 'Port Harcourt',
    area: 'Choba',
    address: '12 Test Road',
    bedrooms: 2,
    bathrooms: 2,
    isFurnished: false,
    rentAmount: 1200000,
    serviceCharge: 0,
    agencyFee: 0,
    legalFee: 0,
    cautionFee: 0,
    inspectionFee: 0,
    consultationFee: 2500,
    consultationTier: 'tier_1',
    freshnessScore: 'freshly_verified',
    status: 'active',
    coverImageUrl: null,
    hostelSuitableFor: [],
    shortStayAmenities: [],
    electricityInfo: [],
    bestNetwork: [],
    securityFeatures: [],
    knownIssues: [],
    agent: {
      id: 'agent-1',
      userId: 'agent-user-1',
      isPlatformVerified: true,
      verificationLevel: 1,
      trustTier: 'bronze',
      user: { id: 'agent-user-1', firstName: 'Ada', lastName: 'Agent', phone: '08011111111' },
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/** Public basic-details projection: no exact address, intelligence or contacts. */
function publicPropertyFixture() {
  const { address: _address, description: _description, ...rest } = propertyFixture();
  return {
    ...rest,
    agent: { id: 'agent-1', username: null, isPlatformVerified: true, verificationLevel: 1, trustTier: 'bronze', profilePhotoUrl: null, businessName: null, bio: null, user: { firstName: 'Ada', lastName: 'Agent' } },
    units: [{ id: 'unit-1', displayLabel: 'Apartment 1', unitType: '2-Bedroom Flat', subtype: null, availabilityStatus: 'available', facts: { bedrooms: 2 }, price: { rentAmount: 1200000 } }],
    availabilitySummary: { documentedUnits: 1, availableUnits: 1, overall: 'available', availableUnitTypes: ['2-Bedroom Flat'] },
    accessLevel: 'public',
  };
}

function unlockedPackageFixture() {
  return {
    access: { level: 'unlocked', consultationId: 'consultation-free-1', unlockedAt: new Date().toISOString(), accessExpiresAt: new Date(Date.now() + 48 * 3600 * 1000).toISOString() },
    property: propertyFixture(),
    units: [{ id: 'unit-1', propertyId, displayLabel: 'Apartment 1', unitType: '2-Bedroom Flat', subtype: null, facts: { bedrooms: 2 }, commercialTerms: { rentAmount: 1200000 }, intelligence: {}, availabilityStatus: 'available', verificationStatus: 'verified', availabilityConfirmedAt: null }],
    media: [],
    bookingLink: null,
    propertyContacts: [{ role: 'property_contact', contactType: 'caretaker', name: 'Mr Caretaker', phone: '08031234567', whatsappUrl: 'https://wa.me/2348031234567?text=Hello' }],
    agentSupport: { role: 'veriq_agent', contactType: 'agent', name: 'Ada Agent', phone: '08011111111', whatsappUrl: 'https://wa.me/2348011111111?text=Hello' },
  };
}

async function seedAuth(context: BrowserContext, page: Page, role: 'user' | 'admin') {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: role, domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(({ token, user }) => {
    window.localStorage.setItem('veriq_access_token', token);
    window.localStorage.setItem('veriq_refresh_token', 'refresh-token');
    window.localStorage.setItem('veriq_user', JSON.stringify(user));
  }, { token: fakeJwt(role), user: userFixture(role) });
}

async function mockSharedShell(page: Page, role: 'user' | 'admin' = 'user') {
  await page.route(`${API_BASE}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Current user', data: userFixture(role) }),
    });
  });
  await page.route('**/chat/events**', async (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Unread', data: { unread: 0 } }),
    });
  });
}

test('a Free Unlock listing is unlocked at \u20a60 through the unlock checkout', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');

  let unlocked = false;
  let legacyClaims = 0;
  let legacyPaidUnlocks = 0;
  let initiatePayload: Record<string, unknown> | null = null;

  await page.route(`${API_BASE}/properties*`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Properties retrieved',
        data: [propertyFixture()],
        meta: { total: 1, page: 1, limit: 12, pages: 1 },
      }),
    });
  });
  await page.route(`${API_BASE}/properties/${propertyId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Property retrieved',
        // Free Unlock is priced at the listing, so the public record already shows \u20a60.
        data: { ...publicPropertyFixture(), consultationFee: 0, isFreeUnlock: true },
      }),
    });
  });
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, async (route) => {
    if (!unlocked) {
      await route.fulfill({
        status: 403,
        contentType: 'application/json',
        body: JSON.stringify({ statusCode: 403, message: 'Unlock this property to view protected information' }),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Unlocked property retrieved', data: unlockedPackageFixture() }),
    });
  });
  // v1.6.2 \u00a712.7: a Free Unlock listing is priced at \u20a60 by the same quote; there is no separate claim step.
  await page.route(`${API_BASE}/unlocks/quote**`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Unlock quote retrieved',
        data: {
          listing: { targetType: 'property', targetId: propertyId, title: 'Test Property', category: 'residential', area: 'Rumuokoro', city: 'Obio-Akpor' },
          price: 0,
          priceFormatted: '\u20a60',
          standardPrice: 2500,
          isFreeUnlock: true,
          freeUnlockEndsAt: null,
          walletCreditAvailable: 0,
          walletCreditApplied: 0,
          remainingToPay: 0,
          noAdditionalPaymentNeeded: true,
          accessHours: 48,
          refundWindowHours: 48,
          availability: { overall: 'available', documentedUnits: 1, availableUnits: 1, disclosure: null },
          included: ['Exact verified address', 'Verified contact'],
          disclosures: { refund: 'Approved refunds are credited to your Veriq Wallet.', value: 'You are paying for verified intelligence.' },
          alreadyUnlocked: null,
          viewerIsManager: false,
          signInRequired: false,
        },
      }),
    });
  });
  await page.route(`${API_BASE}/unlocks`, async (route) => {
    initiatePayload = route.request().postDataJSON() as Record<string, unknown>;
    unlocked = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 201,
        message: 'Unlock confirmed',
        data: {
          state: 'unlocked',
          unlock: {
            id: 'unlock-free-1', targetType: 'property', targetId: propertyId, status: 'unlocked', isActive: true,
            feeAmount: 0, walletAmount: 0, externalAmount: 0, priceSource: 'free_unlock', paymentReference: 'VRQ-UNL-FREE',
            unlockedAt: new Date().toISOString(), accessExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
            refundDeadlineAt: null, refundWindowOpen: false, failureReason: null, checkoutUrl: null, createdAt: new Date().toISOString(),
          },
          checkout: null,
        },
      }),
    });
  });
  await page.route(`${API_BASE}/community/free-unlocks/${propertyId}/unlock`, async (route) => {
    legacyClaims += 1;
    await route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ statusCode: 410, message: 'Gone' }) });
  });
  await page.route(`${API_BASE}/consultations/initiate`, async (route) => {
    legacyPaidUnlocks += 1;
    await route.fulfill({
      status: 500,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 500, message: 'The retired consultation checkout must not be called' }),
    });
  });

  await page.goto('/properties');
  await expect(page.getByText('Free Unlock', { exact: true }).first()).toBeVisible();

  await page.goto(`/properties/${propertyId}`);
  await expect(page.getByText('Apartment 1')).toBeVisible();
  await expect(page.getByText('12 Test Road')).toHaveCount(0);
  await page.getByRole('button', { name: /Unlock Full Report Free/ }).click();
  await page.getByRole('dialog').getByRole('button', { name: /Unlock free/ }).click();
  await expect(page.getByText('12 Test Road').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp', exact: true })).toHaveAttribute('href', /wa\.me\/2348031234567/);
  await expect.poll(() => initiatePayload).not.toBeNull();
  expect(initiatePayload).toEqual(expect.objectContaining({ targetType: 'property', targetId: propertyId }));
  expect(legacyClaims).toBe(0);
  expect(legacyPaidUnlocks).toBe(0);
});

test('dashboard property view loads protected details only from the authorised unlocked package', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');
  await page.route(`${API_BASE}/properties/${propertyId}`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Property retrieved', data: publicPropertyFixture() }),
  }));
  await page.route(`${API_BASE}/properties/${propertyId}/unlocked`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Unlocked property retrieved', data: unlockedPackageFixture() }),
  }));
  await page.route(`${API_BASE}/community/free-unlocks/${propertyId}/status`, (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Free Unlock status retrieved', data: { available: false } }),
  }));

  await page.goto(`/dashboard/browse/${propertyId}`);

  await expect(page.getByText('Documented Units (1)')).toBeVisible();
  await expect(page.getByText('Mr Caretaker')).toBeVisible();
  await expect(page.getByRole('link', { name: 'WhatsApp Veriq Agent' })).toHaveAttribute('href', /wa\.me\/2348011111111/);
});

test('agent rating uses structured feedback and limits users to two selections', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');
  let ratingPayload: Record<string, unknown> | null = null;
  const consultation = {
    id: 'consultation-rating-1',
    userId: 'renter-user-1',
    propertyId,
    property: propertyFixture(),
    tier: 'tier_1',
    feeAmount: 2500,
    status: 'unlocked',
    paymentReference: 'FREE-rating',
    paymentProvider: 'free_unlock',
    paidAt: new Date().toISOString(),
    unlockedAt: new Date().toISOString(),
    accessExpiresAt: new Date(Date.now() + 86_400_000).toISOString(),
    notes: null,
    inspectionOccurred: null,
    listingAccuracyScore: null,
    userSatisfactionRating: null,
    userFeedbackComment: null,
    userFeedbackTags: null,
    ratedAt: null,
    agentId: 'agent-1',
  };
  await page.route(`${API_BASE}/consultations/my?*`, async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Consultations', data: [consultation], meta: { total: 1, page: 1, limit: 10, pages: 1 } }),
  }));
  await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({
    status: 200,
    contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Status', data: { joinedAt: new Date().toISOString() } }),
  }));
  await page.route(`${API_BASE}/agents/inspection-outcome`, async (route) => {
    ratingPayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ statusCode: 201, message: 'Agent feedback recorded', data: {} }) });
  });

  await page.goto('/dashboard');
  await page.getByRole('button', { name: 'Rate agent' }).click();
  await page.getByRole('button', { name: 'Clear and Helpful' }).click();
  await page.getByRole('button', { name: 'Helpful Photos' }).click();
  await expect(page.getByText('2/2 selected')).toBeVisible();
  await expect(page.getByRole('button', { name: 'More Details Needed' })).toBeDisabled();
  await page.getByRole('button', { name: 'Submit rating' }).click();

  await expect.poll(() => ratingPayload).not.toBeNull();
  expect((ratingPayload as { feedbackTags?: string[] } | null)?.feedbackTags).toEqual([
    'clear_and_helpful',
    'helpful_photos',
  ]);
  expect(ratingPayload).not.toHaveProperty('comment');
});

test('admin can moderate proposed streets and pending contributions', async ({ context, page }) => {
  await seedAuth(context, page, 'admin');
  await mockSharedShell(page, 'admin');

  const street = {
    id: 'street-1',
    state: 'Rivers',
    city: 'Port Harcourt',
    area: 'Choba',
    locationId: 'location-1',
    areaId: 'area-1',
    streetName: 'Pipeline Road',
    normalisedStreetName: 'pipeline road',
    landmark: 'Near campus',
    status: 'pending',
    isPopular: false,
    popularRank: 0,
    createdByUserId: 'renter-user-1',
    approvedByAdminId: null,
    approvedAt: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  const approvedStreet = {
    ...street,
    id: 'street-approved',
    streetName: 'Approved Avenue',
    normalisedStreetName: 'approved avenue',
    status: 'approved',
    approvedByAdminId: 'admin-user-1',
    approvedAt: new Date().toISOString(),
  };
  const olderPendingStreet = {
    ...street,
    id: 'street-older-pending',
    streetName: 'Old Market Road',
    normalisedStreetName: 'old market road',
    createdAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString(),
  };
  const contribution = {
    id: 'contribution-1',
    userId: 'renter-user-1',
    streetId: street.id,
    street,
    relationshipType: 'currently_live',
    relationshipRecency: 'current',
    status: 'pending',
    submittedAt: new Date().toISOString(),
    lastUpdatedAt: new Date().toISOString(),
    lastConfirmedAt: null,
    validUntil: new Date(Date.now() + 180 * 24 * 3600 * 1000).toISOString(),
    lastRewardedAt: null,
    nextRewardEligibleAt: null,
    answers: [{ id: 'answer-1', categoryId: 'cat-1', optionId: 'opt-1' }],
  };
  const moderationContributions = [
    contribution,
    ...Array.from({ length: 5 }, (_, index) => ({
      ...contribution,
      id: `contribution-${index + 2}`,
      streetId: `street-contribution-${index + 2}`,
      street: { ...street, id: `street-contribution-${index + 2}`, streetName: `Contribution Street ${index + 2}` },
    })),
  ];

  let streetReviewPayload: Record<string, unknown> | null = null;
  let contributionReviewPayload: Record<string, unknown> | null = null;
  let campaignPayload: Record<string, unknown> | null = null;
  let locationPayload: Record<string, unknown> | null = null;
  let observationPayload: Record<string, unknown> | null = null;

  await page.route(`${API_BASE}/community/admin/analytics`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Analytics', data: { totalProposedStreets: 1, activeCampaigns: 0 } }) });
  });
  await page.route(`${API_BASE}/community/categories`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200,
      message: 'Categories',
      data: [{
        id: 'cat-electricity',
        slug: 'electricity',
        name: 'Electricity',
        question: 'How reliable is electricity on this street?',
        section: 'Infrastructure',
        supplementaryConfig: null,
        description: null,
        sortOrder: 0,
        isActive: true,
        isPositiveScale: true,
        options: [{ id: 'opt-good', categoryId: 'cat-electricity', label: '16-20 hrs/day', numericRank: 4, sortOrder: 3, isActive: true }],
      }],
    }) });
  });
  await page.route(`${API_BASE}/locations/states`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'States', data: [
      { id: 'state-lagos', name: 'Lagos', isActive: false },
      { id: 'state-rivers', name: 'Rivers', isActive: true },
    ] }) });
  });
  await page.route(`${API_BASE}/properties/admin/all?*`, async (route) => {
    expect(new URL(route.request().url()).searchParams.get('agentId')).toBe('agent-1');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Properties', data: [propertyFixture()], meta: { total: 1, page: 1, limit: 100, pages: 1 } }) });
  });
  await page.route(`${API_BASE}/agents/admin/all?*`, async (route) => {
    const agent = propertyFixture().agent;
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Agents', data: [{ ...agent, businessName: 'Ada Homes', username: 'ada-agent' }], meta: { total: 1, page: 1, limit: 100, pages: 1 } }) });
  });
  await page.route(`${API_BASE}/community/admin/free-unlocks`, async (route) => {
    if (route.request().method() === 'POST') {
      campaignPayload = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ statusCode: 201, message: 'Campaign created', data: { id: 'campaign-1', ...campaignPayload } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Campaigns', data: [] }) });
  });
  await page.route(`${API_BASE}/community/admin/streets**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Streets', data: [street, approvedStreet, olderPendingStreet] }) });
  });
  await page.route(`${API_BASE}/community/admin/contributions**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contributions', data: moderationContributions }) });
  });
  await page.route(`${API_BASE}/community/admin/locations**`, async (route) => {
    if (route.request().method() === 'POST') {
      locationPayload = route.request().postDataJSON();
      await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ statusCode: 201, message: 'Location saved', data: { id: 'location-2', ...locationPayload } }) });
      return;
    }
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Hierarchy', data: [
      { id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null, areas: [{ id: 'area-1', locationId: 'location-1', name: 'Choba', normalisedName: 'choba', isActive: true, latitude: null, longitude: null }] },
      { id: 'location-lagos', state: 'Lagos', name: 'Ikeja', normalisedName: 'ikeja', isActive: true, latitude: null, longitude: null, areas: [] },
    ] }) });
  });
  await page.route(`${API_BASE}/community/admin/streets/${street.id}/review`, async (route) => {
    streetReviewPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Street reviewed', data: { ...street, ...streetReviewPayload } }) });
  });
  await page.route(`${API_BASE}/community/admin/streets/${approvedStreet.id}/observations`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Initial intelligence', data: [] }) });
  });
  await page.route(`${API_BASE}/community/admin/observations`, async (route) => {
    observationPayload = route.request().postDataJSON();
    await route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ statusCode: 201, message: 'Saved', data: { id: 'observation-1', ...observationPayload } }) });
  });
  await page.route(`${API_BASE}/community/admin/contributions/${contribution.id}/review`, async (route) => {
    contributionReviewPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contribution reviewed', data: { ...contribution, ...contributionReviewPayload } }) });
  });

  await page.goto('/dashboard/admin/community');
  const streetModeration = page.getByTestId('street-moderation');
  await expect(page.getByRole('heading', { name: 'Street Moderation' })).toBeVisible();
  await expect(streetModeration.getByText('2 pending', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Showing all pending requests and streets added in the past 48 hours', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Pipeline Road', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Old Market Road', { exact: true })).toBeVisible();
  await streetModeration.getByLabel('Moderation state').selectOption('Rivers');
  await expect(streetModeration.getByText('Select a location', { exact: true })).toBeVisible();
  await streetModeration.getByLabel('Moderation location').selectOption('location-1');
  await expect(streetModeration.getByText('Showing all streets in Port Harcourt', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Old Market Road', { exact: true })).toBeVisible();
  await streetModeration.getByLabel('Moderation state').selectOption('');
  await expect(streetModeration.getByText('Approved Avenue', { exact: true })).toBeHidden();
  await streetModeration.getByRole('button', { name: 'Approved 1' }).click();
  await expect(streetModeration.getByText('Approved Avenue', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Pipeline Road', { exact: true })).toBeHidden();
  await streetModeration.getByPlaceholder('Search street, area, location or landmark').fill('missing street');
  await expect(streetModeration.getByText('No matching streets', { exact: true })).toBeVisible();
  await streetModeration.getByPlaceholder('Search street, area, location or landmark').fill('');
  await streetModeration.getByRole('button', { name: 'Pending 2' }).click();
  const locationDirectory = page.getByTestId('location-directory');
  await expect(locationDirectory.getByLabel('Directory state').getByRole('option', { name: 'Lagos' })).toHaveCount(0);
  await locationDirectory.getByLabel('Directory state').selectOption('Rivers');
  await locationDirectory.getByLabel('Directory LGA').selectOption('location-1');
  await expect(locationDirectory.getByLabel('Directory area').getByRole('option', { name: 'Choba' })).toHaveCount(1);
  await page.getByTitle('Add LGA').click();
  await expect(page.getByRole('dialog', { name: 'Add local government' })).toBeVisible();
  await page.getByRole('dialog', { name: 'Add local government' }).getByLabel('Name').fill('Tai');
  await page.getByRole('dialog', { name: 'Add local government' }).getByRole('button', { name: 'Save' }).click();
  await expect.poll(() => locationPayload).not.toBeNull();
  expect(locationPayload).toEqual(expect.objectContaining({ state: 'Rivers', name: 'Tai' }));

  await page.getByLabel('Initial intelligence state').selectOption('Rivers');
  await page.getByLabel('Initial intelligence location').selectOption('location-1');
  await page.getByRole('combobox', { name: 'Initial intelligence street' }).fill('Approved');
  await page.getByRole('option', { name: /Approved Avenue/ }).click();
  await page.getByText('16-20 hrs/day', { exact: true }).click();
  await page.getByRole('button', { name: 'Save Intelligence' }).click();
  await expect.poll(() => observationPayload).not.toBeNull();
  expect(observationPayload).toEqual(expect.objectContaining({ streetId: approvedStreet.id, categoryId: 'cat-electricity', optionId: 'opt-good', sourceType: 'veriq_initial' }));

  // v1.6.2 §12.7 / §30.4: Free Unlock is Operator-first and lives under Pricing, no longer on this page.
  await expect(page.getByRole('heading', { name: 'Free Unlock has moved' })).toBeVisible();
  await expect(page.getByRole('link', { name: /Open Free Unlock Management/ })).toHaveAttribute('href', '/dashboard/admin/pricing?tab=free-unlock');
  await expect(page.getByRole('button', { name: 'Create Campaign' })).toHaveCount(0);
  expect(campaignPayload).toBeNull();

  await streetModeration.getByPlaceholder('Search street, area, location or landmark').fill('Pipeline');
  await streetModeration.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect.poll(() => streetReviewPayload).not.toBeNull();
  expect((streetReviewPayload as { status?: string } | null)?.status).toBe('approved');

  await page.getByRole('tab', { name: /Contributions 6/ }).click();
  const contributionModeration = page.getByTestId('contribution-moderation');
  await expect(contributionModeration.getByText('Contribution Street 6', { exact: true })).toHaveCount(0);
  await contributionModeration.getByRole('button', { name: 'Next moderation page' }).click();
  await expect(contributionModeration.getByText('Contribution Street 6', { exact: true })).toBeVisible();
  await contributionModeration.getByRole('button', { name: 'Previous moderation page' }).click();
  await contributionModeration.getByRole('button', { name: 'Flag' }).first().click();
  await expect.poll(() => contributionReviewPayload).not.toBeNull();
  expect((contributionReviewPayload as { status?: string } | null)?.status).toBe('flagged');
});

test('signed-out visitor can filter and search Street Intelligence before signup', async ({ page }) => {
  await page.route(`${API_BASE}/community/streets/locations**`, async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200, message: 'Locations', data: {
        states: ['Rivers'],
        cities: state === 'Rivers' ? ['Port Harcourt'] : [],
        areas: [],
        locations: state === 'Rivers' ? [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }] : [],
        areaRecords: [],
      },
    }) });
  });
  await page.route(`${API_BASE}/community/streets/search**`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200, message: 'Streets', data: [{
        id: 'street-public', streetName: 'School Road', state: 'Rivers', city: 'Port Harcourt', area: 'Rumuomasi', status: 'approved',
      }],
    }) });
  });
  await page.goto('/street-intelligence');
  await expect(page.getByRole('heading', { name: 'Know Before You Go' })).toBeVisible();
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('Location').selectOption('Port Harcourt');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page.getByText('School Road')).toBeVisible();
  await expect(page).toHaveURL(/\/street-intelligence$/);
});

test('member filters street intelligence by state, city and area before street name', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');
  await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ statusCode: 200, message: 'Status', data: { id: 'profile-1', userId: 'renter-user-1', joinedAt: new Date().toISOString(), contributorStatus: 'active' } }),
  }));
  await page.route(`${API_BASE}/community/streets/locations**`, async (route) => {
    const url = new URL(route.request().url());
    const state = url.searchParams.get('state');
    const city = url.searchParams.get('city');
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200, message: 'Locations', data: {
        states: ['Rivers'],
        cities: state === 'Rivers' ? ['Port Harcourt'] : state === 'Lagos' ? ['Lagos'] : [],
        areas: city === 'Port Harcourt' ? ['Choba'] : city === 'Lagos' ? ['Ikeja'] : [],
        locations: state === 'Rivers' ? [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }] : [],
        areaRecords: city === 'Port Harcourt' ? [{ id: 'area-1', locationId: 'location-1', name: 'Choba', normalisedName: 'choba', isActive: true, latitude: null, longitude: null }] : [],
      },
    }) });
  });
  let searchUrl = '';
  await page.route(`${API_BASE}/community/streets/search**`, async (route) => {
    searchUrl = route.request().url();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200, message: 'Streets', data: [{
        id: 'rivers-unity', streetName: 'Unity Road', normalisedStreetName: 'unity road', state: 'Rivers', city: 'Port Harcourt', area: 'Choba',
        landmark: null, status: 'approved', isPopular: true, popularRank: 1, createdByUserId: null, approvedByAdminId: 'admin-user-1', approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
      }],
    }) });
  });

  await page.goto('/street-intelligence');
  await expect(page.getByRole('button', { name: 'Search' })).toBeDisabled();
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('Location').selectOption('Port Harcourt');
  await page.getByLabel('Area').selectOption('Choba');
  await page.getByPlaceholder('Street name (optional)').fill('Unity');
  await page.getByRole('button', { name: 'Search' }).click();

  await expect(page.getByText('Unity Road')).toBeVisible();
  await expect(page.getByText('Choba, Port Harcourt, Rivers')).toBeVisible();
  expect(searchUrl).toContain('state=Rivers');
  expect(searchUrl).toContain('city=Port+Harcourt');
  expect(searchUrl).toContain('area=Choba');
  expect(searchUrl).toContain('locationId=location-1');
});

test('street report renders scale position and community source on mobile without search limits', async ({ page }) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.route(`${API_BASE}/community/streets/street-public`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
      statusCode: 200,
      message: 'Street Intelligence retrieved',
      data: {
        street: { id: 'street-public', streetName: 'School Road', area: 'Rumuomasi', city: 'Port Harcourt', state: 'Rivers', status: 'approved' },
        contributors: 4,
        lastUpdated: new Date().toISOString(),
        sourceNotice: 'Structured intelligence notice.',
        usage: { unlimited: true, requiresSignup: false },
        results: [{
          categoryId: 'cat-mobile',
          category: 'Mobile Network',
          slug: 'mobile_network',
          section: 'Infrastructure',
          result: 'Good',
          status: 'available',
          contributors: 4,
          level: 4,
          maxLevel: 5,
          isPositiveScale: true,
          sources: ['community_update'],
          lastUpdated: new Date().toISOString(),
          supplementaryResult: ['MTN', 'Airtel'],
        }],
      },
    }) });
  });

  await page.goto('/street-intelligence/street-public');

  await expect(page.getByRole('heading', { name: 'School Road' })).toBeVisible();
  await expect(page.getByRole('heading', { name: 'Mobile Network' })).toBeVisible();
  await expect(page.getByText('Works Well On:')).toBeVisible();
  await expect(page.getByText(/Source: Community Updates/)).toBeVisible();
  await expect(page.getByText(/Agent Reports/)).toHaveCount(0);
  await expect(page.getByText(/free street searches remaining/)).toHaveCount(0);
});

test('anonymous street reports remain accessible without an account continuation gate', async ({ page }) => {
  await page.route(`${API_BASE}/community/streets/street-six`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Street Intelligence retrieved', data: {
        street: { id: 'street-six', streetName: 'Unlimited Road', area: 'Rumuomasi', city: 'Port Harcourt', state: 'Rivers', status: 'approved' },
        contributors: 0,
        lastUpdated: null,
        sourceNotice: 'Street Intelligence is community-powered.',
        usage: { unlimited: true, requiresSignup: false },
        results: [],
      } }),
    });
  });

  await page.goto('/street-intelligence/street-six');

  await expect(page.getByRole('heading', { name: 'Unlimited Road' })).toBeVisible();
  await expect(page.getByText('Continue Exploring Street Intelligence')).toHaveCount(0);
});

test('Skip records a skipped response separately, advances, and contributor can save the update', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');
  const category = {
    id: 'cat-electricity', slug: 'electricity', name: 'Electricity', question: 'How reliable is electricity on this street?', section: 'Infrastructure', supplementaryConfig: null, description: null, sortOrder: 1, isActive: true, isPositiveScale: true,
    options: [
      { id: 'opt-poor', categoryId: 'cat-electricity', label: 'Poor', numericRank: 2, sortOrder: 1, isActive: true },
      { id: 'opt-good', categoryId: 'cat-electricity', label: 'Good', numericRank: 4, sortOrder: 2, isActive: true },
    ],
  };
  const floodCategory = {
    id: 'cat-flood', slug: 'flood_risk', name: 'Flood Risk', question: 'How often does this street flood?', section: 'Infrastructure', supplementaryConfig: null, description: null, sortOrder: 2, isActive: true, isPositiveScale: true,
    options: [
      { id: 'opt-often', categoryId: 'cat-flood', label: 'Often', numericRank: 2, sortOrder: 1, isActive: true },
      { id: 'opt-never', categoryId: 'cat-flood', label: 'Never', numericRank: 5, sortOrder: 2, isActive: true },
    ],
  };
  const street = { id: 'street-1', state: 'Rivers', city: 'Port Harcourt', area: 'Choba', streetName: 'Unity Road', normalisedStreetName: 'unity road', landmark: null, status: 'approved', isPopular: true, popularRank: 1, createdByUserId: null, approvedByAdminId: null, approvedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const contribution = { id: 'contribution-1', userId: 'renter-user-1', streetId: street.id, street, relationshipType: 'currently_live', relationshipRecency: 'current', status: 'approved', submittedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), lastConfirmedAt: null, validUntil: new Date(Date.now() + 86_400_000).toISOString(), lastRewardedAt: null, nextRewardEligibleAt: null, answers: [{ id: 'answer-1', categoryId: category.id, optionId: 'opt-poor', responseType: 'answered', supplementaryValue: null }, { id: 'answer-2', categoryId: floodCategory.id, optionId: 'opt-often', responseType: 'answered', supplementaryValue: null }] };
  await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Status', data: { id: 'profile-1', userId: 'renter-user-1', joinedAt: new Date().toISOString(), contributorStatus: 'active' } }) }));
  await page.route(`${API_BASE}/community/categories`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Categories', data: [category, floodCategory] }) }));
  await page.route(`${API_BASE}/community/streets/popular`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Streets', data: [street] }) }));
  await page.route(`${API_BASE}/community/me/contributions`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contributions', data: [contribution] }) }));
  await page.route(`${API_BASE}/community/referrals/code`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Referral', data: { referralCode: 'VRQ-TEST' } }) }));
  await page.route(`${API_BASE}/locations/states/active`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'States', data: [{ id: 'state-1', name: 'Rivers', isActive: true }] }) }));
  await page.route(`${API_BASE}/community/streets/locations**`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Locations', data: { states: ['Rivers'], cities: ['Port Harcourt'], areas: ['Choba'], locations: [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }], areaRecords: [{ id: 'area-1', locationId: 'location-1', name: 'Choba', normalisedName: 'choba', isActive: true, latitude: null, longitude: null }] } }) }));
  let updatePayload: Record<string, unknown> | null = null;
  await page.route(`${API_BASE}/community/contributions/${contribution.id}`, async (route) => {
    updatePayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Updated', data: contribution }) });
  });

  await page.goto('/dashboard/community');
  await page.getByRole('button', { name: 'Update' }).click();
  await expect(page.getByRole('heading', { name: 'Update Street Intelligence' })).toBeVisible();
  await expect(page.getByRole('button', { name: "I Don't Know" })).toBeVisible();
  await page.getByRole('button', { name: /Skip/ }).click();
  await expect(page.getByRole('heading', { name: 'How often does this street flood?' })).toBeVisible();
  await page.getByRole('button', { name: /Never/ }).click();
  await page.getByRole('button', { name: 'Save Intelligence Update' }).click();
  await expect.poll(() => updatePayload).not.toBeNull();
  expect(updatePayload).not.toHaveProperty('streetId');
  expect((updatePayload as { answers?: Array<{ optionId?: string; responseType: string }> } | null)?.answers?.[0]).toEqual(expect.objectContaining({ responseType: 'skipped' }));
  expect((updatePayload as { answers?: Array<{ optionId?: string; responseType: string }> } | null)?.answers?.[1]).toEqual(expect.objectContaining({ optionId: 'opt-never', responseType: 'answered' }));
});
