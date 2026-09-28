/**
 * Veriq Agent workspace types (Architecture v1.6.2 §2.4, §8, §15, §17.3, §24).
 * Shapes mirror the NestJS response payloads of the verification, street-links, listing-media,
 * property-submissions, shared-properties, sale-listings, property-schemas, agent-earnings and
 * agent-management modules.
 */

// ─── Shared enums (string unions mirror backend enums) ──────────────────────

export type PropertyCategory = 'residential' | 'short_let' | 'hostel' | 'shared_property' | 'for_sale';

export type PublicationStatus =
  | 'draft'
  | 'submitted'
  | 'verification_in_progress'
  | 'needs_correction'
  | 'ready_to_publish'
  | 'published'
  | 'suspended'
  | 'archived';

export type VerificationStatus =
  | 'not_started'
  | 'pending'
  | 'in_review'
  | 'needs_more_information'
  | 'verified'
  | 'rejected'
  | 'suspended';

export type VerificationCaseStatus =
  | 'pending'
  | 'in_progress'
  | 'needs_correction'
  | 'ready_to_publish'
  | 'published'
  | 'suspended'
  | 'closed';

export type OperatorIdentityStatus =
  | 'account_submitted'
  | 'identity_pending'
  | 'identity_verified'
  | 'identity_rejected';

export type AvailabilityStatus = 'available' | 'unavailable';

export type ChecklistItemStatus = 'pending' | 'passed' | 'failed' | 'not_applicable';

export const VERIFICATION_CHECKLIST_KEYS = [
  'authority',
  'identity',
  'location',
  'duplicate',
  'facts',
  'media',
  'intelligence',
  'streetLink',
  'units',
  'commercial',
] as const;
export type VerificationChecklistKey = (typeof VERIFICATION_CHECKLIST_KEYS)[number];

/** Shared Property checks (no Units); re-verification needs only authority/facts/commercial (§28.2). */
export const SHARED_CHECK_KEYS: readonly VerificationChecklistKey[] = [
  'authority',
  'identity',
  'location',
  'duplicate',
  'facts',
  'media',
  'intelligence',
  'streetLink',
  'commercial',
];
export const SHARED_REVERIFICATION_CHECK_KEYS: readonly VerificationChecklistKey[] = [
  'authority',
  'facts',
  'commercial',
];

export interface ChecklistItem {
  status: ChecklistItemStatus;
  note?: string | null;
  byUserId?: string;
  at?: string;
}

export type Checklist = Partial<Record<VerificationChecklistKey, ChecklistItem>>;

// ─── Readiness / blockers / schema issues ───────────────────────────────────

export interface ReadinessBlocker {
  code: string;
  message: string;
  details?: unknown;
}

export interface Readiness {
  ready: boolean;
  blockers: ReadinessBlocker[];
}

export interface SchemaIssue {
  path: string;
  message: string;
}

// ─── Property schemas (Appendix F/G) ────────────────────────────────────────

export type FieldType =
  | 'select'
  | 'multiselect'
  | 'integer'
  | 'money'
  | 'text'
  | 'condition'
  | 'presence'
  | 'ordinal'
  | 'defects'
  | 'observation'
  | 'url';

export type FieldGroup = 'facts' | 'commercial' | 'intelligence';

export interface FieldCondition {
  field: string;
  in: Array<string | number>;
}

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  key: string;
  label: string;
  type: FieldType;
  group: FieldGroup;
  required: boolean;
  options?: FieldOption[];
  min?: number;
  max?: number;
  fixed?: number | string;
  requiredWhen?: FieldCondition;
  visibleWhen?: FieldCondition;
  component?: string;
  public?: boolean;
  descriptionField?: string;
  help?: string;
}

export interface ComponentDef {
  key: string;
  label: string;
  countField?: string;
  fixedCount?: number;
  max: number;
}

export interface MediaSectionDef {
  key: string;
  label: string;
  min: number;
  max: number;
  component?: string;
  requiredWhen?: FieldCondition;
  coverEligible?: boolean;
}

export type SchemaLevel = 'property' | 'unit' | 'shared_opportunity' | 'sale_listing';

