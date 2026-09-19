'use client';

import { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Building2, ClipboardList, Plus, Search, UserX } from 'lucide-react';
import { propertySubmissionsApi } from '@/lib/api/operator';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  CATEGORY_LABELS,
  EmptyState,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  StatusBadge,
  VERIFICATION_STATUS_META,
  errorMessage,
  formatDate,
} from '@/components/listing-forms';
import type { OperatorPropertiesList, OperatorPropertyCategory, OperatorPropertySummary } from '@/types/operator';

const STATUS_FILTERS: Array<{ value: string; label: string; match: (property: OperatorPropertySummary) => boolean }> = [
  { value: 'all', label: 'All', match: () => true },
  { value: 'draft', label: 'Drafts', match: (property) => property.publicationStatus === 'draft' },
  {
    value: 'in_verification',
    label: 'In verification',
    match: (property) => ['submitted', 'verification_in_progress', 'ready_to_publish'].includes(property.publicationStatus),
  },
  { value: 'needs_correction', label: 'Needs correction', match: (property) => property.publicationStatus === 'needs_correction' },
  { value: 'published', label: 'Published', match: (property) => property.publicationStatus === 'published' },
  { value: 'pending_revisions', label: 'Changes awaiting Agent', match: (property) => property.pendingRevisions > 0 },
  { value: 'suspended', label: 'Suspended / archived', match: (property) => ['suspended', 'archived'].includes(property.publicationStatus) },
];

function PropertiesList() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const status = STATUS_FILTERS.some((filter) => filter.value === params.get('status')) ? (params.get('status') as string) : 'all';
  const [category, setCategory] = useState<OperatorPropertyCategory | 'all'>('all');
  const [query, setQuery] = useState('');
  const [data, setData] = useState<OperatorPropertiesList | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await propertySubmissionsApi.mine();
      setData(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load your properties'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const setStatus = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value === 'all') next.delete('status');
    else next.set('status', value);
    router.replace(next.toString() ? `${pathname}?${next}` : pathname);
  };

  const filtered = useMemo(() => {
    const matcher = STATUS_FILTERS.find((filter) => filter.value === status)?.match ?? (() => true);
    const term = query.trim().toLowerCase();
    return (data?.properties ?? []).filter(
      (property) =>
        matcher(property) &&
        (category === 'all' || property.category === category) &&
        (!term || `${property.title} ${property.area} ${property.city}`.toLowerCase().includes(term)),
    );
  }, [data, status, category, query]);

  if (loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My Properties</h1>
          <p className="text-sm text-slate-500">Residential Properties, Short Lets and Hostels you operate on Veriq.</p>
        </div>
        <Link href="/dashboard/operator/properties/new" className="btn-primary !py-2.5"><Plus className="h-4 w-4" /> Add Property</Link>
      </div>

      {loadError ? (
        <Notice tone="error" title="Properties could not be loaded">
          <p>{loadError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={() => { setLoading(true); void load(); }}>Try again</button>
        </Notice>
      ) : (
        <>
          <div className="flex flex-col gap-3">
            <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 sm:mx-0 sm:flex-wrap sm:px-0">
              {STATUS_FILTERS.map((filter) => {
                const total = (data?.properties ?? []).filter(filter.match).length;
                return (
                  <button
                    key={filter.value}
                    type="button"
                    onClick={() => setStatus(filter.value)}
                    className={`whitespace-nowrap rounded-full border px-3 py-1.5 text-xs font-semibold ${status === filter.value ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                  >
                    {filter.label} ({total})
                  </button>
                );
              })}
            </div>
            <div className="grid gap-3 sm:grid-cols-[1fr_220px]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input pl-9" placeholder="Search by title or area" value={query} onChange={(event) => setQuery(event.target.value)} aria-label="Search properties" />
              </div>
              <select className="input" value={category} onChange={(event) => setCategory(event.target.value as OperatorPropertyCategory | 'all')} aria-label="Filter by category">
                <option value="all">All categories</option>
                {(Object.keys(CATEGORY_LABELS) as OperatorPropertyCategory[]).map((value) => (
                  <option key={value} value={value}>{CATEGORY_LABELS[value]}</option>
                ))}
              </select>
            </div>
          </div>

          {(data?.properties.length ?? 0) === 0 ? (
            <EmptyState icon={<Building2 className="h-12 w-12" />} title="You have not added a property yet">
              Submit a Residential Property, Short Let or Hostel. It stays private until your Veriq Agent verifies and publishes it.
              <div className="mt-3"><Link href="/dashboard/operator/properties/new" className="btn-primary !py-2">Add Property</Link></div>
            </EmptyState>
          ) : filtered.length === 0 ? (
            <EmptyState title="No properties match these filters">Try another status, category or search term.</EmptyState>
          ) : (
            <ul className="grid gap-3">
              {filtered.map((property) => {
                const publication = PUBLICATION_STATUS_META[property.publicationStatus];
                const verification = VERIFICATION_STATUS_META[property.verificationStatus];
                const known = property.knownUnitCount ?? property.documentedUnits;
                return (
                  <li key={property.id}>
                    <Link href={`/dashboard/operator/properties/${property.id}`} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
                      <div className="min-w-0 space-y-1">
                        <p className="truncate font-semibold text-navy-900">{property.title}</p>
                        <p className="text-xs text-slate-500">
                          {CATEGORY_LABELS[property.category]} · {property.area}, {property.city} · updated {formatDate(property.updatedAt)}
                        </p>
                        <div className="flex flex-wrap gap-1.5 pt-1">
                          <StatusBadge tone={publication.tone}>{publication.label}</StatusBadge>
                          <StatusBadge tone={verification.tone}>{verification.label}</StatusBadge>
                          {property.pendingRevisions > 0 && (
                            <StatusBadge tone="amber"><ClipboardList className="h-3 w-3" /> {property.pendingRevisions} awaiting Agent</StatusBadge>
                          )}
                          {!property.agentAssigned && property.publicationStatus !== 'draft' && (
                            <StatusBadge tone="slate"><UserX className="h-3 w-3" /> Agent not yet assigned</StatusBadge>
                          )}
                        </div>
                      </div>
                      <dl className="grid flex-shrink-0 grid-cols-3 gap-4 text-center text-xs sm:w-72">
                        <div>
                          <dt className="text-slate-500">Documented</dt>
                          <dd className="font-display text-lg font-bold text-navy-900">{property.documentedUnits}<span className="text-xs font-normal text-slate-400">/{known}</span></dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Verified</dt>
                          <dd className="font-display text-lg font-bold text-navy-900">{property.verifiedUnits}</dd>
                        </div>
                        <div>
                          <dt className="text-slate-500">Available</dt>
                          <dd className={`font-display text-lg font-bold ${property.availableUnits > 0 ? 'text-veriq-secondary' : 'text-slate-400'}`}>{property.availableUnits}</dd>
                        </div>
                      </dl>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </>
      )}
    </div>
  );
}

export default function OperatorPropertiesPage() {
  return (
    <OperatorGuard>
      <Suspense fallback={<PageLoader />}>
        <PropertiesList />
      </Suspense>
    </OperatorGuard>
  );
}
