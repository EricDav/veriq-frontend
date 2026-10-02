'use client';

import React, { useEffect, useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { AlertCircle, CheckCircle, Eye, EyeOff, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { ApiError, locationsApi } from '@/lib/api';
import { referralCodesApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { PropertyCategory, UserRole, type AllowedState, type RegisterDto } from '@/types';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, FieldShell, Notice } from '@/components/ui';

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

/** The prototype opens signup on an "Account type" select rather than two tiles. */
const ACCOUNT_TYPES = [
  { value: UserRole.RENTER, label: 'Renter' },
  { value: UserRole.PROPERTY_OPERATOR, label: 'Operator' },
] as const;

const ROLE_WORD: Record<string, string> = {
  [UserRole.RENTER]: 'Renter',
  [UserRole.PROPERTY_OPERATOR]: 'Operator',
};

/**
 * What an Operator account is set up to list. The register endpoint requires at least one and accepts
 * up to six (Master Blueprint §3), so this is a checkbox group rather than the prototype's single
 * "Operator type" select — an owner with a block of flats and a short let is one account, not two.
 */
const OPERATOR_CATEGORIES = [
  { value: PropertyCategory.RESIDENTIAL, label: 'Residential Property' },
  { value: PropertyCategory.SHORT_LET, label: 'Short Lets' },
  { value: PropertyCategory.HOSTEL, label: 'Hostels' },
  { value: PropertyCategory.SHARED_PROPERTY, label: 'Shared Property' },
  { value: PropertyCategory.FOR_SALE, label: 'Property for Sale' },
] as const;

// ─── Component ────────────────────────────────────────────────────────────

/**
 * The prototype's `#signup` panel, with real registration in it.
 *
 * The prototype is a demo — it collects a name, an email and a referral code and has no password at
 * all. This keeps its shell, its "Account type" select, its "Create your {role} account" heading, its
 * optional referral field and its notice, and adds the fields registration actually requires.
 */
function RegisterPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const defaultRole = params.get('role') === 'operator' ? UserRole.PROPERTY_OPERATOR : UserRole.RENTER;

  // Google sign-up stays implemented end to end — `loginWithGoogle` and its endpoint are untouched —
  // but the prototype's signup panel offers one route in, so no Google control is rendered here.
  const { register: registerUser } = useAuth();
  const { success } = useToast();

  const [selectedRole, setSelectedRole] = useState<UserRole>(defaultRole);
  const [showPassword, setShowPassword] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [passwordValue, setPasswordValue] = useState('');
  const [states, setStates] = useState<AllowedState[]>([]);
  const [statesLoading, setStatesLoading] = useState(true);
  const [referralCode, setReferralCode] = useState('');
  const [categories, setCategories] = useState<PropertyCategory[]>([]);
  const [legalName, setLegalName] = useState('');
  const [acceptOperatorTerms, setAcceptOperatorTerms] = useState(false);
  const [referral, setReferral] = useState<{ status: 'idle' | 'checking' | 'valid' | 'invalid'; agentName?: string; message?: string }>({ status: 'idle' });

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
  });

  const isOperator = selectedRole === UserRole.PROPERTY_OPERATOR;
  const roleWord = ROLE_WORD[selectedRole] ?? 'Veriq';

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
    // Both are required by the register endpoint for an Operator, so they are caught here rather
    // than coming back as a wall of validator messages.
    if (selectedRole === UserRole.PROPERTY_OPERATOR && categories.length === 0) {
      setServerError('Choose at least one kind of property you will list.');
      return;
    }
    if (selectedRole === UserRole.PROPERTY_OPERATOR && !acceptOperatorTerms) {
      setServerError('Accept the Operator Terms to create a Property Operator account.');
      return;
    }
    try {
      await registerUser({
        firstName: data.firstName,
        lastName: data.lastName,
        email: data.email,
        phone: data.phone || undefined,
        state: data.state,
        password: data.password,
        role: selectedRole,
        ...(selectedRole === UserRole.PROPERTY_OPERATOR
          ? {
              operatorCategories: categories,
              acceptOperatorTerms,
              // The API falls back to first + last name when this is blank, so it is only sent when given.
              ...(legalName.trim() ? { legalName: legalName.trim() } : {}),
              ...(code ? { referralCode: code } : {}),
            }
          : {}),
      } satisfies RegisterDto);
      success('Account created. Check your email for the verification code.');
      // Every account verifies by email at signup, Operators included. An Operator's phone is still
      // verified before they can post — the posting-readiness check is where that is asked for.
      const email = encodeURIComponent(data.email.trim().toLowerCase());
      router.push(`/auth/verify-email?email=${email}`);
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
    <AuthPanel
      title={`Create your ${roleWord} account`}
      lead="A Veriq account takes a minute. You can browse for free either way."
    >
      {serverError && (
        <Notice tone="amber" icon={<AlertCircle className="h-5 w-5" />} title="We could not create your account">
          {serverError}
        </Notice>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-[22px]" noValidate>
        {/*
          A plain select rather than the shared one: that primitive always starts blank on a "Select…"
          placeholder, because Blueprint §4 forbids a preselected answer on an important field. Account
          type is the exception the prototype makes — it opens on a choice and the heading follows it —
          and neither option is a silent default that could be submitted unnoticed.
        */}
        <FieldShell htmlFor="register-role" label="Account type" required>
          <select
            id="register-role"
            className="input"
            value={selectedRole}
            onChange={(event) => setSelectedRole(event.target.value as UserRole)}
          >
            {ACCOUNT_TYPES.map(({ value, label }) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </FieldShell>

        <FieldShell htmlFor="register-first-name" label="First name" required error={errors.firstName?.message}>
          <input
            id="register-first-name"
            {...register('firstName')}
            type="text"
            autoComplete="given-name"
            className="input"
          />
        </FieldShell>

        <FieldShell htmlFor="register-last-name" label="Last name" required error={errors.lastName?.message}>
          <input
            id="register-last-name"
            {...register('lastName')}
            type="text"
            autoComplete="family-name"
            className="input"
          />
        </FieldShell>

        <FieldShell htmlFor="register-email" label="Email address" required error={errors.email?.message}>
          <input
            id="register-email"
            {...register('email')}
            type="email"
            autoComplete="email"
            className="input"
          />
        </FieldShell>

        <FieldShell
          htmlFor="register-phone"
          label="Phone number"
          required={isOperator}
          optional={!isOperator}
          error={errors.phone?.message}
        >
          <input
            id="register-phone"
            {...register('phone')}
            type="tel"
            autoComplete="tel"
            className="input"
            placeholder="+234 800 000 0000"
          />
        </FieldShell>

        <FieldShell
          htmlFor="register-state"
          label="State"
          required
          error={errors.state?.message}
          hint={!statesLoading && states.length === 0 ? 'No states are currently active. Please contact support.' : undefined}
        >
          <select id="register-state" {...register('state')} disabled={statesLoading} className="input disabled:opacity-60">
            <option value="">{statesLoading ? 'Loading states…' : 'Select your state'}</option>
            {states.map((state) => (
              <option key={state.id} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        </FieldShell>

        {isOperator && (
          <fieldset className="min-w-0">
            <legend className="label">Operator type *</legend>
            <p className="mb-3 text-xs text-muted-foreground">
              What you will list. Pick every one that applies.
            </p>
            <div className="flex flex-col gap-2.5">
              {OPERATOR_CATEGORIES.map(({ value, label }) => (
                <label key={value} className="flex items-start gap-2.5 text-ui-md text-foreground">
                  <input
                    type="checkbox"
                    className="mt-1 rounded border-input bg-[#070b1444]"
                    checked={categories.includes(value)}
                    onChange={(event) =>
                      setCategories((current) =>
                        event.target.checked
                          ? [...current, value]
                          : current.filter((item) => item !== value),
                      )
                    }
                  />
                  <span>{label}</span>
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {isOperator && (
          <FieldShell
            htmlFor="register-legal-name"
            label="Business name"
            optional
            hint="Leave blank to use your own name."
          >
            <input
              id="register-legal-name"
              type="text"
              maxLength={200}
              autoComplete="organization"
              className="input"
              value={legalName}
              onChange={(event) => setLegalName(event.target.value)}
            />
          </FieldShell>
        )}

        {isOperator && (
          <FieldShell
            htmlFor="register-referral"
            label="Agent referral code"
            optional
            error={referral.status === 'invalid' ? (referral.message ?? 'Referral code is not valid') : undefined}
            hint={
              referral.status === 'checking' ? (
                <span className="flex items-center gap-1.5">
                  <LoadingSpinner size="sm" /> Checking code…
                </span>
              ) : referral.status === 'valid' ? (
                <span className="flex items-center gap-1.5 text-[#6ee7b7]">
                  <CheckCircle className="h-3 w-3" /> Referred by {referral.agentName || 'a Veriq Agent'} — they will be
                  assigned to verify your properties.
                </span>
              ) : undefined
            }
          >
            <input
              id="register-referral"
              type="text"
              autoCapitalize="characters"
              maxLength={20}
              value={referralCode}
              onChange={(event) => setReferralCode(event.target.value.toUpperCase())}
              className="input uppercase placeholder:normal-case"
              placeholder="If a Veriq Agent referred you"
            />
          </FieldShell>
        )}

        <FieldShell htmlFor="register-password" label="Password" required error={errors.password?.message}>
          <div className="relative">
            <input
              id="register-password"
              {...register('password')}
              type={showPassword ? 'text' : 'password'}
              autoComplete="new-password"
              className="input pr-11"
              placeholder="Create a strong password"
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
          {passwordValue.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {PASSWORD_HINTS.map((hint) => (
                <span
                  key={hint.label}
                  className={`flex items-center gap-1 text-[10px] ${
                    hint.test(passwordValue) ? 'text-primary' : 'text-muted-foreground'
                  }`}
                >
                  <CheckCircle className="h-2.5 w-2.5" />
                  {hint.label}
                </span>
              ))}
            </div>
          )}
        </FieldShell>

        {isOperator && (
          <Notice icon={<Users className="h-5 w-5" />} title="No referral? You can still join">
            Provide property and unit intelligence. Your assigned Agent verifies the submission, links Street
            Intelligence and publishes. Sellers start with an Agent-assisted listing.
          </Notice>
        )}

        {/*
          Required by the register endpoint for an Operator account, and separate from the site Terms
          below on purpose — Blueprint §3 wants the Operator Terms accepted as its own act.
        */}
        {isOperator && (
          <label htmlFor="operator-terms" className="flex items-start gap-2.5 text-ui-md text-muted-foreground">
            <input
              type="checkbox"
              id="operator-terms"
              className="mt-1 rounded border-input bg-[#070b1444]"
              checked={acceptOperatorTerms}
              onChange={(event) => setAcceptOperatorTerms(event.target.checked)}
            />
            <span>
              I accept the{' '}
              <Link href="/operator-terms" className="font-semibold text-primary hover:underline">
                Operator Terms
              </Link>
              , including how my listings are verified and published.
            </span>
          </label>
        )}

        <div>
          <label htmlFor="terms" className="flex items-start gap-2.5 text-ui-md text-muted-foreground">
            <input
              {...register('terms')}
              type="checkbox"
              id="terms"
              className="mt-1 rounded border-input bg-[#070b1444]"
            />
            <span>
              I agree to the{' '}
              <Link href="/terms" className="font-semibold text-primary hover:underline">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link href="/privacy" className="font-semibold text-primary hover:underline">
                Privacy Policy
              </Link>
              . I confirm I am at least 18 years old.
            </span>
          </label>
          {errors.terms && (
            <p role="alert" className="mt-1 text-xs font-medium text-destructive">
              {errors.terms.message}
            </p>
          )}
        </div>

        <Button
          type="submit"
          disabled={isSubmitting || statesLoading || states.length === 0}
          className="w-full"
        >
          {isSubmitting && <LoadingSpinner size="sm" />}
          {isSubmitting ? 'Creating account…' : `Create ${roleWord} account`}
        </Button>
      </form>

      <p className="text-ui-md text-muted-foreground">
        Already have an account?{' '}
        <Link href="/auth/login" className="font-semibold text-primary hover:underline">
          Sign in
        </Link>
        .
      </p>
    </AuthPanel>
  );
}

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterPageInner />
    </Suspense>
  );
}
