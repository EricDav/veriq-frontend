/**
 * Property Operator domain types (Veriq Property System Architecture v1.6.2).
 * Mirrors the NestJS DTOs and response shapes in property-schemas, property-submissions, listing-media,
 * availability, shared-properties and agent-management.
 */

// ─── Shared vocabularies ─────────────────────────────────────────────────

export type OperatorPropertyCategory = 'residential' | 'short_let' | 'hostel';
export type PropertyCategoryValue = OperatorPropertyCategory | 'shared_property' | 'for_sale';

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

export type UnitAvailabilityStatus = 'available' | 'unavailable';

export type RevisionStatus = 'pending' | 'approved' | 'rejected' | 'withdrawn';
export type RevisionKind =
  | 'edit'
  | 'correction_request'
  | 'intelligence_review_request'
  | 'address_correction';
export type RevisionTargetType = 'property' | 'unit' | 'shared_opportunity';

export type ContactType = 'operator' | 'caretaker';

export type EvidenceKind =
  | 'identity'
  | 'selfie_with_id'
  | 'business_registration'
  | 'ownership'
  | 'operating_authority'
  | 'occupancy'
  | 'permission_declaration'
  | 'landlord_confirmation'
  | 'authority_to_sell'
  | 'sale_document'
  | 'other';

export type MediaOwnerType = 'property' | 'unit' | 'shared_opportunity' | 'sale_listing';

// ─── Form schemas (Appendix F/G) ─────────────────────────────────────────

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
  category: PropertyCategoryValue;
  level: SchemaLevel;
  subtype: string | null;
  label: string;
  version: number;
  fields: FieldDef[];
  components: ComponentDef[];
  media: MediaSectionDef[];
  availabilityLabels?: { available: string; unavailable: string };
}

export interface SchemaCatalogueSubtype {
  id: string;
  subtype: string | null;
  label: string;
  level: SchemaLevel;
}

export interface SchemaCatalogueCategory {
  category: PropertyCategoryValue;
  propertySchemaId: string | null;
  subtypes: SchemaCatalogueSubtype[];
}

export interface SchemaCatalogue {
  version: number;
  categories: SchemaCatalogueCategory[];
}

export type AnswerMap = Record<string, unknown>;

export interface SchemaAnswers {
  facts?: AnswerMap;
  commercial?: AnswerMap;
  intelligence?: AnswerMap;
}

export interface SchemaIssue {
  path: string;
  message: string;
}

export interface ReadinessBlocker {
  code: string;
  message: string;
  details?: unknown;
}

export interface ComponentInstance {
  key: string;
  type: string;
  label: string;
  index: number;
}

export type ValidationMode = 'draft' | 'submit' | 'publish';

export interface SchemaValidationResult {
  valid: boolean;
  issues: SchemaIssue[];
  removed: string[];
  components: ComponentInstance[];
  normalized: Required<SchemaAnswers>;
}

// ─── Media (§9, Appendix G) ──────────────────────────────────────────────

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

export type MediaReviewStatus = 'pending_review' | 'approved' | 'rejected' | 'superseded' | 'removed';

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

export interface MediaUploadInput {
  file: File;
  mediaCategory: string;
  componentKey?: string | null;
  replacesMediaId?: string | null;
}

export interface MediaNotApplicableInput {
  mediaCategory: string;
  componentKey?: string | null;
  reason: string;
}

// ─── Location (§4) ───────────────────────────────────────────────────────

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

export interface SubmittedAddress {
  address?: string;
  buildingName?: string | null;
  streetName?: string;
  landmark?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  area?: string;
  localGovernment?: string;
  state?: string;
  correctedAt?: string;
}

// ─── Property submissions (§8.1, §8.4) ───────────────────────────────────

export interface ContactInput {
  contactType: ContactType;
  name: string;
  phone: string;
  whatsappPhone?: string;
}

export interface UnitSubmissionInput {
  displayLabel: string;
  subtype: string;
  facts?: AnswerMap;
  commercial?: AnswerMap;
  intelligence?: AnswerMap;
  availabilityStatus?: UnitAvailabilityStatus;
}

export interface CreatePropertySubmissionInput {
  category: OperatorPropertyCategory;
  title: string;
  location: SubmissionLocationInput;
  knownUnitCount: number;
  property?: { facts?: AnswerMap; intelligence?: AnswerMap };
  units?: UnitSubmissionInput[];
  contact?: ContactInput;
}

