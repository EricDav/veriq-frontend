'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { Check, X } from 'lucide-react';
import type { AgentNotification } from '@/types/agent';
import { listingMediaApi } from '@/lib/api/agent';
import { ApiError } from '@/lib/api';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { errorMessage, formatDateTime } from './format';
import { ErrorBlock, LoadingBlock, smallDangerButton, smallPrimaryButton } from './ui';

/**
 * Operator Not Applicable requests for required media sections (G.1, H.11). Requests reach the assigned Agent as
 * notifications carrying the request id; the Agent verifies or rejects each one.
 */
export function NotApplicableRequests({ listingTitle, onChanged }: { listingTitle: string; onChanged?: () => void }) {
  const { success, error: toastError, info } = useToast();
  const [items, setItems] = useState<AgentNotification[] | null>(null);
  const [loadError, setLoadError] = useState('');
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const all = await listingMediaApi.notApplicableRequests();
      setItems(all.filter((item) => !item.readAt && item.message.includes(listingTitle)));
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load Not Applicable requests'));
    }
  }, [listingTitle]);

  useEffect(() => {
    load();
  }, [load]);

  const decide = async (item: AgentNotification, decision: 'verify' | 'reject') => {
    if (!item.entityId) return;
    const note = notes[item.id]?.trim();
    if (decision === 'reject' && !note) {
      toastError('Give the Operator a reason for rejecting the Not Applicable request');
      return;
    }
    setBusy(`${item.id}-${decision}`);
    try {
      const res = await listingMediaApi.decideNotApplicable(item.entityId, decision, note);
      await listingMediaApi.markNotificationRead(item.id);
      success(res.message || 'Decision recorded');
      await load();
      onChanged?.();
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 409) {
        await listingMediaApi.markNotificationRead(item.id).catch(() => undefined);
        info(err.message);
        await load();
      } else {
        toastError(errorMessage(err, 'Could not record the decision'));
      }
    } finally {
      setBusy(null);
    }
  };

  if (loadError) return <ErrorBlock message={loadError} onRetry={load} />;
  if (!items) return <LoadingBlock label="Checking Not Applicable requests…" />;
  if (items.length === 0) return <p className="text-xs text-muted-foreground">No open Not Applicable requests from the Operator for this listing.</p>;

  return (
    <ul className="space-y-2">
      {items.map((item) => (
        <li key={item.id} className="rounded-xl border border-[#fbbf2425] bg-[#fbbf2409] p-3">
          <p className="text-sm text-foreground">{item.message}</p>
          <p className="text-[11px] text-muted-foreground">Requested {formatDateTime(item.createdAt)}</p>
          <input
            className="input mt-2 !py-2 text-xs"
            placeholder="Decision note (required to reject)"
            maxLength={500}
            value={notes[item.id] ?? ''}
            onChange={(event) => setNotes((current) => ({ ...current, [item.id]: event.target.value }))}
          />
          <div className="mt-2 flex flex-wrap gap-2">
            <button type="button" className={smallPrimaryButton} disabled={busy !== null} onClick={() => decide(item, 'verify')}>
              {busy === `${item.id}-verify` ? <LoadingSpinner size="sm" /> : <Check className="h-3.5 w-3.5" />} Verify Not Applicable
            </button>
            <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => decide(item, 'reject')}>
              {busy === `${item.id}-reject` ? <LoadingSpinner size="sm" /> : <X className="h-3.5 w-3.5" />} Reject
            </button>
          </div>
        </li>
      ))}
    </ul>
  );
}
