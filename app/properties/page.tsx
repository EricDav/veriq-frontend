'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, MapPin, Shield,
  ChevronLeft, ChevronRight, X, Unlock,
} from 'lucide-react';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { agentsApi, propertiesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { Agent, Property, FilterPropertiesDto } from '@/types';
import {
  PropertyType, FreshnessScore,
  HostelSuitableFor, HostelGender, HostelCampusProximity,
  ShortStayPricingModel,
} from '@/types';

const PROPERTY_TYPES = [
  { value: '', label: 'All Types' },
  { value: PropertyType.FLAT, label: 'Apartment / Flat' },
  { value: PropertyType.MINI_FLAT, label: 'Mini Flat' },
  { value: PropertyType.SELF_CONTAIN, label: 'Self Contain' },
  { value: PropertyType.ROOM_AND_PARLOUR, label: 'Room & Parlour' },
  { value: PropertyType.DUPLEX, label: 'Duplex' },
  { value: PropertyType.BUNGALOW, label: 'Bungalow' },
  { value: PropertyType.HOSTEL, label: 'Hostel' },
  { value: PropertyType.SHORT_STAY, label: 'Short Stay' },
];

const SHORT_STAY_PRICING_OPTIONS = [
  { value: '', label: 'Any' },
  { value: ShortStayPricingModel.DAILY, label: 'Daily Rate' },
  { value: ShortStayPricingModel.WEEKLY, label: 'Weekly Rate' },
  { value: ShortStayPricingModel.BOTH, label: 'Daily & Weekly' },
];

const FRESHNESS_OPTIONS = [
  { value: '', label: 'Any Freshness' },
  { value: FreshnessScore.FRESHLY_VERIFIED, label: 'Freshly Verified' },
  { value: FreshnessScore.RECENTLY_VERIFIED, label: 'Recently Verified' },
];

const HOSTEL_SUITABLE_FOR_OPTIONS = [
  { value: '', label: 'Any' },
  { value: HostelSuitableFor.STUDENTS, label: 'Students' },
  { value: HostelSuitableFor.CORP_MEMBERS, label: 'Corp Members (NYSC)' },
  { value: HostelSuitableFor.WORKING_CLASS, label: 'Working Class' },
  { value: HostelSuitableFor.TEMPORARY_STAY, label: 'Temporary Stay' },
  { value: HostelSuitableFor.MIXED, label: 'Mixed / Any' },
];

const HOSTEL_GENDER_OPTIONS = [
  { value: '', label: 'Any Gender' },
  { value: HostelGender.MALE, label: 'Male Only' },
  { value: HostelGender.FEMALE, label: 'Female Only' },
  { value: HostelGender.MIXED, label: 'Mixed' },
];

const HOSTEL_CAMPUS_OPTIONS = [
  { value: '', label: 'Any Location' },
  { value: HostelCampusProximity.ON_CAMPUS, label: 'On Campus' },
  { value: HostelCampusProximity.OFF_CAMPUS, label: 'Off Campus' },
];

const LIMIT = 12;
type AccessFilter = 'all' | 'unlocked';

export default function PropertiesPage() {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);

  const [filters, setFilters] = useState<FilterPropertiesDto>({});
  const [pendingFilters, setPendingFilters] = useState<FilterPropertiesDto>({});
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');
  const [pendingAccessFilter, setPendingAccessFilter] = useState<AccessFilter>('all');

  const isHostel = pendingFilters.propertyType === PropertyType.HOSTEL;
  const isShortStay = pendingFilters.propertyType === PropertyType.SHORT_STAY;
  const isStandard = !isHostel && !isShortStay;

  const fetchProperties = useCallback(async (currentFilters: FilterPropertiesDto, currentPage: number) => {
    setIsLoading(true);
    try {
      const res = await propertiesApi.list({ ...currentFilters, page: currentPage, limit: LIMIT });
      setProperties(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      setProperties([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchProperties(filters, page);
  }, [filters, page, fetchProperties]);

  useEffect(() => {
    agentsApi.list(1, 100)
      .then((res) => setAgents(res.data))
      .catch(() => setAgents([]));
  }, []);

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setAccessFilter(isAuthenticated ? pendingAccessFilter : 'all');
    setPage(1);
    setShowFilters(false);
  };

  const handleClearFilters = () => {
    setPendingFilters({});
    setFilters({});
    setPendingAccessFilter('all');
    setAccessFilter('all');
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

  const handleTypeChange = (value: string) => {
    setPendingFilters((f) => ({
      state: f.state,
      city: f.city,
      area: f.area,
      agentId: f.agentId,
      minRent: f.minRent,
      maxRent: f.maxRent,
      freshnessScore: f.freshnessScore,
      propertyType: (value as PropertyType) || undefined,
    }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (accessFilter === 'unlocked' ? 1 : 0);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <>
      <section className="bg-hero-pattern pt-28 pb-16 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-4 py-1.5 text-xs font-semibold text-gold-300">
              <MapPin className="h-3.5 w-3.5" />
              Nigeria
            </div>
            <h1 className="font-display mb-3 text-4xl font-bold text-white md:text-5xl">
              Browse Verified Properties
            </h1>
            <p className="text-base text-white/70">
              Find your next home with confidence. Every listing vetted — unlock intelligence reports before you inspect.
            </p>
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-8 flex flex-wrap gap-3">
            <div className="flex min-w-64 flex-1 items-center gap-2 rounded-xl bg-white px-4 py-3 shadow-card">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-slate-400"
                placeholder="Search by area, city, state..."
              />
            </div>
            <button type="submit" className="btn-gold !rounded-xl">
              Search
            </button>
          </form>
        </div>
      </section>

      <section className="bg-white py-12">
        <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-semibold text-navy-900">
                {isLoading ? 'Loading...' : `${total} properties found`}
              </p>
              <p className="text-xs text-veriq-muted">Nigeria</p>
            </div>
            <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
              <button
                type="button"
                onClick={() => { setAccessFilter('all'); setPendingAccessFilter('all'); }}
                className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                  accessFilter === 'all' ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-slate-50'
                }`}
              >
                All Properties
              </button>
              <button
                type="button"
                disabled
                className="flex cursor-not-allowed items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold text-navy-700 opacity-50"
              >
                <Unlock className="h-4 w-4" />
                Unlocked
              </button>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <form onSubmit={handleSearchSubmit} className="flex min-w-64 flex-1 items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
              <Search className="h-4 w-4 flex-shrink-0 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-slate-400"
                placeholder="Search by area, city, state..."
              />
              {search && (
                <button type="button" onClick={handleClearFilters}>
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
            <button type="button" onClick={handleSearchSubmit as any} className="btn-primary !py-2.5 !text-sm">
              Search
            </button>
          </div>

          {showFilters && (
            <div className="card space-y-4 p-5">
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
                <div>
                  <label className="label text-xs">Access</label>
                  <select
                    value={pendingAccessFilter}
                    onChange={(e) => setPendingAccessFilter(e.target.value as AccessFilter)}
                    className="input text-xs"
                    disabled={!isAuthenticated}
                  >
                    <option value="all">All properties</option>
                    <option value="unlocked">Unlocked only</option>
                  </select>
                </div>
                <div>
                  <label className="label text-xs">Agent</label>
                  <select
                    value={pendingFilters.agentId ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, agentId: e.target.value || undefined }))}
                    className="input text-xs"
                  >
                    <option value="">All agents</option>
                    {agents.map((agent) => (
                      <option key={agent.id} value={agent.id}>
                        {agent.businessName || `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`.trim() || agent.username || 'Agent'}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="label text-xs">State</label>
                  <input
                    type="text"
                    value={pendingFilters.state ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, state: e.target.value || undefined }))}
                    className="input text-xs"
                    placeholder="e.g. Rivers"
                  />
                </div>
                <div>
                  <label className="label text-xs">City</label>
                  <input
                    type="text"
                    value={pendingFilters.city ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({ ...f, city: e.target.value || undefined }))}
                    className="input text-xs"
                    placeholder="e.g. Port Harcourt"
                  />
                </div>
                <div>
                  <label className="label text-xs">Property Type</label>
                  <select
                    value={pendingFilters.propertyType ?? ''}
                    onChange={(e) => handleTypeChange(e.target.value)}
                    className="input text-xs"
                  >
                    {PROPERTY_TYPES.map((t) => (
                      <option key={t.value} value={t.value}>{t.label}</option>
                    ))}
                  </select>
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
                <div>
                  <label className="label text-xs">Min Rent (N)</label>
                  <input
                    type="number"
                    value={pendingFilters.minRent ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({
                      ...f, minRent: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                    className="input text-xs"
                    placeholder="e.g. 50000"
                  />
                </div>
                <div>
                  <label className="label text-xs">Max Rent (N)</label>
                  <input
                    type="number"
                    value={pendingFilters.maxRent ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({
                      ...f, maxRent: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                    className="input text-xs"
                    placeholder="e.g. 2000000"
                  />
                </div>
              </div>

              {isStandard && (
                <div>
                  <label className="label text-xs">Min Bedrooms</label>
                  <div className="mt-1 flex gap-2">
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
                              : 'border border-slate-200 bg-white text-navy-700 hover:border-veriq-secondary'
                          }`}
                        >
                          {b}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {isShortStay && (
                <div className="space-y-4 rounded-xl border border-veriq-secondary/20 bg-veriq-secondary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-veriq-secondary">Short Stay Filters</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
                    <div>
                      <label className="label text-xs">Pricing Model</label>
                      <select
                        value={pendingFilters.shortStayPricingModel ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, shortStayPricingModel: (e.target.value as ShortStayPricingModel) || undefined,
                        }))}
                        className="input text-xs"
                      >
                        {SHORT_STAY_PRICING_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Max Rate / Night (N)</label>
                      <input
                        type="number"
                        min={0}
                        value={pendingFilters.maxDailyRate ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, maxDailyRate: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                        className="input text-xs"
                        placeholder="e.g. 30000"
                      />
                    </div>
                    <div>
                      <label className="label text-xs">Max Stay (nights)</label>
                      <input
                        type="number"
                        min={1}
                        value={pendingFilters.maxNights ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, maxNights: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                        className="input text-xs"
                        placeholder="e.g. 7"
                      />
                    </div>
                  </div>
                </div>
              )}

              {isHostel && (
                <div className="space-y-4 rounded-xl border border-veriq-secondary/20 bg-veriq-secondary/5 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wide text-veriq-secondary">Hostel Filters</p>
                  <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <div>
                      <label className="label text-xs">Suitable For</label>
                      <select
                        value={pendingFilters.hostelSuitableFor ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, hostelSuitableFor: (e.target.value as HostelSuitableFor) || undefined,
                        }))}
                        className="input text-xs"
                      >
                        {HOSTEL_SUITABLE_FOR_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Gender</label>
                      <select
                        value={pendingFilters.hostelGender ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, hostelGender: (e.target.value as HostelGender) || undefined,
                        }))}
                        className="input text-xs"
                      >
                        {HOSTEL_GENDER_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Campus Location</label>
                      <select
                        value={pendingFilters.hostelCampusProximity ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, hostelCampusProximity: (e.target.value as HostelCampusProximity) || undefined,
                        }))}
                        className="input text-xs"
                      >
                        {HOSTEL_CAMPUS_OPTIONS.map((o) => (
                          <option key={o.value} value={o.value}>{o.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="label text-xs">Max Persons/Room</label>
                      <input
                        type="number"
                        min={1}
                        value={pendingFilters.hostelPersonsPerRoom ?? ''}
                        onChange={(e) => setPendingFilters((f) => ({
                          ...f, hostelPersonsPerRoom: e.target.value ? Number(e.target.value) : undefined,
                        }))}
                        className="input text-xs"
                        placeholder="e.g. 2"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="flex gap-3">
                <button type="button" onClick={handleApplyFilters} className="btn-primary !py-2 !text-xs">
                  Apply Filters
                </button>
                <button
                  type="button"
                  onClick={handleClearFilters}
                  className="rounded-xl border border-slate-200 px-4 py-2 text-xs text-slate-500 transition-colors hover:bg-slate-50"
                >
                  Clear All
                </button>
              </div>
            </div>
          )}

          <div className="flex items-center gap-3 rounded-xl border border-veriq-secondary/20 bg-veriq-secondary/10 px-4 py-3">
            <Shield className="h-4 w-4 flex-shrink-0 text-veriq-secondary" />
            <p className="text-xs text-navy-800">
              <strong>Verified listings</strong> — unlock a property&apos;s intelligence report to access full details, agent contact, and disclosures.
            </p>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-24">
              <LoadingSpinner size="lg" className="text-veriq-secondary" />
            </div>
          ) : properties.length === 0 ? (
            <div className="card flex flex-col items-center justify-center py-24 text-center">
              <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
                <Search className="h-8 w-8 text-slate-400" />
              </div>
              <h3 className="font-display mb-2 text-lg font-bold text-navy-900">No properties found</h3>
              <p className="max-w-xs text-sm text-veriq-muted">
                Try adjusting your filters or searching a different area.
              </p>
              {activeFilterCount > 0 && (
                <button type="button" onClick={handleClearFilters} className="btn-primary mt-4 !py-2 !text-xs">
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
                    detailHref={`/properties/${property.id}`}
                  />
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 pt-4">
                  <button
                    disabled={page === 1}
                    onClick={() => setPage((p) => p - 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:cursor-not-allowed disabled:opacity-40"
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
                          : 'border border-slate-200 text-navy-700 hover:border-veriq-secondary'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                  {totalPages > 5 && <span className="text-sm text-slate-400">...</span>}
                  <button
                    disabled={page === totalPages}
                    onClick={() => setPage((p) => p + 1)}
                    className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </button>
                </div>
              )}
            </>
          )}
        </div>
      </section>
    </>
  );
}
