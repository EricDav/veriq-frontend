import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface EyebrowProps {
  children: ReactNode;
  className?: string;
}

/**
 * The prototype's `.eyebrow`: the small emerald kicker above a page or section title. It is a label,
 * not a heading, so it never competes with the `<h1>` for a screen reader's outline.
 */
export function Eyebrow({ children, className }: EyebrowProps) {
  return (
    <span className={cn('text-xs font-semibold uppercase tracking-[0.18em] text-primary', className)}>
      {children}
    </span>
  );
}
