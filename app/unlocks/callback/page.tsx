'use client';

import { Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { CheckCircle, Clock, Copy, KeyRound, RefreshCw, XCircle } from 'lucide-react';
import { unlocksApi } from '@/lib/api/renter';
import type { UnlockHistoryItem, UnlockView } from '@/types/renter';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { BackToDashboard } from '@/components/ui/BackToDashboard';
import { AccessCountdown } from '@/components/renter/AccessCountdown';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { clearPendingCheckout, readPendingCheckout } from '@/components/renter/pendingCheckout';
import { TARGET_TYPE_LABELS, formatNaira, listingHref } from '@/components/renter/format';

type Outcome = 'verifying' | 'success' | 'pending' | 'failed' | 'duplicate' | 'not_found' | 'error';

const MAX_AUTO_CHECKS = 5;
const AUTO_CHECK_DELAY_MS = 5000;

/** Finds the checkout for a payment reference: saved state first, then Unlock History. */
async function findUnlockByReference(reference: string): Promise<{ id: string; listing: UnlockHistoryItem['listing'] } | null> {
  const saved = readPendingCheckout();
  if (saved && saved.reference === reference) return { id: saved.unlockId, listing: null };
  for (let page = 1; page <= 5; page += 1) {
    const res = await unlocksApi.my(page, 50);
    const match = res.data.find((item) => item.paymentReference === reference);
    if (match) return { id: match.id, listing: match.listing };
    if (page >= (res.meta?.pages ?? 1)) break;
  }
  return null;
}

function CallbackInner() {
  const params = useSearchParams();
  const reference = params.get('reference') || params.get('trxref') || '';
  const { isAuthenticated, isLoading: authLoading } = useAuth();

  const [outcome, setOutcome] = useState<Outcome>('verifying');
  const [message, setMessage] = useState('Confirming your payment with the payment provider…');
  const [unlock, setUnlock] = useState<UnlockView | null>(null);
  const [unlockId, setUnlockId] = useState<string | null>(null);
  const [listingTitle, setListingTitle] = useState<string | null>(null);
  const [returnPath, setReturnPath] = useState<string | null>(null);
  const [error, setError] = useState<unknown>(null);
  const [checking, setChecking] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [checks, setChecks] = useState(0);
  const autoChecks = useRef(0);
  const started = useRef(false);

  const confirm = useCallback(async (id: string) => {
    setChecking(true);
    setError(null);
    try {
      const res = await unlocksApi.confirm(id, reference);
      setUnlock(res.data);
      setMessage(res.message);
      switch (res.data.status) {
        case 'unlocked':
          setOutcome('success');
          clearPendingCheckout();
          break;
        case 'pending_payment':
          setOutcome('pending');
          break;
        case 'duplicate_payment':
          setOutcome('duplicate');
          clearPendingCheckout();
          break;
        default:
          setOutcome('failed');
          clearPendingCheckout();
      }
    } catch (err) {
      setError(err);
      setOutcome('error');
    } finally {
      setChecking(false);
      setChecks((value) => value + 1);
    }
  }, [reference]);

  useEffect(() => {
    if (authLoading || started.current) return;
    if (!reference) {
      setOutcome('not_found');
      setMessage('No payment reference was returned. If you completed payment, open Unlock History to check its status.');
      return;
    }
    if (!isAuthenticated) return;
    started.current = true;
    const saved = readPendingCheckout();
    if (saved?.returnPath) setReturnPath(saved.returnPath);
    findUnlockByReference(reference)
      .then((found) => {
        if (!found) {
          setOutcome('not_found');
          setMessage('We could not find a checkout for this payment reference on your account.');
          return;
        }
        setUnlockId(found.id);
        if (found.listing) setListingTitle(found.listing.title);
        void confirm(found.id);
      })
      .catch((err) => {
        setError(err);
        setOutcome('error');
      });
  }, [attempt, authLoading, confirm, isAuthenticated, reference]);

  // Payment providers can take a few seconds to report success; re-check automatically a few times.
  useEffect(() => {
    if (outcome !== 'pending' || !unlockId || autoChecks.current >= MAX_AUTO_CHECKS) return;
    const timer = window.setTimeout(() => {
      autoChecks.current += 1;
      void confirm(unlockId);
    }, AUTO_CHECK_DELAY_MS);
    return () => window.clearTimeout(timer);
  }, [checks, confirm, outcome, unlockId]);

  if (authLoading) return <PageLoader />;

  if (!isAuthenticated && reference) {
    const redirect = `/unlocks/callback?reference=${encodeURIComponent(reference)}`;
    return (
      <Shell>
        <KeyRound className="mx-auto mb-4 h-12 w-12 text-veriq-secondary" />
        <h1 className="mb-2 font-display text-xl font-bold text-navy-900">Sign in to confirm your unlock</h1>
        <p className="mb-6 text-sm text-veriq-muted">Your session ended while you were on the payment page. Sign in again and we will confirm the payment for reference <span className="font-mono">{reference}</span>.</p>
        <Link href={`/auth/login?redirect=${encodeURIComponent(redirect)}`} className="btn-primary w-full">Sign in</Link>
      </Shell>
    );
  }

  const destination = unlock
    ? returnPath || listingHref(unlock.targetType, unlock.targetId)
    : returnPath;

  return (
    <Shell>
      {outcome === 'verifying' && (
        <>
          <div className="mb-4 flex justify-center"><LoadingSpinner size="lg" className="text-veriq-secondary" /></div>
          <h1 className="mb-1 font-display text-lg font-bold text-navy-900">Verifying payment…</h1>
          <p className="text-sm text-veriq-muted">{message}</p>
          <p className="mt-3 text-xs text-slate-400">Returning from the payment page is not proof of payment, so Veriq checks with the provider before granting access.</p>
        </>
      )}

      {outcome === 'success' && unlock && (
        <>
          <CheckCircle className="mx-auto mb-4 h-14 w-14 text-emerald-500" />
          <h1 className="mb-1 font-display text-xl font-bold text-navy-900">Unlock confirmed</h1>
          <p className="mb-4 text-sm text-veriq-muted">
            {listingTitle ? `${listingTitle} is unlocked.` : `Your ${TARGET_TYPE_LABELS[unlock.targetType]} unlock is active.`}{' '}
            {unlock.feeAmount > 0 ? `Charged ${formatNaira(unlock.feeAmount)}${unlock.walletAmount > 0 ? ` (${formatNaira(unlock.walletAmount)} from wallet credit)` : ''}.` : 'Free Unlock — nothing was charged.'}
          </p>
          <div className="mb-6 text-left"><AccessCountdown expiresAt={unlock.accessExpiresAt} /></div>
          {destination && <Link href={destination} className="btn-primary w-full">Open unlocked details</Link>}
          <Link href="/dashboard/unlocks" className="btn-ghost mt-2 w-full">View Unlock History</Link>
        </>
      )}

      {outcome === 'pending' && (
        <>
          <Clock className="mx-auto mb-4 h-14 w-14 text-amber-500" />
          <h1 className="mb-1 font-display text-xl font-bold text-navy-900">Payment still processing</h1>
          <p className="mb-2 text-sm text-veriq-muted">{message}. No access is granted until the provider confirms payment.</p>
          <p className="mb-6 text-xs text-slate-400">
            {autoChecks.current < MAX_AUTO_CHECKS ? 'We will check again automatically in a few seconds.' : 'You can check again now or later from Unlock History; any reserved wallet credit is released if the payment does not complete.'}
          </p>
          <button type="button" onClick={() => unlockId && void confirm(unlockId)} disabled={checking || !unlockId} className="btn-primary w-full">
            {checking ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />} Check again
          </button>
          {unlock?.checkoutUrl && <a href={unlock.checkoutUrl} className="btn-outline mt-2 w-full">Return to payment page</a>}
          <Link href="/dashboard/unlocks" className="btn-ghost mt-2 w-full">Go to Unlock History</Link>
        </>
      )}

      {outcome === 'duplicate' && unlock && (
        <>
          <Copy className="mx-auto mb-4 h-14 w-14 text-orange-500" />
          <h1 className="mb-1 font-display text-xl font-bold text-navy-900">You already had access</h1>
          <p className="mb-6 text-sm text-veriq-muted">
            This payment arrived while an earlier unlock of the same listing was still active, so your existing access is unchanged.
            You can request an excess-payment refund of {formatNaira(unlock.externalAmount || unlock.feeAmount)} to your Veriq Wallet.
          </p>
          {unlock.refundWindowOpen && <Link href={`/dashboard/refunds/new?unlockId=${unlock.id}`} className="btn-primary w-full">Request excess-payment refund</Link>}
          <Link href={listingHref(unlock.targetType, unlock.targetId)} className="btn-outline mt-2 w-full">Open the listing</Link>
        </>
      )}

      {outcome === 'failed' && (
        <>
          <XCircle className="mx-auto mb-4 h-14 w-14 text-red-500" />
          <h1 className="mb-1 font-display text-xl font-bold text-navy-900">Payment not completed</h1>
          <p className="mb-6 text-sm text-veriq-muted">{unlock?.failureReason ?? message} No access was granted and any wallet credit held for this checkout has been released.</p>
          {destination && <Link href={destination} className="btn-primary w-full">Back to the listing</Link>}
          <Link href="/dashboard/unlocks" className="btn-ghost mt-2 w-full">View Unlock History</Link>
        </>
      )}

      {outcome === 'not_found' && (
        <>
          <XCircle className="mx-auto mb-4 h-14 w-14 text-slate-400" />
          <h1 className="mb-1 font-display text-xl font-bold text-navy-900">Checkout not found</h1>
          <p className="mb-6 text-sm text-veriq-muted">{message}</p>
          <Link href="/dashboard/unlocks" className="btn-primary w-full">Open Unlock History</Link>
        </>
      )}

      {outcome === 'error' && (
        <>
          <ApiErrorNotice error={error} fallback="We could not confirm this payment right now." className="mb-4 text-left" />
          <button
            type="button"
            onClick={() => {
              if (unlockId) {
                void confirm(unlockId);
              } else {
                started.current = false;
                setOutcome('verifying');
                setError(null);
                setAttempt((value) => value + 1);
              }
            }}
            disabled={checking}
            className="btn-primary w-full"
          >
            {checking ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />} Try again
          </button>
          <Link href="/dashboard/unlocks" className="btn-ghost mt-2 w-full">Open Unlock History</Link>
        </>
      )}
    </Shell>
  );
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen bg-navy-900 px-4 pb-16 pt-28">
      <div className="mx-auto w-full max-w-md space-y-3">
        <div className="card p-8 text-center">{children}</div>
        <div className="flex justify-center">
          <BackToDashboard className="!text-white/70 hover:!text-white" />
        </div>
      </div>
    </div>
  );
}

export default function UnlockCallbackPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <CallbackInner />
    </Suspense>
  );
}
