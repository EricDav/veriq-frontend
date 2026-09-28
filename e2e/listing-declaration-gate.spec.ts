import { expect, test } from '@playwright/test';
import { API_BASE, EMPTY_MEDIA_VIEW, LISTING_DECLARATION, json, postingReadiness, signIn } from './helpers/session';

/**
 * Master Blueprint §3 step 1: every Operator submission renders the four declaration clauses verbatim and requires
 * an active acceptance. An unticked checkbox blocks the submit, and the accepted version travels with the body.
 * A re-submission after a correction re-accepts: an earlier acceptance never carries over.
 */

const saleId = 'owner-sale-1';

const ownerView = (publicationStatus: string, correctionNote: string | null = null) => ({
  sale: {
    id: saleId,
    title: 'Plot of land in Eliozu',
    subtype: 'land',
    publicationStatus,
    availabilityStatus: 'available',
    saleOutcome: null,
    askingPrice: 25_000_000,
    correctionNote,
    updatedAt: '2026-02-01T00:00:00.000Z',
    propertyId: 'property-1',
    facts: { land_area: '600 sqm' },
    intelligence: {},
    priceBasis: 'total',
    negotiable: null,
    ownerIdentityStatus: 'pending',
    authorityToSellStatus: 'pending',
    physicalVisitAt: null,
    submittedAt: publicationStatus === 'draft' ? null : '2026-02-01T00:00:00.000Z',
    publishedAt: null,
    salePriceAmount: null,
    commissionAmount: null,
  },
  property: { id: 'property-1', state: 'Rivers', city: 'Obio-Akpor', area: 'Eliozu' },
  documentChecklist: [{ key: 'survey_plan', label: 'Survey plan' }],
  documentStatuses: [],
  myDocuments: [],
  agreement: null,
  outstanding: [{ code: 'physical_visit_missing', message: 'Record your physical visit to the property' }],
});

test.beforeEach(async ({ page, context }) => {
  await signIn(page, context, 'property_operator');
  await page.route(`${API_BASE}/operator-accounts/listing-declaration`, (route) =>
    route.fulfill(json(LISTING_DECLARATION, 200, 'Operator listing declaration retrieved')),
  );
  await page.route(`${API_BASE}/operator-accounts/me/posting-readiness`, (route) =>
    route.fulfill(json(postingReadiness(), 200, 'Operator posting readiness retrieved')),
  );
  await page.route(`${API_BASE}/listing-media/**`, (route) => route.fulfill(json(EMPTY_MEDIA_VIEW)));
});

test('the four clauses are rendered verbatim and an unticked box blocks the submit', async ({ page }) => {
  let submits = 0;
  await page.route(`${API_BASE}/sale-listings/${saleId}/submission`, (route) => route.fulfill(json(ownerView('draft'))));
  await page.route(`${API_BASE}/sale-listings/${saleId}/submit`, async (route) => {
    submits += 1;
    await route.fulfill(json(ownerView('submitted'), 200, 'Submitted to Veriq'));
  });

  await page.goto(`/dashboard/operator/sales/${saleId}`);

  const declaration = page.locator('section', { hasText: 'Veriq listing declaration' }).first();
  await expect(declaration.getByText('Version v1.0')).toBeVisible();
  for (const clause of LISTING_DECLARATION.clauses) {
    await expect(declaration.getByText(clause.text, { exact: true })).toBeVisible();
  }

  const accept = page.getByLabel(/I have read and accept all 4 clauses/);
  await expect(accept).not.toBeChecked();

  const submit = page.getByRole('button', { name: 'Submit to Veriq' });
  await expect(submit).toBeDisabled();
  expect(submits).toBe(0);

  await accept.check();
  await expect(submit).toBeEnabled();
});

test('accepting sends the declaration version in the submit body', async ({ page }) => {
  let body: Record<string, unknown> | null = null;
  await page.route(`${API_BASE}/sale-listings/${saleId}/submission`, (route) => route.fulfill(json(ownerView('draft'))));
  await page.route(`${API_BASE}/sale-listings/${saleId}/submit`, async (route) => {
    body = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill(json(ownerView('submitted'), 200, 'Submitted to Veriq'));
  });

  await page.goto(`/dashboard/operator/sales/${saleId}`);
  await page.getByLabel(/I have read and accept all 4 clauses/).check();
  await page.getByRole('button', { name: 'Submit to Veriq' }).click();

  await expect.poll(() => body).not.toBeNull();
  expect(body).toEqual({ declaration: { version: 'v1.0', accepted: true } });
});

test('a re-submission after a correction has to accept the declaration again', async ({ page }) => {
  await page.route(`${API_BASE}/sale-listings/${saleId}/submission`, (route) =>
    route.fulfill(json(ownerView('needs_correction', 'Add the survey plan page showing the beacon numbers.'))),
  );
  await page.route(`${API_BASE}/sale-listings/${saleId}/submit`, (route) =>
    route.fulfill(json(ownerView('submitted'), 200, 'Submitted to Veriq')),
  );

  await page.goto(`/dashboard/operator/sales/${saleId}`);
  await expect(page.getByText('Add the survey plan page showing the beacon numbers.')).toBeVisible();

  // The tick starts clear even though the owner accepted it on the first submission.
  const accept = page.getByLabel(/I have read and accept all 4 clauses/);
  await expect(accept).not.toBeChecked();
  await expect(page.getByRole('button', { name: 'Re-submit to Veriq' })).toBeDisabled();
  await expect(page.getByText(/an earlier acceptance does not carry over/i)).toBeVisible();

  await accept.check();
  await expect(page.getByRole('button', { name: 'Re-submit to Veriq' })).toBeEnabled();
});
