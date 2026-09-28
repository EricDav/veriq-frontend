'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Flag,
  MessageSquare,
  ShieldAlert,
  Wallet,
  XCircle,
} from 'lucide-react';
import { auditAdminApi, refundsAdminApi } from '@/lib/api/admin';
import type { AdminRefund, AuditEvent, RefundResponsibleSource } from '@/types/admin';
import { REFUND_RESPONSIBLE_SOURCES } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useAgentDirectory } from '@/components/admin/useAgentDirectory';
import {
  categoryLabel,
  dateTime,
  describeError,
  errorText,
  humanize,
  naira,
  REFUND_CASE_TYPE_LABELS,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  KeyValue,
  LoadingBlock,
  Panel,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type DialogKind = 'approve' | 'reject' | 'evidence' | null;

const EVIDENCE_SOURCES: Array<{ value: 'renter' | 'agent' | 'operator'; label: string }> = [
  { value: 'renter', label: 'Renter' },
  { value: 'agent', label: 'Listing Veriq Agent' },
  { value: 'operator', label: 'Property Operator' },
];

function JsonBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return null;
  return (
    <details className="rounded-xl border border-slate-200 bg-slate-50 p-3">
      <summary className="cursor-pointer text-xs font-bold text-navy-900">{label}</summary>
      <pre className="mt-2 max-h-64 overflow-auto whitespace-pre-wrap break-words text-[11px] text-slate-600">{JSON.stringify(value, null, 2)}</pre>
    </details>
  );
}

