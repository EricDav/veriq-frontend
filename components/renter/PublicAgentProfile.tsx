'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Award, BadgeCheck, Briefcase, CalendarDays, Home, Landmark, MapPin, ShieldCheck, Users } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type { ApiResponse } from '@/types';
import type { PortfolioItem, PublicAgentProfile as AgentProfile } from '@/types/renter';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from './ApiErrorNotice';
import { PortfolioCard } from './ListingCard';
import { formatDate, mediaSrc } from './format';

type PortfolioFilter = 'all' | 'property' | 'shared_opportunity' | 'sale_listing';

const FILTERS: Array<{ value: PortfolioFilter; label: string; icon: typeof Home }> = [
  { value: 'all', label: 'All', icon: Home },
  { value: 'property', label: 'Properties', icon: Home },
  { value: 'shared_opportunity', label: 'Shared Property', icon: Users },
  { value: 'sale_listing', label: 'For Sale', icon: Landmark },
];

function tenureLabel(memberSince: string) {
  const start = new Date(memberSince);
  if (Number.isNaN(start.getTime())) return null;
  const months = (new Date().getFullYear() - start.getFullYear()) * 12 + (new Date().getMonth() - start.getMonth());
  if (months < 1) return 'Joined Veriq this month';
  if (months < 12) return `${months} month${months === 1 ? '' : 's'} with Veriq`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? '' : 's'} with Veriq`;
}

/**
 * Public Veriq Agent profile (§16.1, AC 21): name, image, Veriq Agent badge, general operating area, tenure and the
 * current managed portfolio. Internal quality metrics, ratings, documents, bank and contact details are never shown.
 */
export function PublicAgentProfile({ load }: { load: () => Promise<ApiResponse<AgentProfile>> }) {
  const [agent, setAgent] = useState<AgentProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [filter, setFilter] = useState<PortfolioFilter>('all');

  const fetchProfile = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await load();
      setAgent(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [load]);

  useEffect(() => {
    void fetchProfile();
  }, [fetchProfile]);

  const counts = useMemo(() => {
    const portfolio = agent?.portfolio ?? [];
    return {
      all: portfolio.length,
      property: portfolio.filter((item) => item.targetType === 'property').length,
      shared_opportunity: portfolio.filter((item) => item.targetType === 'shared_opportunity').length,
      sale_listing: portfolio.filter((item) => item.targetType === 'sale_listing').length,
    } satisfies Record<PortfolioFilter, number>;
  }, [agent]);

  if (loading) return <PageLoader />;

  if (notFound || (!agent && !error)) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="text-center">
          <ShieldCheck className="mx-auto mb-4 h-14 w-14 text-slate-200" />
          <h1 className="mb-2 font-display text-2xl font-bold text-navy-900">Veriq Agent not found</h1>
          <p className="mb-6 text-slate-500">This profile does not exist or the Veriq Agent is no longer active.</p>
          <Link href="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="w-full max-w-md">
          <ApiErrorNotice error={error} fallback="This profile could not be loaded." onRetry={fetchProfile} />
        </div>
      </div>
    );
  }

  const name = agent.user ? `${agent.user.firstName} ${agent.user.lastName}`.trim() : agent.businessName ?? 'Veriq Agent';
  const initial = name[0]?.toUpperCase() ?? 'V';
  const areas = Array.from(new Set([...(agent.operatingLocations ?? []), agent.stateOfOperation].filter((value): value is string => !!value)));
  const tenure = tenureLabel(agent.memberSince);
  const visible: PortfolioItem[] = filter === 'all' ? agent.portfolio : agent.portfolio.filter((item) => item.targetType === filter);

  return (
    <div className="min-h-screen bg-veriq-surface">
      <div className="bg-hero-pattern px-4 pb-12 pt-24">
        <div className="mx-auto max-w-5xl">
          <Link href="/properties" className="mb-6 inline-flex items-center gap-2 text-sm text-white/60 transition-colors hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Back to Properties
          </Link>
          <div className="flex flex-wrap items-start gap-5">
            <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border-2 border-white/20 bg-veriq-secondary">
              {agent.profilePhotoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(agent.profilePhotoUrl)} alt={name} className="h-full w-full object-cover" />
              ) : (
                <span className="text-2xl font-bold text-white">{initial}</span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <div className="mb-2 flex flex-wrap items-center gap-3">
                <h1 className="font-display text-2xl font-bold text-white">{name}</h1>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-400/30 bg-emerald-500/20 px-3 py-1 text-xs font-semibold text-emerald-300">
                  <BadgeCheck className="h-3.5 w-3.5" /> {agent.badge}
                </span>
              </div>
              {agent.businessName && agent.user && <p className="mb-2 text-sm text-white/60">{agent.businessName}</p>}
              <div className="flex flex-wrap items-center gap-4 text-xs text-white/55">
                {areas.length > 0 && <span className="flex items-center gap-1"><MapPin className="h-3.5 w-3.5" /> {areas.join(' · ')}</span>}
                {tenure && <span className="flex items-center gap-1"><CalendarDays className="h-3.5 w-3.5" /> {tenure}</span>}
                {agent.yearsOfExperience ? <span className="flex items-center gap-1"><Briefcase className="h-3.5 w-3.5" /> {agent.yearsOfExperience}+ years in property</span> : null}
                <span className="flex items-center gap-1"><Home className="h-3.5 w-3.5" /> {counts.all} listing{counts.all === 1 ? '' : 's'} managed</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          <aside className="space-y-5">
            {agent.bio && (
              <div className="card p-5">
                <h2 className="mb-3 font-display text-sm font-bold text-navy-900">About</h2>
                <p className="whitespace-pre-line text-sm leading-relaxed text-slate-600">{agent.bio}</p>
              </div>
            )}
            <div className="card p-5">
              <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-veriq-secondary" /> What a Veriq Agent does</h2>
              <p className="text-sm leading-6 text-slate-600">
                Veriq Agents verify property authority, exact location, facts, photos and intelligence before a listing is published, and
                support renters on WhatsApp after an unlock. They do not charge agency or inspection fees through Veriq.
              </p>
              <p className="mt-3 text-xs text-slate-500">Member since {formatDate(agent.memberSince)}</p>
            </div>
            {agent.specializations.length > 0 && (
              <div className="card p-5">
                <h2 className="mb-3 flex items-center gap-2 font-display text-sm font-bold text-navy-900"><Award className="h-4 w-4 text-veriq-secondary" /> Focus</h2>
                <div className="flex flex-wrap gap-2">
                  {agent.specializations.map((item) => (
                    <span key={item} className="rounded-full border border-slate-200 bg-veriq-surface px-3 py-1.5 text-xs font-medium text-navy-700">{item}</span>
                  ))}
                </div>
              </div>
            )}
            <p className="rounded-xl border border-amber-100 bg-amber-50 p-4 text-[11px] leading-relaxed text-amber-700">
              Contact actions for a listing and its assigned Veriq Agent are available only inside an active unlock of that listing.
            </p>
          </aside>

          <section className="lg:col-span-2">
            <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-base font-bold text-navy-900">Current portfolio</h2>
              <div className="flex gap-2 overflow-x-auto pb-1">
                {FILTERS.filter((item) => item.value === 'all' || counts[item.value] > 0).map(({ value, label, icon: Icon }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setFilter(value)}
                    className={`inline-flex flex-shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition-colors ${filter === value ? 'bg-navy-900 text-white' : 'bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50'}`}
                  >
                    <Icon className="h-3.5 w-3.5" /> {label} ({counts[value]})
                  </button>
                ))}
              </div>
            </div>
            {visible.length === 0 ? (
              <div className="flex flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white py-20 text-center">
                <Home className="mb-4 h-12 w-12 text-slate-200" />
                <h3 className="mb-1 font-display text-base font-bold text-navy-900">No published listings right now</h3>
                <p className="max-w-xs text-sm text-slate-400">This Veriq Agent is not managing any public listings at the moment. Check back soon.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
                {visible.map((item) => <PortfolioCard key={`${item.targetType}-${item.id}`} item={item} />)}
              </div>
            )}
          </section>
        </div>
      </div>
    </div>
  );
}
