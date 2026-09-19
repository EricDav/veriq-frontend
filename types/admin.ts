/**
 * Admin console types mirroring the v1.6.2 NestJS admin DTOs and response views.
 * Every response is enveloped `{ success, statusCode, message, data, meta? }`.
 */

// ─── Envelope ─────────────────────────────────────────────────────────────

export interface Envelope<T> {
  success: boolean;
  statusCode: number;
  message: string;
  data: T;
}

export interface PageMeta {
  total: number;
  page: number;
  limit: number;
  pages: number;
}

export interface Paged<T> extends Envelope<T[]> {
  meta: PageMeta;
}

// ─── Shared enums ─────────────────────────────────────────────────────────

export const PROPERTY_CATEGORIES = [
  'residential',
  'short_let',
  'hostel',
  'shared_property',
  'for_sale',
] as const;
export type PropertyCategory = (typeof PROPERTY_CATEGORIES)[number];

export const PUBLICATION_STATUSES = [
  'draft',
  'submitted',
  'verification_in_progress',
  'needs_correction',
  'ready_to_publish',
  'published',
  'suspended',
  'archived',
] as const;
export type PublicationStatus = (typeof PUBLICATION_STATUSES)[number];

export const LISTING_TARGET_TYPES = ['property', 'shared_opportunity', 'sale_listing'] as const;
export type ListingTargetType = (typeof LISTING_TARGET_TYPES)[number];

export const OPERATOR_IDENTITY_STATUSES = [
  'account_submitted',
  'identity_pending',
  'identity_verified',
  'identity_rejected',
] as const;
export type OperatorIdentityStatus = (typeof OPERATOR_IDENTITY_STATUSES)[number];

export type AvailabilityState = 'available' | 'unavailable';

// ─── Veriq Agents (§2.5, §3) ──────────────────────────────────────────────

export interface VeriqAgentSummary {
  id: string;
  userId: string;
  name: string;
  email: string | null;
  phone: string | null;
  username: string | null;
  referralCode: string | null;
  isActive: boolean;
  suspendedAt: string | null;
  publishingPermission: boolean;
  publishingPermissionChangedAt: string | null;
  stateOfOperation: string | null;
  operatingLocations: string[];
  bankDetailsComplete: boolean;
  createdAt: string;
}

export interface VeriqAgentListItem extends VeriqAgentSummary {
  operators: number;
  properties: { total: number; published: number };
}

export interface VeriqAgentFilters {
  status?: 'active' | 'suspended';
  q?: string;
  page?: number;
  limit?: number;
}

export interface CreateVeriqAgentInput {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  state: string;
  generalOperatingArea?: string;
}

export interface AgentCommissionRate {
  id: string;
  agentId: string;
  sharePercent: number | null;
  effectiveFrom: string;
  createdByUserId: string;
  reason: string | null;
  createdAt: string;
}

export interface AgentCommissionView {
  agentId: string;
  currentSharePercent: number;
  source: 'agent_override' | 'default';
  history: AgentCommissionRate[];
}

export interface SetAgentCommissionInput {
  sharePercent: number | null;
  effectiveFrom?: string;
  reason: string;
}

// ─── Assignment (§3.1–3.4) ────────────────────────────────────────────────

export interface AssignmentQueueOperator {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  categories: PropertyCategory[];
  identityStatus: OperatorIdentityStatus;
  assignedAgentId: string | null;
  reason: 'unassigned' | 'agent_suspended';
  properties: { total: number; pending: number };
  createdAt: string;
}

export interface AssignmentQueueProperty {
  id: string;
  title: string;
  operatorId: string | null;
  category: PropertyCategory;
  publicationStatus: PublicationStatus;
  createdAt: string;
}

export interface AssignmentQueue {
  operators: AssignmentQueueOperator[];
  propertiesWithoutAgent: AssignmentQueueProperty[];
}

export type AssignmentSource = 'referral' | 'admin' | 'admin_override' | 'migration';

export interface AssignmentHistoryRow {
  id: string;
  operatorId: string | null;
  propertyId: string | null;
  agentId: string;
  assignedByUserId: string;
  effectiveFrom: string;
  effectiveUntil: string | null;
  reason: string | null;
  source: AssignmentSource | string;
  createdAt: string;
}

