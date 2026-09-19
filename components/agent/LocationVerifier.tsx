'use client';

import React, { useState } from 'react';
import { Crosshair, MapPin, Save } from 'lucide-react';
import type { AddressRecord } from '@/types/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDateTime, toNumber } from './format';
import { Field, InlineNotice, smallButton } from './ui';

export interface LocationSubmit {
  address: string;
  latitude: number;
  longitude: number;
  landmark?: string;
  canonicalPropertyId?: string;
}

function AddressSummary({ title, record }: { title: string; record: AddressRecord | null }) {
  if (!record) return null;
  const lat = toNumber(record.latitude as number | string | null | undefined);
  const lng = toNumber(record.longitude as number | string | null | undefined);
  return (
    <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
      <p className="mb-1 font-bold uppercase tracking-wide text-slate-400">{title}</p>
      <p className="text-sm text-navy-900">{record.address ?? '—'}</p>
      {record.buildingName && <p>Building: {record.buildingName}</p>}
      {record.streetName && <p>Street: {record.streetName}</p>}
      {record.landmark && <p>Landmark: {record.landmark}</p>}
      {(record.area || record.localGovernment || record.state) && (
        <p>{[record.area, record.localGovernment, record.state].filter(Boolean).join(', ')}</p>
      )}
      {lat !== null && lng !== null && (
        <p>
          {lat.toFixed(6)}, {lng.toFixed(6)} ·{' '}
          <a className="font-semibold text-veriq-secondary hover:underline" href={`https://www.google.com/maps?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer">
            Open map
          </a>
        </p>
      )}
      {typeof record.verifiedAt === 'string' && <p className="mt-1 text-slate-400">Verified {formatDateTime(record.verifiedAt)}</p>}
    </div>
  );
}

/** Canonical verified address and coordinates (§4.3): the submitted address is never auto-trusted. */
export function LocationVerifier({
  submitted,
  verified,
  allowLandmark = true,
  canonicalPropertyField = false,
  currentCanonicalPropertyId,
  onSubmit,
  disabled,
}: {
  submitted: AddressRecord | null;
  verified: AddressRecord | null;
  allowLandmark?: boolean;
  canonicalPropertyField?: boolean;
  currentCanonicalPropertyId?: string | null;
  onSubmit: (input: LocationSubmit) => Promise<boolean>;
  disabled?: boolean;
}) {
  const seed = verified ?? submitted;
  const [address, setAddress] = useState(String(seed?.address ?? ''));
  const [landmark, setLandmark] = useState(String(seed?.landmark ?? ''));
  const [latitude, setLatitude] = useState(toNumber(seed?.latitude as number | null | undefined)?.toString() ?? '');
  const [longitude, setLongitude] = useState(toNumber(seed?.longitude as number | null | undefined)?.toString() ?? '');
  const [canonicalPropertyId, setCanonicalPropertyId] = useState(currentCanonicalPropertyId ?? '');
  const [locating, setLocating] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const useDeviceLocation = () => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setLocalError('This device does not provide GPS location.');
      return;
    }
    setLocating(true);
    setLocalError('');
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(position.coords.latitude.toFixed(7));
        setLongitude(position.coords.longitude.toFixed(7));
        setLocating(false);
      },
      (geoError) => {
        setLocalError(geoError.message || 'Could not read the device location.');
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 15_000 },
    );
  };

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    const lat = Number(latitude);
    const lng = Number(longitude);
    if (address.trim().length < 5) return setLocalError('Enter the full verified address (at least 5 characters).');
    if (latitude === '' || !Number.isFinite(lat) || Math.abs(lat) > 90) return setLocalError('Enter a valid latitude between -90 and 90.');
    if (longitude === '' || !Number.isFinite(lng) || Math.abs(lng) > 180) return setLocalError('Enter a valid longitude between -180 and 180.');
    setLocalError('');
    setSaving(true);
    await onSubmit({
      address: address.trim(),
      latitude: lat,
      longitude: lng,
      ...(allowLandmark && landmark.trim() ? { landmark: landmark.trim() } : {}),
      ...(canonicalPropertyField && canonicalPropertyId.trim() ? { canonicalPropertyId: canonicalPropertyId.trim() } : {}),
    });
    setSaving(false);
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <AddressSummary title="Submitted by Operator" record={submitted} />
        {verified ? (
          <AddressSummary title="Current verified location" record={verified} />
        ) : (
          <InlineNotice tone="warning">No verified location yet. Confirm the exact address and coordinates on site.</InlineNotice>
        )}
      </div>
      {!disabled && (
        <form onSubmit={submit} className="space-y-3">
          <Field label="Verified full address">
            <input className="input !py-2 text-sm" maxLength={300} value={address} onChange={(event) => setAddress(event.target.value)} />
          </Field>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Latitude">
              <input className="input !py-2 text-sm" inputMode="decimal" value={latitude} onChange={(event) => setLatitude(event.target.value)} />
            </Field>
            <Field label="Longitude">
              <input className="input !py-2 text-sm" inputMode="decimal" value={longitude} onChange={(event) => setLongitude(event.target.value)} />
            </Field>
          </div>
          {allowLandmark && (
            <Field label="Landmark (optional)">
              <input className="input !py-2 text-sm" maxLength={180} value={landmark} onChange={(event) => setLandmark(event.target.value)} />
            </Field>
          )}
          {canonicalPropertyField && (
            <Field label="Canonical Property ID (optional)" hint="Reconcile with the permanent Property record when it exists; landlord participation is not required.">
              <input className="input !py-2 text-sm" maxLength={64} value={canonicalPropertyId} onChange={(event) => setCanonicalPropertyId(event.target.value)} />
            </Field>
          )}
          {localError && <p className="text-xs text-red-600">{localError}</p>}
          <div className="flex flex-wrap justify-end gap-2">
            <button type="button" className={smallButton} onClick={useDeviceLocation} disabled={locating || saving}>
              {locating ? <LoadingSpinner size="sm" /> : <Crosshair className="h-3.5 w-3.5" />} Use my current GPS position
            </button>
            <button type="submit" className="btn-primary !px-4 !py-2 text-sm" disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : verified ? <Save className="h-4 w-4" /> : <MapPin className="h-4 w-4" />} Save verified location
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
