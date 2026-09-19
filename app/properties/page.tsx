'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, MapPin, Shield, Building2, Hotel, Users, Tag, Home,
  ChevronLeft, ChevronRight, Unlock, FileText, UserCheck, ArrowRight, SlidersHorizontal, Gift, CalendarDays,
} from 'lucide-react';
import Link from 'next/link';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { propertiesApi } from '@/lib/api';
import { unlocksApi } from '@/lib/api/renter';
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
  { value: PropertyType.SHORT_STAY, label: 'Short Let' },
];

const LIMIT = 12;
type AccessFilter = 'all' | 'unlocked';
type BrowseCategory = 'all' | 'residential' | 'short_let' | 'hostel' | 'shared' | 'sale';

const BROWSE_CATEGORIES: { value: BrowseCategory; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Categories', icon: SlidersHorizontal },
  { value: 'residential', label: 'Residential Property', icon: Home },
  { value: 'short_let', label: 'Short Lets', icon: Building2 },
  { value: 'hostel', label: 'Hostels', icon: Hotel },
  { value: 'shared', label: 'Shared Apartments', icon: Users },
  { value: 'sale', label: 'Property for Sale', icon: Tag },
];

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

interface BrowseExperienceProps {
  properties: Property[];
  total: number;
  page: number;
  totalPages: number;
  isLoading: boolean;
  search: string;
  filters: FilterPropertiesDto;
  pendingFilters: FilterPropertiesDto;
  category: BrowseCategory;
  accessFilter: AccessFilter;
  isAuthenticated: boolean;
  activeFilterCount: number;
  pageNumbers: number[];
  setSearch: React.Dispatch<React.SetStateAction<string>>;
  setPendingFilters: React.Dispatch<React.SetStateAction<FilterPropertiesDto>>;
  setAccessFilter: React.Dispatch<React.SetStateAction<AccessFilter>>;
  setPage: React.Dispatch<React.SetStateAction<number>>;
  handleSearchSubmit: (event: React.FormEvent) => void;
  handleTypeChange: (value: string) => void;
  handleCategoryChange: (value: BrowseCategory) => void;
  handleClearFilters: () => void;
}

