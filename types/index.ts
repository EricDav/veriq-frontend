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
  // ─── V2 Primary Types ─────────────────────────────────────────
  FLAT = 'flat',                          // Apartment / Flat
  MINI_FLAT = 'mini_flat',               // Mini Flat
  SELF_CONTAIN = 'self_contain',         // Self Contain
  ROOM_AND_PARLOUR = 'room_and_parlour', // Room & Parlour
  DUPLEX = 'duplex',                     // Duplex
  BUNGALOW = 'bungalow',                 // Bungalow
  HOSTEL = 'hostel',                     // Hostel Intelligence Framework
  SHORT_STAY = 'short_stay',             // Short Stay Intelligence Framework
  // ─── Legacy ───────────────────────────────────────────────────
  STUDIO = 'studio',
  PENTHOUSE = 'penthouse',
  TERRACED_HOUSE = 'terraced_house',
  DETACHED_HOUSE = 'detached_house',
  SEMI_DETACHED = 'semi_detached',
  MANSION = 'mansion',
  OTHER = 'other',
}

export enum ShortStayPricingModel {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  BOTH = 'both',
}

export enum HostelSuitableFor {
  STUDENTS = 'students',
  CORP_MEMBERS = 'corp_members',
  WORKING_CLASS = 'working_class',
  TEMPORARY_STAY = 'temporary_stay',
  MIXED = 'mixed',
}

export enum HostelGender {
  MALE = 'male',
  FEMALE = 'female',
  MIXED = 'mixed',
}

export enum HostelCampusProximity {
  ON_CAMPUS = 'on_campus',
  OFF_CAMPUS = 'off_campus',
}

// ─── Veriq Quick Intelligence Enums ──────────────────────────────────────────

export enum FloodRisk {
  NO_KNOWN_FLOODING = 'no_known_flooding',
  MINOR_OCCASIONALLY = 'minor_occasionally',
  FLOODS_HEAVY_RAIN = 'floods_heavy_rain',
}