export interface FormSchema {
  id: string;
  category: PropertyCategory;
  level: SchemaLevel;
  subtype: string | null;
  label: string;
  version: number;
  fields: FieldDef[];
  components: ComponentDef[];
  media: MediaSectionDef[];
  availabilityLabels?: { available: string; unavailable: string };
}

export interface SchemaCatalogue {
  version: number;
  categories: Array<{
    category: PropertyCategory;
    propertySchemaId: string | null;
    subtypes: Array<{ id: string; subtype: string | null; label: string; level: SchemaLevel }>;
  }>;
}

export interface ComponentInstance {
  key: string;
  type: string;
  label: string;
  index: number;
}

export interface SchemaAnswers {
  facts?: Record<string, unknown>;
  commercial?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
}

// ─── Listing media (§9) ─────────────────────────────────────────────────────

export type MediaOwnerType = 'property' | 'unit' | 'shared_opportunity' | 'sale_listing';

export type MediaReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'superseded' | 'removed';

export type MediaSectionState =
  | 'satisfied'
  | 'missing'
  | 'pending_review'
  | 'not_applicable'
  | 'at_limit'
  | 'optional';

export interface MediaChecklistSection {
  key: string;
  label: string;
  componentKey: string | null;
  required: boolean;
  min: number;
  max: number;
  approved: number;
  pending: number;
  state: MediaSectionState;
  coverEligible: boolean;
}

export interface MediaChecklist {
  schemaId: string;
  schemaVersion: number;
  complete: boolean;
  sections: MediaChecklistSection[];
  coverMediaId: string | null;
  coverRequired: boolean;
}

export interface ListingMediaItem {
  id: string;
  mediaCategory: string | null;
  componentKey: string | null;
  unitId: string | null;
  reviewStatus: MediaReviewStatus;
  visibility: 'public' | 'unlock_only';
  source: 'operator' | 'agent' | 'admin' | 'legacy';
  isCover: boolean;
  replacesMediaId: string | null;
  lowResolution: boolean;
  width: number | null;
  height: number | null;
  url: string;
  variants: Record<string, string> | null;
  caption: string | null;
  rejectionReason: string | null;
  createdAt: string;
}

export interface ListingMediaView {
  items: ListingMediaItem[];
  checklist: MediaChecklist;
}

export type MediaExceptionStatus = 'requested' | 'verified' | 'rejected' | 'withdrawn';

export interface MediaException {
  id: string;
  ownerType: MediaOwnerType;
  ownerId: string;
  mediaCategory: string;
  componentKey: string | null;
  reason: string;
  status: MediaExceptionStatus;
  decisionNote: string | null;
  createdAt: string;
}

// ─── Street Intelligence linkage (§24) ──────────────────────────────────────

export type StreetLinkTargetType = 'property' | 'shared_opportunity';

export interface StreetSummary {
  id: string;
  streetName: string;
  area: string;
  city: string;
  state: string;
  status: 'pending' | 'approved' | 'rejected' | 'disabled';
  areaId: string | null;
  locationId: string | null;
  readableId?: string | null;
  landmark?: string | null;
}

export interface StreetIntelligenceLink {
  id: string;
  targetType: StreetLinkTargetType;
  targetId: string;
  streetId: string;
  isCurrent: boolean;
  intelligenceSource: 'existing' | 'initial_veriq' | string;
  linkedByUserId: string;
  unlinkedAt: string | null;
  reason: string | null;
  createdAt: string;
}

export interface StreetLinkState {
  link: StreetIntelligenceLink | null;
  street: StreetSummary | null;
  streetApproved: boolean;
  hasIntelligence: boolean;
  canLinkExisting: boolean;
  canProvideInitial: boolean;
  publicationReady: boolean;
}

export interface InitialIntelligenceAnswer {
  categoryId: string;
  optionId: string;
  supplementaryValue?: string[];
}

export interface InitialIntelligenceResult {
  streetId: string;
  observations: number;
  sourceLabel: string;
}

// ─── Verification (§8.2) ────────────────────────────────────────────────────

