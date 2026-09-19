/**
 * Veriq Agent API client (verification, street links, listing media, revisions, Shared Property,
 * Property for Sale, schemas, availability, earnings and portfolio). Paths omit `/api/v1`.
 */

import { api } from '@/lib/api';
import type { ApiResponse, PaginatedResponse, IntelligenceCategory, Street, CommunityLocation, CommunityArea, AllowedState } from '@/types';
import type {
  AgentEarningsPayload,
  AgentNotification,
  AgentPayout,
  AgentPortfolio,
  ChecklistItemStatus,
  CorrectPropertyInput,
  CorrectUnitInput,
  CreateSaleListingInput,
  DocumentCheckInput,
  DuplicateDecisionInput,
  EvidenceKind,
  FormSchema,
  InitialIntelligenceAnswer,
  InitialIntelligenceResult,
  ListingMediaItem,
  ListingMediaView,
  ListingRevision,
  MediaException,
  MediaOwnerType,
  OperatorIdentityStatus,
  PartyStatusInput,
  Readiness,
  SaleAvailabilityInput,
  SaleDocumentTypesPayload,
  SaleManageView,
  SaleManagedItem,
  SaleSubtype,
  SchemaCatalogue,
  SharedLocationInput,
  SharedManageView,
  SharedQueueItem,
  StreetIntelligenceLink,
  StreetLinkState,
  StreetLinkTargetType,
  UnitAvailabilityRecord,
  UpdateSaleListingInput,
  UpdateSharedInput,
  VerificationCase,
  VerificationCaseStatus,
  VerificationChecklistKey,
  VerificationEvidence,
  VerificationQueueItem,
  VerificationWorkspace,
  VerifyLocationInput,
  WorkspaceProperty,
  WorkspaceUnit,
} from '@/types/agent';

const enc = encodeURIComponent;

// ── Verification cases & Property publication (§8.2–8.3) ─────────────────

