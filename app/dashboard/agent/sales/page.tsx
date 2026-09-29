'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Landmark, RefreshCw, Search } from 'lucide-react';
import type { SaleManagedItem } from '@/types/agent';
import { UserRole } from '@/types';
import { saleListingsApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { PUBLICATION_STATUS_TONES, errorMessage, formatDateTime, formatNaira, humanize } from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, StatusPill, smallButton } from '@/components/agent/ui';
import { Select } from '@/components/ui/Select';

const SUBTYPE_OPTIONS = [
  { value: 'built_property', label: 'Built Property' },
  { value: 'land', label: 'Land' },
];

const STATUS_OPTIONS = ['draft', 'submitted', 'verification_in_progress', 'needs_correction', 'ready_to_publish', 'published', 'suspended', 'archived'].map(
  (value) => ({ value, label: humanize(value) }),
);

export default function SaleListingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const [items, setItems] = useState<SaleManagedItem[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [subtype, setSubtype] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const res = await saleListingsApi.managed();
      setItems(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your Sale Listings'));
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
      if (subtype && item.subtype !== subtype) return false;
      if (status && item.publicationStatus !== status) return false;
      return !needle || item.title.toLowerCase().includes(needle);
    });
  }, [items, query, subtype, status]);

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="Property for Sale listings are managed by Veriq Agents." />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <PageHeader
        title="Property for Sale"
        subtitle="Owner-submitted sale listings you manage: owner verification, physical visit, document checklist, the signed sales agreement, buyer enquiries and publication."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      <InlineNotice tone="info">
        Only the owner may submit a property for sale, so these listings arrive from your assigned Operators. You visit the property in person,
        review ownership and authority to sell, and publish once Veriq and the owner have signed the sales representation agreement. Viewing a
        published sale listing is free for buyers and every enquiry comes to you.
      </InlineNotice>

      <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input className="input !py-2 !pl-9 text-sm" placeholder="Search by title" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <Select
          id="sales-subtype"
          label="Subtype"
          labelClassName="sr-only"
          placeholder="All subtypes"
          className="!py-2 text-sm"
          options={SUBTYPE_OPTIONS}
          value={subtype}
          onValueChange={setSubtype}
        />
        <Select
          id="sales-status"
          label="Publication status"
          labelClassName="sr-only"
          placeholder="All statuses"
          className="!py-2 text-sm"
          options={STATUS_OPTIONS}
          value={status}
          onValueChange={setStatus}
        />
      </div>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !items ? (
        <LoadingBlock label="Loading Sale Listings…" />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          title={items && items.length ? 'No listings match these filters' : 'No sale submissions yet'}
          message="Sale listings appear here when an owner you are assigned to submits a property for Veriq to represent."
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={`/dashboard/agent/sales/${item.id}`} className="card flex flex-col gap-3 p-4 transition-colors hover:border-[#10b98170] sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-foreground">{item.title}</p>
                  <p className="text-xs text-muted-foreground">
                    <Landmark className="mr-1 inline h-3 w-3" />
                    {item.subtype === 'land' ? 'Land' : 'Built Property'} · {formatNaira(item.askingPrice)} · updated {formatDateTime(item.updatedAt)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill value={item.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                    <span className={`badge !px-2 !py-0.5 text-[11px] ${item.availabilityStatus === 'available' ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#ffffff0f] text-muted-foreground'}`}>
                      {humanize(item.availabilityStatus)}
                    </span>
                    {item.saleOutcome && <span className="badge bg-[#ffffff0f] !px-2 !py-0.5 text-[11px] text-foreground border-[#ffffff20]">Sale {humanize(item.saleOutcome)}</span>}
                    {item.correctionNote && <span className="badge bg-[#fbbf2410] !px-2 !py-0.5 text-[11px] text-[#fcd34d] border-[#fbbf2430]">Correction requested</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
