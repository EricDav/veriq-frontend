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
    disclosure: string | null;
  };
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
  qualifying: string[];
  nonQualifying: string[];
  creditOnly: string;
  freeUnlock: string;
  reasons: RefundReason[];
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

export interface SaleDocumentStatus {
  documentType: string;
  label: string;
  availability: string;
  availabilityLabel: string;
  legalSearchStatus: string;
  legalSearchLabel: string;
  checkedAt: string | null;
  notes?: string | null;
  discrepancyFound?: boolean;
}

export interface SaleListingPublic {
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
  publicIntelligence: Record<string, unknown>;
  documentAvailability: SaleDocumentStatus[];
  availabilityStatus: AvailabilityStatus;
  unlockPrice: number;
  isFreeUnlock: boolean;
  accessLevel: 'public';
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

export interface SaleUnlockedPackage {
  access: ListingAccess;
  listing: {
    id: string;
    propertyId: string;
    title: string;
    subtype: SaleSubtype;
    askingPrice: number;
    priceBasis: string;
    negotiable: boolean | null;
    availabilityStatus: AvailabilityStatus;
    facts: Record<string, unknown>;
    intelligence: Record<string, unknown>;
    agentObservation: string | null;
    verifiedAt: string | null;
  };
  location: {
    state: string;
    city: string;
    area: string;
    verifiedAddress: VerifiedAddress | null;
    latitude: number | string | null;
    longitude: number | string | null;
  };
  documentStatuses: SaleDocumentStatus[];
  media: ListingMediaView[];
  contactRoute: ContactRoute | null;
  agentSupport: ContactRoute | null;
  streetIntelligence: StreetIntelligencePresentation | null;
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
