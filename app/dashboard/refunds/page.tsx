'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronDown, ChevronRight, FileText, Plus, Timer, Undo2, Wallet } from 'lucide-react';
import { refundsApi, unlocksApi } from '@/lib/api/renter';
import type { RefundPolicy, RefundRequest, UnlockHistoryItem } from '@/types/renter';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { RefundPolicySummary } from '@/components/renter/RefundPolicySummary';
import {
  REFUND_REASON_LABELS, REFUND_STATUS_META, TARGET_TYPE_LABELS, formatDateTime, formatNaira,
} from '@/components/renter/format';

const PAGE_SIZE = 20;

/** Refund requests and decisions, eligible unlocks still inside their refund window, and the policy summary (§14, §17.1). */
export default function RefundsPage() {
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [eligible, setEligible] = useState<UnlockHistoryItem[]>([]);
  const [policy, setPolicy] = useState<RefundPolicy | null>(null);
  const [showPolicy, setShowPolicy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    const [refundRes, unlockRes, policyRes] = await Promise.allSettled([refundsApi.my(1, PAGE_SIZE), unlocksApi.my(1, 50), refundsApi.policy()]);
    if (refundRes.status === 'fulfilled') {
      setRefunds(refundRes.value.data);
      setPage(1);
      setPages(refundRes.value.meta?.pages ?? 1);
    } else {
      setError(refundRes.reason);
    }
    if (unlockRes.status === 'fulfilled') {
      const openCaseUnlocks = new Set(
        (refundRes.status === 'fulfilled' ? refundRes.value.data : [])
          .filter((item) => item.status !== 'rejected')
          .map((item) => item.unlockId),
      );
      setEligible(unlockRes.value.data.filter((item) => item.refundWindowOpen && !openCaseUnlocks.has(item.id)));
    }
    if (policyRes.status === 'fulfilled') setPolicy(policyRes.value.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await refundsApi.my(page + 1, PAGE_SIZE);
      setRefunds((prev) => [...prev, ...res.data]);
      setPage(page + 1);
      setPages(res.meta?.pages ?? pages);
    } catch (err) {
      setError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Refunds</h1>
          <p className="text-sm text-veriq-muted">Track refund requests. Approved refunds are credited to your Veriq Wallet for future unlocks.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/refunds/new" className="btn-primary !px-4 !py-2 !text-sm"><Plus className="h-4 w-4" /> Request a refund</Link>
          <Link href="/dashboard/wallet" className="btn-outline !px-4 !py-2 !text-sm"><Wallet className="h-4 w-4" /> Veriq Wallet</Link>
        </div>
      </div>

      {policy && (
        <section className="card p-5">
          <button type="button" onClick={() => setShowPolicy((value) => !value)} className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={showPolicy}>
            <span>
              <span className="block font-display text-base font-bold text-navy-900">Refund policy summary</span>
              <span className="block text-xs text-veriq-muted">What qualifies, what does not, and where approved refunds go.</span>
            </span>
            <ChevronDown className={`h-5 w-5 flex-shrink-0 text-slate-400 transition-transform ${showPolicy ? 'rotate-180' : ''}`} />
          </button>
          {showPolicy && <div className="mt-4"><RefundPolicySummary policy={policy} /></div>}
        </section>
      )}

      {eligible.length > 0 && (
        <section>
          <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><Timer className="h-5 w-5 text-purple-600" /> Unlocks you can still request a refund for</h2>
          <div className="grid gap-3 md:grid-cols-2">
            {eligible.map((item) => (
              <div key={item.id} className="card flex flex-col gap-3 p-4">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{TARGET_TYPE_LABELS[item.targetType]}{item.status === 'duplicate_payment' ? ' · duplicate charge' : ''}</p>
                  <p className="truncate font-semibold text-navy-900">{item.listing?.title ?? 'Unlocked listing'}</p>
                  <p className="text-xs text-slate-500">{formatNaira(item.feeAmount)} · request before {formatDateTime(item.refundDeadlineAt)}</p>
                </div>
                <Link href={`/dashboard/refunds/new?unlockId=${item.id}`} className="btn-outline self-start !px-4 !py-2 !text-sm"><Undo2 className="h-4 w-4" /> Request refund</Link>
              </div>
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="mb-3 flex items-center gap-2 font-display text-lg font-bold text-navy-900"><FileText className="h-5 w-5 text-slate-500" /> Your requests</h2>
        {error ? <ApiErrorNotice error={error} fallback="Your refund requests could not be loaded." onRetry={() => void load()} /> : null}
        {!error && refunds.length === 0 ? (
          <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Undo2 className="mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-navy-900">No refund requests yet</p>
            <p className="mt-1 max-w-md text-sm text-veriq-muted">
              If a paid unlock had a qualifying problem — for example stale availability or an invalid contact — you can request a refund from My Unlocks while its refund window is open.
            </p>
            <Link href="/dashboard/unlocks" className="btn-outline mt-4 !py-2.5">Open My Unlocks</Link>
          </div>
        ) : (
          <div className="card divide-y divide-slate-100">
            {refunds.map((refund) => {
              const status = REFUND_STATUS_META[refund.status];
              return (
                <Link key={refund.id} href={`/dashboard/refunds/${refund.id}`} className="flex flex-col gap-2 p-4 transition-colors hover:bg-slate-50 sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-navy-900">{refund.listing?.title ?? 'Unlocked listing'}</p>
                    <p className="truncate text-xs text-slate-500">{REFUND_REASON_LABELS[refund.reason] ?? refund.reason}</p>
                    <p className="text-xs text-slate-400">
                      Submitted {formatDateTime(refund.createdAt)} · {refund.caseType === 'excess_payment' ? 'Excess payment' : 'Unlock purchase'} · {formatNaira(refund.chargedAmount)}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    {refund.status === 'approved' && refund.creditedAmount !== null && (
                      <span className="text-sm font-bold text-emerald-700">+{formatNaira(refund.creditedAmount)}</span>
                    )}
                    <span className={`rounded-full px-2.5 py-1 text-[11px] font-semibold ${status.cls}`}>{status.label}</span>
                    <ChevronRight className="h-4 w-4 text-slate-300" />
                  </div>
                </Link>
              );
            })}
          </div>
        )}
        {page < pages && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="btn-outline !py-2.5">
              {loadingMore && <LoadingSpinner size="sm" />} Load older requests
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
