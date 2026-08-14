'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Shield,
  ChevronLeft, ChevronRight, Unlock, FileText, UserCheck, ArrowRight,
} from 'lucide-react';
import Link from 'next/link';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { consultationsApi, propertiesApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import type { Property, FilterPropertiesDto } from '@/types';
import { PropertyType } from '@/types';

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

export default function PropertiesPage() {
  const { isAuthenticated } = useAuth();
  const [properties, setProperties] = useState<Property[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');

  const [filters, setFilters] = useState<FilterPropertiesDto>({});
  const [pendingFilters, setPendingFilters] = useState<FilterPropertiesDto>({});
  const [accessFilter, setAccessFilter] = useState<AccessFilter>('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locationFilters: FilterPropertiesDto = {
      state: params.get('state') || undefined,
      city: params.get('city') || undefined,
      area: params.get('area') || undefined,
      streetId: params.get('streetId') || undefined,
    };
    if (!Object.values(locationFilters).some(Boolean)) return;
    setFilters(locationFilters);
    setPendingFilters(locationFilters);
  }, []);

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

      if (currentAccessFilter === 'unlocked') {
        const filtered = unlockedProperties.filter((property) => matchesFilters(property, currentFilters));
        const start = (currentPage - 1) * LIMIT;
        setProperties(filtered.slice(start, start + LIMIT));
        setTotal(filtered.length);
        setTotalPages(Math.max(1, Math.ceil(filtered.length / LIMIT)));
        return;
      }

      const res = await propertiesApi.list({ ...currentFilters, page: currentPage, limit: LIMIT });
      const visibleIds = new Set(res.data.map((property) => property.id));
      const paidHiddenProperties =
        currentPage === 1
          ? unlockedProperties
              .filter((property) => !visibleIds.has(property.id))
              .filter((property) => matchesFilters(property, currentFilters))
          : [];
      const merged = [...paidHiddenProperties, ...res.data].sort(
        (a, b) => Number(unlocked.has(b.id)) - Number(unlocked.has(a.id)),
      );
      const totalWithPaidHidden = res.meta.total + paidHiddenProperties.length;
      setProperties(merged);
      setTotal(totalWithPaidHidden);
      setTotalPages(Math.max(1, Math.ceil(totalWithPaidHidden / LIMIT)));
    } catch {
      setProperties([]);
      setTotal(0);
      setTotalPages(1);
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    fetchProperties(filters, page, accessFilter);
  }, [filters, page, accessFilter, fetchProperties]);

  const handleClearFilters = () => {
    setPendingFilters({});
    setFilters({});
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

  const handleTypeChange = (value: string) => {
    setPendingFilters((current) => ({ ...current, propertyType: (value as PropertyType) || undefined }));
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (accessFilter === 'unlocked' ? 1 : 0);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return (
    <>
      <section className="relative bg-[#050b12] pb-10 pt-28 text-white lg:pb-24">
        <div className="absolute inset-0 bg-[url('/images/web-background-visual-layer.png')] bg-cover bg-center opacity-45" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#050b12] via-[#050b12]/95 to-emerald-950/40" />
        <div className="relative mx-auto grid max-w-7xl gap-10 px-4 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:px-8">
          <div className="max-w-2xl">
            <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
              <MapPin className="h-3.5 w-3.5" />
              Launch Focus: Port Harcourt
            </div>
            <h1 className="font-display mb-4 text-4xl font-black leading-tight text-white md:text-5xl">
              Find Properties<br />Worth <span className="text-veriq-secondary">Inspecting</span>
            </h1>
            <p className="max-w-xl text-sm leading-6 text-white/70 sm:text-base">
              Browse available properties and unlock Property Intelligence before deciding whether a visit is worth your time.
            </p>
            <p className="mt-5 flex max-w-lg items-start gap-3 text-xs leading-5 text-white/70 sm:text-sm">
              <Shield className="mt-0.5 h-5 w-5 shrink-0 text-veriq-secondary" /> Browse freely. Create an account only when you are ready to unlock intelligence or contact the agent.
            </p>
          </div>
          <div className="grid gap-3 self-center sm:grid-cols-2">
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm"><Shield className="h-6 w-6 text-veriq-secondary" /><p className="mt-3 text-sm font-bold">Availability Confirmed</p><p className="mt-1 text-xs leading-5 text-white/60">Listings are checked for current availability.</p></div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm"><UserCheck className="h-6 w-6 text-veriq-secondary" /><p className="mt-3 text-sm font-bold">Agent Verified</p><p className="mt-1 text-xs leading-5 text-white/60">Agents are verified for trust and credibility.</p></div>
            <div className="rounded-lg border border-white/10 bg-white/5 p-5 backdrop-blur-sm sm:col-span-2"><FileText className="h-6 w-6 text-veriq-secondary" /><p className="mt-3 text-sm font-bold">Property Intelligence <span className="text-veriq-secondary">Available</span></p><p className="mt-1 text-xs leading-5 text-white/60">Unlock detailed insights and decision factors before you visit.</p></div>
          </div>
        </div>
        <form onSubmit={handleSearchSubmit} className="relative z-10 mx-4 mt-8 grid max-w-7xl gap-3 rounded-lg border border-slate-200 bg-white p-4 shadow-xl sm:mx-6 lg:absolute lg:inset-x-6 lg:bottom-0 lg:mx-auto lg:mt-0 lg:translate-y-1/2 lg:grid-cols-[1.7fr_0.8fr_0.7fr_0.8fr_auto] lg:px-5">
            <div className="flex min-w-0 items-center gap-2 rounded-md border border-slate-200 px-3">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} className="min-h-11 min-w-0 flex-1 bg-transparent text-sm text-navy-900 outline-none placeholder:text-slate-400" placeholder="Search location, street, estate or road..." />
            </div>
            <select aria-label="Quick property type" value={pendingFilters.propertyType ?? ''} onChange={(e) => handleTypeChange(e.target.value)} className="input"><option value="">Property Type</option>{PROPERTY_TYPES.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
            <select aria-label="Quick bedrooms" value={pendingFilters.minBedrooms ?? ''} onChange={(e) => setPendingFilters((f) => ({ ...f, minBedrooms: e.target.value ? Number(e.target.value) : undefined }))} className="input"><option value="">Bedrooms</option><option value="1">1+</option><option value="2">2+</option><option value="3">3+</option><option value="4">4+</option></select>
            <select aria-label="Quick budget" value={pendingFilters.maxRent ?? ''} onChange={(e) => setPendingFilters((f) => ({ ...f, maxRent: e.target.value ? Number(e.target.value) : undefined }))} className="input"><option value="">Budget</option><option value="500000">Up to N500k</option><option value="1000000">Up to N1m</option><option value="2000000">Up to N2m</option><option value="5000000">Up to N5m</option></select>
            <button type="submit" className="btn-primary justify-center"><Search className="h-4 w-4" /> Search</button>
          </form>
      </section>

      <section className="bg-white pb-14 pt-12 lg:pt-24">
        <div className="mx-auto max-w-7xl space-y-5 px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-display text-2xl font-black text-navy-900">
                Available Properties{filters.city ? ` in ${filters.city}` : ''}
              </h2>
              <p className="mt-1 text-xs text-veriq-muted">
                {isLoading ? 'Loading...' : `${total} properties found`}
              </p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
              <div className="inline-flex rounded-xl border border-slate-200 bg-white p-1">
                <button
                  type="button"
                  onClick={() => setAccessFilter('all')}
                  className={`rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    accessFilter === 'all' ? 'bg-navy-900 text-white' : 'text-navy-700 hover:bg-slate-50'
                  }`}
                >
                  All Properties
                </button>
                <button
                  type="button"
                  onClick={() => { if (isAuthenticated) { setAccessFilter('unlocked'); setPage(1); } }}
                  disabled={!isAuthenticated}
                  className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition-colors ${
                    accessFilter === 'unlocked' ? 'bg-veriq-secondary text-white' : 'text-navy-700 hover:bg-slate-50'
                  }`}
                >
                  <Unlock className="h-4 w-4" />
                  My Unlocks {!isAuthenticated && <span className="text-[9px] font-normal">Sign in to view</span>}
                </button>
              </div>
              <div className="flex min-h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-xs font-semibold text-navy-700">
                <button
                  type="button"
                  role="switch"
                  aria-checked={Boolean(pendingFilters.freeIntelligenceOnly)}
                  aria-label="Free Listing only"
                  onClick={() => {
                    const enabled = !pendingFilters.freeIntelligenceOnly;
                    const next = { ...pendingFilters, freeIntelligenceOnly: enabled || undefined };
                    setPendingFilters(next);
                    setFilters(next);
                    setPage(1);
                  }}
                  className={`relative h-6 w-11 shrink-0 rounded-full transition-colors ${pendingFilters.freeIntelligenceOnly ? 'bg-veriq-secondary' : 'bg-slate-300'}`}
                >
                  <span className={`absolute left-1 top-1 h-4 w-4 rounded-full bg-white shadow transition-transform ${pendingFilters.freeIntelligenceOnly ? 'translate-x-5' : 'translate-x-0'}`} />
                </button>
                Free Listing only
              </div>
            </div>
          </div>

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

          <section className="mt-12 grid overflow-hidden rounded-lg border border-slate-200 bg-slate-50 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-7 sm:p-9">
              <span className="text-xs font-bold uppercase text-veriq-muted">Make smarter decisions</span>
              <h2 className="mt-2 font-display text-2xl font-black text-navy-900">Searching in a specific area?</h2>
              <p className="mt-3 max-w-lg text-sm leading-6 text-veriq-muted">Use Street Intelligence to understand road access, electricity, noise, flooding and security before inspecting a property.</p>
              <Link href="/street-intelligence" className="btn-primary mt-6 inline-flex">Explore Street Intelligence <ArrowRight className="h-4 w-4" /></Link>
            </div>
            <div className="grid min-h-52 place-items-center bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_55%)] p-8">
              <div className="w-full max-w-md rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between"><div><p className="font-bold text-navy-900">Rumuola, Port Harcourt</p><p className="mt-1 text-xs text-veriq-muted">Street Intelligence report</p></div><span className="rounded-full bg-emerald-50 px-2 py-1 text-[10px] font-bold text-emerald-700">Preview</span></div>
                <div className="mt-5 grid grid-cols-2 gap-3 text-xs text-slate-600 sm:grid-cols-4"><span>Flood Risk</span><span>Road Access</span><span>Electricity</span><span>Security Feel</span></div>
              </div>
            </div>
          </section>

          <section className="grid gap-6 border-t border-slate-200 py-12 sm:grid-cols-3">
            {[{ title: 'Structured Property Details', copy: 'Clear facts about each listing to help you compare with confidence.', icon: FileText }, { title: 'Street Context', copy: 'Understand the neighbourhood beyond the property before you visit.', icon: MapPin }, { title: 'Agent Trust Signals', copy: 'Verified agents and availability checks support safer decisions.', icon: UserCheck }].map(({ title, copy, icon: Icon }) => <div key={title} className="flex gap-4"><span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-emerald-50 text-veriq-secondary"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-bold text-navy-900">{title}</h3><p className="mt-1 text-xs leading-5 text-veriq-muted">{copy}</p></div></div>)}
          </section>
        </div>
      </section>
    </>
  );
}
