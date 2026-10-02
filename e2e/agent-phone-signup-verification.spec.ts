import { expect, test } from '@playwright/test';

const API = 'http://localhost:3007/api/v1';

/**
 * Public signup offers Renter and Operator and nothing else. Veriq Agents are internal and created by
 * an Admin (Master Blueprint §2 and §8), so there is no self-service Agent registration to test — this
 * spec guards that absence, and checks that an Operator signup is verified by phone.
 *
 * It replaces a spec that clicked an "Agent" tile the register screen never had.
 */
test('signup offers only Renter and Operator, and verifies an Operator by email', async ({ page }) => {
  let registration: Record<string, unknown> | null = null;
  await page.route(`${API}/locations/states/active`, (route) =>
    route.fulfill({ json: { data: [{ id: 'rivers', name: 'Rivers', isActive: true }] } }),
  );
  await page.route(`${API}/auth/register`, async (route) => {
    registration = route.request().postDataJSON();
    await route.fulfill({
      status: 201,
      json: {
        message: 'Registration successful. Check your email for the verification code.',
        data: { verificationChannel: 'email', emailSent: true },
      },
    });
  });

  await page.goto('/auth/register');

  const accountType = page.locator('#register-role');
  await expect(accountType.locator('option')).toHaveText(['Renter', 'Operator']);

  await accountType.selectOption('property_operator');
  await expect(page.getByRole('heading', { name: 'Create your Operator account', level: 1 })).toBeVisible();

  // Addressed by id: every label carries a required or optional marker, so its accessible name is
  // "First name *" rather than "First name".
  await page.locator('#register-first-name').fill('Ada');
  await page.locator('#register-last-name').fill('Operator');
  await page.locator('#register-email').fill('ada.operator@example.com');
  await page.locator('#register-phone').fill('08104730243');
  await page.locator('#register-state').selectOption('Rivers');
  await page.locator('#register-password').fill('SecurePass@123');

  // An Operator account needs at least one category and the Operator Terms (Master Blueprint §3).
  await page.getByRole('checkbox', { name: 'Residential Property' }).check();
  await page.getByRole('checkbox', { name: /Operator Terms/ }).check();
  await page.getByRole('checkbox', { name: /Terms of Service/ }).check();
  await page.getByRole('button', { name: 'Create Operator account' }).click();

  // Every account verifies by email at signup, Operators included (Master Blueprint §3); the phone is
  // verified later, before the Operator can post.
  await expect(page).toHaveURL(/\/auth\/verify-email\?/);
  await expect(page.getByRole('heading', { name: 'Verify your email', level: 1 })).toBeVisible();
  expect(registration).toEqual(
    expect.objectContaining({
      role: 'property_operator',
      phone: '08104730243',
      operatorCategories: ['residential'],
      acceptOperatorTerms: true,
    }),
  );
});
