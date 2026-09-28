/**
 * Renter-facing types for the v1.6.2 unlock, refund, wallet-credit, outcome, Shared Property and
 * Property for Sale flows. Shapes mirror the NestJS response payloads (inside the `data` envelope).
 */

import type { UnlockedPropertyPackage } from '@/types';

// ─── Listings ─────────────────────────────────────────────────────────────

export type ListingTargetType = 'property' | 'shared_opportunity' | 'sale_listing';

export type ListingCategory = 'residential' | 'short_let' | 'hostel' | 'shared_property' | 'for_sale';

export type AvailabilityStatus = 'available' | 'unavailable';

export interface ListingSummary {
  targetType: ListingTargetType;
  targetId: string;
  title: string;
  category: ListingCategory | string;
  area: string | null;
  city: string | null;
}

// ─── No available unit → no unlock (Blueprint §5) ──────────────────────────

/**
 * Why a paid unlock is unavailable. `no_available_unit` means the whole listing has nothing available, so a
 * "Notify me when available" watch is the right next step; `no_unit_for_dates` means only the selected nights are
 * taken, which different dates fix.
 */
export type UnlockBlockedReason = 'no_available_unit' | 'no_unit_for_dates';

/** A published listing in the same area and category that does have an available unit right now. */
export interface SimilarAvailableListing {
  id: string;
  title: string;
  category: ListingCategory | string;
  area: string | null;
  city: string | null;
  coverImageUrl: string | null;
  rentAmount: number;
}

/** The unlock gate carried by both the public detail payload and the unlock quote. */
export interface UnlockGate {
  canUnlock: boolean;
  unlockBlockedReason: UnlockBlockedReason | null;
  notifyMeAvailable: boolean;
  similarAvailable: SimilarAvailableListing[];
}

// ─── Availability notifications (Blueprint §5) ─────────────────────────────

export type AvailabilityWatchStatus = 'waiting' | 'notified' | 'cancelled';

export interface AvailabilityWatch {
  id: string;
  targetType: ListingTargetType;
  targetId: string;
  title: string | null;
  area: string | null;
  city: string | null;
  status: AvailabilityWatchStatus;
  notifiedAt: string | null;
  createdAt: string;
}

// ─── Short Let unit calendar (Blueprint §5) ────────────────────────────────

export type UnitCalendarPeriodKind = 'booked' | 'blocked';

/** A half-open `[startDate, endDate)` range: the Unit is free again on the end date. */
export interface UnitCalendarPeriod {
  id: string;
  unitId: string;
  kind: UnitCalendarPeriodKind;
  startDate: string;
  endDate: string;
  nights: number;
  reason: string | null;
  source: string | null;
  cancelledAt: string | null;
  createdAt: string;
}

export interface UnitCalendar {
  unitId: string;
  propertyId: string;
  displayLabel: string;
  availabilityStatus: AvailabilityStatus;
  today: string;
  bookableFrom: string;
  bookableUntil: string;
  maxStayNights: number;
  viewerIsManager: boolean;
  periods: UnitCalendarPeriod[];
}

export interface AddUnitCalendarPeriodInput {
  kind: UnitCalendarPeriodKind;
  startDate: string;
  endDate: string;
  reason?: string;
}

// ─── Unlocks ──────────────────────────────────────────────────────────────

export type UnlockStatus =
  | 'pending_payment'
  | 'paid'
  | 'unlocked'
  | 'expired'
  | 'refund_requested'
  | 'refunded'
  | 'payment_failed'
  | 'cancelled'
  | 'duplicate_payment';

export type UnlockPriceSource = 'free_unlock' | 'listing_override' | string;

export interface UnlockQuote {
  listing: ListingSummary;
  price: number;
  priceFormatted: string;
  standardPrice: number;
  isFreeUnlock: boolean;
  freeUnlockEndsAt: string | null;
  walletCreditAvailable: number;
  walletCreditApplied: number;
  remainingToPay: number;
  noAdditionalPaymentNeeded: boolean;
  accessHours: number;
  refundWindowHours: number;
  availability: {
    overall: AvailabilityStatus;
    documentedUnits: number;
    availableUnits: number;
    /** The dates the quote was checked against, for a Short Let searched by date. */
    requestedDates: { checkIn: string; checkOut: string; nights: number } | null;
    disclosure: string | null;
  };
  canUnlock: boolean;
  blockedReason: UnlockBlockedReason | null;
  notifyMeAvailable: boolean;
  included: string[];
  disclosures: { refund: string; value: string };
  alreadyUnlocked: { consultationId: string; accessExpiresAt: string | null } | null;
  viewerIsManager: boolean;
  signInRequired: boolean;
}

