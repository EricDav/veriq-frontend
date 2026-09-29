'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Building2, Check, Search, UserRound, X } from 'lucide-react';
import { pricingAdminApi } from '@/lib/api/admin';
import type {
  ListingSelectorFilters,
  SelectorListing,
  SelectorOperator,
} from '@/types/admin';
import { LISTING_TARGET_TYPES, PROPERTY_CATEGORIES, VERIQ_MANAGED_OPERATOR_ID } from '@/types/admin';
import { cn } from '@/lib/utils';
import { categoryLabel, describeError, humanize, naira, type DescribedError } from './format';
import { useDebounced } from './useDebounced';
import { EmptyState, ErrorPanel, LoadingBlock, StatusBadge, TableScroll, td, th } from './ui';

const TARGET_LABELS: Record<string, string> = {
  property: 'Property',
  shared_opportunity: 'Shared opportunity',
  sale_listing: 'Sale listing',
};

const PRICE_SOURCE_LABELS: Record<string, string> = {
  listing_override: 'Listing override',
  category: 'Category price',
  global: 'Global price',
  default: 'Launch default',
};

export interface OperatorListingSelectorProps {
  /** Heading text for step 2, e.g. "Select a listing to price". */
  listingPrompt: string;
  selectedTargetId?: string | null;
  onSelectListing: (listing: SelectorListing) => void;
  onOperatorChange?: (operator: SelectorOperator | null) => void;
  /** Bump to reload the listing table after a change. */
  refreshKey?: number;
  initialOperatorId?: string | null;
  initialQuery?: string;
  /** Resolves an Agent ID to a display name for the Operator list. */
  agentName?: (agentId: string | null) => string;
}

/**
 * Operator-first listing selection (§12.7, §17.4, decision D3): pick a Property Operator, then filter
 * only that Operator's listings. The listing's current Agent is shown as a column.
 */
