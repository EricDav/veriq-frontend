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

test('renter sees Free Unlock and can claim it from property details', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');

  let unlocked = false;
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
      body: JSON.stringify({ statusCode: 200, message: 'Property retrieved', data: propertyFixture() }),
    });
  });
  await page.route(`${API_BASE}/properties/${propertyId}/media`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Media', data: [] }) });
  });
  await page.route(`${API_BASE}/community/free-unlocks/${propertyId}/status`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Free Unlock status retrieved',
        data: { available: true, eligibility: { eligible: true, reason: null } },
      }),
    });
  });
  await page.route(`${API_BASE}/community/free-unlocks/${propertyId}/unlock`, async (route) => {
    unlocked = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 201, message: 'Property unlocked successfully', data: { id: 'unlock-1' } }),
    });
  });
  await page.route(`${API_BASE}/consultations/check-access/${propertyId}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Access checked',
        data: { hasAccess: unlocked, unlockedAt: unlocked ? new Date().toISOString() : null, expiresAt: unlocked ? new Date(Date.now() + 48 * 3600 * 1000).toISOString() : null },
      }),
    });
  });

  await page.goto('/properties');
  await expect(page.getByText('Free Unlock', { exact: true })).toBeVisible();

  await page.goto(`/properties/${propertyId}`);
  await expect(page.getByText('Free Unlock Available')).toBeVisible();
  await page.getByRole('button', { name: 'Claim Free Unlock' }).click();
  await expect.poll(() => unlocked).toBe(true);
  await expect(page.getByText('Free Unlock claimed. Intelligence report unlocked!')).toBeVisible();
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

  let streetReviewPayload: Record<string, unknown> | null = null;
  let contributionReviewPayload: Record<string, unknown> | null = null;
  let campaignPayload: Record<string, unknown> | null = null;
  let locationPayload: Record<string, unknown> | null = null;

  await page.route(`${API_BASE}/community/admin/analytics`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Analytics', data: { totalProposedStreets: 1, activeCampaigns: 0 } }) });
  });
  await page.route(`${API_BASE}/locations/states`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'States', data: [
      { id: 'state-lagos', name: 'Lagos', isActive: false },
      { id: 'state-rivers', name: 'Rivers', isActive: true },
    ] }) });
  });
  await page.route(`${API_BASE}/properties/admin/all?*`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Properties', data: [propertyFixture()], meta: { total: 1, page: 1, limit: 100, pages: 1 } }) });
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
  await page.route(`${API_BASE}/community/admin/contributions`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contributions', data: [contribution] }) });
  });
  await page.route(`${API_BASE}/community/admin/locations`, async (route) => {
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
  await page.route(`${API_BASE}/community/admin/contributions/${contribution.id}/review`, async (route) => {
    contributionReviewPayload = route.request().postDataJSON();
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contribution reviewed', data: { ...contribution, ...contributionReviewPayload } }) });
  });

  await page.goto('/dashboard/admin/community');
  const streetModeration = page.getByTestId('street-moderation');
  await expect(page.getByRole('heading', { name: 'Street Moderation' })).toBeVisible();
  await expect(streetModeration.getByText('1 pending', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Showing streets added in the past 48 hours', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Pipeline Road', { exact: true })).toBeVisible();
  await expect(streetModeration.getByText('Old Market Road', { exact: true })).toBeHidden();
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
  await streetModeration.getByRole('button', { name: 'Pending 1' }).click();
  const locationDirectory = page.getByTestId('location-directory');
  const locationDirectoryList = page.getByTestId('location-directory-list');
  await locationDirectory.getByLabel('State', { exact: true }).selectOption('Lagos');
  await expect(locationDirectoryList.getByText('Ikeja', { exact: true })).toBeVisible();
  await expect(locationDirectoryList.getByText('Port Harcourt', { exact: true })).toBeHidden();
  await locationDirectory.getByLabel('State', { exact: true }).selectOption('Rivers');
  await page.getByPlaceholder('New Rivers location').fill('Tai');
  await page.getByTitle('Add location').click();
  await expect.poll(() => locationPayload).not.toBeNull();
  expect(locationPayload).toEqual(expect.objectContaining({ state: 'Rivers', name: 'Tai' }));

  await page.locator('#free-unlocks select').first().selectOption(propertyId);
  await page.locator('input[type="datetime-local"]').first().fill('2026-07-16T09:00');
  await page.locator('input[type="datetime-local"]').nth(1).fill('2026-07-20T09:00');
  await page.getByRole('button', { name: 'Create Campaign' }).click();
  await expect.poll(() => campaignPayload).not.toBeNull();
  expect((campaignPayload as { propertyId?: string } | null)?.propertyId).toBe(propertyId);

  await streetModeration.getByRole('button', { name: 'Approve', exact: true }).click();
  await expect.poll(() => streetReviewPayload).not.toBeNull();
  expect((streetReviewPayload as { status?: string } | null)?.status).toBe('approved');

  await page.getByRole('button', { name: 'Flag' }).click();
  await expect.poll(() => contributionReviewPayload).not.toBeNull();
  expect((contributionReviewPayload as { status?: string } | null)?.status).toBe('flagged');
});

test('signed-out visitor sees Community Intelligence filters and is asked to log in on search', async ({ page }) => {
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
  await page.goto('/street-intelligence');
  await expect(page.getByRole('heading', { name: 'Street Intelligence' })).toBeVisible();
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('Location').selectOption('Port Harcourt');
  await page.getByRole('button', { name: 'Search' }).click();
  await expect(page).toHaveURL(/\/auth\/login\?redirect=%2Fstreet-intelligence/);
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

test('contributor can load and save an update to previous street intelligence', async ({ context, page }) => {
  await seedAuth(context, page, 'user');
  await mockSharedShell(page, 'user');
  const category = {
    id: 'cat-electricity', slug: 'electricity', name: 'Electricity', description: null, sortOrder: 1, isActive: true, isPositiveScale: true,
    options: [
      { id: 'opt-poor', categoryId: 'cat-electricity', label: 'Poor', numericRank: 2, sortOrder: 1, isActive: true },
      { id: 'opt-good', categoryId: 'cat-electricity', label: 'Good', numericRank: 4, sortOrder: 2, isActive: true },
    ],
  };
  const street = { id: 'street-1', state: 'Rivers', city: 'Port Harcourt', area: 'Choba', streetName: 'Unity Road', normalisedStreetName: 'unity road', landmark: null, status: 'approved', isPopular: true, popularRank: 1, createdByUserId: null, approvedByAdminId: null, approvedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  const contribution = { id: 'contribution-1', userId: 'renter-user-1', streetId: street.id, street, relationshipType: 'currently_live', relationshipRecency: 'current', status: 'approved', submittedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), lastConfirmedAt: null, validUntil: new Date(Date.now() + 86_400_000).toISOString(), lastRewardedAt: null, nextRewardEligibleAt: null, answers: [{ id: 'answer-1', categoryId: category.id, optionId: 'opt-poor' }] };
  await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Status', data: { id: 'profile-1', userId: 'renter-user-1', joinedAt: new Date().toISOString(), contributorStatus: 'active' } }) }));
  await page.route(`${API_BASE}/community/categories`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Categories', data: [category] }) }));
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
  await page.getByRole('button', { name: 'Good' }).click();
  await page.getByRole('button', { name: 'Save Intelligence Update' }).click();
  await expect.poll(() => updatePayload).not.toBeNull();
  expect(updatePayload).not.toHaveProperty('streetId');
  expect((updatePayload as { answers?: Array<{ optionId: string }> } | null)?.answers?.[0].optionId).toBe('opt-good');
});
