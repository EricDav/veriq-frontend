'use client';

import React, { useState } from 'react';
import { Check, CircleDashed, MinusCircle, X } from 'lucide-react';
import type { Checklist, ChecklistItemStatus, VerificationChecklistKey } from '@/types/agent';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDateTime } from './format';

export const CHECKLIST_LABELS: Record<VerificationChecklistKey, { label: string; hint: string }> = {
  authority: { label: 'Operator authority', hint: 'Relationship/authority to offer the property is confirmed (§8.2).' },
  identity: { label: 'Operator identity', hint: 'Identity verification is separate from property verification (§7.6).' },
  location: { label: 'Exact location', hint: 'Verified address, coordinates and canonical Street/Area (§4.3).' },
  duplicate: { label: 'Duplicate check', hint: 'Not a second canonical record for the same physical property (§4.5).' },
  facts: { label: 'Facts', hint: 'Operator-supplied facts validated and corrected where needed.' },
  media: { label: 'Media', hint: 'Required media approved, Not Applicable decisions made, public cover set (§9).' },
  intelligence: { label: 'Structured intelligence', hint: 'Property/unit intelligence reviewed; Agent Observation only where necessary.' },
  streetLink: { label: 'Street Intelligence link', hint: 'Canonical street linked with displayable intelligence (§24.3).' },
  units: { label: 'Unit structure', hint: 'Units documented, verified and availability confirmed.' },
  commercial: { label: 'Commercial terms', hint: 'Permitted charges only; obvious inconsistencies resolved.' },
};

const STATUS_OPTIONS: Array<{ value: ChecklistItemStatus; label: string; icon: React.ElementType; active: string }> = [
  { value: 'passed', label: 'Passed', icon: Check, active: 'bg-emerald-600 text-white border-emerald-600' },
  { value: 'failed', label: 'Failed', icon: X, active: 'bg-red-600 text-white border-red-600' },
  { value: 'not_applicable', label: 'N/A', icon: MinusCircle, active: 'bg-slate-600 text-white border-slate-600' },
  { value: 'pending', label: 'Pending', icon: CircleDashed, active: 'bg-blue-600 text-white border-blue-600' },
];

function ChecklistRow({
  itemKey,
  checklist,
  disabled,
  onUpdate,
}: {
  itemKey: VerificationChecklistKey;
  checklist: Checklist;
  disabled?: boolean;
  onUpdate: (key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) => Promise<boolean>;
}) {
  const item = checklist[itemKey];
  const current = item?.status ?? 'pending';
  const [note, setNote] = useState(item?.note ?? '');
  const [pendingStatus, setPendingStatus] = useState<ChecklistItemStatus | null>(null);
  const [localError, setLocalError] = useState('');
  const meta = CHECKLIST_LABELS[itemKey];

  const submit = async (status: ChecklistItemStatus) => {
    if (status === 'failed' && !note.trim()) {
      setLocalError('Record what failed before marking this item failed.');
      return;
    }
    setLocalError('');
    setPendingStatus(status);
    await onUpdate(itemKey, status, note);
    setPendingStatus(null);
  };

  return (
    <li className="rounded-xl border border-slate-100 p-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">{meta.label}</p>
          <p className="text-[11px] text-slate-500">{meta.hint}</p>
          {item?.at && (
            <p className="mt-1 text-[11px] text-slate-400">
              Last updated {formatDateTime(item.at)}
              {item.note ? ` · “${item.note}”` : ''}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-1.5">
          {STATUS_OPTIONS.map((option) => {
            const Icon = option.icon;
            const active = current === option.value;
            return (
              <button
                key={option.value}
                type="button"
                disabled={disabled || pendingStatus !== null}
                onClick={() => submit(option.value)}
                aria-pressed={active}
                className={cn(
                  'inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  active ? option.active : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50',
                )}
              >
                {pendingStatus === option.value ? <LoadingSpinner size="sm" /> : <Icon className="h-3 w-3" />}
                {option.label}
              </button>
            );
          })}
        </div>
      </div>
      {!disabled && (
        <input
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 1000))}
          placeholder="Finding / note (required when failed)"
          className="input mt-2 !py-2 text-xs"
          aria-label={`${meta.label} note`}
        />
      )}
      {localError && <p className="mt-1 text-[11px] text-red-600">{localError}</p>}
    </li>
  );
}

export function ChecklistPanel({
  keys,
  checklist,
  disabled,
  onUpdate,
}: {
  keys: readonly VerificationChecklistKey[];
  checklist: Checklist;
  disabled?: boolean;
  onUpdate: (key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) => Promise<boolean>;
}) {
  const complete = keys.filter((key) => ['passed', 'not_applicable'].includes(checklist[key]?.status ?? 'pending')).length;
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-3">
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-slate-100">
          <div
            className="h-2 rounded-full bg-veriq-secondary transition-all"
            style={{ width: `${keys.length ? Math.round((complete / keys.length) * 100) : 0}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-slate-600">
          {complete}/{keys.length} complete
        </span>
      </div>
      <ul className="space-y-2">
        {keys.map((key) => (
          <ChecklistRow
            key={`${key}-${checklist[key]?.at ?? 'new'}`}
            itemKey={key}
            checklist={checklist}
            disabled={disabled}
            onUpdate={onUpdate}
          />
        ))}
      </ul>
    </div>
  );
}
