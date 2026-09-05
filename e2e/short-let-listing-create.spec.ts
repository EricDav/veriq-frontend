import { expect, Page, test } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';
const UPLOAD_URL = 'https://upload.logistecx.online/upload';
const image = {
  name: 'listing-photo.png', mimeType: 'image/png',
  buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64'),
};

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'agent-user-1', role: 'agent', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${payload}.signature`;
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: 'agent', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('veriq_access_token', token);
    localStorage.setItem('veriq_refresh_token', 'refresh-token');
    localStorage.setItem('veriq_user', JSON.stringify({
      id: 'agent-user-1', firstName: 'Ada', lastName: 'Agent', email: 'agent@example.com',
      role: 'agent', isActive: true, isEmailVerified: true, isPhoneVerified: true,
    }));
  }, { token: fakeJwt() });
  await page.route(`${API_BASE}/auth/me`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { id: 'agent-user-1', firstName: 'Ada', lastName: 'Agent', email: 'agent@example.com', role: 'agent', isActive: true, isEmailVerified: true, isPhoneVerified: true } }),
  }));
  await page.route(`${API_BASE}/locations/states/active`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'state-1', name: 'Rivers', isActive: true }] }),
  }));
  await page.route(`${API_BASE}/short-let-operators/approved`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'operator-1', name: 'Reliable Stays', status: 'approved' }] }),
  }));
  await page.route(`${API_BASE}/community/streets/locations**`, (route) => {
    const city = new URL(route.request().url()).searchParams.get('city');
    return route.fulfill({
      status: 200, contentType: 'application/json',
      body: JSON.stringify({ data: city
        ? { locations: [{ id: 'location-1', name: 'Port Harcourt' }], areaRecords: [{ id: 'area-1', name: 'GRA' }] }
        : { locations: [{ id: 'location-1', name: 'Port Harcourt' }], areaRecords: [] } }),
    });
  });
  await page.route(`${API_BASE}/community/streets/search**`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: [{ id: 'street-1', streetName: 'Forces Avenue', area: 'GRA', city: 'Port Harcourt', state: 'Rivers', status: 'approved' }] }),
  }));
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(`${API_BASE}/notifications/unread-count`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ data: { unread: 0 } }),
  }));
});

function controlAfterLabel(page: Page, text: string, control: 'input' | 'select' | 'textarea' = 'select') {
  return page.getByText(text, { exact: true }).locator(`xpath=following-sibling::${control}[1]`);
}

async function prepareUploads(page: Page) {
  let uploaded = 0;
  await page.route(UPLOAD_URL, (route) => {
    uploaded += 1;
    return route.fulfill({
      status: 201, contentType: 'application/json',
      body: JSON.stringify({ data: { name: `listing-${uploaded}.webp`, url: `https://uploads.example.com/listing-${uploaded}.webp`, path: `https://uploads.example.com/listing-${uploaded}.webp`, size: 1200, mime: 'image/webp' } }),
    });
  });
}

async function selectDirectoryStreet(page: Page) {
  await page.locator('select[name="state"]').selectOption('Rivers');
  await page.locator('select[name="city"]').selectOption('Port Harcourt');
  await page.getByLabel('Street name').fill('Forces');
  await page.getByText(/Forces Avenue/).click();
}

async function uploadVisibleMedia(page: Page) {
  const inputs = page.locator('input[type="file"]');
  await inputs.first().setInputFiles(image);
  const count = await inputs.count();
  for (let index = 1; index < count; index += 1) {
    await inputs.nth(index).setInputFiles(index < 3 ? [image, { ...image, name: `listing-photo-${index}.png` }] : image);
  }
  await expect(page.getByText(/uploading/i)).toHaveCount(0);
}

test('Short Let keeps Basic Information and presents the approved nine-section flow', async ({ page }) => {
  await page.goto('/dashboard/properties/new');
  await page.locator('select[name="propertyType"]').selectOption('short_stay');

  await expect(page.getByRole('heading', { name: 'Basic Information' })).toBeVisible();
  await expect(page.locator('input[name="title"]')).toBeVisible();
  await expect(page.locator('input[name="bedrooms"]')).toBeVisible();
  await expect(page.locator('input[name="bathrooms"]')).toBeVisible();
  await expect(page.locator('select[name="shortLetOperatorId"]')).toContainText('Reliable Stays');

  const expectedOrder = [
    'Basic Information', 'Pricing & Stay Details', 'Amenities & Rules',
    'Short Let Intelligence', 'Additional Fees', 'Location Directory',
    'Property Media', 'Short Let Quick Intelligence', 'Booking Link',
  ];
  const headings = await page.locator('form h2').allTextContents();
  const positions = expectedOrder.map((heading) => headings.findIndex((value) => value.trim() === heading));
  expect(positions.every((position) => position >= 0)).toBe(true);
  expect(positions).toEqual([...positions].sort((a, b) => a - b));
  expect(headings).not.toContain('Short Stay Pricing & Fees');
});

test('Short Let pricing and fee controls reveal only their applicable fields', async ({ page }) => {
  await page.goto('/dashboard/properties/new');
  await page.locator('select[name="propertyType"]').selectOption('short_stay');

  await page.getByText('Pricing Model *', { exact: true }).locator('xpath=following-sibling::select[1]').selectOption('Daily');
  await expect(page.getByText('Daily Rate (N/night) *', { exact: true })).toBeVisible();
  await expect(page.getByText('Weekly Rate (N/week) *', { exact: true })).toHaveCount(0);

  const otherFee = page.getByText('Other Mandatory Fee', { exact: true }).locator('xpath=following-sibling::input[1]');
  await otherFee.fill('5000');
  await expect(page.getByPlaceholder('Describe what this mandatory fee covers')).toBeVisible();
  await otherFee.fill('0');
  await expect(page.getByPlaceholder('Describe what this mandatory fee covers')).toHaveCount(0);
});

