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
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/60">New password</label>
        <input
          type="password"
          required
          minLength={8}
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-gold-300"
          placeholder="Create a strong password"
          autoComplete="new-password"
        />
      </div>
      <div>
        <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-white/60">Confirm password</label>
        <input
          type="password"
          required
          minLength={8}
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-sm text-white placeholder:text-white/35 outline-none focus:border-gold-300"
          placeholder="Repeat password"
          autoComplete="new-password"
        />
      </div>

      <p className="text-xs leading-5 text-white/45">
        Password must include uppercase, lowercase, a number, and a special character.
      </p>
      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-100">{error}</p>}

      <button type="submit" disabled={isSubmitting} className="btn-gold w-full justify-center disabled:opacity-60">
        {isSubmitting ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <main className="min-h-screen bg-hero-pattern px-4 py-10 text-white">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/auth/login" className="mb-8 inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="rounded-2xl border border-white/10 bg-white/10 p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-gold-400/15 text-gold-300">
            <Lock className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-black">Reset password</h1>
          <p className="mt-2 text-sm leading-6 text-white/65">
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
