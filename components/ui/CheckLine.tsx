'use client';

import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface CheckLineProps {
  /** Required: the label is tied to the box through it, so tapping the text toggles the box. */
  id: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  children: ReactNode;
  /** A second, muted line under the label — what agreeing actually commits to. */
  hint?: ReactNode;
  disabled?: boolean;
  name?: string;
  className?: string;
}

/**
 * The prototype's `.checkline`: a checkbox and the sentence it agrees to — a declaration clause, a
 * filter, a consent. A native `<input type="checkbox">`, so it is keyboard-operable and announced as
 * a checkbox, with the label wrapping so long clauses do not clip.
 */
export function CheckLine({
  id,
  checked,
  onCheckedChange,
  children,
  hint,
  disabled = false,
  name,
  className,
}: CheckLineProps) {
  return (
    <div className={cn('flex items-start gap-3 text-ui-md', className)}>
      <input
        id={id}
        name={name}
        type="checkbox"
        checked={checked}
        disabled={disabled}
        onChange={(event) => onCheckedChange(event.target.checked)}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className={cn(
          'mt-1 h-4 w-4 flex-shrink-0 cursor-pointer rounded-[4px] border border-input bg-transparent',
          'accent-[#10b981] disabled:cursor-not-allowed disabled:opacity-60',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        )}
      />
      <label htmlFor={id} className={cn('min-w-0 cursor-pointer text-foreground', disabled && 'cursor-not-allowed opacity-60')}>
        {children}
        {hint && (
          <span id={`${id}-hint`} className="mt-1 block text-sm text-muted-foreground">
            {hint}
          </span>
        )}
      </label>
    </div>
  );
}
