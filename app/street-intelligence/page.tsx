'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, MapPin, Search, Users, ShieldCheck } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { Street } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { CommunityMembershipGate } from '@/components/community/CommunityMembershipGate';

function StreetIntelligenceBrowser() {
  const [popular, setPopular] = useState<Street[]>([]);
  const [results, setResults] = useState<Street[]>([]);
  const [q, setQ] = useState('');
  const [location, setLocation] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    communityApi
      .popularStreets()
      .then((res) => setPopular(res.data))
      .catch(() => setPopular([]))
      .finally(() => setIsLoading(false));
  }, []);

  const search = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSearching(true);
    try {
      const res = await communityApi.searchStreets({
        q: q.trim() || undefined,
        area: location.trim() || undefined,
      });
      setResults(res.data);
    } catch {
      setResults([]);
    } finally {
      setIsSearching(false);
    }
  };

  const visible = results.length > 0 ? results : popular;

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

        <form onSubmit={search} className="mb-8 grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:grid-cols-[1fr_220px_auto]">
          <label className="relative block">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              value={q}
              onChange={(event) => setQ(event.target.value)}
              className="input pl-9"
              placeholder="Search for a street"
            />
          </label>
          <input
            value={location}
            onChange={(event) => setLocation(event.target.value)}
            className="input"
            placeholder="Area or neighbourhood"
          />
          <button type="submit" className="btn-primary justify-center" disabled={isSearching}>
            {isSearching ? <LoadingSpinner size="sm" /> : 'Search'}
          </button>
        </form>

        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-display text-lg font-bold text-navy-900">
            {results.length > 0 ? 'Search results' : 'Popular streets'}
          </h2>
          <Link href="/dashboard/community" className="text-xs font-bold text-veriq-secondary hover:underline">
            Contribute intelligence
          </Link>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : visible.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
            <MapPin className="mx-auto mb-3 h-10 w-10 text-slate-300" />
            <p className="font-bold text-navy-900">No streets found yet</p>
            <p className="mt-1 text-sm text-veriq-muted">Become a Community Contributor by adding intelligence for a street you know well.</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {visible.map((street) => (
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
  return <CommunityMembershipGate><StreetIntelligenceBrowser /></CommunityMembershipGate>;
}