export interface OperatorAssignmentView {
  operatorId: string;
  assignedAgentId: string | null;
  referralCodeUsed: string | null;
  history: AssignmentHistoryRow[];
}

export interface PropertyAssignmentView {
  propertyId: string;
  agentId: string | null;
  operatorId: string | null;
  hasPropertyOverride: boolean;
  history: AssignmentHistoryRow[];
}

export interface AssignAgentInput {
  agentId: string;
  reason: string;
}

// ─── Business rules (§22) ─────────────────────────────────────────────────

export type BusinessRuleUnit =
  | 'naira'
  | 'hours'
  | 'percent'
  | 'bytes'
  | 'pixels'
  | 'count'
  | 'minutes'
  | 'days';

export interface BusinessRuleSettingView {
  id: string;
  key: string;
  /** `global` or `category:<category>` */
  scope: string;
  value: number | null;
  effectiveFrom: string;
  createdByUserId: string;
  reason: string | null;
  createdAt: string;
}

export interface BusinessRuleOverview {
  key: string;
  label: string;
  description: string;
  unit: BusinessRuleUnit;
  defaultValue: number;
  min: number;
  max: number;
  categoryScoped: boolean;
  financial: boolean;
  currentValue: number;
  currentSource: 'category' | 'global' | 'default';
  categoryValues: Partial<Record<PropertyCategory, number | null>> | null;
  scheduled: BusinessRuleSettingView[];
}

export interface FixedPolicies {
  operatorUnlockSharePercent: number;
  listingSubmissionFeeNaira: number;
  agentCommissionBasis: string;
}

export interface BusinessRulesPayload {
  rules: BusinessRuleOverview[];
  fixedPolicies: FixedPolicies;
}

export interface SetBusinessRuleInput {
  key: string;
  value: number;
  category?: PropertyCategory;
  effectiveFrom?: string;
  reason: string;
}

export interface ClearCategoryRuleInput {
  key: string;
  category: PropertyCategory;
  effectiveFrom?: string;
  reason: string;
}

// ─── Categories (§6.6) ────────────────────────────────────────────────────

