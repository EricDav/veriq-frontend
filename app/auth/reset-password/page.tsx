'use client';

import React, { Suspense, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Lock } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') ?? '';
  const email = searchParams.get('email') ?? '';
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    if (!token || !email) {
      setError('This reset link is incomplete. Please request a new one.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setIsSubmitting(true);
    try {
      await authApi.resetPassword({ email, token, newPassword });
      router.push('/auth/login?reset=success');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to reset password.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="mt-6 space-y-4">
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">New password</label>
        <input
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
          placeholder="Create a strong password"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Confirm password</label>
        <input
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
          placeholder="Repeat password"
          autoComplete="new-password"
        />
      </div>

      <p className="text-xs leading-5 text-muted-foreground">
        Password must be at least 6 characters.
      </p>
      {error && <p className="rounded-xl bg-[#fb718510] p-3 text-sm text-[#fda4af]">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full justify-center disabled:opacity-60">
        {isSubmitting ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-hero-pattern px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/auth/login" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#ffffff0f] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b98112] text-primary">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-black">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Choose a new password for your Veriq Property account.
          </p>
          <Suspense fallback={null}>
            <ResetPasswordForm />
          </Suspense>
        </div>
      </div>
    </main>
  );
}