function BrowsePropertyExperience(props: BrowseExperienceProps) {
  const { properties, total, page, totalPages, isLoading, search, pendingFilters, category,
    accessFilter, isAuthenticated, activeFilterCount, pageNumbers, setSearch,
    setPendingFilters, setAccessFilter, setPage, handleSearchSubmit, handleTypeChange,
    handleCategoryChange, handleClearFilters } = props;
  const categoryLabel = BROWSE_CATEGORIES.find((item) => item.value === category)?.label.toLowerCase();

  return (
    <main className="min-h-screen bg-[#03171d] text-white">
      <section className="relative overflow-hidden border-b border-emerald-400/15 pb-8 pt-28">
        <div className="absolute inset-0 bg-[url('/images/web-background-visual-layer.png')] bg-cover bg-center opacity-30" />
        <div className="absolute inset-0 bg-gradient-to-r from-[#03171d] via-[#05242a]/95 to-[#07353a]/70" />
        <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/10 px-3 py-1.5 text-[11px] font-semibold uppercase text-emerald-300"><Search className="h-3.5 w-3.5" /> Find your next property</span>
          <h1 className="mt-4 font-display text-4xl font-bold sm:text-5xl">Browse <span className="text-emerald-400">Properties</span></h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-white/65 sm:text-base">Explore verified properties with clear previews before you decide what is worth unlocking.</p>

          <div className="mt-8 grid grid-cols-2 gap-2 md:grid-cols-3 xl:grid-cols-6" role="tablist" aria-label="Property categories">
            {BROWSE_CATEGORIES.map(({ value, label, icon: Icon }) => <button key={value} type="button" role="tab" aria-selected={category === value} onClick={() => handleCategoryChange(value)} className={`flex min-h-12 items-center justify-center gap-2 rounded border px-3 text-xs font-semibold transition-colors ${category === value ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/10 bg-white/[0.03] text-white/70 hover:border-white/25 hover:text-white'}`}><Icon className="h-4 w-4 shrink-0" /><span>{label}</span></button>)}
          </div>

          <form onSubmit={handleSearchSubmit} className="mt-3 rounded-md border border-emerald-400/15 bg-[#05242c]/95 p-3 shadow-2xl">
            <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-[1.6fr_0.8fr_0.8fr]">
              <label className="flex min-h-12 items-center gap-2 rounded border border-white/10 bg-[#031b22] px-3"><Search className="h-4 w-4 text-emerald-400" /><input value={search} onChange={(event) => setSearch(event.target.value)} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="Search by property name, area or keyword..." /></label>
              <label className="flex min-h-12 items-center gap-2 rounded border border-white/10 bg-[#031b22] px-3"><MapPin className="h-4 w-4 text-white/50" /><input value={pendingFilters.state ?? ''} onChange={(event) => setPendingFilters((current) => ({ ...current, state: event.target.value || undefined }))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="State" /></label>
              <label className="flex min-h-12 items-center gap-2 rounded border border-white/10 bg-[#031b22] px-3"><MapPin className="h-4 w-4 text-white/50" /><input value={pendingFilters.area ?? ''} onChange={(event) => setPendingFilters((current) => ({ ...current, area: event.target.value || undefined }))} className="min-w-0 flex-1 bg-transparent text-sm text-white outline-none placeholder:text-white/35" placeholder="Area" /></label>
            </div>
            <div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
              <select aria-label="Unit type" value={pendingFilters.propertyType ?? ''} onChange={(event) => handleTypeChange(event.target.value)} className="min-h-12 rounded border border-white/10 bg-[#031b22] px-3 text-sm text-white outline-none"><option value="">Unit Type</option>{PROPERTY_TYPES.filter((item) => item.value).map((item) => <option key={item.value} value={item.value}>{item.label}</option>)}</select>
              <select aria-label="Price range" value={pendingFilters.maxRent ?? ''} onChange={(event) => setPendingFilters((current) => ({ ...current, maxRent: event.target.value ? Number(event.target.value) : undefined }))} className="min-h-12 rounded border border-white/10 bg-[#031b22] px-3 text-sm text-white outline-none"><option value="">Price Range</option><option value="500000">Up to ₦500k</option><option value="1000000">Up to ₦1m</option><option value="2000000">Up to ₦2m</option><option value="5000000">Up to ₦5m</option></select>
              <button type="button" disabled={!isAuthenticated} onClick={() => { setAccessFilter(accessFilter === 'unlocked' ? 'all' : 'unlocked'); setPage(1); }} className={`flex min-h-12 items-center justify-center gap-2 rounded border text-sm disabled:cursor-not-allowed disabled:opacity-50 ${accessFilter === 'unlocked' ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/10 bg-[#031b22] text-white/75'}`}><CalendarDays className="h-4 w-4" />{accessFilter === 'unlocked' ? 'My Unlocks' : 'Availability'}</button>
              <button type="button" role="switch" aria-checked={Boolean(pendingFilters.freeIntelligenceOnly)} onClick={() => setPendingFilters((current) => ({ ...current, freeIntelligenceOnly: current.freeIntelligenceOnly ? undefined : true }))} className={`flex min-h-12 items-center justify-center gap-2 rounded border text-sm ${pendingFilters.freeIntelligenceOnly ? 'border-emerald-400 bg-emerald-400/15 text-emerald-300' : 'border-white/10 bg-[#031b22] text-white/75'}`}><Gift className="h-4 w-4" />Free Unlock</button>
              <button type="submit" className="flex min-h-12 items-center justify-center gap-2 rounded bg-emerald-500 px-5 text-sm font-semibold text-[#02161c] hover:bg-emerald-400"><Search className="h-4 w-4" /> Search Properties <ArrowRight className="h-4 w-4" /></button>
            </div>
          </form>
        </div>
      </section>

      <section className="pb-16 pt-8"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><h2 className="font-display text-xl font-semibold">Showing <span className="text-emerald-400">{isLoading ? '...' : total}</span> verified {category === 'all' ? '' : categoryLabel} properties</h2><p className="mt-1 text-xs text-white/45">Clear previews before unlocking full property details.</p></div>{activeFilterCount > 0 && <button type="button" onClick={handleClearFilters} className="text-xs font-medium text-emerald-300">Clear active filters</button>}</div>
        {isLoading ? <div className="flex justify-center py-24"><LoadingSpinner size="lg" className="text-emerald-400" /></div> : properties.length === 0 ? <div className="rounded-md border border-white/10 bg-white/[0.03] py-20 text-center"><Search className="mx-auto h-9 w-9 text-white/25" /><h3 className="mt-4 font-display text-lg font-semibold">No matching properties</h3><p className="mt-2 text-sm text-white/45">Try another category, area, or price range.</p>{activeFilterCount > 0 && <button type="button" onClick={handleClearFilters} className="mt-5 rounded bg-emerald-500 px-4 py-2 text-xs font-semibold text-[#02161c]">Clear filters</button>}</div> : <><div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">{properties.map((property) => <PropertyCard key={property.id} property={property} detailHref={`/properties/${property.id}`} browseVariant />)}</div>{totalPages > 1 && <div className="mt-8 flex items-center justify-center gap-2"><button aria-label="Previous page" disabled={page === 1} onClick={() => setPage((value) => value - 1)} className="grid h-9 w-9 place-items-center rounded border border-white/15 disabled:opacity-30"><ChevronLeft className="h-4 w-4" /></button>{pageNumbers.map((value) => <button key={value} onClick={() => setPage(value)} className={`h-9 w-9 rounded text-sm ${value === page ? 'bg-emerald-500 font-semibold text-[#02161c]' : 'border border-white/15 text-white/70'}`}>{value}</button>)}<button aria-label="Next page" disabled={page === totalPages} onClick={() => setPage((value) => value + 1)} className="grid h-9 w-9 place-items-center rounded border border-white/15 disabled:opacity-30"><ChevronRight className="h-4 w-4" /></button></div>}</>}
        <div className="mt-10 grid gap-px overflow-hidden rounded-md border border-emerald-400/20 bg-emerald-400/20 md:grid-cols-3">{[{ icon: Search, title: 'Preview what is available', copy: 'See key details, photos and availability before you unlock.' }, { icon: Unlock, title: 'Unlock only when it is worth it', copy: 'Get complete details and contact information after unlock.' }, { icon: UserCheck, title: 'Make a smarter decision', copy: 'Compare properties and choose with confidence.' }].map(({ icon: Icon, title, copy }) => <div key={title} className="flex gap-4 bg-[#062129] p-5"><span className="grid h-11 w-11 shrink-0 place-items-center rounded bg-emerald-400/10 text-emerald-300"><Icon className="h-5 w-5" /></span><div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-1 text-xs leading-5 text-white/45">{copy}</p></div></div>)}</div>
      </div></section>
    </main>
  );
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
  const [category, setCategory] = useState<BrowseCategory>('all');

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const locationFilters: FilterPropertiesDto = {
      q: params.get('q') || undefined,
      state: params.get('state') || undefined,
      city: params.get('city') || undefined,
      area: params.get('area') || undefined,
      streetId: params.get('streetId') || undefined,
      propertyType: (params.get('propertyType') as PropertyType) || undefined,
    };
    if (!Object.values(locationFilters).some(Boolean)) return;
    setFilters(locationFilters);
    setPendingFilters(locationFilters);
    setSearch(locationFilters.q ?? '');
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
          // Active property unlocks (v1.6.2 §12): the unlock history carries a listing summary,
          // so the full public record is fetched for the cards that are shown.
          const history = await unlocksApi.my(1, 100);
          const activeProperties = history.data.filter(
            (item) => item.targetType === 'property' && item.isActive,
          );
          unlocked = new Set(activeProperties.map((item) => item.targetId));
          const loaded = await Promise.all(
            activeProperties.slice(0, 24).map((item) =>
              propertiesApi.getById(item.targetId).then((res) => res.data).catch(() => null),
            ),
          );
          unlockedProperties = loaded.filter((property): property is Property => property !== null);
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

  const handleCategoryChange = (next: BrowseCategory) => {
    setCategory(next);
    const type = next === 'short_let' ? PropertyType.SHORT_STAY
      : next === 'hostel' ? PropertyType.HOSTEL
      : next === 'shared' ? PropertyType.SHARED_APARTMENT
      : undefined;
    const nextFilters = { ...pendingFilters, propertyType: type };
    setPendingFilters(nextFilters);
    setFilters(nextFilters);
    setPage(1);
  };

  const activeFilterCount = Object.values(filters).filter(Boolean).length + (accessFilter === 'unlocked' ? 1 : 0);
  const pageNumbers = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => i + 1);

  return <BrowsePropertyExperience
    properties={properties}
    total={total}
    page={page}
    totalPages={totalPages}
    isLoading={isLoading}
    search={search}
    filters={filters}
    pendingFilters={pendingFilters}
    category={category}
    accessFilter={accessFilter}
    isAuthenticated={isAuthenticated}
    activeFilterCount={activeFilterCount}
    pageNumbers={pageNumbers}
    setSearch={setSearch}
    setPendingFilters={setPendingFilters}
    setAccessFilter={setAccessFilter}
    setPage={setPage}
    handleSearchSubmit={handleSearchSubmit}
    handleTypeChange={handleTypeChange}
    handleCategoryChange={handleCategoryChange}
    handleClearFilters={handleClearFilters}
  />;

}
