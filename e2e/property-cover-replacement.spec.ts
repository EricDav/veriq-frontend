import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';
const propertyId = 'property-cover-regression';
const replacementCoverUrl = 'https://upload.logistecx.online/file/replacement-cover.webp';

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({
      sub: 'agent-user-1',
      email: 'agent@example.com',
      role: 'agent',
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 60 * 60,
    }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

function mediaFixture() {
  const sections = [
    'road_access',
    'environment',
    'living_room',
    'kitchen',
    'bedroom',
    'bathroom',
    'compound',
  ];

  return sections.flatMap((section) =>
    [1, 2].map((index) => ({
      id: `${section}-${index}`,
      propertyId,
      mediaType: 'photo',
      section,
      originalName: `${section}-${index}.jpg`,
      filename: `${section}-${index}.jpg`,
      url: `https://upload.logistecx.online/file/${section}-${index}.jpg`,
      mimeType: 'image/jpeg',
      sizeBytes: 1200,
      caption: null,
      sortOrder: index,
      uploadedByUserId: 'agent-user-1',
      createdAt: new Date().toISOString(),
    })),
  );
}

test('agent can replace a property cover image and save the new cover URL', async ({ context, page }) => {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: 'agent', domain: '127.0.0.1', path: '/' },
  ]);

  await page.addInitScript(({ token }) => {
    const user = {
      id: 'agent-user-1',
      firstName: 'Ada',
      lastName: 'Agent',
      email: 'agent@example.com',
      phone: '08000000000',
      role: 'agent',
      isActive: true,
      isEmailVerified: true,
      isPhoneVerified: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    window.localStorage.setItem('veriq_access_token', token);
    window.localStorage.setItem('veriq_refresh_token', 'refresh-token');
    window.localStorage.setItem('veriq_user', JSON.stringify(user));
  }, { token: fakeJwt() });

  let patchPayload: Record<string, unknown> | null = null;
  let uploadWasCalled = false;

  await page.route(`${API_BASE}/auth/me`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Current user',
        data: {
          id: 'agent-user-1',
          firstName: 'Ada',
          lastName: 'Agent',
          email: 'agent@example.com',
          phone: '08000000000',
          role: 'agent',
          isActive: true,
          isEmailVerified: true,
          isPhoneVerified: true,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route(`${API_BASE}/locations/active`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'States', data: [{ id: 'state-1', name: 'Rivers', isActive: true }] }),
    });
  });

  await page.route(`${API_BASE}/properties/${propertyId}`, async (route) => {
    if (route.request().method() === 'PATCH') {
      patchPayload = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          statusCode: 200,
          message: 'Property updated',
          data: { id: propertyId, ...patchPayload },
        }),
      });
      return;
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 200,
        message: 'Property retrieved',
        data: {
          id: propertyId,
          title: 'Existing Choba Flat',
          description: 'A clean property',
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
          coverImageUrl: 'https://upload.logistecx.online/file/original-cover.jpg',
          hostelSuitableFor: [],
          shortStayAmenities: [],
          electricityInfo: [],
          bestNetwork: [],
          securityFeatures: [],
          knownIssues: [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      }),
    });
  });

  await page.route(`${API_BASE}/properties/${propertyId}/media`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Media retrieved', data: mediaFixture() }),
    });
  });

  await page.route(`${API_BASE}/uploads/file`, async (route) => {
    expect(route.request().method()).toBe('POST');
    expect(route.request().headers().authorization).toContain('Bearer ');
    uploadWasCalled = true;
    await route.fulfill({
      status: 201,
      contentType: 'application/json',
      body: JSON.stringify({
        statusCode: 201,
        message: 'File uploaded successfully.',
        data: {
          name: 'replacement-cover.webp',
          path: replacementCoverUrl,
          url: replacementCoverUrl,
          size: 2048,
          mime: 'image/webp',
        },
      }),
    });
  });

  await page.route('**/chat/events**', async (route) => {
    await route.fulfill({ status: 204, body: '' });
  });
  await page.route(`${API_BASE}/notifications/unread-count`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ statusCode: 200, message: 'Unread', data: { unread: 0 } }),
    });
  });

  await page.goto(`/dashboard/properties/${propertyId}/edit`);

  await expect(page.getByRole('heading', { name: 'Edit Listing' })).toBeVisible();

  const coverInput = page.locator('label:has-text("Replace cover") input[type="file"]');
  await coverInput.setInputFiles({
    name: 'replacement-cover.webp',
    mimeType: 'image/webp',
    buffer: Buffer.from('fake-image-bytes'),
  });

  await expect.poll(() => uploadWasCalled).toBe(true);
  await expect(page.getByRole('link', { name: 'View current cover' })).toHaveAttribute('href', replacementCoverUrl);

  patchPayload = null;
  await page.getByRole('button', { name: /save changes/i }).click();

  await expect.poll(() => patchPayload).not.toBeNull();
  expect(patchPayload?.coverImageUrl).toBe(replacementCoverUrl);
});
