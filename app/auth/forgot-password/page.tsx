'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Mail, ShieldCheck } from 'lucide-react';
import { authApi, ApiError } from '@/lib/api';

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
    <main className="min-h-screen bg-hero-pattern px-4 py-10 text-foreground">
      <div className="mx-auto flex min-h-[calc(100vh-5rem)] max-w-md flex-col justify-center">
        <Link href="/auth/login" className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Back to login
        </Link>

        <div className="rounded-2xl border border-white/10 bg-[#ffffff0f] p-6 shadow-2xl backdrop-blur">
          <div className="mb-6 flex h-12 w-12 items-center justify-center rounded-xl bg-[#10b98112] text-primary">
            <Mail className="h-6 w-6" />
          </div>
          <h1 className="font-display text-2xl font-black">Forgot password?</h1>
          <p className="mt-2 text-sm leading-6 text-muted-foreground">
            Enter your account email and we will send you a secure reset link.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div>
              <label className="mb-2 block text-xs font-semibold uppercase tracking-wide text-muted-foreground">Email</label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full rounded-xl border border-white/15 bg-[#ffffff0f] px-4 py-3 text-sm text-foreground placeholder:text-muted-foreground outline-none focus:border-ring"
                placeholder="you@example.com"
                autoComplete="email"
              />
            </div>

            {message && (
              <div className="flex items-start gap-2 rounded-xl border border-[#10b98135] bg-[#10b98112] p-3 text-sm text-[#6ee7b7]">
                <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
                <span>{message}</span>
              </div>
            )}
            {error && <p className="rounded-xl bg-[#fb718510] p-3 text-sm text-[#fda4af]">{error}</p>}

            <button type="submit" disabled={isSubmitting} className="btn-gold w-full justify-center disabled:opacity-60">
              {isSubmitting ? 'Sending...' : 'Send reset link'}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
