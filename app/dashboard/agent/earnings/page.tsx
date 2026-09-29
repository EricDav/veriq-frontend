'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Banknote, Clock, Landmark, RefreshCw, ShieldAlert, Wallet } from 'lucide-react';
import type { AgentEarning, AgentEarningStatus, AgentEarningsPayload } from '@/types/agent';
import { UserRole } from '@/types';
import { agentEarningsApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { errorMessage, formatDateTime, formatNaira, humanize } from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, Field, InlineNotice, LoadingBlock, PageHeader, PanelCard, smallButton, smallPrimaryButton } from '@/components/agent/ui';

const EARNING_STATUS_STYLES: Record<AgentEarningStatus, string> = {
  pending: 'bg-[#fbbf2410] text-[#fcd34d]',
  refund_review_hold: 'bg-orange-50 text-orange-700',
  withdrawable: 'bg-[#10b98112] text-[#6ee7b7]',
  withdrawn: 'bg-[#ffffff0f] text-muted-foreground',
  cancelled: 'bg-[#fb718510] text-[#fda4af]',
};

const EARNING_STATUS_LABELS: Record<AgentEarningStatus, string> = {
  pending: 'Pending (hold period)',
  refund_review_hold: 'Refund review hold',
  withdrawable: 'Withdrawable',
  withdrawn: 'Withdrawn',
  cancelled: 'Cancelled',
};

const BUCKETS: Array<{ key: keyof AgentEarningsPayload['buckets']; label: string; hint: string; tone: string }> = [
  { key: 'pending', label: 'Pending', hint: 'Held for the configured hold period after each unlock.', tone: 'text-[#fcd34d]' },
  { key: 'refundReviewHold', label: 'Refund review hold', hint: 'A refund request is open on the unlock; released if the refund is rejected.', tone: 'text-orange-700' },
  { key: 'withdrawable', label: 'Withdrawable', hint: 'Cleared earnings you can request to withdraw.', tone: 'text-[#6ee7b7]' },
  { key: 'inWithdrawal', label: 'In withdrawal', hint: 'Allocated to a withdrawal request awaiting Admin payment.', tone: 'text-muted-foreground' },
  { key: 'withdrawn', label: 'Withdrawn', hint: 'Paid out by Admin.', tone: 'text-foreground' },
  { key: 'cancelled', label: 'Cancelled', hint: 'Cancelled after an approved refund of the unlock purchase.', tone: 'text-[#fda4af]' },
  { key: 'adjustments', label: 'Adjustments', hint: 'Explicit Admin ledger corrections; historical balances are never rewritten.', tone: 'text-muted-foreground' },
];

