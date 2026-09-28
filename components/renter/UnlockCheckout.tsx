'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle, Clock, CreditCard, Gift, Info, Lock, ShieldCheck, Wallet, XCircle,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { unlocksApi } from '@/lib/api/renter';
import type { ListingTargetType, UnlockQuote, UnlockView } from '@/types/renter';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { formatStay, type StayRange } from '@/components/ui/DateRangeFields';
import { ApiErrorNotice } from './ApiErrorNotice';
import { UnlockBlockedCallout } from './UnlockBlockedCallout';
import { formatDateTime, formatHours, formatNaira, locationLine, newIdempotencyKey } from './format';
import { savePendingCheckout } from './pendingCheckout';

type Phase = 'review' | 'processing' | 'redirecting' | 'pending' | 'failed';

interface UnlockCheckoutProps {
  isOpen: boolean;
  onClose: () => void;
  targetType: ListingTargetType;
  targetId: string;
  /** Page the renter returns to after sign-in or payment. */
  returnPath: string;
  /** Short Let stay the unlock is bought for; availability is judged against exactly these nights (§5). */
  stay?: StayRange;
  /** Offered when only the selected nights are taken, so the renter is never left at a dead end. */
  onChangeDates?: () => void;
  /** Called once access is confirmed (new or existing) so the page can load the unlocked package. */
  onUnlocked: () => void | Promise<void>;
}

/**
 * Direct unlock checkout (§12.8, §30.1): effective fee, wallet credit applied, remaining payment, access period,
 * availability and refund-to-wallet disclosure before confirmation, then payment status. Access is granted only by
 * the server after settlement; returning from the payment page is verified on /unlocks/callback.
 */
