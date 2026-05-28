'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Search, SlidersHorizontal, MapPin, Shield, ChevronLeft, ChevronRight } from 'lucide-react';
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

export default function PropertiesPage() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Filters
  const [filters, setFilters] = useState<FilterPropertiesDto>({});
  const [pendingFilters, setPendingFilters] = useState<FilterPropertiesDto>({});
  const LIMIT = 12;

  const fetchProperties = useCallback(async (currentFilters: FilterPropertiesDto, currentPage: number) => {
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

  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <>
      {/* Hero */}
      <section className="bg-hero-pattern pt-28 pb-16 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-4">
              <MapPin className="h-3.5 w-3.5" />
              Nigeria
            </div>
            <h1 className="font-display text-4xl font-bold text-white mb-3 md:text-5xl">
              Browse Verified Properties
            </h1>
            <p className="text-white/70 text-base">
              Find your next home with confidence. Every listing vetted — unlock intelligence reports before you inspect.
            </p>
          </div>

          {/* Search */}
          <form onSubmit={handleSearchSubmit} className="mt-8 flex flex-wrap gap-3">
            <div className="flex flex-1 min-w-64 items-center gap-2 rounded-xl bg-white shadow-card px-4 py-3">
              <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
                placeholder="Search by area, city, state…"
              />
            </div>
            <button type="submit" className="btn-gold !rounded-xl">
              Search
            </button>
          </form>
        </div>
      </section>

      {/* Listings */}
      <section className="py-12 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-6 lg:flex-row lg:gap-8">
            {/* Filter sidebar */}
            <aside className="w-full lg:w-64 flex-shrink-0">
              <div className="rounded-2xl bg-veriq-surface p-5 sticky top-24">
                <h3 className="font-display text-sm font-bold text-navy-900 mb-4 flex items-center gap-2">
                  <SlidersHorizontal className="h-4 w-4" /> Filter Results
                </h3>

                <div className="space-y-5">
                  {/* State */}
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

                  {/* City */}
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

                  {/* Type */}
                  <div>
                    <label className="label text-xs">Property Type</label>
                    <select
                      value={pendingFilters.propertyType ?? ''}
                      onChange={(e) =>
                        setPendingFilters((f) => ({
                          ...f,
                          propertyType: (e.target.value as PropertyType) || undefined,
                        }))
                      }
                      className="input text-xs"
                    >
                      {PROPERTY_TYPES.map((t) => (
                        <option key={t.value} value={t.value}>{t.label}</option>
                      ))}
                    </select>
                  </div>

                  {/* Price range */}
                  <div>
                    <label className="label text-xs">Min Rent (₦)</label>
                    <input
                      type="number"
                      value={pendingFilters.minRent ?? ''}
                      onChange={(e) =>
                        setPendingFilters((f) => ({ ...f, minRent: e.target.value ? Number(e.target.value) : undefined }))
                      }
                      className="input text-xs"
                      placeholder="e.g. 100000"
                    />
                  </div>
                  <div>
                    <label className="label text-xs">Max Rent (₦)</label>
                    <input
                      type="number"
                      value={pendingFilters.maxRent ?? ''}
                      onChange={(e) =>
                        setPendingFilters((f) => ({ ...f, maxRent: e.target.value ? Number(e.target.value) : undefined }))
                      }
                      className="input text-xs"
                      placeholder="e.g. 2000000"
                    />
                  </div>

                  {/* Bedrooms */}
                  <div>
                    <label className="label text-xs">Min Bedrooms</label>
                    <div className="flex gap-2">
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

                  {/* Freshness */}
                  <div>
                    <label className="label text-xs">Listing Freshness</label>
                    <select
                      value={pendingFilters.freshnessScore ?? ''}
                      onChange={(e) =>
                        setPendingFilters((f) => ({
                          ...f,
                          freshnessScore: (e.target.value as FreshnessScore) || undefined,
                        }))
                      }
                      className="input text-xs"
                    >
                      {FRESHNESS_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </div>

                  <button
                    type="button"
                    onClick={handleApplyFilters}
                    className="btn-primary w-full !text-xs !py-2.5"
                  >
                    Apply Filters
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPendingFilters({});
                      setFilters({});
                      setPage(1);
                    }}
                    className="w-full rounded-xl border border-slate-200 py-2 text-xs text-slate-500 hover:bg-slate-50 transition-colors"
                  >
                    Clear Filters
                  </button>
                </div>
              </div>
            </aside>

            {/* Results */}
            <div className="flex-1">
              {/* Results header */}
              <div className="flex items-center justify-between mb-6">
                <div>
                  <p className="font-semibold text-navy-900">
                    {isLoading ? 'Loading…' : `${total} properties found`}
                  </p>
                  <p className="text-xs text-veriq-muted">Nigeria</p>
                </div>
              </div>

              {/* Trust banner */}
              <div className="flex items-center gap-3 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3 mb-6">
                <Shield className="h-5 w-5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-700">
                  <strong>Verified listings</strong> have been reviewed by our team. Unlock a property&apos;s intelligence report to access full details, disclosures, and agent contact.
                </p>
              </div>

              {/* Loading state */}
              {isLoading ? (
                <div className="flex items-center justify-center py-24">
                  <LoadingSpinner size="lg" className="text-veriq-secondary" />
                </div>
              ) : properties.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-center">
                  <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
                    <Search className="h-8 w-8 text-slate-400" />
                  </div>
                  <h3 className="font-display text-lg font-bold text-navy-900 mb-2">No properties found</h3>
                  <p className="text-sm text-veriq-muted max-w-xs">
                    Try adjusting your filters or search in a different area.
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
                  {properties.map((property) => (
                    <PropertyCard key={property.id} property={property} />
                  ))}
                </div>
              )}

              {/* Pagination */}
              {!isLoading && totalPages > 1 && (
                <div className="mt-10 flex items-center justify-center gap-2">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </button>
                  {pageNumbers.map((p) => (
                    <button
                      key={p}
                      onClick={() => setPage(p)}
                      className={`h-9 w-9 rounded-lg text-sm font-medium transition-all ${
                        p === page
                          ? 'bg-veriq-secondary text-white'
                          : 'border border-slate-200 text-navy-700 hover:border-veriq-secondary hover:text-veriq-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && <span className="text-slate-400">…</span>}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
