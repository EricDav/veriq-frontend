'use client';

import React, { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff, AlertCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

// ─── Validation Schema ────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────

function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  const { login, isAuthenticated, isLoading } = useAuth();
  const { success } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  // Single redirect effect — fires whenever isAuthenticated becomes true
  // (covers both "already logged in on page load" and "just logged in")
  useEffect(() => {
    if (!isLoading && isAuthenticated) {
      router.replace(redirect);
    }
  }, [isAuthenticated, isLoading, redirect, router]);

  const onSubmit = async (data: LoginFormData) => {
    setServerError(null);
    try {
      await login(data);
      success('Welcome back!');
      // ⚠️ Do NOT call router.push here — setUser() inside login() schedules
      // a React state update that hasn't committed yet when router.push fires.
      // The useEffect above handles navigation after the update is committed.
    } catch (err) {
      if (err instanceof ApiError) {
        setServerError(
          err.statusCode === 401
            ? 'Invalid email or password.'
            : err.message,
        );
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <div className="min-h-screen bg-hero-pattern flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="text-center mb-8">
          <Link href="/" className="inline-flex items-center gap-2.5 mb-6">
            <Image src="/images/Logo.png" alt="Veriq Logo" width={40} height={40} className="rounded-xl" />
            <div className="flex flex-col leading-none text-left">
              <span className="font-display text-xl font-bold text-white">Veriq</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400">Property</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Welcome back</h1>
          <p className="text-white/60 text-sm">Sign in to your Veriq Property account</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-white/10 border border-white/20 backdrop-blur-xl p-8 shadow-2xl">
          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-red-500/20 border border-red-400/30 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-red-300 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-200">{serverError}</p>
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">
                Email Address
              </label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.email
                    ? 'border-red-400/60 focus:border-red-400/60'
                    : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="you@example.com"
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-300">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-sm font-medium text-white/80">Password</label>
                <Link
                  href="/auth/forgot-password"
                  className="text-xs text-gold-400 hover:text-gold-300 transition-colors"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  className={`w-full rounded-lg border bg-white/10 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.password
                      ? 'border-red-400/60 focus:border-red-400/60'
                      : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="Enter your password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-300">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 text-sm font-bold text-navy-900 shadow-gold-glow transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
            >
              {isSubmitting && <LoadingSpinner size="sm" className="text-navy-900" />}
              {isSubmitting ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Don&apos;t have an account?{' '}
              <Link href="/auth/register" className="text-gold-400 font-semibold hover:text-gold-300 transition-colors">
                Create account
              </Link>
            </p>
          </div>
        </div>

        <div className="mt-6 flex items-center justify-center gap-4">
          <Link href="/auth/register?role=agent" className="text-xs text-white/50 hover:text-white/70 transition-colors">
            Join as Agent
          </Link>
          <span className="text-white/20">•</span>
          <Link href="/terms" className="text-xs text-white/50 hover:text-white/70 transition-colors">
            Terms of Service
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