export function OperatorListingSelector({
  listingPrompt,
  selectedTargetId,
  onSelectListing,
  onOperatorChange,
  refreshKey = 0,
  initialOperatorId,
  initialQuery = '',
  agentName,
}: OperatorListingSelectorProps) {
  const [operatorQuery, setOperatorQuery] = useState('');
  const debouncedOperatorQuery = useDebounced(operatorQuery);
  const [operators, setOperators] = useState<SelectorOperator[]>([]);
  const [operatorsLoading, setOperatorsLoading] = useState(true);
  const [operatorsError, setOperatorsError] = useState<DescribedError | null>(null);
  const [operator, setOperator] = useState<SelectorOperator | null>(null);
  const [pendingInitialOperator, setPendingInitialOperator] = useState(initialOperatorId ?? null);

  const [filters, setFilters] = useState<ListingSelectorFilters>({ q: initialQuery || undefined });
  const debouncedFilters = useDebounced(filters);
  const [listings, setListings] = useState<SelectorListing[]>([]);
  const [allListings, setAllListings] = useState<SelectorListing[]>([]);
  const [listingsLoading, setListingsLoading] = useState(false);
  const [listingsError, setListingsError] = useState<DescribedError | null>(null);

  useEffect(() => {
    setPendingInitialOperator(initialOperatorId ?? null);
  }, [initialOperatorId]);

  useEffect(() => {
    if (initialQuery) setFilters((current) => ({ ...current, q: initialQuery }));
  }, [initialQuery]);

  useEffect(() => {
    let cancelled = false;
    setOperatorsLoading(true);
    pricingAdminApi
      .operators(debouncedOperatorQuery.trim() || undefined)
      .then((res) => {
        if (cancelled) return;
        setOperators(res.data);
        setOperatorsError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setOperatorsError(describeError(err, 'Could not load Property Operators'));
      })
      .finally(() => {
        if (!cancelled) setOperatorsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedOperatorQuery]);

  useEffect(() => {
    if (!pendingInitialOperator) return;
    let cancelled = false;
    // The Operator search matches an exact ID; the Veriq-managed pseudo-operator is listed only without a query.
    pricingAdminApi
      .operators(pendingInitialOperator === VERIQ_MANAGED_OPERATOR_ID ? undefined : pendingInitialOperator)
      .then((res) => {
        if (cancelled) return;
        const match = res.data.find((item) => item.id === pendingInitialOperator);
        if (match) {
          setOperator(match);
          onOperatorChange?.(match);
        } else {
          setOperatorsError({ message: 'The requested Property Operator could not be found.', details: [] });
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setOperatorsError(describeError(err, 'Could not load the requested Property Operator'));
      })
      .finally(() => {
        if (!cancelled) setPendingInitialOperator(null);
      });
    return () => {
      cancelled = true;
    };
  }, [pendingInitialOperator, onOperatorChange]);

  const operatorId = operator?.id ?? null;

  useEffect(() => {
    if (!operatorId) {
      setAllListings([]);
      return;
    }
    let cancelled = false;
    pricingAdminApi
      .operatorListings(operatorId)
      .then((res) => {
        if (!cancelled) setAllListings(res.data);
      })
      .catch(() => {
        if (!cancelled) setAllListings([]);
      });
    return () => {
      cancelled = true;
    };
  }, [operatorId, refreshKey]);

  useEffect(() => {
    if (!operatorId) {
      setListings([]);
      return;
    }
    let cancelled = false;
    setListingsLoading(true);
    pricingAdminApi
      .operatorListings(operatorId, {
        ...debouncedFilters,
        q: debouncedFilters.q?.trim() || undefined,
        area: debouncedFilters.area?.trim() || undefined,
      })
      .then((res) => {
        if (cancelled) return;
        setListings(res.data);
        setListingsError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setListingsError(describeError(err, 'Could not load this Operator’s listings'));
      })
      .finally(() => {
        if (!cancelled) setListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [operatorId, debouncedFilters, refreshKey]);

  const subtypeOptions = useMemo(
    () => Array.from(new Set(allListings.map((row) => row.subtype).filter((value): value is string => !!value))).sort(),
    [allListings],
  );
  const streetOptions = useMemo(() => {
    const map = new Map<string, string>();
    allListings.forEach((row) => {
      if (row.streetId) map.set(row.streetId, row.streetName ?? row.streetId);
    });
    return Array.from(map.entries()).sort((a, b) => a[1].localeCompare(b[1]));
  }, [allListings]);

  const chooseOperator = (next: SelectorOperator | null) => {
    setOperator(next);
    setFilters({});
    setListings([]);
    onOperatorChange?.(next);
  };

  const setFilter = <K extends keyof ListingSelectorFilters>(key: K, value: ListingSelectorFilters[K] | '') => {
    setFilters((current) => ({ ...current, [key]: value === '' ? undefined : value }));
  };

  const activeFilterCount = Object.values(filters).filter((value) => value !== undefined && value !== '').length;

  return (
    <div className="space-y-4">
      {/* Step 1: Operator */}
      <div className="rounded-xl border border-[#ffffff12] bg-card">
        <div className="flex flex-col gap-3 border-b border-[#ffffff12] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Step 1</p>
            <h3 className="font-display text-sm font-bold text-foreground">Select a Property Operator</h3>
          </div>
          {operator && (
            <button
              type="button"
              onClick={() => chooseOperator(null)}
              className="inline-flex items-center gap-1.5 self-start rounded-lg border border-[#ffffff12] px-3 py-1.5 text-xs font-bold text-muted-foreground hover:bg-[#ffffff08]"
            >
              <X className="h-3.5 w-3.5" /> Change Operator
            </button>
          )}
        </div>
        {operator ? (
          <div className="flex items-start gap-3 p-4">
            <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#10b98112] text-primary">
              <UserRound className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="font-semibold text-foreground">{operator.name || operator.id}</p>
              <p className="text-xs text-muted-foreground">
                {[operator.email, operator.phone].filter(Boolean).join(' · ') || 'No contact on record'}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {operator.listingCount} listing{operator.listingCount === 1 ? '' : 's'}
                {agentName && operator.assignedAgentId ? ` · Assigned Agent: ${agentName(operator.assignedAgentId)}` : ''}
              </p>
            </div>
          </div>
        ) : (
          <div className="space-y-3 p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search Property Operators"
                className="input !pl-9"
                value={operatorQuery}
                onChange={(event) => setOperatorQuery(event.target.value)}
                placeholder="Search by name, email, phone or Operator ID"
              />
            </div>
            {operatorsError ? (
              <ErrorPanel error={operatorsError} />
            ) : operatorsLoading ? (
              <LoadingBlock label="Loading Property Operators…" />
            ) : operators.length === 0 ? (
              <EmptyState title="No Property Operators match" description="Try another name, email, phone or ID." />
            ) : (
              <ul className="max-h-80 divide-y divide-[#ffffff12] overflow-y-auto rounded-lg border border-[#ffffff12]">
                {operators.map((item) => (
                  <li key={item.id}>
                    <button
                      type="button"
                      onClick={() => chooseOperator(item)}
                      className="flex w-full items-center justify-between gap-3 px-3 py-2.5 text-left hover:bg-[#10b98112]"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-sm font-semibold text-foreground">{item.name || item.id}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {[item.email, item.phone].filter(Boolean).join(' · ') || item.id}
                        </span>
                      </span>
                      <span className="flex-shrink-0 rounded-full bg-[#ffffff08] px-2 py-0.5 text-[11px] font-semibold text-muted-foreground">
                        {item.listingCount} listing{item.listingCount === 1 ? '' : 's'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      {/* Step 2: Listing */}
      {operator && (
        <div className="rounded-xl border border-[#ffffff12] bg-card">
          <div className="border-b border-[#ffffff12] p-4">
            <p className="text-[11px] font-bold uppercase tracking-wide text-primary">Step 2</p>
            <h3 className="font-display text-sm font-bold text-foreground">{listingPrompt}</h3>
            <p className="mt-1 text-xs text-muted-foreground">Only listings owned by {operator.name || 'this Operator'} are shown.</p>
          </div>
          <div className="grid grid-cols-1 gap-2 border-b border-[#ffffff12] p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                aria-label="Search listings by ID or name"
                className="input !py-2.5 !pl-9"
                value={filters.q ?? ''}
                onChange={(event) => setFilter('q', event.target.value)}
                placeholder="Listing ID / reference or name"
              />
            </div>
            <select aria-label="Listing type" className="input !py-2.5" value={filters.targetType ?? ''} onChange={(event) => setFilter('targetType', event.target.value as ListingSelectorFilters['targetType'])}>
              <option value="">All listing types</option>
              {LISTING_TARGET_TYPES.map((type) => (
                <option key={type} value={type}>{TARGET_LABELS[type]}</option>
              ))}
            </select>
            <select aria-label="Category" className="input !py-2.5" value={filters.category ?? ''} onChange={(event) => setFilter('category', event.target.value as ListingSelectorFilters['category'])}>
              <option value="">All categories</option>
              {PROPERTY_CATEGORIES.map((category) => (
                <option key={category} value={category}>{categoryLabel(category)}</option>
              ))}
            </select>
            <select aria-label="Subtype" className="input !py-2.5" value={filters.subtype ?? ''} onChange={(event) => setFilter('subtype', event.target.value)}>
              <option value="">All subtypes</option>
              {subtypeOptions.map((subtype) => (
                <option key={subtype} value={subtype}>{humanize(subtype)}</option>
              ))}
            </select>
            <input aria-label="General area" className="input !py-2.5" value={filters.area ?? ''} onChange={(event) => setFilter('area', event.target.value)} placeholder="General area" />
            <select aria-label="Street" className="input !py-2.5" value={filters.streetId ?? ''} onChange={(event) => setFilter('streetId', event.target.value)}>
              <option value="">All streets</option>
              {streetOptions.map(([streetId, streetName]) => (
                <option key={streetId} value={streetId}>{streetName}</option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-2">
              <select aria-label="Availability" className="input !px-2 !py-2.5" value={filters.availability ?? ''} onChange={(event) => setFilter('availability', event.target.value as ListingSelectorFilters['availability'])}>
                <option value="">Any availability</option>
                <option value="available">Available</option>
                <option value="unavailable">Unavailable</option>
              </select>
              <select aria-label="Paid or free" className="input !px-2 !py-2.5" value={filters.freeStatus ?? ''} onChange={(event) => setFilter('freeStatus', event.target.value as ListingSelectorFilters['freeStatus'])}>
                <option value="">Paid &amp; free</option>
                <option value="paid">Paid</option>
                <option value="free">Free</option>
              </select>
            </div>
            {activeFilterCount > 0 && (
              <button type="button" onClick={() => setFilters({})} className="justify-self-start text-xs font-bold text-muted-foreground hover:text-foreground">
                Clear filters ({activeFilterCount})
              </button>
            )}
          </div>

          {listingsError ? (
            <div className="p-4"><ErrorPanel error={listingsError} /></div>
          ) : listingsLoading && listings.length === 0 ? (
            <LoadingBlock label="Loading listings…" />
          ) : listings.length === 0 ? (
            <EmptyState
              icon={Building2}
              title={activeFilterCount ? 'No listings match these filters' : 'This Operator has no listings yet'}
              description={activeFilterCount ? 'Clear or change filters to see more of this Operator’s portfolio.' : undefined}
            />
          ) : (
            <TableScroll>
              <table className="w-full min-w-[860px]">
                <thead className="bg-[#ffffff08]">
                  <tr>
                    <th className={th}>Listing</th>
                    <th className={th}>Category</th>
                    <th className={th}>Location</th>
                    <th className={th}>Availability</th>
                    <th className={th}>Current Agent</th>
                    <th className={cn(th, 'text-right')}>Price</th>
                    <th className={th}>Unlock</th>
                    <th className={th}><span className="sr-only">Select</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff12]">
                  {listings.map((row) => {
                    const selected = selectedTargetId === row.targetId;
                    return (
                      <tr key={`${row.targetType}:${row.targetId}`} className={cn(selected ? 'bg-[#10b98112]' : 'hover:bg-[#ffffff08]')}>
                        <td className={td}>
                          <p className="max-w-[220px] truncate font-semibold">{row.title}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{row.targetId}</p>
                          <p className="text-[11px] text-muted-foreground">{TARGET_LABELS[row.targetType]} · <span className="capitalize">{row.publicationStatus.replace(/_/g, ' ')}</span></p>
                        </td>
                        <td className={td}>
                          <p className="text-xs">{categoryLabel(row.category)}</p>
                          {row.subtype && <p className="text-[11px] text-muted-foreground">{humanize(row.subtype)}</p>}
                        </td>
                        <td className={td}>
                          <p className="text-xs">{row.area ?? '—'}{row.city ? `, ${row.city}` : ''}</p>
                          {row.streetName && <p className="text-[11px] text-muted-foreground">{row.streetName}</p>}
                        </td>
                        <td className={td}><StatusBadge status={row.availability} /></td>
                        <td className={td}>
                          <p className="text-xs">{row.currentAgent?.name || (row.agentId ? row.agentId : 'Unassigned')}</p>
                        </td>
                        <td className={cn(td, 'text-right')}>
                          <p className="whitespace-nowrap font-semibold">{naira(row.effectivePrice)}</p>
                          {row.freeUnlock && <p className="whitespace-nowrap text-[11px] text-muted-foreground line-through">{naira(row.standardPrice)}</p>}
                          <p className="whitespace-nowrap text-[11px] text-muted-foreground">{PRICE_SOURCE_LABELS[row.priceSource] ?? humanize(row.priceSource)}</p>
                        </td>
                        <td className={td}>
                          {row.freeUnlock ? <StatusBadge status="active" label="Free" /> : <StatusBadge status="draft" label="Paid" />}
                        </td>
                        <td className={cn(td, 'text-right')}>
                          <button
                            type="button"
                            onClick={() => onSelectListing(row)}
                            className={cn(
                              'inline-flex items-center gap-1 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-bold',
                              selected ? 'bg-primary text-primary-foreground' : 'border border-[#ffffff12] text-foreground hover:bg-[#ffffff08]',
                            )}
                          >
                            {selected && <Check className="h-3.5 w-3.5" />}
                            {selected ? 'Selected' : 'Select'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </div>
      )}
    </div>
  );
}