export interface UpdatePropertySubmissionInput {
  title?: string;
  location?: SubmissionLocationInput;
  knownUnitCount?: number;
  property?: { facts?: AnswerMap; intelligence?: AnswerMap };
  message?: string;
}

export interface UpdateUnitSubmissionInput {
  displayLabel?: string;
  subtype?: string;
  facts?: AnswerMap;
  commercial?: AnswerMap;
  intelligence?: AnswerMap;
  message?: string;
}

export interface OperatorPropertySummary {
  id: string;
  title: string;
  category: OperatorPropertyCategory;
  area: string;
  city: string;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  knownUnitCount: number | null;
  documentedUnits: number;
  verifiedUnits: number;
  availableUnits: number;
  pendingRevisions: number;
  agentAssigned: boolean;
  updatedAt: string;
}

export interface OperatorAccountSummary {
  id: string;
  identityStatus: OperatorIdentityStatus;
  assignedAgentId: string | null;
}

export interface OperatorPropertiesList {
  operator: OperatorAccountSummary;
  properties: OperatorPropertySummary[];
}

export interface PropertyUnitRecord {
  id: string;
  propertyId: string;
  displayLabel: string;
  unitType: string;
  subtype: string | null;
  schemaVersion: number;
  facts: AnswerMap;
  commercialTerms: AnswerMap;
  intelligence: AnswerMap;
  availabilityStatus: UnitAvailabilityStatus;
  verificationStatus: VerificationStatus;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
  availabilityChangedByUserId: string | null;
  reconfirmPromptedAt: string | null;
  verifiedAt: string | null;
  componentCounts: Record<string, number>;
  createdAt: string;
  updatedAt: string;
}

export interface PropertyUnitView extends PropertyUnitRecord {
  schemaId: string;
  availabilityLabels?: { available: string; unavailable: string };
  components: ComponentInstance[];
  issues: SchemaIssue[];
  media: MediaChecklist;
}

