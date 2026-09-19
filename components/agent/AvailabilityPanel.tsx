'use client';

import React, { useState } from 'react';
import { CheckCircle2, RefreshCw, XCircle } from 'lucide-react';
import type { AvailabilityStatus, SaleUnavailableReason } from '@/types/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { formatDateTime } from './format';
import { Field, smallButton, smallDangerButton, smallPrimaryButton } from './ui';

const SALE_REASONS: Array<{ value: SaleUnavailableReason; label: string }> = [
  { value: 'sold', label: 'Sold' },
  { value: 'withdrawn', label: 'Withdrawn' },
  { value: 'no_longer_offered', label: 'No longer offered' },
];

function FreshnessLine({ confirmedAt, expiresAt, changedAt }: { confirmedAt: string | null; expiresAt: string | null; changedAt: string | null }) {
  const expired = expiresAt ? new Date(expiresAt).getTime() < Date.now() : false;
  return (
    <p className="text-[11px] text-slate-500">
      {changedAt && <>Changed {formatDateTime(changedAt)} · </>}
      {confirmedAt && <>Confirmed {formatDateTime(confirmedAt)} · </>}
      {expiresAt ? (
        <span className={expired ? 'font-semibold text-red-600' : ''}>
          {expired ? 'Freshness expired' : 'Fresh until'} {formatDateTime(expiresAt)}
        </span>
      ) : (
        'No freshness deadline'
      )}
    </p>
  );
}

/** Unit availability (§10): immediate updates, optional reason, and "still available" reconfirmation. */
export function UnitAvailabilityControl({
  status,
  changedAt,
  confirmedAt,
  expiresAt,
  availableLabel = 'Available',
  onChange,
  onReconfirm,
}: {
  status: AvailabilityStatus;
  changedAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  availableLabel?: string;
  onChange: (status: AvailabilityStatus, reason?: string) => Promise<boolean>;
  onReconfirm?: () => Promise<boolean>;
}) {
  const [reason, setReason] = useState('');
  const [busy, setBusy] = useState<'change' | 'reconfirm' | null>(null);
  const next: AvailabilityStatus = status === 'available' ? 'unavailable' : 'available';

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('badge !px-2.5 !py-0.5 text-[11px]', status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
          {status === 'available' ? availableLabel : 'Unavailable'}
        </span>
        <FreshnessLine confirmedAt={confirmedAt} expiresAt={expiresAt} changedAt={changedAt} />
      </div>
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input className="input !py-1.5 text-xs sm:max-w-xs" placeholder="Reason (optional)" maxLength={500} value={reason} onChange={(event) => setReason(event.target.value)} />
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className={next === 'available' ? smallPrimaryButton : smallDangerButton}
            disabled={busy !== null}
            onClick={async () => {
              setBusy('change');
              if (await onChange(next, reason)) setReason('');
              setBusy(null);
            }}
          >
            {busy === 'change' ? <LoadingSpinner size="sm" /> : next === 'available' ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            Mark {next === 'available' ? availableLabel : 'Unavailable'}
          </button>
          {onReconfirm && status === 'available' && (
            <button
              type="button"
              className={smallButton}
              disabled={busy !== null}
              onClick={async () => {
                setBusy('reconfirm');
                await onReconfirm();
                setBusy(null);
              }}
            >
              {busy === 'reconfirm' ? <LoadingSpinner size="sm" /> : <RefreshCw className="h-3.5 w-3.5" />} Still available
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Sale availability (§6.5, §8.5 step 6): Available, or Unavailable with Sold / Withdrawn / No longer offered. */
export function SaleAvailabilityControl({
  status,
  unavailableReason,
  changedAt,
  confirmedAt,
  expiresAt,
  onChange,
}: {
  status: AvailabilityStatus;
  unavailableReason: SaleUnavailableReason | null;
  changedAt: string | null;
  confirmedAt: string | null;
  expiresAt: string | null;
  onChange: (input: { status: AvailabilityStatus; reason?: SaleUnavailableReason; note?: string }) => Promise<boolean>;
}) {
  const [reason, setReason] = useState<SaleUnavailableReason | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'available' | 'unavailable' | null>(null);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <span className={cn('badge !px-2.5 !py-0.5 text-[11px]', status === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
          {status === 'available' ? 'Available' : `Unavailable${unavailableReason ? ` · ${SALE_REASONS.find((item) => item.value === unavailableReason)?.label ?? unavailableReason}` : ''}`}
        </span>
        <FreshnessLine confirmedAt={confirmedAt} expiresAt={expiresAt} changedAt={changedAt} />
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Field label="Reason when marking unavailable">
          <select className="input !py-2 text-sm" value={reason} onChange={(event) => setReason(event.target.value as SaleUnavailableReason | '')}>
            <option value="">Select reason…</option>
            {SALE_REASONS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Note (optional)">
          <input className="input !py-2 text-sm" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
      </div>
      <div className="flex flex-wrap justify-end gap-2">
        <button
          type="button"
          className={smallPrimaryButton}
          disabled={busy !== null}
          onClick={async () => {
            setBusy('available');
            if (await onChange({ status: 'available', ...(note.trim() ? { note: note.trim() } : {}) })) setNote('');
            setBusy(null);
          }}
        >
          {busy === 'available' ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="h-3.5 w-3.5" />}
          {status === 'available' ? 'Reconfirm available' : 'Mark available'}
        </button>
        <button
          type="button"
          className={smallDangerButton}
          disabled={busy !== null || !reason}
          title={!reason ? 'Select Sold, Withdrawn or No longer offered' : undefined}
          onClick={async () => {
            if (!reason) return;
            setBusy('unavailable');
            if (await onChange({ status: 'unavailable', reason, ...(note.trim() ? { note: note.trim() } : {}) })) {
              setNote('');
              setReason('');
            }
            setBusy(null);
          }}
        >
          {busy === 'unavailable' ? <LoadingSpinner size="sm" /> : <XCircle className="h-3.5 w-3.5" />} Mark unavailable
        </button>
      </div>
    </div>
  );
}
