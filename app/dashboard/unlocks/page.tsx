'use client';

import { Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import {
  ArrowRight, Clock, CreditCard, Gift, HelpCircle, History, KeyRound, RefreshCw, Search, Undo2, Wallet,
} from 'lucide-react';
import { outcomesApi, unlocksApi } from '@/lib/api/renter';
import type { PendingOutcome, UnlockHistoryItem } from '@/types/renter';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { AccessCountdown } from '@/components/renter/AccessCountdown';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { OutcomePrompt } from '@/components/renter/OutcomePrompt';
import { savePendingCheckout } from '@/components/renter/pendingCheckout';
import {
  CATEGORY_LABELS, TARGET_TYPE_LABELS, UNLOCK_STATUS_META, apiErrorMessage, formatDateTime, formatNaira, listingHref, locationLine,
} from '@/components/renter/format';

const PAGE_SIZE = 20;

function StatusBadge({ item }: { item: UnlockHistoryItem }) {
  const meta = item.status === 'unlocked' && !item.isActive ? UNLOCK_STATUS_META.expired : UNLOCK_STATUS_META[item.status];
  return <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-[11px] font-semibold ${meta?.cls ?? 'bg-slate-100 text-slate-600'}`}>{meta?.label ?? item.status}</span>;
}

function PaymentBreakdown({ item }: { item: UnlockHistoryItem }) {
  if (item.feeAmount === 0) {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700"><Gift className="h-3.5 w-3.5" /> Free Unlock · ₦0</span>;
  }
  return (
    <span className="text-xs text-slate-500">
      <span className="font-semibold text-navy-900">{formatNaira(item.feeAmount)}</span>
      {item.walletAmount > 0 && <> · {formatNaira(item.walletAmount)} wallet credit</>}
      {item.externalAmount > 0 && <> · {formatNaira(item.externalAmount)} paid</>}
    </span>
  );
}

function ListingHeading({ item }: { item: UnlockHistoryItem }) {
  const category = item.listing ? CATEGORY_LABELS[item.listing.category] ?? TARGET_TYPE_LABELS[item.targetType] : TARGET_TYPE_LABELS[item.targetType];
  return (
    <div className="min-w-0">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{category}</p>
      <p className="truncate font-semibold text-navy-900">{item.listing?.title ?? 'Listing no longer available'}</p>
      {item.listing && <p className="truncate text-xs text-slate-500">{locationLine(item.listing.area, item.listing.city)}</p>}
    </div>
  );
}

function RefundAction({ item }: { item: UnlockHistoryItem }) {
  if (!item.refundWindowOpen) return null;
  return (
    <Link href={`/dashboard/refunds/new?unlockId=${item.id}`} className="btn-ghost !px-3 !py-2 !text-xs text-purple-700 hover:!bg-purple-50">
      <Undo2 className="h-3.5 w-3.5" /> {item.status === 'duplicate_payment' ? 'Request excess-payment refund' : 'Request refund'}
    </Link>
  );
}

function UnlocksInner() {
  const params = useSearchParams();
  const focusOutcome = params.get('outcome') === '1';
  const { success } = useToast();
  const outcomesRef = useRef<HTMLElement>(null);

  const [items, setItems] = useState<UnlockHistoryItem[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [outcomes, setOutcomes] = useState<PendingOutcome[]>([]);
  const [outcomeError, setOutcomeError] = useState<unknown>(null);
  const [actionId, setActionId] = useState<string | null>(null);
  const [actionError, setActionError] = useState<{ id: string; error: unknown } | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setOutcomeError(null);
    const [history, pending] = await Promise.allSettled([unlocksApi.my(1, PAGE_SIZE), outcomesApi.pending()]);
    if (history.status === 'fulfilled') {
      setItems(history.value.data);
      setPage(1);
      setPages(history.value.meta?.pages ?? 1);
    } else {
      setError(history.reason);
    }
    if (pending.status === 'fulfilled') setOutcomes(pending.value.data);
    else setOutcomeError(pending.reason);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  useEffect(() => {
    if (!loading && focusOutcome && outcomes.length > 0) outcomesRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [focusOutcome, loading, outcomes.length]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await unlocksApi.my(page + 1, PAGE_SIZE);
      setItems((prev) => [...prev, ...res.data.filter((item) => !prev.some((existing) => existing.id === item.id))]);
      setPage(page + 1);
      setPages(res.meta?.pages ?? pages);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  const replaceItem = (updated: Partial<UnlockHistoryItem> & { id: string }) => {
    setItems((prev) => prev.map((item) => (item.id === updated.id ? { ...item, ...updated } : item)));
  };

  const checkPayment = async (item: UnlockHistoryItem) => {
    setActionId(item.id);
    setActionError(null);
    try {
      const res = await unlocksApi.confirm(item.id);
      replaceItem(res.data);
      if (res.data.status === 'unlocked') success(res.message || 'Unlock confirmed');
    } catch (err) {
      setActionError({ id: item.id, error: err });
    } finally {
      setActionId(null);
    }
  };

  const cancelCheckout = async (item: UnlockHistoryItem) => {
    setActionId(item.id);
    setActionError(null);
    try {
      const res = await unlocksApi.cancel(item.id);
      replaceItem(res.data);
      success(res.message || 'Checkout cancelled; reserved credit released');
    } catch (err) {
      setActionError({ id: item.id, error: err });
    } finally {
      setActionId(null);
    }
  };

  const { active, pendingCheckouts, history } = useMemo(() => ({
    active: items.filter((item) => item.isActive),
    pendingCheckouts: items.filter((item) => item.status === 'pending_payment'),
    history: items.filter((item) => !item.isActive && item.status !== 'pending_payment'),
  }), [items]);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My Unlocks</h1>
          <p className="text-sm text-veriq-muted">Active access, unlock history, refund requests and what happened after your unlocks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => void load()} className="btn-outline !px-4 !py-2 !text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
          <Link href="/dashboard/refunds" className="btn-outline !px-4 !py-2 !text-sm"><Undo2 className="h-4 w-4" /> Refunds</Link>
          <Link href="/dashboard/wallet" className="btn-outline !px-4 !py-2 !text-sm"><Wallet className="h-4 w-4" /> Veriq Wallet</Link>
        </div>
      </div>

      {error ? <ApiErrorNotice error={error} fallback="Your unlock history could not be loaded." onRetry={() => void load()} /> : null}

      {(outcomes.length > 0 || !!outcomeError) && (
        <section ref={outcomesRef} className="scroll-mt-24">
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><HelpCircle className="h-5 w-5 text-blue-600" /> Tell us what happened</h2>
          {outcomeError ? (
            <ApiErrorNotice error={outcomeError} fallback="Outcome questions could not be loaded." />
          ) : (
            <div className="grid gap-4 lg:grid-cols-2">
              {outcomes.map((prompt) => (
                <OutcomePrompt key={prompt.unlockId} prompt={prompt} onAnswered={(id) => setOutcomes((prev) => prev.filter((item) => item.unlockId !== id))} />
              ))}
            </div>
          )}
        </section>
      )}

      {pendingCheckouts.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><CreditCard className="h-5 w-5 text-amber-600" /> Checkouts awaiting payment</h2>
          <div className="space-y-3">
            {pendingCheckouts.map((item) => (
              <div key={item.id} className="card p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <ListingHeading item={item} />
                  <StatusBadge item={item} />
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Started {formatDateTime(item.createdAt)} · Reference <span className="font-mono">{item.paymentReference}</span> · <PaymentBreakdown item={item} />
                </p>
                <p className="mt-2 text-xs text-amber-700">No access is granted until payment is confirmed. Wallet credit held for this checkout is released if it is cancelled or expires.</p>
                {actionError?.id === item.id && <p role="alert" className="mt-2 text-xs text-red-600">{apiErrorMessage(actionError.error, 'Action failed.')}</p>}
                <div className="mt-3 flex flex-wrap gap-2">
                  {item.checkoutUrl && (
                    <a
                      href={item.checkoutUrl}
                      onClick={() => savePendingCheckout({ unlockId: item.id, reference: item.paymentReference, targetType: item.targetType, targetId: item.targetId, returnPath: listingHref(item.targetType, item.targetId, true) })}
                      className="btn-primary !px-4 !py-2 !text-sm"
                    >
                      <CreditCard className="h-4 w-4" /> Continue payment
                    </a>
                  )}
                  <button type="button" onClick={() => void checkPayment(item)} disabled={actionId === item.id} className="btn-outline !px-4 !py-2 !text-sm">
                    {actionId === item.id ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-4 w-4" />} Check status
                  </button>
                  <button type="button" onClick={() => void cancelCheckout(item)} disabled={actionId === item.id} className="btn-ghost !px-4 !py-2 !text-sm text-red-600">Cancel checkout</button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><KeyRound className="h-5 w-5 text-emerald-600" /> Active access</h2>
        {active.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Search className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-navy-900">No active unlocks</p>
            <p className="mt-1 max-w-sm text-sm text-veriq-muted">Unlock a listing to see its exact location, verified intelligence and contacts for the access period.</p>
            <div className="mt-4 flex flex-wrap justify-center gap-2">
              <Link href="/dashboard/browse" className="btn-primary !py-2.5">Browse properties</Link>
              <Link href="/shared" className="btn-outline !py-2.5">Shared Property</Link>
              <Link href="/for-sale" className="btn-outline !py-2.5">Property for Sale</Link>
            </div>
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2">
            {active.map((item) => (
              <div key={item.id} className="card flex flex-col p-5">
                <div className="flex items-start justify-between gap-3">
                  <ListingHeading item={item} />
                  <StatusBadge item={item} />
                </div>
                <div className="mt-4"><AccessCountdown expiresAt={item.accessExpiresAt} withSeconds /></div>
                <p className="mt-3 text-xs text-slate-500">Unlocked {formatDateTime(item.unlockedAt)} · <PaymentBreakdown item={item} /></p>
                {item.refundWindowOpen && <p className="mt-1 text-xs text-purple-700">Refund requests close {formatDateTime(item.refundDeadlineAt)}</p>}
                <div className="mt-auto flex flex-wrap items-center justify-between gap-2 pt-4">
                  <Link href={listingHref(item.targetType, item.targetId, true)} className="btn-primary !px-4 !py-2 !text-sm">Open details <ArrowRight className="h-4 w-4" /></Link>
                  <RefundAction item={item} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><History className="h-5 w-5 text-slate-500" /> Unlock history</h2>
        {history.length === 0 ? (
          <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-veriq-muted">Past unlocks, ended access and closed checkouts will appear here.</p>
        ) : (
          <div className="card divide-y divide-slate-100">
            {history.map((item) => (
              <div key={item.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 flex-1">
                  <ListingHeading item={item} />
                  <p className="mt-1 text-xs text-slate-500">
                    <Clock className="mr-1 inline h-3 w-3" />
                    {item.unlockedAt ? `Unlocked ${formatDateTime(item.unlockedAt)}` : `Started ${formatDateTime(item.createdAt)}`}
                    {item.accessExpiresAt && ` · access ended ${formatDateTime(item.accessExpiresAt)}`} · <PaymentBreakdown item={item} />
                  </p>
                  {item.failureReason && <p className="mt-1 text-xs text-slate-500">{item.failureReason}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge item={item} />
                  <RefundAction item={item} />
                  {item.listing && (
                    <Link href={listingHref(item.targetType, item.targetId, true)} className="btn-ghost !px-3 !py-2 !text-xs">View listing</Link>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
        {page < pages && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="btn-outline !py-2.5">
              {loadingMore && <LoadingSpinner size="sm" />} Load older unlocks
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

export default function MyUnlocksPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <UnlocksInner />
    </Suspense>
  );
}
