'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Award, BadgeCheck, Briefcase, CalendarDays, Home, Landmark, MapPin, ShieldCheck, Users } from 'lucide-react';
import { ApiError } from '@/lib/api';
import type { ApiResponse } from '@/types';
import type { PortfolioItem, PublicAgentProfile as AgentProfile } from '@/types/renter';
import { cn } from '@/lib/utils';
import { BackLink, Badge, Button, Eyebrow, Notice, PageHead, Panel } from '@/components/ui';
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
      <div className="mx-auto max-w-[1280px] px-4 py-24 text-center wide:px-10">
        <ShieldCheck aria-hidden="true" className="mx-auto mb-4 h-14 w-14 text-muted-foreground" />
        <h1 className="mb-2 font-display text-[1.7rem] font-semibold tracking-[-0.035em] text-foreground">
          Veriq Agent not found
        </h1>
        <p className="mb-6 text-muted-foreground">
          This profile does not exist or the Veriq Agent is no longer active.
        </p>
        <Button asChild>
          <Link href="/properties">Browse properties</Link>
        </Button>
      </div>
    );
  }

  if (!agent) {
    return (
      <div className="mx-auto max-w-lg px-4 py-24 wide:px-10">
        <ApiErrorNotice error={error} fallback="This profile could not be loaded." onRetry={fetchProfile} />
      </div>
    );
  }

  const name = agent.user ? `${agent.user.firstName} ${agent.user.lastName}`.trim() : agent.businessName ?? 'Veriq Agent';
  const initial = name[0]?.toUpperCase() ?? 'V';
  const areas = Array.from(new Set([...(agent.operatingLocations ?? []), agent.stateOfOperation].filter((value): value is string => !!value)));
  const tenure = tenureLabel(agent.memberSince);
  const visible: PortfolioItem[] = filter === 'all' ? agent.portfolio : agent.portfolio.filter((item) => item.targetType === filter);

  return (
    <div className="mx-auto max-w-[1280px] px-4 py-12 wide:px-10 wide:py-[50px]">
      <BackLink href="/properties">Back to properties</BackLink>

      <div className="mb-7 flex flex-wrap items-start gap-5">
        <span className="grid h-20 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-searchbar border border-[#10b98125] bg-[#10b98114]">
          {agent.profilePhotoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={mediaSrc(agent.profilePhotoUrl)} alt={name} className="h-full w-full object-cover" />
          ) : (
            <span aria-hidden="true" className="font-display text-2xl font-semibold text-primary">
              {initial}
            </span>
          )}
        </span>
        <div className="min-w-0 flex-1">
          <PageHead
            className="mb-0"
            eyebrow="Veriq Agent"
            title={name}
            lead={agent.businessName && agent.user ? agent.businessName : undefined}
            actions={
              <Badge>
                <BadgeCheck aria-hidden="true" className="h-3.5 w-3.5" /> {agent.badge}
              </Badge>
            }
          />
          <div className="mt-3 flex flex-wrap items-center gap-4 text-ui-sm text-muted-foreground">
            {areas.length > 0 && (
              <span className="flex items-center gap-1.5">
                <MapPin aria-hidden="true" className="h-3.5 w-3.5" /> {areas.join(' · ')}
              </span>
            )}
            {tenure && (
              <span className="flex items-center gap-1.5">
                <CalendarDays aria-hidden="true" className="h-3.5 w-3.5" /> {tenure}
              </span>
            )}
            {agent.yearsOfExperience ? (
              <span className="flex items-center gap-1.5">
                <Briefcase aria-hidden="true" className="h-3.5 w-3.5" /> {agent.yearsOfExperience}+ years in property
              </span>
            ) : null}
            <span className="flex items-center gap-1.5">
              <Home aria-hidden="true" className="h-3.5 w-3.5" /> {counts.all} listing{counts.all === 1 ? '' : 's'} managed
            </span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 wide:grid-cols-3">
        <aside className="space-y-5">
          {agent.bio && (
            <Panel>
              <h2 className="mb-3 font-display text-base font-semibold text-foreground">About</h2>
              <p className="whitespace-pre-line text-ui-md leading-6 text-muted-foreground">{agent.bio}</p>
            </Panel>
          )}
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
              <ShieldCheck aria-hidden="true" className="h-4 w-4 text-primary" /> What a Veriq Agent does
            </h2>
            <p className="text-ui-md leading-6 text-muted-foreground">
              Veriq Agents verify property authority, exact location, facts, photos and intelligence before a listing is
              published, and support renters on WhatsApp after an unlock. They do not charge agency or inspection fees
              through Veriq.
            </p>
            <p className="mt-3 text-ui-sm text-muted-foreground">Member since {formatDate(agent.memberSince)}</p>
          </Panel>
          {agent.specializations.length > 0 && (
            <Panel>
              <h2 className="mb-3 flex items-center gap-2 font-display text-base font-semibold text-foreground">
                <Award aria-hidden="true" className="h-4 w-4 text-primary" /> Focus
              </h2>
              <div className="flex flex-wrap gap-2">
                {agent.specializations.map((item) => (
                  <Badge key={item} tone="neutral">
                    {item}
                  </Badge>
                ))}
              </div>
            </Panel>
          )}
          <Notice tone="amber">
            Contact actions for a listing and its assigned Veriq Agent are available only inside an active unlock of
            that listing.
          </Notice>
        </aside>

        <section className="wide:col-span-2">
          <div className="mb-5 flex flex-col gap-3 wide:flex-row wide:items-center wide:justify-between">
            <div>
              <Eyebrow>Managed by this agent</Eyebrow>
              <h2 className="font-display text-base font-semibold text-foreground">Current portfolio</h2>
            </div>
            <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
              {FILTERS.filter((item) => item.value === 'all' || counts[item.value] > 0).map(({ value, label, icon: Icon }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setFilter(value)}
                  aria-pressed={filter === value}
                  className={cn(
                    'inline-flex flex-shrink-0 items-center gap-1.5 rounded-lg border px-4 py-2.5 text-ui-sm transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    filter === value
                      ? 'border-primary bg-[#10b98112] text-[#6ee7b7]'
                      : 'border-[#ffffff18] bg-card text-muted-foreground hover:border-[#10b98170]',
                  )}
                >
                  <Icon aria-hidden="true" className="h-3.5 w-3.5" /> {label} ({counts[value]})
                </button>
              ))}
            </div>
          </div>
          {visible.length === 0 ? (
            <Panel className="flex flex-col items-center py-16 text-center">
              <Home aria-hidden="true" className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="mb-1 font-display text-base font-semibold text-foreground">No published listings right now</h3>
              <p className="max-w-xs text-ui-md text-muted-foreground">
                This Veriq Agent is not managing any public listings at the moment. Check back soon.
              </p>
            </Panel>
          ) : (
            <div className="grid grid-cols-1 gap-6 wide:grid-cols-2">
              {visible.map((item) => (
                <PortfolioCard key={`${item.targetType}-${item.id}`} item={item} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