export default function AgentEarningsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<AgentEarningsPayload | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'' | AgentEarningStatus>('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await agentEarningsApi.mine();
      setData(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your earnings'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  const earnings = useMemo<AgentEarning[]>(
    () => (data?.earnings ?? []).filter((earning) => !statusFilter || earning.status === statusFilter),
    [data?.earnings, statusFilter],
  );

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="Agent earnings are available to Veriq Agents only." />;

  const requestWithdrawal = async () => {
    if (!data) return;
    const value = Number(amount);
    if (!Number.isFinite(value) || value < 1) {
      toastError('Enter the amount you want to withdraw');
      return;
    }
    setSubmitting(true);
    try {
      const res = await agentEarningsApi.requestWithdrawal(Math.trunc(value), note);
      success(res.message || 'Withdrawal requested');
      setAmount('');
      setNote('');
      await load();
    } catch (err) {
      toastError(errorMessage(err, 'Withdrawal request failed'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Earnings & Withdrawals"
        subtitle="Your share of every qualifying unlock on properties assigned to you (§15)."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : !data ? (
        <LoadingBlock label="Loading earnings…" />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
            {BUCKETS.map((bucket) => (
              <div key={bucket.key} className="card p-4">
                <p className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{bucket.label}</p>
                <p className={`mt-1 text-xl font-black ${bucket.tone}`}>{data.bucketsFormatted?.[bucket.key] ?? formatNaira(data.buckets[bucket.key])}</p>
                <p className="mt-1 text-[11px] leading-snug text-muted-foreground">{bucket.hint}</p>
              </div>
            ))}
          </div>

          <InlineNotice tone="info">
            <span className="flex items-start gap-2">
              <Clock className="mt-0.5 h-4 w-4 flex-shrink-0" />
              <span>
                Every unlock creates a <strong>Pending</strong> earning that stays non-withdrawable for the configured hold period. If a renter opens a
                valid refund request before the deadline, the earning moves to <strong>Refund review hold</strong> until the case is decided — an
                approved refund cancels it, a rejected one releases it. Free Unlocks create no revenue-based earning.
                {data.nextReleaseAt ? ` Next scheduled release: ${formatDateTime(data.nextReleaseAt)}.` : ''}
              </span>
            </span>
          </InlineNotice>

          <PanelCard title="Request a withdrawal" icon={Wallet} subtitle={`Minimum request ${formatNaira(data.minWithdrawalAmount)} · available ${formatNaira(data.buckets.withdrawable)}`}>
            <div className="space-y-4">
              {!data.bankDetailsComplete && (
                <InlineNotice tone="warning">
                  <span className="flex items-start gap-2">
                    <Landmark className="mt-0.5 h-4 w-4 flex-shrink-0" />
                    <span>
                      Add your bank account details before requesting a withdrawal.{' '}
                      <Link href="/dashboard/agent" className="font-semibold underline">
                        Open your Agent profile
                      </Link>
                      .
                    </span>
                  </span>
                </InlineNotice>
              )}
              {data.hasPendingWithdrawal && (
                <InlineNotice tone="info">You already have a withdrawal request awaiting an Admin decision. A new request can be made once it is settled.</InlineNotice>
              )}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
                <Field label="Amount (₦)">
                  <input className="input !py-2 text-sm" type="number" min={data.minWithdrawalAmount} step={1} value={amount} onChange={(event) => setAmount(event.target.value)} />
                </Field>
                <Field label="Note (optional)">
                  <input className="input !py-2 text-sm" maxLength={120} value={note} onChange={(event) => setNote(event.target.value)} />
                </Field>
                <button
                  type="button"
                  className={smallPrimaryButton}
                  disabled={submitting || !data.bankDetailsComplete || data.hasPendingWithdrawal || data.buckets.withdrawable < data.minWithdrawalAmount}
                  onClick={requestWithdrawal}
                >
                  {submitting ? <LoadingSpinner size="sm" /> : <Banknote className="h-3.5 w-3.5" />} Request withdrawal
                </button>
              </div>
              {!data.isEligible && data.bankDetailsComplete && !data.hasPendingWithdrawal && (
                <p className="text-xs text-muted-foreground">
                  Your withdrawable balance is below the {formatNaira(data.minWithdrawalAmount)} minimum. Earnings become withdrawable when their hold
                  period ends and no refund case is open.
                </p>
              )}
              <div className="flex items-center gap-2">
                <button type="button" className="text-xs font-semibold text-muted-foreground hover:text-foreground" onClick={() => setAmount(String(data.buckets.withdrawable))}>
                  Use full withdrawable balance
                </button>
              </div>
            </div>
          </PanelCard>

          <PanelCard
            title="Earnings"
            icon={Wallet}
            actions={
              <select className="input !py-1.5 text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as '' | AgentEarningStatus)} aria-label="Earning status">
                <option value="">All statuses</option>
                {(Object.keys(EARNING_STATUS_LABELS) as AgentEarningStatus[]).map((status) => (
                  <option key={status} value={status}>
                    {EARNING_STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            }
          >
            {earnings.length === 0 ? (
              <EmptyBlock title="No earnings yet" message="Qualifying unlocks on properties assigned to you appear here with their hold and release times." />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[620px] text-sm">
                  <thead className="text-left text-[11px] uppercase tracking-wide text-muted-foreground">
                    <tr className="border-b border-[#ffffff10]">
                      <th className="px-3 py-2 font-medium">Created</th>
                      <th className="px-3 py-2 font-medium">Type</th>
                      <th className="px-3 py-2 font-medium">Amount</th>
                      <th className="px-3 py-2 font-medium">Share</th>
                      <th className="px-3 py-2 font-medium">Status</th>
                      <th className="px-3 py-2 font-medium">Hold / release</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#ffffff10]">
                    {earnings.map((earning) => (
                      <tr key={earning.id}>
                        <td className="px-3 py-2 text-xs text-muted-foreground">{formatDateTime(earning.createdAt)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {humanize(earning.kind)}
                          {earning.note ? <span className="block text-[11px] text-muted-foreground">{earning.note}</span> : null}
                        </td>
                        <td className={`px-3 py-2 text-sm font-semibold ${earning.amount < 0 ? 'text-destructive' : 'text-foreground'}`}>{formatNaira(earning.amount)}</td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {earning.sharePercent !== null ? `${earning.sharePercent}% of ${formatNaira(earning.basisAmount)}` : '—'}
                        </td>
                        <td className="px-3 py-2">
                          <span className={`badge !px-2 !py-0.5 text-[11px] ${EARNING_STATUS_STYLES[earning.status]}`}>{EARNING_STATUS_LABELS[earning.status]}</span>
                        </td>
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {earning.status === 'pending' && earning.holdUntil && `Releases ${formatDateTime(earning.holdUntil)}`}
                          {earning.status === 'refund_review_hold' && 'Held until the refund case is decided'}
                          {earning.status === 'withdrawable' && earning.withdrawableAt && `Cleared ${formatDateTime(earning.withdrawableAt)}`}
                          {earning.status === 'cancelled' && (earning.cancelReason ?? 'Cancelled after an approved refund')}
                          {earning.status === 'withdrawn' && 'Paid out'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </PanelCard>

          <PanelCard title="Withdrawal history" icon={Banknote}>
            {data.payouts.length === 0 ? (
              <EmptyBlock title="No withdrawal requests yet" />
            ) : (
              <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
                {data.payouts.map((payout) => (
                  <li key={payout.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-foreground">{formatNaira(payout.amount)}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {formatDateTime(payout.createdAt)} · ref {payout.reference}
                        {payout.bankSnapshot?.bankName ? ` · ${payout.bankSnapshot.bankName}` : ''}
                      </p>
                      {payout.decisionNote && <p className="text-xs text-muted-foreground">{payout.decisionNote}</p>}
                    </div>
                    <span
                      className={`badge !px-2 !py-0.5 text-[11px] ${
                        payout.status === 'paid' ? 'bg-[#10b98112] text-[#6ee7b7]' : payout.status === 'rejected' ? 'bg-[#fb718510] text-[#fda4af]' : 'bg-[#fbbf2410] text-[#fcd34d]'
                      }`}
                    >
                      {humanize(payout.status)}
                      {payout.decidedAt ? ` · ${formatDateTime(payout.decidedAt)}` : ''}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </PanelCard>

          <InlineNotice tone="info">
            <span className="flex items-start gap-2">
              <ShieldAlert className="mt-0.5 h-4 w-4 flex-shrink-0" />
              Withdrawals are paid by Admin against the bank details on your profile. Earnings stay yours even if the property assignment later
              changes; referral acquisition creates no separate or permanent earning rights (§15.4–15.5).
            </span>
          </InlineNotice>
        </>
      )}
    </div>
  );
}
