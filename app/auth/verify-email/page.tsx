'use client';

import { FormEvent, KeyboardEvent, Suspense, useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, Mail, RotateCw } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const CODE_LENGTH = 6;
const RESEND_COOLDOWN_SECONDS = 60;

function VerifyEmailPageInner() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email')?.trim().toLowerCase() ?? '';
  const [digits, setDigits] = useState<string[]>(Array(CODE_LENGTH).fill(''));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [verified, setVerified] = useState(false);
  const [cooldown, setCooldown] = useState(RESEND_COOLDOWN_SECONDS);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const setCode = (value: string) => {
    const next = value.replace(/\D/g, '').slice(0, CODE_LENGTH).split('');
    setDigits([...next, ...Array(CODE_LENGTH - next.length).fill('')]);
    inputs.current[Math.min(next.length, CODE_LENGTH - 1)]?.focus();
  };

  const handleDigit = (index: number, value: string) => {
    if (value.length > 1) {
      setCode(value);
      return;
    }
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits];
    next[index] = value;
    setDigits(next);
    setError('');
    if (value && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const handleKeyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index > 0) {
      inputs.current[index - 1]?.focus();
    }
    if (event.key === 'ArrowLeft' && index > 0) inputs.current[index - 1]?.focus();
    if (event.key === 'ArrowRight' && index < CODE_LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    const otp = digits.join('');
    if (!email) {
      setError('Your email address is missing. Please register again.');
      return;
    }
    if (otp.length !== CODE_LENGTH) {
      setError('Enter the complete 6-digit verification code.');
      return;
    }

    setIsSubmitting(true);
    setError('');
    try {
      await authApi.verifyEmail({ email, otp });
      setVerified(true);
      setMessage('Your email has been verified. You can now sign in.');
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Verification failed. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resend = async () => {
    if (!email || cooldown > 0 || isResending) return;
    setIsResending(true);
    setError('');
    setMessage('');
    try {
      const response = await authApi.resendVerification({ email });
      setDigits(Array(CODE_LENGTH).fill(''));
      setMessage(response.message);
      setCooldown(RESEND_COOLDOWN_SECONDS);
      inputs.current[0]?.focus();
    } catch (caught) {
      setError(caught instanceof ApiError ? caught.message : 'Unable to resend the code.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <main className="min-h-screen bg-hero-pattern flex items-center justify-center px-4 py-20">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <Link href="/" className="mb-6 inline-flex items-center gap-2.5">
            <span className="flex h-12 w-12 items-center justify-center rounded-lg bg-navy-950 p-2 ring-1 ring-white/10">
              <Image src="/images/Logo.png" alt="Veriq Logo" width={40} height={40} className="rounded-lg" />
            </span>
            <span className="text-left leading-none">
              <span className="block font-display text-xl font-bold text-white">Veriq</span>
              <span className="block text-[10px] font-semibold uppercase tracking-widest text-gold-400">Property</span>
            </span>
          </Link>
          <h1 className="font-display text-2xl font-bold text-white">Verify your email</h1>
          <p className="mt-2 text-sm text-white/60">
            {email ? <>We sent a 6-digit code to <strong className="text-white/90">{email}</strong>.</> : 'Open the verification link after registration.'}
          </p>
        </div>

        <section className="rounded-lg border border-white/20 bg-white/10 p-6 shadow-2xl backdrop-blur-xl sm:p-8">
          {verified ? (
            <div className="text-center">
              <CheckCircle className="mx-auto h-12 w-12 text-emerald-400" />
              <h2 className="mt-4 font-display text-lg font-bold text-white">Email verified</h2>
              <p className="mt-2 text-sm text-white/60">{message}</p>
              <button type="button" onClick={() => router.replace('/auth/login')} className="mt-6 w-full rounded-lg bg-gold-gradient py-3 text-sm font-bold text-navy-900">
                Continue to sign in
              </button>
            </div>
          ) : (
            <form onSubmit={submit} noValidate>
              <div className="mb-5 flex justify-center gap-2" onPaste={(event) => {
                event.preventDefault();
                setCode(event.clipboardData.getData('text'));
              }}>
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(element) => { inputs.current[index] = element; }}
                    value={digit}
                    onChange={(event) => handleDigit(index, event.target.value)}
                    onKeyDown={(event) => handleKeyDown(index, event)}
                    inputMode="numeric"
                    autoComplete={index === 0 ? 'one-time-code' : 'off'}
                    aria-label={`Verification code digit ${index + 1}`}
                    maxLength={1}
                    className="h-12 min-w-0 flex-1 rounded-lg border border-white/20 bg-white/10 text-center text-xl font-bold text-white outline-none focus:border-gold-400 focus:ring-2 focus:ring-gold-400/20 sm:h-14"
                  />
                ))}
              </div>

              {error && <p role="alert" className="mb-4 text-center text-sm text-red-300">{error}</p>}
              {message && <p className="mb-4 text-center text-sm text-emerald-300">{message}</p>}

              <button type="submit" disabled={isSubmitting} className="flex w-full items-center justify-center gap-2 rounded-lg bg-gold-gradient py-3 text-sm font-bold text-navy-900 disabled:opacity-60">
                {isSubmitting && <LoadingSpinner size="sm" className="text-navy-900" />}
                {isSubmitting ? 'Verifying...' : 'Verify email'}
              </button>

              <div className="mt-5 flex items-center justify-center gap-2 text-xs text-white/60">
                <Mail className="h-3.5 w-3.5" />
                <span>Didn&apos;t receive it?</span>
                <button type="button" onClick={resend} disabled={cooldown > 0 || isResending || !email} className="inline-flex items-center gap-1 font-semibold text-gold-400 disabled:text-white/30">
                  {isResending && <RotateCw className="h-3 w-3 animate-spin" />}
                  {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
                </button>
              </div>
            </form>
          )}
        </section>
      </div>
    </main>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailPageInner /></Suspense>;
}
