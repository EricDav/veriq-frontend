'use client';

import { FormEvent, KeyboardEvent, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, Mail, RotateCw } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, Notice } from '@/components/ui';

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
    <AuthPanel
      title="Verify your email"
      showLinks={false}
      lead={
        email ? (
          <>
            We sent a 6-digit code to <strong className="text-foreground">{email}</strong>.
          </>
        ) : (
          'Open the verification link after registration.'
        )
      }
    >
      {verified ? (
        <div className="flex flex-col gap-[22px]">
          <Notice icon={<CheckCircle className="h-5 w-5" />} title="Email verified">
            {message}
          </Notice>
          <Button type="button" onClick={() => router.replace('/auth/login')} className="w-full">
            Continue to sign in
          </Button>
        </div>
      ) : (
        <form onSubmit={submit} noValidate className="flex flex-col gap-[22px]">
          <div
            className="flex justify-center gap-2"
            onPaste={(event) => {
              event.preventDefault();
              setCode(event.clipboardData.getData('text'));
            }}
          >
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
                className="input h-12 min-w-0 flex-1 px-0 text-center text-xl font-semibold sm:h-14"
              />
            ))}
          </div>

          {error && (
            <Notice tone="amber" icon={<AlertCircle className="h-5 w-5" />}>{error}</Notice>
          )}
          {message && <Notice icon={<CheckCircle className="h-5 w-5" />}>{message}</Notice>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? 'Verifying…' : 'Verify email'}
          </Button>

          <div className="flex items-center justify-center gap-2 text-ui-md text-muted-foreground">
            <Mail className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || isResending || !email}
              className="inline-flex items-center gap-1 font-semibold text-primary disabled:text-muted-foreground"
            >
              {isResending && <RotateCw className="h-3 w-3 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthPanel>
  );
}

export default function VerifyEmailPage() {
  return <Suspense><VerifyEmailPageInner /></Suspense>;
}
