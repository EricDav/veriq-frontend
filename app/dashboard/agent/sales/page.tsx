'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ChevronRight, Landmark, Plus, RefreshCw, Search } from 'lucide-react';
import type { SaleManagedItem } from '@/types/agent';
import { UserRole } from '@/types';
import { saleListingsApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { PUBLICATION_STATUS_STYLES, errorMessage, formatDateTime, formatNaira, humanize } from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, StatusPill, smallButton } from '@/components/agent/ui';

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
        subtitle="Agent-led sale listings: seller verification, document checklist, media, intelligence, availability and publication (§6.5, §8.5)."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        actions={
          <>
            <button type="button" className={smallButton} onClick={load} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <Link href="/dashboard/agent/sales/new" className="btn-primary !px-4 !py-2 text-sm">
              <Plus className="h-4 w-4" /> New Sale Listing
            </Link>
          </>
        }
      />

      <InlineNotice tone="info">
        Sellers never self-list. You source the opportunity, verify the seller/owner and authority to sell, confirm the property or land, and
        publish when verification is complete.
      </InlineNotice>

      <div className="card !shadow-sm grid grid-cols-1 gap-3 p-4 sm:grid-cols-4">
        <label className="relative block sm:col-span-2">
          <span className="sr-only">Search</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input className="input !py-2 !pl-9 text-sm" placeholder="Search by title" value={query} onChange={(event) => setQuery(event.target.value)} />
        </label>
        <select className="input !py-2 text-sm" value={subtype} onChange={(event) => setSubtype(event.target.value)} aria-label="Subtype">
          <option value="">All subtypes</option>
          <option value="built_property">Built Property</option>
          <option value="land">Land</option>
        </select>
        <select className="input !py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Publication status">
          <option value="">All statuses</option>
          {['draft', 'published', 'suspended', 'archived'].map((value) => (
            <option key={value} value={value}>
              {humanize(value)}
            </option>
          ))}
        </select>
      </div>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !items ? (
        <LoadingBlock label="Loading Sale Listings…" />
      ) : filtered.length === 0 ? (
        <EmptyBlock
          title={items && items.length ? 'No listings match these filters' : 'No Sale Listings yet'}
          message="Create a draft Sale Listing for a Built Property or Land, then verify and publish it."
          action={
            <Link href="/dashboard/agent/sales/new" className="btn-primary !px-4 !py-2 text-sm">
              <Plus className="h-4 w-4" /> New Sale Listing
            </Link>
          }
        />
      ) : (
        <ul className="space-y-3">
          {filtered.map((item) => (
            <li key={item.id}>
              <Link href={`/dashboard/agent/sales/${item.id}`} className="card !shadow-sm flex flex-col gap-3 p-4 hover:!shadow-card-hover sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0 space-y-1">
                  <p className="truncate font-semibold text-navy-900">{item.title}</p>
                  <p className="text-xs text-slate-500">
                    <Landmark className="mr-1 inline h-3 w-3" />
                    {item.subtype === 'land' ? 'Land' : 'Built Property'} · {formatNaira(item.askingPrice)} · updated {formatDateTime(item.updatedAt)}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <StatusPill value={item.publicationStatus} styles={PUBLICATION_STATUS_STYLES} />
                    <span className={`badge !px-2 !py-0.5 text-[11px] ${item.availabilityStatus === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                      {humanize(item.availabilityStatus)}
                    </span>
                    {item.escalationOpen && <span className="badge bg-red-100 !px-2 !py-0.5 text-[11px] text-red-800">Escalated to Admin</span>}
                  </div>
                </div>
                <ChevronRight className="h-4 w-4 flex-shrink-0 text-slate-400" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
