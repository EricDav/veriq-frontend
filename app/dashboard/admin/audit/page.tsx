'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ChevronDown, ChevronUp, FileText, Filter, X } from 'lucide-react';
import { auditAdminApi } from '@/lib/api/admin';
import type { AuditEvent, AuditFilters, PageMeta } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { dateTime, describeError, humanize, type DescribedError } from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  Pagination,
  Panel,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

const TARGET_TYPES = [
  'property',
  'property_operator',
  'agent',
  'verification_case',
  'refund_request',
  'business_rule',
  'sale_listing',
  'shared_opportunity',
  'agent_earning',
  'agent_payout',
  'property_category',
];

const ACTION_PRESETS = [
  { label: 'Assignments', value: 'assign' },
  { label: 'Publication', value: 'publish' },
  { label: 'Suspension', value: 'suspend' },
  { label: 'Refunds', value: 'refund' },
  { label: 'Free Unlock', value: 'free_unlock' },
  { label: 'Pricing', value: 'price' },
  { label: 'Business rules', value: 'business_rule' },
  { label: 'Availability', value: 'availability' },
  { label: 'Media', value: 'media' },
  { label: 'Earnings & payouts', value: 'earning' },
];

function ValueBlock({ label, value }: { label: string; value: Record<string, unknown> | null }) {
  if (!value) return null;
  return (
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <pre className="mt-1 max-h-48 overflow-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-2 text-[11px] text-slate-600">{JSON.stringify(value, null, 2)}</pre>
    </div>
  );
}

function AdminAuditInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();

  const [filters, setFilters] = useState<AuditFilters>({
    targetType: searchParams.get('targetType') ?? undefined,
    targetId: searchParams.get('targetId') ?? undefined,
    actorUserId: searchParams.get('actorUserId') ?? undefined,
    action: searchParams.get('action') ?? undefined,
  });
  const [draft, setDraft] = useState<AuditFilters>(filters);
  const [page, setPage] = useState(1);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 50, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [expanded, setExpanded] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await auditAdminApi.list({ ...filters, page, limit: 50 });
      setEvents(res.data);
      setMeta(res.meta);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load audit events'));
    } finally {
      setLoading(false);
    }
  }, [filters, page]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const apply = (event: React.FormEvent) => {
    event.preventDefault();
    setPage(1);
    setFilters({
      targetType: draft.targetType?.trim() || undefined,
      targetId: draft.targetId?.trim() || undefined,
      actorUserId: draft.actorUserId?.trim() || undefined,
      action: draft.action?.trim() || undefined,
    });
  };

  const clear = () => {
    setDraft({});
    setFilters({});
    setPage(1);
  };

  const activeCount = Object.values(filters).filter(Boolean).length;

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={FileText}
        eyebrow="Integrity"
        title="Audit Log"
        description="Immutable record of material actions (§25.1): actor, target, previous and new values, source and reason. Records are never edited or deleted."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      <form onSubmit={apply} className="card space-y-3 p-4 hover:shadow-card">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <label className="label text-xs" htmlFor="audit-target-type">Target type</label>
            <input id="audit-target-type" list="audit-target-types" className="input" value={draft.targetType ?? ''} onChange={(event) => setDraft((d) => ({ ...d, targetType: event.target.value }))} placeholder="Any" />
            <datalist id="audit-target-types">
              {TARGET_TYPES.map((value) => <option key={value} value={value} />)}
            </datalist>
          </div>
          <div>
            <label className="label text-xs" htmlFor="audit-target-id">Target ID</label>
            <input id="audit-target-id" className="input font-mono" value={draft.targetId ?? ''} onChange={(event) => setDraft((d) => ({ ...d, targetId: event.target.value }))} placeholder="Exact ID" />
          </div>
          <div>
            <label className="label text-xs" htmlFor="audit-actor">Actor user ID</label>
            <input id="audit-actor" className="input font-mono" value={draft.actorUserId ?? ''} onChange={(event) => setDraft((d) => ({ ...d, actorUserId: event.target.value }))} placeholder="Exact user ID or system" />
          </div>
          <div>
            <label className="label text-xs" htmlFor="audit-action">Action contains</label>
            <input id="audit-action" className="input" value={draft.action ?? ''} onChange={(event) => setDraft((d) => ({ ...d, action: event.target.value }))} placeholder="e.g. suspend" />
          </div>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {ACTION_PRESETS.map((preset) => (
            <button
              key={preset.value}
              type="button"
              onClick={() => { setDraft((d) => ({ ...d, action: preset.value })); setPage(1); setFilters((current) => ({ ...current, action: preset.value })); }}
              className={`rounded-full px-3 py-1 text-[11px] font-bold ${filters.action === preset.value ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button type="submit" className="btn-primary !px-4 !py-2.5 !text-sm"><Filter className="h-4 w-4" /> Apply filters</button>
          {activeCount > 0 && (
            <button type="button" onClick={clear} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50">
              <X className="h-3.5 w-3.5" /> Clear {activeCount} filter{activeCount === 1 ? '' : 's'}
            </button>
          )}
        </div>
      </form>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <Panel title="Audit events" description="Newest first. Open a row to see the recorded previous and new values.">
        {loading && events.length === 0 ? (
          <LoadingBlock />
        ) : events.length === 0 ? (
          <EmptyState icon={FileText} title="No audit events match" description={activeCount ? 'Try a wider filter — action matches are partial, target and actor IDs must be exact.' : undefined} />
        ) : (
          <>
            <TableScroll>
              <table className="w-full min-w-[900px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>When</th>
                    <th className={th}>Action</th>
                    <th className={th}>Target</th>
                    <th className={th}>Actor</th>
                    <th className={th}>Source</th>
                    <th className={th}>Reason</th>
                    <th className={th}><span className="sr-only">Detail</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {events.map((event) => (
                    <React.Fragment key={event.id}>
                      <tr className="hover:bg-slate-50/60">
                        <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(event.createdAt)}</span></td>
                        <td className={td}><span className="text-xs font-semibold">{humanize(event.action)}</span></td>
                        <td className={td}>
                          <p className="text-xs">{humanize(event.targetType)}</p>
                          <p className="break-all font-mono text-[11px] text-slate-400">{event.targetId}</p>
                        </td>
                        <td className={td}><span className="break-all font-mono text-[11px] text-slate-500">{event.actorUserId}</span></td>
                        <td className={td}><span className="text-[11px] text-slate-500">{humanize(event.source)}</span></td>
                        <td className={td}><p className="max-w-[220px] text-xs text-slate-600">{event.reason || '—'}</p></td>
                        <td className={`${td} text-right`}>
                          <button
                            type="button"
                            onClick={() => setExpanded(expanded === event.id ? null : event.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50"
                            aria-expanded={expanded === event.id}
                          >
                            {expanded === event.id ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
                            Values
                          </button>
                        </td>
                      </tr>
                      {expanded === event.id && (
                        <tr className="bg-slate-50/60">
                          <td className="px-4 py-3" colSpan={7}>
                            {event.previousValue || event.newValue ? (
                              <div className="flex flex-col gap-3 sm:flex-row">
                                <ValueBlock label="Previous value" value={event.previousValue} />
                                <ValueBlock label="New value" value={event.newValue} />
                              </div>
                            ) : (
                              <p className="text-xs text-slate-500">No value snapshot was recorded for this event.</p>
                            )}
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} noun="events" />
          </>
        )}
      </Panel>
    </div>
  );
}

export default function AdminAuditPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminAuditInner />
    </Suspense>
  );
}
