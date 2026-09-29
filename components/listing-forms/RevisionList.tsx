'use client';

import { useState } from 'react';
import { Undo2 } from 'lucide-react';
import { propertySubmissionsApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
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

  if (!revisions.length) return <p className="text-ui-md text-muted-foreground">{emptyText}</p>;

  return (
    <ul className="divide-y divide-[#ffffff10] rounded-review border border-[#ffffff18]">
      {revisions.map((revision) => {
        const meta = REVISION_STATUS_META[revision.status];
        const target = targetLabels[revision.targetId] ?? (revision.targetType === 'property' ? 'Property' : humanize(revision.targetType));
        const canWithdraw = revision.status === 'pending' && (!currentUserId || revision.proposedByUserId === currentUserId);
        const summary = summarizeChanges(revision.proposedChanges ?? {});
        return (
          <li key={revision.id} className="space-y-2 p-4 text-ui-md">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="font-semibold text-foreground">
                  {REVISION_KIND_LABELS[revision.kind]} · <span className="font-normal text-muted-foreground">{target}</span>
                </p>
                <p className="text-ui-sm text-muted-foreground">
                  Sent {formatDateTime(revision.createdAt)}
                  {revision.reviewedAt ? ` · reviewed ${formatDateTime(revision.reviewedAt)}` : ''}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                {canWithdraw && (
                  <Button
                    variant="secondary"
                    size="small"
                    disabled={withdrawing === revision.id}
                    onClick={() => void withdraw(revision)}
                  >
                    {withdrawing === revision.id ? (
                      <LoadingSpinner size="sm" />
                    ) : (
                      <Undo2 aria-hidden="true" className="h-3 w-3" />
                    )}{' '}
                    Withdraw
                  </Button>
                )}
              </div>
            </div>
            {summary && <p className="text-ui-sm text-muted-foreground">Changes: {summary}</p>}
            {revision.message && (
              <p className="rounded-unit border border-[#ffffff18] bg-[#070b1444] px-3 py-2 text-ui-sm text-muted-foreground">
                Your note: {revision.message}
              </p>
            )}
            {revision.reviewNote && (
              <p
                className={`rounded-unit border px-3 py-2 text-ui-sm ${
                  revision.status === 'rejected'
                    ? 'border-[#fb718530] bg-[#fb718510] text-[#fda4af]'
                    : 'border-[#10b98135] bg-[#10b98112] text-[#6ee7b7]'
                }`}
              >
                Agent note: {revision.reviewNote}
              </p>
            )}
          </li>
        );
      })}
    </ul>
  );
}
