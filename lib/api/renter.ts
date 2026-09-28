/**
 * Renter API client for the v1.6.2 unlock checkout, refunds, Veriq Wallet credit, post-unlock outcomes,
 * Shared Property, Property for Sale, Free Unlock status and public Veriq Agent profiles.
 * Paths omit the /api/v1 prefix; every response is the standard `{ success, statusCode, message, data, meta? }` envelope.
 */

import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type {
  AddUnitCalendarPeriodInput,
  AgentRefundConfirmationDto,
  AvailabilityWatch,
  CreateRefundRequestDto,
  CreateSaleEnquiryDto,
  FormSchemaDefinition,
  FreeUnlockPublicStatus,
  InitiateUnlockDto,
  InitiateUnlockResult,
  ListingTargetType,
  PendingOutcome,
  PublicAgentProfile,
  RecordOutcomeDto,
  RefundEvidenceDto,
  RefundPolicy,
  RefundRequest,
  SaleEnquiryReceipt,
  SaleListingCardData,
  SaleListingPublic,
  SaleListQuery,
  SharedListingPublic,
  SharedListQuery,
  SharedUnlockedPackage,
  SimilarPropertiesResult,
  StayRangeQuery,
  UnitCalendar,
  UnitCalendarPeriod,
  UnlockedPropertyWithStreet,
  UnlockHistoryItem,
  UnlockQuote,
  UnlockView,
  VeriqWallet,
  WalletLedgerTransaction,
} from '@/types/renter';

