import { Lock } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

export interface LockedBlockProps {
  title: ReactNode;
  /** Why the content is locked and what unlocking gives, in one or two sentences. */
  children?: ReactNode;
  /** The unlock action — usually a primary `Button`. */
  action?: ReactNode;
  /** Replaces the padlock when a more specific symbol reads better. */
  icon?: ReactNode;
  className?: string;
}

/**
 * The unlock boundary: a dashed border over a gradient, which is the prototype's one visual signal
 * that content sits behind a paid unlock. Use it wherever a screen stops short of showing something —
 * never a plain empty state, so the dashed edge keeps meaning exactly one thing.
 */
export function LockedBlock({ title, children, action, icon, className }: LockedBlockProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center rounded-searchbar border border-dashed border-[#ffffff25]',
        'bg-[linear-gradient(140deg,#111827,#0b141d)] px-[25px] py-12 text-center',
        className,
      )}
    >
      <span aria-hidden="true" className="mb-[18px] text-primary">
        {icon ?? <Lock className="h-8 w-8" />}
      </span>
      <p className="font-display text-lg font-semibold text-foreground">{title}</p>
      {children && <div className="mt-2 max-w-[420px] text-ui-md text-muted-foreground">{children}</div>}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