export interface UnlockView {
  id: string;
  targetType: ListingTargetType;
  targetId: string;
  status: UnlockStatus;
  isActive: boolean;
  feeAmount: number;
  walletAmount: number;
  externalAmount: number;
  priceSource: UnlockPriceSource | null;
  paymentReference: string;
  unlockedAt: string | null;
  accessExpiresAt: string | null;
  refundDeadlineAt: string | null;
  refundWindowOpen: boolean;
  failureReason: string | null;
  checkoutUrl: string | null;
  createdAt: string;
}

export interface UnlockHistoryItem extends UnlockView {
  listing: ListingSummary | null;
}

export type UnlockCheckoutState = 'unlocked' | 'already_unlocked' | 'payment_required' | 'closed';

export interface InitiateUnlockResult {
  state: UnlockCheckoutState;
  unlock: UnlockView;
  checkout: { authorizationUrl: string; accessCode: string; reference: string } | null;
}

export interface InitiateUnlockDto {
  targetType: ListingTargetType;
  targetId: string;
  idempotencyKey?: string;
  /** Short Let stay the unlock is bought for; availability is judged against exactly these dates (§5). */
  checkIn?: string;
  checkOut?: string;
}

/** Saved before redirecting to the payment page so the callback can find the checkout again. */
export interface PendingUnlockCheckout {
  unlockId: string;
  reference: string;
  targetType: ListingTargetType;
  targetId: string;
  returnPath: string;
  savedAt: string;
}

// ─── Refunds ──────────────────────────────────────────────────────────────

export type RefundReason =
  | 'availability_stale_at_unlock'
  | 'contact_invalid'
  | 'property_materially_different'
  | 'location_wrong'
  | 'verified_fact_inaccurate'
  | 'street_link_wrong'
  | 'initial_street_intelligence_inaccurate'
  | 'community_street_intelligence_disputed'
  | 'payment_without_access'
  | 'duplicate_payment'
  | 'sale_document_status_inaccurate'
  | 'sale_already_sold_at_unlock'
  | 'other';

export type RefundStatus = 'requested' | 'under_review' | 'approved' | 'rejected';

export type RefundCaseType = 'unlock_purchase' | 'excess_payment';

export interface RefundPolicy {
  /** The launch refund rule in one plain sentence (Master Blueprint §5). */
  launchRule: string;
  qualifying: string[];
  nonQualifying: string[];
  creditOnly: string;
  freeUnlock: string;
  reasons: RefundReason[];
}

/**
 * The launch refund test as it was checked when the case opened (Master Blueprint §5). Recorded once so the
 * decision is auditable against what was true at the time.
 */
export interface RefundEligibility {
  availableAtPayment: boolean;
  unavailableNow: boolean;
  renterDidNotTake: boolean;
  requestedBeforeExpiry: boolean;
  meetsLaunchRule: boolean;
  checkedAt: string;
}

export type AgentRefundDecision = 'confirm' | 'dispute';

/** The listing's Veriq Agent confirming or disputing the availability claim behind a refund. */
export interface RefundAgentConfirmation {
  decision: 'confirmed' | 'disputed';
  byUserId: string;
  agentId: string | null;
  at: string;
  note: string | null;
}

export interface AgentRefundConfirmationDto {
  decision: AgentRefundDecision;
  note?: string;
}

export interface RefundEvidenceEntry {
  from: string;
  message: string;
  at: string;
}

export interface RefundRequest {
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
  evidenceRequests: RefundEvidenceEntry[];
  eligibility: RefundEligibility | null;
  agentConfirmation: RefundAgentConfirmation | null;
  creditedMessage: string | null;
  unlock: {
    id: string;
    status: UnlockStatus;
    paymentReference: string;
    feeAmount: number;
    walletAmount: number;
    externalAmount: number;
    unlockedAt: string | null;
    accessExpiresAt: string | null;
    refundDeadlineAt: string | null;
  } | null;
  listing: ListingSummary | null;
}

export interface CreateRefundRequestDto {
  unlockId: string;
  reason: RefundReason;
  explanation?: string;
  evidenceUrls?: string[];
}

export interface RefundEvidenceDto {
  explanation?: string;
  evidenceUrls?: string[];
}

export interface WalletCredit {
  balance: number;
  held: number;
  available: number;
}

export interface SimilarProperty {
  id: string;
  title: string;
  category?: string;
  propertyType?: string;
  area?: string | null;
  city?: string | null;
  state?: string | null;
  coverImageUrl?: string | null;
  rentAmount?: number | string | null;
  unlockPrice: number;
  noAdditionalPaymentNeeded: boolean;
  availabilitySummary?: { overall: AvailabilityStatus; documentedUnits: number; availableUnits: number };
}

