'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { AlertTriangle, ExternalLink, FileCheck2, Landmark, Search, ShieldAlert } from 'lucide-react';
import { salesAdminApi } from '@/lib/api/admin';
import type {
  AvailabilityState,
  ManagedSaleListing,
  SaleListingDetail,
  SaleUnavailableReason,
} from '@/types/admin';
import { SALE_UNAVAILABLE_REASONS } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useAgentDirectory } from '@/components/admin/useAgentDirectory';
import {
  dateTime,
  describeError,
  errorText,
  humanize,
  naira,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  KeyValue,
  LoadingBlock,
  Panel,
  StatCard,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type DialogKind = 'clear' | 'suspend' | 'availability' | null;

const DOCUMENT_STATUS_LABELS: Record<string, string> = {
  available: 'Available',
  not_available: 'Not available',
  not_presented: 'Not presented',
  sighted: 'Sighted by Veriq Agent',
  requires_further_verification: 'Requires further verification',
};

const LEGAL_SEARCH_LABELS: Record<string, string> = {
  not_performed: 'No independent legal search',
  requested: 'Legal search requested',
  completed_no_issues: 'Legal search: no issues reported',
  completed_issues_found: 'Legal search: issues reported',
};

const PARTY_TONES: Record<string, 'green' | 'amber' | 'red' | 'slate'> = {
  verified: 'green',
  pending: 'amber',
  failed: 'red',
  not_required: 'slate',
};

function AdminSalesInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();
  const directory = useAgentDirectory();

  const [listings, setListings] = useState<ManagedSaleListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('');
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const [detailId, setDetailId] = useState<string | null>(searchParams.get('id'));
  const [detail, setDetail] = useState<SaleListingDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DescribedError | null>(null);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [availabilityStatus, setAvailabilityStatus] = useState<AvailabilityState>('unavailable');
  const [unavailableReason, setUnavailableReason] = useState<SaleUnavailableReason>('sold');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await salesAdminApi.managed();
      setListings(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load sale listings'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadDetail = useCallback(async (id: string) => {
    setDetailLoading(true);
    try {
      const res = await salesAdminApi.detail(id);
      setDetail(res.data);
      setDetailError(null);
    } catch (err) {
      setDetailError(describeError(err, 'Could not load this sale listing'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (ready && detailId) {
      setDetail(null);
      void loadDetail(detailId);
    }
  }, [ready, detailId, loadDetail]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return listings.filter(
      (row) =>
        (!q || row.title.toLowerCase().includes(q) || row.id.toLowerCase().includes(q)) &&
        (!statusFilter || row.publicationStatus === statusFilter) &&
        (!availabilityFilter || row.availabilityStatus === availabilityFilter) &&
        (!escalatedOnly || row.escalationOpen),
    );
  }, [listings, search, statusFilter, availabilityFilter, escalatedOnly]);

  const afterAction = (id: string) => {
    setDialog(null);
    void load();
    void loadDetail(id);
  };

  const clearEscalation = async (reason: string) => {
    if (!detail) return;
    try {
      const res = await salesAdminApi.clearEscalation(detail.sale.id, reason);
      success(res.message);
      afterAction(detail.sale.id);
    } catch (err) {
      toastError(errorText(err, 'Could not clear the escalation'));
    }
  };

  const suspend = async (reason: string) => {
    if (!detail) return;
    try {
      const res = await salesAdminApi.suspend(detail.sale.id, reason);
      success(res.message);
      afterAction(detail.sale.id);
    } catch (err) {
      toastError(errorText(err, 'Could not suspend the sale listing'));
    }
  };

  const changeAvailability = async (note: string) => {
    if (!detail) return;
    try {
      const res = await salesAdminApi.setAvailability(detail.sale.id, {
        status: availabilityStatus,
        reason: availabilityStatus === 'unavailable' ? unavailableReason : undefined,
        note: note || undefined,
      });
      success(res.message);
      afterAction(detail.sale.id);
    } catch (err) {
      toastError(errorText(err, 'Could not change availability'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const escalations = listings.filter((row) => row.escalationOpen).length;
  const published = listings.filter((row) => row.publicationStatus === 'published').length;
  const unavailable = listings.filter((row) => row.availabilityStatus === 'unavailable').length;
  const statuses = Array.from(new Set(listings.map((row) => row.publicationStatus)));

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Landmark}
        eyebrow="Property for Sale"
        title="Sale Oversight"
        description="Sale listings, seller verification, document statuses, escalations, suspension and availability (§6.5, §18.6). Document statuses record availability and sighting only; they never imply verified legal title."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Landmark} label="Sale listings" value={loading ? '…' : listings.length} />
        <StatCard icon={FileCheck2} tone="green" label="Published" value={loading ? '…' : published} />
        <StatCard icon={ShieldAlert} tone={escalations ? 'red' : 'slate'} label="Open escalations" value={loading ? '…' : escalations} sub="Publication is blocked until cleared" />
        <StatCard icon={AlertTriangle} tone="amber" label="Unavailable" value={loading ? '…' : unavailable} sub="Sold, withdrawn or no longer offered" />
      </div>

      <div className="card grid grid-cols-1 gap-3 p-4 hover:shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search sale listings" className="input !pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Title or listing ID" />
        </div>
        <select aria-label="Publication status" className="input" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value)}>
          <option value="">All publication statuses</option>
          {statuses.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </select>
        <select aria-label="Availability" className="input" value={availabilityFilter} onChange={(event) => setAvailabilityFilter(event.target.value)}>
          <option value="">Any availability</option>
          <option value="available">Available</option>
          <option value="unavailable">Unavailable</option>
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm font-medium text-navy-800 sm:col-span-2 lg:col-span-1">
          <input type="checkbox" checked={escalatedOnly} onChange={(event) => setEscalatedOnly(event.target.checked)} className="h-4 w-4 accent-red-600" />
          Escalated only
        </label>
      </div>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <Panel title="Sale listings" description="Most recently updated first.">
        {loading && listings.length === 0 ? (
          <LoadingBlock />
        ) : visible.length === 0 ? (
          <EmptyState icon={Landmark} title={listings.length ? 'No listings match these filters' : 'No sale listings yet'} />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[820px]">
              <thead className="bg-slate-50">
                <tr>
                  <th className={th}>Listing</th>
                  <th className={`${th} text-right`}>Asking price</th>
                  <th className={th}>Publication</th>
                  <th className={th}>Availability</th>
                  <th className={th}>Escalation</th>
                  <th className={th}>Updated</th>
                  <th className={th}><span className="sr-only">Open</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {visible.map((row) => (
                  <tr key={row.id} className={row.escalationOpen ? 'bg-red-50/40' : 'hover:bg-slate-50/60'}>
                    <td className={td}>
                      <p className="max-w-[260px] truncate font-semibold">{row.title}</p>
                      <p className="text-[11px] text-slate-500">{humanize(row.subtype)}</p>
                      <p className="break-all font-mono text-[11px] text-slate-400">{row.id}</p>
                    </td>
                    <td className={`${td} whitespace-nowrap text-right font-semibold`}>{naira(row.askingPrice)}</td>
                    <td className={td}><StatusBadge status={row.publicationStatus} /></td>
                    <td className={td}><StatusBadge status={row.availabilityStatus} /></td>
                    <td className={td}>{row.escalationOpen ? <StatusBadge status="failed" label="Open" /> : <span className="text-xs text-slate-400">None</span>}</td>
                    <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(row.updatedAt)}</span></td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setDetailId(row.id)} className="whitespace-nowrap rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-bold text-white hover:bg-navy-700">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Modal isOpen={!!detailId} onClose={() => setDetailId(null)} title="Sale listing review" size="lg" className="max-h-[92vh] overflow-y-auto">
        {detailError ? (
          <ErrorPanel error={detailError} onRetry={() => detailId && void loadDetail(detailId)} />
        ) : detailLoading && !detail ? (
          <LoadingBlock />
        ) : detail ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-navy-900">{detail.sale.title}</h3>
              <p className="text-xs text-slate-500">{humanize(detail.sale.subtype)} · <span className="font-mono">{detail.sale.id}</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={detail.sale.publicationStatus} />
                <StatusBadge status={detail.sale.availabilityStatus} />
                {detail.sale.escalationOpen && <StatusBadge status="failed" label="Escalated" />}
              </div>
            </div>

            {detail.sale.escalationOpen && (
              <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
                <p className="font-semibold">Escalation open</p>
                <p className="mt-1 text-xs">{detail.sale.escalationReason || 'No reason recorded.'}</p>
              </div>
            )}

            {detail.sale.suspendedAt && (
              <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">Suspended {dateTime(detail.sale.suspendedAt)}</p>
                <p className="mt-1 text-xs">{detail.sale.suspensionReason || 'No reason recorded.'}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <KeyValue label="Asking price" value={<span className="text-sm font-bold">{naira(detail.sale.askingPrice)}</span>} />
              <KeyValue label="Price basis" value={humanize(detail.sale.priceBasis)} />
              <KeyValue label="Negotiable" value={detail.sale.negotiable === null ? 'Not stated' : detail.sale.negotiable ? 'Yes' : 'No'} />
              <KeyValue label="Contact route" value={humanize(detail.sale.contactRoute)} />
              <KeyValue label="Managing Veriq Agent" value={directory.nameOf(detail.sale.managingAgentId)} />
              <KeyValue label="Availability confirmed" value={dateTime(detail.sale.availabilityConfirmedAt)} />
              <KeyValue label="Freshness expires" value={dateTime(detail.sale.freshnessExpiresAt)} />
              <KeyValue label="Unavailable reason" value={detail.sale.unavailableReason ? humanize(detail.sale.unavailableReason) : '—'} />
              <KeyValue label="Location" value={[detail.property.area, detail.property.city, detail.property.state].filter(Boolean).join(', ') || '—'} />
              <KeyValue label="Canonical Property" value={detail.property.id} mono />
            </div>

            <section>
              <h4 className="mb-2 text-sm font-bold text-navy-900">Seller verification</h4>
              <div className="grid grid-cols-2 gap-2">
                <KeyValue label="Seller" value={detail.sale.sellerName} />
                <KeyValue label="Is beneficial owner" value={detail.sale.sellerIsOwner ? 'Yes' : 'No'} />
                <KeyValue label="Identity status" value={<StatusBadge status={detail.sale.sellerIdentityStatus} tone={PARTY_TONES[detail.sale.sellerIdentityStatus] ?? 'slate'} />} />
                <KeyValue label="Authority to sell" value={<StatusBadge status={detail.sale.authorityToSellStatus} tone={PARTY_TONES[detail.sale.authorityToSellStatus] ?? 'slate'} />} />
              </div>
              <p className="mt-2 text-[11px] text-slate-500">Seller contact details and evidence stay private to Veriq; buyers only see statuses and permitted facts.</p>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-bold text-navy-900">Document statuses</h4>
              <TableScroll>
                <table className="w-full min-w-[640px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Document</th>
                      <th className={th}>Status</th>
                      <th className={th}>Independent legal search</th>
                      <th className={th}>Checked</th>
                      <th className={th}>Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {detail.documentChecklist.map((item) => {
                      const record = detail.documents.find((doc) => doc.documentType === item.key);
                      return (
                        <tr key={item.key} className={record?.discrepancyFound ? 'bg-red-50/40' : undefined}>
                          <td className={td}><p className="max-w-[240px] text-xs font-semibold">{item.label}</p></td>
                          <td className={td}>
                            {record ? <StatusBadge status={record.availability} label={DOCUMENT_STATUS_LABELS[record.availability] ?? humanize(record.availability)} /> : <span className="text-xs text-slate-400">Not recorded</span>}
                            {record?.discrepancyFound && <p className="mt-1 text-[11px] font-semibold text-red-700">Discrepancy found</p>}
                          </td>
                          <td className={td}><span className="text-xs">{record ? LEGAL_SEARCH_LABELS[record.legalSearchStatus] ?? humanize(record.legalSearchStatus) : '—'}</span>{record?.legalSearchReference && <p className="text-[11px] text-slate-500">{record.legalSearchReference}</p>}</td>
                          <td className={td}><span className="whitespace-nowrap text-[11px] text-slate-500">{record ? dateTime(record.checkedAt) : '—'}</span></td>
                          <td className={td}><p className="max-w-[200px] text-[11px] text-slate-600">{record?.notes || '—'}</p></td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </TableScroll>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-bold text-navy-900">Publication readiness</h4>
              {detail.readiness.ready ? (
                <p className="rounded-lg bg-emerald-50 p-3 text-xs text-emerald-800">All publication requirements are met.</p>
              ) : (
                <ul className="list-disc space-y-1 rounded-lg bg-amber-50 p-3 pl-7 text-xs text-amber-900">
                  {detail.readiness.blockers.map((blocker) => (
                    <li key={blocker.code}>{blocker.message}</li>
                  ))}
                </ul>
              )}
            </section>

            {detail.evidence.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-navy-900">Private evidence</h4>
                <ul className="space-y-1">
                  {detail.evidence.map((item) => (
                    <li key={item.id} className="text-xs">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-emerald-700 underline">
                        {humanize(item.kind)}{item.fileName ? ` · ${item.fileName}` : ''} <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="ml-2 text-slate-400">{dateTime(item.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2 border-t border-slate-100 pt-4">
              {detail.sale.escalationOpen && (
                <button type="button" onClick={() => setDialog('clear')} className="rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50">Clear escalation</button>
              )}
              <button
                type="button"
                onClick={() => {
                  setAvailabilityStatus(detail.sale.availabilityStatus === 'available' ? 'unavailable' : 'available');
                  setUnavailableReason(detail.sale.unavailableReason ?? 'sold');
                  setDialog('availability');
                }}
                className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy-700 hover:bg-slate-50"
              >
                Change availability
              </button>
              {detail.sale.publicationStatus !== 'suspended' && (
                <button type="button" onClick={() => setDialog('suspend')} className="rounded-lg border border-red-200 px-3 py-2 text-xs font-bold text-red-600 hover:bg-red-50">Suspend listing</button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ReasonDialog
        isOpen={dialog === 'clear'}
        onClose={() => setDialog(null)}
        onConfirm={clearEscalation}
        title="Clear sale escalation"
        confirmLabel="Clear escalation"
        maxLength={1000}
        message={<p>Publication is unblocked for this listing. The escalation and your reason stay in the audit history.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={suspend}
        title="Suspend sale listing"
        confirmLabel="Suspend listing"
        variant="danger"
        maxLength={1000}
        message={<p>The listing is removed from public discovery immediately and the managing Veriq Agent is notified. Buyers with an active unlock keep their paid access period.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'availability'}
        onClose={() => setDialog(null)}
        onConfirm={changeAvailability}
        title="Change sale availability"
        confirmLabel="Save availability"
        reasonRequired={false}
        reasonLabel="Note (optional, recorded with the availability event)"
        maxLength={500}
        message={<p>Only Available published listings are discoverable. Marking a listing unavailable removes it from discovery immediately.</p>}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div>
            <label className="label text-xs" htmlFor="sale-availability">Availability</label>
            <select id="sale-availability" className="input" value={availabilityStatus} onChange={(event) => setAvailabilityStatus(event.target.value as AvailabilityState)}>
              <option value="available">Available (confirm)</option>
              <option value="unavailable">Unavailable</option>
            </select>
          </div>
          {availabilityStatus === 'unavailable' && (
            <div>
              <label className="label text-xs" htmlFor="sale-unavailable-reason">Reason</label>
              <select id="sale-unavailable-reason" className="input" value={unavailableReason} onChange={(event) => setUnavailableReason(event.target.value as SaleUnavailableReason)}>
                {SALE_UNAVAILABLE_REASONS.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
              </select>
            </div>
          )}
        </div>
      </ReasonDialog>
    </div>
  );
}

export default function AdminSalesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminSalesInner />
    </Suspense>
  );
}
