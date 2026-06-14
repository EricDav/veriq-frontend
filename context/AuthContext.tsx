'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { useRouter } from 'next/navigation';
import { authApi, ApiError } from '@/lib/api';
import {
  clearTokens,
  getStoredUser,
  setStoredUser,
  setTokens,
  getAccessToken,
  getRefreshToken,
  isTokenExpired,
} from '@/lib/auth';

import type { LoginDto, RegisterDto, User } from '@/types';

// ─── Cookie helpers (lightweight signals for middleware) ──────────────────

function setAuthCookies(role: string) {
  const maxAge = 60 * 60 * 24 * 7; // 7 days
  document.cookie = `veriq_authed=1; path=/; max-age=${maxAge}; SameSite=Lax`;
  document.cookie = `veriq_role=${role}; path=/; max-age=${maxAge}; SameSite=Lax`;
}

function clearAuthCookies() {
  document.cookie = 'veriq_authed=; path=/; max-age=0; SameSite=Lax';
  document.cookie = 'veriq_role=; path=/; max-age=0; SameSite=Lax';
}
import { UserRole } from '@/types';

// ─── Context shape ────────────────────────────────────────────────────────

interface AuthContextValue {
  user: User | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  isAdmin: boolean;
  isAgent: boolean;
  login: (dto: LoginDto) => Promise<void>;
  register: (dto: RegisterDto) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

// ─── Provider ─────────────────────────────────────────────────────────────

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // ── Bootstrap: restore user from localStorage on mount ────────────────
  useEffect(() => {
    let mounted = true;

    async function bootstrapAuth() {
    const stored = getStoredUser();
    const token = getAccessToken();
    const refreshToken = getRefreshToken();

      if (!stored || !token || (isTokenExpired(token) && !refreshToken)) {
        clearTokens();
        clearAuthCookies();
        if (mounted) setIsLoading(false);
        return;
      }

      try {
        const res = await authApi.me();
        if (!mounted) return;
        setUser(res.data);
        setStoredUser(res.data);
        setAuthCookies(res.data.role);
      } catch {
      clearTokens();
      clearAuthCookies();
        if (mounted) setUser(null);
      } finally {
        if (mounted) setIsLoading(false);
      }
    }

    bootstrapAuth();
    return () => { mounted = false; };
  }, []);

  // ── Listen for token-expired events fired by the API client ───────────
  useEffect(() => {
    const onExpired = () => {
      clearTokens();
      clearAuthCookies();
      setUser(null);
      router.push('/auth/login');
    };
    window.addEventListener('veriq:auth:expired', onExpired);
    return () => window.removeEventListener('veriq:auth:expired', onExpired);
  }, [router]);

  // ── Fetch latest user from server ─────────────────────────────────────
  const refreshUser = useCallback(async () => {
    try {
      const res = await authApi.me();
      setUser(res.data);
      setStoredUser(res.data);
    } catch {
      // Silently fail — the token interceptor will handle expiry
    }
  }, []);

  // ── Login ─────────────────────────────────────────────────────────────
  const login = useCallback(
    async (dto: LoginDto) => {
      const res = await authApi.login(dto);
      const { accessToken, refreshToken, user: u } = res.data;
      setTokens(accessToken, refreshToken);
      setStoredUser(u);
      setUser(u);
      setAuthCookies(u.role);
    },
    [],
  );

  // ── Register ──────────────────────────────────────────────────────────
  // Backend register only creates the account (no tokens returned).
  // We immediately follow with a login call to get tokens and set session.
  const register = useCallback(async (dto: RegisterDto) => {
    await authApi.register(dto); // creates the account
    const loginRes = await authApi.login({ email: dto.email, password: dto.password });
    const { accessToken, refreshToken, user: u } = loginRes.data;
    setTokens(accessToken, refreshToken);
    setStoredUser(u);
    setUser(u);
    setAuthCookies(u.role);
  }, []);

  // ── Logout ────────────────────────────────────────────────────────────
  const logout = useCallback(async () => {
    try {
      await authApi.logout();
    } catch {
      // Ignore errors — clear locally regardless
    } finally {
      clearTokens();
      clearAuthCookies();
      setUser(null);
      router.push('/auth/login');
    }
  }, [router]);

  // ── Derived flags ─────────────────────────────────────────────────────
  const isAuthenticated = !!user;
  const isAdmin = user?.role === UserRole.ADMIN;
  const isAgent = user?.role === UserRole.AGENT;

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      isLoading,
      isAuthenticated,
      isAdmin,
      isAgent,
      login,
      register,
      logout,
      refreshUser,
    }),
    [user, isLoading, isAuthenticated, isAdmin, isAgent, login, register, logout, refreshUser],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ─── Hook ─────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
