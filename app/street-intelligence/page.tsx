'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Bath, BedDouble, Camera, ChevronLeft, ChevronRight, CircleHelp, MapPin, Route, Search, ShieldCheck, Signal, Sofa, Users } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { CommunityLocation, Street } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

const propertyInspectionHighlights = [
  { label: 'Photos', icon: Camera },
  { label: 'Interior', icon: Sofa },
  { label: 'Bedrooms', icon: BedDouble },
  { label: 'Bathrooms', icon: Bath },
  { label: 'Access road', icon: Route },
];

const intelligenceSteps = [
  { title: 'Search Location', copy: 'Find the street or neighbourhood you are interested in.', icon: Search },
  { title: 'View Intelligence', copy: 'See structured insight from people who know the area.', icon: Signal },
  { title: 'Community Contributes', copy: 'Verified contributors share local, practical knowledge.', icon: Users },
  { title: 'Intelligence Gets Stronger', copy: 'More verified input improves confidence over time.', icon: ShieldCheck },
];

function PropertyIntelligenceBridge() {
  return (
    <section aria-labelledby="property-intelligence-heading" className="mt-16 border-t border-slate-200 py-12 sm:py-16">
      <div className="grid items-center gap-8 lg:grid-cols-[0.8fr_1.2fr] lg:gap-12">
        <div className="max-w-xl">
          <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            Property Intelligence
          </span>
          <h2 id="property-intelligence-heading" className="mt-4 font-display text-2xl font-black text-navy-900 sm:text-3xl">
            Need intelligence on a <span className="text-veriq-secondary">specific property?</span>
          </h2>
          <p className="mt-4 text-sm leading-6 text-veriq-muted">
            Our Property Intelligence reports reveal what photos cannot. Every report is prepared by verified agents who have inspected or verified the property.
          </p>
          <Link href="/properties" className="btn-primary mt-6 inline-flex items-center gap-2">
            Explore Property Intelligence <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        <div className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
          <div className="relative aspect-[16/8.5] min-h-56">
            <Image
              src="/images/property-intelligence-home.png"
              alt="Verified modern residential property available for inspection"
              fill
              sizes="(max-width: 1024px) 100vw, 58vw"
              className="object-cover"
            />
            <span className="absolute left-4 top-4 inline-flex items-center gap-1.5 rounded-md bg-white px-3 py-2 text-xs font-bold text-navy-900 shadow-sm">
              <ShieldCheck className="h-4 w-4 text-veriq-secondary" /> Verified by Veriq Agent
            </span>
          </div>
          <div className="grid grid-cols-5 border-y border-slate-200 bg-white">
            {propertyInspectionHighlights.map(({ label, icon: Icon }) => (
              <div key={label} className="flex min-w-0 flex-col items-center gap-1 border-r border-slate-100 px-1 py-3 text-center last:border-r-0 sm:px-2">
                <Icon className="h-4 w-4 text-veriq-secondary sm:h-5 sm:w-5" />
                <span className="text-[10px] font-semibold leading-tight text-slate-600 sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
          <div className="flex items-center justify-between gap-4 p-4 sm:p-5">
            <div>
              <p className="text-sm font-bold text-navy-900">Real property. Real inspections. Real insights.</p>
              <p className="mt-1 text-xs leading-5 text-veriq-muted">Photos, condition, amenities, access road and more from trusted, verified agents.</p>
            </div>
            <Link href="/properties" aria-label="Browse Property Intelligence" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-veriq-secondary text-white transition hover:bg-emerald-700">
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}

function StreetIntelligenceBrowser() {
  const router = useRouter();
  const [streets, setStreets] = useState<Street[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [locations, setLocations] = useState<CommunityLocation[]>([]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [streetQuery, setStreetQuery] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');
  const [selectedStreetId, setSelectedStreetId] = useState('');
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    communityApi.streetLocations()
      .then((res) => setStates(res.data.states))
      .catch(() => setStates([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setCity(''); setStreetQuery(''); setDebouncedQuery(''); setSelectedStreetId(''); setCities([]); setStreets([]); setHasSearched(false); setPage(1); setTotal(0); setTotalPages(0);
    if (!state) return;
    communityApi.streetLocations({ state }).then((res) => { setCities(res.data.cities); setLocations(res.data.locations); }).catch(() => { setCities([]); setLocations([]); });
  }, [state]);

  useEffect(() => {
    setStreetQuery(''); setDebouncedQuery(''); setSelectedStreetId(''); setStreets([]); setHasSearched(false); setPage(1); setTotal(0); setTotalPages(0);
  }, [city, state]);

  useEffect(() => {
    if (selectedStreetId) return;
    const timeout = window.setTimeout(() => {
      setDebouncedQuery(streetQuery.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [selectedStreetId, streetQuery]);

  useEffect(() => {
    if (!state || !city) return;
    const locationId = locations.find((item) => item.name === city)?.id;
    if (!locationId) return;
    let active = true;
    setIsSearching(true);
    communityApi.searchStreets({ state, city, locationId, q: debouncedQuery || undefined, page })
      .then((res) => {
        if (!active) return;
        setStreets(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.pages);
      })
      .catch(() => {
        if (!active) return;
        setStreets([]);
        setTotal(0);
        setTotalPages(0);
      })
      .finally(() => {
        if (active) {
          setHasSearched(true);
          setIsSearching(false);
        }
      });
    return () => { active = false; };
  }, [city, debouncedQuery, locations, page, state]);

  const openStreet = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedStreetId) router.push(`/street-intelligence/${encodeURIComponent(selectedStreetId)}`);
  };

  return (
    <div className="min-h-screen bg-white pt-24">
      <main className="mx-auto max-w-6xl px-4 pb-10 pt-12 sm:px-6 sm:pt-16 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Users className="h-3.5 w-3.5" /> Street Intelligence
          </span>
          <h1 className="font-display max-w-2xl text-4xl font-black leading-tight text-navy-900 sm:text-5xl">
            Know the street before<br className="hidden sm:block" /> you choose the house.
          </h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-veriq-muted sm:text-base">
            Discover what everyday life is really like before you rent or buy. Get insight on roads, flooding, electricity, network, noise, security, neighbourhood feel and more.
          </p>
        </div>

        <div className="mb-10 rounded-lg border border-slate-200 bg-white p-4 shadow-[0_12px_40px_rgba(15,23,42,0.08)] sm:p-5">
          <form id="street-search" onSubmit={openStreet} className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.45fr_auto] lg:items-end">
          <label className="block text-xs font-bold text-navy-900">Select State
            <select aria-label="State" value={state} onChange={(event) => setState(event.target.value)} className="input mt-2" required>
              <option value="">Choose state</option>
              {states.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-navy-900">Select Location / LGA
            <select aria-label="LGA" value={city} onChange={(event) => setCity(event.target.value)} className="input mt-2" disabled={!state} required>
              <option value="">Choose LGA</option>
              {cities.map((item) => <option key={item} value={item}>{item}</option>)}
            </select>
          </label>
          <label className="block text-xs font-bold text-navy-900">Search street, estate or road
          <div className="relative mt-2">
            <input aria-label="Street name" className="input" value={streetQuery} onChange={(event) => { setStreetQuery(event.target.value); setSelectedStreetId(''); }} placeholder="E.g. Woji Road, Rumuola" autoComplete="off" disabled={!city} required />
            {streetQuery.trim().length > 0 && !selectedStreetId && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {streets.map((street) => (
                  <button key={street.id} type="button" onClick={() => { setSelectedStreetId(street.id); setStreetQuery(street.streetName); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50">
                    <span className="block text-sm font-bold text-navy-900">{street.streetName}</span>
                    <span className="block text-xs text-veriq-muted">{street.area}</span>
                  </button>
                ))}
                {!isSearching && streets.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No approved street matches this name.</p>}
              </div>
            )}
          </div>
          </label>
          <button type="submit" className="btn-primary justify-center" disabled={isSearching || !selectedStreetId}>
            View intelligence
          </button>
          </form>
          <div className="mt-5 grid gap-3 border-t border-slate-100 pt-4 text-xs sm:grid-cols-2 sm:text-center">
            <Link href={`/dashboard/community?mode=new&state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`} className="font-semibold text-slate-600 hover:text-veriq-secondary">
              <CircleHelp className="mr-1.5 inline h-4 w-4" /> Can&apos;t find your location? <span className="font-bold text-veriq-secondary">Suggest it</span>
            </Link>
            <Link href="/dashboard/community" className="font-semibold text-slate-600 hover:text-veriq-secondary">
              <Users className="mr-1.5 inline h-4 w-4" /> Know this location well? <span className="font-bold text-veriq-secondary">Contribute Street Intelligence</span>
            </Link>
          </div>
        </div>
        {hasSearched && (
          <div className="mb-4 flex items-center justify-between">
            <h2 className="font-display text-lg font-bold text-navy-900">{total} {total === 1 ? 'street' : 'streets'} available</h2>
            <Link href="/dashboard/community" className="text-xs font-bold text-veriq-secondary hover:underline">
              Contribute intelligence
            </Link>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : !hasSearched ? null : streets.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-navy-900">No addressable locations found yet</p>
            <p className="mt-1 text-sm text-veriq-muted">Become a Community Contributor by adding intelligence for a location you know well.</p>
            <Link
              href={`/dashboard/community?mode=new&state=${encodeURIComponent(state)}&city=${encodeURIComponent(city)}`}
              className="btn-primary mt-5 inline-flex"
            >
              I can&apos;t see my street
            </Link>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {streets.map((street) => (
              <Link key={street.id} href={`/street-intelligence/${encodeURIComponent(street.id)}`} className="card group min-w-0 p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="font-display text-base font-bold text-navy-900 group-hover:text-veriq-secondary">
                  {street.streetName}
                </p>
                <p className="mt-1 text-xs text-veriq-muted">{street.area}</p>
                <div className="mt-4 flex items-center justify-between text-xs">
                  <span className="inline-flex items-center gap-1 rounded-full bg-slate-100 px-2 py-1 font-semibold capitalize text-slate-600">
                    <ShieldCheck className="h-3 w-3" /> {street.status}
                  </span>
                  <span className="inline-flex items-center gap-1 font-bold text-veriq-secondary">
                    View <ArrowRight className="h-3 w-3" />
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}

        {hasSearched && totalPages > 1 && (
          <nav aria-label="Street results pages" className="mt-8 flex items-center justify-center gap-3">
            <button type="button" aria-label="Previous page" disabled={page === 1 || isSearching} onClick={() => setPage((current) => Math.max(1, current - 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span className="text-sm font-medium text-slate-600">Page {page} of {totalPages}</span>
            <button type="button" aria-label="Next page" disabled={page >= totalPages || isSearching} onClick={() => setPage((current) => Math.min(totalPages, current + 1))} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-navy-700 hover:border-veriq-secondary disabled:cursor-not-allowed disabled:opacity-40">
              <ChevronRight className="h-4 w-4" />
            </button>
          </nav>
        )}

        <section aria-labelledby="how-it-works" className="py-14 text-center sm:py-16">
          <h2 id="how-it-works" className="font-display text-2xl font-black text-navy-900">How Street Intelligence Works</h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {intelligenceSteps.map(({ title, copy, icon: Icon }, index) => (
              <div key={title} className="relative px-4">
                <span className="absolute left-3 top-0 text-xs font-black text-veriq-secondary">{index + 1}</span>
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-veriq-secondary"><Icon className="h-6 w-6" /></div>
                <h3 className="mt-4 text-sm font-black text-navy-900">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-veriq-muted">{copy}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="grid items-center gap-6 rounded-lg border border-slate-200 bg-slate-50 px-6 py-8 sm:px-10 lg:grid-cols-[1fr_auto]">
          <div>
            <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-veriq-secondary"><ShieldCheck className="h-5 w-5" /></span>
            <h2 className="mt-3 font-display text-2xl font-black text-navy-900">Know your street well? <span className="text-veriq-secondary">Help improve local intelligence.</span></h2>
            <p className="mt-2 max-w-2xl text-sm leading-6 text-veriq-muted">Verified people familiar with a location can contribute structured insights that help others make smarter property decisions.</p>
          </div>
          <Link href="/dashboard/community" className="btn-primary inline-flex justify-center">Contribute Street Intelligence</Link>
        </section>

        <PropertyIntelligenceBridge />
      </main>
    </div>
  );
}

export default function StreetIntelligencePage() {
  return <StreetIntelligenceBrowser />;
}
