# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: community-free-unlock-and-moderation.spec.ts >> member filters street intelligence by state, city and area before street name
- Location: e2e/community-free-unlock-and-moderation.spec.ts:413:5

# Error details

```
Error: expect(locator).toBeDisabled() failed

Locator: getByRole('button', { name: 'Search' })
Expected: disabled
Timeout: 10000ms
Error: element(s) not found

Call log:
  - Expect "toBeDisabled" with timeout 10000ms
  - waiting for getByRole('button', { name: 'Search' })

```

```yaml
- banner:
  - link "Veriq Logo Veriq Property":
    - /url: /
    - img "Veriq Logo"
    - text: Veriq Property
  - navigation:
    - link "Properties":
      - /url: /properties
    - link "Community Intelligence":
      - /url: /street-intelligence
    - link "Blog":
      - /url: /blog
    - button "Company":
      - text: Company
      - img
    - link "Contact":
      - /url: /contact
  - link "Dashboard":
    - /url: /dashboard
    - img
    - text: Dashboard
- main:
  - img
  - text: Street Intelligence
  - heading "Know the street before you choose the house." [level=1]
  - paragraph: Discover what everyday life is really like before you rent or buy. Get insight on roads, flooding, electricity, network, noise, security, neighbourhood feel and more.
  - text: Select State
  - combobox "State":
    - option "Choose state" [selected]
    - option "Rivers"
  - text: Select Location / LGA
  - combobox "LGA" [disabled]:
    - option "Choose LGA" [selected]
  - text: Search street, estate or road
  - textbox "Street name" [disabled]:
    - /placeholder: E.g. Woji Road, Rumuola
  - button "View intelligence" [disabled]
  - link "Can't find your location? Suggest it":
    - /url: /dashboard/community?mode=new&state=&city=
    - img
    - text: Can't find your location? Suggest it
  - link "Know this location well? Contribute Street Intelligence":
    - /url: /dashboard/community
    - img
    - text: Know this location well? Contribute Street Intelligence
  - region "How Street Intelligence Works":
    - heading "How Street Intelligence Works" [level=2]
    - text: "1"
    - img
    - heading "Search Location" [level=3]
    - paragraph: Find the street or neighbourhood you are interested in.
    - text: "2"
    - img
    - heading "View Intelligence" [level=3]
    - paragraph: See structured insight from people who know the area.
    - text: "3"
    - img
    - heading "Community Contributes" [level=3]
    - paragraph: Verified contributors share local, practical knowledge.
    - text: "4"
    - img
    - heading "Intelligence Gets Stronger" [level=3]
    - paragraph: More verified input improves confidence over time.
  - img
  - heading "Know your street well? Help improve local intelligence." [level=2]
  - paragraph: Verified people familiar with a location can contribute structured insights that help others make smarter property decisions.
  - link "Contribute Street Intelligence":
    - /url: /dashboard/community
  - region "Need intelligence on a specific property?":
    - text: Property Intelligence
    - heading "Need intelligence on a specific property?" [level=2]
    - paragraph: Our Property Intelligence reports reveal what photos cannot. Every report is prepared by verified agents who have inspected or verified the property.
    - link "Explore Property Intelligence":
      - /url: /properties
      - text: Explore Property Intelligence
      - img
    - img "Verified modern residential property available for inspection"
    - img
    - text: Verified by Veriq Agent
    - img
    - text: Photos
    - img
    - text: Interior
    - img
    - text: Bedrooms
    - img
    - text: Bathrooms
    - img
    - text: Access road
    - paragraph: Real property. Real inspections. Real insights.
    - paragraph: Photos, condition, amenities, access road and more from trusted, verified agents.
    - link "Browse Property Intelligence":
      - /url: /properties
      - img
- contentinfo:
  - link "Veriq Logo Veriq Property":
    - /url: /
    - img "Veriq Logo"
    - text: Veriq Property
  - paragraph: A trust-focused property intelligence platform helping people make smarter decisions before physical inspections.
  - paragraph: Follow us
  - link "YouTube":
    - /url: https://www.youtube.com/@veriqproperty
    - img
  - link "TikTok":
    - /url: https://www.tiktok.com/@veriqproperty
    - img
  - link "Facebook":
    - /url: https://www.facebook.com/@veriqproperty
    - img
  - link "Instagram":
    - /url: https://www.instagram.com/veriqproperty
    - img
  - button "Veriq Logo Install as App Add to home screen for the best experience":
    - img "Veriq Logo"
    - paragraph: Install as App
    - paragraph: Add to home screen for the best experience
    - img
  - heading "Platform" [level=3]
  - list:
    - listitem:
      - link "Browse Properties":
        - /url: /properties
    - listitem:
      - link "Community Intelligence":
        - /url: /street-intelligence
    - listitem:
      - link "How It Works":
        - /url: /#how-it-works
    - listitem:
      - link "Trust Scores":
        - /url: /#features
    - listitem:
      - link "For Agents":
        - /url: /auth/register?role=agent
  - heading "Company" [level=3]
  - list:
    - listitem:
      - link "About Us":
        - /url: /about
    - listitem:
      - link "Contact Us":
        - /url: /contact
    - listitem:
      - link "FAQ":
        - /url: /faq
    - listitem:
      - link "Blog":
        - /url: "#"
  - heading "Legal" [level=3]
  - list:
    - listitem:
      - link "Terms of Service":
        - /url: /terms
    - listitem:
      - link "Privacy Policy":
        - /url: /privacy
    - listitem:
      - link "Agent Terms":
        - /url: /terms#agent-terms
    - listitem:
      - link "Refund Policy":
        - /url: /terms#refunds
  - paragraph: © 2026 Veriq Property. All rights reserved.
  - paragraph: Know Before You Go.
- alert
```

