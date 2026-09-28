'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { RefreshCw, Undo2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { refundsApi } from '@/lib/api/renter';
import type { RefundRequest } from '@/types/renter';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { FieldShell } from '@/components/ui/Select';
import { RefundAgentConfirmation } from '@/components/agent/RefundAgentConfirmation';
import { RefundEligibilityBreakdown } from '@/components/renter/RefundEligibilityBreakdown';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import {
  REFUND_REASON_LABELS,
  REFUND_STATUS_META,
  TARGET_TYPE_LABELS,
  formatDateTime,
  formatNaira,
  listingHref,
  locationLine,
} from '@/components/renter/format';
import { EmptyBlock, ErrorBlock, InlineNotice, PageHeader, smallButton } from '@/components/agent/ui';

/**
 * The Veriq Agent's refund confirmations (Master Blueprint §5): for each open unlock-purchase case on one of their
 * listings, the Agent confirms or disputes that the unit became unavailable inside the renter's access window.
 * A case is opened by pasting or following its id, because a refund case belongs to the renter, not to a queue the
 * Agent browses; the server re-checks on every call that the unlock is theirs.
 */
export default function AgentRefundConfirmationsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [caseId, setCaseId] = useState('');
  const [refund, setRefund] = useState<RefundRequest | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [notFound, setNotFound] = useState(false);

  const load = useCallback(async (id: string) => {
    if (!id.trim()) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await refundsApi.get(id.trim());
      setRefund(res.data);
    } catch (err) {
      setRefund(null);
      if (err instanceof ApiError && [403, 404].includes(err.statusCode)) setNotFound(true);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // A refund notification links here with the case already chosen.
    const params = new URLSearchParams(window.location.search);
    const linked = params.get('case');
    if (linked) {
      setCaseId(linked);
      void load(linked);
    }
  }, [load]);

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) {
    return <ErrorBlock message="Refund confirmations are recorded by the Veriq Agent assigned to the listing." />;
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Refund confirmations"
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        subtitle="Confirm or dispute that a unit became unavailable inside a renter's access window. Confirm only what you have actually checked."
      />

      <InlineNotice tone="info">
        A renter can ask for a refund when the unit was Available at payment, is confirmed Unavailable inside their
        24-hour access window, they did not take it, and they asked before their access expired. You confirm the
        availability change, or Admin decides. Your earnings for that unlock stay on hold until the window and any
        dispute are resolved.
      </InlineNotice>

      <div className="card space-y-3 p-4">
        <FieldShell
          htmlFor="refund-case-id"
          label="Refund case reference"
          hint="Open the case from your notification, or paste the reference the renter or Admin gave you."
        >
          <input
            id="refund-case-id"
            className="input"
            value={caseId}
            onChange={(event) => setCaseId(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === 'Enter') void load(caseId);
            }}
          />
        </FieldShell>
        <div className="flex justify-end">
          <button type="button" className={smallButton} disabled={loading || !caseId.trim()} onClick={() => void load(caseId)}>
            <RefreshCw className="h-3.5 w-3.5" /> Open this case
          </button>
        </div>
      </div>

      <ApiErrorNotice error={error} fallback="That refund case could not be opened." />

      {notFound && (
        <EmptyBlock
          title="No case with that reference on your listings"
          message="A refund case is only visible to the renter, the listing's Veriq Agent and Admin. Check the reference, or ask Admin to route the case to you."
        />
      )}

      {refund && (
        <>
          <section className="card space-y-3 p-5">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-veriq-secondary">
                  {refund.listing ? TARGET_TYPE_LABELS[refund.listing.targetType] : 'Unlock'}
                </p>
                {refund.listing ? (
                  <Link
                    href={listingHref(refund.listing.targetType, refund.listing.targetId)}
                    className="block truncate font-semibold text-navy-900 hover:text-veriq-secondary"
                  >
                    {refund.listing.title}
                  </Link>
                ) : (
                  <p className="font-semibold text-navy-900">This listing is no longer published</p>
                )}
                {refund.listing && (
                  <p className="text-xs text-slate-500">{locationLine(refund.listing.area, refund.listing.city)}</p>
                )}
              </div>
              <span className={`badge flex-shrink-0 ${REFUND_STATUS_META[refund.status].cls}`}>
                {REFUND_STATUS_META[refund.status].label}
              </span>
            </div>

            <dl className="grid gap-3 sm:grid-cols-3">
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Charged</dt>
                <dd className="mt-0.5 text-sm text-navy-900">{formatNaira(refund.chargedAmount)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Unlocked</dt>
                <dd className="mt-0.5 text-sm text-navy-900">{formatDateTime(refund.unlock?.unlockedAt)}</dd>
              </div>
              <div>
                <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">Access ended</dt>
                <dd className="mt-0.5 text-sm text-navy-900">{formatDateTime(refund.unlock?.accessExpiresAt)}</dd>
              </div>
            </dl>

            <div>
              <p className="text-xs text-slate-500">What the renter reported</p>
              <p className="text-sm font-semibold text-navy-900">
                {REFUND_REASON_LABELS[refund.reason] ?? refund.reason}
              </p>
              {refund.explanation && (
                <p className="mt-1 whitespace-pre-line text-sm leading-6 text-navy-800">{refund.explanation}</p>
              )}
            </div>
          </section>

          <RefundEligibilityBreakdown eligibility={refund.eligibility} agentConfirmation={refund.agentConfirmation} />

          <RefundAgentConfirmation refund={refund} onDecided={setRefund} />

          {refund.status === 'approved' && (
            <InlineNotice tone="success">
              <Undo2 className="mr-1.5 inline h-3.5 w-3.5" /> This refund was approved and credited to the renter&apos;s
              Veriq Wallet. The related earning has been settled accordingly.
            </InlineNotice>
          )}
        </>
      )}
    </div>
  );
}
