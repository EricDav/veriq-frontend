'use client';

import { useEffect, useState } from 'react';

export interface CountdownState {
  label: string;
  isExpired: boolean;
  msLeft: number;
}

function describe(expiresAt: string | null | undefined, withSeconds: boolean): CountdownState {
  if (!expiresAt) return { label: '', isExpired: false, msLeft: 0 };
  const diff = new Date(expiresAt).getTime() - Date.now();
  if (!Number.isFinite(diff) || diff <= 0) return { label: 'Expired', isExpired: true, msLeft: 0 };
  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const minutes = Math.floor((diff % 3_600_000) / 60_000);
  const seconds = Math.floor((diff % 60_000) / 1000);
  const parts = [days > 0 ? `${days}d` : null, `${hours}h`, `${minutes}m`, withSeconds ? `${seconds}s` : null].filter(Boolean);
  return { label: parts.join(' '), isExpired: false, msLeft: diff };
}

/** Live countdown to an ISO timestamp; ticks every second when `withSeconds`, otherwise every 30 seconds. */
export function useCountdown(expiresAt: string | null | undefined, withSeconds = false): CountdownState {
  const [state, setState] = useState<CountdownState>(() => describe(expiresAt, withSeconds));

  useEffect(() => {
    setState(describe(expiresAt, withSeconds));
    if (!expiresAt) return;
    const interval = window.setInterval(() => setState(describe(expiresAt, withSeconds)), withSeconds ? 1000 : 30_000);
    return () => window.clearInterval(interval);
  }, [expiresAt, withSeconds]);

  return state;
}