# Test source

```ts
  346 |   await expect(locationDirectory.getByLabel('Directory state').getByRole('option', { name: 'Lagos' })).toHaveCount(0);
  347 |   await locationDirectory.getByLabel('Directory state').selectOption('Rivers');
  348 |   await locationDirectory.getByLabel('Directory LGA').selectOption('location-1');
  349 |   await expect(locationDirectory.getByLabel('Directory area').getByRole('option', { name: 'Choba' })).toHaveCount(1);
  350 |   await page.getByTitle('Add LGA').click();
  351 |   await expect(page.getByRole('dialog', { name: 'Add local government' })).toBeVisible();
  352 |   await page.getByRole('dialog', { name: 'Add local government' }).getByLabel('Name').fill('Tai');
  353 |   await page.getByRole('dialog', { name: 'Add local government' }).getByRole('button', { name: 'Save' }).click();
  354 |   await expect.poll(() => locationPayload).not.toBeNull();
  355 |   expect(locationPayload).toEqual(expect.objectContaining({ state: 'Rivers', name: 'Tai' }));
  356 | 
  357 |   await page.getByLabel('Initial intelligence state').selectOption('Rivers');
  358 |   await page.getByLabel('Initial intelligence location').selectOption('location-1');
  359 |   await page.getByRole('combobox', { name: 'Initial intelligence street' }).fill('Approved');
  360 |   await page.getByRole('option', { name: /Approved Avenue/ }).click();
  361 |   await page.getByText('16-20 hrs/day', { exact: true }).click();
  362 |   await page.getByRole('button', { name: 'Save Intelligence' }).click();
  363 |   await expect.poll(() => observationPayload).not.toBeNull();
  364 |   expect(observationPayload).toEqual(expect.objectContaining({ streetId: approvedStreet.id, categoryId: 'cat-electricity', optionId: 'opt-good', sourceType: 'veriq_initial' }));
  365 | 
  366 |   await page.locator('#free-unlocks select').first().selectOption(propertyId);
  367 |   await page.locator('input[type="datetime-local"]').first().fill('2026-07-16T09:00');
  368 |   await page.locator('input[type="datetime-local"]').nth(1).fill('2026-07-20T09:00');
  369 |   await page.getByRole('button', { name: 'Create Campaign' }).click();
  370 |   await expect.poll(() => campaignPayload).not.toBeNull();
  371 |   expect((campaignPayload as { propertyId?: string } | null)?.propertyId).toBe(propertyId);
  372 | 
  373 |   await streetModeration.getByPlaceholder('Search street, area, location or landmark').fill('Pipeline');
  374 |   await streetModeration.getByRole('button', { name: 'Approve', exact: true }).click();
  375 |   await expect.poll(() => streetReviewPayload).not.toBeNull();
  376 |   expect((streetReviewPayload as { status?: string } | null)?.status).toBe('approved');
  377 | 
  378 |   await page.getByRole('button', { name: 'Flag' }).click();
  379 |   await expect.poll(() => contributionReviewPayload).not.toBeNull();
  380 |   expect((contributionReviewPayload as { status?: string } | null)?.status).toBe('flagged');
  381 | });
  382 | 
  383 | test('signed-out visitor can filter and search Street Intelligence before signup', async ({ page }) => {
  384 |   await page.route(`${API_BASE}/community/streets/locations**`, async (route) => {
  385 |     const url = new URL(route.request().url());
  386 |     const state = url.searchParams.get('state');
  387 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  388 |       statusCode: 200, message: 'Locations', data: {
  389 |         states: ['Rivers'],
  390 |         cities: state === 'Rivers' ? ['Port Harcourt'] : [],
  391 |         areas: [],
  392 |         locations: state === 'Rivers' ? [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }] : [],
  393 |         areaRecords: [],
  394 |       },
  395 |     }) });
  396 |   });
  397 |   await page.route(`${API_BASE}/community/streets/search**`, async (route) => {
  398 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  399 |       statusCode: 200, message: 'Streets', data: [{
  400 |         id: 'street-public', streetName: 'School Road', state: 'Rivers', city: 'Port Harcourt', area: 'Rumuomasi', status: 'approved',
  401 |       }],
  402 |     }) });
  403 |   });
  404 |   await page.goto('/street-intelligence');
  405 |   await expect(page.getByRole('heading', { name: 'Know Before You Go' })).toBeVisible();
  406 |   await page.getByLabel('State').selectOption('Rivers');
  407 |   await page.getByLabel('Location').selectOption('Port Harcourt');
  408 |   await page.getByRole('button', { name: 'Search' }).click();
  409 |   await expect(page.getByText('School Road')).toBeVisible();
  410 |   await expect(page).toHaveURL(/\/street-intelligence$/);
  411 | });
  412 | 
  413 | test('member filters street intelligence by state, city and area before street name', async ({ context, page }) => {
  414 |   await seedAuth(context, page, 'user');
  415 |   await mockSharedShell(page, 'user');
  416 |   await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({
  417 |     status: 200, contentType: 'application/json',
  418 |     body: JSON.stringify({ statusCode: 200, message: 'Status', data: { id: 'profile-1', userId: 'renter-user-1', joinedAt: new Date().toISOString(), contributorStatus: 'active' } }),
  419 |   }));
  420 |   await page.route(`${API_BASE}/community/streets/locations**`, async (route) => {
  421 |     const url = new URL(route.request().url());
  422 |     const state = url.searchParams.get('state');
  423 |     const city = url.searchParams.get('city');
  424 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  425 |       statusCode: 200, message: 'Locations', data: {
  426 |         states: ['Rivers'],
  427 |         cities: state === 'Rivers' ? ['Port Harcourt'] : state === 'Lagos' ? ['Lagos'] : [],
  428 |         areas: city === 'Port Harcourt' ? ['Choba'] : city === 'Lagos' ? ['Ikeja'] : [],
  429 |         locations: state === 'Rivers' ? [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }] : [],
  430 |         areaRecords: city === 'Port Harcourt' ? [{ id: 'area-1', locationId: 'location-1', name: 'Choba', normalisedName: 'choba', isActive: true, latitude: null, longitude: null }] : [],
  431 |       },
  432 |     }) });
  433 |   });
  434 |   let searchUrl = '';
  435 |   await page.route(`${API_BASE}/community/streets/search**`, async (route) => {
  436 |     searchUrl = route.request().url();
  437 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  438 |       statusCode: 200, message: 'Streets', data: [{
  439 |         id: 'rivers-unity', streetName: 'Unity Road', normalisedStreetName: 'unity road', state: 'Rivers', city: 'Port Harcourt', area: 'Choba',
  440 |         landmark: null, status: 'approved', isPopular: true, popularRank: 1, createdByUserId: null, approvedByAdminId: 'admin-user-1', approvedAt: new Date().toISOString(), createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
  441 |       }],
  442 |     }) });
  443 |   });
  444 | 
  445 |   await page.goto('/street-intelligence');
> 446 |   await expect(page.getByRole('button', { name: 'Search' })).toBeDisabled();
      |                                                              ^ Error: expect(locator).toBeDisabled() failed
  447 |   await page.getByLabel('State').selectOption('Rivers');
  448 |   await page.getByLabel('Location').selectOption('Port Harcourt');
  449 |   await page.getByLabel('Area').selectOption('Choba');
  450 |   await page.getByPlaceholder('Street name (optional)').fill('Unity');
  451 |   await page.getByRole('button', { name: 'Search' }).click();
  452 | 
  453 |   await expect(page.getByText('Unity Road')).toBeVisible();
  454 |   await expect(page.getByText('Choba, Port Harcourt, Rivers')).toBeVisible();
  455 |   expect(searchUrl).toContain('state=Rivers');
  456 |   expect(searchUrl).toContain('city=Port+Harcourt');
  457 |   expect(searchUrl).toContain('area=Choba');
  458 |   expect(searchUrl).toContain('locationId=location-1');
  459 | });
  460 | 
  461 | test('street report renders scale position, source, updated time and free-search balance on mobile', async ({ page }) => {
  462 |   await page.setViewportSize({ width: 390, height: 844 });
  463 |   await page.route(`${API_BASE}/community/streets/street-public`, async (route) => {
  464 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({
  465 |       statusCode: 200,
  466 |       message: 'Street Intelligence retrieved',
  467 |       data: {
  468 |         street: { id: 'street-public', streetName: 'School Road', area: 'Rumuomasi', city: 'Port Harcourt', state: 'Rivers', status: 'approved' },
  469 |         contributors: 4,
  470 |         lastUpdated: new Date().toISOString(),
  471 |         sourceNotice: 'Structured intelligence notice.',
  472 |         usage: { limit: 5, used: 1, remaining: 4, requiresSignup: false },
  473 |         results: [{
  474 |           categoryId: 'cat-mobile',
  475 |           category: 'Mobile Network',
  476 |           slug: 'mobile_network',
  477 |           section: 'Infrastructure',
  478 |           result: 'Good',
  479 |           status: 'available',
  480 |           contributors: 4,
  481 |           level: 4,
  482 |           maxLevel: 5,
  483 |           isPositiveScale: true,
  484 |           sources: ['agent_report', 'community_update'],
  485 |           lastUpdated: new Date().toISOString(),
  486 |           supplementaryResult: ['MTN', 'Airtel'],
  487 |         }],
  488 |       },
  489 |     }) });
  490 |   });
  491 | 
  492 |   await page.goto('/street-intelligence/street-public');
  493 | 
  494 |   await expect(page.getByRole('heading', { name: 'School Road' })).toBeVisible();
  495 |   await expect(page.getByRole('heading', { name: 'Mobile Network' })).toBeVisible();
  496 |   await expect(page.getByText('Works Well On:')).toBeVisible();
  497 |   await expect(page.getByText(/Agent Reports \+ Community Updates/)).toBeVisible();
  498 |   await expect(page.getByText('4 of 5 free street searches remaining.')).toBeVisible();
  499 | });
  500 | 
  501 | test('sixth anonymous street report shows the account continuation gate', async ({ page }) => {
  502 |   await page.route(`${API_BASE}/community/streets/street-six`, async (route) => {
  503 |     await route.fulfill({
  504 |       status: 403,
  505 |       contentType: 'application/json',
  506 |       body: JSON.stringify({ statusCode: 403, message: 'street_search_limit_reached' }),
  507 |     });
  508 |   });
  509 | 
  510 |   await page.goto('/street-intelligence/street-six');
  511 | 
  512 |   await expect(page.getByRole('heading', { name: 'Continue Exploring Street Intelligence' })).toBeVisible();
  513 |   await expect(page.getByRole('link', { name: 'Create Free Account' })).toBeVisible();
  514 |   await expect(page.getByRole('link', { name: 'Sign In' })).toBeVisible();
  515 | });
  516 | 
  517 | test('Skip records a skipped response separately, advances, and contributor can save the update', async ({ context, page }) => {
  518 |   await seedAuth(context, page, 'user');
  519 |   await mockSharedShell(page, 'user');
  520 |   const category = {
  521 |     id: 'cat-electricity', slug: 'electricity', name: 'Electricity', question: 'How reliable is electricity on this street?', section: 'Infrastructure', supplementaryConfig: null, description: null, sortOrder: 1, isActive: true, isPositiveScale: true,
  522 |     options: [
  523 |       { id: 'opt-poor', categoryId: 'cat-electricity', label: 'Poor', numericRank: 2, sortOrder: 1, isActive: true },
  524 |       { id: 'opt-good', categoryId: 'cat-electricity', label: 'Good', numericRank: 4, sortOrder: 2, isActive: true },
  525 |     ],
  526 |   };
  527 |   const floodCategory = {
  528 |     id: 'cat-flood', slug: 'flood_risk', name: 'Flood Risk', question: 'How often does this street flood?', section: 'Infrastructure', supplementaryConfig: null, description: null, sortOrder: 2, isActive: true, isPositiveScale: true,
  529 |     options: [
  530 |       { id: 'opt-often', categoryId: 'cat-flood', label: 'Often', numericRank: 2, sortOrder: 1, isActive: true },
  531 |       { id: 'opt-never', categoryId: 'cat-flood', label: 'Never', numericRank: 5, sortOrder: 2, isActive: true },
  532 |     ],
  533 |   };
  534 |   const street = { id: 'street-1', state: 'Rivers', city: 'Port Harcourt', area: 'Choba', streetName: 'Unity Road', normalisedStreetName: 'unity road', landmark: null, status: 'approved', isPopular: true, popularRank: 1, createdByUserId: null, approvedByAdminId: null, approvedAt: null, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString() };
  535 |   const contribution = { id: 'contribution-1', userId: 'renter-user-1', streetId: street.id, street, relationshipType: 'currently_live', relationshipRecency: 'current', status: 'approved', submittedAt: new Date().toISOString(), lastUpdatedAt: new Date().toISOString(), lastConfirmedAt: null, validUntil: new Date(Date.now() + 86_400_000).toISOString(), lastRewardedAt: null, nextRewardEligibleAt: null, answers: [{ id: 'answer-1', categoryId: category.id, optionId: 'opt-poor', responseType: 'answered', supplementaryValue: null }, { id: 'answer-2', categoryId: floodCategory.id, optionId: 'opt-often', responseType: 'answered', supplementaryValue: null }] };
  536 |   await page.route(`${API_BASE}/community/me/status`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Status', data: { id: 'profile-1', userId: 'renter-user-1', joinedAt: new Date().toISOString(), contributorStatus: 'active' } }) }));
  537 |   await page.route(`${API_BASE}/community/categories`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Categories', data: [category, floodCategory] }) }));
  538 |   await page.route(`${API_BASE}/community/streets/popular`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Streets', data: [street] }) }));
  539 |   await page.route(`${API_BASE}/community/me/contributions`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Contributions', data: [contribution] }) }));
  540 |   await page.route(`${API_BASE}/community/referrals/code`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Referral', data: { referralCode: 'VRQ-TEST' } }) }));
  541 |   await page.route(`${API_BASE}/locations/states/active`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'States', data: [{ id: 'state-1', name: 'Rivers', isActive: true }] }) }));
  542 |   await page.route(`${API_BASE}/community/streets/locations**`, async (route) => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Locations', data: { states: ['Rivers'], cities: ['Port Harcourt'], areas: ['Choba'], locations: [{ id: 'location-1', state: 'Rivers', name: 'Port Harcourt', normalisedName: 'port harcourt', isActive: true, latitude: null, longitude: null }], areaRecords: [{ id: 'area-1', locationId: 'location-1', name: 'Choba', normalisedName: 'choba', isActive: true, latitude: null, longitude: null }] } }) }));
  543 |   let updatePayload: Record<string, unknown> | null = null;
  544 |   await page.route(`${API_BASE}/community/contributions/${contribution.id}`, async (route) => {
  545 |     updatePayload = route.request().postDataJSON();
  546 |     await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ statusCode: 200, message: 'Updated', data: contribution }) });
```