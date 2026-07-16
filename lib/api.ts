/**
 * Veriq API Client
 *
 * Central fetch wrapper that:
 *  - Reads the base URL from NEXT_PUBLIC_API_BASE_URL
 *  - Attaches the Bearer token on every request
 *  - Silently refreshes an expired access token using the refresh token
 *  - Normalises error responses into a typed ApiError
 */

import {
  getAccessToken,
  getRefreshToken,
  setTokens,
  clearTokens,
  isTokenExpired,
} from './auth';
import { uploadToFileService } from './upload';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

// ─── Error type ───────────────────────────────────────────────────────────

export class ApiError extends Error {
  constructor(
    public readonly statusCode: number,
    message: string,
    public readonly errors?: string[],
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

// ─── Token refresh (singleton promise to avoid race conditions) ───────────

let refreshPromise: Promise<void> | null = null;

async function doRefresh(): Promise<void> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    clearTokens();
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const res = await fetch(`${BASE_URL}/auth/refresh`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ refreshToken }),
  });

  if (!res.ok) {
    clearTokens();
    // Redirect to login on next render cycle
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent('veriq:auth:expired'));
    }
    throw new ApiError(401, 'Session expired. Please log in again.');
  }

  const body = await res.json();
  // Backend wraps in { data: { accessToken, refreshToken } }
  const { accessToken, refreshToken: newRefreshToken } =
    body.data ?? body;
  setTokens(accessToken, newRefreshToken);
}

async function ensureFreshToken(): Promise<void> {
  const access = getAccessToken();
  if (!access) return; // public request or not logged in

  if (isTokenExpired(access)) {
    if (!refreshPromise) {
      refreshPromise = doRefresh().finally(() => {
        refreshPromise = null;
      });
    }
    await refreshPromise;
  }
}

// ─── Core request ─────────────────────────────────────────────────────────

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'PUT' | 'DELETE';

interface RequestOptions {
  /** Skip attaching the auth Bearer token */
  public?: boolean;
  /** Additional headers */
  headers?: Record<string, string>;
}

async function request<T>(
  method: HttpMethod,
  path: string,
  body?: unknown,
  options?: RequestOptions,
): Promise<T> {
  // Ensure token is fresh before every authenticated call
  if (!options?.public) {
    await ensureFreshToken();
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options?.headers ?? {}),
  };

  const accessToken = getAccessToken();
  if (accessToken && !options?.public) {
    headers['Authorization'] = `Bearer ${accessToken}`;
  }

  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;

  const res = await fetch(url, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  // Parse body (could be empty on 204)
  let data: unknown;
  const contentType = res.headers.get('content-type') ?? '';
  if (contentType.includes('application/json')) {
    data = await res.json();
  } else {
    data = await res.text();
  }

  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    const message =
      (errBody?.message as string) ??
      (errBody?.error as string) ??
      `HTTP ${res.status}`;
    const errors = Array.isArray(errBody?.message)
      ? (errBody.message as string[])
      : undefined;
    throw new ApiError(res.status, Array.isArray(errBody?.message) ? 'Validation error' : message, errors);
  }

  return data as T;
}

// ─── Convenience methods ──────────────────────────────────────────────────

export const api = {
  get: <T>(path: string, options?: RequestOptions) =>
    request<T>('GET', path, undefined, options),

  post: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('POST', path, body, options),

  patch: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PATCH', path, body, options),

  put: <T>(path: string, body?: unknown, options?: RequestOptions) =>
    request<T>('PUT', path, body, options),

  delete: <T>(path: string, options?: RequestOptions) =>
    request<T>('DELETE', path, undefined, options),
};

// ─── Named API modules ────────────────────────────────────────────────────

