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
  MediaItem,
  RegisterDto,
  LoginDto,
  AuthTokens,
  ChangePasswordDto,
  CreateAgentProfileDto,
  SubmitLevel1VerificationDto,
  SubmitLevel2VerificationDto,
  CreatePropertyDto,
  FilterPropertiesDto,
  UpdateUserDto,
  InitiateConsultationDto,
  AgentTrustTier,
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
};

// ── Users ────────────────────────────────────────────────────────────────

export const usersApi = {
  list: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<User>>(`/users?page=${page}&limit=${limit}`),

  getProfile: () => api.get<ApiResponse<User>>('/users/profile'),

  getById: (id: string) => api.get<ApiResponse<User>>(`/users/${id}`),

  update: (id: string, dto: UpdateUserDto) =>
    api.patch<ApiResponse<User>>(`/users/${id}`, dto),

  deactivate: (id: string) =>
    api.delete<ApiResponse<null>>(`/users/${id}/deactivate`),

  activate: (id: string) =>
    api.patch<ApiResponse<User>>(`/users/${id}/activate`),
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
  approveLevel1: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/approve-level1`),

  approveLevel2: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/approve-level2`),

  updateMetrics: (id: string) =>
    api.patch<ApiResponse<Agent>>(`/agents/${id}/update-metrics`),
};

// ── Properties ───────────────────────────────────────────────────────────

export const propertiesApi = {
  list: (filters: FilterPropertiesDto = {}) => {
    const params = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') {
        params.set(k, String(v));
      }
    });
    return api.get<PaginatedResponse<Property>>(`/properties?${params}`, {
      public: true,
    });
  },

  getById: (id: string) =>
    api.get<ApiResponse<Property>>(`/properties/${id}`, { public: true }),

  create: (dto: CreatePropertyDto) =>
    api.post<ApiResponse<Property>>('/properties', dto),

  update: (id: string, dto: Partial<CreatePropertyDto>) =>
    api.patch<ApiResponse<Property>>(`/properties/${id}`, dto),

  getMyListings: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Property>>(
      `/properties/my/listings?page=${page}&limit=${limit}`,
    ),

  reconfirm: (id: string, dto: { currentRent: number; notes?: string }) =>
    api.post<ApiResponse<Property>>(`/properties/${id}/reconfirm`, dto),

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
    api.get<ApiResponse<{ hasAccess: boolean }>>(`/consultations/check-access/${propertyId}`),

  getMyConsultations: (page = 1, limit = 20) =>
    api.get<PaginatedResponse<Consultation>>(
      `/consultations/my?page=${page}&limit=${limit}`,
    ),
};

// ── Media ─────────────────────────────────────────────────────────────────

async function uploadFile<T>(path: string, formData: FormData): Promise<T> {
  await ensureFreshToken();
  const accessToken = getAccessToken();
  const url = `${BASE_URL}${path.startsWith('/') ? path : `/${path}`}`;
  const res = await fetch(url, {
    method: 'POST',
    headers: accessToken ? { Authorization: `Bearer ${accessToken}` } : {},
    body: formData,
  });
  const data = await res.json();
  if (!res.ok) {
    const errBody = data as Record<string, unknown>;
    throw new ApiError(res.status, (errBody?.message as string) ?? `HTTP ${res.status}`);
  }
  return data as T;
}

export const mediaApi = {
  upload: (
    propertyId: string,
    section: string,
    file: File,
    caption?: string,
  ) => {
    const fd = new FormData();
    fd.append('file', file);
    fd.append('section', section);
    if (caption) fd.append('caption', caption);
    return uploadFile<ApiResponse<unknown>>(
      `/properties/${propertyId}/media/upload`,
      fd,
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
