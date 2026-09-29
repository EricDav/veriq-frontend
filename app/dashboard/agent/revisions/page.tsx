'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { FileDiff, RefreshCw } from 'lucide-react';
import type { ListingRevision, PortfolioProperty, VerificationQueueItem } from '@/types/agent';
import { UserRole } from '@/types';
import { agentPortfolioApi, revisionsApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { RevisionReviewCard } from '@/components/agent/RevisionReviewCard';
import { CATEGORY_LABELS, errorMessage } from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, smallButton } from '@/components/agent/ui';

export default function PendingRevisionsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [revisions, setRevisions] = useState<ListingRevision[] | null>(null);
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [cases, setCases] = useState<VerificationQueueItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [targetFilter, setTargetFilter] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [revisionRes, portfolioRes, queueRes] = await Promise.allSettled([
        revisionsApi.pending(),
        agentPortfolioApi.mine(),
        verificationApi.queue(),
      ]);
      if (revisionRes.status === 'rejected') throw revisionRes.reason;
      setRevisions(revisionRes.value.data);
      if (portfolioRes.status === 'fulfilled') setProperties(portfolioRes.value.data.properties);
      if (queueRes.status === 'fulfilled') setCases(queueRes.value.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load pending revisions'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  const groups = useMemo(() => {
    const list = (revisions ?? []).filter((revision) => !targetFilter || revision.targetType === targetFilter);
    const byKey = new Map<string, ListingRevision[]>();
    list.forEach((revision) => {
      const key = revision.propertyId ?? `shared:${revision.targetId}`;
      byKey.set(key, [...(byKey.get(key) ?? []), revision]);
    });
    return Array.from(byKey.entries()).map(([key, items]) => {
      const property = properties.find((entry) => entry.id === key) ?? null;
      const caseItem = cases.find((entry) => entry.property?.id === key) ?? null;
      return { key, items, property, caseId: caseItem?.id ?? null };
    });
  }, [revisions, targetFilter, properties, cases]);

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="Pending revisions are available to Veriq Agents only." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Pending Operator Revisions"
        subtitle="Operator edits to verified facts, structure and intelligence never replace the approved snapshot until you approve them (§8.4)."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <div className="flex flex-wrap items-center gap-2">
        {[
          { value: '', label: 'All' },
          { value: 'property', label: 'Property' },
          { value: 'unit', label: 'Unit' },
          { value: 'shared_opportunity', label: 'Shared Property' },
        ].map((option) => (
          <button
            key={option.value}
            type="button"
            onClick={() => setTargetFilter(option.value)}
            className={`rounded-full border px-3 py-1 text-xs font-semibold ${targetFilter === option.value ? 'border-primary bg-primary text-primary-foreground' : 'border-[#ffffff18] bg-card text-muted-foreground'}`}
          >
            {option.label}
            {revisions ? ` (${option.value ? revisions.filter((item) => item.targetType === option.value).length : revisions.length})` : ''}
          </button>
        ))}
      </div>

      <InlineNotice tone="info">
        Shared Property revisions that are not linked to a canonical Property are reviewed inside that opportunity&apos;s{' '}
        <Link href="/dashboard/agent/shared" className="font-semibold underline">
          Shared Property workspace
        </Link>
        .
      </InlineNotice>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !revisions ? (
        <LoadingBlock label="Loading revisions…" />
      ) : groups.length === 0 ? (
        <EmptyBlock title="No pending revisions" message="When an Operator proposes changes to a verified record, they appear here for your review." />
      ) : (
        <div className="space-y-6">
          {groups.map((group) => (
            <section key={group.key} className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <FileDiff className="h-4 w-4 text-muted-foreground" />
                <h2 className="font-display text-base font-bold text-foreground">
                  {group.property?.title ?? (group.key.startsWith('shared:') ? 'Shared Property opportunity' : `Property ${group.key}`)}
                </h2>
                {group.property && (
                  <span className="text-xs text-muted-foreground">
                    {CATEGORY_LABELS[group.property.category] ?? group.property.category} · {group.property.area}, {group.property.city}
                  </span>
                )}
              </div>
              <ul className="space-y-3">
                {group.items.map((revision) => (
                  <RevisionReviewCard
                    key={revision.id}
                    revision={revision}
                    caseId={group.caseId}
                    onDecided={(id) => setRevisions((current) => (current ?? []).filter((item) => item.id !== id))}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
