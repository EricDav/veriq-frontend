'use client';

import { useCallback, useEffect, useState } from 'react';
import { Crosshair, MapPin, Plus, Search, X } from 'lucide-react';
import { communityApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
import { cn } from '@/lib/utils';
import type { CommunityArea, CommunityLocation, Street } from '@/types';
import type { SchemaIssue, SubmissionLocationInput, SubmittedAddress } from '@/types/operator';
import { errorMessage } from './issues';

export interface LocationValue {
  state: string;
  lgaId: string;
  lgaName: string;
  areaId: string;
  areaName: string;
  streetMode: 'select' | 'propose';
  streetId: string;
  streetName: string;
  proposedStreetName: string;
  address: string;
  buildingName: string;
  landmark: string;
  latitude: number | null;
  longitude: number | null;
}

export const EMPTY_LOCATION: LocationValue = {
  state: '',
  lgaId: '',
  lgaName: '',
  areaId: '',
  areaName: '',
  streetMode: 'select',
  streetId: '',
  streetName: '',
  proposedStreetName: '',
  address: '',
  buildingName: '',
  landmark: '',
  latitude: null,
  longitude: null,
};

/** Builds selector state from a stored Property / Shared Property record. */
export function locationFromRecord(record: {
  state: string;
  city: string;
  area: string;
  address?: string | null;
  localGovernmentId: string | null;
  areaId: string | null;
  streetId: string | null;
  submittedAddress: SubmittedAddress | null;
}): LocationValue {
  const submitted = record.submittedAddress ?? {};
  return {
    state: submitted.state ?? record.state ?? '',
    lgaId: record.localGovernmentId ?? '',
    lgaName: submitted.localGovernment ?? record.city ?? '',
    areaId: record.areaId ?? '',
    areaName: submitted.area ?? record.area ?? '',
    streetMode: 'select',
    streetId: record.streetId ?? '',
    streetName: submitted.streetName ?? '',
    proposedStreetName: '',
    address: submitted.address ?? record.address ?? '',
    buildingName: submitted.buildingName ?? '',
    landmark: submitted.landmark ?? '',
    latitude: typeof submitted.latitude === 'number' ? submitted.latitude : null,
    longitude: typeof submitted.longitude === 'number' ? submitted.longitude : null,
  };
}

/** Converts selector state into the backend SubmissionLocationDto, returning `location.*` issues when incomplete. */
export function toSubmissionLocation(value: LocationValue): { location: SubmissionLocationInput | null; issues: SchemaIssue[] } {
  const issues: SchemaIssue[] = [];
  if (!value.state) issues.push({ path: 'location.state', message: 'Select the State' });
  if (!value.lgaId) issues.push({ path: 'location.localGovernmentId', message: 'Select the Local Government Area' });
  if (!value.areaId) issues.push({ path: 'location.areaId', message: 'Select the Veriq Area' });
  if (value.streetMode === 'select' && !value.streetId)
    issues.push({ path: 'location.street', message: 'Select the Street / Estate / Road, or add it if it is missing' });
  if (value.streetMode === 'propose') {
    const name = value.proposedStreetName.trim();
    if (name.length < 2 || name.length > 180)
      issues.push({ path: 'location.street', message: 'Enter the Street / Estate / Road name (2–180 characters)' });
  }
  const address = value.address.trim();
  if (!address) issues.push({ path: 'location.address', message: 'Enter the house / building number and address' });
  if (address.length > 300) issues.push({ path: 'location.address', message: 'Address must be at most 300 characters' });
  if (issues.length) return { location: null, issues };
  return {
    location: {
      localGovernmentId: value.lgaId,
      areaId: value.areaId,
      ...(value.streetMode === 'select'
        ? { streetId: value.streetId }
        : { proposedStreetName: value.proposedStreetName.trim() }),
      address,
      ...(value.buildingName.trim() ? { buildingName: value.buildingName.trim() } : {}),
      ...(value.landmark.trim() ? { landmark: value.landmark.trim() } : {}),
      ...(value.latitude !== null && value.longitude !== null
        ? { latitude: value.latitude, longitude: value.longitude }
        : {}),
    },
    issues,
  };
}

export function formatLocation(value: LocationValue) {
  const street = value.streetMode === 'propose' ? `${value.proposedStreetName} (proposed)` : value.streetName;
  return [value.buildingName, value.address, street, value.areaName, value.lgaName, value.state]
    .map((part) => part?.trim())
    .filter(Boolean)
    .join(', ');
}

interface LocationSelectorProps {
  value: LocationValue;
  onChange: (value: LocationValue) => void;
  issues?: SchemaIssue[];
  /** `address_only` keeps State → LGA → Area → Street fixed (post-publication address correction, §8.4). */
  mode?: 'full' | 'address_only';
  disabled?: boolean;
  idPrefix?: string;
}

/** State → LGA → Veriq Area → Street/Estate/Road selector with Add New Street and full address (§4.1–4.2). */
export function LocationSelector({
  value,
  onChange,
  issues = [],
  mode = 'full',
  disabled = false,
  idPrefix = 'location',
}: LocationSelectorProps) {
  const [states, setStates] = useState<string[]>([]);
  const [lgas, setLgas] = useState<CommunityLocation[]>([]);
  const [areas, setAreas] = useState<CommunityArea[]>([]);
  const [loading, setLoading] = useState<'states' | 'lgas' | 'areas' | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [streets, setStreets] = useState<Street[]>([]);
  const [streetsLoading, setStreetsLoading] = useState(false);
  const [streetError, setStreetError] = useState<string | null>(null);
  const [geoMessage, setGeoMessage] = useState<string | null>(null);
  const [locating, setLocating] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const hierarchyLocked = mode === 'address_only' || disabled;
  const issueFor = (...paths: string[]) =>
    issues.filter((issue) => paths.includes(issue.path)).map((issue) => issue.message);

  useEffect(() => {
    if (hierarchyLocked) return;
    let cancelled = false;
    setLoading('states');
    setLoadError(null);
    communityApi
      .streetLocations()
      .then((response) => !cancelled && setStates(response.data.states))
      .catch((error) => !cancelled && setLoadError(errorMessage(error, 'Unable to load States')))
      .finally(() => !cancelled && setLoading(null));
    return () => {
      cancelled = true;
    };
  }, [hierarchyLocked, reloadKey]);

  useEffect(() => {
    if (hierarchyLocked || !value.state) {
      setLgas([]);
      return;
    }
    let cancelled = false;
    setLoading('lgas');
    communityApi
      .streetLocations({ state: value.state })
      .then((response) => !cancelled && setLgas(response.data.locations))
      .catch((error) => !cancelled && setLoadError(errorMessage(error, 'Unable to load Local Government Areas')))
      .finally(() => !cancelled && setLoading(null));
    return () => {
      cancelled = true;
    };
  }, [hierarchyLocked, value.state, reloadKey]);

  useEffect(() => {
    if (hierarchyLocked || !value.state || !value.lgaName) {
      setAreas([]);
      return;
    }
    let cancelled = false;
    setLoading('areas');
    communityApi
      .streetLocations({ state: value.state, city: value.lgaName })
      .then((response) => !cancelled && setAreas(response.data.areaRecords))
      .catch((error) => !cancelled && setLoadError(errorMessage(error, 'Unable to load Veriq Areas')))
      .finally(() => !cancelled && setLoading(null));
    return () => {
      cancelled = true;
    };
  }, [hierarchyLocked, value.state, value.lgaName, reloadKey]);

  const searchStreets = useCallback(
    async (term: string) => {
      if (!value.lgaId || !value.areaId) return;
      setStreetsLoading(true);
      setStreetError(null);
      try {
        const response = await communityApi.searchStreets({
          locationId: value.lgaId,
          areaId: value.areaId,
          q: term.trim() || undefined,
        });
        setStreets(response.data);
      } catch (error) {
        setStreets([]);
        setStreetError(errorMessage(error, 'Unable to search streets'));
      } finally {
        setStreetsLoading(false);
      }
    },
    [value.lgaId, value.areaId],
  );

  useEffect(() => {
    if (hierarchyLocked || value.streetMode !== 'select' || value.streetId || !value.areaId) return;
    const timer = setTimeout(() => void searchStreets(query), 300);
    return () => clearTimeout(timer);
  }, [hierarchyLocked, query, searchStreets, value.areaId, value.streetId, value.streetMode]);

  const update = (patch: Partial<LocationValue>) => onChange({ ...value, ...patch });
  const clearStreet = { streetId: '', streetName: '', proposedStreetName: '', streetMode: 'select' as const };

  const captureDeviceLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setGeoMessage('This device does not support location services.');
      return;
    }
    setLocating(true);
    setGeoMessage(null);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocating(false);
        update({
          latitude: Number(position.coords.latitude.toFixed(7)),
          longitude: Number(position.coords.longitude.toFixed(7)),
        });
        setGeoMessage('Coordinates captured. Your Veriq Agent verifies the exact location.');
      },
      (error) => {
        setLocating(false);
        setGeoMessage(
          error.code === error.PERMISSION_DENIED
            ? 'Location permission was denied. You can continue without coordinates.'
            : 'Unable to read your location. You can continue without coordinates.',
        );
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  };

  const fieldError = (messages: string[]) =>
    messages.map((message) => (
      <p key={message} className="mt-1 text-xs font-medium text-destructive">
        {message}
      </p>
    ));

  return (
    <div className="space-y-5">
      {loadError && !hierarchyLocked && (
        <div
          role="alert"
          className="flex flex-wrap items-center justify-between gap-2 rounded-unit border border-[#fb718530] bg-[#fb718510] px-4 py-3 text-ui-md text-[#fda4af]"
        >
          <span>{loadError}</span>
          <Button
            variant="secondary"
            size="small"
            className="border-[#fb718540] text-[#fda4af]"
            onClick={() => setReloadKey((key) => key + 1)}
          >
            Retry
          </Button>
        </div>
      )}

      {hierarchyLocked ? (
        <div className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-ui-md">
          <p className="flex items-center gap-2 font-semibold text-foreground">
            <MapPin aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
            {[value.streetName, value.areaName, value.lgaName, value.state].filter(Boolean).join(', ') || 'Location not set'}
          </p>
          {mode === 'address_only' && (
            <p className="mt-1 text-xs text-muted-foreground">
              The Street, Veriq Area and LGA of a verified Property cannot be changed here. Contact Veriq support if the Property is on a different street.
            </p>
          )}
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label htmlFor={`${idPrefix}-state`} className="label">State <span className="text-destructive">*</span></label>
              <select
                id={`${idPrefix}-state`}
                className="input"
                value={value.state}
                disabled={loading === 'states'}
                onChange={(event) =>
                  onChange({ ...value, state: event.target.value, lgaId: '', lgaName: '', areaId: '', areaName: '', ...clearStreet })
                }
              >
                <option value="">{loading === 'states' ? 'Loading…' : 'Select State'}</option>
                {states.map((state) => (
                  <option key={state} value={state}>{state}</option>
                ))}
              </select>
              {fieldError(issueFor('location.state'))}
            </div>
            <div>
              <label htmlFor={`${idPrefix}-lga`} className="label">Local Government Area <span className="text-destructive">*</span></label>
              <select
                id={`${idPrefix}-lga`}
                className="input"
                value={value.lgaId}
                disabled={!value.state || loading === 'lgas'}
                onChange={(event) => {
                  const lga = lgas.find((item) => item.id === event.target.value);
                  onChange({ ...value, lgaId: lga?.id ?? '', lgaName: lga?.name ?? '', areaId: '', areaName: '', ...clearStreet });
                }}
              >
                <option value="">{loading === 'lgas' ? 'Loading…' : 'Select LGA'}</option>
                {lgas.map((lga) => (
                  <option key={lga.id} value={lga.id}>{lga.name}</option>
                ))}
              </select>
              {value.state && loading !== 'lgas' && lgas.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">No active LGAs are configured for this State yet.</p>
              )}
              {fieldError(issueFor('location.localGovernmentId'))}
            </div>
            <div>
              <label htmlFor={`${idPrefix}-area`} className="label">Veriq Area <span className="text-destructive">*</span></label>
              <select
                id={`${idPrefix}-area`}
                className="input"
                value={value.areaId}
                disabled={!value.lgaId || loading === 'areas'}
                onChange={(event) => {
                  const area = areas.find((item) => item.id === event.target.value);
                  onChange({ ...value, areaId: area?.id ?? '', areaName: area?.name ?? '', ...clearStreet });
                  setQuery('');
                  setStreets([]);
                }}
              >
                <option value="">{loading === 'areas' ? 'Loading…' : 'Select Veriq Area'}</option>
                {areas.map((area) => (
                  <option key={area.id} value={area.id}>{area.name}</option>
                ))}
              </select>
              {value.lgaId && loading !== 'areas' && areas.length === 0 && (
                <p className="mt-1 text-xs text-muted-foreground">No active Veriq Areas are configured for this LGA yet.</p>
              )}
              {fieldError(issueFor('location.areaId'))}
            </div>
          </div>

          <div>
            <span className="label">Street / Estate / Road <span className="text-destructive">*</span></span>
            {!value.areaId ? (
              <p className="rounded-unit border border-dashed border-[#ffffff25] px-4 py-3 text-ui-md text-muted-foreground">Select the Veriq Area first.</p>
            ) : value.streetMode === 'propose' ? (
              <div className="space-y-2 rounded-unit border border-[#fbbf2425] bg-[#fbbf2409] p-[17px]">
                <label htmlFor={`${idPrefix}-proposed-street`} className="block text-ui-md font-semibold text-foreground">Add New Street</label>
                <input
                  id={`${idPrefix}-proposed-street`}
                  className="input"
                  maxLength={180}
                  placeholder="e.g. Adewale Crescent"
                  value={value.proposedStreetName}
                  onChange={(event) => update({ proposedStreetName: event.target.value })}
                />
                <p className="text-xs text-[#fcd34d]">
                  The street is proposed for Veriq review in {value.areaName}. Your submission can be verified while the street is pending, but it cannot be published until Veriq approves the street.
                </p>
                <Button variant="ghost" size="small" className="px-0" onClick={() => update(clearStreet)}>
                  Search approved streets instead
                </Button>
              </div>
            ) : value.streetId ? (
              <div className="flex items-center justify-between gap-3 rounded-unit border border-[#10b98135] bg-[#10b98112] px-4 py-3">
                <p className="flex min-w-0 items-center gap-2 text-ui-md font-semibold text-foreground">
                  <MapPin aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" />
                  <span className="truncate">{value.streetName || 'Selected street'}</span>
                </p>
                <Button variant="ghost" size="small" className="flex-shrink-0" onClick={() => update(clearStreet)}>
                  <X aria-hidden="true" className="h-3.5 w-3.5" /> Change
                </Button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="relative">
                  <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <input
                    className="input pl-9"
                    placeholder={`Search streets in ${value.areaName}`}
                    value={query}
                    onChange={(event) => setQuery(event.target.value)}
                    aria-label="Search streets"
                  />
                </div>
                <div className="max-h-56 overflow-y-auto rounded-unit border border-[#ffffff18]" aria-live="polite">
                  {streetsLoading ? (
                    <div className="flex items-center justify-center gap-2 p-4 text-ui-md text-muted-foreground">
                      <LoadingSpinner size="sm" className="text-primary" /> Searching…
                    </div>
                  ) : streetError ? (
                    <p role="alert" className="p-4 text-ui-md text-[#fda4af]">{streetError}</p>
                  ) : streets.length === 0 ? (
                    <p className="p-4 text-ui-md text-muted-foreground">
                      {query.trim() ? `No approved street matches "${query.trim()}".` : 'No approved streets found in this Veriq Area.'}
                    </p>
                  ) : (
                    streets.map((street) => (
                      <button
                        key={street.id}
                        type="button"
                        className="block w-full border-b border-[#ffffff10] px-4 py-2.5 text-left text-ui-md transition-colors last:border-0 hover:bg-[#ffffff0f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                        onClick={() => update({ streetId: street.id, streetName: street.streetName, proposedStreetName: '', streetMode: 'select' })}
                      >
                        <span className="font-medium text-foreground">{street.streetName}</span>
                        {street.landmark && <span className="block text-xs text-muted-foreground">Near {street.landmark}</span>}
                      </button>
                    ))
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="small"
                  className="px-0 text-primary hover:text-[#34d399]"
                  onClick={() => update({ streetMode: 'propose', streetId: '', streetName: '', proposedStreetName: query.trim() })}
                >
                  <Plus aria-hidden="true" className="h-4 w-4" /> Can&apos;t find it? Add New Street
                </Button>
              </div>
            )}
            {fieldError(issueFor('location.street', 'location.streetId', 'location.proposedStreetName'))}
          </div>
        </>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label htmlFor={`${idPrefix}-address`} className="label">House / building number and address <span className="text-destructive">*</span></label>
          <input
            id={`${idPrefix}-address`}
            className={cn('input', issueFor('location.address').length > 0 && 'border-destructive')}
            maxLength={300}
            disabled={disabled}
            placeholder="e.g. No. 14, beside the community borehole"
            value={value.address}
            onChange={(event) => update({ address: event.target.value })}
          />
          <p className="mt-1 text-xs text-muted-foreground">Kept private. Only shown to renters after unlock, once your Veriq Agent verifies it.</p>
          {fieldError(issueFor('location.address'))}
        </div>
        <div>
          <label htmlFor={`${idPrefix}-building`} className="label">Building / estate name <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span></label>
          <input
            id={`${idPrefix}-building`}
            className="input"
            maxLength={160}
            disabled={disabled}
            value={value.buildingName}
            onChange={(event) => update({ buildingName: event.target.value })}
          />
        </div>
        <div>
          <label htmlFor={`${idPrefix}-landmark`} className="label">Landmark / directions <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span></label>
          <input
            id={`${idPrefix}-landmark`}
            className="input"
            maxLength={180}
            disabled={disabled}
            value={value.landmark}
            onChange={(event) => update({ landmark: event.target.value })}
          />
        </div>
      </div>

      <div className="flex flex-col gap-2 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] sm:flex-row sm:items-center sm:justify-between">
        <div className="text-ui-md">
          <p className="font-medium text-foreground">Map coordinates <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span></p>
          <p className="text-xs text-muted-foreground">
            {value.latitude !== null && value.longitude !== null
              ? `${value.latitude}, ${value.longitude}`
              : 'Capture coordinates while standing at the property, if you can.'}
          </p>
          {geoMessage && (
            <p role="status" aria-live="polite" className="mt-1 text-xs text-muted-foreground">
              {geoMessage}
            </p>
          )}
        </div>
        <div className="flex gap-2">
          {value.latitude !== null && !disabled && (
            <Button variant="ghost" size="small" onClick={() => update({ latitude: null, longitude: null })}>
              Clear
            </Button>
          )}
          <Button variant="secondary" size="small" disabled={disabled || locating} onClick={captureDeviceLocation}>
            {locating ? <LoadingSpinner size="sm" /> : <Crosshair aria-hidden="true" className="h-3.5 w-3.5" />}
            Use my current location
          </Button>
        </div>
      </div>
    </div>
  );
}
