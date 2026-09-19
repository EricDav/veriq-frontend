'use client';

import { Suspense, useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ChevronLeft, ChevronRight, FileCheck2, Filter, Landmark, Lock, RotateCcw, ShieldCheck } from 'lucide-react';
import { saleListingsApi } from '@/lib/api/renter';
import type { SaleListingPublic, SaleListQuery, SalePriceBasis, SaleSubtype } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { DiscoveryHero } from '@/components/renter/DiscoveryHero';
import { SaleListingCard } from '@/components/renter/ListingCard';

const PAGE_SIZE = 12;

const SUBTYPES: Array<{ value: SaleSubtype; label: string }> = [
  { value: 'built_property', label: 'Built Property' },
  { value: 'land', label: 'Land' },
];

const PRICE_BASIS: Array<{ value: SalePriceBasis; label: string }> = [
  { value: 'total', label: 'Total price' },
  { value: 'per_plot', label: 'Per plot' },
  { value: 'per_square_metre', label: 'Per square metre' },
  { value: 'other', label: 'Other basis' },
];

interface FilterState {
  subtype: string;
  city: string;
  area: string;
  minPrice: string;
  maxPrice: string;
  bedrooms: string;
  priceBasis: string;
}

const EMPTY: FilterState = { subtype: '', city: '', area: '', minPrice: '', maxPrice: '', bedrooms: '', priceBasis: '' };

function readFilters(params: URLSearchParams): FilterState {
  return {
    subtype: params.get('subtype') ?? '',
    city: params.get('city') ?? '',
    area: params.get('area') ?? '',
    minPrice: params.get('minPrice') ?? '',
    maxPrice: params.get('maxPrice') ?? '',
    bedrooms: params.get('bedrooms') ?? '',
    priceBasis: params.get('priceBasis') ?? '',
  };
}

function toQuery(filters: FilterState, page: number): SaleListQuery {
  const num = (value: string) => (value.trim() && Number.isFinite(Number(value)) ? Number(value) : '');
  const subtype = SUBTYPES.some((item) => item.value === filters.subtype) ? (filters.subtype as SaleSubtype) : '';
  return {
    subtype,
    city: filters.city.trim(),
    area: filters.area.trim(),
    minPrice: num(filters.minPrice),
    maxPrice: num(filters.maxPrice),
    bedrooms: subtype === 'land' ? '' : num(filters.bedrooms),
    priceBasis: PRICE_BASIS.some((item) => item.value === filters.priceBasis) ? (filters.priceBasis as SalePriceBasis) : '',
    page,
    limit: PAGE_SIZE,
  };
}

function SaleDiscovery() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const paramsKey = params.toString();
  const page = Math.max(1, Number(params.get('page')) || 1);

  const [draft, setDraft] = useState<FilterState>(() => readFilters(new URLSearchParams(paramsKey)));
  const [listings, setListings] = useState<SaleListingPublic[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const load = useCallback(async () => {
    const current = new URLSearchParams(paramsKey);
    setLoading(true);
    setError(null);
    try {
      const res = await saleListingsApi.list(toQuery(readFilters(current), Math.max(1, Number(current.get('page')) || 1)));
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
    if (filters.subtype === 'land') search.delete('bedrooms');
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
        eyebrow="Property for Sale"
        title={<>Built Property and Land, <span className="text-emerald-300">verified by Veriq Agents</span></>}
        description={
          <p>
            Sellers do not self-list. A Veriq Agent verifies the seller&apos;s identity and authority to sell, confirms the physical property or land,
            and records the status of each sale document. Only available listings are shown. Exact location, full sale intelligence and the
            contact route unlock for the access period.
          </p>
        }
      >
        <div className="mt-6 flex flex-wrap gap-3 text-xs text-white/70">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><ShieldCheck className="h-3.5 w-3.5 text-emerald-300" /> Seller authority checked</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><FileCheck2 className="h-3.5 w-3.5 text-emerald-300" /> Document statuses, never the files</span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/15 px-3 py-1.5"><Lock className="h-3.5 w-3.5 text-emerald-300" /> Location and contact after unlock</span>
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
                <label htmlFor="fs-subtype" className="label">Type</label>
                <select id="fs-subtype" value={draft.subtype} onChange={set('subtype')} className="input">
                  <option value="">Built Property and Land</option>
                  {SUBTYPES.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
                </select>
              </div>
              <div>
                <label htmlFor="fs-city" className="label">City</label>
                <input id="fs-city" value={draft.city} onChange={set('city')} className="input" placeholder="e.g. Port Harcourt" />
              </div>
              <div>
                <label htmlFor="fs-area" className="label">Area</label>
                <input id="fs-area" value={draft.area} onChange={set('area')} className="input" placeholder="e.g. Eliozu" />
              </div>
              <div>
                <p className="label">Asking price (₦)</p>
                <div className="grid grid-cols-2 gap-2">
                  <input aria-label="Minimum asking price" type="number" min={0} value={draft.minPrice} onChange={set('minPrice')} className="input" placeholder="Min" />
                  <input aria-label="Maximum asking price" type="number" min={0} value={draft.maxPrice} onChange={set('maxPrice')} className="input" placeholder="Max" />
                </div>
              </div>
              {draft.subtype !== 'land' && (
                <div>
                  <label htmlFor="fs-bedrooms" className="label">Minimum bedrooms</label>
                  <select id="fs-bedrooms" value={draft.bedrooms} onChange={set('bedrooms')} className="input">
                    <option value="">Any</option>
                    {[1, 2, 3, 4, 5, 6].map((count) => <option key={count} value={count}>{count}+</option>)}
                  </select>
                </div>
              )}
              <div>
                <label htmlFor="fs-basis" className="label">Price basis</label>
                <select id="fs-basis" value={draft.priceBasis} onChange={set('priceBasis')} className="input">
                  <option value="">Any basis</option>
                  {PRICE_BASIS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
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
              <p className="text-sm text-veriq-muted">{loading ? 'Searching…' : `${total} available listing${total === 1 ? '' : 's'}`}</p>
              <Link href="/verification-rules" className="text-xs font-semibold text-veriq-secondary hover:underline">How sale listings are verified</Link>
            </div>

            {error ? <ApiErrorNotice error={error} fallback="Property for Sale listings could not be loaded." onRetry={() => void load()} /> : null}

            {loading ? (
              <div className="flex justify-center py-20"><LoadingSpinner size="lg" className="text-veriq-secondary" /></div>
            ) : !error && listings.length === 0 ? (
              <div className="flex flex-col items-center rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center">
                <Landmark className="mb-3 h-12 w-12 text-slate-300" />
                <p className="font-semibold text-navy-900">No available listings match these filters</p>
                <p className="mt-1 max-w-md text-sm text-veriq-muted">Listings leave search once sold, withdrawn or no longer offered. Try a wider area or price range.</p>
                {activeCount > 0 && <button type="button" onClick={() => { setDraft(EMPTY); navigate(EMPTY, 1); }} className="btn-outline mt-4 !py-2.5">Clear filters</button>}
              </div>
            ) : (
              <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
                {listings.map((listing) => <SaleListingCard key={listing.id} listing={listing} />)}
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

export default function PropertyForSalePage() {
  return (
    <Suspense fallback={<div className="flex min-h-screen items-center justify-center bg-[#03131a]"><LoadingSpinner size="lg" className="text-emerald-300" /></div>}>
      <SaleDiscovery />
    </Suspense>
  );
}
