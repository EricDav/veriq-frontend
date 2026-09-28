'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Landmark, Plus } from 'lucide-react';
import { ownerSaleListingsApi } from '@/lib/api/operator';
import type { SaleSubmissionSummary } from '@/types/operator';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  EmptyState,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  SectionCard,
  StatusBadge,
  errorMessage,
  formatDateTime,
} from '@/components/listing-forms';
import { formatNaira } from '@/components/renter/format';

const SUBTYPE_LABELS: Record<string, string> = { built_property: 'Built Property', land: 'Land' };

/**
 * The owner's sale submissions (Master Blueprint §6). Only the owner may ask Veriq to represent a property for
 * sale; there is no Agent-created listing and no unlock fee for buyers.
 */
function OwnerSaleListings() {
  const [items, setItems] = useState<SaleSubmissionSummary[] | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await ownerSaleListingsApi.mine();
      setItems(res.data);
    } catch (err) {
      setItems([]);
      setLoadError(errorMessage(err, 'Could not load your sale submissions'));
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (!items && !loadError) return <PageLoader />;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900">
            <Landmark className="h-5 w-5 text-veriq-secondary" /> Property for Sale
          </h1>
          <p className="mt-1 text-sm leading-6 text-slate-500">
            Ask Veriq to represent a property you own. Veriq visits, reviews your documents and signs a sales
            representation agreement with you before publishing.
          </p>
        </div>
        <Link href="/dashboard/operator/sales/new" className="btn-primary flex-shrink-0 !py-2.5">
          <Plus className="h-4 w-4" /> Submit a property for sale
        </Link>
      </header>

      <Notice tone="info" title="How a Veriq sale works">
        <ul className="ml-4 list-disc space-y-1">
          <li>Only you, the owner, may submit. Veriq is the buyer contact, so your own number is never published.</li>
          <li>Buyers view your listing for free and enquire through Veriq — there is no unlock fee on a sale listing.</li>
          <li>You pay a success commission only if a Veriq-generated sale actually completes, as set out in the agreement.</li>
          <li>Veriq reviews your documents. That review is not a legal title guarantee — take your own legal advice.</li>
        </ul>
      </Notice>

      {loadError && <Notice tone="error">{loadError}</Notice>}

      {items && items.length === 0 ? (
        <EmptyState icon={<Landmark className="h-10 w-10" />} title="No sale submissions yet">
          <p>
            Submit the first property you want Veriq to represent. You can save a draft and come back before you send
            it for verification.
          </p>
        </EmptyState>
      ) : (
        <SectionCard title="Your submissions" description="Track what Veriq still needs from you for each property.">
          <ul className="space-y-3">
            {(items ?? []).map((item) => {
              const publication = PUBLICATION_STATUS_META[item.publicationStatus];
              return (
                <li key={item.id}>
                  <Link
                    href={`/dashboard/operator/sales/${item.id}`}
                    className="flex flex-col gap-3 rounded-xl border border-slate-200 p-4 transition-colors hover:border-veriq-secondary sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 space-y-1">
                      <p className="truncate font-semibold text-navy-900">{item.title}</p>
                      <p className="text-xs text-slate-500">
                        {SUBTYPE_LABELS[item.subtype] ?? item.subtype} · {formatNaira(item.askingPrice)} · updated{' '}
                        {formatDateTime(item.updatedAt)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusBadge tone={publication.tone}>{publication.label}</StatusBadge>
                        {item.correctionNote && <StatusBadge tone="amber">Correction requested</StatusBadge>}
                        {item.saleOutcome && <StatusBadge tone="slate">Sale {item.saleOutcome}</StatusBadge>}
                      </div>
                    </div>
                    <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
                  </Link>
                </li>
              );
            })}
          </ul>
        </SectionCard>
      )}
    </div>
  );
}

export default function OwnerSaleListingsPage() {
  return (
    <OperatorGuard>
      <OwnerSaleListings />
    </OperatorGuard>
  );
}
