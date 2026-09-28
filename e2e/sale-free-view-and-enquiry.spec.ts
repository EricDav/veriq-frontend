import { expect, test } from '@playwright/test';
import { API_BASE, json, paginated } from './helpers/session';

/**
 * Master Blueprint §6: Property for Sale is a controlled representation service, separate from the unlock fee. The
 * buyer view is free — no unlock, no paywall — and Veriq is the buyer contact, so the enquiry is the only route to
 * the property and the owner's own contact is never displayed. Enquiring does not require an account.
 */

const saleId = 'sale-listing-1';

const saleCard = {
  id: saleId,
  targetType: 'sale_listing',
  category: 'for_sale',
  title: '4-bedroom detached house in Woji',
  subtype: 'built_property',
  subtypeLabel: 'Built Property',
  state: 'Rivers',
  city: 'Port Harcourt',
  area: 'Woji',
  askingPrice: 145_000_000,
  priceBasis: 'total',
  negotiable: true,
  coverImageUrl: null,
  basics: { bedrooms: 4 },
  documentStatuses: [
    {
      documentType: 'certificate_of_occupancy',
      label: 'Certificate of Occupancy',
      availability: 'sighted',
      availabilityLabel: 'Sighted by Veriq Agent',
      legalSearchStatus: 'not_performed',
      legalSearchLabel: 'No independent legal search performed',
      checkedAt: '2026-02-01T00:00:00.000Z',
    },
  ],
  availabilityStatus: 'available',
  // There is no unlock and no fee for a sale listing (§6).
  requiresUnlock: false,
  contactRoute: 'veriq',
};

const saleDetail = {
  ...saleCard,
  facts: { bedrooms: 4, bathrooms: 5, land_area: '700 sqm' },
  intelligence: { flood_risk: 'low', road_access: 'good' },
  location: { state: 'Rivers', city: 'Port Harcourt', area: 'Woji' },
  documentDisclaimer:
    'Document review is not a legal title guarantee. Sale documents and transfer require appropriate legal and professional advice.',
  media: [],
  buyerContact: {
    route: 'veriq',
    agentId: 'agent-1',
    agentName: 'Ada Agent',
    note: 'Veriq is your contact for this property. The assigned Veriq Agent will get in touch about viewing and price.',
  },
  verifiedAt: '2026-02-01T00:00:00.000Z',
  streetIntelligence: null,
};

test.beforeEach(async ({ page }) => {
  await page.route(`${API_BASE}/sale-listings?**`, (route) => route.fulfill(paginated([saleCard], 'Sale Listings retrieved')));
  await page.route(`${API_BASE}/sale-listings/${saleId}`, (route) => route.fulfill(json(saleDetail, 200, 'Sale Listing retrieved')));
  await page.route(`${API_BASE}/property-schemas/**`, (route) => route.fulfill(json(null, 404, 'Not found')));
  await page.route(`${API_BASE}/street-links/**`, (route) => route.fulfill(json(null)));
});

test('a signed-out buyer sees the whole sale listing for free, with no unlock anywhere', async ({ page }) => {
  await page.goto(`/for-sale/${saleId}`);

  const main = page.locator('main');
  await expect(main.getByRole('heading', { name: saleCard.title })).toBeVisible();
  await expect(main.getByText('Free to view — no unlock fee')).toBeVisible();
  await expect(main.getByText('₦145,000,000')).toBeVisible();

  // The full listing is visible without paying: facts, intelligence and document statuses.
  await expect(main.getByRole('heading', { name: 'Property facts and intelligence' })).toBeVisible();
  await expect(main.getByRole('heading', { name: 'Document status' })).toBeVisible();
  await expect(main.getByText('Sighted by Veriq Agent')).toBeVisible();

  // No unlock or paywall UI survives on a sale listing: no action to buy access, and no fee quoted for it.
  await expect(page.getByRole('button', { name: /^Unlock/i })).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Review unlock/i })).toHaveCount(0);
  await expect(main.getByText(/What this unlock includes/i)).toHaveCount(0);
  await expect(main.getByText(/Unlock fee$/)).toHaveCount(0);

  // Veriq is the buyer contact; the owner's own number is never shown.
  await expect(main.getByText('Veriq is your contact for this property', { exact: true })).toBeVisible();
  // Nothing on the page is a phone number or WhatsApp link: the enquiry form is the only contact route.
  await expect(main.locator('a[href^="tel:"]')).toHaveCount(0);
  await expect(main.locator('a[href*="wa.me"]')).toHaveCount(0);
});

test('the enquiry reaches Veriq without an account and confirms an Agent will be in touch', async ({ page }) => {
  let enquiry: Record<string, unknown> | null = null;
  await page.route(`${API_BASE}/sale-enquiries`, async (route) => {
    enquiry = route.request().postDataJSON() as Record<string, unknown>;
    await route.fulfill(
      json(
        { id: 'enquiry-1', saleListingId: saleId, status: 'new', createdAt: '2026-02-02T00:00:00.000Z' },
        201,
        'Enquiry sent to Veriq. The assigned Veriq Agent will contact you about this property.',
      ),
    );
  });

  await page.goto(`/for-sale/${saleId}`);

  await page.getByLabel('Your name').fill('Chinedu Buyer');
  await page.getByLabel('Phone number').fill('08031234567');
  await page.getByLabel('What would you like to know?').fill('I would like to arrange a viewing this weekend.');
  await page.getByRole('button', { name: 'Send enquiry' }).click();

  await expect.poll(() => enquiry).not.toBeNull();
  expect(enquiry).toEqual(
    expect.objectContaining({
      saleListingId: saleId,
      name: 'Chinedu Buyer',
      phone: '08031234567',
      message: 'I would like to arrange a viewing this weekend.',
    }),
  );
  await expect(page.getByText('Enquiry sent to Veriq')).toBeVisible();
  await expect(page.getByText(/A Veriq Agent will contact you/)).toBeVisible();
});

test('the sale listing card advertises a free view rather than a price to unlock', async ({ page }) => {
  await page.goto('/for-sale');
  const card = page.getByRole('link', { name: new RegExp(saleCard.title) });
  await expect(card).toBeVisible();
  await expect(card.getByText('Free to view')).toBeVisible();
  await expect(page.getByText(/Unlock ₦/)).toHaveCount(0);
  await expect(page.getByText('Free to view, no unlock fee')).toBeVisible();
});