import type {
  ApiResponse,
  PaginatedResponse,
  User,
  Agent,
  Property,
  Consultation,
  ConsultationAccess,
  ChatConversation,
  ChatMessage,
  ChatMessagesPayload,
  AppNotification,
  MediaItem,
  RegisterDto,
  LoginDto,
  AuthTokens,
  ChangePasswordDto,
  ForgotPasswordDto,
  ResetPasswordDto,
  CreateAgentProfileDto,
  SubmitLevel1VerificationDto,
  SubmitLevel2VerificationDto,
  CreatePropertyDto,
  FilterPropertiesDto,
  UpdateUserDto,
  InitiateConsultationDto,
  RecordInspectionOutcomeDto,
  AgentTrustTier,
  Wallet,
  WalletTransaction,
  TopUpWalletDto,
  VerifyTopUpDto,
  InitiateTopUpResponse,
  VerifyTopUpResponse,
  AgentEarningsSummary,
  RequestWithdrawalDto,
  RequestWithdrawalResponse,
  WalletLedgerEntry,
  WalletAdminLedgerFilters,
  WalletAdminSummary,
  SiteContent,
  UpsertSiteContentDto,
  ContactSubmission,
  ContactSubmissionStatus,
  CreateContactSubmissionDto,
  AllowedState,
  BlogPost,
  UpsertBlogPostDto,
  ConsultationPricingRule,
  UpsertConsultationPricingRuleDto,
  UserRole,
  ContributorProfile,
  Street,
  StreetIntelligencePayload,
  IntelligenceCategory,
  CreateContributionDto,
  StreetContribution,
  CreateStreetDto,
  FreeUnlockCampaign,
  FreeUnlockStatus,
  StreetStatus,
  ContributionStatus,
} from '@/types';

// ── Auth ─────────────────────────────────────────────────────────────────

export const authApi = {
  register: (dto: RegisterDto) =>
    api.post<ApiResponse<AuthTokens>>('/auth/register', dto, { public: true }),

  login: (dto: LoginDto) =>
    api.post<ApiResponse<AuthTokens>>('/auth/login', dto, { public: true }),

  logout: (refreshToken?: string) =>
    api.post<ApiResponse<null>>('/auth/logout', { refreshToken }),

  refresh: (refreshToken: string) =>
    api.post<ApiResponse<AuthTokens>>('/auth/refresh', { refreshToken }, {
      public: true,
    }),

  me: () => api.get<ApiResponse<User>>('/auth/me'),

  changePassword: (dto: ChangePasswordDto) =>
    api.patch<ApiResponse<null>>('/auth/change-password', dto),

  forgotPassword: (dto: ForgotPasswordDto) =>
    api.post<ApiResponse<null>>('/auth/forgot-password', dto, { public: true }),

  resetPassword: (dto: ResetPasswordDto) =>
    api.post<ApiResponse<null>>('/auth/reset-password', dto, { public: true }),
};

// ── Users ────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (page = 1, limit = 20, excludeRole?: UserRole) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (excludeRole) params.set('excludeRole', excludeRole);
    return api.get<PaginatedResponse<User>>(`/users?${params.toString()}`);
  },

  getProfile: () => api.get<ApiResponse<User>>('/users/profile'),

  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  update: (id: string, dto: UpdateUserDto) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, dto),

  deactivate: (id: string) =>
    api.delete<ApiResponse<null>>(`/users/${id}/deactivate`),

  activate: (id: string) =>
    api.patch<ApiResponse<User>>(`/users/${id}/activate`),
};

// ── Locations ─────────────────────────────────────────────────────────────

export const locationsApi = {
  activeStates: () =>
    api.get<ApiResponse<AllowedState[]>>('/locations/states/active', { public: true }),

  allStates: () =>
    api.get<ApiResponse<AllowedState[]>>('/locations/states'),

  updateState: (id: string, isActive: boolean) =>
    api.patch<ApiResponse<AllowedState>>(`/locations/states/${id}`, { isActive }),
};

// ── Agents ───────────────────────────────────────────────────────────────

