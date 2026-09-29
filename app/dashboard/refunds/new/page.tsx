'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft, Gift, Undo2 } from 'lucide-react';
import { refundsApi, unlocksApi } from '@/lib/api/renter';
import type { RefundPolicy, RefundRequest, UnlockHistoryItem } from '@/types/renter';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { RefundRequestForm } from '@/components/renter/RefundRequestForm';
import { REFUND_STATUS_META, TARGET_TYPE_LABELS, formatDateTime, formatNaira } from '@/components/renter/format';
import { Badge } from '@/components/ui';

const HISTORY_PAGE_SIZE = 50;
const MAX_HISTORY_PAGES = 10;

async function loadUnlockHistory(): Promise<UnlockHistoryItem[]> {
  const all: UnlockHistoryItem[] = [];
  for (let page = 1; page <= MAX_HISTORY_PAGES; page += 1) {
    const res = await unlocksApi.my(page, HISTORY_PAGE_SIZE);
    all.push(...res.data);
    if (page >= (res.meta?.pages ?? 1)) break;
  }
  return all;
}

async function loadAllRefunds(): Promise<RefundRequest[]> {
  const all: RefundRequest[] = [];
  for (let page = 1; page <= MAX_HISTORY_PAGES; page += 1) {
    const res = await refundsApi.my(page, 100);
    all.push(...res.data);
    if (page >= (res.meta?.pages ?? 1)) break;
  }
  return all;
}

function NewRefundInner() {
  const router = useRouter();
  const params = useSearchParams();
  const unlockId = params.get('unlockId');

  const [policy, setPolicy] = useState<RefundPolicy | null>(null);
  const [unlocks, setUnlocks] = useState<UnlockHistoryItem[]>([]);
  const [refunds, setRefunds] = useState<RefundRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [policyRes, history, existing] = await Promise.all([refundsApi.policy(), loadUnlockHistory(), loadAllRefunds()]);
      setPolicy(policyRes.data);
      setUnlocks(history);
      setRefunds(existing);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;

  const back = (
    <Link href="/dashboard/refunds" className="inline-flex items-center gap-2 text-sm text-veriq-muted transition-colors hover:text-foreground">
      <ArrowLeft className="h-4 w-4" /> Back to Refunds
    </Link>
  );

  if (error || !policy) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ApiErrorNotice error={error} fallback="The refund form could not be loaded." onRetry={() => void load()} />
      </div>
    );
  }

  const activeCaseFor = (id: string) => refunds.find((item) => item.unlockId === id && item.status !== 'rejected');
  const selected = unlockId ? unlocks.find((item) => item.id === unlockId) ?? null : null;

  if (!unlockId) {
    const eligible = unlocks.filter((item) => item.refundWindowOpen && !activeCaseFor(item.id));
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        {back}
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Request a refund</h1>
          <p className="text-sm text-veriq-muted">Choose the paid unlock the problem relates to. Only unlocks still inside their refund window are shown.</p>
        </div>
        {eligible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <Undo2 className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-semibold text-foreground">No unlocks are eligible right now</p>
            <p className="mx-auto mt-1 max-w-md text-sm text-veriq-muted">Refunds can be requested only for paid unlocks within the refund window, and only once per payment. Free Unlocks have no refundable payment value.</p>
            <Link href="/dashboard/unlocks" className="btn-outline mt-4 !py-2.5">Open My Unlocks</Link>
          </div>
        ) : (
          <div className="space-y-3">
            {eligible.map((item) => (
              <Link key={item.id} href={`/dashboard/refunds/new?unlockId=${item.id}`} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">{TARGET_TYPE_LABELS[item.targetType]}{item.status === 'duplicate_payment' ? ' · duplicate charge' : ''}</p>
                  <p className="truncate font-semibold text-foreground">{item.listing?.title ?? 'Unlocked listing'}</p>
                  <p className="text-xs text-muted-foreground">{formatNaira(item.feeAmount)} · unlocked {formatDateTime(item.unlockedAt ?? item.createdAt)} · request before {formatDateTime(item.refundDeadlineAt)}</p>
                </div>
                <span className="btn-outline self-start !px-4 !py-2 !text-sm sm:self-center">Select</span>
              </Link>
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!selected) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-foreground">Unlock not found</p>
          <p className="mt-1 text-sm text-veriq-muted">This unlock is not in your Unlock History. Choose one of your own unlocks to request a refund.</p>
          <Link href="/dashboard/refunds/new" className="btn-outline mt-4 !py-2.5">Choose an unlock</Link>
        </div>
      </div>
    );
  }

  const existingCase = activeCaseFor(selected.id);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      {back}
      <div>
        <h1 className="font-display text-2xl font-bold text-foreground">{selected.status === 'duplicate_payment' ? 'Request an excess-payment refund' : 'Request a refund'}</h1>
        <p className="text-sm text-veriq-muted">Veriq Admin reviews availability history, the unlock record, verification data and any evidence before deciding.</p>
      </div>

      {existingCase ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-6">
          <p className="font-semibold text-foreground">{existingCase.status === 'approved' ? 'This payment has already been refunded' : 'A refund request is already open for this payment'}</p>
          <p className="mt-1 text-sm text-veriq-muted">
            Status: <Badge tone={REFUND_STATUS_META[existingCase.status].tone}>{REFUND_STATUS_META[existingCase.status].label}</Badge>
          </p>
          <Link href={`/dashboard/refunds/${existingCase.id}`} className="btn-primary mt-4 !py-2.5">View request</Link>
        </div>
      ) : selected.feeAmount === 0 ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-6 text-sm text-emerald-900">
          <p className="flex items-center gap-2 font-semibold"><Gift className="h-4 w-4" /> Free Unlock</p>
          <p className="mt-1 leading-6">{policy.freeUnlock}</p>
          <Link href="/contact" className="btn-outline mt-4 !py-2.5">Report an issue to Veriq support</Link>
        </div>
      ) : (
        <RefundRequestForm unlock={selected} policy={policy} onSubmitted={(refund) => router.push(`/dashboard/refunds/${refund.id}`)} />
      )}
    </div>
  );
}

export default function NewRefundPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <NewRefundInner />
    </Suspense>
  );
}
