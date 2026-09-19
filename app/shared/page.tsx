'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, Filter, Lock, MapPin, RotateCcw, ShieldCheck, Users } from 'lucide-react';
import { sharedPropertiesApi } from '@/lib/api/renter';
import type { SharedListingPublic, SharedListQuery, SharedOpportunityType } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { DiscoveryHero } from '@/components/renter/DiscoveryHero';
import { SharedListingCard } from '@/components/renter/ListingCard';
import { useFormSchema } from '@/components/renter/SchemaAnswers';

const PAGE_SIZE = 12;

const TYPE_OPTIONS: Array<{ value: SharedOpportunityType; label: string }> = [
  { value: 'private_room', label: 'Private room in an occupied home' },
  { value: 'shared_room_bedspace', label: 'Shared room / bedspace' },
];

const FURNISHING_OPTIONS = [
  { value: 'unfurnished', label: 'Unfurnished' },
  { value: 'semi_furnished', label: 'Semi-furnished' },
  { value: 'fully_furnished', label: 'Fully furnished' },
];

const BATHROOM_OPTIONS = [
  { value: 'private_to_incoming_resident', label: 'Private to incoming resident' },
  { value: 'shared_with_1_person', label: 'Shared with 1 person' },
  { value: 'shared_with_2_3_people', label: 'Shared with 2–3 people' },
  { value: 'shared_with_4_or_more_people', label: 'Shared with 4 or more people' },
];

interface FilterState {
  opportunityType: string;
  city: string;
  area: string;
  minPrice: string;
  maxPrice: string;
  furnishing: string;
  bathroomSharing: string;
}

const EMPTY: FilterState = { opportunityType: '', city: '', area: '', minPrice: '', maxPrice: '', furnishing: '', bathroomSharing: '' };

function readFilters(params: URLSearchParams): FilterState {
  return {
    opportunityType: params.get('opportunityType') ?? '',
    city: params.get('city') ?? '',
    area: params.get('area') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    furnishing: params.get('furnishing') ?? '',
    bathroomSharing: params.get('bathroomSharing') ?? '',
  };
}

function toQuery(filters: FilterState, page: number): SharedListQuery {
  const num = (value: string) => (value.trim() && Number.isFinite(Number(value)) ? Number(value) : '');
  return {
    opportunityType: TYPE_OPTIONS.some((option) => option.value === filters.opportunityType) ? (filters.opportunityType as SharedOpportunityType) : '',
    city: filters.city.trim(),
    area: filters.area.trim(),
    minPrice: num(filters.minPrice),
    maxPrice: num(filters.maxPrice),
    furnishing: filters.furnishing,
    bathroomSharing: filters.bathroomSharing,
    page,
    limit: PAGE_SIZE,
  };
}