export const agentsApi = {
  list: (page = 1, limit = 20, tier?: AgentTrustTier) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (tier) params.set('tier', tier);
    return api.get<PaginatedResponse<Agent>>(`/agents?${params}`, {
      public: true,
    });
  },

  getById: (id: string) =>
    api.get<ApiResponse<Agent>>(`/agents/${id}`, { public: true }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<Agent>>(`/agents/by-slug/${slug}`, { public: true }),

  getByUsername: (username: string) =>
    api.get<ApiResponse<Agent>>(`/agents/by-username/${username}`, { public: true }),

  getTrustProfile: (id: string) =>
    api.get<ApiResponse<unknown>>(`/agents/${id}/trust-profile`, {
      public: true,
    }),

  createProfile: (dto: CreateAgentProfileDto) =>
    api.post<ApiResponse<Agent>>('/agents/profile', dto),

  getMyProfile: () => api.get<ApiResponse<Agent>>('/agents/profile/me'),

  updateProfile: (dto: CreateAgentProfileDto) =>
    api.patch<ApiResponse<Agent>>('/agents/profile/me', dto),

  submitLevel1: (dto: SubmitLevel1VerificationDto) =>
    api.post<ApiResponse<Agent>>('/agents/verification/level1', dto),

  submitLevel2: (dto: SubmitLevel2VerificationDto) =>
    api.post<ApiResponse<Agent>>('/agents/verification/level2', dto),

  // Admin
  listAdmin: (page = 1, limit = 20, status?: string) => {
    const params = new URLSearchParams({
      page: String(page),
      limit: String(limit),
    });
    if (status && status !== 'all') params.set('status', status);
    return api.get<PaginatedResponse<Agent>>(`/agents/admin/all?${params}`);
  },

  approveLevel1: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/approve-level1`),

  approveLevel2: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/approve-level2`),

  updateMetrics: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/update-metrics`),

  recordInspectionOutcome: (dto: RecordInspectionOutcomeDto) =>
    api.post<ApiResponse<unknown>>('/agents/inspection-outcome', dto),
};

// ── Properties ───────────────────────────────────────────────────────────

export const propertiesApi = {
  list: async (filters: FilterPropertiesDto = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    const res = await api.get<PaginatedResponse<Property>>(`/properties?${params}`, {
      public: true,
    });
    return {
      ...res,
      meta: res.meta ?? {
        total: res.data.length,
        page: filters.page ?? 1,
        limit: filters.limit ?? res.data.length,
        pages: 1,
      },
    };
  },

  getById: (id: string) =>
    api.get<ApiResponse<Property>>(`/properties/${id}`, { public: true }),

  /** Admin: list properties of any status, optionally scoped and filtered */
  listAdmin: async (params: (FilterPropertiesDto & { status?: string }) = {}) => {
    const sp = new URLSearchParams();
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        sp.set(key, String(value));
      }
    });
    const res = await api.get<PaginatedResponse<Property>>(`/properties/admin/all?${sp}`);
    return {
      ...res,
      meta: res.meta ?? {
        total: res.data.length,
        page: params.page ?? 1,
        limit: params.limit ?? res.data.length,
        pages: 1,
      },
    };
  },

  create: (dto: CreatePropertyDto) =>
    api.post<ApiResponse<Property>>('/properties', dto),

  update: (id: string, dto: Partial<CreatePropertyDto>) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}`, dto),

  getMyListings: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Property>>(
      `/properties/my/listings?page=${page}&limit=${limit}`,
    ),

  reconfirm: (id: string, dto: { rentAmount?: number; inspectionFee?: number; status?: string }) =>
    api.post<ApiResponse<Property>>(`/properties/${id}/reconfirm`, dto),

  markUnavailable: (id: string) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}/mark-unavailable`, {}),

  reactivate: (id: string) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}/reactivate`, {}),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/properties/${id}`),

  // Admin
  hide: (id: string) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}/hide`),

  unhide: (id: string) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}/unhide`),
};

// ── Consultations ─────────────────────────────────────────────────────────

export const consultationsApi = {
  getPricing: () =>
    api.get<ApiResponse<unknown>>('/consultations/pricing', { public: true }),

  initiate: (dto: InitiateConsultationDto) =>
    api.post<ApiResponse<Consultation>>('/consultations/initiate', dto),

  confirmPayment: (
    id: string,
    dto: { paymentReference: string; paymentProvider: string },
  ) =>
    api.post<ApiResponse<Consultation>>(
      `/consultations/${id}/confirm-payment`,
      dto,
    ),

  checkAccess: (propertyId: string) =>
    api.get<ApiResponse<ConsultationAccess>>(`/consultations/check-access/${propertyId}`),

  getMyConsultations: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Consultation>>(
      `/consultations/my?page=${page}&limit=${limit}`,
    ),

  getPropertyConsultations: (propertyId: string, page = 1, limit = 20) =>
    api.get<PaginatedResponse<Consultation>>(
      `/consultations/property/${propertyId}?page=${page}&limit=${limit}`,
    ),

  initiateRefund: (id: string, dto: { reason?: string }) =>
    api.post<ApiResponse<{ consultationId: string; status: string }>>(
      `/consultations/${id}/refund/initiate`,
      dto,
    ),

  approveRefund: (id: string, dto: { reason?: string }) =>
    api.post<ApiResponse<{
      consultationId: string;
      status: string;
      refundedAmount: number;
      refundedAmountFormatted: string;
      paymentReference: string;
    }>>(`/consultations/${id}/refund/approve`, dto),

  rejectRefund: (id: string, dto: { reason?: string }) =>
    api.post<ApiResponse<{ consultationId: string; status: string }>>(
      `/consultations/${id}/refund/reject`,
      dto,
    ),
};

// ── Chat ──────────────────────────────────────────────────────────────────

export const chatApi = {
  eventsUrl: (token: string) =>
    `${BASE_URL}/chat/events?token=${encodeURIComponent(token)}`,

  conversations: () =>
    api.get<ApiResponse<ChatConversation[]>>('/chat/conversations'),

  unreadCount: () =>
    api.get<ApiResponse<{ unread: number }>>('/chat/unread-count'),

  startConversation: (propertyId: string) =>
    api.post<ApiResponse<ChatConversation>>('/chat/conversations', { propertyId }),

  messages: (conversationId: string) =>
    api.get<ApiResponse<ChatMessagesPayload>>(`/chat/conversations/${conversationId}/messages`),

  sendMessage: (conversationId: string, body: string) =>
    api.post<ApiResponse<ChatMessage>>(`/chat/conversations/${conversationId}/messages`, { body }),

  markRead: (conversationId: string) =>
    api.post<ApiResponse<null>>(`/chat/conversations/${conversationId}/read`),
};

// ── Notifications ─────────────────────────────────────────────────────────

export const notificationsApi = {
  list: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<AppNotification>>(
      `/notifications?page=${page}&limit=${limit}`,
    ),

  unreadCount: () =>
    api.get<ApiResponse<{ unread: number }>>('/notifications/unread-count'),

  markRead: (id: string) =>
    api.patch<ApiResponse<null>>(`/notifications/${id}/read`),

  markAllRead: () =>
    api.post<ApiResponse<null>>('/notifications/mark-all-read'),
};

// ── Wallet ────────────────────────────────────────────────────────────────

export const walletApi = {
  getBalance: () => api.get<ApiResponse<Wallet>>('/wallet'),

  topUp: (dto: TopUpWalletDto) =>
    api.post<ApiResponse<InitiateTopUpResponse>>('/wallet/topup', dto),

  verifyTopUp: (dto: VerifyTopUpDto) =>
    api.post<ApiResponse<VerifyTopUpResponse>>('/wallet/topup/verify', dto),

  getTransactions: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<WalletTransaction>>(
      `/wallet/transactions?page=${page}&limit=${limit}`,
    ),

  getAgentEarnings: () =>
    api.get<ApiResponse<AgentEarningsSummary>>('/wallet/agent/earnings'),

  requestWithdrawal: (dto: RequestWithdrawalDto) =>
    api.post<ApiResponse<RequestWithdrawalResponse>>('/wallet/agent/withdrawals', dto),

  // Admin
  adminGetLedger: (filters: WalletAdminLedgerFilters = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    return api.get<PaginatedResponse<WalletLedgerEntry>>(`/wallet/admin/transactions?${params}`);
  },

  adminGetSummary: () => api.get<ApiResponse<WalletAdminSummary>>('/wallet/admin/summary'),

  adminMarkWithdrawalPaid: (transactionId: string) =>
    api.post<ApiResponse<WalletTransaction>>(`/wallet/admin/withdrawals/${transactionId}/mark-paid`, {}),

  adminRejectWithdrawal: (transactionId: string) =>
    api.post<ApiResponse<{ transactionId: string; refund: WalletTransaction }>>(
      `/wallet/admin/withdrawals/${transactionId}/reject`,
      {},
    ),
};

// ── Media ─────────────────────────────────────────────────────────────────

export const mediaApi = {
  upload: (
    propertyId: string,
    section: string,
    file: File,
    caption?: string,
  ) => {
    return uploadToFileService(file).then((uploaded) =>
      api.post<ApiResponse<unknown>>(`/properties/${propertyId}/media/link`, {
        section,
        caption,
        url: uploaded.url,
        filename: uploaded.name,
        originalName: file.name,
        mimeType: uploaded.mime,
        sizeBytes: uploaded.size,
      }),
    );
  },

  getAll: (propertyId: string, section?: string) => {
    const query = section ? `?section=${section}` : '';
    return api.get<ApiResponse<MediaItem[]>>(
      `/properties/${propertyId}/media${query}`,
      { public: true },
    );
  },

  delete: (propertyId: string, mediaId: string) =>
    api.delete<ApiResponse<null>>(`/properties/${propertyId}/media/${mediaId}`),
};

// ── Site Content ─────────────────────────────────────────────────────────

export const siteContentApi = {
  list: (page?: string) => {
    const query = page ? `?page=${encodeURIComponent(page)}` : '';
    return api.get<ApiResponse<SiteContent[]>>(`/site-content${query}`);
  },

  getPage: (page: string) =>
    api.get<ApiResponse<SiteContent[]>>(`/site-content/page/${page}`, {
      public: true,
    }),

  upsert: (dto: UpsertSiteContentDto) =>
    api.post<ApiResponse<SiteContent>>('/site-content', dto),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/site-content/${id}`),
};