export interface DuplicateCandidate {
  targetId: string;
  score: number;
  reasons: string[];
}

export interface VerificationCase {
  id: string;
  targetType: 'property' | 'shared_opportunity' | 'sale_listing';
  targetId: string;
  status: VerificationCaseStatus;
  assignedAgentId: string | null;
  checklist: Checklist;
  duplicateCandidates: DuplicateCandidate[];
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
    area: string;
    city: string;
    publicationStatus: PublicationStatus;
    operatorId: string | null;
  } | null;
}

export interface AddressRecord {
  address?: string;
  buildingName?: string | null;
  streetName?: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area?: string;
  localGovernment?: string;
  state?: string;
  verifiedAt?: string;
  correctedAt?: string;
  [key: string]: unknown;
}

export interface WorkspaceProperty {
  id: string;
  title: string;
  category: PropertyCategory;
  propertySubtype: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  operatorId: string | null;
  agentId: string | null;
  state: string;
  city: string;
  area: string;
  address: string | null;
  localGovernmentId: string | null;
  areaId: string | null;
  streetId: string | null;
  submittedAddress: AddressRecord | null;
  verifiedAddress: AddressRecord | null;
  latitude: number | string | null;
  longitude: number | string | null;
  knownUnitCount: number | null;
  propertyFacts: Record<string, unknown>;
  propertyIntelligence: Record<string, unknown>;
  sensitiveChangesFrozen: boolean;
  suspensionReason: string | null;
  publishedAt: string | null;
  verifiedAt: string | null;
  updatedAt: string;
}

export interface WorkspaceOperator {
  id: string;
  name: string;
  phone: string | null;
  identityStatus: OperatorIdentityStatus;
  operatorType: 'individual' | 'business';
}

export interface WorkspaceUnit {
  id: string;
  propertyId: string;
  displayLabel: string;
  unitType: string;
  subtype: string | null;
  facts: Record<string, unknown>;
  commercialTerms: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  availabilityStatus: AvailabilityStatus;
  verificationStatus: VerificationStatus;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
  verifiedAt: string | null;
  componentCounts: Record<string, number>;
  updatedAt: string;
  schemaId: string;
  components: ComponentInstance[];
  issues: SchemaIssue[];
  media: MediaChecklist | null;
}

export interface VerificationWorkspace {
  case: VerificationCase;
  property: WorkspaceProperty;
  propertyIssues: SchemaIssue[];
  operator: WorkspaceOperator | null;
  units: WorkspaceUnit[];
  propertyMedia: MediaChecklist | null;
  street: StreetLinkState;
  readiness: Readiness;
}

export interface DuplicateDecisionInput {
  decision: 'not_duplicate' | 'duplicate';
  duplicateOfId?: string;
  note: string;
}

export interface VerifyLocationInput {
  address: string;
  latitude: number;
  longitude: number;
  landmark?: string;
}

export interface CorrectPropertyInput {
  title?: string;
  knownUnitCount?: number;
  facts?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
}

export interface CorrectUnitInput {
  displayLabel?: string;
  subtype?: string;
  facts?: Record<string, unknown>;
  commercial?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
}

export type EvidenceKind =
  | 'identity'
  | 'business_registration'
  | 'ownership'
  | 'operating_authority'
  | 'occupancy'
  | 'permission_declaration'
  | 'landlord_confirmation'
  | 'selfie_with_id'
  | 'seller_identity'
  | 'authority_to_sell'
  | 'sale_document'
  | 'refund_evidence'
  | 'other';

export interface VerificationEvidence {
  id: string;
  ownerType?: string;
  ownerId?: string;
  kind: EvidenceKind;
  url: string;
  fileName: string | null;
  mimeType?: string | null;
  notes?: string | null;
  uploadedByUserId?: string;
  createdAt: string;
}

// ─── Revisions (§8.4) ───────────────────────────────────────────────────────

export type RevisionTargetType = 'property' | 'unit' | 'shared_opportunity';
export type RevisionKind = 'edit' | 'correction_request' | 'intelligence_review_request' | 'address_correction';
export type RevisionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';

