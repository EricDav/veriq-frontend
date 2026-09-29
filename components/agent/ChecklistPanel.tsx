'use client';

import React, { useState } from 'react';
import { Check, CircleDashed, MinusCircle, X } from 'lucide-react';
import type { Checklist, ChecklistItemStatus, VerificationChecklistKey } from '@/types/agent';
import { NOTE_REQUIRED_TO_PASS_KEYS } from '@/types/agent';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { formatDateTime } from './format';

export const CHECKLIST_LABELS: Record<VerificationChecklistKey, { label: string; hint: string }> = {
  authority: { label: 'Operator authority', hint: 'Relationship/authority to offer the property is confirmed (§8.2).' },
  identity: { label: 'Operator identity', hint: 'Identity verification is separate from property verification (§7.6).' },
  liveVideoVerification: {
    label: 'Live video verification',
    hint: 'Call the Operator and walk the submission on video. Record what you saw — publication is blocked until this passes (§3 step 2).',
  },
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
  { value: 'passed', label: 'Passed', icon: Check, active: 'bg-primary text-primary-foreground border-primary' },
  { value: 'failed', label: 'Failed', icon: X, active: 'border-destructive bg-[#fb718518] text-[#fda4af]' },
  { value: 'not_applicable', label: 'N/A', icon: MinusCircle, active: 'border-[#ffffff30] bg-[#ffffff0f] text-foreground' },
  { value: 'pending', label: 'Pending', icon: CircleDashed, active: 'border-[#fbbf2430] bg-[#fbbf2418] text-[#fcd34d]' },
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

  /** A live video verification is evidenced by its note, so passing it needs one too. */
  const noteRequiredToPass = (NOTE_REQUIRED_TO_PASS_KEYS as readonly string[]).includes(itemKey);

  const submit = async (status: ChecklistItemStatus) => {
    if (status === 'failed' && !note.trim()) {
      setLocalError('Record what failed before marking this item failed.');
      return;
    }
    if (noteRequiredToPass && status === 'passed' && !note.trim()) {
      setLocalError('Record what you verified on the call before marking this passed.');
      return;
    }
    setLocalError('');
    setPendingStatus(status);
    await onUpdate(itemKey, status, note);
    setPendingStatus(null);
  };

  return (
    <li className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-foreground">{meta.label}</p>
          <p className="text-[11px] text-muted-foreground">{meta.hint}</p>
          {item?.at && (
            <p className="mt-1 text-[11px] text-muted-foreground">
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
                  'inline-flex items-center gap-1 rounded-btn border px-2.5 py-1 text-[11px] font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-60',
                  'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                  active ? option.active : 'border-[#ffffff18] bg-card text-muted-foreground hover:bg-[#070b1444]',
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
          id={`${itemKey}-note`}
          value={note}
          onChange={(event) => setNote(event.target.value.slice(0, 1000))}
          placeholder={noteRequiredToPass ? 'What you verified on the call (required)' : 'Finding / note (required when failed)'}
          className="input mt-2 !py-2 text-xs"
          aria-label={`${meta.label} note`}
          aria-required={noteRequiredToPass || undefined}
          aria-invalid={localError ? true : undefined}
          aria-describedby={localError ? `${itemKey}-note-error` : undefined}
        />
      )}
      {localError && (
        <p id={`${itemKey}-note-error`} role="alert" className="mt-1 text-[11px] text-destructive">
          {localError}
        </p>
      )}
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
        <div className="h-2 flex-1 overflow-hidden rounded-full bg-[#ffffff0f]">
          <div
            className="h-2 rounded-full bg-primary transition-all"
            style={{ width: `${keys.length ? Math.round((complete / keys.length) * 100) : 0}%` }}
          />
        </div>
        <span className="text-xs font-semibold text-muted-foreground">
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
