'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, ChevronRight, ClipboardCheck, Copy, RefreshCw, RotateCcw, Search } from 'lucide-react';
import type { PortfolioOperator, VerificationCaseStatus, VerificationQueueItem } from '@/types/agent';
import { UserRole } from '@/types';
import { agentPortfolioApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  CASE_STATUS_STYLES,
  CATEGORY_LABELS,
  PUBLICATION_STATUS_STYLES,
  ageInDays,
  errorMessage,
  relativeAge,
} from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, LoadingBlock, PageHeader, StatusPill, smallButton } from '@/components/agent/ui';

const STATUS_OPTIONS: Array<{ value: '' | VerificationCaseStatus; label: string }> = [
  { value: '', label: 'All open cases' },
  { value: 'pending', label: 'Pending' },
  { value: 'in_progress', label: 'In progress' },
  { value: 'needs_correction', label: 'Needs correction' },
  { value: 'ready_to_publish', label: 'Ready to publish' },
  { value: 'published', label: 'Published' },
  { value: 'closed', label: 'Closed' },
];

const AGE_OPTIONS = [
  { value: 0, label: 'Any age' },
  { value: 1, label: 'Older than 1 day' },
  { value: 3, label: 'Older than 3 days' },
  { value: 7, label: 'Older than 7 days' },
  { value: 14, label: 'Older than 14 days' },
];

type Tri = 'all' | 'only' | 'exclude';

