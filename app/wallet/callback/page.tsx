'use client';

import React, { Suspense, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { CheckCircle, XCircle, ArrowLeft, Wallet as WalletIcon } from 'lucide-react';
import { walletApi, ApiError } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

type VerifyState = 'verifying' | 'success' | 'error';

function WalletCallbackInner() {
  const router = useRouter();
  const params = useSearchParams();

  // Paystack appends either `reference` or `trxref` to the callback URL
  const reference = params.get('reference') || params.get('trxref');

  const [state, setState] = useState<VerifyState>('verifying');
  const [message, setMessage] = useState('Confirming your payment…');
  const [balanceFormatted, setBalanceFormatted] = useState<string | null>(null);
  const verifiedRef = useRef(false);

  useEffect(() => {
    if (verifiedRef.current) return;
    verifiedRef.current = true;

    if (!reference) {
      setState('error');
      setMessage('No payment reference was found.');
      return;
    }

    walletApi
      .verifyTopUp({ reference })
      .then((res) => {
        setState('success');
        setMessage(res.message || 'Your wallet has been topped up successfully.');
        setBalanceFormatted(res.data.balanceFormatted);
      })
      .catch((err) => {
        setState('error');
        setMessage(
          err instanceof ApiError ? err.message : 'We could not verify your payment. Please try again.',
        );
      });
  }, [reference]);

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="card p-8 text-center">
          {state === 'verifying' && (
            <>
              <div className="flex justify-center mb-4">
                <LoadingSpinner size="lg" className="text-veriq-secondary" />
              </div>
              <h1 className="font-display text-lg font-bold text-navy-900 mb-1">Verifying payment…</h1>
              <p className="text-sm text-veriq-muted">{message}</p>
            </>
          )}

          {state === 'success' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-emerald-50 flex items-center justify-center">
                  <CheckCircle className="h-7 w-7 text-emerald-500" />
                </div>
              </div>
              <h1 className="font-display text-lg font-bold text-navy-900 mb-1">Top-up successful</h1>
              <p className="text-sm text-veriq-muted mb-1">{message}</p>
              {balanceFormatted && (
                <p className="font-display text-2xl font-black text-navy-900 mt-3 mb-1">{balanceFormatted}</p>
              )}
              <p className="text-xs text-slate-400 mb-5">New wallet balance</p>
              <Link href="/dashboard/wallet" className="btn-primary !text-sm inline-flex items-center gap-2">
                <WalletIcon className="h-4 w-4" /> Go to Wallet
              </Link>
            </>
          )}

          {state === 'error' && (
            <>
              <div className="flex justify-center mb-4">
                <div className="h-14 w-14 rounded-full bg-red-50 flex items-center justify-center">
                  <XCircle className="h-7 w-7 text-red-500" />
                </div>
              </div>
              <h1 className="font-display text-lg font-bold text-navy-900 mb-1">Payment not confirmed</h1>
              <p className="text-sm text-veriq-muted mb-5">{message}</p>
              <div className="flex items-center justify-center gap-3">
                <button onClick={() => router.push('/dashboard/wallet')} className="btn-secondary !text-sm flex items-center gap-2">
                  <ArrowLeft className="h-4 w-4" /> Back to Wallet
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default function WalletCallbackPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[70vh] flex items-center justify-center px-4 py-16">
          <LoadingSpinner size="lg" className="text-veriq-secondary" />
        </div>
      }
    >
      <WalletCallbackInner />
    </Suspense>
  );
}
