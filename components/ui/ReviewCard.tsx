import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ReviewCardProps {
  /** A step or rank marker, shown in Sora emerald above the title ("01", "Step 2"). */
  number?: ReactNode;
  title: ReactNode;
  children?: ReactNode;
  /** Pinned to the bottom of the card, so a grid of cards keeps its actions on one line. */
  footer?: ReactNode;
  className?: string;
}

/**
 * The prototype's `.review-card`: one item in a grid of comparable things — a review, a checklist
 * step, a feature. Flex column with a growing body, so cards in a row end up the same height.
 */
export function ReviewCard({ number, title, children, footer, className }: ReviewCardProps) {
  return (
    <div className={cn('flex flex-col gap-3 rounded-review border border-[#ffffff18] bg-card p-[22px]', className)}>
      {number && <span className="font-display text-[0.8rem] text-primary">{number}</span>}
      <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
      {children && <div className="flex-1 text-sm text-muted-foreground">{children}</div>}
      {footer && <div className="flex flex-wrap items-center gap-3">{footer}</div>}
    </div>
  );
}