function toQuery(params: object) {
  const search = new URLSearchParams();
  Object.entries(params as Record<string, unknown>).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

const segment = (value: string) => encodeURIComponent(value);

// ── Unlock checkout ──────────────────────────────────────────────────────

export const unlocksApi = {
  /**
   * Public quote; personalised with wallet credit and existing access when a session token is present. A Short Let
   * stay narrows availability to exactly those nights (Master Blueprint §5).
   */
  quote: (targetType: ListingTargetType, targetId: string, dates: StayRangeQuery = {}) =>
    api.get<ApiResponse<UnlockQuote>>(`/unlocks/quote${toQuery({ targetType, targetId, ...dates })}`),

  /** Same quote without the bearer token, used when a stale session cannot be refreshed. */
  quotePublic: (targetType: ListingTargetType, targetId: string, dates: StayRangeQuery = {}) =>
    api.get<ApiResponse<UnlockQuote>>(`/unlocks/quote${toQuery({ targetType, targetId, ...dates })}`, {
      public: true,
    }),

  initiate: (dto: InitiateUnlockDto) =>
    api.post<ApiResponse<InitiateUnlockResult>>('/unlocks', dto),

  my: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<UnlockHistoryItem>>(`/unlocks/my${toQuery({ page, limit })}`),

  confirm: (unlockId: string, reference?: string) =>
    api.post<ApiResponse<UnlockView>>(`/unlocks/${segment(unlockId)}/confirm`, reference ? { reference } : {}),

  cancel: (unlockId: string) =>
    api.post<ApiResponse<UnlockView>>(`/unlocks/${segment(unlockId)}/cancel`, {}),
};

// ── Refunds ──────────────────────────────────────────────────────────────

export const refundsApi = {
  policy: () => api.get<ApiResponse<RefundPolicy>>('/refunds/policy', { public: true }),

  create: (dto: CreateRefundRequestDto) => api.post<ApiResponse<RefundRequest>>('/refunds', dto),

  my: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<RefundRequest>>(`/refunds/my${toQuery({ page, limit })}`),

  get: (id: string) => api.get<ApiResponse<RefundRequest>>(`/refunds/${segment(id)}`),

  similar: (id: string) =>
    api.get<ApiResponse<SimilarPropertiesResult>>(`/refunds/${segment(id)}/similar-properties`),

  addEvidence: (id: string, dto: RefundEvidenceDto) =>
    api.post<ApiResponse<RefundRequest>>(`/refunds/${segment(id)}/evidence`, dto),

  /**
   * The listing's Veriq Agent confirms or disputes that the unit became unavailable inside the access window
   * (Master Blueprint §5). Agent and Admin only; the server re-checks that the unlock belongs to this Agent.
   */
  agentConfirmation: (id: string, dto: AgentRefundConfirmationDto) =>
    api.post<ApiResponse<RefundRequest>>(`/refunds/${segment(id)}/agent-confirmation`, dto),
};

// ── Availability notifications ("Notify me when available") ──────────────

export const availabilityNotificationsApi = {
  mine: () => api.get<ApiResponse<AvailabilityWatch[]>>('/availability-notifications'),

  watch: (targetType: ListingTargetType, targetId: string) =>
    api.post<ApiResponse<AvailabilityWatch>>(
      `/availability-notifications/${segment(targetType)}/${segment(targetId)}`,
      {},
    ),

  cancel: (id: string) =>
    api.delete<ApiResponse<AvailabilityWatch>>(`/availability-notifications/${segment(id)}`),
};

// ── Per-unit booked and blocked dates ────────────────────────────────────

export const unitCalendarApi = {
  /** Public for a published Unit: a renter has to see taken nights before paying (Master Blueprint §5). */
  view: (unitId: string, options: { from?: string; to?: string; includeCancelled?: boolean } = {}) =>
    api.get<ApiResponse<UnitCalendar>>(
      `/availability/units/${segment(unitId)}/calendar${toQuery(options)}`,
      { public: true },
    ),

  /** Operator of the property, its assigned Agent or Admin. A clashing range is refused with 409. */
  addPeriod: (unitId: string, input: AddUnitCalendarPeriodInput) =>
    api.post<ApiResponse<UnitCalendarPeriod>>(`/availability/units/${segment(unitId)}/calendar`, input),

  cancelPeriod: (periodId: string) =>
    api.delete<ApiResponse<UnitCalendarPeriod>>(`/availability/unit-calendar/${segment(periodId)}`),
};

// ── Veriq Wallet (read-only credit) ──────────────────────────────────────

export const walletCreditApi = {
  get: () => api.get<ApiResponse<VeriqWallet>>('/wallet'),

  transactions: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<WalletLedgerTransaction>>(`/wallet/transactions${toQuery({ page, limit })}`),
};

// ── Post-unlock outcomes ─────────────────────────────────────────────────

export const outcomesApi = {
  pending: () => api.get<ApiResponse<PendingOutcome[]>>('/unlock-outcomes/pending'),

  record: (dto: RecordOutcomeDto) => api.post<ApiResponse<{ id: string }>>('/unlock-outcomes', dto),
};

// ── Property unlocked package (with Street Intelligence) ─────────────────

export const propertyPackageApi = {
  unlocked: (propertyId: string) =>
    api.get<ApiResponse<UnlockedPropertyWithStreet>>(`/properties/${segment(propertyId)}/unlocked`),
};

// ── Shared Property ──────────────────────────────────────────────────────

export const sharedPropertiesApi = {
  list: (query: SharedListQuery = {}) =>
    api.get<PaginatedResponse<SharedListingPublic>>(`/shared-properties${toQuery(query)}`, { public: true }),

  get: (id: string) =>
    api.get<ApiResponse<SharedListingPublic>>(`/shared-properties/${segment(id)}`, { public: true }),

  unlocked: (id: string) =>
    api.get<ApiResponse<SharedUnlockedPackage>>(`/shared-properties/${segment(id)}/unlocked`),
};

// ── Property for Sale ────────────────────────────────────────────────────

/**
 * Property for Sale is free to view and has no unlock (Master Blueprint §6). The buyer's only route to the
 * property is an enquiry, which reaches the assigned Veriq Agent rather than the owner.
 */
export const saleListingsApi = {
  list: (query: SaleListQuery = {}) =>
    api.get<PaginatedResponse<SaleListingCardData>>(`/sale-listings${toQuery(query)}`, { public: true }),

  get: (id: string) =>
    api.get<ApiResponse<SaleListingPublic>>(`/sale-listings/${segment(id)}`, { public: true }),

  /** Enquiring does not require an account, so this call is deliberately public. */
  enquire: (dto: CreateSaleEnquiryDto) =>
    api.post<ApiResponse<SaleEnquiryReceipt>>('/sale-enquiries', dto, { public: true }),
};

// ── Free Unlock indicator & form schemas ─────────────────────────────────

export const listingPricingApi = {
  /** Public Free/₦0 indicator for a listing whose payload does not already carry the effective price. */
  freeUnlockStatus: (targetType: ListingTargetType, targetId: string) =>
    api.get<ApiResponse<FreeUnlockPublicStatus>>(
      `/listings/${segment(targetType)}/${segment(targetId)}/free-unlock`,
      { public: true },
    ),
};

export const formSchemasApi = {
  get: (schemaId: string) =>
    api.get<ApiResponse<FormSchemaDefinition>>(`/property-schemas/${segment(schemaId)}`, { public: true }),
};

// ── Public Veriq Agent profile ───────────────────────────────────────────

export const publicAgentsApi = {
  bySlug: (slug: string) =>
    api.get<ApiResponse<PublicAgentProfile>>(`/agents/by-slug/${segment(slug)}`, { public: true }),

  byUsername: (username: string) =>
    api.get<ApiResponse<PublicAgentProfile>>(`/agents/by-username/${segment(username)}`, { public: true }),
};
