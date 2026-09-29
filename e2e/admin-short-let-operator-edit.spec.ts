import { expect, test } from '@playwright/test';

const API_BASE = 'http://localhost:3007/api/v1';

function fakeJwt() {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub: 'admin-1', role: 'admin', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${payload}.signature`;
}

test.beforeEach(async ({ context, page }) => {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: 'admin', domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(({ token }) => {
    localStorage.setItem('veriq_access_token', token);
    localStorage.setItem('veriq_refresh_token', 'refresh-token');
    localStorage.setItem('veriq_user', JSON.stringify({
      id: 'admin-1', firstName: 'David', lastName: 'Admin', email: 'admin@veriq.ng',
      role: 'admin', isActive: true, isEmailVerified: true,
    }));
  }, { token: fakeJwt() });
  await page.route(`${API_BASE}/auth/me`, (route) => route.fulfill({
    status: 200, contentType: 'application/json',
    body: JSON.stringify({ data: { id: 'admin-1', firstName: 'David', lastName: 'Admin', email: 'admin@veriq.ng', role: 'admin', isActive: true } }),
  }));
  await page.route(`${API_BASE}/notifications/unread-count`, (route) => route.fulfill({
    status: 200, contentType: 'application/json', body: JSON.stringify({ data: { unread: 0 } }),
  }));
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
});

test('admin gets field guidance and edits an existing operator with PATCH', async ({ page }) => {
  const operator = {
    id: 'operator-1', name: 'Pearly Gates', contactPerson: 'Jerry', phone: '08168844527',
    email: 'admin@veriq.ng', websiteUrl: null, status: 'approved', portalStatus: 'not_created',
  };
  let updatePayload: Record<string, unknown> | undefined;

  await page.route(`${API_BASE}/short-let-operators/admin**`, async (route) => {
    const request = route.request();
    if (request.method() === 'PATCH' && request.url().endsWith('/operator-1')) {
      updatePayload = request.postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { ...operator, ...updatePayload } }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [operator] }) });
  });

  await page.goto('/dashboard/admin/short-let-operators');
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByRole('heading', { name: 'Edit operator' })).toBeVisible();

  const website = page.getByLabel('Website / booking URL (optional)');
  await website.fill('pearlymedia@gmail.com');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect(page.getByText(/complete HTTPS URL/)).toBeVisible();
  await expect(website).toBeFocused();
  await expect(website).toHaveAttribute('aria-invalid', 'true');
  await expect(website).toHaveClass(/border-destructive/);
  expect(updatePayload).toBeUndefined();

  await website.fill('https://pearlygates.example.com');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect.poll(() => updatePayload).toBeTruthy();
  expect(updatePayload).toMatchObject({
    name: 'Pearly Gates', phone: '08168844527', websiteUrl: 'https://pearlygates.example.com',
  });
});

test('admin can save an operator without a booking URL', async ({ page }) => {
  const operator = {
    id: 'operator-1', name: 'Pearly Gates', contactPerson: 'Jerry', phone: '08168844527',
    email: 'admin@veriq.ng', websiteUrl: null, status: 'approved', portalStatus: 'not_created',
  };
  let updatePayload: Record<string, unknown> | undefined;
  await page.route(`${API_BASE}/short-let-operators/admin**`, async (route) => {
    if (route.request().method() === 'PATCH') {
      updatePayload = route.request().postDataJSON();
      return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: operator }) });
    }
    return route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: [operator] }) });
  });

  await page.goto('/dashboard/admin/short-let-operators');
  await page.getByRole('button', { name: 'Edit' }).click();
  await expect(page.getByLabel('Website / booking URL (optional)')).toHaveValue('');
  await page.getByRole('button', { name: 'Save changes' }).click();
  await expect.poll(() => updatePayload).toBeTruthy();
  expect(updatePayload).not.toHaveProperty('websiteUrl');
});