export interface SimilarPropertiesResult {
  credit: WalletCredit;
  properties: SimilarProperty[];
}

// ─── Veriq Wallet ─────────────────────────────────────────────────────────

export interface VeriqWallet {
  id: string;
  balance: number;
  heldForPendingCheckout: number;
  available: number;
  balanceFormatted: string;
  availableFormatted: string;
  expires: boolean;
  createdAt: string;
  updatedAt: string;
}

export type WalletLedgerType = 'topup' | 'debit' | 'refund' | 'earning' | 'withdrawal' | 'ledger_migration';

export interface WalletLedgerTransaction {
  id: string;
  type: WalletLedgerType;
  amount: number | string;
  status: 'pending' | 'success' | 'failed';
  balanceAfter: number | string | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  description: string | null;
  createdAt: string;
}

// ─── Post-unlock outcomes ─────────────────────────────────────────────────

export type OutcomeChoice = 'took' | 'did_not_take' | 'still_considering';

export interface PendingOutcome {
  unlockId: string;
  targetType: ListingTargetType;
  listing: { title: string; category: string; area: string | null } | null;
  accessExpiresAt: string | null;
  units: Array<{ id: string; displayLabel: string; unitType: string }>;
}

export interface RecordOutcomeDto {
  unlockId: string;
  outcome: OutcomeChoice;
  unitId?: string;
  residentIntelligenceConsent?: boolean;
  note?: string;
}

// ─── Shared media / contacts / street intelligence ────────────────────────

