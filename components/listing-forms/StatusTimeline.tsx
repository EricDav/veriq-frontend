'use client';

import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PublicationStatus } from '@/types/operator';
import { PUBLICATION_STATUS_META, formatDateTime } from './labels';
import { Notice } from './ui';

const FLOW: PublicationStatus[] = ['draft', 'submitted', 'verification_in_progress', 'ready_to_publish', 'published'];

export interface StatusTimelineProps {
  status: PublicationStatus;
  correctionNotes?: string | null;
  submittedAt?: string | null;
  publishedAt?: string | null;
  suspensionReason?: string | null;
}

/** Draft → Pending Verification → Verification in Progress → (Needs Correction) → Ready to Publish → Published (§7.6, §28). */
export function StatusTimeline({ status, correctionNotes, submittedAt, publishedAt, suspensionReason }: StatusTimelineProps) {
  const steps: PublicationStatus[] =
    status === 'needs_correction'
      ? ['draft', 'submitted', 'verification_in_progress', 'needs_correction', 'ready_to_publish', 'published']
      : FLOW;
  const effective: PublicationStatus = status === 'suspended' || status === 'archived' ? 'published' : status;
  const currentIndex = steps.indexOf(effective);

  return (
    <div className="space-y-4">
      <ol className="flex flex-col gap-3 sm:flex-row sm:items-start sm:gap-0">
        {steps.map((step, index) => {
          const done = index < currentIndex || (index === currentIndex && step === 'published');
          const current = index === currentIndex && step !== 'published';
          const correction = step === 'needs_correction';
          return (
            <li key={step} className="flex items-center gap-3 sm:flex-1 sm:flex-col sm:items-center sm:gap-2 sm:text-center">
              <div className="flex items-center sm:w-full">
                <span className={cn('hidden h-0.5 flex-1 sm:block', index === 0 ? 'invisible' : index <= currentIndex ? 'bg-veriq-secondary' : 'bg-slate-200')} />
                <span
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-bold',
                    done && 'border-veriq-secondary bg-veriq-secondary text-white',
                    current && !correction && 'border-veriq-secondary bg-white text-veriq-secondary',
                    current && correction && 'border-red-500 bg-red-50 text-red-600',
                    !done && !current && 'border-slate-200 bg-white text-slate-400',
                  )}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? <Check className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={cn('hidden h-0.5 flex-1 sm:block', index === steps.length - 1 ? 'invisible' : index < currentIndex ? 'bg-veriq-secondary' : 'bg-slate-200')} />
              </div>
              <span className={cn('text-xs font-medium', current ? (correction ? 'text-red-600' : 'text-navy-900') : done ? 'text-slate-700' : 'text-slate-400')}>
                {PUBLICATION_STATUS_META[step].label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-sm text-slate-600">{PUBLICATION_STATUS_META[status].description}</p>
      {(submittedAt || publishedAt) && (
        <p className="text-xs text-slate-500">
          {submittedAt && `Submitted ${formatDateTime(submittedAt)}`}
          {submittedAt && publishedAt && ' · '}
          {publishedAt && `Published ${formatDateTime(publishedAt)}`}
        </p>
      )}
      {status === 'needs_correction' && (
        <Notice tone="error" title="Correction requested by your Veriq Agent">
          <p className="whitespace-pre-line">{correctionNotes?.trim() || 'Review the highlighted issues below, update the details and resubmit.'}</p>
        </Notice>
      )}
      {status === 'suspended' && (
        <Notice tone="error" title="Suspended by Veriq">
          {suspensionReason || 'This listing is temporarily hidden from renters. Contact your Veriq Agent for details.'}
        </Notice>
      )}
      {status === 'archived' && <Notice tone="info" title="Archived">This record is kept for history and can no longer be edited.</Notice>}
    </div>
  );
}
