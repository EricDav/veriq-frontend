/**
 * Renter API client for the v1.6.2 unlock checkout, refunds, Veriq Wallet credit, post-unlock outcomes,
 * Shared Property, Property for Sale, Free Unlock status and public Veriq Agent profiles.
 * Paths omit the /api/v1 prefix; every response is the standard `{ success, statusCode, message, data, meta? }` envelope.
 */

import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse } from '@/types';
import type {
  CreateRefundRequestDto,
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
  SaleListingPublic,
  SaleListQuery,
  SaleUnlockedPackage,
  SharedListingPublic,
  SharedListQuery,
  SharedUnlockedPackage,
  SimilarPropertiesResult,
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
  /** Public quote; personalised with wallet credit and existing access when a session token is present. */
  quote: (targetType: ListingTargetType, targetId: string) =>
    api.get<ApiResponse<UnlockQuote>>(`/unlocks/quote${toQuery({ targetType, targetId })}`),

  /** Same quote without the bearer token, used when a stale session cannot be refreshed. */
  quotePublic: (targetType: ListingTargetType, targetId: string) =>
    api.get<ApiResponse<UnlockQuote>>(`/unlocks/quote${toQuery({ targetType, targetId })}`, { public: true }),

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

export const saleListingsApi = {
  list: (query: SaleListQuery = {}) =>
    api.get<PaginatedResponse<SaleListingPublic>>(`/sale-listings${toQuery(query)}`, { public: true }),

  get: (id: string) =>
    api.get<ApiResponse<SaleListingPublic>>(`/sale-listings/${segment(id)}`, { public: true }),

  unlocked: (id: string) =>
    api.get<ApiResponse<SaleUnlockedPackage>>(`/sale-listings/${segment(id)}/unlocked`),
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
