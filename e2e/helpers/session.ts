import type { BrowserContext, Page } from '@playwright/test';

/** Playwright specs run the app against a mocked API on this base URL. */
export const API_BASE = 'http://localhost:3007/api/v1';

/** The standard `{ success, statusCode, message, data }` envelope every Veriq endpoint returns. */
export const json = (data: unknown, status = 200, message = 'OK') => ({
  status,
  contentType: 'application/json',
  body: JSON.stringify({ success: status < 400, statusCode: status, message, data }),
});

export const paginated = (data: unknown[], message = 'OK') => ({
  status: 200,
  contentType: 'application/json',
  body: JSON.stringify({
    success: true,
    statusCode: 200,
    message,
    data,
    meta: { total: data.length, page: 1, limit: 20, pages: 1 },
  }),
});

function fakeJwt(role: string, sub: string) {
  const header = Buffer.from(JSON.stringify({ alg: 'none', typ: 'JWT' })).toString('base64url');
  const payload = Buffer.from(
    JSON.stringify({ sub, role, exp: Math.floor(Date.now() / 1000) + 3600 }),
  ).toString('base64url');
  return `${header}.${payload}.signature`;
}

export interface SessionUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified?: boolean;
  phone?: string;
}

/** Signs a role in and stubs the shell's own polling so a spec only mocks what it is about. */
export async function signIn(
  page: Page,
  context: BrowserContext,
  role: string,
  overrides: Partial<SessionUser> = {},
): Promise<SessionUser> {
  const user: SessionUser = {
    id: `${role}-user-1`,
    firstName: 'Ada',
    lastName: role === 'agent' ? 'Agent' : role === 'property_operator' ? 'Operator' : 'Renter',
    email: `${role}@example.com`,
    role,
    isActive: true,
    isEmailVerified: true,
    ...overrides,
  };

  await context.addCookies([
    { name: 'veriq_authed', value: '1', domain: '127.0.0.1', path: '/' },
    { name: 'veriq_role', value: role, domain: '127.0.0.1', path: '/' },
  ]);
  await page.addInitScript(
    ({ token, profile }) => {
      localStorage.setItem('veriq_access_token', token);
      localStorage.setItem('veriq_refresh_token', 'refresh-token');
      localStorage.setItem('veriq_user', JSON.stringify(profile));
    },
    { token: fakeJwt(role, user.id), profile: user },
  );

  await page.route(`${API_BASE}/auth/me`, (route) => route.fulfill(json(user)));
  await page.route('**/chat/events**', (route) => route.fulfill({ status: 204, body: '' }));
  await page.route(`${API_BASE}/notifications/unread-count`, (route) => route.fulfill(json({ unread: 0 })));
  await page.route(`${API_BASE}/notifications?**`, (route) => route.fulfill(paginated([])));
  await page.route(`${API_BASE}/street-links/**`, (route) => route.fulfill(json(null)));
  await page.route(`${API_BASE}/community/free-unlocks/*/status`, (route) => route.fulfill(json({ available: false })));
  return user;
}

/** The versioned four-clause Operator listing declaration, exactly as the API serves it. */
export const LISTING_DECLARATION = {
  id: 'operator_listing_declaration',
  version: 'v1.0',
  effectiveFrom: '2026-01-01',
  clauses: [
    {
      id: 'ownership_and_accuracy',
      text: 'I own the property or have authority to list it; submitted facts, images, price, availability, rules and intelligence are accurate to my knowledge.',
    },
    {
      id: 'media_permission_and_cooperation',
      text: 'I have permission to use the submitted media and will cooperate with verification and updates.',
    },
    {
      id: 'no_renter_fees',
      text: 'I will not collect agency, inspection, finder, connection or disguised fees from renters introduced through Veriq.',
    },
    {
      id: 'veriq_enforcement',
      text: 'Veriq may correct, reject, suspend or remove an inaccurate, unauthorised, fraudulent or non-compliant listing.',
    },
  ],
};

/** Posting readiness with every requirement satisfied unless a spec says otherwise. */
export function postingReadiness(overrides: Partial<Record<'phone_otp' | 'government_id' | 'selfie_with_id', boolean>> = {}) {
  const satisfied = { phone_otp: true, government_id: true, selfie_with_id: true, ...overrides };
  const requirements = [
    {
      requirement: 'phone_otp',
      code: 'phone_not_verified',
      label: 'Phone number verified by OTP',
      message: 'Verify your phone number with the code we send you',
      satisfied: satisfied.phone_otp,
    },
    {
      requirement: 'government_id',
      code: 'government_id_missing',
      label: 'Valid government ID',
      message: 'Upload a valid government ID',
      satisfied: satisfied.government_id,
    },
    {
      requirement: 'selfie_with_id',
      code: 'selfie_with_id_missing',
      label: 'Selfie holding the government ID',
      message: 'Upload a selfie of yourself holding that government ID',
      satisfied: satisfied.selfie_with_id,
    },
  ];
  return {
    operatorId: 'operator-1',
    categories: ['residential', 'for_sale'],
    legalName: 'Ada Operator',
    termsAccepted: true,
    termsVersion: 'v1.0',
    termsAcceptedAt: '2026-01-01T00:00:00.000Z',
    identityStatus: requirements.every((item) => item.satisfied) ? 'identity_verified' : 'identity_pending',
    identityReviewNote: null,
    canPost: requirements.every((item) => item.satisfied),
    requirements,
    furtherEvidenceRequested: false,
    furtherEvidenceRequestedAt: null,
    furtherEvidenceNote: null,
  };
}

/** An empty media view, so a spec that is not about media does not have to model the checklist. */
export const EMPTY_MEDIA_VIEW = {
  items: [],
  checklist: {
    schemaId: 'for_sale.sale.land',
    schemaVersion: 1,
    complete: false,
    sections: [],
    coverMediaId: null,
    coverRequired: true,
  },
};
