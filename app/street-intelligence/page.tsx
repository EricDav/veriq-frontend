'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, MapPin, Users, ShieldCheck } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { CommunityLocation, Street } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function StreetIntelligenceBrowser() {
  const router = useRouter();
  const [results, setResults] = useState<Street[]>([]);
  const [states, setStates] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [locations, setLocations] = useState<CommunityLocation[]>([]);
  const [state, setState] = useState('');
  const [city, setCity] = useState('');
  const [streetQuery, setStreetQuery] = useState('');
  const [selectedStreetId, setSelectedStreetId] = useState('');
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
    setCity(''); setStreetQuery(''); setSelectedStreetId(''); setCities([]); setResults([]); setHasSearched(false);
    if (!state) return;
    communityApi.streetLocations({ state }).then((res) => { setCities(res.data.cities); setLocations(res.data.locations); }).catch(() => { setCities([]); setLocations([]); });
  }, [state]);

  useEffect(() => {
    setStreetQuery(''); setSelectedStreetId(''); setResults([]); setHasSearched(false);
  }, [city, state]);

  useEffect(() => {
    if (!state || !city || streetQuery.trim().length < 2 || selectedStreetId) {
      if (!selectedStreetId) setResults([]);
      return;
    }
    const locationId = locations.find((item) => item.name === city)?.id;
    const timeout = window.setTimeout(() => {
      setIsSearching(true);
      communityApi.searchStreets({ state, city, q: streetQuery.trim(), locationId })
        .then((res) => setResults(res.data))
        .catch(() => setResults([]))
        .finally(() => {
          setHasSearched(true);
          setIsSearching(false);
        });
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [city, locations, selectedStreetId, state, streetQuery]);

  const openStreet = (event: React.FormEvent) => {
    event.preventDefault();
    if (selectedStreetId) router.push(`/street-intelligence/${encodeURIComponent(selectedStreetId)}`);
  };

  return (
    <div className="min-h-screen bg-veriq-surface pt-24">
      <main className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="mb-8 max-w-3xl">
          <span className="mb-3 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-700">
            <Users className="h-3.5 w-3.5" /> Community-powered
          </span>
          <h1 className="font-display text-3xl font-black text-navy-900 sm:text-4xl">Know Before You Go</h1>
          <p className="mt-3 text-sm leading-6 text-veriq-muted">
            Discover what a street is really like before you rent or buy. Explore Veriq Street Intelligence to make smarter property decisions.
          </p>
          <div className="mt-5 flex flex-wrap gap-3">
            <a href="#street-search" className="btn-primary">Search Street Intelligence</a>
            <Link href="/dashboard/community" className="btn-outline">Contribute Street Intelligence</Link>
          </div>
        </div>

        <form id="street-search" onSubmit={openStreet} className="mb-8 grid gap-3 rounded-lg border border-slate-200 bg-white p-4 sm:grid-cols-2 lg:grid-cols-[1fr_1fr_1.5fr_auto]">
          <select aria-label="State" value={state} onChange={(event) => setState(event.target.value)} className="input" required>
            <option value="">Select state</option>
            {states.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <select aria-label="LGA" value={city} onChange={(event) => setCity(event.target.value)} className="input" disabled={!state} required>
            <option value="">Select LGA</option>
            {cities.map((item) => <option key={item} value={item}>{item}</option>)}
          </select>
          <div className="relative">
            <input aria-label="Street name" className="input" value={streetQuery} onChange={(event) => { setStreetQuery(event.target.value); setSelectedStreetId(''); }} placeholder="Start typing a street name" autoComplete="off" disabled={!city} required />
            {streetQuery.trim().length >= 2 && !selectedStreetId && (
              <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                {results.map((street) => (
                  <button key={street.id} type="button" onClick={() => { setSelectedStreetId(street.id); setStreetQuery(street.streetName); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50">
                    <span className="block text-sm font-bold text-navy-900">{street.streetName}</span>
                    <span className="block text-xs text-veriq-muted">{street.area}</span>
                  </button>
                ))}
                {!isSearching && results.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No approved street matches this name.</p>}
              </div>
            )}
          </div>
          <button type="submit" className="btn-primary justify-center" disabled={isSearching || !selectedStreetId}>
            View intelligence
          </button>
        </form>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-900">
            {hasSearched ? `${results.length} streets available` : 'Choose a location'}
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
            <p className="mt-1 text-sm text-veriq-muted">Select a state and LGA, then start typing the street name.</p>
          </div>
        ) : results.length === 0 ? (
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
            {results.map((street) => (
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
      </main>
    </div>
  );
}

export default function StreetIntelligencePage() {
  return <StreetIntelligenceBrowser />;
}