export interface CategoryConfiguration {
  id: string;
  category: PropertyCategory;
  isEnabled: boolean;
  schemaVersion: number;
  updatedByUserId: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Pricing & Free Unlock (§12.7, §17.4) ─────────────────────────────────

export const VERIQ_MANAGED_OPERATOR_ID = 'veriq-managed';

export interface SelectorOperator {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  assignedAgentId: string | null;
  listingCount: number;
}

export interface ListingRef {
  targetType: ListingTargetType;
  targetId: string;
  category: PropertyCategory;
  subtype: string | null;
  title: string;
  propertyId: string | null;
  operatorId: string | null;
  agentId: string | null;
  publicationStatus: PublicationStatus;
  state: string | null;
  city: string | null;
  area: string | null;
  streetId: string | null;
}

export type UnlockPriceSource = 'listing_override' | 'category' | 'global' | 'default';

export interface SelectorListing extends ListingRef {
  streetName: string | null;
  availability: AvailabilityState;
  currentAgent: { id: string; name: string } | null;
  effectivePrice: number;
  standardPrice: number;
  priceSource: UnlockPriceSource;
  freeUnlock: { ruleId: string | null; endsAt: string | null } | null;
}

export interface ListingSelectorFilters {
  q?: string;
  targetType?: ListingTargetType;
  category?: PropertyCategory;
  subtype?: string;
  area?: string;
  streetId?: string;
  availability?: AvailabilityState;
  freeStatus?: 'free' | 'paid';
}

export interface ListingPriceOverride {
  id: string;
  targetType: ListingTargetType;
  targetId: string;
  priceNaira: number | null;
  effectiveFrom: string;
  createdByUserId: string;
  reason: string | null;
  createdAt: string;
}

export interface ListingPricingView {
  listing: ListingRef;
  effectivePrice: number;
  effectiveSource: UnlockPriceSource;
  defaultPrice: number;
  overridePrice: number | null;
  freeUnlockActive: boolean;
  history: ListingPriceOverride[];
}

export interface SetListingPriceInput {
  targetType: ListingTargetType;
  targetId: string;
  priceNaira: number | null;
  reason: string;
}

export const FREE_UNLOCK_STATUSES = ['scheduled', 'active', 'expired', 'disabled'] as const;
export type FreeUnlockRuleStatus = (typeof FREE_UNLOCK_STATUSES)[number];

export interface FreeUnlockRule {
  id: string;
  targetType: ListingTargetType;
  targetId: string;
  startsAt: string;
  endsAt: string | null;
  disabledAt: string | null;
  disabledByUserId: string | null;
  reason: string;
  createdByUserId: string;
  legacyCampaignId: string | null;
  expiryNotifiedAt: string | null;
  createdAt: string;
  updatedAt: string;
  status: FreeUnlockRuleStatus;
  listing?: ListingRef | null;
}

export interface FreeUnlockFilters {
  status?: FreeUnlockRuleStatus;
  targetType?: ListingTargetType;
  targetId?: string;
}

export interface CreateFreeUnlockInput {
  targetType: ListingTargetType;
  targetId: string;
  startsAt?: string;
  endsAt?: string | null;
  reason: string;
}

export interface UpdateFreeUnlockInput {
  startsAt?: string;
  endsAt?: string | null;
  reason?: string;
}

// ─── Refunds (§14) ────────────────────────────────────────────────────────

export const REFUND_STATUSES = ['requested', 'under_review', 'approved', 'rejected'] as const;
export type RefundStatus = (typeof REFUND_STATUSES)[number];

export const REFUND_CASE_TYPES = ['unlock_purchase', 'excess_payment'] as const;
export type RefundCaseType = (typeof REFUND_CASE_TYPES)[number];

export const REFUND_REASONS = [
  'availability_stale_at_unlock',
  'contact_invalid',
  'property_materially_different',
  'location_wrong',
  'verified_fact_inaccurate',
  'street_link_wrong',
  'initial_street_intelligence_inaccurate',
  'community_street_intelligence_disputed',
  'payment_without_access',
  'duplicate_payment',
  'sale_document_status_inaccurate',
  'sale_already_sold_at_unlock',
  'other',
] as const;
export type RefundReason = (typeof REFUND_REASONS)[number];

export const REFUND_RESPONSIBLE_SOURCES = [
  'agent_verification',
  'operator_supplied',
  'community_street_intelligence',
  'technical_or_payment',
  'other',
] as const;
export type RefundResponsibleSource = (typeof REFUND_RESPONSIBLE_SOURCES)[number];

export interface RefundEvidenceRequest {
  from: string;
  message: string;
  at: string;
}

export interface RefundUnlockInfo {
  id: string;
  status: string;
  paymentReference: string | null;
  feeAmount: number;
  walletAmount: number;
  externalAmount: number;
  unlockedAt: string | null;
  accessExpiresAt: string | null;
  refundDeadlineAt: string | null;
}

export interface RefundListingInfo {
  targetType: ListingTargetType;
  targetId: string;
  title: string;
  category: PropertyCategory;
  area: string | null;
  city: string | null;
}

export interface AdminRefund {
  id: string;
  unlockId: string;
  caseType: RefundCaseType;
  reason: RefundReason;
  explanation: string | null;
  evidenceUrls: string[];
  status: RefundStatus;
  chargedAmount: number;
  creditedAmount: number | null;
  decisionReason: string | null;
  decidedAt: string | null;
  createdAt: string;
  evidenceRequests: RefundEvidenceRequest[];
  creditedMessage: string | null;
  unlock: RefundUnlockInfo | null;
  listing: RefundListingInfo | null;
  userId: string;
  timely: boolean;
  createdByAdminId: string | null;
  flaggedForReview: boolean;
  flagReason: string | null;
  responsibleSource: RefundResponsibleSource | null;
  decidedByUserId: string | null;
  walletTransactionId: string | null;
  earning: { id: string; status: string; amount: number; agentId: string } | null;
  snapshots: {
    availability: Record<string, unknown> | null;
    streetIntelligence: Record<string, unknown> | null;
    pricing: Record<string, unknown> | null;
  } | null;
  listingAgentId: string | null;
  listingOperatorId: string | null;
}

export interface RefundApprovalResult extends AdminRefund {
  availableBalance: number;
}

export interface RefundFilters {
  status?: RefundStatus;
  caseType?: RefundCaseType;
  flagged?: boolean;
  page?: number;
  limit?: number;
}

export interface AdminCreateRefundInput {
  unlockId: string;
  reason: RefundReason;
  explanation?: string;
  evidenceUrls?: string[];
  caseType?: RefundCaseType;
}

export interface RequestRefundEvidenceInput {
  message: string;
  from?: 'renter' | 'agent' | 'operator';
}

export interface ApproveRefundInput {
  reason: string;
  responsibleSource?: RefundResponsibleSource;
}

// ─── Ledger (§15.6) ───────────────────────────────────────────────────────

export interface LedgerRange {
  from?: string;
  to?: string;
}

export interface EarningBuckets {
  pending: number;
  refundReviewHold: number;
  withdrawable: number;
  inWithdrawal: number;
  withdrawn: number;
  cancelled: number;
  adjustments: number;
}

export interface LedgerOverview {
  range: { from: string; to: string };
  unlocks: { count: number; freeUnlocks: number };
  revenue: {
    gross: number;
    walletFunded: number;
    externallyFunded: number;
    agentShare: number;
    veriqShare: number;
  };
  refunds: { approved: number; open: number; credited: number };
  paymentExceptions: number;
  agentBalances: Partial<EarningBuckets>;
}

export const UNLOCK_STATUSES = [
  'pending_payment',
  'unlocked',
  'expired',
  'refund_requested',
  'refunded',
  'payment_failed',
  'cancelled',
  'duplicate_payment',
] as const;
export type UnlockStatus = (typeof UNLOCK_STATUSES)[number] | 'paid';

export interface LedgerTransaction {
  id: string;
  targetType: ListingTargetType;
  propertyId: string | null;
  sharedOpportunityId: string | null;
  saleListingId: string | null;
  status: UnlockStatus;
  feeAmount: number;
  walletAmount: number;
  externalAmount: number;
  priceSource: string | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  agentEntityId: string | null;
  agentSharePercent: string | number | null;
  agentShareAmount: number | null;
  platformShareAmount: number | null;
  settledAt: string | null;
  failureReason: string | null;
  createdAt: string;
  user: { id: string; firstName: string; lastName: string; email: string } | null;
}

export interface LedgerTransactionFilters extends LedgerRange {
  status?: UnlockStatus;
  search?: string;
  page?: number;
  limit?: number;
}

export interface RevenueSplitRow {
  agentId: string;
  agentName: string;
  unlocks: number;
  gross: number;
  agentShare: number;
  cancelled: number;
}

export const WALLET_TRANSACTION_TYPES = [
  'topup',
  'debit',
  'refund',
  'earning',
  'withdrawal',
  'ledger_migration',
] as const;
export type WalletTransactionType = (typeof WALLET_TRANSACTION_TYPES)[number];

export const WALLET_TRANSACTION_STATUSES = ['pending', 'success', 'failed'] as const;
export type WalletTransactionStatus = (typeof WALLET_TRANSACTION_STATUSES)[number];

export interface WalletLedgerRow {
  id: string;
  walletId: string;
  userId: string;
  user: { id: string; name: string; email: string; role: string } | null;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  balanceAfter: number | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  description: string | null;
  createdAt: string;
}

export interface WalletLedgerFilters {
  type?: WalletTransactionType;
  walletStatus?: WalletTransactionStatus;
  userId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface AgentBalanceRow {
  agentId: string;
  agentName: string;
  isActive: boolean;
  buckets: EarningBuckets;
}

export const PAYOUT_STATUSES = ['requested', 'paid', 'rejected'] as const;
export type AgentPayoutStatus = (typeof PAYOUT_STATUSES)[number];

export interface AgentPayout {
  id: string;
  agentId: string;
  agentUserId: string;
  agentName: string | null;
  amount: number;
  status: AgentPayoutStatus;
  reference: string;
  bankSnapshot: {
    bankName?: string | null;
    bankAccountName?: string | null;
    bankAccountNumber?: string | null;
  } | null;
  note: string | null;
  decidedAt: string | null;
  decidedByUserId: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PayoutFilters {
  status?: AgentPayoutStatus;
  agentId?: string;
  page?: number;
  limit?: number;
}

export interface AgentAdjustmentInput {
  agentId: string;
  amount: number;
  note: string;
}

// ─── Agent quality & outcomes (§16.2–16.3, §20) ───────────────────────────

export const QUALITY_COMPONENT_KEYS = [
  'userRatings',
  'auditOutcomes',
  'refundAccuracy',
  'availabilityFreshness',
  'mediaQuality',
  'correctionStability',
] as const;
export type QualityComponentKey = (typeof QUALITY_COMPONENT_KEYS)[number];

export interface AgentQualityMetrics {
  agentId: string;
  ratingAverage: number | null;
  ratingCount: number;
  auditAverage: number | null;
  auditCount: number;
  paidUnlocks: number;
  verificationRefunds: number;
  documentedUnits: number;
  staleExpiries: number;
  approvedMedia: number;
  lowResolutionMedia: number;
  publishedListings: number;
  postPublicationCorrections: number;
}

export interface AgentQualityRow {
  agentId: string;
  name: string;
  isActive: boolean;
  publishingPermission: boolean;
  score: number | null;
  components: Record<QualityComponentKey, number | null>;
  metrics: AgentQualityMetrics;
}

export interface QualityListMeta {
  windowDays: number;
  weights: Record<QualityComponentKey, number>;
}

export interface QualityListResponse extends Envelope<AgentQualityRow[]> {
  meta: QualityListMeta;
}

export const QUALITY_AUDIT_OUTCOMES = ['passed', 'minor_issues', 'major_issues', 'failed'] as const;
export type QualityAuditOutcome = (typeof QUALITY_AUDIT_OUTCOMES)[number];

export interface AgentQualityAudit {
  id: string;
  agentId: string;
  outcome: QualityAuditOutcome;
  score: number;
  targetType: string | null;
  targetId: string | null;
  notes: string | null;
  createdByUserId: string;
  createdAt: string;
}

export interface AgentQualityDetail {
  agentId: string;
  name: string;
  score: number | null;
  components: Record<QualityComponentKey, number | null>;
  metrics: AgentQualityMetrics;
  audits: AgentQualityAudit[];
  windowDays: number;
  weights: Record<QualityComponentKey, number>;
}

export interface RecordQualityAuditInput {
  agentId: string;
  outcome: QualityAuditOutcome;
  score: number;
  targetType?: string;
  targetId?: string;
  notes?: string;
}

export interface OutcomeSummaryRow {
  outcome: 'took' | 'did_not_take' | 'still_considering' | string;
  count: number;
  consented: number;
}

// ─── Audit (§25.1) ────────────────────────────────────────────────────────

export interface AuditEvent {
  id: string;
  actorUserId: string;
  action: string;
  targetType: string;
  targetId: string;
  previousValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  source: string;
  reason: string | null;
  createdAt: string;
}

export interface AuditFilters {
  targetType?: string;
  targetId?: string;
  actorUserId?: string;
  action?: string;
  page?: number;
  limit?: number;
}

// ─── Property for Sale (§6.5, §8.5, §18.6) ────────────────────────────────

export const SALE_UNAVAILABLE_REASONS = ['sold', 'withdrawn', 'no_longer_offered'] as const;
export type SaleUnavailableReason = (typeof SALE_UNAVAILABLE_REASONS)[number];

export type PartyVerificationStatus = 'not_required' | 'pending' | 'verified' | 'failed';

export interface ManagedSaleListing {
  id: string;
  title: string;
  subtype: 'built_property' | 'land';
  publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityState;
  escalationOpen: boolean;
  askingPrice: number;
  updatedAt: string;
}

export interface ReadinessBlocker {
  code: string;
  message: string;
  details?: unknown;
}

export interface Readiness {
  ready: boolean;
  blockers: ReadinessBlocker[];
}

export interface SaleDocumentCheck {
  id: string;
  saleListingId: string;
  documentType: string;
  otherLabel: string | null;
  availability: string;
  legalSearchStatus: string;
  legalSearchReference: string | null;
  source: string | null;
  notes: string | null;
  discrepancyFound: boolean;
  checkedAt: string;
  checkedByUserId: string;
}

export interface SaleListingDetail {
  sale: {
    id: string;
    propertyId: string;
    subtype: 'built_property' | 'land';
    managingAgentId: string;
    title: string;
    askingPrice: number;
    priceBasis: string;
    negotiable: boolean | null;
    availabilityStatus: AvailabilityState;
    unavailableReason: SaleUnavailableReason | null;
    availabilityChangedAt: string | null;
    availabilityConfirmedAt: string | null;
    freshnessExpiresAt: string | null;
    publicationStatus: PublicationStatus;
    sellerName: string;
    sellerPhone: string | null;
    sellerWhatsappPhone: string | null;
    sellerIsOwner: boolean;
    sellerIdentityStatus: PartyVerificationStatus;
    authorityToSellStatus: PartyVerificationStatus;
    contactRoute: string;
    escalationOpen: boolean;
    escalationReason: string | null;
    escalationClearedAt: string | null;
    verifiedAt: string | null;
    publishedAt: string | null;
    suspendedAt: string | null;
    suspensionReason: string | null;
    createdAt: string;
    updatedAt: string;
  };
  property: {
    id: string;
    title: string;
    state: string | null;
    city: string | null;
    area: string | null;
    streetId: string | null;
    verifiedAddress: string | null;
    latitude: number | string | null;
    longitude: number | string | null;
    agentId: string | null;
  };
  documentChecklist: Array<{ key: string; label: string }>;
  documents: SaleDocumentCheck[];
  evidence: Array<{ id: string; kind: string; fileName: string | null; url: string; createdAt: string }>;
  readiness: Readiness;
}

export interface SaleAvailabilityInput {
  status: AvailabilityState;
  reason?: SaleUnavailableReason;
  note?: string;
}

// ─── Verification oversight (§7.6, §8.2, §18.3, §25.2) ───────────────────

export const VERIFICATION_CASE_STATUSES = [
  'pending',
  'in_progress',
  'needs_correction',
  'ready_to_publish',
  'published',
  'suspended',
  'closed',
] as const;
export type VerificationCaseStatus = (typeof VERIFICATION_CASE_STATUSES)[number];

export interface VerificationQueueItem {
  id: string;
  status: VerificationCaseStatus;
  escalated: boolean;
  duplicateCandidates: number;
  duplicateResolved: boolean;
  isReverification: boolean;
  createdAt: string;
  property: {
    id: string;
    title: string;
    category: PropertyCategory;
    area: string | null;
    city: string | null;
    publicationStatus: PublicationStatus;
    operatorId: string | null;
  } | null;
}

export interface VerificationChecklistItem {
  status: 'pending' | 'passed' | 'failed' | 'not_applicable';
  note?: string | null;
  byUserId?: string;
  at?: string;
}

export interface VerificationCaseRecord {
  id: string;
  targetType: ListingTargetType;
  targetId: string;
  status: VerificationCaseStatus;
  assignedAgentId: string | null;
  checklist: Record<string, VerificationChecklistItem>;
  duplicateCandidates: Array<{ targetId: string; score: number; reasons: string[] }>;
  duplicateResolved: boolean;
  correctionNotes: string | null;
  escalated: boolean;
  escalationReason: string | null;
  startedAt: string | null;
  readyAt: string | null;
  publishedAt: string | null;
  closedAt: string | null;
  isReverification: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface VerificationPropertyRecord {
  id: string;
  title: string;
  category: PropertyCategory;
  agentId: string | null;
  operatorId: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: string;
  state: string | null;
  city: string | null;
  area: string | null;
  suspensionReason: string | null;
  sensitiveChangesFrozen: boolean;
  updatedAt: string;
}

export interface VerificationWorkspace {
  case: VerificationCaseRecord;
  property: VerificationPropertyRecord;
  operator: {
    id: string;
    name: string;
    phone: string | null;
    identityStatus: OperatorIdentityStatus;
    operatorType: string;
  } | null;
  units: Array<{ id: string; displayLabel: string | null; verificationStatus: string; availabilityStatus: string }>;
  readiness: Readiness;
}

export interface VerificationEvidenceRow {
  id: string;
  ownerType: string;
  ownerId: string;
  kind: string;
  url: string;
  fileName: string | null;
  mimeType: string | null;
  notes: string | null;
  uploadedByUserId: string;
  createdAt: string;
}

export interface OperatorRecord {
  id: string;
  identityStatus: OperatorIdentityStatus;
  identityReviewNote: string | null;
  identityVerifiedAt: string | null;
}