export enum ElectricitySituation {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum ElectricityInfo {
  PUBLIC_POWER_MOSTLY = 'public_power_mostly',
  FREQUENT_OUTAGES = 'frequent_outages',
  GENERATOR_COMMON = 'generator_common',
  SOLAR_BACKUP = 'solar_backup',
}

export enum WaterAvailability {
  CONSTANT = 'constant',
  MOSTLY_AVAILABLE = 'mostly_available',
  OCCASIONAL_SHORTAGE = 'occasional_shortage',
  FREQUENT_SHORTAGE = 'frequent_shortage',
}

export enum WaterSource {
  BOREHOLE = 'borehole',
  WATER_CORPORATION = 'water_corporation',
  WELL = 'well',
  MIXED_SOURCE = 'mixed_source',
}

export enum RoadAccess {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum RoadAccessRain {
  FULLY_ACCESSIBLE = 'fully_accessible',
  SLIGHTLY_DIFFICULT = 'slightly_difficult',
  DIFFICULT = 'difficult',
  SOMETIMES_CUT_OFF = 'sometimes_cut_off',
}

export enum NetworkQuality {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum BestNetwork {
  MTN = 'mtn',
  AIRTEL = 'airtel',
  GLO = 'glo',
  NINE_MOBILE = '9mobile',
}

export enum NoiseLevel {
  QUIET = 'quiet',
  MODERATE = 'moderate',
  NOISY = 'noisy',
}

export enum NoiseSource {
  CHURCH = 'church',
  MARKET = 'market',
  NIGHTLIFE = 'nightlife',
  SCHOOL = 'school',
  TRAFFIC = 'traffic',
  GENERATOR_NOISE = 'generator_noise',
  NONE = 'none',
}

export enum SecurityFeel {
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum SecurityFeatures {
  GATED_COMPOUND = 'gated_compound',
  SECURITY_PERSONNEL = 'security_personnel',
  ESTATE_ENVIRONMENT = 'estate_environment',
  BUSY_AREA = 'busy_area',
  ISOLATED_AREA = 'isolated_area',
}

export enum PropertyCondition {
  NEWLY_BUILT = 'newly_built',
  NEWLY_RENOVATED = 'newly_renovated',
  GOOD_CONDITION = 'good_condition',
  FAIR_CONDITION = 'fair_condition',
  NEEDS_REPAIRS = 'needs_repairs',
}

export enum KnownIssues {
  DAMP_WALL = 'damp_wall',
  PLUMBING_ISSUE = 'plumbing_issue',
  CEILING_DAMAGE = 'ceiling_damage',
  CRACKS = 'cracks',
  POOR_FINISHING = 'poor_finishing',
  NONE_OBSERVED = 'none_observed',
}

export enum CompoundCulture {
  FAMILY_FRIENDLY = 'family_friendly',
  MOSTLY_FAMILIES = 'mostly_families',
  MOSTLY_SINGLES = 'mostly_singles',
  MIXED_OCCUPANTS = 'mixed_occupants',
  QUIET_COMPOUND = 'quiet_compound',
  SOCIAL_COMPOUND = 'social_compound',
}

// ─── Short Stay Intelligence Enums ───────────────────────────────────────────

export enum ShortStayAC {
  AVAILABLE_ALL_ROOMS = 'available_all_rooms',
  AVAILABLE_SOME_ROOMS = 'available_some_rooms',
  NOT_AVAILABLE = 'not_available',
}

export enum ShortStayInternet {
  HIGH_SPEED = 'high_speed',
  STANDARD = 'standard',
  LIMITED = 'limited',
  NOT_AVAILABLE = 'not_available',
}

export enum ShortStayCleanliness {
  EXCELLENT = 'excellent',
  GOOD = 'good',
  FAIR = 'fair',
  POOR = 'poor',
}

export enum ShortStayFurnishing {
  FULLY_FURNISHED = 'fully_furnished',
  PARTIALLY_FURNISHED = 'partially_furnished',
  BASIC_FURNISHING = 'basic_furnishing',
}

export enum ShortStayKitchen {
  FULL_KITCHEN = 'full_kitchen',
  KITCHENETTE = 'kitchenette',
  NOT_AVAILABLE = 'not_available',
}

export enum MediaSection {
  ROAD_ACCESS = 'road_access',
  ENVIRONMENT = 'environment',
  LIVING_ROOM = 'living_room',
  KITCHEN = 'kitchen',
  BATHROOM = 'bathroom',
  BEDROOM = 'bedroom',
  COMPOUND = 'compound',
  WATER_AREA = 'water_area',
  CEILING = 'ceiling',
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
  REFUND_REQUESTED = 'refund_requested',
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
  state: string | null;
  lastLoginAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Agent {
  id: string;
  userId: string;
  username: string | null;
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
  // Extended onboarding
  profilePhotoUrl: string | null;
  stateOfOperation: string | null;
  operatingLocations: string[] | null;
  specializations: string[] | null;
  bankAccountName: string | null;
  bankName: string | null;
  bankAccountNumber: string | null;
  agreementAccepted: boolean;
  allowContactAfterPayment: boolean;
  agreementAcceptedAt: string | null;
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
  expiryWarningSent: boolean;
  wasAutoHidden: boolean;
  // Hostel fields
  hostelSuitableFor: HostelSuitableFor[] | null;
  hostelPersonsPerRoom: number | null;
  hostelGender: HostelGender | null;
  hostelCampusProximity: HostelCampusProximity | null;
  hostelNearestCampus: string | null;
  hostelDistanceFromCampus: string | null;
  hostelMealsIncluded: boolean;
  hostelRulesNotes: string | null;
  // Short Stay fields
  shortStayPricingModel: ShortStayPricingModel | null;
  shortStayDailyRate: number | null;
  shortStayWeeklyRate: number | null;
  shortStayMinNights: number | null;
  shortStayMaxNights: number | null;
  shortStayCheckInTime: string | null;
  shortStayCheckOutTime: string | null;
  shortStayAmenities: string[] | null;
  shortStayHouseRules: string | null;
  // Veriq Quick Intelligence fields
  floodRisk: FloodRisk | null;
  electricitySituation: ElectricitySituation | null;
  electricityInfo: string[] | null;
  waterAvailability: WaterAvailability | null;
  waterSource: WaterSource | null;
  roadAccess: RoadAccess | null;
  roadAccessRain: RoadAccessRain | null;
  networkQuality: NetworkQuality | null;
  bestNetwork: string[] | null;
  noiseLevel: NoiseLevel | null;
  noiseSource: NoiseSource | null;
  securityFeel: SecurityFeel | null;
  securityFeatures: string[] | null;
  propertyCondition: PropertyCondition | null;
  knownIssues: string[] | null;
  compoundCulture: CompoundCulture | null;
  agentObservation: string | null;
  // Short Stay Intelligence fields
  shortStayAC: ShortStayAC | null;
  shortStayInternet: ShortStayInternet | null;
  shortStayCleanliness: ShortStayCleanliness | null;
  shortStayFurnishing: ShortStayFurnishing | null;
  shortStayKitchen: ShortStayKitchen | null;
  shortStayAgentNote: string | null;
  coverImageUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Consultation {
  id: string;
  userId: string;
  user?: User;
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
  inspectionOccurred: boolean | null;
  listingAccuracyScore: number | null;
  userSatisfactionRating: number | null;
  userFeedbackComment: string | null;
  ratedAt: string | null;
  agentId: string | null;
  commissionRate: number | null;
  platformShareAmount: number | null;
  agentShareAmount: number | null;
  refundReason: string | null;
  refundRequestedById: string | null;
  refundRequestedByRole: string | null;
  refundRequestedAt: string | null;
  refundApprovedById: string | null;
  refundApprovedAt: string | null;
  agentEarningReversedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ConsultationAccess {
  hasAccess: boolean;
  consultationId?: string;
  accessExpiresAt?: string;
  unlockedAt?: string;
  contactAllowed?: boolean;
  agentContact?: {
    agentId: string;
    agentName: string;
    phone: string;
    businessName: string | null;
  } | null;
}

export interface RecordInspectionOutcomeDto {
  propertyId: string;
  inspectionOccurred: boolean;
  accuracyScore?: number;
  satisfactionRating?: number;
  comment?: string;
}

export interface ChatParticipant {
  id: string;
  name: string;
  role: UserRole;
  profilePhotoUrl: string | null;
}

export interface ChatConversation {
  id: string;
  propertyId: string;
  property: {
    id: string;
    title: string;
    area: string;
    city: string;
    coverImageUrl: string | null;
  } | null;
  otherParticipant: ChatParticipant | null;
  lastMessagePreview: string | null;
  lastMessageAt: string | null;
  unread: number;
  createdAt: string;
  updatedAt: string;
}

export interface ChatMessage {
  id: string;
  conversationId: string;
  senderId: string;
  body: string;
  sender: ChatParticipant | null;
  createdAt: string;
}

export interface ChatMessagesPayload {
  conversation: ChatConversation;
  messages: ChatMessage[];
}

// ─── Notifications ────────────────────────────────────────────────────────

export enum NotificationType {
  REFUND_REQUESTED = 'refund_requested',
}

export interface AppNotification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  actionUrl: string | null;
  entityType: string | null;
  entityId: string | null;
  metadata: Record<string, unknown> | null;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
}

// ─── Wallet ────────────────────────────────────────────────────────────────

export enum WalletTransactionType {
  TOPUP = 'topup',
  DEBIT = 'debit',
  REFUND = 'refund',
  EARNING = 'earning',
  WITHDRAWAL = 'withdrawal',
}

export enum WalletTransactionStatus {
  PENDING = 'pending',
  SUCCESS = 'success',
  FAILED = 'failed',
}

export interface Wallet {
  id: string;
  balance: number;
  balanceFormatted: string;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id: string;
  walletId: string;
  userId: string;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  balanceAfter: number | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface TopUpWalletDto {
  amount: number;
  paymentProvider?: string;
}

export interface VerifyTopUpDto {
  reference: string;
}

export interface InitiateTopUpResponse {
  transactionId: string;
  amount: number;
  amountFormatted: string;
  paymentReference: string;
  paymentProvider: string;
  authorizationUrl: string;
  accessCode: string;
}

export interface VerifyTopUpResponse {
  transactionId: string;
  status: WalletTransactionStatus;
  balance: number;
  balanceFormatted: string;
}

export interface AgentEarningsSummary {
  walletBalance: number;
  walletBalanceFormatted: string;
  totalEarnings: number;
  totalEarningsFormatted: string;
  maturedEarnings: number;
  maturedEarningsFormatted: string;
  pendingClearance: number;
  pendingClearanceFormatted: string;
  withdrawn: number;
  withdrawnFormatted: string;
  pendingWithdrawal: number;
  pendingWithdrawalFormatted: string;
  availableForWithdrawal: number;
  availableForWithdrawalFormatted: string;
  minWithdrawalAmount: number;
  minWithdrawalAmountFormatted: string;
  holdHours: number;
  nextEligibleAt: string | null;
  isEligible: boolean;
}

export interface RequestWithdrawalDto {
  amount: number;
  note?: string;
}

export interface RequestWithdrawalResponse {
  transaction: WalletTransaction;
  earnings: AgentEarningsSummary;
}

// ─── Admin: Wallet Ledger & Revenue Split ──────────────────────────────────

export interface WalletLedgerUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface WalletLedgerEntry {
  id: string;
  walletId: string;
  userId: string;
  user: WalletLedgerUser | null;
  type: WalletTransactionType;
  amount: number;
  status: WalletTransactionStatus;
  balanceAfter: number | null;
  paymentReference: string | null;
  paymentProvider: string | null;
  description: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WalletAdminLedgerFilters {
  page?: number;
  limit?: number;
  type?: WalletTransactionType;
  status?: WalletTransactionStatus;
  userId?: string;
  search?: string;
}

export interface WalletAdminSummary {
  wallets: {
    totalBalance: number;
    totalBalanceFormatted: string;
    customerBalance: number;
    customerBalanceFormatted: string;
    agentBalance: number;
    agentBalanceFormatted: string;
    walletCount: number;
  };
  transactions: {
    totalTopUps: number;
    totalTopUpsFormatted: string;
    totalDebits: number;
    totalDebitsFormatted: string;
    totalRefunds: number;
    totalRefundsFormatted: string;
    totalAgentEarnings: number;
    totalAgentEarningsFormatted: string;
  };
  revenue: {
    commissionPercent: number | null;
    defaultCommissionPercent: number;
    commissionLabel: string;
    paidConsultations: number;
    totalConsultationRevenue: number;
    totalConsultationRevenueFormatted: string;
    platformShare: number;
    platformShareFormatted: string;
    agentShare: number;
    agentShareFormatted: string;
    combinedEarnings: number;
    combinedEarningsFormatted: string;
    topUpsLessCustomerBalances: number;
    topUpsLessCustomerBalancesFormatted: string;
    reconciliationDifference: number;
    reconciliationDifferenceFormatted: string;
  };
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
    summary?: Record<string, number>;
  };
}

// ─── Auth DTOs ────────────────────────────────────────────────────────────

export interface RegisterDto {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  state: string;
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

export interface ForgotPasswordDto {
  email: string;
}

export interface ResetPasswordDto {
  email: string;
  token: string;
  newPassword: string;
}

// ─── Agent DTOs ───────────────────────────────────────────────────────────

export interface CreateAgentProfileDto {
  businessName?: string;
  businessAddress?: string;
  bio?: string;
  yearsOfExperience?: number;
  specialization?: string;
  profilePhotoUrl?: string;
  stateOfOperation?: string;
  operatingLocations?: string[];
  specializations?: string[];
  bankAccountName?: string;
  bankName?: string;
  bankAccountNumber?: string;
  agreementAccepted?: boolean;
  allowContactAfterPayment?: boolean;
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
  bedrooms?: number;
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
  // Hostel-specific
  hostelSuitableFor?: HostelSuitableFor[];
  hostelPersonsPerRoom?: number;
  hostelGender?: HostelGender;
  hostelCampusProximity?: HostelCampusProximity;
  hostelNearestCampus?: string;
  hostelDistanceFromCampus?: string;
  hostelMealsIncluded?: boolean;
  hostelRulesNotes?: string;
  // Short Stay-specific
  shortStayPricingModel?: ShortStayPricingModel;
  shortStayDailyRate?: number;
  shortStayWeeklyRate?: number;
  shortStayMinNights?: number;
  shortStayMaxNights?: number;
  shortStayCheckInTime?: string;
  shortStayCheckOutTime?: string;
  shortStayAmenities?: string[];
  shortStayHouseRules?: string;
  // Veriq Quick Intelligence
  floodRisk?: FloodRisk;
  electricitySituation?: ElectricitySituation;
  electricityInfo?: string[];
  waterAvailability?: WaterAvailability;
  waterSource?: WaterSource;
  roadAccess?: RoadAccess;
  roadAccessRain?: RoadAccessRain;
  networkQuality?: NetworkQuality;
  bestNetwork?: string[];
  noiseLevel?: NoiseLevel;
  noiseSource?: NoiseSource;
  securityFeel?: SecurityFeel;
  securityFeatures?: string[];
  propertyCondition?: PropertyCondition;
  knownIssues?: string[];
  compoundCulture?: CompoundCulture;
  agentObservation?: string;
  // Short Stay Intelligence
  shortStayAC?: ShortStayAC;
  shortStayInternet?: ShortStayInternet;
  shortStayCleanliness?: ShortStayCleanliness;
  shortStayFurnishing?: ShortStayFurnishing;
  shortStayKitchen?: ShortStayKitchen;
  shortStayAgentNote?: string;
  coverImageUrl?: string;
}

export interface FilterPropertiesDto {
  q?: string;
  status?: ListingStatus;
  agentId?: string;
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
  // Hostel filters
  hostelSuitableFor?: HostelSuitableFor;
  hostelGender?: HostelGender;
  hostelCampusProximity?: HostelCampusProximity;
  hostelPersonsPerRoom?: number;
  // Short Stay filters
  maxDailyRate?: number;
  maxNights?: number;
  shortStayPricingModel?: ShortStayPricingModel;
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

// ─── Locations ────────────────────────────────────────────────────────────

export interface AllowedState {
  id: string;
  name: string;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

// ─── Blogs ────────────────────────────────────────────────────────────────

export type BlogPostStatus = 'draft' | 'scheduled' | 'published' | 'archived';

export interface BlogSection {
  type: 'paragraph' | 'heading' | 'list' | 'callout' | 'youtube';
  text?: string;
  items?: string[];
  youtubeId?: string;
  variant?: 'warning' | 'info' | 'tip';
}

export interface BlogPost {
  id?: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  authorName?: string | null;
  authorAvatar?: string | null;
  readTime: number;
  publishedAt: string | null;
  scheduledAt?: string | null;
  coverImage?: string | null;
  youtubeId?: string | null;
  content: BlogSection[];
  contentHtml?: string | null;
  tags: string[];
  seoTitle?: string | null;
  seoDescription?: string | null;
  canonicalUrl?: string | null;
  revisionHistory?: Array<Record<string, unknown>>;
  status?: BlogPostStatus;
  createdAt?: string;
  updatedAt?: string;
}

export interface UpsertBlogPostDto {
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  authorName?: string;
  authorAvatar?: string;
  readTime?: number;
  publishedAt?: string;
  scheduledAt?: string;
  coverImage?: string;
  youtubeId?: string;
  content?: BlogSection[];
  contentHtml?: string;
  tags?: string[];
  seoTitle?: string;
  seoDescription?: string;
  canonicalUrl?: string;
  status?: BlogPostStatus;
}

export interface ConsultationPricingRule {
  id: string;
  agentId: string | null;
  agent?: Agent | null;
  tier: ConsultationTier;
  label: string;
  minRent: number;
  maxRent: number | null;
  fee: number;
  platformCommissionPercent: number | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface UpsertConsultationPricingRuleDto {
  agentId?: string | null;
  tier: ConsultationTier;
  label: string;
  minRent: number;
  maxRent?: number | null;
  fee: number;
  platformCommissionPercent?: number | null;
  isActive?: boolean;
}

// ─── Consultation DTO ─────────────────────────────────────────────────────

export interface InitiateConsultationDto {
  propertyId: string;
}

// ─── Site Content ────────────────────────────────────────────────────────

export interface SiteContent {
  id: string;
  page: string;
  section: string;
  title: string | null;
  subtitle: string | null;
  body: string | null;
  data: Record<string, unknown> | null;
  createdAt: string;
  updatedAt: string;
}

export type ContactSubmissionStatus = 'new' | 'read' | 'resolved';

export interface ContactSubmission {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  role: string | null;
  subject: string;
  message: string;
  status: ContactSubmissionStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CreateContactSubmissionDto {
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  role?: string;
  subject: string;
  message: string;
}

export interface UpsertSiteContentDto {
  page: string;
  section: string;
  title?: string;
  subtitle?: string;
  body?: string;
  data?: Record<string, unknown>;
}

// ─── Media ────────────────────────────────────────────────────────────────

export interface MediaItem {
  id: string;
  propertyId: string;
  mediaType: string;
  section: string;
  originalName: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  caption: string | null;
  sortOrder: number;
  createdAt: string;
}
