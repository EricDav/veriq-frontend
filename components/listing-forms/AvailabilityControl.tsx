'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { AvailabilityEventRecord, UnitAvailabilityStatus } from '@/types/operator';
import { errorMessage } from './issues';
import { formatDateTime, humanize, needsReconfirmation } from './labels';
import { Notice, StatusBadge } from './ui';

export interface AvailabilityControlProps {
  status: UnitAvailabilityStatus;
  labels?: { available: string; unavailable: string };
  changedAt?: string | null;
  confirmedAt?: string | null;
  freshnessExpiresAt?: string | null;
  reconfirmPromptedAt?: string | null;
  /** Applies immediately (§10.2). Resolve with the backend message to show it. */
  onChange: (status: UnitAvailabilityStatus, reason?: string) => Promise<string | void>;
  /** "Still available" confirmation resetting the freshness deadline (§10.3). */
  onReconfirm?: () => Promise<string | void>;
  loadHistory?: () => Promise<AvailabilityEventRecord[]>;
  disabled?: boolean;
  disabledReason?: string;
  note?: ReactNode;
  className?: string;
}

export function AvailabilityControl({
  status,
  labels = { available: 'Available', unavailable: 'Unavailable' },
  changedAt,
  confirmedAt,
  freshnessExpiresAt,
  reconfirmPromptedAt,
  onChange,
  onReconfirm,
  loadHistory,
  disabled = false,
  disabledReason,
  note,
  className,
}: AvailabilityControlProps) {
  const [pending, setPending] = useState<UnitAvailabilityStatus | null>(null);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState<'change' | 'reconfirm' | null>(null);
  const [history, setHistory] = useState<AvailabilityEventRecord[] | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<string | null>(null);
  const { success, error } = useToast();

  const available = status === 'available';
  const due = needsReconfirmation({ availabilityStatus: status, freshnessExpiresAt: freshnessExpiresAt ?? null, reconfirmPromptedAt: reconfirmPromptedAt ?? null });

  const confirmChange = async () => {
    if (!pending) return;
    setSaving('change');
    try {
      const message = await onChange(pending, reason);
      success(message || 'Availability updated');
      setPending(null);
      setReason('');
      if (historyOpen) void fetchHistory();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to update availability'));
    } finally {
      setSaving(null);
    }
  };

  const reconfirm = async () => {
    if (!onReconfirm) return;
    setSaving('reconfirm');
    try {
      const message = await onReconfirm();
      success(message || 'Availability reconfirmed');
      if (historyOpen) void fetchHistory();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to reconfirm availability'));
    } finally {
      setSaving(null);
    }
  };

  const fetchHistory = async () => {
    if (!loadHistory) return;
    setHistoryLoading(true);
    setHistoryError(null);
    try {
      setHistory(await loadHistory());
    } catch (caught) {
      setHistoryError(errorMessage(caught, 'Unable to load availability history'));
    } finally {
      setHistoryLoading(false);
    }
  };

  const toggleHistory = () => {
    const next = !historyOpen;
    setHistoryOpen(next);
    if (next && history === null) void fetchHistory();
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="space-y-1">
          <StatusBadge tone={available ? 'emerald' : 'slate'}>
            {available ? <CheckCircle2 className="h-3.5 w-3.5" /> : <XCircle className="h-3.5 w-3.5" />}
            {available ? labels.available : labels.unavailable}
          </StatusBadge>
          <p className="text-xs text-slate-500">
            Last confirmed {formatDateTime(confirmedAt)}
            {changedAt ? ` · changed ${formatDateTime(changedAt)}` : ''}
          </p>
          {available && freshnessExpiresAt && (
            <p className={cn('flex items-center gap-1 text-xs', due ? 'font-semibold text-amber-700' : 'text-slate-500')}>
              <Clock className="h-3 w-3" /> Reconfirm by {formatDateTime(freshnessExpiresAt)} or it becomes {labels.unavailable}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {available && onReconfirm && (
            <button
              type="button"
              className={cn('btn-outline !px-3 !py-2 text-xs', due && '!border-amber-400 !bg-amber-50')}
              disabled={disabled || saving !== null}
              onClick={() => void reconfirm()}
            >
              {saving === 'reconfirm' && <LoadingSpinner size="sm" />} Still {labels.available.toLowerCase()}
            </button>
          )}
          <button
            type="button"
            className={available ? 'btn-outline !px-3 !py-2 text-xs' : 'btn-primary !px-3 !py-2 text-xs'}
            disabled={disabled || saving !== null}
            onClick={() => { setPending(available ? 'unavailable' : 'available'); setReason(''); }}
          >
            Mark {available ? labels.unavailable : labels.available}
          </button>
        </div>
      </div>

      {disabled && disabledReason && <p className="text-xs text-slate-500">{disabledReason}</p>}
      {note}

      {pending && (
        <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
          <p className="text-sm font-medium text-navy-900">
            Mark as {pending === 'available' ? labels.available : labels.unavailable}? This takes effect immediately.
          </p>
          <input
            className="input !py-2"
            maxLength={500}
            placeholder="Reason (optional), e.g. Tenant moved in"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            aria-label="Reason for availability change"
          />
          <div className="flex justify-end gap-2">
            <button type="button" className="btn-ghost !py-1.5 text-xs" onClick={() => setPending(null)}>Cancel</button>
            <button type="button" className="btn-primary !px-3 !py-1.5 text-xs" disabled={saving !== null} onClick={() => void confirmChange()}>
              {saving === 'change' && <LoadingSpinner size="sm" />} Confirm
            </button>
          </div>
        </div>
      )}

      {loadHistory && (
        <div>
          <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-navy-900" onClick={toggleHistory}>
            <History className="h-3.5 w-3.5" /> {historyOpen ? 'Hide history' : 'Availability history'}
          </button>
          {historyOpen && (
            <div className="mt-2">
              {historyLoading ? (
                <p className="flex items-center gap-2 text-xs text-slate-500"><LoadingSpinner size="sm" /> Loading history…</p>
              ) : historyError ? (
                <Notice tone="error">{historyError}</Notice>
              ) : !history?.length ? (
                <p className="text-xs text-slate-500">No availability changes recorded yet.</p>
              ) : (
                <ol className="space-y-1.5 border-l border-slate-200 pl-3">
                  {history.map((event) => (
                    <li key={event.id} className="text-xs text-slate-600">
                      <span className="font-semibold text-navy-900">
                        {event.previousStatus && event.previousStatus !== event.newStatus
                          ? `${humanize(event.previousStatus)} → ${humanize(event.newStatus)}`
                          : event.previousStatus === event.newStatus
                            ? `Reconfirmed ${humanize(event.newStatus)}`
                            : humanize(event.newStatus)}
                      </span>{' '}
                      · {formatDateTime(event.createdAt)} · {humanize(event.source)}
                      {event.reason && <span className="block text-slate-500">{event.reason}</span>}
                    </li>
                  ))}
                </ol>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
