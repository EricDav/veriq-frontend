// ─── Enums (mirrors backend) ───────────────────────────────────────────────

export enum UserRole {
  USER = 'user',
  AGENT = 'agent',
  ADMIN = 'admin',
}

export enum AgentVerificationLevel {
  NONE = 0,
  BASIC = 1,
  PROFESSIONAL = 2,
  PERFORMANCE = 3,
}

export enum AgentTrustTier {
  BRONZE = 'bronze',
  SILVER = 'silver',
  GOLD = 'gold',
  PLATINUM = 'platinum',
}

export enum PropertyType {
  FLAT = 'flat',
  DUPLEX = 'duplex',
  BUNGALOW = 'bungalow',
  SELF_CONTAIN = 'self_contain',
  ROOM_AND_PARLOUR = 'room_and_parlour',
  STUDIO = 'studio',
  PENTHOUSE = 'penthouse',
  TERRACED_HOUSE = 'terraced_house',
  DETACHED_HOUSE = 'detached_house',
  SEMI_DETACHED = 'semi_detached',
  MANSION = 'mansion',
  OTHER = 'other',
}

export enum ListingStatus {
  ACTIVE = 'active',
  PENDING = 'pending',
  OCCUPIED = 'occupied',
  HIDDEN = 'hidden',
  TAKEN = 'taken',
  EXPIRED = 'expired',
}

export enum FreshnessScore {
  FRESHLY_VERIFIED = 'freshly_verified',
  RECENTLY_VERIFIED = 'recently_verified',
  VERIFICATION_EXPIRING = 'verification_expiring',
  UNVERIFIED = 'unverified',
}

export enum ConsultationTier {
  TIER_1 = 'tier_1',
  TIER_2 = 'tier_2',
  TIER_3 = 'tier_3',
  TIER_4 = 'tier_4',
}

export enum ConsultationStatus {
  PENDING_PAYMENT = 'pending_payment',
  PAID = 'paid',
  UNLOCKED = 'unlocked',
  EXPIRED = 'expired',
  REFUNDED = 'refunded',
}

// ─── Entities ──────────────────────────────────────────────────────────────

export interface User {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: UserRole;
  isActive: boolean;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
  profilePhotoUrl: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  user: User;
  // Level 1
  isPhoneVerified: boolean;
  isEmailVerified: boolean;
  govIdType: string | null;
  govIdUrl: string | null;
  isGovIdVerified: boolean;
  selfieUrl: string | null;
  // Level 2
  cacNumber: string | null;
  cacDocumentUrl: string | null;
  realEstateAssociation: string | null;
  associationMembershipUrl: string | null;
  landlordAuthorizationUrl: string | null;
  referralAgentId: string | null;
  isProfessionallyVerified: boolean;
  // Metrics
  totalConsultations: number;
  successfulInspections: number;
  listingAccuracyScore: number;
  availabilityReliabilityScore: number;
  consultationSatisfactionRating: number;
  avgResponseHours: number;
  inspectionSuccessRate: number;
  // Trust
  trustTier: AgentTrustTier;
  isPlatformVerified: boolean;
  verificationLevel: AgentVerificationLevel;
  // Bio
  bio: string | null;
  businessName: string | null;
  businessAddress: string | null;
  yearsOfExperience: number | null;
  specialization: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Property {
  id: string;
  agentId: string;
  agent: Agent;
  title: string;
  description: string | null;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  floorLevel: string | null;
  isFurnished: boolean;
  rentAmount: number;
  serviceCharge: number;
  agencyFee: number;
  legalFee: number;
  cautionFee: number;
  inspectionFee: number;
  totalMoveInEstimate: number;
  consultationTier: ConsultationTier | null;
  consultationFee: number;
  state: string;
  city: string;
  area: string;
  address: string | null;
  latitude: number | null;
  longitude: number | null;
  status: ListingStatus;
  freshnessScore: FreshnessScore;
  lastVerifiedAt: string | null;
  expiresAt: string | null;
  reconfirmationCount: number;
  lastConfirmedRent: number | null;
  wasAutoHidden: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: string;
  userId: string;
  propertyId: string;
  property: Property;
  tier: ConsultationTier;
  feeAmount: number;
  status: ConsultationStatus;
  paymentReference: string | null;
  paymentProvider: string | null;
  paidAt: string | null;
  unlockedAt: string | null;
  accessExpiresAt: string | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── API Response Wrappers ────────────────────────────────────────────────

export interface ApiResponse<T> {
  statusCode: number;
  message: string;
  data: T;
}

export interface PaginatedResponse<T> {
  statusCode: number;
  message: string;
  data: T[];
  meta: {
    total: number;
    page: number;
    limit: number;
    pages: number;
  };
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  password: string;
  role?: UserRole;
}

export interface LoginDto {
  email: string;
  password: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  user: User;
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

// ─── Agent DTOs ───────────────────────────────────────────────────────────

export interface CreateAgentProfileDto {
  businessName?: string;
  businessAddress?: string;
  bio?: string;
  yearsOfExperience?: number;
  specialization?: string;
}

export interface SubmitLevel1VerificationDto {
  govIdType: string;
  govIdUrl: string;
  selfieUrl: string;
}

export interface SubmitLevel2VerificationDto {
  cacNumber?: string;
  cacDocumentUrl?: string;
  realEstateAssociation?: string;
  associationMembershipUrl?: string;
  landlordAuthorizationUrl?: string;
  referralAgentId?: string;
}

// ─── Property DTOs ────────────────────────────────────────────────────────

export interface CreatePropertyDto {
  title: string;
  description?: string;
  propertyType: PropertyType;
  bedrooms: number;
  bathrooms: number;
  floorLevel?: string;
  isFurnished?: boolean;
  rentAmount: number;
  serviceCharge?: number;
  agencyFee?: number;
  legalFee?: number;
  cautionFee?: number;
  inspectionFee?: number;
  state: string;
  city: string;
  area: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}

export interface FilterPropertiesDto {
  state?: string;
  city?: string;
  area?: string;
  propertyType?: PropertyType;
  minBedrooms?: number;
  maxBedrooms?: number;
  minRent?: number;
  maxRent?: number;
  isFurnished?: boolean;
  freshnessScore?: FreshnessScore;
  page?: number;
  limit?: number;
}

// ─── User DTO ─────────────────────────────────────────────────────────────

export interface UpdateUserDto {
  firstName?: string;
  lastName?: string;
  phone?: string;
  profilePhotoUrl?: string;
}

// ─── Consultation DTO ─────────────────────────────────────────────────────

export interface InitiateConsultationDto {
  propertyId: string;
}
