/**
 * Admin console API (v1.6.2). Paths omit `/api/v1`; every response is the backend envelope.
 */

import { api } from '@/lib/api';
import type {
  AdminCreateRefundInput,
  AdminRefund,
  AgentAdjustmentInput,
  AgentBalanceRow,
  AgentCommissionView,
  AgentPayout,
  AgentQualityAudit,
  AgentQualityDetail,
  ApproveRefundInput,
  AssignAgentInput,
  AssignmentQueue,
  AuditEvent,
  AuditFilters,
  BusinessRuleSettingView,
  BusinessRulesPayload,
  CategoryConfiguration,
  ClearCategoryRuleInput,
  CreateFreeUnlockInput,
  CreateVeriqAgentInput,
  Envelope,
  FreeUnlockFilters,
  FreeUnlockRule,
  LedgerOverview,
  LedgerRange,
  LedgerTransaction,
  LedgerTransactionFilters,
  ListingPriceOverride,
  ListingPricingView,
  ListingSelectorFilters,
  ListingTargetType,
  ManagedSaleListing,
  OperatorAssignmentView,
  OperatorIdentityStatus,
  OperatorRecord,
  OutcomeSummaryRow,
  Paged,
  PayoutFilters,
  PropertyAssignmentView,
  PropertyCategory,
  QualityListResponse,
  RecordQualityAuditInput,
  RefundApprovalResult,
  RefundFilters,
  RequestRefundEvidenceInput,
  RevenueSplitRow,
  SaleAvailabilityInput,
  SaleListingDetail,
  SelectorListing,
  SelectorOperator,
  SetAgentCommissionInput,
  SetBusinessRuleInput,
  SetListingPriceInput,
  UpdateFreeUnlockInput,
  VerificationCaseRecord,
  VerificationCaseStatus,
  VerificationEvidenceRow,
  VerificationPropertyRecord,
  VerificationQueueItem,
  VerificationWorkspace,
  VeriqAgentFilters,
  VeriqAgentListItem,
  VeriqAgentSummary,
  WalletLedgerFilters,
  WalletLedgerRow,
} from '@/types/admin';

type QueryValue = string | number | boolean | null | undefined;

/** Builds `?a=1&b=2`, skipping empty values. */
export function toQuery(params: Record<string, QueryValue>): string {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    search.set(key, String(value));
  });
  const query = search.toString();
  return query ? `?${query}` : '';
}

const enc = encodeURIComponent;

// ─── Veriq Agents & assignment ────────────────────────────────────────────

export const veriqAgentsAdminApi = {
  list: (filters: VeriqAgentFilters = {}) =>
    api.get<Paged<VeriqAgentListItem>>(`/admin/veriq-agents${toQuery({ ...filters })}`),
  create: (input: CreateVeriqAgentInput) =>
    api.post<Envelope<VeriqAgentSummary>>('/admin/veriq-agents', input),
  suspend: (id: string, reason: string) =>
    api.post<Envelope<VeriqAgentSummary>>(`/admin/veriq-agents/${enc(id)}/suspend`, { reason }),
  restore: (id: string, reason: string) =>
    api.post<Envelope<VeriqAgentSummary>>(`/admin/veriq-agents/${enc(id)}/restore`, { reason }),
  setPublishingPermission: (id: string, allowed: boolean, reason: string) =>
    api.post<Envelope<VeriqAgentSummary>>(`/admin/veriq-agents/${enc(id)}/publishing-permission`, {
      allowed,
      reason,
    }),
  commission: (agentId: string) =>
    api.get<Envelope<AgentCommissionView>>(`/admin/business-rules/agents/${enc(agentId)}/commission`),
  setCommission: (agentId: string, input: SetAgentCommissionInput) =>
    api.put<Envelope<unknown>>(`/admin/business-rules/agents/${enc(agentId)}/commission`, input),
};

export const assignmentsAdminApi = {
  queue: () => api.get<Envelope<AssignmentQueue>>('/admin/assignments/queue'),
  operator: (operatorId: string) =>
    api.get<Envelope<OperatorAssignmentView>>(`/admin/assignments/operators/${enc(operatorId)}`),
  assignOperator: (operatorId: string, input: AssignAgentInput) =>
    api.post<Envelope<OperatorAssignmentView>>(`/admin/assignments/operators/${enc(operatorId)}`, input),
  property: (propertyId: string) =>
    api.get<Envelope<PropertyAssignmentView>>(`/admin/assignments/properties/${enc(propertyId)}`),
  assignProperty: (propertyId: string, input: AssignAgentInput) =>
    api.post<Envelope<PropertyAssignmentView>>(`/admin/assignments/properties/${enc(propertyId)}`, input),
  clearPropertyOverride: (propertyId: string, reason: string) =>
    api.post<Envelope<PropertyAssignmentView>>(
      `/admin/assignments/properties/${enc(propertyId)}/clear-override`,
      { reason },
    ),
};

