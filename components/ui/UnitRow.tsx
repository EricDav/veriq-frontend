import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface UnitRowProps {
  children: ReactNode;
  /** Marks the row as the chosen one. With `onSelect` it also drives `aria-pressed`. */
  selected?: boolean;
  /** Makes the row a real button. Omit it for a row that only displays a unit. */
  onSelect?: () => void;
  disabled?: boolean;
  className?: string;
}

/**
 * The prototype's `.unit`: one unit inside a property — the row a renter picks before unlocking.
 * Selecting is a button, not a click handler on a `<div>`, so the keyboard reaches it and the chosen
 * row reports itself through `aria-pressed`.
 */
export function UnitRow({ children, selected = false, onSelect, disabled = false, className }: UnitRowProps) {
  const classes = cn(
    'my-3 rounded-unit border p-[17px] text-left transition-colors',
    selected ? 'border-primary bg-[#10b9810b]' : 'border-[#ffffff18] bg-[#070b1444]',
    className,
  );

  if (!onSelect) {
    return <div className={classes}>{children}</div>;
  }

  return (
    <button
      type="button"
      onClick={onSelect}
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        classes,
        'block w-full',
        'hover:border-[#10b98170] disabled:pointer-events-none disabled:opacity-60',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {children}
    </button>
  );
}