export const verificationApi = {
  queue: (status?: VerificationCaseStatus) =>
    api.get<ApiResponse<VerificationQueueItem[]>>(
      `/verification/cases${status ? `?status=${enc(status)}` : ''}`,
    ),

  workspace: (caseId: string) =>
    api.get<ApiResponse<VerificationWorkspace>>(`/verification/cases/${enc(caseId)}`),

  start: (caseId: string) =>
    api.post<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/start`, {}),

  updateChecklist: (caseId: string, key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) =>
    api.patch<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/checklist`, {
      key,
      status,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  requestCorrection: (caseId: string, notes: string) =>
    api.post<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/request-correction`, { notes }),

  escalate: (caseId: string, reason: string) =>
    api.post<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/escalate`, { reason }),

  resolveDuplicates: (caseId: string, input: DuplicateDecisionInput) =>
    api.post<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/duplicates`, input),

  markReady: (caseId: string) =>
    api.post<ApiResponse<VerificationCase>>(`/verification/cases/${enc(caseId)}/ready`, {}),

  readiness: (propertyId: string) =>
    api.get<ApiResponse<Readiness>>(`/verification/properties/${enc(propertyId)}/readiness`),

  verifyLocation: (propertyId: string, input: VerifyLocationInput) =>
    api.post<ApiResponse<{ propertyId: string; verifiedAddress: Record<string, unknown> }>>(
      `/verification/properties/${enc(propertyId)}/location`,
      input,
    ),

  correctProperty: (propertyId: string, input: CorrectPropertyInput) =>
    api.patch<ApiResponse<WorkspaceProperty>>(`/verification/properties/${enc(propertyId)}/record`, input),

  correctUnit: (unitId: string, input: CorrectUnitInput) =>
    api.patch<ApiResponse<WorkspaceUnit & { removedAnswers: string[] }>>(
      `/verification/units/${enc(unitId)}/record`,
      input,
    ),

  verifyUnit: (unitId: string) =>
    api.post<ApiResponse<WorkspaceUnit>>(`/verification/units/${enc(unitId)}/verify`, {}),

  publish: (propertyId: string) =>
    api.post<ApiResponse<WorkspaceProperty>>(`/verification/properties/${enc(propertyId)}/publish`, {}),

  setOperatorIdentity: (operatorId: string, status: OperatorIdentityStatus, note?: string) =>
    api.post<ApiResponse<{ id: string; identityStatus: OperatorIdentityStatus }>>(
      `/verification/operators/${enc(operatorId)}/identity`,
      { status, ...(note?.trim() ? { note: note.trim() } : {}) },
    ),

  propertyEvidence: (propertyId: string) =>
    api.get<ApiResponse<VerificationEvidence[]>>(`/listing-submissions/properties/${enc(propertyId)}/evidence`),

  propertyRevisions: (propertyId: string) =>
    api.get<ApiResponse<ListingRevision[]>>(`/listing-submissions/properties/${enc(propertyId)}/revisions`),
};

// ── Street Intelligence linkage (§24.3) ──────────────────────────────────

export const streetLinksApi = {
  state: (targetType: StreetLinkTargetType, targetId: string) =>
    api.get<ApiResponse<StreetLinkState>>(`/street-links/${targetType}/${enc(targetId)}`),

  history: (targetType: StreetLinkTargetType, targetId: string) =>
    api.get<ApiResponse<StreetIntelligenceLink[]>>(`/street-links/${targetType}/${enc(targetId)}/history`),

  link: (input: { targetType: StreetLinkTargetType; targetId: string; streetId: string; reason?: string }) =>
    api.post<ApiResponse<StreetIntelligenceLink>>('/street-links/link', input),

  provideInitial: (input: {
    targetType: StreetLinkTargetType;
    targetId: string;
    streetId: string;
    answers: InitialIntelligenceAnswer[];
    evidenceNote?: string;
  }) => api.post<ApiResponse<InitialIntelligenceResult>>('/street-links/initial-intelligence', input),

  categories: () =>
    api.get<ApiResponse<IntelligenceCategory[]>>('/community/categories', { public: true }),

  searchStreets: (filters: { q?: string; locationId?: string; areaId?: string; state?: string; city?: string; page?: number }) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== '') params.set(key, String(value));
    });
    return api.get<PaginatedResponse<Street>>(`/community/streets/search?${params}`);
  },
};

// ── Location hierarchy (§4.1) ────────────────────────────────────────────

export const locationLookupApi = {
  activeStates: () =>
    api.get<ApiResponse<AllowedState[]>>('/locations/states/active', { public: true }),

  hierarchy: (state?: string, lga?: string) => {
    const params = new URLSearchParams();
    if (state) params.set('state', state);
    if (lga) params.set('city', lga);
    return api.get<ApiResponse<{ states: string[]; cities: string[]; areas: string[]; locations: CommunityLocation[]; areaRecords: CommunityArea[] }>>(
      `/community/streets/locations?${params}`,
      { public: true },
    );
  },
};

// ── Listing media (§9) ───────────────────────────────────────────────────

export const listingMediaApi = {
  view: (ownerType: MediaOwnerType, ownerId: string) =>
    api.get<ApiResponse<ListingMediaView>>(`/listing-media/${ownerType}/${enc(ownerId)}`),

  upload: (
    ownerType: MediaOwnerType,
    ownerId: string,
    input: { file: File; mediaCategory: string; componentKey?: string | null; replacesMediaId?: string; caption?: string },
  ) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('mediaCategory', input.mediaCategory);
    if (input.componentKey) form.append('componentKey', input.componentKey);
    if (input.replacesMediaId) form.append('replacesMediaId', input.replacesMediaId);
    if (input.caption?.trim()) form.append('caption', input.caption.trim());
    return api.upload<ApiResponse<ListingMediaItem>>(`/listing-media/${ownerType}/${enc(ownerId)}`, form);
  },

  review: (mediaId: string, decision: 'approve' | 'reject', reason?: string) =>
    api.post<ApiResponse<unknown>>(`/listing-media/items/${enc(mediaId)}/review`, {
      decision,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),

  setCover: (mediaId: string) =>
    api.post<ApiResponse<ListingMediaItem>>(`/listing-media/items/${enc(mediaId)}/cover`, {}),

  remove: (mediaId: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/listing-media/items/${enc(mediaId)}`),

  recordNotApplicable: (
    ownerType: MediaOwnerType,
    ownerId: string,
    input: { mediaCategory: string; componentKey?: string | null; reason: string },
  ) =>
    api.post<ApiResponse<MediaException>>(`/listing-media/${ownerType}/${enc(ownerId)}/not-applicable`, {
      mediaCategory: input.mediaCategory,
      ...(input.componentKey ? { componentKey: input.componentKey } : {}),
      reason: input.reason,
    }),

  decideNotApplicable: (exceptionId: string, decision: 'verify' | 'reject', note?: string) =>
    api.post<ApiResponse<MediaException>>(`/listing-media/not-applicable/${enc(exceptionId)}/decision`, {
      decision,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  /** Not Applicable requests reach the Agent as notifications whose entityId is the exception id. */
  notApplicableRequests: async () => {
    const res = await api.get<PaginatedResponse<AgentNotification>>('/notifications?page=1&limit=100');
    return res.data.filter(
      (item) => item.type === 'media_review_required' && item.entityType === 'media' && item.title === 'Not Applicable request',
    );
  },

  markNotificationRead: (id: string) => api.patch<ApiResponse<null>>(`/notifications/${enc(id)}/read`),
};

// ── Operator revisions (§8.4) ────────────────────────────────────────────

export const revisionsApi = {
  pending: () => api.get<ApiResponse<ListingRevision[]>>('/listing-submissions/revisions/pending'),

  decide: (revision: Pick<ListingRevision, 'id' | 'targetType'>, decision: 'approve' | 'reject', note?: string) => {
    const body = { decision, ...(note?.trim() ? { note: note.trim() } : {}) };
    return revision.targetType === 'shared_opportunity'
      ? api.post<ApiResponse<ListingRevision>>(`/shared-properties/revisions/${enc(revision.id)}/decision`, body)
      : api.post<ApiResponse<unknown>>(`/listing-submissions/revisions/${enc(revision.id)}/decision`, body);
  },
};

// ── Shared Property verification (§6.4, §28.2) ───────────────────────────

export const sharedVerificationApi = {
  queue: () => api.get<ApiResponse<SharedQueueItem[]>>('/shared-properties/verification/queue'),

  manage: (id: string) => api.get<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/manage`),

  update: (id: string, input: UpdateSharedInput) =>
    api.patch<ApiResponse<{ opportunity: SharedManageView; revision: ListingRevision | null }>>(
      `/shared-properties/${enc(id)}`,
      input,
    ),

  recordCheck: (id: string, key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) =>
    api.patch<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/checks`, {
      key,
      status,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),

  requestCorrection: (id: string, notes: string) =>
    api.post<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/request-correction`, { notes }),

  verifyLocation: (id: string, input: SharedLocationInput) =>
    api.post<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/location`, input),

  readiness: (id: string) => api.get<ApiResponse<Readiness>>(`/shared-properties/${enc(id)}/readiness`),

  publish: (id: string) => api.post<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/publish`, {}),

  suspend: (id: string, reason: string) =>
    api.post<ApiResponse<unknown>>(`/shared-properties/${enc(id)}/suspend`, { reason }),

  availability: (id: string, status: 'available' | 'unavailable', reason?: string) =>
    api.patch<ApiResponse<SharedManageView>>(`/shared-properties/${enc(id)}/availability`, {
      status,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),

  evidence: (id: string) => api.get<ApiResponse<VerificationEvidence[]>>(`/shared-properties/${enc(id)}/evidence`),
};

// ── Property for Sale (§6.5, §8.5) ───────────────────────────────────────

export const saleListingsApi = {
  documentTypes: (subtype: SaleSubtype) =>
    api.get<ApiResponse<SaleDocumentTypesPayload>>(`/sale-listings/document-types/${subtype}`, { public: true }),

  managed: () => api.get<ApiResponse<SaleManagedItem[]>>('/sale-listings/managed'),

  create: (input: CreateSaleListingInput) => api.post<ApiResponse<SaleManageView>>('/sale-listings', input),

  manage: (id: string) => api.get<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/manage`),

  update: (id: string, input: UpdateSaleListingInput) =>
    api.patch<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}`, input),

  recordDocument: (id: string, input: DocumentCheckInput) =>
    api.post<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/documents`, input),

  setPartyStatus: (id: string, input: PartyStatusInput) =>
    api.patch<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/seller-verification`, input),

  uploadEvidence: (id: string, input: { file: File; kind: EvidenceKind; notes?: string }) => {
    const form = new FormData();
    form.append('file', input.file);
    form.append('kind', input.kind);
    if (input.notes?.trim()) form.append('notes', input.notes.trim());
    return api.upload<ApiResponse<{ id: string; kind: EvidenceKind; fileName: string | null; createdAt: string }>>(
      `/sale-listings/${enc(id)}/evidence`,
      form,
    );
  },

  escalate: (id: string, reason: string) =>
    api.post<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/escalate`, { reason }),

  readiness: (id: string) => api.get<ApiResponse<Readiness>>(`/sale-listings/${enc(id)}/readiness`),

  publish: (id: string) => api.post<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/publish`, {}),

  availability: (id: string, input: SaleAvailabilityInput) =>
    api.patch<ApiResponse<SaleManageView>>(`/sale-listings/${enc(id)}/availability`, input),
};

// ── Schemas (Appendix F/G) ───────────────────────────────────────────────

const schemaCache = new Map<string, Promise<FormSchema>>();

export const schemasApi = {
  catalogue: () => api.get<ApiResponse<SchemaCatalogue>>('/property-schemas', { public: true }),

  /** Schemas are static per catalogue version, so one fetch per id is reused across panels. */
  get: (id: string): Promise<FormSchema> => {
    const cached = schemaCache.get(id);
    if (cached) return cached;
    const request = api
      .get<ApiResponse<FormSchema>>(`/property-schemas/${enc(id)}`, { public: true })
      .then((res) => res.data)
      .catch((err: unknown) => {
        schemaCache.delete(id);
        throw err;
      });
    schemaCache.set(id, request);
    return request;
  },
};

// ── Unit availability (§10) ──────────────────────────────────────────────

export const unitAvailabilityApi = {
  change: (unitId: string, status: 'available' | 'unavailable', reason?: string) =>
    api.patch<ApiResponse<UnitAvailabilityRecord>>(`/availability/units/${enc(unitId)}`, {
      status,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),

  reconfirm: (unitId: string) =>
    api.post<ApiResponse<UnitAvailabilityRecord>>(`/availability/units/${enc(unitId)}/reconfirm`, {}),
};

// ── Earnings & withdrawals (§15) ─────────────────────────────────────────

export const agentEarningsApi = {
  mine: () => api.get<ApiResponse<AgentEarningsPayload>>('/agent-earnings/me'),

  requestWithdrawal: (amount: number, note?: string) =>
    api.post<ApiResponse<AgentPayout>>('/agent-earnings/me/withdrawals', {
      amount,
      ...(note?.trim() ? { note: note.trim() } : {}),
    }),
};

// ── Portfolio & referral (§3, §16) ───────────────────────────────────────

export const agentPortfolioApi = {
  mine: () => api.get<ApiResponse<AgentPortfolio>>('/agent/portfolio'),
};