export interface PropertyContactRecord {
  id: string;
  propertyId: string;
  contactType: ContactType | 'resident' | 'seller';
  name: string;
  phone: string;
  whatsappPhone: string | null;
  isCurrent: boolean;
  isVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ListingRevisionRecord {
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

export interface OperatorPropertyRecord {
  id: string;
  title: string;
  category: OperatorPropertyCategory;
  operatorId: string | null;
  agentId: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  state: string;
  city: string;
  area: string;
  address: string;
  localGovernmentId: string | null;
  areaId: string | null;
  streetId: string | null;
  submittedAddress: SubmittedAddress | null;
  verifiedAddress: Record<string, unknown> | null;
  knownUnitCount: number | null;
  propertyFacts: AnswerMap;
  propertyIntelligence: AnswerMap;
  schemaVersion: number;
  submittedAt: string | null;
  verifiedAt: string | null;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  sensitiveChangesFrozen: boolean;
  coverMediaId: string | null;
  createdAt: string;
  updatedAt: string;
  propertySchemaId: string | null;
  issues: SchemaIssue[];
}

export interface OperatorVerificationSummary {
  id: string;
  status: VerificationCaseStatus;
  correctionNotes: string | null;
  isReverification?: boolean;
}

export interface AssignedAgentSummary {
  id: string;
  name: string;
  phone?: string | null;
}

export interface PropertyManagerData {
  role: 'operator' | 'agent' | 'admin';
  property: OperatorPropertyRecord;
  knownUnitCount: number | null;
  documentedUnitCount: number;
  units: PropertyUnitView[];
  contacts: PropertyContactRecord[];
  propertyMedia: MediaChecklist | null;
  verification: OperatorVerificationSummary | null;
  readiness: { ready: boolean; blockers: ReadinessBlocker[] };
  pendingRevisions: ListingRevisionRecord[];
  assignedAgent: AssignedAgentSummary | null;
}

export interface PropertyUpdateResult {
  property: PropertyManagerData;
  revisions: ListingRevisionRecord[];
}

export interface UnitUpdateResult {
  unit: PropertyUnitRecord;
  revisions: ListingRevisionRecord[];
  removedAnswers: string[];
}

export interface EvidenceRecord {
  id: string;
  kind: EvidenceKind;
  fileName: string | null;
  mimeType?: string | null;
  notes?: string | null;
  url?: string;
  createdAt: string;
}

export interface AvailabilityEventRecord {
  id: string;
  targetType: string;
  targetId: string;
  previousStatus: UnitAvailabilityStatus | null;
  newStatus: UnitAvailabilityStatus;
  actorUserId: string;
  source: string;
  reason: string | null;
  createdAt: string;
}

// ─── Shared Property (§6.4, §18.5) ───────────────────────────────────────

export type SharedOpportunityType = 'private_room' | 'shared_room_bedspace';

export interface SharedOpportunitySummary {
  id: string;
  displayLabel: string;
  opportunityType: SharedOpportunityType;
  area: string;
  city: string;
  publicationStatus: PublicationStatus;
  availabilityStatus: UnitAvailabilityStatus;
  reverificationRequired: boolean;
  updatedAt: string;
}

export interface SharedOpportunityRecord {
  id: string;
  operatorId: string;
  agentId: string | null;
  displayLabel: string;
  opportunityType: SharedOpportunityType;
  state: string;
  city: string;
  area: string;
  localGovernmentId: string | null;
  areaId: string | null;
  streetId: string | null;
  submittedAddress: SubmittedAddress | null;
  facts: AnswerMap;
  commercialTerms: AnswerMap;
  intelligence: AnswerMap;
  agentObservation: string | null;
  contactName: string;
  contactPhone: string;
  contactWhatsappPhone: string | null;
  availabilityStatus: UnitAvailabilityStatus;
  availabilityChangedAt: string | null;
  availabilityConfirmedAt: string | null;
  freshnessExpiresAt: string | null;
  reconfirmPromptedAt: string | null;
  publicationStatus: PublicationStatus;
  verificationStatus: VerificationStatus;
  verifiedAt: string | null;
  reverificationRequired: boolean;
  permissionDeclaredAt: string | null;
  publishedAt: string | null;
  suspendedAt: string | null;
  suspensionReason: string | null;
  coverMediaId: string | null;
  schemaVersion: number;
  createdAt: string;
  updatedAt: string;
  schemaId: string;
  issues: SchemaIssue[];
}

export interface SharedManagerData {
  role: 'operator' | 'agent' | 'admin';
  opportunity: SharedOpportunityRecord;
  verification: OperatorVerificationSummary | null;
  readiness: { ready: boolean; blockers: ReadinessBlocker[] };
  media: MediaChecklist;
  pendingRevisions: ListingRevisionRecord[];
}

export interface CreateSharedOpportunityInput {
  opportunityType: SharedOpportunityType;
  displayLabel: string;
  location: SubmissionLocationInput;
  facts?: AnswerMap;
  commercial?: AnswerMap;
  intelligence?: AnswerMap;
  contactName: string;
  contactPhone: string;
  contactWhatsappPhone?: string;
  permissionDeclared: boolean;
}

export interface UpdateSharedOpportunityInput {
  displayLabel?: string;
  facts?: AnswerMap;
  commercial?: AnswerMap;
  intelligence?: AnswerMap;
  contactName?: string;
  contactPhone?: string;
  contactWhatsappPhone?: string;
  message?: string;
}

export interface SharedUpdateResult {
  opportunity: SharedManagerData;
  revision: ListingRevisionRecord | null;
}

// ─── Referral (§3.2) ─────────────────────────────────────────────────────

export interface ReferralCodeValidation {
  valid: boolean;
  agentName: string;
}

// ─── Operator posting gate (Blueprint §3) ────────────────────────────────

export type PostingRequirementKey = 'phone_otp' | 'government_id' | 'selfie_with_id';

/** One requirement of the pre-posting gate, with the wording the API supplies for it. */
export interface PostingRequirement {
  requirement: PostingRequirementKey;
  code: string;
  label: string;
  message: string;
  satisfied: boolean;
}

/**
 * Whether this Operator may post yet. Signup needs only category, name, email and Operator Terms; phone OTP, a
 * government ID and a selfie holding that ID are required before posting, and Veriq may ask for limited further
 * evidence (Master Blueprint §3).
 */
export interface PostingReadiness {
  operatorId: string;
  categories: PropertyCategoryValue[];
  legalName: string | null;
  termsAccepted: boolean;
  termsVersion: string | null;
  termsAcceptedAt: string | null;
  identityStatus: OperatorIdentityStatus;
  identityReviewNote: string | null;
  canPost: boolean;
  requirements: PostingRequirement[];
  furtherEvidenceRequested: boolean;
  furtherEvidenceRequestedAt: string | null;
  furtherEvidenceNote: string | null;
}

export type OperatorIdentityEvidenceKind = 'government_id' | 'selfie_with_id';

export interface OperatorIdentityEvidenceInput {
  kind: OperatorIdentityEvidenceKind;
  file: File;
  /** Which government ID this is, for example nin or international_passport. Required for a government ID. */
  idType?: string;
  /** Only the last characters are retained by Veriq; the full number is never stored. */
  idNumber?: string;
  notes?: string;
}

export interface OperatorIdentityEvidenceRecord {
  id: string;
  kind: string;
  fileName: string | null;
  notes?: string | null;
  createdAt: string;
}

export interface OperatorIdentityEvidenceResult extends OperatorIdentityEvidenceRecord {
  identityStatus: OperatorIdentityStatus;
  canPost: boolean;
  requirements: PostingRequirement[];
}

// ─── Operator listing declaration (Blueprint §3) ─────────────────────────

export interface ListingDeclarationClause {
  id: string;
  text: string;
}

/** The versioned four-clause declaration. Every submission renders these clauses verbatim. */
export interface ListingDeclaration {
  id: string;
  version: string;
  effectiveFrom: string;
  clauses: ListingDeclarationClause[];
}

/** Sent with every submission, including a re-submission after a correction: acceptance is never carried over. */
export interface ListingDeclarationAcceptanceInput {
  version: string;
  accepted: true;
}

export interface SubmitListingInput {
  declaration: ListingDeclarationAcceptanceInput;
}

// ─── Property for Sale, owner side (Blueprint §6) ────────────────────────

export type SaleSubtype = 'built_property' | 'land';
export type SalePriceBasis = 'total' | 'per_plot' | 'per_square_metre';
export type SaleOutcomeValue = 'completed' | 'withdrawn';
export type PartyVerificationStatus = 'not_required' | 'pending' | 'verified' | 'failed';
export type SalesAgreementStatus = 'draft' | 'signed' | 'cancelled';

export interface SaleDocumentStatusView {
  documentType: string;
  label: string;
  availability: string;
  availabilityLabel: string;
  legalSearchStatus: string;
  legalSearchLabel: string;
  checkedAt: string | null;
}

export interface SalesAgreementView {
  id: string;
  status: SalesAgreementStatus;
  commissionPercent: number;
  agentSharePercent: number;
  signedAt: string | null;
  signedByOwnerName: string | null;
  signedByAdminUserId: string | null;
  documentUrl: string | null;
}

export interface SaleSubmissionSummary {
  id: string;
  title: string;
  subtype: SaleSubtype;
  publicationStatus: PublicationStatus;
  availabilityStatus: UnitAvailabilityStatus;
  saleOutcome: SaleOutcomeValue | null;
  askingPrice: number;
  correctionNote: string | null;
  updatedAt: string;
}

/** The owner's own view of their submission: what they sent, and what Veriq still needs. */
export interface SaleOwnerView {
  sale: SaleSubmissionSummary & {
    propertyId: string;
    facts: Record<string, unknown>;
    intelligence: Record<string, unknown>;
    priceBasis: SalePriceBasis | string;
    negotiable: boolean | null;
    ownerIdentityStatus: PartyVerificationStatus;
    authorityToSellStatus: PartyVerificationStatus;
    physicalVisitAt: string | null;
    submittedAt: string | null;
    publishedAt: string | null;
    salePriceAmount: number | null;
    commissionAmount: number | null;
  };
  property: { id: string; state: string; city: string; area: string };
  documentChecklist: Array<{ key: string; label: string }>;
  documentStatuses: SaleDocumentStatusView[];
  myDocuments: OperatorIdentityEvidenceRecord[];
  agreement: SalesAgreementView | null;
  outstanding: ReadinessBlocker[];
}

export interface CreateSaleListingInput {
  /** Active acceptance that the submitter owns the property and may sell it; never defaulted (§6). */
  ownerDeclaration: true;
  subtype: SaleSubtype;
  title: string;
  propertyId?: string;
  location?: SubmissionLocationInput;
  askingPrice: number;
  priceBasis: SalePriceBasis;
  negotiable?: boolean;
  facts?: AnswerMap;
  intelligence?: AnswerMap;
}

export interface UpdateSaleListingInput {
  title?: string;
  askingPrice?: number;
  priceBasis?: SalePriceBasis;
  negotiable?: boolean;
  facts?: AnswerMap;
  intelligence?: AnswerMap;
}
