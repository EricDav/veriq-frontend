'use client';

import { Timer } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui';
import { formatDateTime } from './format';
import { useCountdown } from './useCountdown';

/**
 * Live access-expiry indicator for an active unlock (§12.3, §17.1).
 *
 * The prototype states the expiry as an exact moment — "Access ends 29/09/2026, 15:41:09" — rather than
 * "24 hours", so the timestamp is always rendered alongside the countdown and is never dropped.
 */
export function AccessCountdown({
  expiresAt,
  withSeconds = false,
  compact = false,
  className,
}: {
  expiresAt: string | null | undefined;
  withSeconds?: boolean;
  compact?: boolean;
  className?: string;
}) {
  const { label, isExpired } = useCountdown(expiresAt, withSeconds);
  if (!expiresAt) return null;

  if (compact) {
    return (
      <Badge tone={isExpired ? 'neutral' : 'success'} className={className}>
        <Timer aria-hidden="true" className="h-3.5 w-3.5" />
        {isExpired ? 'Access ended' : `${label} left`}
      </Badge>
    );
  }

  return (
    <div
      className={cn(
        'flex w-full items-start gap-3 rounded-xl border px-5 py-[18px] text-ui-md',
        isExpired ? 'border-[#fb718530] bg-[#fb718510]' : 'border-[#10b98130] bg-[#10b9810b]',
        className,
      )}
    >
      <Timer
        aria-hidden="true"
        className={cn('mt-0.5 h-4 w-4 flex-shrink-0', isExpired ? 'text-[#fda4af]' : 'text-primary')}
      />
      <div className="min-w-0">
        <p className="font-semibold text-foreground">{isExpired ? 'Access has ended' : 'Access expires in'}</p>
        <p className="break-words font-display text-lg font-semibold text-foreground" aria-live="polite">
          {isExpired ? 'Protected details are locked again' : label}
        </p>
        <p className="mt-[3px] text-ui-sm text-muted-foreground">Access ends {formatDateTime(expiresAt)}</p>
      </div>
    </div>
  );
}
