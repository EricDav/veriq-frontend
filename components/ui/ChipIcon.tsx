import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface ChipIconProps {
  /** A lucide icon, or one or two initials. */
  children: ReactNode;
  /**
   * The meaning of the chip when it is not decorative — for an icon that carries information a
   * neighbouring label does not already give. Left off, the chip is hidden from assistive tech.
   */
  label?: string;
  className?: string;
}

/**
 * The prototype's `.chip-icon`: a 45px emerald tile holding an icon or initials, used beside a row's
 * title. Decorative by default; pass `label` only when the icon is the sole carrier of its meaning.
 */
export function ChipIcon({ children, label, className }: ChipIconProps) {
  return (
    <span
      role={label ? 'img' : undefined}
      aria-label={label}
      aria-hidden={label ? undefined : true}
      className={cn(
        'grid h-[45px] w-[45px] flex-shrink-0 place-items-center rounded-review border border-[#10b98125] bg-[#10b98114] text-primary',
        className,
      )}
    >
      {children}
    </span>
  );
}
