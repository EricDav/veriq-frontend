import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface AuditRowProps {
  children: ReactNode;
  /** Right-aligned metadata — a timestamp, an actor. */
  meta?: ReactNode;
  className?: string;
}

/**
 * The prototype's `.audit`: one line of a ledger or activity list, separated by a hairline rather than
 * a box. Stacks on narrow viewports so a long entry never forces a sideways scroll.
 */
export function AuditRow({ children, meta, className }: AuditRowProps) {
  return (
    <div
      className={cn(
        'flex flex-col gap-1 border-b border-[#ffffff10] py-3.5 text-ui-sm text-muted-foreground last:border-b-0',
        'wide:flex-row wide:items-center wide:justify-between wide:gap-4',
        className,
      )}
    >
      <div className="min-w-0">{children}</div>
      {meta && <div className="flex-shrink-0 text-xs">{meta}</div>}
    </div>
  );
}
