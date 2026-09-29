'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, ClipboardCheck, ExternalLink, Landmark, RefreshCw, Search } from 'lucide-react';
import type { AgentPortfolio, PortfolioProperty, SaleManagedItem, VerificationQueueItem } from '@/types/agent';
import { agentPortfolioApi, saleListingsApi, verificationApi } from '@/lib/api/agent';
import { CATEGORY_LABELS, PUBLICATION_STATUS_TONES, errorMessage, formatDateTime, formatNaira, humanize } from './format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, StatusPill, smallButton, smallPrimaryButton } from './ui';

const STATUS_ORDER = ['needs_correction', 'submitted', 'verification_in_progress', 'ready_to_publish', 'published', 'suspended', 'draft', 'archived'];

/**
 * Agent view of the legacy "My Listings" page: the properties assigned to this Agent for verification and
 * publication. Agents no longer create listings — Operators submit them and Sale Listings are created in the
 * Property for Sale workspace (§2.4, §8).
 */
export function AgentAssignedProperties() {
  const [portfolio, setPortfolio] = useState<AgentPortfolio | null>(null);
  const [cases, setCases] = useState<VerificationQueueItem[]>([]);
  const [sales, setSales] = useState<SaleManagedItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [portfolioRes, casesRes, salesRes] = await Promise.allSettled([
        agentPortfolioApi.mine(),
        verificationApi.queue(),
        saleListingsApi.managed(),
      ]);
      if (portfolioRes.status === 'rejected') throw portfolioRes.reason;
      setPortfolio(portfolioRes.value.data);
      if (casesRes.status === 'fulfilled') setCases(casesRes.value.data);
      if (salesRes.status === 'fulfilled') setSales(salesRes.value.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your assigned properties'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const caseByProperty = useMemo(() => {
    const map = new Map<string, VerificationQueueItem>();
    cases.forEach((item) => {
      if (item.property?.id) map.set(item.property.id, item);
    });
    return map;
  }, [cases]);

  const properties = useMemo<PortfolioProperty[]>(() => {
    const needle = query.trim().toLowerCase();
    return (portfolio?.properties ?? [])
      .filter((property) => (!status || property.publicationStatus === status) && (!needle || `${property.title} ${property.area} ${property.city}`.toLowerCase().includes(needle)))
      .sort((a, b) => STATUS_ORDER.indexOf(a.publicationStatus) - STATUS_ORDER.indexOf(b.publicationStatus));
  }, [portfolio?.properties, query, status]);

  const counts = useMemo(() => {
    const all = portfolio?.properties ?? [];
    return {
      total: all.length,
      published: all.filter((property) => property.publicationStatus === 'published').length,
      awaiting: all.filter((property) => ['submitted', 'verification_in_progress', 'needs_correction', 'ready_to_publish'].includes(property.publicationStatus)).length,
    };
  }, [portfolio?.properties]);

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title="Assigned Properties"
        subtitle="Properties you verify and publish for your Property Operators. Operators submit listings; you verify, correct and publish them."
        actions={
          <>
            <button type="button" className={smallButton} onClick={load} disabled={loading}>
              <RefreshCw className="h-3.5 w-3.5" /> Refresh
            </button>
            <Link href="/dashboard/agent/verification" className={smallPrimaryButton}>
              <ClipboardCheck className="h-4 w-4" /> Verification queue
            </Link>
          </>
        }
      />

      <InlineNotice tone="info">
        Agent-created rental listings were retired with the Property Operator model. Residential, Short Let and Hostel records are submitted by
        Operators and verified here; Property for Sale listings are created in the{' '}
        <Link href="/dashboard/agent/sales" className="font-semibold underline">
          Property for Sale workspace
        </Link>
        .
      </InlineNotice>

      {loadError ? (
        <ErrorBlock message={loadError} onRetry={load} />
      ) : loading && !portfolio ? (
        <LoadingBlock label="Loading assigned properties…" />
      ) : (
        <>
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'Assigned', value: counts.total },
              { label: 'In verification', value: counts.awaiting },
              { label: 'Published', value: counts.published },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className="text-2xl font-black text-foreground">{stat.value}</p>
                <p className="text-xs text-muted-foreground">{stat.label}</p>
              </div>
            ))}
          </div>

          <div className="card grid grid-cols-1 gap-3 p-4 sm:grid-cols-3">
            <label className="relative block sm:col-span-2">
              <span className="sr-only">Search</span>
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input className="input !py-2 !pl-9 text-sm" placeholder="Search title, area or city" value={query} onChange={(event) => setQuery(event.target.value)} />
            </label>
            <select className="input !py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value)} aria-label="Publication status">
              <option value="">All publication statuses</option>
              {STATUS_ORDER.map((value) => (
                <option key={value} value={value}>
                  {humanize(value)}
                </option>
              ))}
            </select>
          </div>

          {properties.length === 0 ? (
            <EmptyBlock
              title={portfolio?.properties.length ? 'No properties match these filters' : 'No properties assigned yet'}
              message="Properties submitted by the Operators assigned to you appear here."
            />
          ) : (
            <ul className="space-y-3">
              {properties.map((property) => {
                const item = caseByProperty.get(property.id);
                return (
                  <li key={property.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0 space-y-1">
                      <p className="flex items-center gap-2 truncate font-semibold text-foreground">
                        <Building2 className="h-4 w-4 flex-shrink-0 text-muted-foreground" /> {property.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {CATEGORY_LABELS[property.category] ?? property.category} · {property.area}, {property.city} · updated {formatDateTime(property.updatedAt)}
                      </p>
                      <div className="flex flex-wrap gap-1.5">
                        <StatusPill value={property.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                        <span className="badge bg-[#070b1444] !px-2 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">Verification: {humanize(property.verificationStatus)}</span>
                        {item?.escalated && <span className="badge bg-[#fb718518] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Escalated</span>}
                        {item && item.duplicateCandidates > 0 && !item.duplicateResolved && (
                          <span className="badge bg-[#fb718510] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Duplicates unresolved</span>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {item && (
                        <Link href={`/dashboard/agent/verification/${item.id}`} className={smallButton}>
                          <ClipboardCheck className="h-3.5 w-3.5" /> Open case
                        </Link>
                      )}
                      {property.publicationStatus === 'published' && (
                        <Link href={`/properties/${property.id}`} target="_blank" className={smallButton}>
                          <ExternalLink className="h-3.5 w-3.5" /> Public page
                        </Link>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          {sales.length > 0 && (
            <section className="space-y-3">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
                <Landmark className="h-4 w-4 text-muted-foreground" /> Property for Sale listings ({sales.length})
              </h2>
              <ul className="space-y-2">
                {sales.map((sale) => (
                  <li key={sale.id} className="card flex flex-wrap items-center justify-between gap-2 p-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-foreground">{sale.title}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {sale.subtype === 'land' ? 'Land' : 'Built Property'} · {formatNaira(sale.askingPrice)}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <StatusPill value={sale.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                      <Link href={`/dashboard/agent/sales/${sale.id}`} className={smallButton}>
                        Open
                      </Link>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </div>
  );
}
