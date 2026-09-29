'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { MapPin, Search } from 'lucide-react';
import type { AllowedState, CommunityArea, CommunityLocation, Street } from '@/types';
import type { SubmissionLocationInput } from '@/types/agent';
import { locationLookupApi, streetLinksApi } from '@/lib/api/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { errorMessage } from './format';
import { Field, InlineNotice, smallButton } from './ui';

export interface LocationDraft {
  state: string;
  localGovernmentId: string;
  areaId: string;
  streetId: string;
  proposedStreetName: string;
  address: string;
  buildingName: string;
  landmark: string;
  latitude: string;
  longitude: string;
}

export const emptyLocationDraft: LocationDraft = {
  state: '',
  localGovernmentId: '',
  areaId: '',
  streetId: '',
  proposedStreetName: '',
  address: '',
  buildingName: '',
  landmark: '',
  latitude: '',
  longitude: '',
};

export function locationDraftToInput(draft: LocationDraft): SubmissionLocationInput | null {
  if (!draft.localGovernmentId || !draft.areaId || draft.address.trim().length < 1) return null;
  if (!draft.streetId && !draft.proposedStreetName.trim()) return null;
  const latitude = draft.latitude === '' ? undefined : Number(draft.latitude);
  const longitude = draft.longitude === '' ? undefined : Number(draft.longitude);
  return {
    localGovernmentId: draft.localGovernmentId,
    areaId: draft.areaId,
    ...(draft.streetId ? { streetId: draft.streetId } : { proposedStreetName: draft.proposedStreetName.trim() }),
    address: draft.address.trim(),
    ...(draft.buildingName.trim() ? { buildingName: draft.buildingName.trim() } : {}),
    ...(draft.landmark.trim() ? { landmark: draft.landmark.trim() } : {}),
    ...(latitude !== undefined && Number.isFinite(latitude) ? { latitude } : {}),
    ...(longitude !== undefined && Number.isFinite(longitude) ? { longitude } : {}),
  };
}

