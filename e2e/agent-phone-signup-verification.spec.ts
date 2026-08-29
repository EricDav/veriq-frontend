import { expect, test } from '@playwright/test';

const API = 'http://localhost:3007/api/v1';

test('agent signup uses phone verification instead of email verification', async ({ page }) => {
  let registration: Record<string, unknown> | null = null;
  let verification: Record<string, unknown> | null = null;
  await page.route(`${API}/locations/states/active`, route => route.fulfill({ json: { data: [{ id: 'rivers', name: 'Rivers', isActive: true }] } }));
  await page.route(`${API}/auth/register`, async route => {
    registration = route.request().postDataJSON();
    await route.fulfill({ status: 201, json: { message: 'Registration successful. Check your phone for the verification code.', data: { verificationChannel: 'phone', phoneSent: true } } });
  });
  await page.route(`${API}/auth/agent-phone/verify`, async route => {
    verification = route.request().postDataJSON();
    await route.fulfill({ json: { message: 'Phone number verified successfully', data: { phone: '234810****243', verified: true } } });
  });

  await page.goto('/auth/register');
  await page.getByText('Agent', { exact: true }).click();
  await page.getByLabel('First Name').fill('Ada');
  await page.getByLabel('Last Name').fill('Agent');
  await page.getByLabel('Email Address').fill('ada.agent@example.com');
  await page.getByLabel(/Phone Number/).fill('08104730243');
  await page.getByLabel('State').selectOption('Rivers');
  await page.getByLabel('Password', { exact: true }).fill('SecurePass@123');
  await page.getByRole('checkbox', { name: /I agree to the Terms/ }).check();
  await page.getByRole('button', { name: 'Create Account' }).click();

  await expect(page).toHaveURL(/\/auth\/verify-phone\?/);
  await expect(page.getByRole('heading', { name: 'Verify your phone' })).toBeVisible();
  expect(registration).toEqual(expect.objectContaining({ role: 'agent', phone: '08104730243' }));

  for (const [index, digit] of [...'482193'].entries()) {
    await page.getByLabel(`Verification code digit ${index + 1}`).fill(digit);
  }
  await page.getByRole('button', { name: 'Verify phone' }).click();
  await expect(page.getByRole('heading', { name: 'Phone verified' })).toBeVisible();
  expect(verification).toEqual({ email: 'ada.agent@example.com', otp: '482193' });
  await expect(page.getByRole('button', { name: 'Continue to sign in' })).toBeVisible();
});
