'use client';

import React, { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Users, Home, Eye, EyeOff, AlertCircle, CheckCircle } from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { UserRole } from '@/types';

// ─── Validation Schema ────────────────────────────────────────────────────

const registerSchema = z.object({
  firstName: z.string().min(2, 'First name is required').max(100),
  lastName: z.string().min(2, 'Last name is required').max(100),
  email: z.string().email('Please enter a valid email'),
  phone: z
    .string()
    .regex(/^\+?[0-9]{10,15}$/, 'Enter a valid phone number (e.g. +2348012345678)'),
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
  const defaultRole = params.get('role') === 'agent' ? UserRole.AGENT : UserRole.USER;

  const { register: registerUser } = useAuth();
  const { success } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');

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

  const onSubmit = async (data: RegisterFormData) => {
    setServerError(null);
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone,
        password: data.password,
        role: selectedRole,
      });
      success('Account created successfully!');
      router.push(selectedRole === UserRole.AGENT ? '/dashboard/agent' : '/dashboard');
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
            <Image src="/images/Logo.png" alt="Veriq Logo" width={40} height={40} className="rounded-xl" />
            <div className="flex flex-col leading-none text-left">
              <span className="font-display text-xl font-bold text-white">Veriq</span>
              <span className="text-[10px] font-semibold tracking-widest uppercase text-gold-400">Property</span>
            </div>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white mb-1">Create your account</h1>
          <p className="text-white/60 text-sm">Join thousands making smarter property decisions</p>
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

          {/* Role selector */}
          <div className="mb-6">
            <p className="text-sm font-medium text-white/80 mb-3">I am a:</p>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.USER)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-center transition-all ${
                  selectedRole === UserRole.USER
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <Home className={`h-6 w-6 ${selectedRole === UserRole.USER ? 'text-gold-400' : 'text-white/60'}`} />
                <span className="text-sm font-semibold text-white">Property Seeker</span>
                <span className="text-[10px] text-white/50">Browse &amp; inspect</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedRole(UserRole.AGENT)}
                className={`flex flex-col items-center gap-2 rounded-xl border-2 py-4 text-center transition-all ${
                  selectedRole === UserRole.AGENT
                    ? 'border-gold-400 bg-gold-400/10'
                    : 'border-white/20 hover:border-white/40'
                }`}
              >
                <Users className={`h-6 w-6 ${selectedRole === UserRole.AGENT ? 'text-gold-400' : 'text-white/60'}`} />
                <span className="text-sm font-semibold text-white">Agent</span>
                <span className="text-[10px] text-white/50">List properties</span>
              </button>
            </div>
          </div>

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4" noValidate>
            {/* Name row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">First Name</label>
                <input
                  {...register('firstName')}
                  type="text"
                  autoComplete="given-name"
                  className={`w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.firstName ? 'border-red-400/60' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-xs text-red-300">{errors.firstName.message}</p>
                )}
              </div>
              <div>
                <label className="block text-sm font-medium text-white/80 mb-1.5">Last Name</label>
                <input
                  {...register('lastName')}
                  type="text"
                  autoComplete="family-name"
                  className={`w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.lastName ? 'border-red-400/60' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-xs text-red-300">{errors.lastName.message}</p>
                )}
              </div>
            </div>

            {/* Email */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Email Address</label>
              <input
                {...register('email')}
                type="email"
                autoComplete="email"
                className={`w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.email ? 'border-red-400/60' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="john@example.com"
              />
              {errors.email && <p className="mt-1 text-xs text-red-300">{errors.email.message}</p>}
            </div>

            {/* Phone */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Phone Number</label>
              <input
                {...register('phone')}
                type="tel"
                autoComplete="tel"
                className={`w-full rounded-lg border bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                  errors.phone ? 'border-red-400/60' : 'border-white/20 focus:border-white/40'
                }`}
                placeholder="+234 800 000 0000"
              />
              {errors.phone && <p className="mt-1 text-xs text-red-300">{errors.phone.message}</p>}
            </div>

            {/* Password */}
            <div>
              <label className="block text-sm font-medium text-white/80 mb-1.5">Password</label>
              <div className="relative">
                <input
                  {...register('password')}
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="new-password"
                  className={`w-full rounded-lg border bg-white/10 px-4 py-3 pr-11 text-sm text-white placeholder:text-white/30 outline-none transition-all focus:ring-2 focus:ring-white/10 ${
                    errors.password ? 'border-red-400/60' : 'border-white/20 focus:border-white/40'
                  }`}
                  placeholder="Create a strong password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white/70 transition-colors"
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
                        hint.test(passwordValue) ? 'text-emerald-400' : 'text-white/30'
                      }`}
                    >
                      <CheckCircle className="h-2.5 w-2.5" />
                      {hint.label}
                    </span>
                  ))}
                </div>
              )}
              {errors.password && (
                <p className="mt-1 text-xs text-red-300">{errors.password.message}</p>
              )}
            </div>

            {/* Terms */}
            <div className="flex items-start gap-2">
              <input
                {...register('terms')}
                type="checkbox"
                id="terms"
                className="mt-0.5 rounded border-white/20 bg-white/10"
              />
              <label htmlFor="terms" className="text-xs text-white/60 leading-relaxed">
                I agree to the{' '}
                <Link href="/terms" className="text-gold-400 hover:underline">Terms of Service</Link>{' '}
                and{' '}
                <Link href="/terms#privacy" className="text-gold-400 hover:underline">Privacy Policy</Link>. I confirm I am at least 18 years old.
              </label>
            </div>
            {errors.terms && <p className="text-xs text-red-300 -mt-2">{errors.terms.message}</p>}

            {/* Submit */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-3.5 text-sm font-bold text-navy-900 shadow-gold-glow transition-all duration-200 hover:scale-[1.02] active:scale-95 disabled:opacity-60 disabled:scale-100"
            >
              {isSubmitting && <LoadingSpinner size="sm" className="text-navy-900" />}
              {isSubmitting ? 'Creating account…' : 'Create Account'}
            </button>
          </form>

          <div className="mt-6 text-center">
            <p className="text-sm text-white/60">
              Already have an account?{' '}
              <Link href="/auth/login" className="text-gold-400 font-semibold hover:text-gold-300 transition-colors">
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