export interface ListingMediaView {
  id: string;
  mediaCategory: string | null;
  componentKey: string | null;
  unitId: string | null;
  url: string;
  variants: Record<string, string> | null;
  caption: string | null;
  isCover: boolean;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface ContactRoute {
  role?: string;
  name: string;
  phone: string;
  whatsappUrl: string | null;
}

export interface StreetIntelligenceResult {
  slug: string;
  category: string;
  result: string | null;
  status: string;
  sources: string[];
  sourceLabels: string[];
  confidenceLevel?: string;
  confidenceScore?: number;
  lastUpdated: string | null;
  contributors: number;
}

export interface StreetIntelligencePresentation {
  heading: string;
  supportingText: string;
  linkId: string;
  street: {
    id: string;
    readableId: string | null;
    streetName: string;
    area: string;
    city: string;
    state: string;
  };
  results: StreetIntelligenceResult[];
  sourceLabels: string[];
  contributors: number;
  lastUpdated: string | null;
  version: string;
  lowConfidence: boolean;
  share: { url: string; title: string; text: string };
}

/** The unlocked Property package plus the linked Street Intelligence presentation. */
export type UnlockedPropertyWithStreet = UnlockedPropertyPackage & {
  streetIntelligence: StreetIntelligencePresentation | null;
};

export interface ListingAccess {
  level: 'unlocked' | 'manager';
  consultationId: string | null;
  accessExpiresAt: string | null;
}

// ─── Shared Property ──────────────────────────────────────────────────────

export type SharedOpportunityType = 'private_room' | 'shared_room_bedspace';

export interface SharedListingPublic {
  id: string;
  targetType: 'shared_opportunity';
  category: 'shared_property';
  displayLabel: string;
  opportunityType: SharedOpportunityType;
  opportunityTypeLabel: string;
  state: string;
  city: string;
  area: string;
  coverImageUrl: string | null;
  basics: Record<string, unknown>;
  availabilityStatus: AvailabilityStatus;
  unlockPrice: number;
  isFreeUnlock: boolean;
  accessLevel: 'public';
}

export interface SharedListQuery {
  opportunityType?: SharedOpportunityType | '';
  area?: string;
  city?: string;
  minPrice?: number | '';
  maxPrice?: number | '';
  furnishing?: string;
  bathroomSharing?: string;
  page?: number;
  limit?: number;
}

export interface VerifiedAddress {
  address?: string;
  buildingName?: string;
  landmark?: string;
  [key: string]: unknown;
}

export interface SharedUnlockedPackage {
  access: ListingAccess;
  opportunity: {
    id: string;
    displayLabel: string;
    opportunityType: SharedOpportunityType;
    state: string;
    city: string;
    area: string;
    verifiedAddress: VerifiedAddress | null;
    latitude: number | string | null;
    longitude: number | string | null;
    facts: Record<string, unknown>;
    commercialTerms: Record<string, unknown>;
    intelligence: Record<string, unknown>;
    agentObservation: string | null;
    availabilityStatus: AvailabilityStatus;
    verifiedAt: string | null;
  };
  media: ListingMediaView[];
  residentContact: ContactRoute;
  agentSupport: ContactRoute | null;
  streetIntelligence: StreetIntelligencePresentation | null;
}

// ─── Property for Sale ────────────────────────────────────────────────────

export type SaleSubtype = 'built_property' | 'land';

export type SalePriceBasis = 'total' | 'per_plot' | 'per_square_metre' | 'other';

/** Public document status: what the Agent was shown or could confirm, never the document itself (§6). */
export interface SaleDocumentStatus {
  documentType: string;
  label: string;
  availability: string;
  availabilityLabel: string;
  legalSearchStatus: string;
  legalSearchLabel: string;
  checkedAt: string | null;
}

/**
 * Property for Sale card. Sale listings carry no unlock and no fee: the buyer view is free and the only route to
 * the property is an enquiry to Veriq (Master Blueprint §6).
 */
export interface SaleListingCardData {
  id: string;
  targetType: 'sale_listing';
  category: 'for_sale';
  title: string;
  subtype: SaleSubtype;
  subtypeLabel: string;
  state: string;
  city: string;
  area: string;
  askingPrice: number;
  priceBasis: SalePriceBasis | string;
  negotiable: boolean | null;
  coverImageUrl: string | null;
  basics: Record<string, unknown>;
  documentStatuses: SaleDocumentStatus[];
  availabilityStatus: AvailabilityStatus;
  requiresUnlock: false;
  contactRoute: 'veriq';
}

/** The full free buyer view: facts, intelligence, document statuses, media and Street Intelligence. */
export interface SaleListingPublic extends SaleListingCardData {
  facts: Record<string, unknown>;
  intelligence: Record<string, unknown>;
  location: { state: string; city: string; area: string };
  documentDisclaimer: string;
  media: ListingMediaView[];
  buyerContact: { route: 'veriq'; agentId: string | null; agentName: string | null; note: string };
  verifiedAt: string | null;
  streetIntelligence: StreetIntelligencePresentation | null;
}

export type SaleEnquiryStatus = 'new' | 'contacted' | 'closed';

export interface CreateSaleEnquiryDto {
  saleListingId: string;
  name: string;
  phone: string;
  email?: string;
  message: string;
}

export interface SaleEnquiryReceipt {
  id: string;
  saleListingId: string;
  status: SaleEnquiryStatus;
  createdAt: string;
}

export interface SaleListQuery {
  subtype?: SaleSubtype | '';
  area?: string;
  city?: string;
  minPrice?: number | '';
  maxPrice?: number | '';
  bedrooms?: number | '';
  priceBasis?: SalePriceBasis | '';
  page?: number;
  limit?: number;
}

// ─── Free Unlock ──────────────────────────────────────────────────────────

export interface FreeUnlockPublicStatus {
  active: boolean;
  endsAt: string | null;
}

// ─── Form schemas (labels for public basics and unlocked answers) ────────

export interface SchemaFieldOption {
  value: string;
  label: string;
}

export interface SchemaField {
  key: string;
  label: string;
  type: string;
  group: 'facts' | 'commercial' | 'intelligence';
  options?: SchemaFieldOption[];
  component?: string;
  public?: boolean;
}

export interface FormSchemaDefinition {
  id: string;
  category: string;
  level: string;
  subtype: string | null;
  label: string;
  fields: SchemaField[];
}

// ─── Public Veriq Agent profile ───────────────────────────────────────────

export interface PortfolioItem {
  id: string;
  title: string;
  category: string;
  area: string | null;
  city: string | null;
  coverImageUrl: string | null;
  subtype?: string;
  targetType: ListingTargetType;
}

export interface PublicAgentProfile {
  id: string;
  username: string | null;
  user: { firstName: string; lastName: string } | null;
  badge: string;
  isActive: boolean;
  isPlatformVerified: boolean;
  verificationLevel: number;
  profilePhotoUrl: string | null;
  bio: string | null;
  businessName: string | null;
  yearsOfExperience: number | null;
  stateOfOperation: string | null;
  operatingLocations: string[];
  specializations: string[];
  memberSince: string;
  portfolio: PortfolioItem[];
}

// ─── Date-aware search and quoting (Blueprint §5) ─────────────────────────

/** Selected stay passed to search, the unlock quote and checkout. Omitted entirely when no dates are chosen. */
export interface StayRangeQuery {
  checkIn?: string;
  checkOut?: string;
}
