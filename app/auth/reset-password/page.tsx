'use client';

import React, { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AlertCircle } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, FieldShell, Notice } from '@/components/ui';

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
    <form onSubmit={submit} className="flex flex-col gap-[22px]">
      <FieldShell htmlFor="reset-password" label="New password" required hint="Password must be at least 6 characters.">
        <input
          id="reset-password"
          type="password"
          required
          minLength={6}
          value={newPassword}
          onChange={(event) => setNewPassword(event.target.value)}
          className="input"
          placeholder="Create a strong password"
          autoComplete="new-password"
        />
      </FieldShell>

      <FieldShell htmlFor="reset-confirm" label="Confirm password" required>
        <input
          id="reset-confirm"
          type="password"
          required
          minLength={6}
          value={confirmPassword}
          onChange={(event) => setConfirmPassword(event.target.value)}
          className="input"
          placeholder="Repeat password"
          autoComplete="new-password"
        />
      </FieldShell>

      {error && (
        <Notice tone="amber" icon={<AlertCircle className="h-5 w-5" />}>{error}</Notice>
      )}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? 'Resetting…' : 'Reset password'}
      </Button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <AuthPanel
      title="Reset password"
      lead="Choose a new password for your Veriq account."
      showLinks={false}
    >
      <Suspense fallback={null}>
        <ResetPasswordForm />
      </Suspense>
    </AuthPanel>
  );
}
