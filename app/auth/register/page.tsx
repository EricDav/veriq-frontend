'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Home, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { ApiError, locationsApi } from '@/lib/api';
import { referralCodesApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { UserRole, type AllowedState, type RegisterDto } from '@/types';
import { GoogleSignInButton } from '@/components/auth/GoogleSignInButton';

// ─── Validation Schema ────────────────────────────────────────────────────

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required').max(100),
  lastName: z.string().min(2, 'Last name is required').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z.string().refine((value) => !value || /^\+?[0-9]{10,15}$/.test(value), 'Enter a valid phone number (e.g. +2348012345678)'),
  state: z.string().min(1, 'Select your state'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters')
    .max(72)
    .regex(
      /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&_\-#])/,
      'Must contain uppercase, lowercase, number and special character',
    ),
  terms: z.literal(true, {
    errorMap: () => ({ message: 'You must accept the terms' }),
  }),
});

type RegisterFormData = z.infer<typeof registerSchema>;

const PASSWORD_HINTS = [
  { test: (v: string) => v.length >= 8, label: '8+ characters' },
  { test: (v: string) => /[A-Z]/.test(v), label: 'Uppercase letter' },
  { test: (v: string) => /[a-z]/.test(v), label: 'Lowercase letter' },
  { test: (v: string) => /\d/.test(v), label: 'Number' },
  { test: (v: string) => /[@$!%*?&_\-#]/.test(v), label: 'Special character' },
];

// ─── Component ────────────────────────────────────────────────────────────

function RegisterPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get('role') === 'operator' ? UserRole.PROPERTY_OPERATOR : UserRole.RENTER;

  const { register: registerUser, loginWithGoogle } = useAuth();
  const { success } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [states, setStates] = useState<AllowedState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [referral, setReferral] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; agentName?: string; message?: string }>({ status: 'idle' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const watchedPassword = watch('password', '');
  React.useEffect(() => {
    setPasswordValue(watchedPassword ?? '');
  }, [watchedPassword]);

  // Validate the optional Veriq Agent referral code as the Operator types it (§3.2).
  useEffect(() => {
    const code = referralCode.trim();
    if (selectedRole !== UserRole.PROPERTY_OPERATOR || !code) {
      setReferral({ status: 'idle' });
      return;
    }
    let cancelled = false;
    setReferral({ status: 'checking' });
    const timer = setTimeout(() => {
      referralCodesApi
        .validate(code)
        .then((response) => {
          if (cancelled) return;
          setReferral({ status: 'valid', agentName: response.data.agentName });
        })
        .catch((caught) => {
          if (cancelled) return;
          setReferral({
            status: 'invalid',
            message: caught instanceof ApiError ? caught.message : 'Referral code is not valid',
          });
        });
    }, 500);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [referralCode, selectedRole]);

  useEffect(() => {
    locationsApi.activeStates()
      .then((res) => setStates(res.data))
      .catch(() => setStates([]))
      .finally(() => setStatesLoading(false));
  }, []);

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    if (selectedRole === UserRole.PROPERTY_OPERATOR && !data.phone) {
      setServerError('Phone number is required for property operator accounts.');
      return;
    }
    const code = referralCode.trim();
    if (selectedRole === UserRole.PROPERTY_OPERATOR && code && referral.status === 'invalid') {
      setServerError(referral.message ?? 'Referral code is not valid. Remove it or enter a valid code.');
      return;
    }
    try {
      // The API accepts an optional referralCode for Property Operator signup; the shared RegisterDto type predates it.
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        state: data.state,
        password: data.password,
        role: selectedRole,
        ...(selectedRole === UserRole.PROPERTY_OPERATOR && code ? { referralCode: code } : {}),
      } as RegisterDto & { referralCode?: string });
      success(selectedRole === UserRole.PROPERTY_OPERATOR ? 'Account created. Check your phone for the verification code.' : 'Account created. Check your email for the verification code.');
      const email = encodeURIComponent(data.email.trim().toLowerCase());
      if (selectedRole === UserRole.PROPERTY_OPERATOR) {
        router.push(`/auth/verify-phone?email=${email}`);
      } else {
        router.push(`/auth/verify-email?email=${email}`);
      }
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.errors) {
          setServerError(err.errors.join(' • '));
        } else if (err.statusCode === 409) {
          setServerError('An account with this email already exists.');
        } else {
          setServerError(err.message);
        }
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
            <span className="flex h-12 w-12 items-center justify-center rounded-xl bg-background p-2 ring-1 ring-white/10">
              <Image src="/images/Logo.png" alt="Veriq Logo" width={40} height={40} className="rounded-lg" />
            </span>
            <div className="flex flex-col leading-none text-left">
              <span className="font-display text-xl font-bold text-foreground">Veriq</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-primary">Property</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-foreground mb-1">Create your account</h1>
          <p className="text-muted-foreground text-sm">Join thousands making smarter property decisions</p>
        </div>

        {/* Form card */}
        <div className="rounded-2xl bg-[#ffffff0f] border border-white/20 backdrop-blur-xl p-8 shadow-2xl">
          {/* Server error */}
          {serverError && (
            <div className="mb-5 flex items-start gap-2.5 rounded-xl bg-[#fb718510] border border-[#fb718530] px-4 py-3">
              <AlertCircle className="h-4 w-4 text-[#fda4af] flex-shrink-0 mt-0.5" />
              <p className="text-sm text-[#fda4af]">{serverError}</p>
            </div>
          )}

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-foreground mb-3">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.RENTER)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-center transition-all ${
                  selectedRole === UserRole.RENTER
                    ? 'border-primary bg-[#10b98112]'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <Home className={`h-6 w-6 ${selectedRole === UserRole.RENTER ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold text-foreground">Renter</span>
                <span className="text-[10px] text-muted-foreground">Browse &amp; inspect</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.PROPERTY_OPERATOR)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-center transition-all ${
                  selectedRole === UserRole.PROPERTY_OPERATOR
                    ? 'border-primary bg-[#10b98112]'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <Users className={`h-6 w-6 ${selectedRole === UserRole.PROPERTY_OPERATOR ? 'text-primary' : 'text-muted-foreground'}`} />
                <span className="text-sm font-semibold text-foreground">Property Operator</span>
                <span className="text-[10px] text-muted-foreground">Manage property records</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label htmlFor="register-first-name" className="block text-sm font-medium text-foreground mb-1.5">First Name</label>
                <input
                  id="register-first-name"
                  {...register('firstName')}
                  type="text"
                  autoComplete="given-name"
                  className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.firstName ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-[#fda4af]">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label htmlFor="register-last-name" className="block text-sm font-medium text-foreground mb-1.5">Last Name</label>
                <input
                  id="register-last-name"
                  {...register('lastName')}
                  type="text"
                  autoComplete="family-name"
                  className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.lastName ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-[#fda4af]">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="register-email" className="block text-sm font-medium text-foreground mb-1.5">Email Address</label>
              <input
                id="register-email"
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.email ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-[#fda4af]">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="register-phone" className="block text-sm font-medium text-foreground mb-1.5">Phone Number {selectedRole === UserRole.RENTER && <span className="text-muted-foreground">(optional)</span>}</label>
              <input
                id="register-phone"
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.phone ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="+234 800 000 0000"
              />
              {errors.phone && <p className="mt-1 text-xs text-[#fda4af]">{errors.phone.message}</p>}
            </div>

            {/* State */}
            <div>
              <label htmlFor="register-state" className="block text-sm font-medium text-foreground mb-1.5">State</label>
              <select
                id="register-state"
                {...register('state')}
                disabled={statesLoading}
                className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm text-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.state ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                } disabled:opacity-60`}
              >
                <option value="" className="text-foreground">
                  {statesLoading ? 'Loading states...' : 'Select your state'}
                </option>
                {states.map((state) => (
                  <option key={state.id} value={state.name} className="text-foreground">
                    {state.name}
                  </option>
                ))}
              </select>
              {errors.state && <p className="mt-1 text-xs text-[#fda4af]">{errors.state.message}</p>}
              {!statesLoading && states.length === 0 && (
                <p className="mt-1 text-xs text-[#fcd34d]">No states are currently active. Please contact support.</p>
              )}
            </div>

            {/* Veriq Agent referral code (Property Operators only) */}
            {selectedRole === UserRole.PROPERTY_OPERATOR && (
              <div>
                <label htmlFor="register-referral" className="block text-sm font-medium text-foreground mb-1.5">
                  Veriq Agent referral code <span className="text-muted-foreground">(optional)</span>
                </label>
                <input
                  id="register-referral"
                  type="text"
                  autoCapitalize="characters"
                  maxLength={20}
                  value={referralCode}
                  onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
                  className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 text-sm uppercase text-foreground placeholder:text-muted-foreground placeholder:normal-case outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    referral.status === 'invalid' ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="If a Veriq Agent referred you"
                />
                {referral.status === 'checking' && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-muted-foreground"><LoadingSpinner size="sm" /> Checking code…</p>
                )}
                {referral.status === 'valid' && (
                  <p className="mt-1 flex items-center gap-1.5 text-xs text-[#6ee7b7]">
                    <CheckCircle className="h-3 w-3" /> Referred by {referral.agentName || 'a Veriq Agent'} — they will be assigned to verify your properties.
                  </p>
                )}
                {referral.status === 'invalid' && (
                  <p className="mt-1 text-xs text-[#fda4af]">{referral.message ?? 'Referral code is not valid'}</p>
                )}
                {referral.status === 'idle' && (
                  <p className="mt-1 text-xs text-muted-foreground">Leave blank and Veriq will assign an Agent after your first submission.</p>
                )}
              </div>
            )}

            {/* Password */}
            <div>
              <label htmlFor="register-password" className="block text-sm font-medium text-foreground mb-1.5">Password</label>
              <div className="relative">
                <input
                  id="register-password"
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full rounded-lg border bg-[#ffffff0f] px-4 py-3 pr-11 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.password ? 'border-[#fb718530]' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-muted-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {/* Password strength hints */}
              {passwordValue.length > 0 && (
                <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                  {PASSWORD_HINTS.map((hint) => (
                    <span
                      key={hint.label}
                      className={`text-[10px] flex items-center gap-1 ${
                        hint.test(passwordValue) ? 'text-primary' : 'text-muted-foreground'
                      }`}
                    >
                      <CheckCircle className="h-2.5 w-2.5" />
                      {hint.label}
                    </span>
                  ))}
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-[#fda4af]">{errors.password.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                {...register('terms')}
                type="checkbox"
                id="terms"
                className="mt-0.5 rounded border-white/20 bg-[#ffffff0f]"
              />
              <label htmlFor="terms" className="text-xs text-muted-foreground leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-primary hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/terms#privacy" className="text-primary hover:underline">Privacy Policy</Link>. I confirm I am at least 18 years old.
              </label>
            </div>
            {errors.terms && <p className="text-xs text-[#fda4af] -mt-2">{errors.terms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting || statesLoading || states.length === 0}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-primary py-3.5 text-sm font-bold text-foreground shadow-glow transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
            >
              {isSubmitting && <LoadingSpinner size="sm" className="text-foreground" />}
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          {selectedRole === UserRole.RENTER && (
            <div className="mt-5 space-y-4">
              <div className="flex items-center gap-3 text-[11px] uppercase text-muted-foreground"><span className="h-px flex-1 bg-[#ffffff14]" />or<span className="h-px flex-1 bg-[#ffffff14]" /></div>
              <GoogleSignInButton onCredential={async (credential) => { await loginWithGoogle(credential); router.replace('/dashboard'); }} />
            </div>
          )}

          <div className="mt-6 text-center">
            <p className="text-sm text-muted-foreground">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-primary font-semibold hover:text-primary transition-colors">
                Sign in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