export default function VerificationQueuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [status, setStatus] = useState<'' | VerificationCaseStatus>('');
  const [items, setItems] = useState<VerificationQueueItem[] | null>(null);
  const [operators, setOperators] = useState<PortfolioOperator[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);

  const [query, setQuery] = useState('');
  const [operatorId, setOperatorId] = useState('');
  const [category, setCategory] = useState('');
  const [minAge, setMinAge] = useState(0);
  const [reverification, setReverification] = useState<Tri>('all');
  const [duplicates, setDuplicates] = useState<Tri>('all');
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await verificationApi.queue(status || undefined);
      setItems(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the verification queue'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  useEffect(() => {
    if (user?.role !== UserRole.AGENT) return;
    agentPortfolioApi
      .mine()
      .then((res) => setOperators(res.data.operators))
      .catch(() => setOperators([]));
  }, [user?.role]);

  const operatorName = useCallback(
    (id: string | null) => (id ? operators.find((operator) => operator.id === id)?.name || 'Assigned Operator' : 'No Operator (Agent-created)'),
    [operators],
  );

  const filtered = useMemo(() => {
    if (!items) return [];
    const needle = query.trim().toLowerCase();
    return items.filter((item) => {
      if (needle && !`${item.property?.title ?? ''} ${item.property?.area ?? ''} ${item.property?.city ?? ''}`.toLowerCase().includes(needle)) return false;
      if (operatorId && item.property?.operatorId !== operatorId) return false;
      if (category && item.property?.category !== category) return false;
      if (minAge && ageInDays(item.createdAt) < minAge) return false;
      if (reverification === 'only' && !item.isReverification) return false;
      if (reverification === 'exclude' && item.isReverification) return false;
      const unresolvedDuplicates = item.duplicateCandidates > 0 && !item.duplicateResolved;
      if (duplicates === 'only' && !unresolvedDuplicates) return false;
      if (duplicates === 'exclude' && unresolvedDuplicates) return false;
      if (escalatedOnly && !item.escalated) return false;
      return true;
    });
  }, [items, query, operatorId, category, minAge, reverification, duplicates, escalatedOnly]);

  const operatorOptions = useMemo(() => {
    const ids = Array.from(new Set((items ?? []).map((item) => item.property?.operatorId).filter((id): id is string => !!id)));
    return ids.map((id) => ({ id, name: operatorName(id) }));
  }, [items, operatorName]);

  const resetFilters = () => {
    setQuery('');
    setOperatorId('');
    setCategory('');
    setMinAge(0);
    setReverification('all');
    setDuplicates('all');
    setEscalatedOnly(false);
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) {
    return <ErrorBlock message="The verification queue is available to Veriq Agents only." />;
  }

  const counts = {
    total: items?.length ?? 0,
    duplicates: (items ?? []).filter((item) => item.duplicateCandidates > 0 && !item.duplicateResolved).length,
    escalated: (items ?? []).filter((item) => item.escalated).length,
    reverification: (items ?? []).filter((item) => item.isReverification).length,
  };

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <PageHeader
        title="Verification Queue"
        subtitle="Property verification cases assigned to you. Verify, correct, link Street Intelligence and publish directly."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Cases', value: counts.total, icon: ClipboardCheck },
          { label: 'Unresolved duplicates', value: counts.duplicates, icon: Copy },
          { label: 'Escalated', value: counts.escalated, icon: AlertTriangle },
          { label: 'Re-verification', value: counts.reverification, icon: RotateCcw },
        ].map((stat) => (
          <div key={stat.label} className="card !shadow-sm p-4">
            <stat.icon className="h-4 w-4 text-slate-400" />
            <p className="mt-2 text-2xl font-black text-navy-900">{stat.value}</p>
            <p className="text-xs text-slate-500">{stat.label}</p>
          </div>
        ))}
      </div>

      <div className="card !shadow-sm space-y-3 p-4">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <label className="relative block sm:col-span-2">
            <span className="sr-only">Search</span>
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input className="input !py-2 !pl-9 text-sm" placeholder="Search title, area or city" value={query} onChange={(event) => setQuery(event.target.value)} />
          </label>
          <select className="input !py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as '' | VerificationCaseStatus)} aria-label="Case status">
            {STATUS_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="input !py-2 text-sm" value={category} onChange={(event) => setCategory(event.target.value)} aria-label="Category">
            <option value="">All categories</option>
            {['residential', 'short_let', 'hostel', 'for_sale'].map((value) => (
              <option key={value} value={value}>
                {CATEGORY_LABELS[value]}
              </option>
            ))}
          </select>
          <select className="input !py-2 text-sm" value={operatorId} onChange={(event) => setOperatorId(event.target.value)} aria-label="Operator">
            <option value="">All Operators</option>
            {operatorOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.name}
              </option>
            ))}
          </select>
          <select className="input !py-2 text-sm" value={minAge} onChange={(event) => setMinAge(Number(event.target.value))} aria-label="Case age">
            {AGE_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
          <select className="input !py-2 text-sm" value={reverification} onChange={(event) => setReverification(event.target.value as Tri)} aria-label="Re-verification">
            <option value="all">New and re-verification</option>
            <option value="only">Re-verification only</option>
            <option value="exclude">New submissions only</option>
          </select>
          <select className="input !py-2 text-sm" value={duplicates} onChange={(event) => setDuplicates(event.target.value as Tri)} aria-label="Duplicates">
            <option value="all">Any duplicate state</option>
            <option value="only">Unresolved duplicates</option>
            <option value="exclude">No unresolved duplicates</option>
          </select>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <label className="flex items-center gap-2 text-xs text-slate-600">
            <input type="checkbox" checked={escalatedOnly} onChange={(event) => setEscalatedOnly(event.target.checked)} /> Escalated only
          </label>
          <button type="button" className="text-xs font-semibold text-slate-500 hover:text-navy-900" onClick={resetFilters}>
            Reset filters
          </button>
        </div>
      </div>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !items ? (
        <LoadingBlock label="Loading cases…" />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          title={items && items.length > 0 ? 'No cases match these filters' : 'No verification cases'}
          message={items && items.length > 0 ? 'Adjust or reset the filters to see more cases.' : 'New Operator submissions assigned to you appear here.'}
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={`/dashboard/agent/verification/${item.id}`} className="card !shadow-sm flex flex-col gap-3 p-4 hover:!shadow-card-hover sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-navy-900">{item.property?.title ?? 'Property record unavailable'}</p>
                  <p className="text-xs text-slate-500">
                    {item.property ? `${CATEGORY_LABELS[item.property.category] ?? item.property.category} · ${item.property.area}, ${item.property.city}` : '—'}
                    {' · '}
                    {operatorName(item.property?.operatorId ?? null)}
                  </p>
                  <div className="flex flex-wrap items-center gap-1.5">
                    <StatusPill value={item.status} styles={CASE_STATUS_STYLES} />
                    {item.property && <StatusPill value={item.property.publicationStatus} styles={PUBLICATION_STATUS_STYLES} />}
                    {item.isReverification && <span className="badge bg-purple-50 !px-2 !py-0.5 text-[11px] text-purple-700">Re-verification</span>}
                    {item.duplicateCandidates > 0 && !item.duplicateResolved && (
                      <span className="badge bg-red-50 !px-2 !py-0.5 text-[11px] text-red-700">
                        {item.duplicateCandidates} possible duplicate{item.duplicateCandidates === 1 ? '' : 's'}
                      </span>
                    )}
                    {item.escalated && <span className="badge bg-red-100 !px-2 !py-0.5 text-[11px] text-red-800">Escalated to Admin</span>}
                  </div>
                </div>
                <div className="flex items-center justify-between gap-3 sm:justify-end">
                  <span className="text-xs text-slate-500">Opened {relativeAge(item.createdAt)}</span>
                  <ChevronRight className="h-4 w-4 text-slate-400" />
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
