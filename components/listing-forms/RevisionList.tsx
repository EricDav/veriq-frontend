'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { propertySubmissionsApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type { ListingRevisionRecord } from '@/types/operator';
import { errorMessage } from './issues';
import { REVISION_KIND_LABELS, REVISION_STATUS_META, formatDateTime, humanize } from './labels';
import { StatusBadge } from './ui';

function summarizeChanges(changes: Record<string, unknown>) {
  const parts: string[] = [];
  for (const [key, value] of Object.entries(changes)) {
    if (value === undefined || key === 'removedAnswers') continue;
    if (key === 'facts' || key === 'intelligence') {
      const count = value && typeof value === 'object' ? Object.keys(value as object).filter((item) => item !== 'components').length : 0;
      parts.push(`${key === 'facts' ? 'Facts' : 'Intelligence'}${count ? ` (${count} answers)` : ''}`);
    } else if (key === 'location') {
      parts.push('Address details');
    } else {
      parts.push(humanize(key.replace(/([A-Z])/g, '_$1').toLowerCase()));
    }
  }
  return parts.join(', ');
}

export interface RevisionListProps {
  revisions: ListingRevisionRecord[];
  currentUserId?: string;
  /** Maps revision target ids (e.g. Unit ids) to readable labels. */
  targetLabels?: Record<string, string>;
  onWithdrawn: () => void;
  emptyText?: string;
}

/** Working revisions sent for assigned-Agent review, with Operator withdrawal of pending ones (§8.4, AC 12). */
export function RevisionList({ revisions, currentUserId, targetLabels = {}, onWithdrawn, emptyText = 'No change requests yet.' }: RevisionListProps) {
  const [withdrawing, setWithdrawing] = useState<string | null>(null);
  const { success, error } = useToast();

  const withdraw = async (revision: ListingRevisionRecord) => {
    setWithdrawing(revision.id);
    try {
      const response = await propertySubmissionsApi.withdrawRevision(revision.id);
      success(response.message || 'Revision withdrawn');
      onWithdrawn();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to withdraw this revision'));
    } finally {
      setWithdrawing(null);
    }
  };

  if (!revisions.length) return <p className="text-sm text-slate-500">{emptyText}</p>;

  return (
    <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
      {revisions.map((revision) => {
        const meta = REVISION_STATUS_META[revision.status];
        const target = targetLabels[revision.targetId] ?? (revision.targetType === 'property' ? 'Property' : humanize(revision.targetType));
        const canWithdraw = revision.status === 'pending' && (!currentUserId || revision.proposedByUserId === currentUserId);
        const summary = summarizeChanges(revision.proposedChanges ?? {});
        return (
          <li key={revision.id} className="space-y-2 p-4 text-sm">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-navy-900">
                  {REVISION_KIND_LABELS[revision.kind]} · <span className="font-normal text-slate-600">{target}</span>
                </p>
                <p className="text-xs text-slate-500">
                  Sent {formatDateTime(revision.createdAt)}
                  {revision.reviewedAt ? ` · reviewed ${formatDateTime(revision.reviewedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                {canWithdraw && (
                  <button
                    type="button"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50 disabled:opacity-50"
                    disabled={withdrawing === revision.id}
                    onClick={() => void withdraw(revision)}
                  >
                    {withdrawing === revision.id ? <LoadingSpinner size="sm" /> : <Undo2 className="h-3 w-3" />} Withdraw
                  </button>
                )}
              </div>
            </div>
            {summary && <p className="text-xs text-slate-600">Changes: {summary}</p>}
            {revision.message && <p className="rounded-lg bg-slate-50 px-3 py-2 text-xs text-slate-700">Your note: {revision.message}</p>}
            {revision.reviewNote && (
              <p className={`rounded-lg px-3 py-2 text-xs ${revision.status === 'rejected' ? 'bg-red-50 text-red-700' : 'bg-emerald-50 text-emerald-800'}`}>
                Agent note: {revision.reviewNote}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
