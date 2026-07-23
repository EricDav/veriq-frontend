'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, BellRing, CheckCircle, Clock3, Flag, Gift, MapPin, Plus, RefreshCw, Search, XCircle, Trash2, Save, Pencil } from 'lucide-react';
import { communityApi, locationsApi, propertiesApi } from '@/lib/api';
import {
  ContributionStatus,
  FreeUnlockAgreementType,
  StreetStatus,
  type FreeUnlockCampaign,
  type Property,
  type CommunityLocation,
  type Street,
  type StreetContribution,
  type AllowedState,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

export default function AdminCommunityPage() {
  const searchParams = useSearchParams();
  const requestedPropertyId = searchParams.get('propertyId') ?? '';
  const { success, error } = useToast();
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [campaigns, setCampaigns] = useState<FreeUnlockCampaign[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [contributions, setContributions] = useState<StreetContribution[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [hierarchy, setHierarchy] = useState<CommunityLocation[]>([]);
  const [directoryStates, setDirectoryStates] = useState<AllowedState[]>([]);
  const [directoryState, setDirectoryState] = useState('Rivers');
  const [locationName, setLocationName] = useState('');
  const [areaName, setAreaName] = useState('');
  const [areaLocationId, setAreaLocationId] = useState('');
  const [streetEdit, setStreetEdit] = useState({ streetId: '', locationId: '', areaId: '', streetName: '', latitude: '', longitude: '' });
  const [merge, setMerge] = useState({ sourceStreetId: '', targetStreetId: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [streetStatusFilter, setStreetStatusFilter] = useState<StreetStatus | 'all'>(() =>
    searchParams.get('moderation') === 'all' ? 'all' : StreetStatus.PENDING,
  );
  const [streetSearch, setStreetSearch] = useState('');
  const [streetStateFilter, setStreetStateFilter] = useState('');
  const [streetLocationFilter, setStreetLocationFilter] = useState('');
  const [streetAreaFilter, setStreetAreaFilter] = useState('');
  const [form, setForm] = useState({
    propertyId: '',
    startDate: '',
    endDate: '',
    maximumUnlocks: '25',
    maximumUnlocksPerUser: '1',
    agreementType: FreeUnlockAgreementType.VERIQ_PROMOTIONAL_CAMPAIGN,
    amountPaid: '',
    paymentStatus: '',
    internalNote: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const streetsRequest = streetStateFilter
        ? streetLocationFilter
          ? communityApi.adminStreets({ state: streetStateFilter, locationId: streetLocationFilter })
          : Promise.resolve({ data: [] as Street[] })
        : communityApi.adminStreets({ recentHours: 48 });
      const [analyticsRes, campaignsRes, propertiesRes, statesRes] = await Promise.all([
        communityApi.adminAnalytics(),
        communityApi.adminCampaigns(),
        propertiesApi.listAdmin({ page: 1, limit: 100 }),
        locationsApi.allStates(),
      ]);
      const [streetsRes, contributionsRes, hierarchyRes] = await Promise.all([
        streetsRequest,
        communityApi.adminContributions(),
        communityApi.adminLocations(),
      ]);
      setAnalytics(analyticsRes.data as Record<string, unknown>);
      setCampaigns(campaignsRes.data);
      setProperties(propertiesRes.data);
      setDirectoryStates(statesRes.data);
      setStreets(streetsRes.data);
      setContributions(contributionsRes.data);
      setHierarchy(hierarchyRes.data);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to load community admin tools');
    } finally {
      setLoading(false);
    }
  };

  const runHierarchyAction = async (action: () => Promise<unknown>, message: string) => {
    setSaving(true);
    try { await action(); success(message); await load(); }
    catch (err) { error(err instanceof Error ? err.message : 'Unable to update location hierarchy'); }
    finally { setSaving(false); }
  };

  const selectedEditLocation = hierarchy.find((item) => item.id === streetEdit.locationId);
  const directoryLocations = hierarchy.filter((item) => item.state === directoryState);
  const moderationLocation = hierarchy.find((item) => item.id === streetLocationFilter);
  const moderationStates = useMemo(() => Array.from(new Set(hierarchy.filter((item) => item.isActive).map((item) => item.state))).sort(), [hierarchy]);
  const locationHistorySelected = Boolean(streetStateFilter && streetLocationFilter);
  const scopedStreets = useMemo(() => {
    if (locationHistorySelected) {
      return streets.filter((street) => street.state === streetStateFilter && street.locationId === streetLocationFilter);
    }
    if (streetStateFilter) return [];
    const recentCutoff = Date.now() - 48 * 60 * 60 * 1000;
    return streets.filter((street) => new Date(street.createdAt).getTime() >= recentCutoff);
  }, [locationHistorySelected, streetLocationFilter, streetStateFilter, streets]);
  const streetStatusCounts = useMemo(() => Object.values(StreetStatus).reduce<Record<StreetStatus, number>>(
    (counts, status) => ({ ...counts, [status]: scopedStreets.filter((street) => street.status === status).length }),
    {} as Record<StreetStatus, number>,
  ), [scopedStreets]);
  const filteredStreets = useMemo(() => {
    const query = streetSearch.trim().toLowerCase();
    return scopedStreets.filter((street) => {
      if (streetStatusFilter !== 'all' && street.status !== streetStatusFilter) return false;
      if (streetAreaFilter && street.areaId !== streetAreaFilter) return false;
      if (!query) return true;
      return [street.streetName, street.area, street.city, street.state, street.landmark]
        .some((value) => value?.toLowerCase().includes(query));
    });
  }, [scopedStreets, streetAreaFilter, streetSearch, streetStatusFilter]);

  const reviewStreet = async (street: Street, status: StreetStatus) => {
    setReviewingId(street.id);
    try {
      await communityApi.reviewStreet(street.id, {
        status,
        isPopular: status === StreetStatus.APPROVED ? street.isPopular : false,
        popularRank: street.popularRank,
      });
      success(`Street ${status.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to review street');
    } finally {
      setReviewingId(null);
    }
  };

  const reviewContribution = async (contribution: StreetContribution, status: ContributionStatus) => {
    setReviewingId(contribution.id);
    try {
      await communityApi.reviewContribution(contribution.id, { status });
      success(`Contribution ${status.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to review contribution');
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (loading) return;
    const refreshStreetScope = async () => {
      try {
        if (streetStateFilter && !streetLocationFilter) {
          setStreets([]);
          return;
        }
        const response = await communityApi.adminStreets(
          streetStateFilter
            ? { state: streetStateFilter, locationId: streetLocationFilter }
            : { recentHours: 48 },
        );
        setStreets(response.data);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Unable to load streets');
      }
    };
    void refreshStreetScope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetLocationFilter, streetStateFilter]);

  useEffect(() => {
    if (!requestedPropertyId || !properties.some((property) => property.id === requestedPropertyId)) return;
    const start = new Date();
    const end = new Date(start.getTime() + 7 * 86_400_000);
    const toLocalInput = (date: Date) => {
      const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
      return local.toISOString().slice(0, 16);
    };
    setForm((current) => ({
      ...current,
      propertyId: requestedPropertyId,
      startDate: current.startDate || toLocalInput(start),
      endDate: current.endDate || toLocalInput(end),
    }));
    window.setTimeout(() => document.getElementById('free-unlocks')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }, [properties, requestedPropertyId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await communityApi.createCampaign({
        propertyId: form.propertyId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maximumUnlocks: form.maximumUnlocks ? Number(form.maximumUnlocks) : undefined,
        maximumUnlocksPerUser: form.maximumUnlocksPerUser ? Number(form.maximumUnlocksPerUser) : undefined,
        agreementType: form.agreementType,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
        paymentStatus: form.paymentStatus || undefined,
        internalNote: form.internalNote || undefined,
        autoReturnToPaid: true,
      });
      success('Free Unlock campaign created.');
      setForm((state) => ({ ...state, propertyId: '', internalNote: '' }));
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to create campaign');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-navy-900">Community & Free Unlocks</h1>
          <p className="mt-1 text-sm text-veriq-muted">Manage Street Intelligence health and admin-controlled Free Unlock campaigns.</p>
        </div>
        <button onClick={load} className="btn-outline !py-2.5 !text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(analytics ?? {}).map(([key, value]) => (
          <div key={key} className="card p-5">
            <BarChart3 className="mb-3 h-5 w-5 text-veriq-secondary" />
            <p className="text-2xl font-black text-navy-900">{String(value)}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
          </div>
        ))}
      </div>

      <section className="space-y-4" data-testid="location-directory">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">Location Directory</h2>
          <p className="mt-1 text-xs text-veriq-muted">Manage State → Location → Area/Neighbourhood → Street data used by search and contributions.</p>
        </div>
        <div className="max-w-sm">
          <label className="mb-1.5 block text-xs font-bold text-slate-600" htmlFor="directory-state">State</label>
          <select id="directory-state" className="input" value={directoryState} onChange={(event) => { setDirectoryState(event.target.value); setAreaLocationId(''); }}>
            {directoryStates.map((state) => <option key={state.id} value={state.name}>{state.name}</option>)}
          </select>
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className="card space-y-5 p-5">
            <form onSubmit={(event) => { event.preventDefault(); void runHierarchyAction(() => communityApi.createLocation({ state: directoryState, name: locationName }), 'Location added.'); setLocationName(''); }} className="flex gap-2">
              <input className="input" value={locationName} onChange={(event) => setLocationName(event.target.value)} placeholder={`New ${directoryState} location`} required />
              <button className="btn-primary !px-3" disabled={saving} title="Add location"><Plus className="h-4 w-4" /></button>
            </form>
            <form onSubmit={(event) => { event.preventDefault(); void runHierarchyAction(() => communityApi.createArea({ locationId: areaLocationId, name: areaName }), 'Area added.'); setAreaName(''); }} className="grid gap-2 sm:grid-cols-[1fr_1fr_auto]">
              <select className="input" value={areaLocationId} onChange={(event) => setAreaLocationId(event.target.value)} required><option value="">Location</option>{directoryLocations.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input className="input" value={areaName} onChange={(event) => setAreaName(event.target.value)} placeholder="New area / neighbourhood" required />
              <button className="btn-primary !px-3" disabled={saving} title="Add area"><Plus className="h-4 w-4" /></button>
            </form>
            <div className="max-h-80 space-y-3 overflow-y-auto" data-testid="location-directory-list">
              {directoryLocations.map((location) => <div key={location.id} className="rounded-lg border border-slate-100 p-3">
                <div className="flex items-center justify-between"><p className="font-bold text-navy-900">{location.name}</p><div><button type="button" onClick={() => { const name = window.prompt('Location name', location.name); if (name?.trim()) void runHierarchyAction(() => communityApi.updateLocation(location.id, { state: location.state, name: name.trim() }), 'Location updated.'); }} title="Edit location" className="p-1 text-blue-600"><Pencil className="h-4 w-4" /></button><button type="button" onClick={() => runHierarchyAction(() => communityApi.deleteLocation(location.id), 'Location removed.')} title="Remove location" className="p-1 text-rose-600"><Trash2 className="h-4 w-4" /></button></div></div>
                <div className="mt-2 flex flex-wrap gap-2">{location.areas?.map((area) => <span key={area.id} className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-1 text-xs text-slate-600">{area.name}<button type="button" onClick={() => { const name = window.prompt('Area / neighbourhood name', area.name); if (name?.trim()) void runHierarchyAction(() => communityApi.updateArea(area.id, { locationId: location.id, name: name.trim() }), 'Area updated.'); }} title="Edit area"><Pencil className="h-3 w-3 text-blue-500" /></button><button type="button" onClick={() => runHierarchyAction(() => communityApi.deleteArea(area.id), 'Area removed.')} title="Remove area"><Trash2 className="h-3 w-3 text-rose-500" /></button></span>)}</div>
              </div>)}
              {directoryLocations.length === 0 && <p className="py-8 text-center text-sm text-slate-500">No locations have been added for {directoryState}.</p>}
            </div>
          </div>

          <div className="card space-y-4 p-5">
            <h3 className="font-display font-bold text-navy-900">Edit or Move Street</h3>
            <select className="input" value={streetEdit.streetId} onChange={(event) => { const item = streets.find((street) => street.id === event.target.value); setStreetEdit({ streetId: event.target.value, locationId: item?.locationId ?? '', areaId: item?.areaId ?? '', streetName: item?.streetName ?? '', latitude: item?.latitude?.toString() ?? '', longitude: item?.longitude?.toString() ?? '' }); }}><option value="">Select street</option>{streets.map((street) => <option key={street.id} value={street.id}>{street.streetName} — {street.area}, {street.city}</option>)}</select>
            <div className="grid gap-2 sm:grid-cols-2">
              <select className="input" value={streetEdit.locationId} onChange={(event) => setStreetEdit((current) => ({ ...current, locationId: event.target.value, areaId: '' }))} disabled={!streetEdit.streetId}><option value="">Location</option>{hierarchy.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <select className="input" value={streetEdit.areaId} onChange={(event) => setStreetEdit((current) => ({ ...current, areaId: event.target.value }))} disabled={!streetEdit.locationId}><option value="">Area / neighbourhood</option>{selectedEditLocation?.areas?.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select>
              <input className="input" value={streetEdit.streetName} onChange={(event) => setStreetEdit((current) => ({ ...current, streetName: event.target.value }))} placeholder="Street name" disabled={!streetEdit.streetId} />
              <div className="grid grid-cols-2 gap-2"><input className="input" type="number" step="any" value={streetEdit.latitude} onChange={(event) => setStreetEdit((current) => ({ ...current, latitude: event.target.value }))} placeholder="Latitude" /><input className="input" type="number" step="any" value={streetEdit.longitude} onChange={(event) => setStreetEdit((current) => ({ ...current, longitude: event.target.value }))} placeholder="Longitude" /></div>
            </div>
            <div className="flex gap-2"><button type="button" className="btn-primary !py-2 !text-xs" disabled={!streetEdit.streetId || !streetEdit.locationId || !streetEdit.areaId || saving} onClick={() => runHierarchyAction(() => communityApi.updateStreetAdmin(streetEdit.streetId, { locationId: streetEdit.locationId, areaId: streetEdit.areaId, streetName: streetEdit.streetName, latitude: streetEdit.latitude ? Number(streetEdit.latitude) : undefined, longitude: streetEdit.longitude ? Number(streetEdit.longitude) : undefined }), 'Street updated.')}><Save className="h-3.5 w-3.5" /> Save Street</button><button type="button" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" disabled={!streetEdit.streetId || saving} onClick={() => runHierarchyAction(() => communityApi.deleteStreetAdmin(streetEdit.streetId), 'Street deleted.')}><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Delete</button></div>
            <div className="border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-bold text-navy-900">Merge duplicate street</p><div className="grid gap-2 sm:grid-cols-2"><select className="input" value={merge.sourceStreetId} onChange={(event) => setMerge((current) => ({ ...current, sourceStreetId: event.target.value }))}><option value="">Duplicate source</option>{streets.map((street) => <option key={street.id} value={street.id}>{street.streetName} — {street.area}</option>)}</select><select className="input" value={merge.targetStreetId} onChange={(event) => setMerge((current) => ({ ...current, targetStreetId: event.target.value }))}><option value="">Keep target</option>{streets.map((street) => <option key={street.id} value={street.id}>{street.streetName} — {street.area}</option>)}</select></div><button type="button" className="btn-outline mt-2 !py-2 !text-xs" disabled={!merge.sourceStreetId || !merge.targetStreetId || saving} onClick={() => runHierarchyAction(() => communityApi.mergeStreets(merge.sourceStreetId, merge.targetStreetId), 'Streets merged.')}><RefreshCw className="h-3.5 w-3.5" /> Merge Streets</button></div>
          </div>
        </div>
      </section>

      <div id="free-unlocks" className="scroll-mt-24 grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Gift className="h-4 w-4 text-gold-500" /> Create Free Unlock Campaign
          </h2>
          <p className="text-xs leading-5 text-veriq-muted">Choose the property, campaign dates, and how many community members can unlock it at no cost.</p>
          <select className="input" required value={form.propertyId} onChange={(e) => setForm((s) => ({ ...s, propertyId: e.target.value }))}>
            <option value="">Select a property</option>
            {properties.map((property) => (
              <option key={property.id} value={property.id}>{property.title} - {property.area}, {property.state}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" required type="datetime-local" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
            <input className="input" required type="datetime-local" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" min="1" placeholder="Max unlocks" value={form.maximumUnlocks} onChange={(e) => setForm((s) => ({ ...s, maximumUnlocks: e.target.value }))} />
            <input className="input" type="number" min="1" placeholder="Max per user" value={form.maximumUnlocksPerUser} onChange={(e) => setForm((s) => ({ ...s, maximumUnlocksPerUser: e.target.value }))} />
          </div>
          <select className="input" value={form.agreementType} onChange={(e) => setForm((s) => ({ ...s, agreementType: e.target.value as FreeUnlockAgreementType }))}>
            {Object.values(FreeUnlockAgreementType).map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" min="0" placeholder="Amount paid" value={form.amountPaid} onChange={(e) => setForm((s) => ({ ...s, amountPaid: e.target.value }))} />
            <input className="input" placeholder="Payment status" value={form.paymentStatus} onChange={(e) => setForm((s) => ({ ...s, paymentStatus: e.target.value }))} />
          </div>
          <textarea className="input min-h-24 resize-none" placeholder="Internal agreement notes" value={form.internalNote} onChange={(e) => setForm((s) => ({ ...s, internalNote: e.target.value }))} />
          <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <><Plus className="h-4 w-4" /> Create Campaign</>}
          </button>
        </form>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-display text-base font-bold text-navy-900">Free Unlock Campaigns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Unlocks</th>
                  <th className="px-4 py-3">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{campaign.property?.title ?? campaign.propertyId}</p>
                      <p className="text-xs text-slate-400 capitalize">{campaign.agreementType.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{campaign.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{campaign.unlockCount} / {campaign.maximumUnlocks ?? '∞'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(campaign.endDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={4}>No Free Unlock campaigns yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden" data-testid="street-moderation">
          <div className="border-b border-slate-100 p-5">
            <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">Street Moderation</h2>
              <p className="mt-1 text-xs text-veriq-muted">Recent additions appear first. Select a state and location to find older streets.</p>
            </div>
            <div className="flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-2 text-amber-800">
              <BellRing className="h-4 w-4" />
              <span className="text-xs font-bold">{streetStatusCounts.pending ?? 0} pending</span>
            </div>
            </div>
            <div className="mt-4 flex items-center gap-2 rounded-lg bg-blue-50 px-3 py-2 text-xs font-semibold text-blue-800">
              <Clock3 className="h-4 w-4" />
              {locationHistorySelected ? `Showing all streets in ${moderationLocation?.name}` : 'Showing streets added in the past 48 hours'}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input !pl-9" value={streetSearch} onChange={(event) => setStreetSearch(event.target.value)} placeholder="Search street, area, location or landmark" />
              </label>
              <select aria-label="Moderation state" className="input" value={streetStateFilter} onChange={(event) => { setStreetStateFilter(event.target.value); setStreetLocationFilter(''); setStreetAreaFilter(''); }}>
                <option value="">Recent additions (48 hours)</option>
                {moderationStates.map((state) => <option key={state} value={state}>{state}</option>)}
              </select>
              <select aria-label="Moderation location" className="input" value={streetLocationFilter} onChange={(event) => { setStreetLocationFilter(event.target.value); setStreetAreaFilter(''); }} disabled={!streetStateFilter}>
                <option value="">Select location</option>
                {hierarchy.filter((item) => item.isActive && item.state === streetStateFilter).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
              <select aria-label="Moderation area" className="input sm:col-span-2" value={streetAreaFilter} onChange={(event) => setStreetAreaFilter(event.target.value)} disabled={!streetLocationFilter}>
                <option value="">All areas</option>
                {moderationLocation?.areas?.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
              </select>
            </div>
            <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
              {(['all', ...Object.values(StreetStatus)] as const).map((status) => {
                const count = status === 'all' ? scopedStreets.length : streetStatusCounts[status] ?? 0;
                const active = streetStatusFilter === status;
                return <button key={status} type="button" onClick={() => setStreetStatusFilter(status)} className={`whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold ${active ? 'bg-navy-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}>
                  <span className="capitalize">{status}</span> <span className={active ? 'text-white/70' : 'text-slate-400'}>{count}</span>
                </button>;
              })}
            </div>
          </div>
          <div className="max-h-[680px] divide-y divide-slate-100 overflow-y-auto">
            {filteredStreets.map((street) => (
              <div key={street.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{street.streetName}</p>
                    <p className="mt-1 text-xs text-veriq-muted">{street.area}, {street.city}, {street.state}</p>
                    {street.landmark && <p className="mt-1 text-xs text-slate-400">Landmark: {street.landmark}</p>}
                  </div>
                  <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{street.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  {street.status !== StreetStatus.APPROVED && <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.APPROVED)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>}
                  {street.status !== StreetStatus.REJECTED && <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.REJECTED)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>}
                  {street.status !== StreetStatus.DISABLED && <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.DISABLED)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    Disable
                  </button>}
                </div>
              </div>
            ))}
            {filteredStreets.length === 0 && <div className="p-10 text-center"><MapPin className="mx-auto mb-3 h-6 w-6 text-slate-300" /><p className="text-sm font-semibold text-slate-600">{streetStateFilter && !streetLocationFilter ? 'Select a location' : 'No matching streets'}</p><p className="mt-1 text-xs text-slate-400">{streetStateFilter && !streetLocationFilter ? 'Choose a location to view its full street history.' : 'Try another status, area, or search term.'}</p></div>}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">Contribution Moderation</h2>
              <p className="mt-1 text-xs text-veriq-muted">Review contributor reports before they affect public intelligence.</p>
            </div>
            <Flag className="h-5 w-5 text-amber-500" />
          </div>
          <div className="divide-y divide-slate-100">
            {contributions.map((contribution) => (
              <div key={contribution.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{contribution.street?.streetName ?? contribution.streetId}</p>
                    <p className="mt-1 text-xs text-veriq-muted capitalize">{contribution.relationshipType.replace(/_/g, ' ')} · {contribution.relationshipRecency.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-slate-400">{contribution.answers?.length ?? 0} category answers</p>
                  </div>
                  <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{contribution.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.APPROVED)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.REJECTED)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.FLAGGED)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    <Flag className="mr-1 inline h-3.5 w-3.5" /> Flag
                  </button>
                </div>
              </div>
            ))}
            {contributions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No contributions awaiting moderation.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
