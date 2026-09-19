import { expect, test } from '@playwright/test';

/**
 * v1.6.2 §8.1/§8.5: Veriq Agents no longer create listings from a form. Property Operators submit properties and
 * Shared Property opportunities, and Agents verify and publish them; Property for Sale has its own Agent workspace.
 * The retired route must explain the new path instead of posting to the removed endpoint.
 */

const API_BASE = 'http://localhost:3007/api/v1';

function fakeJwt(role: string, sub: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url');
  return `${header}.${payload}.signature`;
}

async function signInAs(page: import('@playwright/test').Page, context: import('@playwright/test').BrowserContext, role: string) {
  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: role, domain: '127.0.0.1', path: '/' },
  ]);
  const user = {
    id: `${role}-user-1`,
    firstName: 'Ada',
    lastName: role === 'agent' ? 'Agent' : 'Operator',
    email: `${role}@example.com`,
    role,
    isActive: true,
    isEmailVerified: true,
  };
  await page.addInitScript(({ token, profile }) => {
    localStorage.setItem('veriq_access_token', token);
    localStorage.setItem('veriq_refresh_token', 'refresh-token');
    localStorage.setItem('veriq_user', JSON.stringify(profile));
  }, { token: fakeJwt(role, user.id), profile: user });
  await page.route(`${API_BASE}/auth/me`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: user }) }),
  );
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(`${API_BASE}/notifications/unread-count`, (route) =>
    route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ data: { unread: 0 } }) }),
  );
}

test('the retired Agent listing form points a Veriq Agent to verification and the sale workspace', async ({ page, context }) => {
  await signInAs(page, context, 'agent');
  let createCalls = 0;
  await page.route(`${API_BASE}/properties`, (route) => {
    createCalls += 1;
    return route.fulfill({ status: 410, contentType: 'application/json', body: JSON.stringify({ statusCode: 410, message: 'Gone' }) });
  });

  await page.goto('/dashboard/properties/new');
  const main = page.locator('main');
  await expect(main.getByRole('link', { name: /Verification queue/i })).toHaveAttribute('href', '/dashboard/agent/verification');
  await expect(main.getByRole('link', { name: /Create a Property for Sale listing/i })).toHaveAttribute('href', '/dashboard/agent/sales/new');
  await expect(page.locator('input[name="title"]')).toHaveCount(0);
  expect(createCalls).toBe(0);
});

test('a Property Operator is pointed to the submission wizard', async ({ page, context }) => {
  await signInAs(page, context, 'property_operator');
  await page.goto('/dashboard/properties/new');
  await expect(page.locator('main').getByRole('link', { name: /Add a Property/i })).toHaveAttribute('href', '/dashboard/operator/properties/new');
});