function SharedDiscovery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [draft, setDraft] = useState<FilterState>(() => readFilters(new URLSearchParams(paramsKey)));
  const [listings, setListings] = useState<SharedListingPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const privateRoomSchema = useFormSchema('shared_property.opportunity.private_room');
  const bedspaceSchema = useFormSchema('shared_property.opportunity.shared_room_bedspace');

  const load = useCallback(async () => {
    const current = new URLSearchParams(paramsKey);
    setLoading(true);
    setError(null);
    try {
      const res = await sharedPropertiesApi.list(toQuery(readFilters(current), Math.max(1, Number(current.get('page')) || 1)));
      setListings(res.data);
      setTotal(res.meta?.total ?? res.data.length);
      setPages(Math.max(1, res.meta?.pages ?? 1));
    } catch (err) {
      setError(err);
      setListings([]);
    } finally {
      setLoading(false);
    }
  }, [paramsKey]);

  useEffect(() => {
    setDraft(readFilters(new URLSearchParams(paramsKey)));
    void load();
  }, [load, paramsKey]);

  const navigate = (filters: FilterState, nextPage: number) => {
    const search = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value.trim()) search.set(key, value.trim());
    });
    if (nextPage > 1) search.set('page', String(nextPage));
    const query = search.toString();
    router.push(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  const apply = (event: FormEvent) => {
    event.preventDefault();
    setFiltersOpen(false);
    navigate(draft, 1);
  };

  const activeCount = Object.values(readFilters(new URLSearchParams(paramsKey))).filter(Boolean).length;
  const set = (key: keyof FilterState) => (event: { target: { value: string } }) => setDraft((prev) => ({ ...prev, [key]: event.target.value }));

  return (
    <>
      <DiscoveryHero
        eyebrow="Shared Property"
        title={<>Verified rooms and bedspaces in <span className="text-emerald-300">occupied homes</span></>}
        description={
          <p>
            Current residents offer a private room or bedspace in the home they live in. A Veriq Agent verifies the resident&apos;s identity,
            occupancy and permission to share before anything is published. Only available opportunities are listed; the exact address and resident
            contact unlock for the access period.
          </p>
        }
      >
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Resident occupancy verified</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><MapPin className="h-3.5 w-3.5 text-emerald-300" /> General area shown before unlock</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><Lock className="h-3.5 w-3.5 text-emerald-300" /> Address and contact after unlock</span>
        </div>
      </DiscoveryHero>

      <main className="min-h-[50vh] bg-veriq-surface py-8">
        <div className="mx-auto grid max-w-7xl gap-6 px-4 sm:px-6 lg:grid-cols-[280px_1fr] lg:px-8">
          <aside>
            <button type="button" onClick={() => setFiltersOpen((value) => !value)} className="btn-outline mb-3 w-full !py-2.5 lg:hidden" aria-expanded={filtersOpen}>
              <Filter className="h-4 w-4" /> Filters{activeCount ? ` (${activeCount})` : ''}
            </button>
            <form onSubmit={apply} className={`card space-y-4 p-5 ${filtersOpen ? 'block' : 'hidden'} lg:sticky lg:top-24 lg:block`}>
              <div>
                <label htmlFor="sp-type" className="label">Space type</label>
                <select id="sp-type" value={draft.opportunityType} onChange={set('opportunityType')} className="input">
                  <option value="">All types</option>
                  {TYPE_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sp-city" className="label">City</label>
                <input id="sp-city" value={draft.city} onChange={set('city')} className="input" placeholder="e.g. Port Harcourt" />
              </div>
              <div>
                <label htmlFor="sp-area" className="label">Area</label>
                <input id="sp-area" value={draft.area} onChange={set('area')} className="input" placeholder="e.g. Rumuola" />
              </div>
              <div>
                <p className="label">Contribution (₦)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Minimum contribution" type="number" min={0} value={draft.minPrice} onChange={set('minPrice')} className="input" placeholder="Min" />
                  <input aria-label="Maximum contribution" type="number" min={0} value={draft.maxPrice} onChange={set('maxPrice')} className="input" placeholder="Max" />
                </div>
              </div>
              <div>
                <label htmlFor="sp-furnishing" className="label">Room furnishing</label>
                <select id="sp-furnishing" value={draft.furnishing} onChange={set('furnishing')} className="input">
                  <option value="">Any</option>
                  {FURNISHING_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="sp-bathroom" className="label">Bathroom</label>
                <select id="sp-bathroom" value={draft.bathroomSharing} onChange={set('bathroomSharing')} className="input">
                  <option value="">Any arrangement</option>
                  {BATHROOM_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div className="flex gap-2">
                <button type="submit" className="btn-primary flex-1 !py-2.5">Apply</button>
                <button type="button" onClick={() => { setDraft(EMPTY); navigate(EMPTY, 1); }} className="btn-outline !px-3 !py-2.5" aria-label="Clear filters">
                  <RotateCcw className="h-4 w-4" />
                </button>
              </div>
            </form>
          </aside>

          <section>
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-sm text-veriq-muted">{loading ? 'Searching…' : `${total} available opportunit${total === 1 ? 'y' : 'ies'}`}</p>
              <Link href="/how-it-works" className="text-xs font-semibold text-veriq-secondary hover:underline">How unlocking works</Link>
            </div>

            {error ? <ApiErrorNotice error={error} fallback="Shared Property opportunities could not be loaded." onRetry={() => void load()} /> : null}

            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner size="lg" className="text-veriq-secondary" /></div>
            ) : !error && listings.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                <Users className="mb-3 h-12 w-12 text-slate-300" />
                <p className="font-semibold text-navy-900">No available Shared Property matches these filters</p>
                <p className="mt-1 max-w-md text-sm text-veriq-muted">Opportunities disappear from search as soon as a space is taken. Try a wider area or price range, or check back soon.</p>
                {activeCount > 0 && <button type="button" onClick={() => { setDraft(EMPTY); navigate(EMPTY, 1); }} className="btn-outline mt-4 !py-2.5">Clear filters</button>}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => (
                  <SharedListingCard key={listing.id} listing={listing} schema={listing.opportunityType === 'private_room' ? privateRoomSchema : bedspaceSchema} />
                ))}
              </div>
            )}

            {!loading && pages > 1 && (
              <nav className="mt-8 flex items-center justify-center gap-3" aria-label="Pagination">
                <button type="button" onClick={() => navigate(readFilters(new URLSearchParams(paramsKey)), page - 1)} disabled={page <= 1} className="btn-outline !px-3 !py-2"><ChevronLeft className="h-4 w-4" /> Previous</button>
                <span className="text-sm text-veriq-muted">Page {page} of {pages}</span>
                <button type="button" onClick={() => navigate(readFilters(new URLSearchParams(paramsKey)), page + 1)} disabled={page >= pages} className="btn-outline !px-3 !py-2">Next <ChevronRight className="h-4 w-4" /></button>
              </nav>
            )}
          </section>
        </div>
      </main>
    </>
  );
}

export default function SharedPropertyPage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#03131a]"><LoadingSpinner size="lg" className="text-emerald-300" /></div>}>
      <SharedDiscovery />
    </Suspense>
  );
}