// ── Contact Submissions ──────────────────────────────────────────────────

export const contactSubmissionsApi = {
  create: (dto: CreateContactSubmissionDto) =>
    api.post<ApiResponse<{ id: string }>>('/contact-submissions', dto, { public: true }),

  list: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<ContactSubmission>>(`/contact-submissions?page=${page}&limit=${limit}`),

  update: (id: string, status: ContactSubmissionStatus) =>
    api.patch<ApiResponse<ContactSubmission>>(`/contact-submissions/${id}`, { status }),
};

// ── Community / Street Intelligence ──────────────────────────────────────

export const communityApi = {
  categories: () =>
    api.get<ApiResponse<IntelligenceCategory[]>>('/community/categories', { public: true }),

  searchStreets: (filters: { q?: string; state?: string; city?: string; area?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    return api.get<ApiResponse<Street[]>>(`/community/streets/search?${params}`, { public: true });
  },

  popularStreets: () =>
    api.get<ApiResponse<Street[]>>('/community/streets/popular', { public: true }),

  getStreet: (id: string) =>
    api.get<ApiResponse<StreetIntelligencePayload>>(`/community/streets/${id}`, { public: true }),

  createStreet: (dto: CreateStreetDto) =>
    api.post<ApiResponse<Street>>('/community/streets', dto),

  myStatus: () =>
    api.get<ApiResponse<ContributorProfile>>('/community/me/status'),

  myContributions: () =>
    api.get<ApiResponse<StreetContribution[]>>('/community/me/contributions'),

  createContribution: (dto: CreateContributionDto) =>
    api.post<ApiResponse<StreetContribution>>('/community/contributions', dto),

  updateContribution: (id: string, dto: CreateContributionDto) =>
    api.patch<ApiResponse<StreetContribution>>(`/community/contributions/${id}`, dto),

  confirmContribution: (id: string) =>
    api.post<ApiResponse<StreetContribution>>(`/community/contributions/${id}/confirm`, {}),

  referralCode: () =>
    api.get<ApiResponse<{ referralCode: string }>>('/community/referrals/code'),

  freeUnlockStatus: (propertyId: string) =>
    api.get<ApiResponse<FreeUnlockStatus>>(`/community/free-unlocks/${propertyId}/status`),

  unlockFreeProperty: (propertyId: string) =>
    api.post<ApiResponse<unknown>>(`/community/free-unlocks/${propertyId}/unlock`, {}),

  adminSettings: () =>
    api.get<ApiResponse<unknown>>('/community/admin/settings'),

  adminAnalytics: () =>
    api.get<ApiResponse<unknown>>('/community/admin/analytics'),

  adminCampaigns: () =>
    api.get<ApiResponse<FreeUnlockCampaign[]>>('/community/admin/free-unlocks'),

  adminStreets: (status?: StreetStatus) =>
    api.get<ApiResponse<Street[]>>(`/community/admin/streets${status ? `?status=${status}` : ''}`),

  adminContributions: (status?: ContributionStatus) =>
    api.get<ApiResponse<StreetContribution[]>>(`/community/admin/contributions${status ? `?status=${status}` : ''}`),

  reviewStreet: (id: string, dto: { status: StreetStatus; isPopular?: boolean; popularRank?: number }) =>
    api.patch<ApiResponse<Street>>(`/community/admin/streets/${id}/review`, dto),

  reviewContribution: (id: string, dto: { status: ContributionStatus; reviewNote?: string }) =>
    api.patch<ApiResponse<StreetContribution>>(`/community/admin/contributions/${id}/review`, dto),

  createCampaign: (dto: {
    propertyId: string;
    startDate: string;
    endDate: string;
    maximumUnlocks?: number;
    maximumUnlocksPerUser?: number;
    sponsoringAgentId?: string;
    agreementType?: string;
    amountPaid?: number;
    paymentStatus?: string;
    internalNote?: string;
    autoReturnToPaid?: boolean;
  }) => api.post<ApiResponse<FreeUnlockCampaign>>('/community/admin/free-unlocks', dto),

  updateCampaign: (id: string, dto: Partial<FreeUnlockCampaign>) =>
    api.patch<ApiResponse<FreeUnlockCampaign>>(`/community/admin/free-unlocks/${id}`, dto),
};

// ── Blogs ─────────────────────────────────────────────────────────────────

export const blogsApi = {
  listPublished: () =>
    api.get<ApiResponse<BlogPost[]>>('/blogs', { public: true }),

  getBySlug: (slug: string) =>
    api.get<ApiResponse<BlogPost>>(`/blogs/slug/${slug}`, { public: true }),

  listAdmin: (filters: { q?: string; status?: string; category?: string } = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value);
    });
    const query = params.toString();
    return api.get<ApiResponse<BlogPost[]>>(`/blogs/admin/all${query ? `?${query}` : ''}`);
  },

  create: (dto: UpsertBlogPostDto) =>
    api.post<ApiResponse<BlogPost>>('/blogs/admin', dto),

  update: (id: string, dto: UpsertBlogPostDto) =>
    api.patch<ApiResponse<BlogPost>>(`/blogs/admin/${id}`, dto),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/blogs/admin/${id}`),
};

// ── Consultation Pricing ─────────────────────────────────────────────────

export const consultationPricingApi = {
  listAdmin: (agentId?: string) => {
    const query = agentId ? `?agentId=${encodeURIComponent(agentId)}` : '';
    return api.get<ApiResponse<ConsultationPricingRule[]>>(`/consultation-pricing/admin${query}`);
  },

  upsert: (dto: UpsertConsultationPricingRuleDto) =>
    api.post<ApiResponse<ConsultationPricingRule>>('/consultation-pricing/admin', dto),

  delete: (id: string) =>
    api.delete<ApiResponse<null>>(`/consultation-pricing/admin/${id}`),
};
