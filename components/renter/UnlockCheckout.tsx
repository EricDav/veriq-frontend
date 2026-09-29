'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle, CheckCircle, Clock, CreditCard, Gift, Info, Lock, ShieldCheck, Wallet, XCircle,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { unlocksApi } from '@/lib/api/renter';
import type { ListingTargetType, UnlockQuote, UnlockView } from '@/types/renter';
import { Badge, Button, Eyebrow, Notice } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { formatStay, type StayRange } from '@/components/ui/DateRangeFields';
import { ApiErrorNotice } from './ApiErrorNotice';
import { UnlockBlockedCallout } from './UnlockBlockedCallout';
import { formatDateTime, formatHours, formatNaira, locationLine, newIdempotencyKey } from './format';
import { savePendingCheckout } from './pendingCheckout';

type Phase = 'review' | 'processing' | 'redirecting' | 'pending' | 'failed';

/** The prototype's `.price-line`: label left, amount right, hairline between rows. */
function PriceLine({ label, amount, total = false }: { label: React.ReactNode; amount: React.ReactNode; total?: boolean }) {
  return (
    <div
      className={
        total
          ? 'flex items-baseline justify-between gap-[18px] py-5 text-[1.3rem] font-semibold text-foreground'
          : 'flex items-baseline justify-between gap-[18px] border-b border-[#ffffff10] py-3 text-ui-md'
      }
    >
      <span className={total ? '' : 'text-muted-foreground'}>{label}</span>
      <span className={total ? '' : 'font-semibold text-foreground'}>{amount}</span>
    </div>
  );
}

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
 *
 * Laid out as the prototype's checkout summary — `.price-line` rows ending in a total — rather than a table.
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
        <div className="flex flex-col items-center justify-center gap-3 py-12 text-ui-md text-muted-foreground" aria-live="polite">
          <LoadingSpinner size="lg" className="text-primary" /> Preparing your checkout…
        </div>
      ) : quoteError ? (
        <ApiErrorNotice error={quoteError} fallback="We could not prepare this checkout." onRetry={loadQuote} />
      ) : quote ? (
        <div className="max-h-[70vh] space-y-5 overflow-y-auto pr-1">
          <div>
            <Eyebrow>Straight to checkout</Eyebrow>
            <p className="mt-1 font-display text-lg font-semibold text-foreground">{quote.listing.title}</p>
            <p className="text-ui-sm text-muted-foreground">{locationLine(quote.listing.area, quote.listing.city)}</p>
          </div>

          {phase === 'pending' && pendingUnlock && (
            <Notice tone="amber" icon={<Clock className="h-4 w-4" />} title="Payment not confirmed yet">
              <p>
                {statusMessage} No access is granted until payment is confirmed. Reference{' '}
                <span className="font-mono text-foreground">{pendingUnlock.paymentReference}</span>.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                {pendingUnlock.checkoutUrl && (
                  <Button asChild size="small">
                    <a
                      href={pendingUnlock.checkoutUrl}
                      onClick={() => savePendingCheckout({ unlockId: pendingUnlock.id, reference: pendingUnlock.paymentReference, targetType, targetId, returnPath })}
                    >
                      <CreditCard aria-hidden="true" className="h-4 w-4" /> Continue to payment
                    </a>
                  </Button>
                )}
                <Button variant="secondary" size="small" onClick={checkStatus} disabled={busyAction !== null}>
                  {busyAction === 'confirm' && <LoadingSpinner size="sm" />} Check payment status
                </Button>
                <Button variant="ghost" size="small" onClick={cancelCheckout} disabled={busyAction !== null}>
                  {busyAction === 'cancel' && <LoadingSpinner size="sm" />} Cancel checkout
                </Button>
              </div>
            </Notice>
          )}

          {phase === 'failed' && (
            <div role="alert" className="rounded-xl border border-[#fb718530] bg-[#fb718510] px-5 py-[18px] text-ui-md">
              <p className="flex items-center gap-2 font-semibold text-foreground">
                <XCircle aria-hidden="true" className="h-4 w-4 text-[#fda4af]" /> No access was granted
              </p>
              <p className="mt-[3px] text-muted-foreground">{statusMessage}</p>
              <Button variant="secondary" size="small" className="mt-3" onClick={retry}>
                Start a new checkout
              </Button>
            </div>
          )}

          {phase === 'redirecting' && (
            <Notice icon={<LoadingSpinner size="sm" />} title="Taking you to the secure payment page…" />
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
            <Notice icon={<Info className="h-4 w-4" />} title="You manage this listing">
              Its protected details are already available to you, so it cannot be unlocked.
            </Notice>
          ) : quote.alreadyUnlocked ? (
            <Notice icon={<CheckCircle className="h-4 w-4" />} title="You already have active access">
              {quote.alreadyUnlocked.accessExpiresAt && (
                <p>Access ends {formatDateTime(quote.alreadyUnlocked.accessExpiresAt)}. No new charge is needed.</p>
              )}
              <Button
                size="small"
                className="mt-3"
                onClick={() => {
                  onClose();
                  void onUnlocked();
                }}
              >
                Open unlocked details
              </Button>
            </Notice>
          ) : (
            <>
              <div className="rounded-unit border border-[#ffffff18] bg-[#070b1444] px-[17px] py-1">
                <PriceLine
                  label={`${formatHours(quote.accessHours)} property access`}
                  amount={
                    isFree ? (
                      <span className="inline-flex items-center gap-1.5 text-[#6ee7b7]">
                        <Gift aria-hidden="true" className="h-4 w-4" /> Free · ₦0
                      </span>
                    ) : (
                      quote.priceFormatted
                    )
                  }
                />
                {isFree && quote.standardPrice > 0 && (
                  <p className="py-2 text-right text-ui-sm text-muted-foreground">
                    Usually <span className="line-through">{formatNaira(quote.standardPrice)}</span>
                    {quote.freeUnlockEndsAt && ` · free until ${formatDateTime(quote.freeUnlockEndsAt)}`}
                  </p>
                )}
                {!isFree && !quote.signInRequired && (
                  <PriceLine
                    label={
                      <span className="inline-flex items-center gap-1.5">
                        <Wallet aria-hidden="true" className="h-4 w-4" /> Refund credit applied automatically
                      </span>
                    }
                    amount={
                      <span className="text-[#6ee7b7]">
                        {quote.walletCreditApplied > 0 ? `− ${formatNaira(quote.walletCreditApplied)}` : '−₦0'}
                      </span>
                    }
                  />
                )}
                <PriceLine
                  total
                  label={quote.signInRequired && !isFree ? 'To pay (before any credit)' : 'Pay now'}
                  amount={formatNaira(quote.signInRequired ? quote.price : quote.remainingToPay)}
                />
              </div>

              {!isFree && !quote.signInRequired && (
                <p className="text-ui-sm text-muted-foreground">
                  {quote.noAdditionalPaymentNeeded
                    ? 'No additional payment needed — your refund credit covers this unlock.'
                    : quote.walletCreditApplied > 0
                      ? `Your available credit is applied automatically. Only ${formatNaira(quote.remainingToPay)} is collected on the secure payment page.`
                      : 'The full fee is collected on the secure payment page. No wallet top-up is needed.'}
                </p>
              )}
              {quote.signInRequired && !isFree && (
                <p className="text-ui-sm text-muted-foreground">Sign in to see any refund credit applied automatically.</p>
              )}

              <div className="grid gap-3 wide:grid-cols-2">
                <div className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-ui-sm text-muted-foreground">
                  <p className="flex items-center gap-1.5 font-semibold text-foreground">
                    <Clock aria-hidden="true" className="h-3.5 w-3.5" /> Access period
                  </p>
                  <p className="mt-1">
                    {formatHours(quote.accessHours)} from confirmation, with the exact end time shown on your unlock.
                    Protected details lock again when it ends.
                  </p>
                </div>
                <div className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-ui-sm text-muted-foreground">
                  <Badge tone={quote.availability.overall === 'available' ? 'success' : 'amber'}>
                    {quote.availability.overall === 'available' ? 'Available now' : 'Currently unavailable'}
                  </Badge>
                  {quote.availability.documentedUnits > 0 && (
                    <p className="mt-2">
                      {quote.availability.availableUnits} of {quote.availability.documentedUnits} documented unit
                      {quote.availability.documentedUnits === 1 ? '' : 's'} available now.
                    </p>
                  )}
                  {quote.availability.requestedDates && (
                    <p className="mt-1 font-medium text-foreground">Checked for {formatStay(quote.availability.requestedDates)}.</p>
                  )}
                </div>
              </div>

              {quote.availability.disclosure && (
                <Notice tone="amber" icon={<AlertCircle className="h-4 w-4" />}>
                  {quote.availability.disclosure}
                </Notice>
              )}

              <div>
                <Eyebrow>What this unlock includes</Eyebrow>
                <ul className="mt-2 grid gap-1.5 wide:grid-cols-2">
                  {quote.included.map((item) => (
                    <li key={item} className="flex items-start gap-2 text-ui-sm text-muted-foreground">
                      <CheckCircle aria-hidden="true" className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-primary" /> {item}
                    </li>
                  ))}
                </ul>
              </div>

              <Notice icon={<ShieldCheck className="h-4 w-4" />} title="Approved refunds return as wallet credit">
                <p>
                  {quote.disclosures.refund} Read the{' '}
                  <Link href="/refund-policy" className="font-semibold text-primary hover:underline" target="_blank">
                    Refund Policy
                  </Link>
                  .
                </p>
                <p className="mt-1.5">{quote.disclosures.value}</p>
              </Notice>

              <ApiErrorNotice error={actionError} fallback="We could not start this unlock." />

              {phase !== 'pending' && phase !== 'failed' && (
                <div className="flex flex-col-reverse gap-2 wide:flex-row wide:justify-end">
                  <Button variant="secondary" onClick={onClose} disabled={phase === 'processing' || phase === 'redirecting'}>
                    Not now
                  </Button>
                  {quote.signInRequired ? (
                    <Button asChild>
                      <Link href={loginHref}>
                        <Lock aria-hidden="true" className="h-4 w-4" /> Sign in to unlock
                      </Link>
                    </Button>
                  ) : (
                    <Button onClick={startCheckout} disabled={phase === 'processing' || phase === 'redirecting'}>
                      {phase === 'processing' ? (
                        <LoadingSpinner size="sm" />
                      ) : isFree ? (
                        <Gift aria-hidden="true" className="h-4 w-4" />
                      ) : (
                        <Lock aria-hidden="true" className="h-4 w-4" />
                      )}
                      {phase === 'processing' ? 'Confirming…' : primaryLabel}
                    </Button>
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
