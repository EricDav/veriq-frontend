'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Flag, Plus, Search, Undo2 } from 'lucide-react';
import { refundsAdminApi } from '@/lib/api/admin';
import type {
  AdminRefund,
  PageMeta,
  RefundCaseType,
  RefundReason,
  RefundStatus,
} from '@/types/admin';
import { REFUND_CASE_TYPES, REFUND_REASONS, REFUND_STATUSES } from '@/types/admin';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import {
  categoryLabel,
  dateTime,
  describeError,
  humanize,
  naira,
  REFUND_CASE_TYPE_LABELS,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  Pagination,
  Panel,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

interface CreateForm {
  unlockId: string;
  caseType: RefundCaseType;
  reason: RefundReason;
  explanation: string;
  evidence: string;
}

const EMPTY_CREATE: CreateForm = {
  unlockId: '',
  caseType: 'excess_payment',
  reason: 'duplicate_payment',
  explanation: '',
  evidence: '',
};

function parseEvidence(text: string): { urls: string[]; invalid: string[] } {
  const lines = text.split(/\s+/).map((line) => line.trim()).filter(Boolean);
  const invalid = lines.filter((line) => {
    try {
      const url = new URL(line);
      return url.protocol !== 'https:' && url.protocol !== 'http:';
    } catch {
      return true;
    }
  });
  return { urls: lines.filter((line) => !invalid.includes(line)), invalid };
}

function AdminRefundsInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();
  const { success } = useToast();

  const [status, setStatus] = useState<RefundStatus | ''>((searchParams.get('status') as RefundStatus | null) ?? '');
  const [caseType, setCaseType] = useState<RefundCaseType | ''>('');
  const [flagged, setFlagged] = useState(searchParams.get('flagged') === 'true');
  const [search, setSearch] = useState(searchParams.get('q') ?? '');
  const [page, setPage] = useState(1);
  const [refunds, setRefunds] = useState<AdminRefund[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateForm>(EMPTY_CREATE);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<DescribedError | null>(null);
  const [createdId, setCreatedId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await refundsAdminApi.list({
        status: status || undefined,
        caseType: caseType || undefined,
        flagged,
        page,
        limit: 20,
      });
      setRefunds(res.data);
      setMeta(res.meta);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load the refund queue'));
    } finally {
      setLoading(false);
    }
  }, [status, caseType, flagged, page]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    setPage(1);
  }, [status, caseType, flagged]);

  const unlockParam = searchParams.get('unlockId');
  useEffect(() => {
    if (!unlockParam) return;
    setForm({ ...EMPTY_CREATE, unlockId: unlockParam });
    setCreateError(null);
    setCreatedId(null);
    setCreateOpen(true);
  }, [unlockParam]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return refunds;
    return refunds.filter((refund) =>
      [
        refund.id,
        refund.unlockId,
        refund.userId,
        refund.unlock?.paymentReference,
        refund.listing?.title,
        refund.listing?.targetId,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q)),
    );
  }, [refunds, search]);

  const evidence = parseEvidence(form.evidence);
  const createIssues: string[] = [];
  if (!form.unlockId.trim()) createIssues.push('Enter the unlock (charge) ID.');
  if (form.caseType === 'excess_payment' && form.reason !== 'duplicate_payment') createIssues.push('Excess-payment cases must use the duplicate payment reason.');
  if (form.caseType === 'unlock_purchase' && form.reason === 'duplicate_payment') createIssues.push('Use an excess-payment case for a duplicate charge.');
  if (form.reason === 'other' && !form.explanation.trim()) createIssues.push('Explain the issue when choosing Other.');
  if (evidence.invalid.length) createIssues.push(`Evidence links must be full URLs: ${evidence.invalid.join(', ')}`);
  if (evidence.urls.length > 10) createIssues.push('At most 10 evidence links.');

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (createIssues.length) {
      setCreateError({ message: 'Check the case details.', details: createIssues });
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await refundsAdminApi.create({
        unlockId: form.unlockId.trim(),
        caseType: form.caseType,
        reason: form.reason,
        explanation: form.explanation.trim() || undefined,
        evidenceUrls: evidence.urls.length ? evidence.urls : undefined,
      });
      success(res.message);
      setCreatedId(res.data.id);
      void load();
    } catch (err) {
      setCreateError(describeError(err, 'Could not record the refund case'));
    } finally {
      setCreating(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Undo2}
        eyebrow="Refunds"
        title="Refund Queue"
        description="Admin decides every refund (§14). Approved refunds are credited to the renter’s Veriq Wallet. Unlock-purchase refunds end access and cancel the Agent earning; excess-payment refunds credit only the duplicate charge and keep the valid unlock."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <button type="button" onClick={() => { setForm(EMPTY_CREATE); setCreateError(null); setCreatedId(null); setCreateOpen(true); }} className="btn-primary !px-4 !py-2.5 !text-sm">
            <Plus className="h-4 w-4" /> Record refund case
          </button>
        }
      />

      <div className="card grid grid-cols-1 gap-3 p-4 hover:shadow-card sm:grid-cols-2 lg:grid-cols-[1fr_180px_180px_auto]">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Filter this page" className="input !pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Filter this page: listing, reference, IDs" />
        </div>
        <select aria-label="Status" className="input" value={status} onChange={(event) => setStatus(event.target.value as RefundStatus | '')}>
          <option value="">All statuses</option>
          {REFUND_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </select>
        <select aria-label="Case type" className="input" value={caseType} onChange={(event) => setCaseType(event.target.value as RefundCaseType | '')}>
          <option value="">All case types</option>
          {REFUND_CASE_TYPES.map((value) => <option key={value} value={value}>{REFUND_CASE_TYPE_LABELS[value]}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy-800">
          <input type="checkbox" checked={flagged} onChange={(event) => setFlagged(event.target.checked)} className="h-4 w-4 accent-red-600" />
          Flagged for review
        </label>
      </div>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <Panel title="Refund cases" description="Oldest first. Review flags highlight repeated requests; they never deny a refund automatically.">
        {loading && refunds.length === 0 ? (
          <LoadingBlock />
        ) : visible.length === 0 ? (
          <EmptyState icon={Undo2} title={search ? 'No cases on this page match the filter' : 'No refund cases in this view'} />
        ) : (
          <>
            <TableScroll>
              <table className="w-full min-w-[980px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Requested</th>
                    <th className={th}>Listing</th>
                    <th className={th}>Case</th>
                    <th className={th}>Reason</th>
                    <th className={`${th} text-right`}>Charged</th>
                    <th className={th}>Status</th>
                    <th className={th}>Review signals</th>
                    <th className={th}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {visible.map((refund) => (
                    <tr key={refund.id} className={refund.flaggedForReview ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}>
                      <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(refund.createdAt)}</span></td>
                      <td className={td}>
                        <p className="max-w-[220px] truncate font-semibold">{refund.listing?.title ?? 'Listing unavailable'}</p>
                        <p className="text-[11px] text-slate-500">{refund.listing ? categoryLabel(refund.listing.category) : '—'} · {refund.unlock?.paymentReference ?? refund.unlockId}</p>
                      </td>
                      <td className={td}><StatusBadge status={refund.caseType} label={REFUND_CASE_TYPE_LABELS[refund.caseType]} tone={refund.caseType === 'excess_payment' ? 'purple' : 'blue'} /></td>
                      <td className={td}><p className="max-w-[200px] text-xs">{humanize(refund.reason)}</p></td>
                      <td className={`${td} text-right`}><span className="whitespace-nowrap font-semibold">{naira(refund.chargedAmount)}</span></td>
                      <td className={td}><StatusBadge status={refund.status} /></td>
                      <td className={td}>
                        <div className="flex max-w-[220px] flex-wrap gap-1">
                          {refund.flaggedForReview && <StatusBadge status="failed" label="Flagged" />}
                          {!refund.timely && <StatusBadge status="pending" label="Outside window" />}
                          {refund.createdByAdminId && <StatusBadge status="draft" label="Admin-recorded" />}
                          {refund.evidenceRequests.length > 0 && <StatusBadge status="scheduled" label={`${refund.evidenceRequests.length} evidence request${refund.evidenceRequests.length === 1 ? '' : 's'}`} />}
                        </div>
                        {refund.flagReason && <p className="mt-1 flex items-center gap-1 text-[11px] text-red-700"><Flag className="h-3 w-3" /> {refund.flagReason}</p>}
                      </td>
                      <td className={`${td} text-right`}>
                        <Link href={`/dashboard/admin/refunds/${encodeURIComponent(refund.id)}`} className="whitespace-nowrap rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700">
                          {refund.status === 'requested' || refund.status === 'under_review' ? 'Review' : 'View'}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} noun="cases" />
          </>
        )}
      </Panel>

      <Modal isOpen={createOpen} onClose={() => !creating && setCreateOpen(false)} title="Record a refund case" size="lg" className="max-h-[92vh] overflow-y-auto">
        {createdId ? (
          <div className="space-y-4">
            <p className="rounded-xl bg-emerald-50 p-4 text-sm text-emerald-900">The case is in the queue for decision. Recording a case does not credit the wallet; approve it to apply the refund.</p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50">Close</button>
              <Link href={`/dashboard/admin/refunds/${encodeURIComponent(createdId)}`} className="btn-primary !py-2.5">Open case</Link>
            </div>
          </div>
        ) : (
          <form onSubmit={submitCreate} className="space-y-4" noValidate>
            <p className="text-sm text-slate-600">
              Use this for support escalations, including an excess-payment case for a duplicate charge. Find the charge’s unlock ID in{' '}
              <Link href="/dashboard/admin/ledger?tab=transactions&status=duplicate_payment" className="font-semibold text-emerald-700 underline">Ledger → Unlock Transactions</Link>.
              Cases recorded after the refund window never freeze an Agent earning.
            </p>
            {createError && <ErrorPanel error={createError} />}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor="refund-unlock">Unlock (charge) ID</label>
                <input id="refund-unlock" className="input font-mono" maxLength={64} value={form.unlockId} onChange={(event) => setForm((f) => ({ ...f, unlockId: event.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs" htmlFor="refund-case">Case type</label>
                <select
                  id="refund-case"
                  className="input"
                  value={form.caseType}
                  onChange={(event) => {
                    const next = event.target.value as RefundCaseType;
                    setForm((f) => ({
                      ...f,
                      caseType: next,
                      reason: next === 'excess_payment' ? 'duplicate_payment' : f.reason === 'duplicate_payment' ? 'payment_without_access' : f.reason,
                    }));
                  }}
                >
                  {REFUND_CASE_TYPES.map((value) => <option key={value} value={value}>{REFUND_CASE_TYPE_LABELS[value]}</option>)}
                </select>
              </div>
              <div>
                <label className="label text-xs" htmlFor="refund-reason">Reason</label>
                <select id="refund-reason" className="input" value={form.reason} disabled={form.caseType === 'excess_payment'} onChange={(event) => setForm((f) => ({ ...f, reason: event.target.value as RefundReason }))}>
                  {REFUND_REASONS.filter((value) => (form.caseType === 'excess_payment' ? value === 'duplicate_payment' : value !== 'duplicate_payment')).map((value) => (
                    <option key={value} value={value}>{humanize(value)}</option>
                  ))}
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor="refund-explanation">Explanation {form.reason !== 'other' && <span className="font-normal text-slate-400">(optional)</span>}</label>
                <textarea id="refund-explanation" className="input min-h-24" maxLength={2000} value={form.explanation} onChange={(event) => setForm((f) => ({ ...f, explanation: event.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor="refund-evidence">Evidence links <span className="font-normal text-slate-400">(optional, one per line, up to 10)</span></label>
                <textarea id="refund-evidence" className="input min-h-20 font-mono text-xs" value={form.evidence} onChange={(event) => setForm((f) => ({ ...f, evidence: event.target.value }))} placeholder="https://…" />
              </div>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary !py-2.5">
                {creating && <LoadingSpinner size="sm" />} Record case
              </button>
            </div>
          </form>
        )}
      </Modal>
    </div>
  );
}

export default function AdminRefundsPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminRefundsInner />
    </Suspense>
  );
}
