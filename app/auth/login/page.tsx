'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, FieldShell, Notice } from '@/components/ui';

// ─── Validation Schema ────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

// ─── Component ────────────────────────────────────────────────────────────

/**
 * The prototype's `#login` panel, with real authentication in it.
 *
 * The prototype is a demo: it has no password field and its own notice says password authentication
 * is "reserved for the production implementation". This is that implementation, so the panel, the
 * page head, the field grammar and the three-link row are the prototype's, and email + password +
 * Google sign-in are ours.
 */
function LoginPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const redirect = params.get('redirect') ?? '/dashboard';

  // Google sign-in stays implemented end to end — `loginWithGoogle` and its endpoint are untouched —
  // but the prototype's login panel offers email only, so no Google control is rendered here.
  const { login, isAuthenticated, isLoading } = useAuth();
  const { success } = useToast();

  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginFormData>({ resolver: zodResolver(loginSchema) });

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
        if (err.statusCode === 403 && err.message.toLowerCase().includes('email verification')) {
          router.push(`/auth/verify-email?email=${encodeURIComponent(data.email.trim().toLowerCase())}`);
          return;
        }
        if (err.statusCode === 403 && err.message.toLowerCase().includes('phone verification')) {
          const email = encodeURIComponent(data.email.trim().toLowerCase());
          router.push(`/auth/verify-phone?email=${email}`);
          return;
        }
        setServerError(err.statusCode === 401 ? 'Invalid email or password.' : err.message);
      } else {
        setServerError('Something went wrong. Please try again.');
      }
    }
  };

  return (
    <AuthPanel title="Welcome back" lead="Sign in to pick up where you left off.">
      {serverError && (
        <Notice tone="amber" icon={<AlertCircle className="h-5 w-5" />} title="We could not sign you in">
          {serverError}
        </Notice>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[22px]" noValidate>
        <FieldShell htmlFor="login-email" label="Email address" required error={errors.email?.message}>
          <input
            id="login-email"
            {...register('email')}
            type="email"
            autoComplete="email"
            className="input"
            placeholder="you@example.com"
          />
        </FieldShell>

        <FieldShell
          htmlFor="login-password"
          label="Password"
          required
          error={errors.password?.message}
        >
          <div className="relative">
            <input
              id="login-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              className="input pr-11"
              placeholder="Enter your password"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </FieldShell>

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <LoadingSpinner size="sm" />}
          {isSubmitting ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="text-ui-md text-muted-foreground">
        New to Veriq?{' '}
        <Link href="/auth/register" className="font-semibold text-primary hover:underline">
          Create an account
        </Link>
        .
      </p>
    </AuthPanel>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginPageInner />
    </Suspense>
  );
}
