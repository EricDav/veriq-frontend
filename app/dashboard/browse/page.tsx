'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, SlidersHorizontal, Shield,
  ChevronLeft, ChevronRight, X, Unlock,
} from 'lucide-react';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { agentsApi, consultationsApi, locationsApi, propertiesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { Agent, AllowedState, Property, FilterPropertiesDto } from '@/types';
import {
  PropertyType, FreshnessScore,
  HostelSuitableFor, HostelGender, HostelCampusProximity,
  ShortStayPricingModel,
} from '@/types';

// V2 Framework — primary types only
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

function matchesFilters(property: Property, filters: FilterPropertiesDto) {
  const includes = (value: string | null | undefined, query: string) =>
    (value ?? '').toLowerCase().includes(query.toLowerCase());

  if (filters.q) {
    const agentName = property.agent?.user
      ? `${property.agent.user.firstName ?? ''} ${property.agent.user.lastName ?? ''}`.trim()
      : '';
    const agentBusinessName = property.agent?.businessName ?? '';
    const searchable = [
      property.title,
      property.state,
      property.city,
      property.area,
      agentName,
      agentBusinessName,
    ];
    if (!searchable.some((value) => includes(value, filters.q as string))) return false;
  }
  if (filters.state && !includes(property.state, filters.state)) return false;
  if (filters.agentId && property.agentId !== filters.agentId) return false;
  if (filters.city && !includes(property.city, filters.city)) return false;
  if (filters.area && !includes(property.area, filters.area)) return false;
  if (filters.propertyType && property.propertyType !== filters.propertyType) return false;
  if (filters.freshnessScore && property.freshnessScore !== filters.freshnessScore) return false;
  if (filters.minRent && property.rentAmount < Number(filters.minRent)) return false;
  if (filters.maxRent && property.rentAmount > Number(filters.maxRent)) return false;
  if (filters.minBedrooms && (property.bedrooms ?? 0) < Number(filters.minBedrooms)) return false;
  if (filters.shortStayPricingModel && property.shortStayPricingModel !== filters.shortStayPricingModel) return false;
  if (filters.maxDailyRate && Number(property.shortStayDailyRate ?? 0) > Number(filters.maxDailyRate)) return false;
  if (filters.maxNights && Number(property.shortStayMaxNights ?? 0) > Number(filters.maxNights)) return false;
  if (filters.hostelGender && property.hostelGender !== filters.hostelGender) return false;
  if (filters.hostelCampusProximity && property.hostelCampusProximity !== filters.hostelCampusProximity) return false;
  if (filters.hostelPersonsPerRoom && Number(property.hostelPersonsPerRoom ?? Infinity) > Number(filters.hostelPersonsPerRoom)) return false;
  if (filters.hostelSuitableFor && !(property.hostelSuitableFor ?? []).includes(filters.hostelSuitableFor)) return false;

  return true;
}

export default function BrowsePropertiesPage() {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [activeStates, setActiveStates] = useState<AllowedState[]>([]);
  const [unlockedCount, setUnlockedCount] = useState(0);
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

  const fetchProperties = useCallback(async (
    currentFilters: FilterPropertiesDto,
    currentPage: number,
    currentAccessFilter: AccessFilter,
  ) => {
    setIsLoading(true);
    try {
      let unlocked = new Set<string>();
      let unlockedProperties: Property[] = [];
      if (isAuthenticated) {
        try {
          const consultations = await consultationsApi.getMyConsultations(1, 100);
          const now = Date.now();
          const activeConsultations = consultations.data.filter((item) =>
            item.status === 'unlocked' &&
            item.accessExpiresAt &&
            new Date(item.accessExpiresAt).getTime() > now &&
            item.property,
          );
          unlocked = new Set(activeConsultations.map((item) => item.propertyId));
          unlockedProperties = activeConsultations.map((item) => item.property);
        } catch {
          unlocked = new Set<string>();
          unlockedProperties = [];
        }
      }
      setUnlockedCount(unlocked.size);

      if (currentAccessFilter === 'unlocked') {
        const filtered = unlockedProperties.filter((property) => matchesFilters(property, currentFilters));
        const start = (currentPage - 1) * LIMIT;
        setProperties(filtered.slice(start, start + LIMIT));
        setTotal(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / LIMIT)));
        return;
      }

      const res = await propertiesApi.list({ ...currentFilters, page: currentPage, limit: LIMIT });
      setProperties([...res.data].sort((a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id))));
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      setProperties([]);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProperties(filters, page, accessFilter);
  }, [filters, page, accessFilter, fetchProperties]);

  useEffect(() => {
    agentsApi.list(1, 100)
      .then((res) => setAgents(res.data))
      .catch(() => setAgents([]));

    locationsApi.activeStates()
      .then((res) => setActiveStates(res.data))
      .catch(() => setActiveStates([]));
  }, []);

  const handleApplyFilters = () => {
    setFilters(pendingFilters);
    setAccessFilter(pendingAccessFilter);
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
    const query = search.trim();
    const newFilters: FilterPropertiesDto = { ...pendingFilters };
    if (query) {
      newFilters.q = query;
    } else {
      delete newFilters.q;
    }
    setFilters(newFilters);
    setPendingFilters(newFilters);
    setPage(1);
  };

  const handleAccessTab = (value: AccessFilter) => {
    setAccessFilter(value);
    setPendingAccessFilter(value);
    setPage(1);
  };

  // Clear type-specific filters when switching property type
  const handleTypeChange = (value: string) => {
    setPendingFilters((f) => ({
      q: f.q,
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

  return (
    <div className="max-w-7xl mx-auto space-y-5">
      {/* Header */}
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">Browse Properties</h1>
        <p className="text-sm text-veriq-muted">
          {isLoading ? 'Loading listings…' : accessFilter === 'unlocked' ? `${total} active unlocked ${total === 1 ? 'property' : 'properties'}` : `${total} verified listings available`}
        </p>
      </div>

      <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
        <button
          type="button"
          onClick={() => handleAccessTab('all')}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
            accessFilter === 'all' ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-slate-50'
          }`}
        >
          All Properties
        </button>
        <button
          type="button"
          onClick={() => handleAccessTab('unlocked')}
          disabled={!isAuthenticated}
          className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${
            accessFilter === 'unlocked' ? 'bg-veriq-secondary text-white' : 'text-navy-700 hover:bg-slate-50'
          }`}
        >
          <Unlock className="h-4 w-4" />
          Unlocked
          {isAuthenticated && (
            <span className={`rounded-full px-2 py-0.5 text-[10px] ${accessFilter === 'unlocked' ? 'bg-white/20 text-white' : 'bg-slate-100 text-slate-500'}`}>
              {unlockedCount}
            </span>
          )}
        </button>
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
        <div className="card p-5 space-y-4">

          {/* Row 1: Location + Type + Rent + Freshness */}
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
              <select
                value={pendingFilters.state ?? ''}
                onChange={(e) => setPendingFilters((f) => ({ ...f, state: e.target.value || undefined }))}
                className="input text-xs"
              >
                <option value="">All states</option>
                {activeStates.map((state) => (
                  <option key={state.id} value={state.name}>
                    {state.name}
                  </option>
                ))}
              </select>
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
              <label className="label text-xs">Min Rent (₦)</label>
              <input
                type="number"
                value={pendingFilters.minRent ?? ''}
                onChange={(e) => setPendingFilters((f) => ({
                  ...f, minRent: e.target.value ? Number(e.target.value) : undefined,
                }))}
                className="input text-xs"
                placeholder="e.g. 50,000"
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
                placeholder="e.g. 2,000,000"
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

          {/* ── Standard filters (non-hostel, non-short-stay) ── */}
          {isStandard && (
            <div>
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
          )}

          {/* ── Short Stay filters ── */}
          {isShortStay && (
            <div className="rounded-xl border border-veriq-secondary/20 bg-veriq-secondary/5 p-4 space-y-4">
              <p className="text-xs font-semibold text-veriq-secondary uppercase tracking-wide">Short Stay Filters</p>
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
                  <label className="label text-xs">Max Rate / Night (₦)</label>
                  <input
                    type="number"
                    min={0}
                    value={pendingFilters.maxDailyRate ?? ''}
                    onChange={(e) => setPendingFilters((f) => ({
                      ...f, maxDailyRate: e.target.value ? Number(e.target.value) : undefined,
                    }))}
                    className="input text-xs"
                    placeholder="e.g. 30,000"
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

          {/* ── Hostel-specific filters ── */}
          {isHostel && (
            <div className="rounded-xl border border-veriq-secondary/20 bg-veriq-secondary/5 p-4 space-y-4">
              <p className="text-xs font-semibold text-veriq-secondary uppercase tracking-wide">Hostel Filters</p>
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
      <div className="flex items-center gap-3 rounded-xl bg-veriq-secondary/10 border border-veriq-secondary/20 px-4 py-3">
        <Shield className="h-4 w-4 text-veriq-secondary flex-shrink-0" />
        <p className="text-xs text-navy-800">
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
