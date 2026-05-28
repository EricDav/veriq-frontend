'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, Shield,
  ChevronLeft, ChevronRight, X,
} from 'lucide-react';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { propertiesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { Property, FilterPropertiesDto } from '@/types';
import { PropertyType, FreshnessScore } from '@/types';

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: PropertyType.FLAT, label: 'Flat' },
  { value: PropertyType.DUPLEX, label: 'Duplex' },
  { value: PropertyType.BUNGALOW, label: 'Bungalow' },
  { value: PropertyType.SELF_CONTAIN, label: 'Self-Contain' },
  { value: PropertyType.STUDIO, label: 'Studio' },
  { value: PropertyType.MANSION, label: 'Mansion' },
  { value: PropertyType.OTHER, label: 'Other' },
];

const FRESHNESS_OPTIONS = [
  { value: '', label: 'Any Freshness' },
  { value: FreshnessScore.FRESHLY_VERIFIED, label: 'Freshly Verified' },
  { value: FreshnessScore.RECENTLY_VERIFIED, label: 'Recently Verified' },
];

const LIMIT = 12;

export default function BrowsePropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterPropertiesDto>({});
  const [pendingFilters, setPendingFilters] = useState<FilterPropertiesDto>({});

  const fetchProperties = useCallback(async (
    currentFilters: FilterPropertiesDto,
    currentPage: number,
  ) => {
    setIsLoading(true);
    try {
      const res = await propertiesApi.list({ ...currentFilters, page: currentPage, limit: LIMIT });
      setProperties(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters, page);
  }, [filters, page, fetchProperties]);

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setPendingFilters({});
    setFilters({});
    setSearch('');
    setPage(1);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parts = search.trim().split(',').map((s) => s.trim());
    const newFilters: FilterPropertiesDto = { ...pendingFilters };
    if (parts[0]) newFilters.area = parts[0];
    setFilters(newFilters);
    setPendingFilters(newFilters);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Browse Properties</h1>
        <p className="text-sm text-veriq-muted">
          {isLoading ? 'Loading listings…' : `${total} verified listings available`}
        </p>
      </div>

      {/* Search + filter toggle row */}
      <div className="flex items-center gap-3 flex-wrap">
        <form onSubmit={handleSearchSubmit} className="flex flex-1 min-w-64 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
            placeholder="Search by area, city, state…"
          />
          {search && (
            <button type="button" onClick={() => { setSearch(''); handleClearFilters(); }}>
              <X className="h-3.5 w-3.5 text-slate-400 hover:text-slate-600" />
            </button>
          )}
        </form>
        <button
          type="button"
          onClick={() => setShowFilters((v) => !v)}
          className={`flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-medium transition-colors ${
            showFilters || activeFilterCount > 0
              ? 'border-veriq-secondary bg-veriq-secondary/5 text-veriq-secondary'
              : 'border-slate-200 bg-white text-navy-700 hover:border-slate-300'
          }`}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="ml-1 flex h-4 w-4 items-center justify-center rounded-full bg-veriq-secondary text-[10px] font-bold text-white">
              {activeFilterCount}
            </span>
          )}
        </button>
        <button type="button" onClick={handleSearchSubmit as any} className="btn-primary !text-sm !py-2.5">
          Search
        </button>
      </div>

      {/* Collapsible filter panel */}
      {showFilters && (
        <div className="card p-5">
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
            <div>
              <label className="label text-xs">State</label>
              <input
                type="text"
                value={pendingFilters.state ?? ''}
                onChange={(e) => setPendingFilters((f) => ({ ...f, state: e.target.value || undefined }))}
                className="input text-xs"
                placeholder="e.g. Lagos"
              />
            </div>
            <div>
              <label className="label text-xs">City</label>
              <input
                type="text"
                value={pendingFilters.city ?? ''}
                onChange={(e) => setPendingFilters((f) => ({ ...f, city: e.target.value || undefined }))}
                className="input text-xs"
                placeholder="e.g. Lekki"
              />
            </div>
            <div>
              <label className="label text-xs">Property Type</label>
              <select
                value={pendingFilters.propertyType ?? ''}
                onChange={(e) => setPendingFilters((f) => ({
                  ...f, propertyType: (e.target.value as PropertyType) || undefined,
                }))}
                className="input text-xs"
              >
                {PROPERTY_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label text-xs">Min Rent (₦)</label>
              <input
                type="number"
                value={pendingFilters.minRent ?? ''}
                onChange={(e) => setPendingFilters((f) => ({
                  ...f, minRent: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="input text-xs"
                placeholder="100,000"
              />
            </div>
            <div>
              <label className="label text-xs">Max Rent (₦)</label>
              <input
                type="number"
                value={pendingFilters.maxRent ?? ''}
                onChange={(e) => setPendingFilters((f) => ({
                  ...f, maxRent: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="input text-xs"
                placeholder="2,000,000"
              />
            </div>
            <div>
              <label className="label text-xs">Freshness</label>
              <select
                value={pendingFilters.freshnessScore ?? ''}
                onChange={(e) => setPendingFilters((f) => ({
                  ...f, freshnessScore: (e.target.value as FreshnessScore) || undefined,
                }))}
                className="input text-xs"
              >
                {FRESHNESS_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Bedrooms */}
          <div className="mt-4">
            <label className="label text-xs">Min Bedrooms</label>
            <div className="flex gap-2 mt-1">
              {['Any', '1', '2', '3', '4+'].map((b) => {
                const val = b === 'Any' ? undefined : b === '4+' ? 4 : Number(b);
                const isActive = (pendingFilters.minBedrooms ?? undefined) === val;
                return (
                  <button
                    key={b}
                    type="button"
                    onClick={() => setPendingFilters((f) => ({ ...f, minBedrooms: val }))}
                    className={`flex-1 rounded-lg py-1.5 text-xs font-medium transition-all ${
                      isActive
                        ? 'bg-veriq-secondary text-white'
                        : 'bg-white border border-slate-200 text-navy-700 hover:border-veriq-secondary'
                    }`}
                  >
                    {b}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="flex gap-3 mt-5">
            <button onClick={handleApplyFilters} className="btn-primary !text-xs !py-2">
              Apply Filters
            </button>
            <button
              onClick={handleClearFilters}
              className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
            >
              Clear All
            </button>
          </div>
        </div>
      )}

      {/* Trust banner */}
      <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
        <Shield className="h-4 w-4 text-blue-600 flex-shrink-0" />
        <p className="text-xs text-blue-700">
          <strong>Verified listings</strong> — unlock a property&apos;s intelligence report to access full details, agent contact, and disclosures.
        </p>
      </div>

      {/* Results */}
      {isLoading ? (
        <div className="flex items-center justify-center py-24">
          <LoadingSpinner size="lg" className="text-veriq-secondary" />
        </div>
      ) : properties.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center card">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Search className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-lg font-bold text-navy-900 mb-2">No properties found</h3>
          <p className="text-sm text-veriq-muted max-w-xs">
            Try adjusting your filters or searching a different area.
          </p>
          {activeFilterCount > 0 && (
            <button onClick={handleClearFilters} className="mt-4 btn-primary !text-xs !py-2">
              Clear Filters
            </button>
          )}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
            {properties.map((property) => (
              <PropertyCard
                key={property.id}
                property={property}
                detailHref={`/dashboard/browse/${property.id}`}
              />
            ))}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              {Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                    p === page
                      ? 'bg-veriq-secondary text-white'
                      : 'border border-slate-200 text-navy-700 hover:border-veriq-secondary'
                  }`}
                >
                  {p}
                </button>
              ))}
              {totalPages > 5 && <span className="text-slate-400 text-sm">…</span>}
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