test('agent can submit a complete Short Let listing from the frontend', async ({ page }) => {
  await prepareUploads(page);
  let payload: Record<string, any> | undefined;
  await page.route(`${API_BASE}/properties`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'Property listing created', data: { id: 'short-let-1', ...payload } }) });
  });

  await page.goto('/dashboard/properties/new');
  await page.locator('select[name="propertyType"]').selectOption('short_stay');
  await page.locator('input[name="title"]').fill('Complete Studio Short Let');
  await page.locator('input[name="bathrooms"]').fill('1');
  await page.locator('select[name="shortLetOperatorId"]').selectOption('operator-1');
  await controlAfterLabel(page, 'Short Let Type *').selectOption('Studio Apartment');
  await controlAfterLabel(page, 'Beds *', 'input').fill('1');
  await controlAfterLabel(page, 'Maximum Guests *', 'input').fill('2');
  await controlAfterLabel(page, 'Pricing Model *').selectOption('Daily');
  await controlAfterLabel(page, 'Daily Rate (N/night) *', 'input').fill('85000');
  await controlAfterLabel(page, 'Power Backup Reliability *').selectOption('Reliable');
  await controlAfterLabel(page, 'Water Reliability *').selectOption('Always Available');
  await controlAfterLabel(page, 'Cleanliness *').selectOption('Good');
  await controlAfterLabel(page, 'All Mandatory Fees Included? *').selectOption('Yes');
  await selectDirectoryStreet(page);
  await page.locator('select[name="floodRisk"]').selectOption('no_known_flooding');
  await page.locator('select[name="roadAccess"]').selectOption('good');
  await page.locator('select[name="networkQuality"]').selectOption('good');
  await page.locator('select[name="noiseLevel"]').selectOption('quiet');
  await page.locator('select[name="securityFeel"]').selectOption('good');
  await page.locator('select[name="propertyCondition"]').selectOption('good');
  await uploadVisibleMedia(page);
  expect(await page.locator('form :invalid').evaluateAll((elements) => elements.map((element) => ({ name: element.getAttribute('name'), value: (element as HTMLInputElement).value })))).toEqual([]);
  await page.getByRole('button', { name: /create listing/i }).click();

  await expect.poll(() => payload).toBeTruthy();
  expect(payload?.propertyType).toBe('short_stay');
  expect(payload?.bedrooms).toBe(0);
  expect(payload?.shortLetOperatorId).toBe('operator-1');
  expect(payload?.listingDetails).toMatchObject({ shortLetType: 'Studio Apartment', pricingModel: 'Daily', dailyRate: 85000 });
  expect(payload?.propertyMedia.length).toBeGreaterThanOrEqual(8);
});

test('agent can submit a complete residential listing without Short Let fields', async ({ page }) => {
  await prepareUploads(page);
  let payload: Record<string, any> | undefined;
  await page.route(`${API_BASE}/properties`, async (route) => {
    if (route.request().method() !== 'POST') return route.fallback();
    payload = route.request().postDataJSON();
    return route.fulfill({ status: 201, contentType: 'application/json', body: JSON.stringify({ message: 'Property listing created', data: { id: 'flat-1', ...payload } }) });
  });

  await page.goto('/dashboard/properties/new');
  await page.locator('input[name="title"]').fill('Complete Two Bedroom Flat');
  await page.locator('input[name="bedrooms"]').fill('2');
  await page.locator('input[name="bathrooms"]').fill('2');
  await page.locator('select[name="furnishingStatus"]').selectOption('unfurnished');
  await controlAfterLabel(page, 'Ensuite Arrangement *').selectOption('All Bedrooms En-suite');
  await controlAfterLabel(page, 'Electricity Metering *').selectOption('Prepaid Meter');
  await controlAfterLabel(page, 'Parking Availability *').selectOption('Available');
  await controlAfterLabel(page, 'Water Storage / Backup *').selectOption('Overhead Tank');
  await page.locator('input[name="rentAmount"]').fill('1500000');
  await selectDirectoryStreet(page);
  await page.locator('select[name="floodRisk"]').selectOption('no_known_flooding');
  await page.locator('select[name="electricitySituation"]').selectOption('good');
  await page.locator('select[name="waterAvailability"]').selectOption('constant');
  await page.locator('select[name="roadAccess"]').selectOption('good');
  await page.locator('select[name="networkQuality"]').selectOption('good');
  await page.locator('select[name="noiseLevel"]').selectOption('quiet');
  await page.locator('select[name="securityFeel"]').selectOption('good');
  await page.locator('select[name="propertyCondition"]').selectOption('good');
  await page.locator('select[name="compoundCulture"]').selectOption('quiet_compound');
  await uploadVisibleMedia(page);
  expect(await page.locator('form :invalid').evaluateAll((elements) => elements.map((element) => ({ name: element.getAttribute('name'), value: (element as HTMLInputElement).value })))).toEqual([]);
  await page.getByRole('button', { name: /create listing/i }).click();

  await expect.poll(() => payload).toBeTruthy();
  expect(payload?.propertyType).toBe('flat');
  expect(payload?.rentAmount).toBe(1500000);
  expect(payload?.shortLetOperatorId).toBeUndefined();
  expect(payload?.listingDetails).toMatchObject({ electricityMetering: 'Prepaid Meter', parkingAvailability: 'Available' });
  expect(payload?.propertyMedia.length).toBeGreaterThanOrEqual(8);
});
