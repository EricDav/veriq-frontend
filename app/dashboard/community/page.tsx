'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { CheckCircle, Clock, Copy, MapPin, RefreshCw, Send, UserPlus, Users, X } from 'lucide-react';
import { communityApi, locationsApi } from '@/lib/api';
import {
  type AllowedState,
  type CommunityArea,
  type CommunityLocation,
  ContributorStatus,
  StreetRelationshipRecency,
  StreetRelationshipType,
  type ContributorProfile,
  type CreateContributionDto,
  type IntelligenceCategory,
  type Street,
  type StreetContribution,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const relationshipOptions = [
  { value: StreetRelationshipType.CURRENTLY_LIVE, label: 'I currently live on this street' },
  { value: StreetRelationshipType.CURRENTLY_WORK, label: 'I currently work on this street' },
  { value: StreetRelationshipType.PREVIOUSLY_LIVED, label: 'I previously lived on this street' },
  { value: StreetRelationshipType.PREVIOUSLY_WORKED, label: 'I previously worked on this street' },
];

const recencyOptions = [
  { value: StreetRelationshipRecency.CURRENT, label: 'Current' },
  { value: StreetRelationshipRecency.LESS_THAN_3_MONTHS, label: 'Less than 3 months ago' },
  { value: StreetRelationshipRecency.THREE_TO_SIX_MONTHS, label: '3-6 months ago' },
  { value: StreetRelationshipRecency.SIX_TO_TWELVE_MONTHS, label: '6-12 months ago' },
];

function statusCopy(status?: ContributorStatus) {
  if (status === ContributorStatus.ACTIVE) return 'Active';
  if (status === ContributorStatus.EXPIRED) return 'Expired';
  if (status === ContributorStatus.SUSPENDED) return 'Suspended';
  return 'Not Yet Activated';
}

export default function CommunityDashboardPage() {
  const params = useSearchParams();
  const preselectedStreetId = params.get('streetId') ?? '';
  const { success, error } = useToast();
  const [profile, setProfile] = useState<ContributorProfile | null>(null);
  const [categories, setCategories] = useState<IntelligenceCategory[]>([]);
  const [popular, setPopular] = useState<Street[]>([]);
  const [contributions, setContributions] = useState<StreetContribution[]>([]);
  const [referralCode, setReferralCode] = useState('');
  const [activeStates, setActiveStates] = useState<AllowedState[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [editingContributionId, setEditingContributionId] = useState<string | null>(null);
  const [existingStates, setExistingStates] = useState<string[]>([]);
  const [existingCities, setExistingCities] = useState<string[]>([]);
  const [existingAreas, setExistingAreas] = useState<string[]>([]);
  const [existingStreets, setExistingStreets] = useState<Street[]>([]);
  const [existingLocations, setExistingLocations] = useState<CommunityLocation[]>([]);
  const [existingAreaRecords, setExistingAreaRecords] = useState<CommunityArea[]>([]);
  const [newLocations, setNewLocations] = useState<CommunityLocation[]>([]);
  const [newAreas, setNewAreas] = useState<CommunityArea[]>([]);
  const [existingState, setExistingState] = useState('');
  const [existingCity, setExistingCity] = useState('');
  const [existingArea, setExistingArea] = useState('');

  const [streetMode, setStreetMode] = useState<'existing' | 'new'>(preselectedStreetId ? 'existing' : 'new');
  const [streetId, setStreetId] = useState(preselectedStreetId);
  const [street, setStreet] = useState({ state: '', city: '', area: '', streetName: '', landmark: '' });
  const [relationshipType, setRelationshipType] = useState<StreetRelationshipType>(StreetRelationshipType.CURRENTLY_LIVE);
  const [relationshipRecency, setRelationshipRecency] = useState<StreetRelationshipRecency>(StreetRelationshipRecency.CURRENT);
  const [answers, setAnswers] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    try {
      const statusRes = await communityApi.myStatus();
      setProfile(statusRes.data);
      const [categoriesRes, contributionsRes, referralRes, statesRes, streetLocationsRes] = await Promise.all([
        communityApi.categories(),
        communityApi.myContributions(),
        communityApi.referralCode(),
        locationsApi.activeStates(),
        communityApi.streetLocations(),
      ]);
      setCategories(categoriesRes.data.filter((category) => category.isActive));
      setContributions(contributionsRes.data);
      setReferralCode(referralRes.data.referralCode);
      setActiveStates(statesRes.data);
      setExistingStates(streetLocationsRes.data.states);
      if (statusRes.data.joinedAt) {
        const popularRes = await communityApi.popularStreets();
        setPopular(popularRes.data);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to load community dashboard');
    } finally {
      setLoading(false);
    }
  };

  const referralLink = referralCode && typeof window !== 'undefined'
    ? `${window.location.origin}/auth/register?ref=${encodeURIComponent(referralCode)}`
    : referralCode;

  const copyReferral = async () => {
    if (!referralLink) return;
    try {
      await navigator.clipboard.writeText(referralLink);
      success('Referral link copied.');
    } catch {
      error('Unable to copy referral link.');
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!preselectedStreetId || !popular.length || existingState) return;
    const selected = popular.find((item) => item.id === preselectedStreetId);
    if (!selected) return;
    setExistingState(selected.state); setExistingCity(selected.city); setExistingArea(selected.area);
    setExistingCities([selected.city]); setExistingAreas([selected.area]); setExistingStreets([selected]);
  }, [existingState, popular, preselectedStreetId]);

  useEffect(() => {
    if (editingContributionId) return;
    setExistingCity(''); setExistingArea(''); setExistingCities([]); setExistingAreas([]); setStreetId('');
    if (!existingState) return;
    communityApi.streetLocations({ state: existingState }).then((res) => { setExistingCities(res.data.cities); setExistingLocations(res.data.locations); }).catch(() => { setExistingCities([]); setExistingLocations([]); });
  }, [editingContributionId, existingState]);

  useEffect(() => {
    if (editingContributionId) return;
    setExistingArea(''); setExistingAreas([]); setStreetId('');
    if (!existingState || !existingCity) return;
    communityApi.streetLocations({ state: existingState, city: existingCity }).then((res) => { setExistingAreas(res.data.areas); setExistingAreaRecords(res.data.areaRecords); }).catch(() => { setExistingAreas([]); setExistingAreaRecords([]); });
  }, [editingContributionId, existingCity, existingState]);

  useEffect(() => {
    if (editingContributionId || !existingState || !existingCity) return;
    communityApi.searchStreets({ state: existingState, city: existingCity, area: existingArea || undefined, locationId: existingLocations.find((item) => item.name === existingCity)?.id, areaId: existingAreaRecords.find((item) => item.name === existingArea)?.id })
      .then((res) => setExistingStreets(res.data))
      .catch(() => setExistingStreets([]));
  }, [editingContributionId, existingArea, existingAreaRecords, existingCity, existingLocations, existingState]);

  useEffect(() => {
    setStreet((current) => ({ ...current, city: '', area: '' })); setNewLocations([]); setNewAreas([]);
    if (!street.state) return;
    communityApi.streetLocations({ state: street.state }).then((res) => setNewLocations(res.data.locations)).catch(() => setNewLocations([]));
  }, [street.state]);

  useEffect(() => {
    setStreet((current) => ({ ...current, area: '' })); setNewAreas([]);
    if (!street.state || !street.city) return;
    communityApi.streetLocations({ state: street.state, city: street.city }).then((res) => setNewAreas(res.data.areaRecords)).catch(() => setNewAreas([]));
  }, [street.city, street.state]);

  const answeredAll = useMemo(
    () => categories.length > 0 && categories.every((category) => answers[category.id]),
    [answers, categories],
  );

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!answeredAll) {
      error('Please answer every Street Intelligence category.');
      return;
    }
    setSubmitting(true);
    try {
      const dto: CreateContributionDto = {
        relationshipType,
        relationshipRecency,
        answers: categories.map((category) => ({ categoryId: category.id, optionId: answers[category.id] })),
      };
      if (!editingContributionId) {
        if (streetMode === 'existing') dto.streetId = streetId;
      else dto.street = { ...street, locationId: newLocations.find((item) => item.name === street.city)?.id, areaId: newAreas.find((item) => item.name === street.area)?.id };
      }
      if (editingContributionId) {
        await communityApi.updateContribution(editingContributionId, dto);
        success('Street Intelligence updated successfully.');
      } else {
        await communityApi.createContribution(dto);
        success('Street Intelligence submitted. Community Contributor access is active.');
      }
      setAnswers({});
      setEditingContributionId(null);
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to submit Street Intelligence');
    } finally {
      setSubmitting(false);
    }
  };

  const editContribution = (item: StreetContribution) => {
    if (!item.street) {
      error('Street details are unavailable for this contribution.');
      return;
    }
    setEditingContributionId(item.id);
    setStreetMode('existing');
    setStreetId(item.streetId);
    setExistingState(item.street.state);
    setExistingCity(item.street.city);
    setExistingArea(item.street.area);
    setExistingCities([item.street.city]);
    setExistingAreas([item.street.area]);
    setExistingStreets([item.street]);
    if (item.street.locationId) setExistingLocations([{ id: item.street.locationId, state: item.street.state, name: item.street.city, normalisedName: item.street.city.toLowerCase(), isActive: true, latitude: null, longitude: null }]);
    if (item.street.areaId) setExistingAreaRecords([{ id: item.street.areaId, locationId: item.street.locationId ?? '', name: item.street.area, normalisedName: item.street.area.toLowerCase(), isActive: true, latitude: null, longitude: null }]);
    setRelationshipType(item.relationshipType);
    setRelationshipRecency(item.relationshipRecency);
    setAnswers(Object.fromEntries((item.answers ?? []).map((answer) => [answer.categoryId, answer.optionId])));
    document.getElementById('contribute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingContributionId(null);
    setStreetId(''); setExistingState(''); setExistingCity(''); setExistingArea(''); setAnswers({});
  };

  const confirm = async (id: string) => {
    try {
      await communityApi.confirmContribution(id);
      success('Street report confirmed and freshness updated.');
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to confirm report.');
    }
  };

  if (loading) {
    return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;
  }

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div>
        <h1 className="font-display text-2xl font-black text-navy-900">Community Contributor</h1>
        <p className="mt-1 text-sm text-veriq-muted">Share reliable street-level intelligence and unlock Community Benefits.</p>
      </div>

      {!profile?.joinedAt && (
        <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          <p className="font-bold">Contribute your first Street Intelligence report to join.</p>
          <p className="mt-1 text-xs leading-5 text-emerald-800">Choose an existing street or submit a missing street below. Your community membership starts when the contribution is submitted.</p>
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs text-slate-500">Status</p>
          <p className="mt-1 text-xl font-black text-navy-900">{statusCopy(profile?.contributorStatus)}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Access expires</p>
          <p className="mt-1 text-xl font-black text-navy-900">
            {profile?.expiresAt ? new Date(profile.expiresAt).toLocaleDateString() : 'Not active'}
          </p>
        </div>
        <div className="card p-5">
          <p className="text-xs text-slate-500">Contributed streets</p>
          <p className="mt-1 text-xl font-black text-navy-900">{contributions.length}</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <form id="contribute" onSubmit={submit} className="card space-y-5 p-6">
          <div>
            <div className="flex items-center justify-between gap-3">
              <h2 className="font-display text-base font-bold text-navy-900">{editingContributionId ? 'Update Street Intelligence' : 'Contribute Street Intelligence'}</h2>
              {editingContributionId && <button type="button" onClick={cancelEdit} className="text-xs font-bold text-slate-500"><X className="mr-1 inline h-3.5 w-3.5" /> Cancel</button>}
            </div>
            <p className="mt-1 text-xs text-veriq-muted">No photos or videos. Just one answer per approved street category.</p>
          </div>

          <div className={`flex rounded-xl bg-slate-100 p-1 ${editingContributionId ? 'pointer-events-none opacity-60' : ''}`}>
            <button type="button" onClick={() => setStreetMode('existing')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetMode === 'existing' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>Select street</button>
            <button type="button" onClick={() => setStreetMode('new')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetMode === 'new' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>Add new street</button>
          </div>

          {streetMode === 'existing' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <select aria-label="State" value={existingState} onChange={(event) => setExistingState(event.target.value)} className="input" required disabled={Boolean(editingContributionId)}>
                <option value="">Select state</option>
                {existingStates.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="Location" value={existingCity} onChange={(event) => setExistingCity(event.target.value)} className="input" required disabled={!existingState || Boolean(editingContributionId)}>
                <option value="">Select location</option>
                {existingCities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="Area" value={existingArea} onChange={(event) => setExistingArea(event.target.value)} className="input" disabled={!existingCity || Boolean(editingContributionId)}>
                <option value="">All areas</option>
                {existingAreas.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="Street" value={streetId} onChange={(event) => setStreetId(event.target.value)} className="input" required disabled={!existingCity || Boolean(editingContributionId)}>
                <option value="">Select street</option>
                {existingStreets.map((item) => (
                  <option key={item.id} value={item.id}>{item.streetName} - {item.area}, {item.state}</option>
                ))}
              </select>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={street.state} onChange={(e) => setStreet((s) => ({ ...s, state: e.target.value }))} required>
                <option value="">Select state</option>
                {activeStates.map((stateOption) => (
                  <option key={stateOption.id} value={stateOption.name}>{stateOption.name}</option>
                ))}
              </select>
              <select className="input" aria-label="Location" value={street.city} onChange={(e) => setStreet((s) => ({ ...s, city: e.target.value }))} required disabled={!street.state}>
                <option value="">Select location</option>
                {newLocations.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <select className="input" aria-label="Area or Neighbourhood" value={street.area} onChange={(e) => setStreet((s) => ({ ...s, area: e.target.value }))} required disabled={!street.city}>
                <option value="">Select area / neighbourhood</option>
                {newAreas.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <input className="input" placeholder="Street name" value={street.streetName} onChange={(e) => setStreet((s) => ({ ...s, streetName: e.target.value }))} required />
              <input className="input sm:col-span-2" placeholder="Nearby landmark (optional)" value={street.landmark} onChange={(e) => setStreet((s) => ({ ...s, landmark: e.target.value }))} />
            </div>
          )}

          <div className="grid gap-3">
            <select className="input" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value as StreetRelationshipType)}>
              {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={relationshipRecency} onChange={(e) => setRelationshipRecency(e.target.value as StreetRelationshipRecency)}>
              {recencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          <div className="space-y-4">
            {categories.map((category) => (
              <div key={category.id}>
                <p className="mb-2 text-xs font-bold text-navy-900">{category.name}</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-5">
                  {category.options.filter((option) => option.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((option) => (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setAnswers((state) => ({ ...state, [category.id]: option.id }))}
                      className={`rounded-xl border px-3 py-2 text-xs font-bold transition-colors ${
                        answers[category.id] === option.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>

          <button type="submit" className="btn-primary w-full justify-center" disabled={submitting}>
            {submitting ? <LoadingSpinner size="sm" /> : <><Send className="h-4 w-4" /> {editingContributionId ? 'Save Intelligence Update' : 'Submit Intelligence'}</>}
          </button>
        </form>

        <div className="space-y-4">
          <div className="card p-6">
            <h2 className="font-display mb-4 text-base font-bold text-navy-900">Extend Community Access</h2>
            <div className="grid gap-2 text-sm">
              <Link href="#contribute" className="rounded-xl border border-slate-100 p-3 font-semibold text-navy-800">Add Intelligence for Another Street</Link>
              <p className="rounded-xl border border-slate-100 p-3 font-semibold text-navy-800">Confirm a Previous Street Report</p>
              <p className="rounded-xl border border-slate-100 p-3 font-semibold text-navy-800">Update a Previous Street Report</p>
            </div>
          </div>

          <div className="card p-6">
            <h2 className="font-display mb-2 flex items-center gap-2 text-base font-bold text-navy-900">
              <UserPlus className="h-4 w-4 text-veriq-secondary" /> Invite a Friend
            </h2>
            <p className="mb-4 text-xs text-veriq-muted">Share your referral link. Qualified referrals can extend your Community Contributor access.</p>
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Referral code</p>
              <p className="mt-1 break-all font-mono text-sm font-bold text-navy-900">{referralCode || 'Generating...'}</p>
            </div>
            <button type="button" onClick={copyReferral} disabled={!referralCode} className="mt-3 w-full rounded-lg bg-navy-900 px-4 py-2.5 text-xs font-bold text-white hover:bg-navy-800 disabled:opacity-60">
              <Copy className="mr-2 inline h-3.5 w-3.5" /> Copy Referral Link
            </button>
          </div>

          <div className="card p-6">
            <h2 className="font-display mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
              <MapPin className="h-4 w-4 text-veriq-secondary" /> My Contributed Streets
            </h2>
            {contributions.length === 0 ? (
              <p className="text-sm text-veriq-muted">No contributed streets yet.</p>
            ) : (
              <div className="space-y-3">
                {contributions.map((item) => (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-bold text-navy-900">{item.street?.streetName ?? item.streetId}</p>
                        <p className="mt-1 text-xs text-veriq-muted capitalize">{item.relationshipType.replace(/_/g, ' ')}</p>
                        <p className="mt-1 flex items-center gap-1 text-xs text-slate-400">
                          <Clock className="h-3 w-3" /> Last contribution: {new Date(item.lastUpdatedAt ?? item.submittedAt).toLocaleDateString()}
                        </p>
                      </div>
                      <span className="badge bg-slate-100 text-[10px] text-slate-600 capitalize">{item.status}</span>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button type="button" onClick={() => confirm(item.id)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                        <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Confirm
                      </button>
                      <button type="button" onClick={() => editContribution(item)} className="rounded-lg bg-blue-50 px-3 py-2 text-xs font-bold text-blue-700">
                        <RefreshCw className="mr-1 inline h-3.5 w-3.5" /> Update
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
        <Users className="mr-2 inline h-4 w-4" />
        Street Intelligence is community-powered. Veriq calculates the results from approved contributor votes, but these reports are not independently verified by Veriq Property.
      </div>
    </div>
  );
}
