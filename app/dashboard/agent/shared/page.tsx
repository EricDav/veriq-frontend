'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, RefreshCw, Search } from 'lucide-react';
import type { SharedQueueItem } from '@/types/agent';
import { UserRole } from '@/types';
import { sharedVerificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { CASE_STATUS_TONES, PUBLICATION_STATUS_TONES, errorMessage, humanize, relativeAge } from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, StatusPill, smallButton } from '@/components/agent/ui';

const TYPE_LABELS: Record<string, string> = {
  private_room: 'Private room',
  shared_room_bedspace: 'Shared room / bedspace',
};

export default function SharedVerificationQueuePage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<SharedQueueItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [kind, setKind] = useState<'all' | 'new' | 'reverification'>('all');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await sharedVerificationApi.queue();
      setItems(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the Shared Property queue'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (items ?? []).filter((item) => {
      if (kind === 'new' && item.isReverification) return false;
      if (kind === 'reverification' && !item.isReverification) return false;
      if (!needle) return true;
      const opportunity = item.opportunity;
      return `${opportunity?.displayLabel ?? ''} ${opportunity?.area ?? ''} ${opportunity?.city ?? ''}`.toLowerCase().includes(needle);
    });
  }, [items, query, kind]);

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="The Shared Property queue is available to Veriq Agents only." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Shared Property Verification"
        subtitle="Resident-led sharing opportunities: verify identity, occupancy, permission, private location and publish (§6.4)."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <InlineNotice tone="info">
        Re-verification cases open when a resident reactivates an opportunity after its verification period lapsed. They need only continued
        occupancy/permission (authority), household facts and contribution terms before you publish again (§28.2).
      </InlineNotice>

      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="input !py-2 !pl-9 text-sm" placeholder="Search label, area or city" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="input !py-2 text-sm" value={kind} onChange={(event) => setKind(event.target.value as typeof kind)} aria-label="Case type">
          <option value="all">New and re-verification</option>
          <option value="new">New submissions</option>
          <option value="reverification">Re-verification</option>
        </select>
      </div>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !items ? (
        <LoadingBlock label="Loading Shared Property cases…" />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          title={items && items.length ? 'No cases match these filters' : 'No open Shared Property cases'}
          message="Submitted and reactivated Shared Property opportunities assigned to you appear here."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              {item.opportunity ? (
                <Link href={`/dashboard/agent/shared/${item.opportunity.id}`} className="card flex flex-col gap-3 p-4 transition-colors hover:border-[#10b98170] sm:flex-row sm:items-center sm:justify-between">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-foreground">{item.opportunity.displayLabel}</p>
                    <p className="text-xs text-muted-foreground">
                      {TYPE_LABELS[item.opportunity.opportunityType] ?? humanize(item.opportunity.opportunityType)} · {item.opportunity.area}, {item.opportunity.city}
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      <StatusPill value={item.status} tones={CASE_STATUS_TONES} />
                      <StatusPill value={item.opportunity.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                      {item.isReverification && <span className="badge bg-[#ffffff06] !px-2 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">Re-verification</span>}
                      {item.escalated && <span className="badge bg-[#fb718518] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Escalated</span>}
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <span className="text-xs text-muted-foreground">Opened {relativeAge(item.createdAt)}</span>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </Link>
              ) : (
                <div className="card p-4 text-sm text-muted-foreground">Case {item.id}: the opportunity record is no longer available.</div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
