'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Plus, Users } from 'lucide-react';
import { sharedPropertiesApi } from '@/lib/api/operator';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  EmptyState,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  SHARED_TYPE_LABELS,
  StatusBadge,
  errorMessage,
  formatDate,
} from '@/components/listing-forms';
import type { SharedOpportunitySummary } from '@/types/operator';

function SharedList() {
  const [items, setItems] = useState<SharedOpportunitySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await sharedPropertiesApi.mine();
      setItems(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load your Shared Property opportunities'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Shared Property Opportunities</h1>
          <p className="text-sm text-slate-500">
            Rooms and bedspaces you offer in the home you currently live in. Each opportunity is verified separately and is hidden whenever it is unavailable.
          </p>
        </div>
        <Link href="/dashboard/operator/shared/new" className="btn-primary !py-2.5"><Plus className="h-4 w-4" /> New opportunity</Link>
      </div>

      {loadError ? (
        <Notice tone="error" title="Opportunities could not be loaded">
          <p>{loadError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={() => { setLoading(true); void load(); }}>Try again</button>
        </Notice>
      ) : items.length === 0 ? (
        <EmptyState icon={<Users className="h-12 w-12" />} title="No opportunities yet">
          Share a private room or bedspace in your home. You will confirm your occupancy and that you are permitted to share before submitting.
          <div className="mt-3"><Link href="/dashboard/operator/shared/new" className="btn-primary !py-2">Create opportunity</Link></div>
        </EmptyState>
      ) : (
        <ul className="grid gap-3">
          {items.map((item) => {
            const meta = PUBLICATION_STATUS_META[item.publicationStatus];
            return (
              <li key={item.id}>
                <Link href={`/dashboard/operator/shared/${item.id}`} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                  <div className="min-w-0 space-y-1">
                    <p className="truncate font-semibold text-navy-900">{item.displayLabel}</p>
                    <p className="text-xs text-slate-500">{SHARED_TYPE_LABELS[item.opportunityType]} · {item.area}, {item.city} · updated {formatDate(item.updatedAt)}</p>
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      <StatusBadge tone={item.availabilityStatus === 'available' ? 'emerald' : 'slate'}>
                        {item.availabilityStatus === 'available' ? 'Available' : 'Unavailable (hidden)'}
                      </StatusBadge>
                      {item.reverificationRequired && (
                        <StatusBadge tone="amber"><AlertTriangle className="h-3 w-3" /> Awaiting re-verification</StatusBadge>
                      )}
                    </div>
                  </div>
                  <span className="text-sm font-semibold text-veriq-secondary">Manage</span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

export default function OperatorSharedPage() {
  return (
    <OperatorGuard>
      <SharedList />
    </OperatorGuard>
  );
}
