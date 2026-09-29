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
                <span className={cn('hidden h-0.5 flex-1 sm:block', index === 0 ? 'invisible' : index <= currentIndex ? 'bg-primary' : 'bg-[#ffffff20]')} />
                <span
                  className={cn(
                    'flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full border-2 text-xs font-semibold',
                    done && 'border-primary bg-primary text-primary-foreground',
                    current && !correction && 'border-primary bg-[#10b98112] text-[#6ee7b7]',
                    current && correction && 'border-destructive bg-[#fb718510] text-[#fda4af]',
                    !done && !current && 'border-[#ffffff20] bg-[#070b1444] text-muted-foreground',
                  )}
                  aria-current={current ? 'step' : undefined}
                >
                  {done ? <Check aria-hidden="true" className="h-3.5 w-3.5" /> : index + 1}
                </span>
                <span className={cn('hidden h-0.5 flex-1 sm:block', index === steps.length - 1 ? 'invisible' : index < currentIndex ? 'bg-primary' : 'bg-[#ffffff20]')} />
              </div>
              <span className={cn('text-xs font-medium', current ? (correction ? 'text-[#fda4af]' : 'text-foreground') : done ? 'text-[#6ee7b7]' : 'text-muted-foreground')}>
                {PUBLICATION_STATUS_META[step].label}
              </span>
            </li>
          );
        })}
      </ol>

      <p className="text-ui-md text-muted-foreground">{PUBLICATION_STATUS_META[status].description}</p>
      {(submittedAt || publishedAt) && (
        <p className="text-ui-sm text-muted-foreground">
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