export function UnlockCheckout({ isOpen, onClose, targetType, targetId, returnPath, stay, onChangeDates, onUnlocked }: UnlockCheckoutProps) {
  const { success } = useToast();
  const [quote, setQuote] = useState<UnlockQuote | null>(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState<unknown>(null);
  const [phase, setPhase] = useState<Phase>('review');
  const [actionError, setActionError] = useState<unknown>(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [pendingUnlock, setPendingUnlock] = useState<UnlockView | null>(null);
  const [busyAction, setBusyAction] = useState<'confirm' | 'cancel' | null>(null);
  const idempotencyKey = useRef(newIdempotencyKey());

  // Only a complete range is quotable, and the two dates are kept as primitives so the quote re-runs when they
  // change rather than on every render (Master Blueprint §5).
  const checkIn = stay?.checkIn && stay.checkOut ? stay.checkIn : undefined;
  const checkOut = stay?.checkIn && stay.checkOut ? stay.checkOut : undefined;

  const loadQuote = useCallback(async () => {
    setQuoteLoading(true);
    setQuoteError(null);
    const dates = checkIn && checkOut ? { checkIn, checkOut } : {};
    try {
      const res = await unlocksApi.quote(targetType, targetId, dates).catch((err: unknown) => {
        if (err instanceof ApiError && err.statusCode === 401)
          return unlocksApi.quotePublic(targetType, targetId, dates);
        throw err;
      });
      setQuote(res.data);
    } catch (err) {
      setQuote(null);
      setQuoteError(err);
    } finally {
      setQuoteLoading(false);
    }
  }, [checkIn, checkOut, targetId, targetType]);

  useEffect(() => {
    if (!isOpen) return;
    idempotencyKey.current = newIdempotencyKey();
    setPhase('review');
    setActionError(null);
    setStatusMessage('');
    setPendingUnlock(null);
    void loadQuote();
  }, [isOpen, loadQuote]);

  const finish = async (message: string) => {
    success(message);
    onClose();
    await onUnlocked();
  };

  const startCheckout = async () => {
    setPhase('processing');
    setActionError(null);
    try {
      const res = await unlocksApi.initiate({
        targetType,
        targetId,
        idempotencyKey: idempotencyKey.current,
        ...(checkIn && checkOut ? { checkIn, checkOut } : {}),
      });
      const { state, unlock, checkout } = res.data;
      if (state === 'unlocked' || state === 'already_unlocked') {
        await finish(res.message || 'Unlock confirmed');
        return;
      }
      if (state === 'payment_required') {
        const url = checkout?.authorizationUrl ?? unlock.checkoutUrl;
        if (url) {
          savePendingCheckout({ unlockId: unlock.id, reference: checkout?.reference ?? unlock.paymentReference, targetType, targetId, returnPath });
          setPhase('redirecting');
          window.location.assign(url);
          return;
        }
        setPendingUnlock(unlock);
        setStatusMessage(res.message || 'Complete payment to unlock');
        setPhase('pending');
        return;
      }
      idempotencyKey.current = newIdempotencyKey();
      setStatusMessage(unlock.failureReason ?? res.message ?? 'This checkout is closed.');
      setPhase('failed');
    } catch (err) {
      idempotencyKey.current = newIdempotencyKey();
      setActionError(err);
      setPhase('review');
    }
  };

  const checkStatus = async () => {
    if (!pendingUnlock) return;
    setBusyAction('confirm');
    setActionError(null);
    try {
      const res = await unlocksApi.confirm(pendingUnlock.id);
      if (res.data.status === 'unlocked') {
        await finish(res.message || 'Unlock confirmed');
        return;
      }
      setPendingUnlock(res.data);
      setStatusMessage(res.message);
      if (res.data.status !== 'pending_payment') {
        idempotencyKey.current = newIdempotencyKey();
        setPhase('failed');
      }
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyAction(null);
    }
  };

  const cancelCheckout = async () => {
    if (!pendingUnlock) return;
    setBusyAction('cancel');
    setActionError(null);
    try {
      const res = await unlocksApi.cancel(pendingUnlock.id);
      if (res.data.status === 'unlocked') {
        await finish(res.message || 'Payment had already completed; unlock is active');
        return;
      }
      idempotencyKey.current = newIdempotencyKey();
      setPendingUnlock(null);
      setStatusMessage(res.message || 'Checkout cancelled; reserved credit released');
      setPhase('failed');
    } catch (err) {
      setActionError(err);
    } finally {
      setBusyAction(null);
    }
  };

  const retry = () => {
    setPhase('review');
    setStatusMessage('');
    setActionError(null);
    void loadQuote();
  };

  const loginHref = `/auth/login?redirect=${encodeURIComponent(returnPath)}`;
  const isFree = !!quote && (quote.isFreeUnlock || quote.price === 0);
  // The quote's own gate decides; where it is absent, the availability in the same payload does (§5).
  const unlockBlocked = !!quote && (quote.canUnlock === false || (quote.canUnlock === undefined && quote.availability.overall !== 'available'));

  let primaryLabel = 'Confirm unlock';
  if (quote) {
    if (isFree) primaryLabel = 'Unlock free — ₦0';
    else if (quote.remainingToPay === 0) primaryLabel = 'Confirm unlock with wallet credit';
    else primaryLabel = `Continue to pay ${formatNaira(quote.remainingToPay)}`;
  }

  return (
    <Modal isOpen={isOpen} onClose={phase === 'processing' || phase === 'redirecting' ? () => undefined : onClose} title="Unlock checkout" size="lg">
      {quoteLoading && !quote ? (
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-sm text-veriq-muted">
          <LoadingSpinner size="lg" className="text-veriq-secondary" /> Preparing your checkout…
        </div>
      ) : quoteError ? (
        <ApiErrorNotice error={quoteError} fallback="We could not prepare this checkout." onRetry={loadQuote} />
      ) : quote ? (
        <div className="max-h-[70vh] space-y-4 overflow-y-auto pr-1">
          <div>
            <p className="text-sm font-bold text-navy-900">{quote.listing.title}</p>
            <p className="text-xs text-veriq-muted">{locationLine(quote.listing.area, quote.listing.city)}</p>
          </div>

          {phase === 'pending' && pendingUnlock && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-amber-800"><Clock className="h-4 w-4" /> Payment not confirmed yet</p>
              <p className="mt-1 text-xs leading-5 text-amber-800">{statusMessage} No access is granted until payment is confirmed. Reference {pendingUnlock.paymentReference}.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingUnlock.checkoutUrl && (
                  <a href={pendingUnlock.checkoutUrl} onClick={() => savePendingCheckout({ unlockId: pendingUnlock.id, reference: pendingUnlock.paymentReference, targetType, targetId, returnPath })} className="btn-primary !px-4 !py-2 !text-sm">
                    <CreditCard className="h-4 w-4" /> Continue to payment
                  </a>
                )}
                <button type="button" onClick={checkStatus} disabled={busyAction !== null} className="btn-outline !px-4 !py-2 !text-sm">
                  {busyAction === 'confirm' && <LoadingSpinner size="sm" />} Check payment status
                </button>
                <button type="button" onClick={cancelCheckout} disabled={busyAction !== null} className="btn-ghost !px-4 !py-2 !text-sm text-red-600">
                  {busyAction === 'cancel' && <LoadingSpinner size="sm" />} Cancel checkout
                </button>
              </div>
            </div>
          )}

          {phase === 'failed' && (
            <div className="rounded-xl border border-red-200 bg-red-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-red-700"><XCircle className="h-4 w-4" /> No access was granted</p>
              <p className="mt-1 text-xs leading-5 text-red-700">{statusMessage}</p>
              <button type="button" onClick={retry} className="btn-outline mt-3 !px-4 !py-2 !text-sm">Start a new checkout</button>
            </div>
          )}

          {phase === 'redirecting' && (
            <div className="flex items-center gap-3 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <LoadingSpinner size="sm" /> Taking you to the secure payment page…
            </div>
          )}

          {unlockBlocked && !quote.viewerIsManager && !quote.alreadyUnlocked ? (
            // The quote still renders for an unavailable listing so the renter has somewhere to go; only the
            // purchase itself is refused (Master Blueprint §5).
            <UnlockBlockedCallout
              reason={quote.blockedReason ?? 'no_available_unit'}
              targetType={targetType}
              targetId={targetId}
              notifyMeAvailable={quote.notifyMeAvailable}
              similarAvailable={[]}
              isAuthenticated={!quote.signInRequired}
              returnPath={returnPath}
              onChangeDates={
                onChangeDates
                  ? () => {
                      onClose();
                      onChangeDates();
                    }
                  : undefined
              }
            />
          ) : quote.viewerIsManager ? (
            <div className="flex items-start gap-2 rounded-xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-800">
              <Info className="mt-0.5 h-4 w-4 flex-shrink-0" /> You manage this listing, so its protected details are already available to you and it cannot be unlocked.
            </div>
          ) : quote.alreadyUnlocked ? (
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="flex items-center gap-2 text-sm font-bold text-emerald-800"><CheckCircle className="h-4 w-4" /> You already have active access</p>
              {quote.alreadyUnlocked.accessExpiresAt && <p className="mt-1 text-xs text-emerald-700">Access ends {formatDateTime(quote.alreadyUnlocked.accessExpiresAt)}. No new charge is needed.</p>}
              <button type="button" onClick={() => { onClose(); void onUnlocked(); }} className="btn-primary mt-3 !px-4 !py-2 !text-sm">Open unlocked details</button>
            </div>
          ) : (
            <>
              <div className="rounded-xl border border-slate-200 p-4">
                <dl className="space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <dt className="text-slate-600">Unlock fee</dt>
                    <dd className="text-right font-bold text-navy-900">
                      {isFree ? (
                        <span className="inline-flex items-center gap-1.5 text-emerald-700"><Gift className="h-4 w-4" /> Free · ₦0</span>
                      ) : quote.priceFormatted}
                    </dd>
                  </div>
                  {isFree && quote.standardPrice > 0 && (
                    <p className="text-right text-[11px] text-slate-400">Usually <span className="line-through">{formatNaira(quote.standardPrice)}</span>{quote.freeUnlockEndsAt && ` · free until ${formatDateTime(quote.freeUnlockEndsAt)}`}</p>
                  )}
                  {!isFree && !quote.signInRequired && (
                    <div className="flex items-center justify-between gap-3">
                      <dt className="flex items-center gap-1.5 text-slate-600"><Wallet className="h-4 w-4 text-slate-400" /> Veriq Wallet credit applied</dt>
                      <dd className="font-semibold text-emerald-700">{quote.walletCreditApplied > 0 ? `− ${formatNaira(quote.walletCreditApplied)}` : '₦0'}</dd>
                    </div>
                  )}
                  <div className="flex items-center justify-between gap-3 border-t border-slate-100 pt-2">
                    <dt className="font-semibold text-navy-900">{quote.signInRequired && !isFree ? 'To pay (before any wallet credit)' : 'Remaining to pay'}</dt>
                    <dd className="text-lg font-black text-navy-900">{formatNaira(quote.signInRequired ? quote.price : quote.remainingToPay)}</dd>
                  </div>
                </dl>
                {!isFree && !quote.signInRequired && (
                  <p className="mt-2 text-xs text-slate-500">
                    {quote.noAdditionalPaymentNeeded
                      ? 'No additional payment needed — your wallet credit covers this unlock.'
                      : quote.walletCreditApplied > 0
                        ? `Your available credit is applied automatically. Only ${formatNaira(quote.remainingToPay)} is collected on the secure Paystack page.`
                        : 'The full fee is collected on the secure Paystack payment page. No wallet top-up is needed.'}
                  </p>
                )}
                {quote.signInRequired && !isFree && <p className="mt-2 text-xs text-slate-500">Sign in to see any Veriq Wallet credit applied automatically.</p>}
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                  <p className="flex items-center gap-1.5 font-semibold text-navy-900"><Clock className="h-3.5 w-3.5" /> Access period</p>
                  <p className="mt-1">{formatHours(quote.accessHours)} from confirmation. Protected details lock again when it ends.</p>
                </div>
                <div className={`rounded-xl p-3 text-xs ${quote.availability.overall === 'available' ? 'bg-emerald-50 text-emerald-800' : 'bg-amber-50 text-amber-800'}`}>
                  <p className="font-semibold">{quote.availability.overall === 'available' ? 'Currently available' : 'Currently unavailable'}</p>
                  {quote.availability.documentedUnits > 0 && (
                    <p className="mt-1">{quote.availability.availableUnits} of {quote.availability.documentedUnits} documented Unit{quote.availability.documentedUnits === 1 ? '' : 's'} available now.</p>
                  )}
                  {quote.availability.requestedDates && (
                    <p className="mt-1 font-medium">Checked for {formatStay(quote.availability.requestedDates)}.</p>
                  )}
                </div>
              </div>

              {quote.availability.disclosure && (
                <p className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
                  <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {quote.availability.disclosure}
                </p>
              )}

              <div>
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">What this unlock includes</p>
                <ul className="grid gap-1.5 sm:grid-cols-2">
                  {quote.included.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-xs text-navy-800"><CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" /> {item}</li>
                  ))}
                </ul>
              </div>

              <div className="space-y-2 rounded-xl bg-navy-900 p-4 text-xs leading-5 text-slate-300">
                <p className="flex items-start gap-2"><ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-400" /> <span><span className="font-semibold text-white">Refund protection: </span>{quote.disclosures.refund} Read the <Link href="/refund-policy" className="text-gold-400 underline" target="_blank">Refund Policy</Link>.</span></p>
                <p className="flex items-start gap-2"><Info className="mt-0.5 h-4 w-4 flex-shrink-0 text-gold-400" /> {quote.disclosures.value}</p>
              </div>

              <ApiErrorNotice error={actionError} fallback="We could not start this unlock." />

              {phase !== 'pending' && phase !== 'failed' && (
                <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                  <button type="button" onClick={onClose} disabled={phase === 'processing' || phase === 'redirecting'} className="btn-outline !py-2.5">Not now</button>
                  {quote.signInRequired ? (
                    <Link href={loginHref} className="btn-primary !py-2.5"><Lock className="h-4 w-4" /> Sign in to unlock</Link>
                  ) : (
                    <button type="button" onClick={startCheckout} disabled={phase === 'processing' || phase === 'redirecting'} className="btn-primary !py-2.5">
                      {phase === 'processing' ? <LoadingSpinner size="sm" /> : isFree ? <Gift className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
                      {phase === 'processing' ? 'Confirming…' : primaryLabel}
                    </button>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      ) : null}
    </Modal>
  );
}
