'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { BarChart3, BellRing, CheckCircle, Clock3, Flag, Gift, MapPin, Plus, RefreshCw, Search, XCircle, Trash2, Save, Pencil } from 'lucide-react';
import { communityApi, locationsApi, propertiesApi } from '@/lib/api';
import {
  ContributionStatus,
  FreeUnlockAgreementType,
  IntelligenceSourceType,
  StreetStatus,
  type FreeUnlockCampaign,
  type Property,
  type CommunityLocation,
  type Street,
  type StreetContribution,
  type AllowedState,
  type IntelligenceCategory,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

type DirectoryModal = {
  kind: 'lga' | 'area' | 'street';
  mode: 'add' | 'edit';
  id?: string;
  name: string;
};

function StreetCombobox({ label, search, onSearch, streets, selectedId, onSelect, disabled }: {
  label: string;
  search: string;
  onSearch: (value: string) => void;
  streets: Street[];
  selectedId: string;
  onSelect: (street: Street) => void;
  disabled?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return <div className="relative">
    <Search className="pointer-events-none absolute left-3 top-1/2 z-10 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      role="combobox"
      aria-label={label}
      aria-expanded={open}
      aria-controls={`${label.replace(/\s+/g, '-').toLowerCase()}-options`}
      className="input !pl-9"
      value={search}
      disabled={disabled}
      placeholder="Search and select street"
      autoComplete="off"
      onFocus={() => setOpen(true)}
      onBlur={() => window.setTimeout(() => setOpen(false), 150)}
      onChange={(event) => { onSearch(event.target.value); setOpen(true); }}
    />
    {open && !disabled && <div id={`${label.replace(/\s+/g, '-').toLowerCase()}-options`} role="listbox" className="absolute z-30 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
      {streets.map((street) => <button key={street.id} type="button" role="option" aria-selected={selectedId === street.id} onMouseDown={(event) => event.preventDefault()} onClick={() => { onSearch(street.streetName); onSelect(street); setOpen(false); }} className={`block w-full rounded-md px-3 py-2 text-left ${selectedId === street.id ? 'bg-emerald-50' : 'hover:bg-slate-50'}`}><span className="block text-sm font-bold text-navy-900">{street.streetName}</span><span className="block text-xs text-slate-500">{street.area}, {street.city}</span></button>)}
      {streets.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No matching approved streets.</p>}
    </div>}
  </div>;
}

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
  const [categories, setCategories] = useState<IntelligenceCategory[]>([]);
  const [directoryState, setDirectoryState] = useState('Rivers');
  const [stateToActivate, setStateToActivate] = useState('');
  const [areaLocationId, setAreaLocationId] = useState('');
  const [directoryAreaId, setDirectoryAreaId] = useState('');
  const [directoryStreetSearch, setDirectoryStreetSearch] = useState('');
  const [directoryStreets, setDirectoryStreets] = useState<Street[]>([]);
  const [streetEdit, setStreetEdit] = useState({ streetId: '', locationId: '', areaId: '', streetName: '', latitude: '', longitude: '' });
  const [observation, setObservation] = useState({ streetId: '', categoryId: '', optionId: '', supplementaryValue: [] as string[] });
  const [observationScope, setObservationScope] = useState({ state: '', locationId: '', areaId: '' });
  const [observationStreets, setObservationStreets] = useState<Street[]>([]);
  const [observationSearch, setObservationSearch] = useState('');
  const [observationAnswers, setObservationAnswers] = useState<Record<string, { optionId: string; supplementaryValue: string[] }>>({});
  const [loadingObservations, setLoadingObservations] = useState(false);
  const [directoryModal, setDirectoryModal] = useState<DirectoryModal | null>(null);
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
  const [contributionStatusFilter, setContributionStatusFilter] = useState<ContributionStatus | 'all'>(ContributionStatus.PENDING);
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
        : Promise.all([
          communityApi.adminStreets({ status: StreetStatus.PENDING }),
          communityApi.adminStreets({ recentHours: 48 }),
        ]).then(([pending, recent]) => ({
          data: Array.from(new Map([...pending.data, ...recent.data].map((street) => [street.id, street])).values()),
        }));
      const [analyticsRes, campaignsRes, propertiesRes, statesRes, categoriesRes] = await Promise.all([
        communityApi.adminAnalytics(),
        communityApi.adminCampaigns(),
        propertiesApi.listAdmin({ page: 1, limit: 100 }),
        locationsApi.allStates(),
        communityApi.categories(),
      ]);
      const [streetsRes, contributionsRes, hierarchyRes] = await Promise.all([
        streetsRequest,
        communityApi.adminContributions(contributionStatusFilter === 'all' ? undefined : contributionStatusFilter),
        communityApi.adminLocations(directoryState),
      ]);
      setAnalytics(analyticsRes.data as Record<string, unknown>);
      setCampaigns(campaignsRes.data);
      setProperties(propertiesRes.data);
      setDirectoryStates(statesRes.data);
      setCategories(categoriesRes.data.filter((item) => item.isActive));
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

  const saveDirectoryModal = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!directoryModal?.name.trim()) return;
    const name = directoryModal.name.trim();
    if (directoryModal.kind === 'lga') {
      await runHierarchyAction(
        () => directoryModal.mode === 'add'
          ? communityApi.createLocation({ state: directoryState, name })
          : communityApi.updateLocation(directoryModal.id!, { state: directoryState, name, isActive: true }),
        `LGA ${directoryModal.mode === 'add' ? 'added' : 'updated'}.`,
      );
    } else if (directoryModal.kind === 'area') {
      await runHierarchyAction(
        () => directoryModal.mode === 'add'
          ? communityApi.createArea({ locationId: areaLocationId, name })
          : communityApi.updateArea(directoryModal.id!, { locationId: areaLocationId, name, isActive: true }),
        `Area ${directoryModal.mode === 'add' ? 'added' : 'updated'}.`,
      );
    } else {
      await runHierarchyAction(
        () => directoryModal.mode === 'add'
          ? communityApi.createStreetAdmin({
            state: directoryState,
            city: selectedDirectoryLocation?.name ?? '',
            area: directoryAreas.find((item) => item.id === directoryAreaId)?.name ?? '',
            locationId: areaLocationId,
            areaId: directoryAreaId,
            streetName: name,
          })
          : communityApi.updateStreetAdmin(directoryModal.id!, { streetName: name }),
        `Street ${directoryModal.mode === 'add' ? 'added' : 'updated'}.`,
      );
    }
    setDirectoryModal(null);
  };

  const observationLocations = hierarchy.filter((item) => item.isActive && item.state === observationScope.state);
  const directoryLocations = hierarchy.filter((item) => item.state === directoryState);
  const selectedDirectoryLocation = directoryLocations.find((item) => item.id === areaLocationId);
  const directoryAreas = selectedDirectoryLocation?.areas?.filter((item) => item.isActive) ?? [];
  const moderationLocation = hierarchy.find((item) => item.id === streetLocationFilter);
  const moderationStates = useMemo(() => Array.from(new Set(hierarchy.filter((item) => item.isActive).map((item) => item.state))).sort(), [hierarchy]);
  const locationHistorySelected = Boolean(streetStateFilter && streetLocationFilter);
  const scopedStreets = useMemo(() => {
    if (locationHistorySelected) {
      return streets.filter((street) => street.state === streetStateFilter && street.locationId === streetLocationFilter);
    }
    if (streetStateFilter) return [];
    const recentCutoff = Date.now() - 48 * 60 * 60 * 1000;
    return streets.filter((street) => street.status === StreetStatus.PENDING || new Date(street.createdAt).getTime() >= recentCutoff);
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
        if (streetStateFilter) {
          const response = await communityApi.adminStreets({ state: streetStateFilter, locationId: streetLocationFilter });
          setStreets(response.data);
        } else {
          const [pending, recent] = await Promise.all([
            communityApi.adminStreets({ status: StreetStatus.PENDING }),
            communityApi.adminStreets({ recentHours: 48 }),
          ]);
          setStreets(Array.from(new Map([...pending.data, ...recent.data].map((street) => [street.id, street])).values()));
        }
      } catch (err) {
        error(err instanceof Error ? err.message : 'Unable to load streets');
      }
    };
    void refreshStreetScope();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [streetLocationFilter, streetStateFilter]);

  useEffect(() => {
    if (loading) return;
    communityApi.adminContributions(contributionStatusFilter === 'all' ? undefined : contributionStatusFilter)
      .then((response) => setContributions(response.data))
      .catch((err) => error(err instanceof Error ? err.message : 'Unable to load contributions'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contributionStatusFilter]);

  useEffect(() => {
    const states = Array.from(new Set([directoryState, observationScope.state].filter(Boolean)));
    if (!states.length) return;
    Promise.all(states.map(async (state) => ({ state, data: (await communityApi.adminLocations(state)).data })))
      .then((responses) => setHierarchy((current) => [
        ...current.filter((item) => !states.includes(item.state)),
        ...responses.flatMap((response) => response.data),
      ]))
      .catch((err) => error(err instanceof Error ? err.message : 'Unable to load the selected location hierarchy'));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [directoryState, observationScope.state]);

  useEffect(() => {
    setObservation((current) => ({ ...current, streetId: '' }));
    setObservationAnswers({});
    setObservationStreets([]);
    setObservationSearch('');
  }, [observationScope.locationId, observationScope.state]);

  useEffect(() => {
    if (!observationScope.state || !observationScope.locationId) return;
    const timeout = window.setTimeout(() => communityApi.adminStreets({ state: observationScope.state, locationId: observationScope.locationId, status: StreetStatus.APPROVED, q: observationSearch || undefined })
      .then((response) => setObservationStreets(response.data.filter((street) => street.status === StreetStatus.APPROVED)))
      .catch(() => setObservationStreets([])), 250);
    return () => window.clearTimeout(timeout);
  }, [observationScope.locationId, observationScope.state, observationSearch]);

  useEffect(() => {
    setDirectoryStreets([]);
    if (!areaLocationId) return;
    const timeout = window.setTimeout(() => communityApi.adminStreets({
      state: directoryState,
      locationId: areaLocationId,
      areaId: directoryAreaId || undefined,
      status: StreetStatus.APPROVED,
      q: directoryStreetSearch || undefined,
    }).then((response) => setDirectoryStreets(response.data)).catch(() => setDirectoryStreets([])), 250);
    return () => window.clearTimeout(timeout);
  }, [areaLocationId, directoryAreaId, directoryState, directoryStreetSearch]);

  useEffect(() => {
    setObservationAnswers({});
    if (!observation.streetId) return;
    setLoadingObservations(true);
    communityApi.initialObservations(observation.streetId)
      .then((response) => setObservationAnswers(Object.fromEntries(response.data.map((item) => [item.categoryId, {
        optionId: item.optionId,
        supplementaryValue: item.supplementaryValue ?? [],
      }]))))
      .catch((err) => error(err instanceof Error ? err.message : 'Unable to load initial intelligence'))
      .finally(() => setLoadingObservations(false));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [observation.streetId]);

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
        <div><h2 className="font-display text-lg font-bold text-navy-900">Location Directory</h2><p className="mt-1 text-xs text-veriq-muted">Select one level at a time: State → LGA → Area → Street.</p></div>
        <div className="card space-y-5 p-5">
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Approved state</label><select aria-label="Directory state" className="input" value={directoryState} onChange={(event) => { setDirectoryState(event.target.value); setAreaLocationId(''); setDirectoryAreaId(''); setDirectoryStreets([]); }}><option value="">Select state</option>{directoryStates.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}</select></div>
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Local government</label><div className="flex gap-2"><select aria-label="Directory LGA" className="input" value={areaLocationId} disabled={!directoryState} onChange={(event) => { setAreaLocationId(event.target.value); setDirectoryAreaId(''); }}><option value="">Select LGA</option>{directoryLocations.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="btn-outline !px-3" title="Add LGA" onClick={() => setDirectoryModal({ kind: 'lga', mode: 'add', name: '' })}><Plus className="h-4 w-4" /></button>{selectedDirectoryLocation && <button type="button" className="btn-outline !px-3" title="Edit LGA" onClick={() => setDirectoryModal({ kind: 'lga', mode: 'edit', id: selectedDirectoryLocation.id, name: selectedDirectoryLocation.name })}><Pencil className="h-4 w-4" /></button>}</div></div>
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Area / neighbourhood</label><div className="flex gap-2"><select aria-label="Directory area" className="input" value={directoryAreaId} disabled={!areaLocationId} onChange={(event) => setDirectoryAreaId(event.target.value)}><option value="">All areas</option>{directoryAreas.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="btn-outline !px-3" disabled={!areaLocationId} title="Add area" onClick={() => setDirectoryModal({ kind: 'area', mode: 'add', name: '' })}><Plus className="h-4 w-4" /></button>{directoryAreaId && <button type="button" className="btn-outline !px-3" title="Edit area" onClick={() => { const area = directoryAreas.find((item) => item.id === directoryAreaId); if (area) setDirectoryModal({ kind: 'area', mode: 'edit', id: area.id, name: area.name }); }}><Pencil className="h-4 w-4" /></button>}</div></div>
            <div><label className="mb-1.5 block text-xs font-bold text-slate-600">Street</label><div className="flex gap-2"><div className="min-w-0 flex-1"><StreetCombobox label="Directory street" search={directoryStreetSearch} onSearch={(value) => { setDirectoryStreetSearch(value); if (value !== streetEdit.streetName) setStreetEdit((current) => ({ ...current, streetId: '' })); }} streets={directoryStreets} selectedId={streetEdit.streetId} disabled={!areaLocationId} onSelect={(item) => setStreetEdit({ streetId: item.id, locationId: item.locationId ?? '', areaId: item.areaId ?? '', streetName: item.streetName, latitude: item.latitude?.toString() ?? '', longitude: item.longitude?.toString() ?? '' })} /></div><button type="button" className="btn-outline !px-3" disabled={!directoryAreaId} title="Add street" onClick={() => setDirectoryModal({ kind: 'street', mode: 'add', name: '' })}><Plus className="h-4 w-4" /></button></div></div>
          </div>
          {streetEdit.streetId && <div className="border-t border-slate-100 pt-4"><div className="flex flex-wrap gap-2"><button type="button" className="btn-outline !py-2 !text-xs" onClick={() => setDirectoryModal({ kind: 'street', mode: 'edit', id: streetEdit.streetId, name: streetEdit.streetName })}><Pencil className="h-3.5 w-3.5" /> Edit street</button><button type="button" className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700" onClick={() => runHierarchyAction(() => communityApi.deleteStreetAdmin(streetEdit.streetId), 'Street disabled.')}><Trash2 className="mr-1 inline h-3.5 w-3.5" /> Disable</button></div></div>}
          <div className="border-t border-slate-100 pt-4"><p className="mb-2 text-xs font-bold text-navy-900">Add another state</p><div className="flex max-w-xl gap-2"><select aria-label="Add community state" className="input" value={stateToActivate} onChange={(event) => setStateToActivate(event.target.value)}><option value="">Select unapproved state</option>{directoryStates.filter((item) => !item.isActive).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select><button type="button" className="btn-primary !px-3" disabled={!stateToActivate || saving} onClick={() => { const selected = directoryStates.find((item) => item.id === stateToActivate); if (selected) void runHierarchyAction(() => locationsApi.updateState(selected.id, true), `${selected.name} approved.`).then(() => setStateToActivate('')); }}><Plus className="h-4 w-4" /></button></div></div>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <div>
          <h2 className="font-display text-lg font-bold text-navy-900">Initial Street Intelligence</h2>
          <p className="mt-1 text-xs text-veriq-muted">Select a street to update existing responses or complete the empty questionnaire when no initial intelligence exists.</p>
        </div>
        <div className="grid gap-3 md:grid-cols-4">
          <select className="input" aria-label="Initial intelligence state" value={observationScope.state} onChange={(event) => setObservationScope({ state: event.target.value, locationId: '', areaId: '' })}>
            <option value="">State</option>
            {directoryStates.filter((item) => item.isActive).map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
          </select>
          <select className="input" aria-label="Initial intelligence location" value={observationScope.locationId} onChange={(event) => setObservationScope((current) => ({ ...current, locationId: event.target.value, areaId: '' }))} disabled={!observationScope.state}>
            <option value="">Location</option>
            {observationLocations.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}
          </select>
          <div className="md:col-span-2"><StreetCombobox label="Initial intelligence street" search={observationSearch} onSearch={(value) => { setObservationSearch(value); const selected = observationStreets.find((item) => item.id === observation.streetId); if (value !== selected?.streetName) setObservation((current) => ({ ...current, streetId: '' })); }} streets={observationStreets} selectedId={observation.streetId} disabled={!observationScope.locationId} onSelect={(street) => setObservation((current) => ({ ...current, streetId: street.id }))} /></div>
        </div>
        {loadingObservations ? <div className="flex justify-center py-8"><LoadingSpinner /></div> : observation.streetId && <div className="space-y-3">{categories.map((category) => { const answer = observationAnswers[category.id] ?? { optionId: '', supplementaryValue: [] }; return <fieldset key={category.id} className="rounded-lg border border-slate-200 p-4"><legend className="px-1 text-sm font-bold text-navy-900">{category.question ?? category.name}</legend><div className="mt-2 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">{category.options.filter((option) => option.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((option) => <label key={option.id} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${answer.optionId === option.id ? 'border-emerald-500 bg-emerald-50 text-emerald-800' : 'border-slate-200 text-slate-600'}`}><input type="radio" name={`category-${category.id}`} checked={answer.optionId === option.id} onChange={() => setObservationAnswers((current) => ({ ...current, [category.id]: { ...answer, optionId: option.id } }))} />{option.label}</label>)}</div>{category.supplementaryConfig && <div className="mt-3 flex flex-wrap gap-2">{category.supplementaryConfig.options.map((value) => <label key={value} className="inline-flex items-center gap-2 rounded border border-slate-200 px-2 py-1.5 text-xs"><input type="checkbox" checked={answer.supplementaryValue.includes(value)} onChange={() => setObservationAnswers((current) => ({ ...current, [category.id]: { ...answer, supplementaryValue: answer.supplementaryValue.includes(value) ? answer.supplementaryValue.filter((item) => item !== value) : [...answer.supplementaryValue, value] } }))} />{value}</label>)}</div>}</fieldset>; })}</div>}
        <button
          type="button"
          className="btn-primary"
          disabled={saving || !observation.streetId || !Object.values(observationAnswers).some((answer) => answer.optionId)}
          onClick={() => runHierarchyAction(
            () => Promise.all(Object.entries(observationAnswers).filter(([, answer]) => answer.optionId).map(([categoryId, answer]) => communityApi.upsertObservation({ streetId: observation.streetId, categoryId, optionId: answer.optionId, supplementaryValue: answer.supplementaryValue, sourceType: IntelligenceSourceType.VERIQ_INITIAL }))),
            'Initial Street Intelligence saved.',
          )}
        >
          <Save className="h-4 w-4" /> Save Intelligence
        </button>
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
              {locationHistorySelected ? `Showing all streets in ${moderationLocation?.name}` : 'Showing all pending requests and streets added in the past 48 hours'}
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              <label className="relative sm:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input className="input !pl-9" value={streetSearch} onChange={(event) => setStreetSearch(event.target.value)} placeholder="Search street, area, location or landmark" />
              </label>
              <select aria-label="Moderation state" className="input" value={streetStateFilter} onChange={(event) => { setStreetStateFilter(event.target.value); setStreetLocationFilter(''); setStreetAreaFilter(''); }}>
                <option value="">Pending and recent additions</option>
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
          <div className="flex items-start justify-between gap-4 border-b border-slate-100 p-5">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">Contribution Moderation</h2>
              <p className="mt-1 text-xs text-veriq-muted">Review contributor reports before they affect public intelligence.</p>
            </div>
            <select
              aria-label="Contribution moderation status"
              className="input max-w-36 !py-2 text-xs"
              value={contributionStatusFilter}
              onChange={(event) => setContributionStatusFilter(event.target.value as ContributionStatus | 'all')}
            >
              <option value={ContributionStatus.PENDING}>Pending</option>
              <option value={ContributionStatus.FLAGGED}>Flagged</option>
              <option value={ContributionStatus.APPROVED}>Approved</option>
              <option value={ContributionStatus.REJECTED}>Rejected</option>
              <option value="all">All statuses</option>
            </select>
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
                  {contribution.status !== ContributionStatus.APPROVED && <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.APPROVED)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>}
                  {contribution.status !== ContributionStatus.REJECTED && <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.REJECTED)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>}
                  {contribution.status !== ContributionStatus.FLAGGED && <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.FLAGGED)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    <Flag className="mr-1 inline h-3.5 w-3.5" /> Flag
                  </button>}
                </div>
              </div>
            ))}
            {contributions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No {contributionStatusFilter === 'all' ? '' : `${contributionStatusFilter} `}contributions found.</p>}
          </div>
        </div>
      </div>

      {directoryModal && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-navy-950/55 px-4 py-6" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setDirectoryModal(null); }}>
        <form role="dialog" aria-modal="true" aria-labelledby="directory-modal-title" onSubmit={saveDirectoryModal} className="w-full max-w-md rounded-lg bg-white p-6 shadow-2xl">
          <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase text-emerald-700">Location directory</p><h2 id="directory-modal-title" className="mt-1 font-display text-lg font-black text-navy-900">{directoryModal.mode === 'add' ? 'Add' : 'Edit'} {directoryModal.kind === 'lga' ? 'local government' : directoryModal.kind}</h2></div><button type="button" aria-label="Close directory editor" onClick={() => setDirectoryModal(null)} className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50"><XCircle className="h-4 w-4" /></button></div>
          <label className="mt-5 block"><span className="mb-1.5 block text-xs font-bold text-slate-600">Name</span><input autoFocus className="input" value={directoryModal.name} maxLength={180} onChange={(event) => setDirectoryModal((current) => current ? { ...current, name: event.target.value } : null)} placeholder={`Enter ${directoryModal.kind === 'lga' ? 'local government' : directoryModal.kind} name`} required /></label>
          <div className="mt-6 flex justify-end gap-3"><button type="button" className="btn-outline !py-2.5" onClick={() => setDirectoryModal(null)}>Cancel</button><button type="submit" className="btn-primary !py-2.5" disabled={saving || !directoryModal.name.trim()}>{saving ? <LoadingSpinner size="sm" /> : <><Save className="h-4 w-4" /> Save</>}</button></div>
        </form>
      </div>}
    </div>
  );
}
