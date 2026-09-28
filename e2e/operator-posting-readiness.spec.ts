import { expect, test } from '@playwright/test';
import { API_BASE, json, postingReadiness, signIn } from './helpers/session';

/**
 * Master Blueprint §3: signup needs only operator category, full name, email and the Operator Terms — phone is
 * optional there. Before posting, phone OTP, a valid government ID and a selfie holding that ID are all required.
 * The "add listing" entry points are blocked and explained rather than letting the submit fail at the server.
 */

test.beforeEach(async ({ page, context }) => {
  await signIn(page, context, 'property_operator');
  await page.route(`${API_BASE}/property-schemas`, (route) => route.fulfill(json({ categories: [] })));
  await page.route(`${API_BASE}/operator-accounts/me/identity-evidence`, (route) => route.fulfill(json([])));
});

test('the add-property wizard is blocked and names every missing requirement', async ({ page }) => {
  await page.route(`${API_BASE}/operator-accounts/me/posting-readiness`, (route) =>
    route.fulfill(json(postingReadiness({ phone_otp: false, selfie_with_id: false }))),
  );

  await page.goto('/dashboard/operator/properties/new');

  await expect(page.getByRole('heading', { name: 'Finish Operator verification before you post' })).toBeVisible();
  // Each unmet requirement is named with the API's own wording and links to where it is done.
  await expect(page.getByText('Verify your phone number with the code we send you')).toBeVisible();
  await expect(page.getByText('Upload a selfie of yourself holding that government ID')).toBeVisible();
  await expect(page.getByRole('link', { name: 'Verify my phone' })).toHaveAttribute('href', '/auth/verify-phone');
  await expect(page.getByRole('link', { name: 'Upload my selfie with ID' })).toHaveAttribute(
    'href',
    '/dashboard/operator/verification',
  );
  // A satisfied step is shown as done, not hidden.
  await expect(page.getByText('Valid government ID')).toBeVisible();

  // Verifying the account is about the person, never automatic ownership of a property.
  await expect(page.getByText(/does not confirm that you own a particular property/i)).toBeVisible();

  // The form itself is not reachable, so a submission cannot be attempted at all.
  await expect(page.getByRole('button', { name: /Save & submit for verification/ })).toHaveCount(0);
});

test('the sale submission form is blocked by the same gate', async ({ page }) => {
  await page.route(`${API_BASE}/operator-accounts/me/posting-readiness`, (route) =>
    route.fulfill(json(postingReadiness({ government_id: false }))),
  );

  await page.goto('/dashboard/operator/sales/new');
  await expect(
    page.getByRole('heading', { name: 'Finish Operator verification before you submit a property for sale' }),
  ).toBeVisible();
  await expect(page.getByText('Upload a valid government ID')).toBeVisible();
  await expect(page.getByRole('button', { name: /Save & submit to Veriq/ })).toHaveCount(0);
});

test('the checklist walks through the missing steps and uploads identity evidence', async ({ page }) => {
  let uploads = 0;
  let satisfied = false;
  await page.route(`${API_BASE}/operator-accounts/me/posting-readiness`, (route) =>
    route.fulfill(json(satisfied ? postingReadiness() : postingReadiness({ government_id: false }))),
  );
  await page.route(`${API_BASE}/operator-accounts/me/identity-evidence`, async (route) => {
    if (route.request().method() === 'POST') {
      uploads += 1;
      satisfied = true;
      await route.fulfill(
        json(
          {
            id: 'evidence-1',
            kind: 'identity',
            fileName: 'nin.pdf',
            createdAt: '2026-02-02T00:00:00.000Z',
            identityStatus: 'identity_pending',
            canPost: true,
            requirements: postingReadiness().requirements,
          },
          201,
          'Identity evidence saved privately for verification',
        ),
      );
      return;
    }
    await route.fulfill(json(satisfied ? [{ id: 'evidence-1', kind: 'identity', fileName: 'nin.pdf', notes: null, createdAt: '2026-02-02T00:00:00.000Z' }] : []));
  });

  await page.goto('/dashboard/operator/verification');

  await expect(page.getByRole('heading', { name: 'My Operator verification' })).toBeVisible();
  await expect(page.getByText('1 step left before you can post')).toBeVisible();
  await expect(page.getByText('Upload a valid government ID')).toBeVisible();

  // The government ID needs its type stated; the ID number is explicitly optional.
  await page.getByLabel('What are you uploading?').selectOption('government_id');
  await expect(page.getByLabel('Which government ID is it?')).toBeVisible();
  await expect(page.locator('label[for="evidence-id-number"]')).toContainText('Optional');

  await page.getByLabel('Which government ID is it?').selectOption('nin');
  await page.getByLabel(/^File \(PDF or photo/).setInputFiles({
    name: 'nin.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.from('%PDF-1.4 test'),
  });
  await page.getByRole('button', { name: 'Send to Veriq' }).click();

  await expect.poll(() => uploads).toBe(1);
  await expect(page.getByText('Verification complete')).toBeVisible();
  await expect(page.getByText('You can post', { exact: true })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Add a property', exact: true })).toHaveAttribute(
    'href',
    '/dashboard/operator/properties/new',
  );
  // Only metadata comes back: Veriq never shows the stored file again.
  await expect(page.getByText('nin.pdf')).toBeVisible();
});

test('the selfie step asks for a photo and explains what the photo must show', async ({ page }) => {
  await page.route(`${API_BASE}/operator-accounts/me/posting-readiness`, (route) =>
    route.fulfill(json(postingReadiness({ selfie_with_id: false }))),
  );

  await page.goto('/dashboard/operator/verification');
  await page.getByLabel('What are you uploading?').selectOption('selfie_with_id');
  await expect(page.getByText(/Hold the same government ID next to your face/)).toBeVisible();
  await expect(page.getByLabel(/^Photo \(JPG, PNG, WebP or HEIC/)).toBeVisible();
  // The ID-type question belongs to the document, not the selfie.
  await expect(page.getByLabel('Which government ID is it?')).toHaveCount(0);
});