export interface ListingRevision {
  id: string;
  targetType: RevisionTargetType;
  targetId: string;
  propertyId: string | null;
  kind: RevisionKind;
  proposedChanges: Record<string, unknown>;
  baseSnapshot: Record<string, unknown>;
  message: string | null;
  status: RevisionStatus;
  proposedByUserId: string;
  reviewedByUserId: string | null;
  reviewNote: string | null;
  reviewedAt: string | null;
  appliedChanges: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Unit availability (§10) ────────────────────────────────────────────────

export interface UnitAvailabilityRecord {
  id: string;
  availabilityStatus: AvailabilityStatus;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
}

// ─── Shared Property (§6.4) ─────────────────────────────────────────────────

export type SharedOpportunityType = 'private_room' | 'shared_room_bedspace';

export interface SharedOpportunity {
  id: string;
  operatorId: string;
  agentId: string | null;
  canonicalPropertyId: string | null;
  displayLabel: string;
  opportunityType: SharedOpportunityType;
  state: string;
  city: string;
  area: string;
  localGovernmentId: string | null;
  areaId: string | null;
  streetId: string | null;
  submittedAddress: AddressRecord | null;
  verifiedAddress: AddressRecord | null;
  latitude: number | string | null;
  longitude: number | string | null;
  facts: Record<string, unknown>;
  commercialTerms: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  componentCounts: Record<string, number>;
  agentObservation: string | null;
  contactName: string;
  contactPhone: string;
  contactWhatsappPhone: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  reverificationRequired: boolean;
  permissionDeclaredAt: string | null;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SharedQueueItem extends VerificationCase {
  opportunity: SharedOpportunity | null;
}

export interface SharedManageView {
  role: 'operator' | 'agent' | 'admin';
  opportunity: SharedOpportunity & { schemaId: string; issues: SchemaIssue[] };
  verification: {
    id: string;
    status: VerificationCaseStatus;
    checklist: Checklist;
    correctionNotes: string | null;
    isReverification: boolean;
  } | null;
  readiness: Readiness;
  media: MediaChecklist;
  street: StreetLinkState | null;
  pendingRevisions: ListingRevision[];
}

export interface SharedLocationInput {
  address: string;
  latitude: number;
  longitude: number;
  canonicalPropertyId?: string;
}

export interface UpdateSharedInput {
  displayLabel?: string;
  facts?: Record<string, unknown>;
  commercial?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
  agentObservation?: string;
}

// ─── Property for Sale (§6.5, §8.5) ─────────────────────────────────────────

export type SaleSubtype = 'built_property' | 'land';
export type SalePriceBasis = 'total' | 'per_plot' | 'per_square_metre' | 'other';
export type SaleUnavailableReason = 'sold' | 'withdrawn' | 'no_longer_offered';
export type PartyVerificationStatus = 'not_required' | 'pending' | 'verified' | 'failed';
export type SaleOutcomeValue = 'completed' | 'withdrawn';
export type SalesAgreementStatus = 'draft' | 'signed' | 'cancelled';
export type SaleEnquiryStatus = 'new' | 'contacted' | 'closed';
export type SaleDocumentAvailability =
  | 'available'
  | 'not_available'
  | 'not_presented'
  | 'sighted'
  | 'requires_further_verification';
export type LegalSearchStatus =
  | 'not_performed'
  | 'requested'
  | 'completed_no_issues'
  | 'completed_issues_found';

export interface SaleDocumentType {
  key: string;
  label: string;
}

export interface SaleDocumentTypesPayload {
  subtype: SaleSubtype;
  documentTypes: SaleDocumentType[];
  availability: Record<SaleDocumentAvailability, string>;
  legalSearch: Record<LegalSearchStatus, string>;
}

export interface SaleDocumentCheck {
  documentType: string;
  label: string;
  availability: SaleDocumentAvailability;
  availabilityLabel: string;
  legalSearchStatus: LegalSearchStatus;
  legalSearchLabel: string;
  checkedAt: string | null;
  notes?: string | null;
  source?: string | null;
  legalSearchReference?: string | null;
  discrepancyFound?: boolean;
}

/**
 * Owner-submitted Sale Listing as the managing Agent and Admin see it (Master Blueprint §6). There is no
 * Agent-created listing and no unlock fee; Veriq is the buyer contact and the owner's contact is never displayed.
 */
export interface SaleListing {
  id: string;
  propertyId: string;
  subtype: SaleSubtype;
  operatorId: string;
  managingAgentId: string;
  title: string;
  askingPrice: number;
  priceBasis: SalePriceBasis;
  negotiable: boolean | null;
  availabilityStatus: AvailabilityStatus;
  unavailableReason: SaleUnavailableReason | null;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
  publicationStatus: PublicationStatus;
  ownerDeclaredAt: string | null;
  ownerIdentityStatus: PartyVerificationStatus;
  authorityToSellStatus: PartyVerificationStatus;
  physicalVisitAt: string | null;
  physicalVisitByUserId: string | null;
  physicalVisitNotes: string | null;
  facts: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  componentCounts: Record<string, number>;
  escalationOpen: boolean;
  escalationReason: string | null;
  escalationClearedAt: string | null;
  correctionNote: string | null;
  submittedAt: string | null;
  verifiedAt: string | null;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  saleOutcome: SaleOutcomeValue | null;
  salePriceAmount: number | null;
  saleCompletedAt: string | null;
  outcomeNotes: string | null;
  outcomeRecordedAt: string | null;
  commissionAmount: number | null;
  commissionPercentApplied: number | null;
  agentShareAmount: number | null;
  agentSharePercentApplied: number | null;
  createdByUserId: string;
  createdAt: string;
  updatedAt: string;
}

export interface SaleManagedItem {
  id: string;
  title: string;
  subtype: SaleSubtype;
  publicationStatus: PublicationStatus;
  availabilityStatus: AvailabilityStatus;
  saleOutcome: SaleOutcomeValue | null;
  askingPrice: number;
  correctionNote: string | null;
  updatedAt: string;
}

export interface SalesAgreement {
  id: string;
  status: SalesAgreementStatus;
  commissionPercent: number;
  agentSharePercent: number;
  signedAt: string | null;
  signedByOwnerName: string | null;
  signedByAdminUserId: string | null;
  documentUrl: string | null;
}

/** A buyer enquiry routed to Veriq: the only contact route for a sale listing (§6). */
export interface SaleEnquiry {
  id: string;
  name: string;
  phone: string;
  email: string | null;
  message: string;
  status: SaleEnquiryStatus;
  handledByUserId: string | null;
  createdAt: string;
}

export interface SaleManageView {
  sale: SaleListing & { schemaId: string; components: ComponentInstance[]; issues: SchemaIssue[] };
  owner: {
    operatorId: string;
    userId: string;
    legalName: string | null;
    identityStatus: OperatorIdentityStatus | null;
    declaredAt: string | null;
  };
  property: {
    id: string;
    title: string;
    state: string;
    city: string;
    area: string;
    streetId: string | null;
    verifiedAddress: AddressRecord | null;
    latitude: number | string | null;
    longitude: number | string | null;
    agentId: string | null;
    operatorId: string | null;
  };
  documentChecklist: SaleDocumentType[];
  documents: SaleDocumentCheck[];
  evidence: Array<{
    id: string;
    kind: EvidenceKind;
    fileName: string | null;
    url: string;
    uploadedByUserId: string;
    createdAt: string;
  }>;
  agreement: SalesAgreement | null;
  enquiries: SaleEnquiry[];
  readiness: Readiness;
  media: MediaChecklist;
  street: StreetLinkState;
}

export interface SubmissionLocationInput {
  localGovernmentId: string;
  areaId: string;
  streetId?: string;
  proposedStreetName?: string;
  address: string;
  buildingName?: string;
  landmark?: string;
  latitude?: number;
  longitude?: number;
}

export interface UpdateSaleListingInput {
  title?: string;
  askingPrice?: number;
  priceBasis?: SalePriceBasis;
  negotiable?: boolean;
  facts?: Record<string, unknown>;
  intelligence?: Record<string, unknown>;
}

export interface DocumentCheckInput {
  documentType: string;
  otherLabel?: string;
  availability: SaleDocumentAvailability;
  legalSearchStatus?: LegalSearchStatus;
  legalSearchReference?: string;
  source?: string;
  notes?: string;
  discrepancyFound?: boolean;
}

/** Owner identity and authority to sell, reviewed from the submitted documents (§6). */
export interface PartyStatusInput {
  ownerIdentityStatus?: PartyVerificationStatus;
  authorityToSellStatus?: PartyVerificationStatus;
  note?: string;
}

export interface PhysicalVisitInput {
  /** ISO timestamp of the visit; defaults to now and may never be in the future. */
  visitedAt?: string;
  notes: string;
}

export interface SalesAgreementInput {
  commissionPercent?: number;
  agentSharePercent?: number;
  notes?: string;
}

export interface SignSalesAgreementInput {
  signedByOwnerName: string;
  signedAt?: string;
  documentUrl?: string;
  notes?: string;
}

/** Recording a completed sale is what triggers the owner-paid commission (§6). */
export interface SaleOutcomeInput {
  outcome: SaleOutcomeValue;
  salePriceAmount?: number;
  completedAt?: string;
  notes?: string;
}

export interface SaleAvailabilityInput {
  status: AvailabilityStatus;
  reason?: SaleUnavailableReason;
  note?: string;
}

export interface UpdateSaleEnquiryInput {
  status: SaleEnquiryStatus;
  note?: string;
}

// ─── Earnings (§15, §28.4) ──────────────────────────────────────────────────

export type AgentEarningKind = 'unlock' | 'adjustment' | 'legacy_migration';
export type AgentEarningStatus = 'pending' | 'refund_review_hold' | 'withdrawable' | 'withdrawn' | 'cancelled';
export type AgentPayoutStatus = 'requested' | 'paid' | 'rejected';

export interface EarningBuckets {
  pending: number;
  refundReviewHold: number;
  withdrawable: number;
  inWithdrawal: number;
  withdrawn: number;
  cancelled: number;
  adjustments: number;
}

export interface AgentEarning {
  id: string;
  agentId: string;
  kind: AgentEarningKind;
  consultationId: string | null;
  amount: number;
  basisAmount: number;
  sharePercent: number | null;
  status: AgentEarningStatus;
  holdUntil: string | null;
  withdrawableAt: string | null;
  cancelledAt: string | null;
  cancelReason: string | null;
  refundRequestId: string | null;
  adjustsEarningId: string | null;
  note: string | null;
  propertyId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentPayout {
  id: string;
  agentId: string;
  amount: number;
  status: AgentPayoutStatus;
  reference: string;
  bankSnapshot: { bankName?: string; bankAccountName?: string; bankAccountNumber?: string } | null;
  note: string | null;
  decidedAt: string | null;
  decisionNote: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentEarningsPayload {
  agentId: string;
  buckets: EarningBuckets;
  bucketsFormatted: Record<keyof EarningBuckets, string>;
  minWithdrawalAmount: number;
  hasPendingWithdrawal: boolean;
  isEligible: boolean;
  nextReleaseAt: string | null;
  bankDetailsComplete: boolean;
  earnings: AgentEarning[];
  payouts: AgentPayout[];
}

// ─── Portfolio (§3, §16) ────────────────────────────────────────────────────

export interface AgentPortfolioSummary {
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

export interface PortfolioOperator {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  identityStatus: OperatorIdentityStatus;
  categories: PropertyCategory[] | null;
  referralCodeUsed: string | null;
  propertyCount: number;
}

export interface PortfolioProperty {
  id: string;
  title: string;
  category: PropertyCategory;
  operatorId: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  area: string;
  city: string;
  updatedAt: string;
}

export interface AgentPortfolio {
  agent: AgentPortfolioSummary;
  operators: PortfolioOperator[];
  properties: PortfolioProperty[];
}

// ─── Notifications used for Not Applicable requests ────────────────────────

export interface AgentNotification {
  id: string;
  type: string;
  title: string;
  message: string;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  readAt: string | null;
  createdAt: string;
}
