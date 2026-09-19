'use client';

import { Timer } from 'lucide-react';
import { formatDateTime } from './format';
import { useCountdown } from './useCountdown';

/** Live access-expiry indicator for an active unlock (§12.3, §17.1). */
export function AccessCountdown({
  expiresAt,
  withSeconds = false,
  compact = false,
  tone = 'light',
}: {
  expiresAt: string | null | undefined;
  withSeconds?: boolean;
  compact?: boolean;
  tone?: 'light' | 'dark';
}) {
  const { label, isExpired } = useCountdown(expiresAt, withSeconds);
  if (!expiresAt) return null;

  if (compact) {
    return (
      <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${isExpired ? 'bg-slate-100 text-slate-600' : 'bg-emerald-50 text-emerald-700'}`}>
        <Timer className="h-3.5 w-3.5" />
        {isExpired ? 'Access ended' : `${label} left`}
      </span>
    );
  }

  const palette = tone === 'dark'
    ? isExpired ? 'border-red-300/40 bg-red-500/10 text-red-100' : 'border-emerald-300/40 bg-emerald-400/10 text-emerald-100'
    : isExpired ? 'border-red-200 bg-red-50 text-red-700' : 'border-emerald-200 bg-emerald-50 text-emerald-700';

  return (
    <div className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 ${palette}`}>
      <Timer className="h-4 w-4 flex-shrink-0" />
      <div className="min-w-0">
        <p className="text-xs font-semibold">{isExpired ? 'Access has ended' : 'Access expires in'}</p>
        <p className={`break-words text-sm font-bold ${tone === 'dark' ? 'text-white' : 'text-navy-900'}`}>
          {isExpired ? 'Protected details are locked again' : label}
        </p>
        <p className="text-[11px] opacity-80">Ends {formatDateTime(expiresAt)}</p>
      </div>
    </div>
  );
}