export default function AdminRefundDetailPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const params = useParams<{ id: string }>();
  const refundId = typeof params?.id === 'string' ? params.id : Array.isArray(params?.id) ? params.id[0] : '';
  const { success, error: toastError } = useToast();
  const directory = useAgentDirectory();

  const [refund, setRefund] = useState<AdminRefund | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [eventsError, setEventsError] = useState<DescribedError | null>(null);
  const [dialog, setDialog] = useState<DialogKind>(null);
  const [responsibleSource, setResponsibleSource] = useState<RefundResponsibleSource | ''>('');
  const [evidenceFrom, setEvidenceFrom] = useState('');
  const [creditNotice, setCreditNotice] = useState<{ credited: number; balance: number; message: string | null } | null>(null);

  const load = useCallback(async () => {
    if (!refundId) return;
    setLoading(true);
    try {
      const res = await refundsAdminApi.get(refundId);
      setRefund(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load this refund case'));
    } finally {
      setLoading(false);
    }
  }, [refundId]);

  const loadEvents = useCallback(async () => {
    if (!refundId) return;
    try {
      const res = await auditAdminApi.list({ targetType: 'refund_request', targetId: refundId, limit: 50 });
      setEvents(res.data);
      setEventsError(null);
    } catch (err) {
      setEventsError(describeError(err, 'Could not load the case audit trail'));
    }
  }, [refundId]);

  useEffect(() => {
    if (ready) {
      void load();
      void loadEvents();
    }
  }, [ready, load, loadEvents]);

  const refreshAll = () => {
    void load();
    void loadEvents();
  };

  const approve = async (reason: string) => {
    if (!refund) return;
    try {
      const res = await refundsAdminApi.approve(refund.id, {
        reason,
        responsibleSource: responsibleSource || undefined,
      });
      success(res.message);
      setCreditNotice({
        credited: res.data.creditedAmount ?? refund.chargedAmount,
        balance: res.data.availableBalance,
        message: res.data.creditedMessage,
      });
      setDialog(null);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not approve the refund'));
    }
  };

  const reject = async (reason: string) => {
    if (!refund) return;
    try {
      const res = await refundsAdminApi.reject(refund.id, reason);
      success(res.message);
      setDialog(null);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not reject the refund'));
    }
  };

  const requestEvidence = async (message: string) => {
    if (!refund || !evidenceFrom) return;
    try {
      const res = await refundsAdminApi.requestEvidence(refund.id, {
        message,
        from: evidenceFrom as 'renter' | 'agent' | 'operator',
      });
      success(res.message);
      setDialog(null);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not request evidence'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const open = refund?.status === 'requested' || refund?.status === 'under_review';

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <Link href="/dashboard/admin/refunds" className="inline-flex items-center gap-1.5 text-sm font-semibold text-slate-500 hover:text-navy-900">
        <ArrowLeft className="h-4 w-4" /> Back to refund queue
      </Link>

      <AdminPageHeader
        icon={Wallet}
        eyebrow="Refund case"
        title={refund ? `${REFUND_CASE_TYPE_LABELS[refund.caseType]} refund` : 'Refund case'}
        description="Review the charge, evidence and snapshots, then approve or reject with a recorded reason. Operators and Agents may supply evidence but never decide the outcome."
        onRefresh={refreshAll}
        refreshing={loading}
      />

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      {loading && !refund ? (
        <LoadingBlock label="Loading refund case…" />
      ) : refund ? (
        <>
          {creditNotice && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">Refund credited: {naira(creditNotice.credited)} to the renter’s Veriq Wallet.</p>
              <p className="mt-1">Renter available balance: {naira(creditNotice.balance)}.</p>
              {creditNotice.message && <p className="mt-1 text-xs">{creditNotice.message}</p>}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="card p-4"><p className="text-[11px] font-semibold uppercase text-slate-400">Status</p><div className="mt-1"><StatusBadge status={refund.status} /></div></div>
            <div className="card p-4"><p className="text-[11px] font-semibold uppercase text-slate-400">Charged</p><p className="font-display text-xl font-black text-navy-900">{naira(refund.chargedAmount)}</p></div>
            <div className="card p-4"><p className="text-[11px] font-semibold uppercase text-slate-400">Credited</p><p className="font-display text-xl font-black text-navy-900">{refund.creditedAmount === null ? '—' : naira(refund.creditedAmount)}</p></div>
            <div className="card p-4"><p className="text-[11px] font-semibold uppercase text-slate-400">Requested</p><p className="text-sm font-semibold text-navy-900">{dateTime(refund.createdAt)}</p></div>
          </div>

          {(refund.flaggedForReview || !refund.timely || refund.createdByAdminId) && (
            <div className="flex flex-wrap items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <ShieldAlert className="h-5 w-5 flex-shrink-0 text-amber-600" />
              <div className="space-y-1">
                {refund.flaggedForReview && (
                  <p className="flex items-center gap-1.5"><Flag className="h-3.5 w-3.5" /> Flagged for review{refund.flagReason ? `: ${refund.flagReason}` : ''}. A flag never denies a legitimate refund on its own.</p>
                )}
                {!refund.timely && <p>Recorded outside the refund window; no Agent earning was frozen by this case.</p>}
                {refund.createdByAdminId && <p>Recorded by Admin on the renter’s behalf.</p>}
              </div>
            </div>
          )}

          {open && (
            <div className="card flex flex-col gap-3 p-4 hover:shadow-card sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-slate-600">
                Approving credits {naira(refund.chargedAmount)} to the renter’s Veriq Wallet.{' '}
                {refund.caseType === 'unlock_purchase'
                  ? 'It also terminates the unlock access and cancels or reverses the linked Agent earning.'
                  : 'The separately paid valid unlock, its access and its legitimate Agent earning are preserved.'}
              </p>
              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setDialog('evidence')} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy-700 hover:bg-slate-50">
                  <MessageSquare className="h-3.5 w-3.5" /> Request evidence
                </button>
                <button type="button" onClick={() => setDialog('reject')} className="inline-flex items-center gap-1.5 rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">
                  <XCircle className="h-3.5 w-3.5" /> Reject
                </button>
                <button type="button" onClick={() => { setResponsibleSource(refund.responsibleSource ?? ''); setDialog('approve'); }} className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-2 text-xs font-bold text-white hover:bg-emerald-700">
                  <CheckCircle2 className="h-3.5 w-3.5" /> Approve &amp; credit wallet
                </button>
              </div>
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-2">
            <Panel title="Charge and access">
              <div className="grid grid-cols-2 gap-2 p-4">
                <KeyValue label="Unlock ID" value={refund.unlockId} mono />
                <KeyValue label="Payment reference" value={refund.unlock?.paymentReference ?? '—'} mono />
                <KeyValue label="Unlock status" value={<StatusBadge status={refund.unlock?.status ?? 'unknown'} />} />
                <KeyValue label="Fee charged" value={naira(refund.unlock?.feeAmount ?? refund.chargedAmount)} />
                <KeyValue label="Wallet-funded portion" value={naira(refund.unlock?.walletAmount ?? 0)} />
                <KeyValue label="Externally paid portion" value={naira(refund.unlock?.externalAmount ?? 0)} />
                <KeyValue label="Unlocked at" value={dateTime(refund.unlock?.unlockedAt)} />
                <KeyValue label="Access expires" value={dateTime(refund.unlock?.accessExpiresAt)} />
                <KeyValue label="Refund window closed" value={dateTime(refund.unlock?.refundDeadlineAt)} />
                <KeyValue label="Wallet credit transaction" value={refund.walletTransactionId ?? 'Not credited'} mono />
              </div>
            </Panel>

            <Panel title="Listing, renter and earning">
              <div className="grid grid-cols-2 gap-2 p-4">
                <KeyValue label="Listing" value={refund.listing?.title ?? 'Unavailable'} />
                <KeyValue label="Category" value={refund.listing ? categoryLabel(refund.listing.category) : '—'} />
                <KeyValue label="Area" value={[refund.listing?.area, refund.listing?.city].filter(Boolean).join(', ') || '—'} />
                <KeyValue label="Listing ID" value={refund.listing?.targetId ?? '—'} mono />
                <KeyValue label="Listing Veriq Agent" value={directory.nameOf(refund.listingAgentId)} />
                <KeyValue label="Property Operator" value={refund.listingOperatorId ?? 'None'} mono />
                <KeyValue
                  label="Renter"
                  value={
                    <Link href={`/dashboard/admin/ledger?tab=wallet&userId=${encodeURIComponent(refund.userId)}`} className="font-mono text-emerald-700 underline">
                      {refund.userId}
                    </Link>
                  }
                />
                <KeyValue
                  label="Linked Agent earning"
                  value={refund.earning ? `${naira(refund.earning.amount)} · ${humanize(refund.earning.status)}` : 'None recorded'}
                />
              </div>
            </Panel>
          </div>

          <Panel title="Renter’s case">
            <div className="space-y-3 p-4">
              <div className="flex flex-wrap gap-2">
                <StatusBadge status={refund.caseType} label={REFUND_CASE_TYPE_LABELS[refund.caseType]} tone={refund.caseType === 'excess_payment' ? 'purple' : 'blue'} />
                <StatusBadge status="draft" label={humanize(refund.reason)} />
              </div>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{refund.explanation || 'No explanation was provided.'}</p>
              {refund.evidenceUrls.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence supplied</p>
                  <ul className="mt-1 space-y-1">
                    {refund.evidenceUrls.map((url) => (
                      <li key={url}>
                        <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 break-all text-xs font-semibold text-emerald-700 underline">
                          {url} <ExternalLink className="h-3 w-3 flex-shrink-0" />
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {refund.evidenceRequests.length > 0 && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Evidence requests</p>
                  <ul className="mt-1 space-y-2">
                    {refund.evidenceRequests.map((request, index) => (
                      <li key={`${request.at}-${index}`} className="rounded-lg bg-slate-50 p-3 text-xs">
                        <p className="font-semibold text-navy-900">From {humanize(request.from)} · {dateTime(request.at)}</p>
                        <p className="mt-0.5 text-slate-600">{request.message}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {refund.decisionReason && (
                <div className="rounded-lg bg-slate-50 p-3 text-xs">
                  <p className="font-semibold text-navy-900">Decision · {dateTime(refund.decidedAt)}</p>
                  <p className="mt-0.5 text-slate-600">{refund.decisionReason}</p>
                  {refund.responsibleSource && <p className="mt-1 text-slate-600">Responsible source: {humanize(refund.responsibleSource)}</p>}
                </div>
              )}
              {refund.status === 'approved' && refund.creditedMessage && (
                <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-900">{refund.creditedMessage}</p>
              )}
            </div>
          </Panel>

          {refund.snapshots && (
            <Panel title="Unlock snapshots" description="What the renter saw at unlock: availability, street intelligence and pricing recorded with the charge.">
              <div className="grid grid-cols-1 gap-2 p-4 lg:grid-cols-3">
                <JsonBlock label="Availability snapshot" value={refund.snapshots.availability} />
                <JsonBlock label="Street intelligence snapshot" value={refund.snapshots.streetIntelligence} />
                <JsonBlock label="Pricing snapshot" value={refund.snapshots.pricing} />
                {!refund.snapshots.availability && !refund.snapshots.streetIntelligence && !refund.snapshots.pricing && (
                  <p className="text-xs text-slate-500">No snapshots were recorded with this unlock.</p>
                )}
              </div>
            </Panel>
          )}

          <Panel title="Case audit trail">
            {eventsError ? (
              <div className="p-4"><ErrorPanel error={eventsError} onRetry={() => void loadEvents()} /></div>
            ) : events.length === 0 ? (
              <EmptyState title="No audit events recorded yet" />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>When</th>
                      <th className={th}>Action</th>
                      <th className={th}>Actor</th>
                      <th className={th}>Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {events.map((event) => (
                      <tr key={event.id}>
                        <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(event.createdAt)}</span></td>
                        <td className={td}><span className="text-xs font-semibold">{humanize(event.action)}</span></td>
                        <td className={td}><span className="break-all font-mono text-[11px] text-slate-500">{event.actorUserId}</span></td>
                        <td className={td}><span className="text-xs text-slate-600">{event.reason || '—'}</span></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </>
      ) : null}

      <ReasonDialog
        isOpen={dialog === 'approve'}
        onClose={() => setDialog(null)}
        onConfirm={approve}
        title="Approve refund"
        confirmLabel="Approve and credit wallet"
        minLength={3}
        maxLength={1000}
        acknowledgement={
          refund?.caseType === 'unlock_purchase'
            ? 'I understand the wallet credit, access termination and earning cancellation are applied once, atomically, and are recorded in the ledger.'
            : 'I understand only the duplicate charge is credited and the separately paid valid unlock and its earning are preserved.'
        }
        message={
          refund ? (
            <div className="space-y-2">
              <p>{naira(refund.chargedAmount)} will be credited to the renter’s Veriq Wallet. Refunds are wallet credit, never cash.</p>
              <p className="text-xs text-slate-500">Credits do not expire and can be used toward any future unlock.</p>
            </div>
          ) : null
        }
      >
        <div>
          <label className="label text-xs" htmlFor="responsible-source">Responsible source <span className="font-normal text-slate-400">(optional)</span></label>
          <select id="responsible-source" className="input" value={responsibleSource} onChange={(event) => setResponsibleSource(event.target.value as RefundResponsibleSource | '')}>
            <option value="">Not attributed</option>
            {REFUND_RESPONSIBLE_SOURCES.map((value) => (
              <option key={value} value={value}>{humanize(value)}</option>
            ))}
          </select>
          <p className="mt-1 text-[11px] text-slate-400">Never attribute a refund to Agent verification without evidence; the choice feeds the internal Agent Quality Score.</p>
        </div>
      </ReasonDialog>

      <ReasonDialog
        isOpen={dialog === 'reject'}
        onClose={() => setDialog(null)}
        onConfirm={reject}
        title="Reject refund"
        confirmLabel="Reject refund"
        variant="danger"
        minLength={3}
        maxLength={1000}
        reasonLabel="Reason shown to the renter and recorded in the audit log"
        message={<p>The renter keeps their unlock access and is told why the request was not approved. Any Refund Review Hold on the Agent earning is released.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'evidence'}
        onClose={() => setDialog(null)}
        onConfirm={requestEvidence}
        title="Request evidence"
        confirmLabel="Send request"
        minLength={3}
        maxLength={1000}
        reasonLabel="What evidence is needed"
        reasonPlaceholder="Describe exactly what is needed and why"
        message={<p>The case moves to Under review. Evidence informs the decision; the renter, Agent or Operator never decides the outcome.</p>}
      >
        <Select
          id="evidence-from"
          label="Ask"
          labelClassName="text-xs"
          options={EVIDENCE_SOURCES}
          value={evidenceFrom}
          onValueChange={setEvidenceFrom}
          required
        />
      </ReasonDialog>
    </div>
  );
}
