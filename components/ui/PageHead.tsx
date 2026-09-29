import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow } from './Eyebrow';

export interface PageHeadProps {
  /** The small emerald kicker, usually the workspace name ("Renter workspace"). */
  eyebrow?: ReactNode;
  title: ReactNode;
  /** One sentence saying what the screen is for. */
  lead?: ReactNode;
  /** Buttons or filters that belong to the whole page, right-aligned on wide viewports. */
  actions?: ReactNode;
  className?: string;
}

/**
 * The prototype's `.page-head`: every workspace screen opens with exactly one of these, and it owns
 * the page's single `<h1>`. Sora SemiBold at 2rem, dropping to 1.7rem below 760px.
 */
export function PageHead({ eyebrow, title, lead, actions, className }: PageHeadProps) {
  return (
    <div className={cn('mb-7 flex flex-wrap items-end justify-between gap-4', className)}>
      <div className="min-w-0">
        {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
        <h1 className="my-2 font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-foreground wide:text-[2rem]">
          {title}
        </h1>
        {lead && <p className="text-muted-foreground">{lead}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}
