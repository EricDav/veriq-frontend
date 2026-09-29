import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * `success` is the prototype's base `.badge`; `neutral` is its `.gray`. The palette has no warning
 * colour of its own, so amber and red exist only here and on {@link Notice}.
 */
export type BadgeTone = 'success' | 'neutral' | 'amber' | 'red';

const TONES: Record<BadgeTone, string> = {
  success: 'border-[#10b98135] bg-[#10b98112] text-[#6ee7b7]',
  neutral: 'border-[#ffffff20] bg-[#ffffff08] text-muted-foreground',
  amber: 'border-[#fbbf2430] bg-[#fbbf2410] text-[#fcd34d]',
  red: 'border-[#fb718530] bg-[#fb718510] text-[#fda4af]',
};

export interface BadgeProps {
  tone?: BadgeTone;
  children: ReactNode;
  className?: string;
}

export function Badge({ tone = 'success', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-[5px] text-ui-xs font-medium leading-[1.4]',
        TONES[tone],
        className,
      )}
    >
      {children}
    </span>
  );
}
