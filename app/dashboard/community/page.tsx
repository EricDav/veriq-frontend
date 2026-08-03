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
  ContributionResponseType,
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

type AnswerDraft = {
  responseType: ContributionResponseType;
  optionId?: string;
  supplementaryValue?: string[];
};

export default function CommunityDashboardPage() {
  const params = useSearchParams();
  const preselectedStreetId = params.get('streetId') ?? '';
  const requestedNewStreet = params.get('mode') === 'new';
  const requestedState = params.get('state') ?? '';
  const requestedCity = params.get('city') ?? '';
  const requestedArea = params.get('area') ?? '';
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
  const [streetQuery, setStreetQuery] = useState('');

  const [streetMode, setStreetMode] = useState<'existing' | 'new'>(requestedNewStreet ? 'new' : 'existing');
  const [streetId, setStreetId] = useState(preselectedStreetId);
  const [street, setStreet] = useState({ state: requestedState, city: requestedCity, area: requestedArea, streetName: '', landmark: '' });
  const [relationshipType, setRelationshipType] = useState<StreetRelationshipType>(StreetRelationshipType.CURRENTLY_LIVE);
  const [relationshipRecency, setRelationshipRecency] = useState<StreetRelationshipRecency>(StreetRelationshipRecency.CURRENT);
  const [answers, setAnswers] = useState<Record<string, AnswerDraft>>({});
  const [questionIndex, setQuestionIndex] = useState(0);
  const preserveRequestedCity = React.useRef(Boolean(requestedState && requestedCity));
  const preserveRequestedArea = React.useRef(Boolean(requestedCity && requestedArea));

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
    setExistingCity(''); setExistingArea(''); setExistingCities([]); setExistingAreas([]); setStreetId(''); setStreetQuery('');
    if (!existingState) return;
    communityApi.streetLocations({ state: existingState }).then((res) => { setExistingCities(res.data.cities); setExistingLocations(res.data.locations); }).catch(() => { setExistingCities([]); setExistingLocations([]); });
  }, [editingContributionId, existingState]);

  useEffect(() => {
    if (editingContributionId) return;
    setExistingArea(''); setExistingAreas([]); setStreetId(''); setStreetQuery(''); setExistingStreets([]);
    if (!existingState || !existingCity) return;
    communityApi.streetLocations({ state: existingState, city: existingCity }).then((res) => { setExistingAreas(res.data.areas); setExistingAreaRecords(res.data.areaRecords); }).catch(() => { setExistingAreas([]); setExistingAreaRecords([]); });
  }, [editingContributionId, existingCity, existingState]);

  useEffect(() => {
    if (editingContributionId || !existingState || !existingCity || streetQuery.trim().length < 2) {
      if (!editingContributionId) setExistingStreets([]);
      return;
    }
    const timeout = window.setTimeout(() => {
      communityApi.searchStreets({
        state: existingState,
        city: existingCity,
        q: streetQuery.trim(),
        locationId: existingLocations.find((item) => item.name === existingCity)?.id,
      })
        .then((res) => setExistingStreets(res.data))
        .catch(() => setExistingStreets([]));
    }, 250);
    return () => window.clearTimeout(timeout);
  }, [editingContributionId, existingCity, existingLocations, existingState, streetQuery]);

  useEffect(() => {
    setStreet((current) => preserveRequestedCity.current ? current : ({ ...current, city: '', area: '' })); setNewLocations([]); setNewAreas([]);
    if (!street.state) return;
    communityApi.streetLocations({ state: street.state }).then((res) => { setNewLocations(res.data.locations); preserveRequestedCity.current = false; }).catch(() => setNewLocations([]));
  }, [street.state]);

  useEffect(() => {
    setStreet((current) => preserveRequestedArea.current ? current : ({ ...current, area: '' })); setNewAreas([]);
    if (!street.state || !street.city) return;
    communityApi.streetLocations({ state: street.state, city: street.city }).then((res) => { setNewAreas(res.data.areaRecords); preserveRequestedArea.current = false; }).catch(() => setNewAreas([]));
  }, [street.city, street.state]);

  const answeredAll = useMemo(
    () => categories.length > 0
      && categories.every((category) => answers[category.id])
      && Object.values(answers).some((answer) => answer.responseType === ContributionResponseType.ANSWERED),
    [answers, categories],
  );
  const currentCategory = categories[questionIndex];
  const currentAnswer = currentCategory ? answers[currentCategory.id] : undefined;

  const setQuestionResponse = (response: AnswerDraft) => {
    if (!currentCategory) return;
    setAnswers((state) => ({ ...state, [currentCategory.id]: response }));
  };

  const skipQuestion = (responseType: ContributionResponseType.SKIPPED | ContributionResponseType.UNKNOWN) => {
    if (!currentCategory) return;
    setAnswers((state) => ({
      ...state,
      [currentCategory.id]: { responseType },
    }));
    setQuestionIndex((value) => Math.min(categories.length - 1, value + 1));
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!editingContributionId && streetMode === 'new') {
      const location = newLocations.find((item) => item.name === street.city);
      const area = newAreas.find((item) => item.name === street.area);
      if (!location || !area || !street.streetName.trim()) {
        error('Select a state, LGA and area, then enter the street name.');
        return;
      }
      setSubmitting(true);
      try {
        await communityApi.createStreet({ ...street, locationId: location.id, areaId: area.id });
        success('Street submitted for admin approval. You can add intelligence after it is approved.');
        setStreet((current) => ({ ...current, streetName: '', landmark: '' }));
        setStreetMode('existing');
        setExistingState(street.state);
        setExistingCity(street.city);
      } catch (err) {
        error(err instanceof Error ? err.message : 'Unable to submit street for approval');
      } finally {
        setSubmitting(false);
      }
      return;
    }
    if (!answeredAll) {
      error('Complete, skip, or mark every Street Intelligence question as unknown.');
      return;
    }
    setSubmitting(true);
    try {
      const dto: CreateContributionDto = {
        relationshipType,
        relationshipRecency,
        answers: categories.map((category) => ({ categoryId: category.id, ...answers[category.id] })),
      };
      if (!editingContributionId) {
        if (streetMode === 'existing') {
          if (!streetId) throw new Error('Select a street or choose “I can’t see my street”.');
          dto.streetId = streetId;
        }
      }
      if (editingContributionId) {
        await communityApi.updateContribution(editingContributionId, dto);
        success('Street Intelligence updated successfully.');
      } else {
        await communityApi.createContribution(dto);
        success('Street Intelligence submitted. Community Contributor access is active.');
      }
      setAnswers({});
      setQuestionIndex(0);
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
    setStreetQuery(item.street.streetName);
    setExistingCities([item.street.city]);
    setExistingAreas([item.street.area]);
    setExistingStreets([item.street]);
    if (item.street.locationId) setExistingLocations([{ id: item.street.locationId, state: item.street.state, name: item.street.city, normalisedName: item.street.city.toLowerCase(), isActive: true, latitude: null, longitude: null }]);
    if (item.street.areaId) setExistingAreaRecords([{ id: item.street.areaId, locationId: item.street.locationId ?? '', name: item.street.area, normalisedName: item.street.area.toLowerCase(), isActive: true, latitude: null, longitude: null }]);
    setRelationshipType(item.relationshipType);
    setRelationshipRecency(item.relationshipRecency);
    setAnswers(Object.fromEntries((item.answers ?? []).map((answer) => [
      answer.categoryId,
      {
        responseType: answer.responseType ?? ContributionResponseType.ANSWERED,
        optionId: answer.optionId ?? undefined,
        supplementaryValue: answer.supplementaryValue ?? undefined,
      },
    ])));
    setQuestionIndex(0);
    document.getElementById('contribute')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const cancelEdit = () => {
    setEditingContributionId(null);
    setStreetId(''); setExistingState(''); setExistingCity(''); setExistingArea(''); setAnswers({}); setQuestionIndex(0);
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
            <p className="mt-1 text-xs text-veriq-muted">Search for an approved street, or submit a missing street for admin verification first.</p>
          </div>

          <div className={`flex rounded-xl bg-slate-100 p-1 ${editingContributionId ? 'pointer-events-none opacity-60' : ''}`}>
            <button type="button" onClick={() => setStreetMode('existing')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetMode === 'existing' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>Select street</button>
            <button type="button" onClick={() => setStreetMode('new')} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetMode === 'new' ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>I can&apos;t see my street</button>
          </div>

          {streetMode === 'existing' ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <select aria-label="State" value={existingState} onChange={(event) => setExistingState(event.target.value)} className="input" required disabled={Boolean(editingContributionId)}>
                <option value="">Select state</option>
                {existingStates.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <select aria-label="LGA" value={existingCity} onChange={(event) => setExistingCity(event.target.value)} className="input" required disabled={!existingState || Boolean(editingContributionId)}>
                <option value="">Select LGA</option>
                {existingCities.map((item) => <option key={item} value={item}>{item}</option>)}
              </select>
              <div className="relative sm:col-span-2">
                <input
                  aria-label="Street name"
                  className="input"
                  value={streetQuery}
                  onChange={(event) => { setStreetQuery(event.target.value); setStreetId(''); }}
                  placeholder="Start typing a street name"
                  autoComplete="off"
                  disabled={!existingCity || Boolean(editingContributionId)}
                  required
                />
                {!editingContributionId && streetQuery.trim().length >= 2 && !streetId && (
                  <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                    {existingStreets.map((item) => (
                      <button key={item.id} type="button" onClick={() => { setStreetId(item.id); setStreetQuery(item.streetName); setExistingArea(item.area); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50">
                        <span className="block text-sm font-bold text-navy-900">{item.streetName}</span>
                        <span className="block text-xs text-veriq-muted">{item.area}</span>
                      </button>
                    ))}
                    {existingStreets.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No approved street matches this name.</p>}
                  </div>
                )}
                {streetId && <p className="mt-1 text-xs font-semibold text-emerald-700">Approved street selected{existingArea ? ` in ${existingArea}` : ''}.</p>}
              </div>
              <button type="button" onClick={() => { preserveRequestedCity.current = Boolean(existingCity); preserveRequestedArea.current = Boolean(existingArea); setStreetMode('new'); setStreet({ state: existingState, city: existingCity, area: existingArea, streetName: '', landmark: '' }); }} className="sm:col-span-2 text-left text-xs font-bold text-veriq-secondary hover:underline">
                I can&apos;t see my street in this list
              </button>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              <select className="input" value={street.state} onChange={(e) => setStreet((s) => ({ ...s, state: e.target.value }))} required>
                <option value="">Select state</option>
                {activeStates.map((stateOption) => (
                  <option key={stateOption.id} value={stateOption.name}>{stateOption.name}</option>
                ))}
              </select>
              <select className="input" aria-label="LGA" value={street.city} onChange={(e) => setStreet((s) => ({ ...s, city: e.target.value }))} required disabled={!street.state}>
                <option value="">Select LGA</option>
                {newLocations.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <select className="input" aria-label="Area or Neighbourhood" value={street.area} onChange={(e) => setStreet((s) => ({ ...s, area: e.target.value }))} required disabled={!street.city}>
                <option value="">Select area / neighbourhood</option>
                {newAreas.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <input className="input" placeholder="Street name" value={street.streetName} onChange={(e) => setStreet((s) => ({ ...s, streetName: e.target.value }))} required />
              <input className="input sm:col-span-2" placeholder="Nearby landmark (optional)" value={street.landmark} onChange={(e) => setStreet((s) => ({ ...s, landmark: e.target.value }))} />
              <p className="sm:col-span-2 rounded-lg bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">This submits only the street for verification. Intelligence questions become available after an admin approves it.</p>
            </div>
          )}

          {streetMode === 'existing' && (
          <>
          <div className="grid gap-3">
            <select className="input" value={relationshipType} onChange={(e) => setRelationshipType(e.target.value as StreetRelationshipType)}>
              {relationshipOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
            <select className="input" value={relationshipRecency} onChange={(e) => setRelationshipRecency(e.target.value as StreetRelationshipRecency)}>
              {recencyOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </div>

          {currentCategory && (
            <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <p className="text-[10px] font-bold uppercase text-emerald-700">
                    Question {questionIndex + 1} of {categories.length}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-slate-500">{currentCategory.section}</p>
                </div>
                <div className="h-1.5 w-24 overflow-hidden rounded-full bg-slate-200">
                  <div className="h-full bg-emerald-500" style={{ width: `${((questionIndex + 1) / categories.length) * 100}%` }} />
                </div>
              </div>
              <h3 className="font-display text-base font-bold text-navy-900">
                {currentCategory.question ?? currentCategory.name}
              </h3>
              <div className="mt-4 grid gap-2">
                {currentCategory.options.filter((option) => option.isActive).sort((a, b) => a.sortOrder - b.sortOrder).map((option) => {
                  const maxRank = Math.max(...currentCategory.options.filter((item) => item.isActive).map((item) => item.numericRank), 1);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => setQuestionResponse({
                        responseType: ContributionResponseType.ANSWERED,
                        optionId: option.id,
                        supplementaryValue: currentAnswer?.supplementaryValue,
                      })}
                      className={`rounded-lg border px-3 py-3 text-left text-xs font-bold transition-colors ${
                        currentAnswer?.responseType === ContributionResponseType.ANSWERED && currentAnswer.optionId === option.id
                          ? 'border-emerald-500 bg-emerald-50 text-emerald-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      <span className="mr-2 text-emerald-600">{'●'.repeat(option.numericRank)}{'○'.repeat(Math.max(0, maxRank - option.numericRank))}</span>
                      {option.label}
                    </button>
                  );
                })}
              </div>

              {currentCategory.supplementaryConfig && currentAnswer?.responseType === ContributionResponseType.ANSWERED && (
                <fieldset className="mt-5">
                  <legend className="text-xs font-bold text-navy-900">{currentCategory.supplementaryConfig.question}</legend>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {currentCategory.supplementaryConfig.options.map((option) => {
                      const selected = currentAnswer.supplementaryValue?.includes(option) ?? false;
                      return (
                        <label key={option} className={`flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-xs font-semibold ${selected ? 'border-emerald-500 bg-emerald-50 text-emerald-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={() => setQuestionResponse({
                              ...currentAnswer,
                              supplementaryValue: selected
                                ? currentAnswer.supplementaryValue?.filter((value) => value !== option)
                                : [...(currentAnswer.supplementaryValue ?? []), option],
                            })}
                          />
                          {option}
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              )}

              <div className="mt-5 flex flex-wrap gap-2 border-t border-slate-200 pt-4">
                <button type="button" onClick={() => skipQuestion(ContributionResponseType.SKIPPED)} className={`rounded-lg px-3 py-2 text-xs font-bold ${currentAnswer?.responseType === ContributionResponseType.SKIPPED ? 'bg-slate-700 text-white' : 'bg-white text-slate-600'}`}>Skip</button>
                <button type="button" onClick={() => skipQuestion(ContributionResponseType.UNKNOWN)} className={`rounded-lg px-3 py-2 text-xs font-bold ${currentAnswer?.responseType === ContributionResponseType.UNKNOWN ? 'bg-slate-700 text-white' : 'bg-white text-slate-600'}`}>I Don&apos;t Know</button>
                <div className="ml-auto flex gap-2">
                  <button type="button" disabled={questionIndex === 0} onClick={() => setQuestionIndex((value) => Math.max(0, value - 1))} className="btn-outline !px-3 !py-2 text-xs disabled:opacity-40">Back</button>
                  {questionIndex < categories.length - 1 && (
                    <button type="button" disabled={!currentAnswer} onClick={() => setQuestionIndex((value) => Math.min(categories.length - 1, value + 1))} className="btn-primary !px-3 !py-2 text-xs disabled:opacity-40">Next</button>
                  )}
                </div>
              </div>
            </div>
          )}

          </>
          )}

          <button type="submit" className="btn-primary w-full justify-center" disabled={submitting || (streetMode === 'existing' && (!answeredAll || !streetId))}>
            {submitting ? <LoadingSpinner size="sm" /> : <><Send className="h-4 w-4" /> {streetMode === 'new' ? 'Submit Street for Approval' : editingContributionId ? 'Save Intelligence Update' : 'Submit Intelligence'}</>}
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
