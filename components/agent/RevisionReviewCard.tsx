'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check, MapPin, X } from 'lucide-react';
import type { ListingRevision } from '@/types/agent';
import { revisionsApi } from '@/lib/api/agent';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { RevisionDiff } from './RevisionDiff';
import { errorMessage, formatDateTime, humanize, relativeAge } from './format';
import { InlineNotice, smallButton, smallDangerButton, smallPrimaryButton } from './ui';

const KIND_LABELS: Record<string, string> = {
  edit: 'Fact / structure edit',
  correction_request: 'Correction',
  intelligence_review_request: 'Structured intelligence change',
  address_correction: 'Address correction request',
};

const TARGET_LABELS: Record<string, string> = {
  property: 'Property',
  unit: 'Unit',
  shared_opportunity: 'Shared Property',
};

/** One pending Operator revision with before/after diff and approve/reject (§8.4). */
export function RevisionReviewCard({
  revision,
  caseId = null,
  showTargetLink = true,
  onDecided,
}: {
  revision: ListingRevision;
  caseId?: string | null;
  showTargetLink?: boolean;
  onDecided: (id: string) => void;
}) {
  const { success, error: toastError } = useToast();
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState<'approve' | 'reject' | null>(null);
  const [localError, setLocalError] = useState('');
  const unitLabel = revision.targetType === 'unit' ? String((revision.baseSnapshot as { displayLabel?: unknown }).displayLabel ?? '') : '';
  const sharedLabel = revision.targetType === 'shared_opportunity' ? String((revision.baseSnapshot as { displayLabel?: unknown }).displayLabel ?? '') : '';

  const decide = async (decision: 'approve' | 'reject') => {
    if (decision === 'reject' && !note.trim()) {
      setLocalError('Tell the Operator why the revision is rejected.');
      return;
    }
    setLocalError('');
    setBusy(decision);
    try {
      const res = await revisionsApi.decide(revision, decision, note);
      success(res.message || (decision === 'approve' ? 'Revision approved' : 'Revision rejected'));
      onDecided(revision.id);
    } catch (err) {
      toastError(errorMessage(err, 'Could not record the decision'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <li className="rounded-2xl border border-slate-100 bg-white p-4">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-navy-900">
            {KIND_LABELS[revision.kind] ?? humanize(revision.kind)}
            <span className="font-normal text-slate-500">
              {' '}
              · {TARGET_LABELS[revision.targetType] ?? humanize(revision.targetType)}
              {unitLabel ? `: ${unitLabel}` : ''}
              {sharedLabel ? `: ${sharedLabel}` : ''}
            </span>
          </p>
          <p className="text-[11px] text-slate-500">
            Submitted {formatDateTime(revision.createdAt)} ({relativeAge(revision.createdAt)})
          </p>
        </div>
        {!showTargetLink ? null : revision.targetType === 'shared_opportunity' ? (
          <Link href={`/dashboard/agent/shared/${revision.targetId}`} className={smallButton}>
            Open Shared Property
          </Link>
        ) : (
          caseId && (
            <Link href={`/dashboard/agent/verification/${caseId}`} className={smallButton}>
              Open workspace
            </Link>
          )
        )}
      </div>
      {revision.message && <p className="mt-2 rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">Operator message: “{revision.message}”</p>}
      <div className="mt-3">
        <RevisionDiff revision={revision} />
      </div>
      {revision.kind === 'address_correction' && (
        <InlineNotice tone="warning" className="mt-3">
          <span className="flex items-start gap-2">
            <MapPin className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Approving updates the submitted address only. Re-verify the coordinates with the location verification action, and relink Street
            Intelligence if the physical street differs (§24.5).
          </span>
        </InlineNotice>
      )}
      <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          className="input !py-2 text-xs"
          placeholder="Decision note (required to reject)"
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
        />
        <div className="flex gap-2">
          <button type="button" className={smallPrimaryButton} disabled={busy !== null} onClick={() => decide('approve')}>
            {busy === 'approve' ? <LoadingSpinner size="sm" /> : <Check className="h-3.5 w-3.5" />} Approve
          </button>
          <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => decide('reject')}>
            {busy === 'reject' ? <LoadingSpinner size="sm" /> : <X className="h-3.5 w-3.5" />} Reject
          </button>
        </div>
      </div>
      {localError && <p className="mt-1 text-[11px] text-red-600">{localError}</p>}
    </li>
  );
}
