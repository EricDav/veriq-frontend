'use client';

import React, { useState } from 'react';
import { AlertCircle, ShieldCheck } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';
import { AuthPanel } from '@/components/auth/AuthPanel';
import { Button, FieldShell, Notice } from '@/components/ui';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError('');
    setMessage('');
    setIsSubmitting(true);
    try {
      const res = await authApi.forgotPassword({ email });
      setMessage(res.message || 'If that email exists, a password reset link has been sent.');
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Unable to send reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AuthPanel
      title="Forgot password?"
      lead="Enter your account email and we will send you a secure reset link."
    >
      <form onSubmit={submit} className="flex flex-col gap-[22px]">
        <FieldShell htmlFor="forgot-email" label="Email address" required>
          <input
            id="forgot-email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="input"
            placeholder="you@example.com"
            autoComplete="email"
          />
        </FieldShell>

        {message && (
          <Notice icon={<ShieldCheck className="h-5 w-5" />}>{message}</Notice>
        )}
        {error && (
          <Notice tone="amber" icon={<AlertCircle className="h-5 w-5" />}>{error}</Notice>
        )}

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthPanel>
  );
}
