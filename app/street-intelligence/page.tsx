'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Search, Users, ShieldCheck, Navigation } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { CommunityArea, CommunityLocation, Street } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

function StreetIntelligenceBrowser() {
  const router = useRouter();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [results, setResults] = useState<Street[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [areas, setAreas] = useState<string[]>([]);
  const [locations, setLocations] = useState<CommunityLocation[]>([]);
  const [areaRecords, setAreaRecords] = useState<CommunityArea[]>([]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [area, setArea] = useState('');
  const [q, setQ] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [isLocating, setIsLocating] = useState(false);
  const [locationError, setLocationError] = useState('');

  useEffect(() => {
    communityApi.streetLocations()
      .then((res) => setStates(res.data.states))
      .catch(() => setStates([]))
      .finally(() => setIsLoading(false));
  }, []);

  useEffect(() => {
    setCity(''); setArea(''); setCities([]); setAreas([]); setResults([]); setHasSearched(false);
    if (!state) return;
    communityApi.streetLocations({ state }).then((res) => { setCities(res.data.cities); setLocations(res.data.locations); }).catch(() => { setCities([]); setLocations([]); });
  }, [state]);

  useEffect(() => {
    setArea(''); setAreas([]); setResults([]); setHasSearched(false);
    if (!state || !city) return;
    communityApi.streetLocations({ state, city }).then((res) => { setAreas(res.data.areas); setAreaRecords(res.data.areaRecords); }).catch(() => { setAreas([]); setAreaRecords([]); });
  }, [city, state]);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    if (authLoading) return;
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=%2Fstreet-intelligence');
      return;
    }
    setIsSearching(true);
    try {
      const res = await communityApi.searchStreets({
        q: q.trim() || undefined,
        state,
        city: city || undefined,
        area: area || undefined,
        locationId: locations.find((item) => item.name === city)?.id,
        areaId: areaRecords.find((item) => item.name === area)?.id,
      });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setHasSearched(true);
      setIsSearching(false);
    }
  };

  const useCurrentLocation = () => {
    if (authLoading) return;
    if (!authLoading && !isAuthenticated) {
      router.push('/auth/login?redirect=%2Fstreet-intelligence');
      return;
    }
    setLocationError('');
    if (!navigator.geolocation) { setLocationError('Current location is not supported by this device.'); return; }
    setIsLocating(true);
    navigator.geolocation.getCurrentPosition(async ({ coords }) => {
      try { const response = await communityApi.nearbyStreets(coords.latitude, coords.longitude); setResults(response.data); setHasSearched(true); }
      catch (error) { setLocationError(error instanceof Error ? error.message : 'Unable to suggest nearby streets.'); }
      finally { setIsLocating(false); }
    }, () => { setLocationError('Location permission was denied or unavailable.'); setIsLocating(false); }, { enableHighAccuracy: true, timeout: 10_000 });
  };

  return (
    <div className="min-h-screen bg-veriq-surface pt-24">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Users className="h-3.5 w-3.5" /> Community-powered
          </span>
          <h1 className="font-display text-3xl font-black text-navy-900 sm:text-4xl">Street Intelligence</h1>
          <p className="mt-3 text-sm leading-6 text-veriq-muted">
            Explore community-powered intelligence about streets before deciding where to live.
            Results are based on reports from verified Community Contributors and are not independently verified by Veriq Property.
          </p>
        </div>

        <form onSubmit={search} className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1fr_1.2fr_auto]">
          <select aria-label="State" value={state} onChange={(event) => setState(event.target.value)} className="input" required>
            <option value="">Select state</option>
            {states.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Location" value={city} onChange={(event) => setCity(event.target.value)} className="input" disabled={!state} required>
            <option value="">Select location</option>
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="Area" value={area} onChange={(event) => setArea(event.target.value)} className="input" disabled={!city}>
            <option value="">All areas</option>
            {areas.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="input pl-9"
              placeholder="Street name (optional)"
              disabled={!city}
            />
          </label>
          <button type="submit" className="btn-primary justify-center" disabled={authLoading || isSearching || !state || !city}>
            {isSearching ? <LoadingSpinner size="sm" /> : 'Search'}
          </button>
        </form>
        <div className="-mt-5 mb-8 flex flex-wrap items-center gap-3">
          <button type="button" onClick={useCurrentLocation} disabled={authLoading || isLocating} className="btn-outline !py-2 !text-xs"><Navigation className="h-3.5 w-3.5" /> {isLocating ? 'Finding nearby streets...' : 'Use My Current Location'}</button>
          {locationError && <p className="text-xs text-rose-600">{locationError}</p>}
        </div>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-900">
            {hasSearched ? 'Search results' : 'Choose a location'}
          </h2>
          <Link href="/dashboard/community" className="text-xs font-bold text-veriq-secondary hover:underline">
            Contribute intelligence
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : !hasSearched ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-navy-900">Start with a state</p>
            <p className="mt-1 text-sm text-veriq-muted">Select Rivers State and a supported location before searching for a street.</p>
          </div>
        ) : results.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-navy-900">No streets found yet</p>
            <p className="mt-1 text-sm text-veriq-muted">Become a Community Contributor by adding intelligence for a street you know well.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.map((street) => (
              <Link key={street.id} href={`/street-intelligence/${street.id}`} className="card group p-5">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <MapPin className="h-5 w-5" />
                </div>
                <p className="font-display text-base font-bold text-navy-900 group-hover:text-veriq-secondary">
                  {street.streetName}
                </p>
                <p className="mt-1 text-xs text-veriq-muted">{street.area}, {street.city}, {street.state}</p>
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
      </main>
    </div>
  );
}

export default function StreetIntelligencePage() {
  return <StreetIntelligenceBrowser />;
}