// ─── Business rules & categories ──────────────────────────────────────────

export const businessRulesAdminApi = {
  overview: () => api.get<Envelope<BusinessRulesPayload>>('/admin/business-rules'),
  history: (key: string) =>
    api.get<Envelope<BusinessRuleSettingView[]>>(`/admin/business-rules/history/${enc(key)}`),
  set: (input: SetBusinessRuleInput) =>
    api.post<Envelope<BusinessRuleSettingView>>('/admin/business-rules', input),
  clearCategory: (input: ClearCategoryRuleInput) =>
    api.post<Envelope<BusinessRuleSettingView>>('/admin/business-rules/clear-category', input),
};

export const categoriesAdminApi = {
  list: () => api.get<Envelope<CategoryConfiguration[]>>('/property-platform/admin/categories'),
  setEnabled: (category: PropertyCategory, isEnabled: boolean) =>
    api.patch<Envelope<CategoryConfiguration>>(`/property-platform/admin/categories/${enc(category)}`, {
      isEnabled,
    }),
};

// ─── Pricing & Free Unlock ────────────────────────────────────────────────

export const pricingAdminApi = {
  operators: (q?: string) =>
    api.get<Envelope<SelectorOperator[]>>(`/admin/listing-selector/operators${toQuery({ q })}`),
  operatorListings: (operatorId: string, filters: ListingSelectorFilters = {}) =>
    api.get<Envelope<SelectorListing[]>>(
      `/admin/listing-selector/operators/${enc(operatorId)}/listings${toQuery({ ...filters })}`,
    ),
  listingPricing: (targetType: ListingTargetType, targetId: string) =>
    api.get<Envelope<ListingPricingView>>(`/admin/listing-pricing/${enc(targetType)}/${enc(targetId)}`),
  setListingPrice: (input: SetListingPriceInput) =>
    api.post<Envelope<ListingPriceOverride>>('/admin/listing-pricing', input),
  freeUnlockRules: (filters: FreeUnlockFilters = {}) =>
    api.get<Envelope<FreeUnlockRule[]>>(`/admin/free-unlock-rules${toQuery({ ...filters })}`),
  createFreeUnlock: (input: CreateFreeUnlockInput) =>
    api.post<Envelope<FreeUnlockRule>>('/admin/free-unlock-rules', input),
  updateFreeUnlock: (id: string, input: UpdateFreeUnlockInput) =>
    api.patch<Envelope<FreeUnlockRule>>(`/admin/free-unlock-rules/${enc(id)}`, input),
  disableFreeUnlock: (id: string, reason: string) =>
    api.post<Envelope<FreeUnlockRule>>(`/admin/free-unlock-rules/${enc(id)}/disable`, { reason }),
};

// ─── Refunds ──────────────────────────────────────────────────────────────

export const refundsAdminApi = {
  list: (filters: RefundFilters = {}) =>
    api.get<Paged<AdminRefund>>(
      `/admin/refunds${toQuery({
        status: filters.status,
        caseType: filters.caseType,
        flagged: filters.flagged ? 'true' : undefined,
        page: filters.page,
        limit: filters.limit,
      })}`,
    ),
  get: (id: string) => api.get<Envelope<AdminRefund>>(`/refunds/${enc(id)}`),
  create: (input: AdminCreateRefundInput) => api.post<Envelope<AdminRefund>>('/admin/refunds', input),
  requestEvidence: (id: string, input: RequestRefundEvidenceInput) =>
    api.post<Envelope<AdminRefund>>(`/admin/refunds/${enc(id)}/request-evidence`, input),
  approve: (id: string, input: ApproveRefundInput) =>
    api.post<Envelope<RefundApprovalResult>>(`/admin/refunds/${enc(id)}/approve`, input),
  reject: (id: string, reason: string) =>
    api.post<Envelope<AdminRefund>>(`/admin/refunds/${enc(id)}/reject`, { reason }),
};

// ─── Ledger, earnings & withdrawals ───────────────────────────────────────

