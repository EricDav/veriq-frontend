'use client';

import { FormEvent, KeyboardEvent, Suspense, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle, CheckCircle, MessageSquareText, RotateCw } from 'lucide-react';
import { ApiError, authApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, Notice } from '@/components/ui';

const LENGTH = 6;

function VerifyPhoneContent() {
  const router = useRouter();
  const params = useSearchParams();
  const email = params.get('email')?.trim().toLowerCase() ?? '';
  const phone = params.get('phone') ?? 'your phone number';
  const [digits, setDigits] = useState<string[]>(Array(LENGTH).fill(''));
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [verified, setVerified] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [resending, setResending] = useState(false);
  const [cooldown, setCooldown] = useState(60);
  const inputs = useRef<Array<HTMLInputElement | null>>([]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const timer = window.setInterval(() => setCooldown((value) => value - 1), 1000);
    return () => window.clearInterval(timer);
  }, [cooldown]);

  const applyCode = (raw: string) => {
    const values = raw.replace(/\D/g, '').slice(0, LENGTH).split('');
    setDigits([...values, ...Array(LENGTH - values.length).fill('')]);
    inputs.current[Math.min(values.length, LENGTH - 1)]?.focus();
  };

  const changeDigit = (index: number, value: string) => {
    if (value.length > 1) return applyCode(value);
    if (value && !/^\d$/.test(value)) return;
    const next = [...digits]; next[index] = value; setDigits(next); setError('');
    if (value && index < LENGTH - 1) inputs.current[index + 1]?.focus();
  };

  const keyDown = (index: number, event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Backspace' && !digits[index] && index) inputs.current[index - 1]?.focus();
  };

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!email) return setError('Your account email is missing. Please register again.');
    const otp = digits.join('');
    if (otp.length !== LENGTH) return setError('Enter the complete 6-digit verification code.');
    setSubmitting(true); setError('');
    try {
      await authApi.verifyAgentSignupPhone(email, otp);
      setVerified(true); setMessage('Your phone number is verified. You can now sign in.');
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Verification failed. Please try again.'); }
    finally { setSubmitting(false); }
  };

  const resend = async () => {
    if (!email || cooldown > 0 || resending) return;
    setResending(true); setError(''); setMessage('');
    try {
      const response = await authApi.resendAgentSignupPhone(email);
      setDigits(Array(LENGTH).fill('')); setMessage(response.message); setCooldown(60); inputs.current[0]?.focus();
    } catch (caught) { setError(caught instanceof ApiError ? caught.message : 'Unable to resend the code.'); }
    finally { setResending(false); }
  };

  return (
    <AuthPanel
      title="Verify your phone"
      showLinks={false}
      lead={
        <>
          We sent a 6-digit SMS code to <strong className="text-foreground">{phone}</strong>.
        </>
      }
    >
      {verified ? (
        <div className="flex flex-col gap-[22px]">
          <Notice icon={<CheckCircle className="h-5 w-5" />} title="Phone verified">
            {message}
          </Notice>
          <Button type="button" onClick={() => router.replace('/auth/login')} className="w-full">
            Continue to sign in
          </Button>
        </div>
      ) : (
        <form
          onSubmit={submit}
          onPaste={(event) => {
            event.preventDefault();
            applyCode(event.clipboardData.getData('text'));
          }}
          className="flex flex-col gap-[22px]"
        >
          <div className="flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(element) => { inputs.current[index] = element; }}
                value={digit}
                onChange={(event) => changeDigit(index, event.target.value)}
                onKeyDown={(event) => keyDown(index, event)}
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

          <Button type="submit" disabled={submitting} className="w-full">
            {submitting && <LoadingSpinner size="sm" />}
            {submitting ? 'Verifying…' : 'Verify phone'}
          </Button>

          <div className="flex items-center justify-center gap-2 text-ui-md text-muted-foreground">
            <MessageSquareText className="h-3.5 w-3.5" aria-hidden="true" />
            <span>Didn&apos;t receive it?</span>
            <button
              type="button"
              onClick={resend}
              disabled={cooldown > 0 || resending || !email}
              className="inline-flex items-center gap-1 font-semibold text-primary disabled:text-muted-foreground"
            >
              {resending && <RotateCw className="h-3 w-3 animate-spin" />}
              {cooldown > 0 ? `Resend in ${cooldown}s` : 'Resend code'}
            </button>
          </div>
        </form>
      )}
    </AuthPanel>
  );
}

export default function VerifyPhonePage() { return <Suspense><VerifyPhoneContent /></Suspense>; }
