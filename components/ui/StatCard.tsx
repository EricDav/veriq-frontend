import Link from 'next/link';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { panelClass } from './Panel';

export interface StatCardProps {
  /** What the number counts, in sentence case: "Active unlocks", "Wallet credit". */
  label: ReactNode;
  /** Already formatted — use `formatCurrency` for money so the ₦ and grouping are consistent. */
  value: ReactNode;
  /** The line under the number, e.g. "View details →". Rendered in emerald when the card links out. */
  hint?: ReactNode;
  /** Turns the whole card into a link to the screen the number belongs to. */
  href?: string;
  className?: string;
}

/**
 * The dashboard number block: the prototype's `.dash-stat` on a `.panel`. Sora at 2rem, because the
 * figure is the thing being read — the label above it is deliberately small and muted.
 *
 * With `href` the whole panel becomes one link rather than a card with a link inside it, so the
 * target is large and there is a single tab stop.
 */
export function StatCard({ label, value, hint, href, className }: StatCardProps) {
  const body = (
    <>
      <small className="text-sm text-muted-foreground">{label}</small>
      {/* `break-words`, because a figure is not always a number — "Assigned Agent" holds a person's name. */}
      <p className="mb-[3px] mt-3 break-words font-display text-[2rem] leading-none text-foreground">{value}</p>
      {hint && <span className={cn('text-sm', href ? 'text-[#34d399]' : 'text-muted-foreground')}>{hint}</span>}
    </>
  );

  const shared = cn(panelClass, 'block text-left', className);

  if (!href) {
    return <div className={shared}>{body}</div>;
  }

  return (
    <Link
      href={href}
      className={cn(
        shared,
        'transition-colors hover:border-[#10b98170]',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
      )}
    >
      {body}
    </Link>
  );
}