export const ledgerAdminApi = {
  overview: (range: LedgerRange = {}) =>
    api.get<Envelope<LedgerOverview>>(`/admin/ledger/overview${toQuery({ ...range })}`),
  transactions: (filters: LedgerTransactionFilters = {}) =>
    api.get<Paged<LedgerTransaction>>(`/admin/ledger/transactions${toQuery({ ...filters })}`),
  revenueSplit: (range: LedgerRange = {}) =>
    api.get<Envelope<RevenueSplitRow[]>>(`/admin/ledger/revenue-split${toQuery({ ...range })}`),
  wallet: (filters: WalletLedgerFilters = {}) =>
    api.get<Paged<WalletLedgerRow>>(`/admin/ledger/wallet${toQuery({ ...filters })}`),
  agentBalances: () => api.get<Envelope<AgentBalanceRow[]>>('/admin/ledger/agent-balances'),
  withdrawals: (filters: PayoutFilters = {}) =>
    api.get<Paged<AgentPayout>>(`/admin/ledger/withdrawals${toQuery({ ...filters })}`),
  adjust: (input: AgentAdjustmentInput) =>
    api.post<Envelope<unknown>>('/admin/agent-earnings/adjustments', input),
  markPayoutPaid: (id: string, note?: string) =>
    api.post<Envelope<AgentPayout>>(`/admin/agent-payouts/${enc(id)}/mark-paid`, note ? { note } : {}),
  rejectPayout: (id: string, note?: string) =>
    api.post<Envelope<AgentPayout>>(`/admin/agent-payouts/${enc(id)}/reject`, note ? { note } : {}),
};

// ─── Quality, outcomes & audit ────────────────────────────────────────────

export const qualityAdminApi = {
  list: () => api.get<QualityListResponse>('/admin/agent-quality'),
  detail: (agentId: string) => api.get<Envelope<AgentQualityDetail>>(`/admin/agent-quality/${enc(agentId)}`),
  recordAudit: (input: RecordQualityAuditInput) =>
    api.post<Envelope<AgentQualityAudit>>('/admin/agent-quality/audits', input),
  outcomeSummary: () => api.get<Envelope<OutcomeSummaryRow[]>>('/admin/unlock-outcomes/summary'),
};

export const auditAdminApi = {
  list: (filters: AuditFilters = {}) =>
    api.get<Paged<AuditEvent>>(`/admin/audit-events${toQuery({ ...filters })}`),
};

// ─── Property for Sale oversight ──────────────────────────────────────────

export const salesAdminApi = {
  managed: () => api.get<Envelope<ManagedSaleListing[]>>('/sale-listings/managed'),
  detail: (id: string) => api.get<Envelope<SaleListingDetail>>(`/sale-listings/${enc(id)}/manage`),
  clearEscalation: (id: string, reason: string) =>
    api.post<Envelope<SaleListingDetail>>(`/sale-listings/${enc(id)}/clear-escalation`, { reason }),
  suspend: (id: string, reason: string) =>
    api.post<Envelope<unknown>>(`/sale-listings/${enc(id)}/suspend`, { reason }),
  setAvailability: (id: string, input: SaleAvailabilityInput) =>
    api.patch<Envelope<SaleListingDetail>>(`/sale-listings/${enc(id)}/availability`, input),
};

// ─── Verification oversight ───────────────────────────────────────────────

export const verificationAdminApi = {
  cases: (status?: VerificationCaseStatus) =>
    api.get<Envelope<VerificationQueueItem[]>>(`/verification/cases${toQuery({ status })}`),
  workspace: (caseId: string) =>
    api.get<Envelope<VerificationWorkspace>>(`/verification/cases/${enc(caseId)}`),
  propertyEvidence: (propertyId: string) =>
    api.get<Envelope<VerificationEvidenceRow[]>>(`/listing-submissions/properties/${enc(propertyId)}/evidence`),
  clearEscalation: (caseId: string, reason: string) =>
    api.post<Envelope<VerificationCaseRecord>>(`/verification/cases/${enc(caseId)}/clear-escalation`, { reason }),
  suspend: (propertyId: string, reason: string) =>
    api.post<Envelope<VerificationPropertyRecord>>(`/verification/properties/${enc(propertyId)}/suspend`, { reason }),
  restore: (propertyId: string, reason: string) =>
    api.post<Envelope<VerificationPropertyRecord>>(`/verification/properties/${enc(propertyId)}/restore`, { reason }),
  archive: (propertyId: string, reason: string) =>
    api.post<Envelope<VerificationPropertyRecord>>(`/verification/properties/${enc(propertyId)}/archive`, { reason }),
  disputeFreeze: (propertyId: string, frozen: boolean, reason: string) =>
    api.post<Envelope<VerificationPropertyRecord>>(
      `/verification/properties/${enc(propertyId)}/dispute-freeze`,
      { frozen, reason },
    ),
  transferOperator: (propertyId: string, operatorId: string, reason: string) =>
    api.post<Envelope<VerificationPropertyRecord>>(
      `/verification/properties/${enc(propertyId)}/transfer-operator`,
      { operatorId, reason },
    ),
  operatorIdentity: (operatorId: string, status: OperatorIdentityStatus, note?: string) =>
    api.post<Envelope<OperatorRecord>>(
      `/verification/operators/${enc(operatorId)}/identity`,
      note ? { status, note } : { status },
    ),
};