/** Canonical location hierarchy State → LGA → Veriq Area → Street/Estate/Road (§4.1); a missing street is proposed for Admin approval. */
export function LocationPicker({ value, onChange }: { value: LocationDraft; onChange: (next: LocationDraft) => void }) {
  const [states, setStates] = useState<AllowedState[]>([]);
  const [locations, setLocations] = useState<CommunityLocation[]>([]);
  const [areas, setAreas] = useState<CommunityArea[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [streetQuery, setStreetQuery] = useState('');
  const [searching, setSearching] = useState(false);
  const [lookupError, setLookupError] = useState('');
  const [proposing, setProposing] = useState(false);

  useEffect(() => {
    locationLookupApi
      .activeStates()
      .then((res) => setStates(res.data))
      .catch((err) => setLookupError(errorMessage(err, 'Could not load states')));
  }, []);

  useEffect(() => {
    if (!value.state) {
      setLocations([]);
      return;
    }
    locationLookupApi
      .hierarchy(value.state)
      .then((res) => setLocations(res.data.locations))
      .catch((err) => setLookupError(errorMessage(err, 'Could not load Local Government Areas')));
  }, [value.state]);

  const lgaName = locations.find((item) => item.id === value.localGovernmentId)?.name ?? '';

  useEffect(() => {
    if (!value.state || !lgaName) {
      setAreas([]);
      return;
    }
    locationLookupApi
      .hierarchy(value.state, lgaName)
      .then((res) => setAreas(res.data.areaRecords))
      .catch((err) => setLookupError(errorMessage(err, 'Could not load Veriq Areas')));
  }, [value.state, lgaName]);

  const searchStreets = useCallback(async () => {
    if (!value.localGovernmentId) return;
    setSearching(true);
    setLookupError('');
    try {
      const res = await streetLinksApi.searchStreets({
        q: streetQuery.trim() || undefined,
        locationId: value.localGovernmentId,
        areaId: value.areaId || undefined,
      });
      setStreets(res.data);
    } catch (err) {
      setLookupError(errorMessage(err, 'Street search failed'));
    } finally {
      setSearching(false);
    }
  }, [streetQuery, value.localGovernmentId, value.areaId]);

  const set = (patch: Partial<LocationDraft>) => onChange({ ...value, ...patch });

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label="State">
          <select
            className="input !py-2 text-sm"
            value={value.state}
            onChange={(event) => set({ state: event.target.value, localGovernmentId: '', areaId: '', streetId: '' })}
          >
            <option value="">Select state…</option>
            {states.map((state) => (
              <option key={state.id} value={state.name}>
                {state.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Local Government Area">
          <select
            className="input !py-2 text-sm"
            value={value.localGovernmentId}
            disabled={!value.state}
            onChange={(event) => set({ localGovernmentId: event.target.value, areaId: '', streetId: '' })}
          >
            <option value="">Select LGA…</option>
            {locations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Veriq Area">
          <select className="input !py-2 text-sm" value={value.areaId} disabled={!value.localGovernmentId} onChange={(event) => set({ areaId: event.target.value, streetId: '' })}>
            <option value="">Select area…</option>
            {areas.map((area) => (
              <option key={area.id} value={area.id}>
                {area.name}
              </option>
            ))}
          </select>
        </Field>
      </div>

      <div className="rounded-xl border border-[#ffffff10] p-3">
        <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-foreground">
          <MapPin className="h-4 w-4" /> Street / Estate / Road
        </p>
        {!proposing ? (
          <div className="space-y-2">
            <div className="flex gap-2">
              <input
                className="input !py-2 text-sm"
                placeholder="Search approved streets"
                value={streetQuery}
                disabled={!value.localGovernmentId}
                onChange={(event) => setStreetQuery(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter') {
                    event.preventDefault();
                    searchStreets();
                  }
                }}
              />
              <button type="button" className={smallButton} onClick={searchStreets} disabled={searching || !value.localGovernmentId}>
                {searching ? <LoadingSpinner size="sm" /> : <Search className="h-3.5 w-3.5" />} Search
              </button>
            </div>
            {streets.length > 0 && (
              <ul className="max-h-48 divide-y divide-[#ffffff10] overflow-y-auto rounded-lg border border-[#ffffff10]">
                {streets.map((street) => (
                  <li key={street.id}>
                    <button
                      type="button"
                      onClick={() => set({ streetId: street.id, proposedStreetName: '' })}
                      className={`flex w-full items-center justify-between px-3 py-2 text-left text-sm hover:bg-[#070b1444] ${value.streetId === street.id ? 'bg-[#10b98112]' : ''}`}
                    >
                      <span>
                        {street.streetName}
                        <span className="block text-[11px] text-muted-foreground">
                          {street.area}, {street.city}
                        </span>
                      </span>
                      {value.streetId === street.id && <span className="text-[11px] font-bold text-[#6ee7b7]">Selected</span>}
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => { setProposing(true); set({ streetId: '' }); }}>
              The street is missing — propose it
            </button>
          </div>
        ) : (
          <div className="space-y-2">
            <Field label="Proposed street name">
              <input className="input !py-2 text-sm" maxLength={180} value={value.proposedStreetName} onChange={(event) => set({ proposedStreetName: event.target.value })} />
            </Field>
            <InlineNotice tone="warning">
              A proposed street goes to Admin for approval. You can verify the listing while it is pending, but publication and Initial Veriq
              Intelligence are blocked until it is approved (§4.1, §24.3).
            </InlineNotice>
            <button type="button" className="text-xs font-semibold text-primary hover:underline" onClick={() => { setProposing(false); set({ proposedStreetName: '' }); }}>
              Search approved streets instead
            </button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Address (house / plot number and street)">
          <input className="input !py-2 text-sm" maxLength={300} value={value.address} onChange={(event) => set({ address: event.target.value })} />
        </Field>
        <Field label="Building name (optional)">
          <input className="input !py-2 text-sm" maxLength={160} value={value.buildingName} onChange={(event) => set({ buildingName: event.target.value })} />
        </Field>
        <Field label="Landmark (optional)">
          <input className="input !py-2 text-sm" maxLength={180} value={value.landmark} onChange={(event) => set({ landmark: event.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Latitude (optional)">
            <input className="input !py-2 text-sm" inputMode="decimal" value={value.latitude} onChange={(event) => set({ latitude: event.target.value })} />
          </Field>
          <Field label="Longitude (optional)">
            <input className="input !py-2 text-sm" inputMode="decimal" value={value.longitude} onChange={(event) => set({ longitude: event.target.value })} />
          </Field>
        </div>
      </div>
      {lookupError && <p className="text-xs text-destructive">{lookupError}</p>}
      <p className="text-[11px] text-muted-foreground">Coordinates recorded here are the submitted values; verify them on the canonical Property after creation (§4.3).</p>
    </div>
  );
}
