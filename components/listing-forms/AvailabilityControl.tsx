'use client';

import { useState, type ReactNode } from 'react';
import { CheckCircle2, Clock, History, XCircle } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
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
            {available ? (
              <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" />
            ) : (
              <XCircle aria-hidden="true" className="h-3.5 w-3.5" />
            )}
            {available ? labels.available : labels.unavailable}
          </StatusBadge>
          <p className="text-ui-sm text-muted-foreground">
            Last confirmed {formatDateTime(confirmedAt)}
            {changedAt ? ` · changed ${formatDateTime(changedAt)}` : ''}
          </p>
          {available && freshnessExpiresAt && (
            <p className={cn('flex items-center gap-1 text-ui-sm', due ? 'font-semibold text-[#fcd34d]' : 'text-muted-foreground')}>
              <Clock aria-hidden="true" className="h-3 w-3" /> Reconfirm by {formatDateTime(freshnessExpiresAt)} or it becomes {labels.unavailable}
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {available && onReconfirm && (
            <Button
              variant="secondary"
              size="small"
              className={cn(due && 'border-[#fbbf2430] bg-[#fbbf2410] text-[#fcd34d] hover:bg-[#fbbf2420]')}
              disabled={disabled || saving !== null}
              onClick={() => void reconfirm()}
            >
              {saving === 'reconfirm' && <LoadingSpinner size="sm" />} Still {labels.available.toLowerCase()}
            </Button>
          )}
          <Button
            variant={available ? 'secondary' : 'primary'}
            size="small"
            disabled={disabled || saving !== null}
            onClick={() => { setPending(available ? 'unavailable' : 'available'); setReason(''); }}
          >
            Mark {available ? labels.unavailable : labels.available}
          </Button>
        </div>
      </div>

      {disabled && disabledReason && <p className="text-ui-sm text-muted-foreground">{disabledReason}</p>}
      {note}

      {pending && (
        <div className="space-y-2 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
          <p className="text-ui-md font-medium text-foreground">
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
            <Button variant="ghost" size="small" onClick={() => setPending(null)}>
              Cancel
            </Button>
            <Button size="small" disabled={saving !== null} onClick={() => void confirmChange()}>
              {saving === 'change' && <LoadingSpinner size="sm" />} Confirm
            </Button>
          </div>
        </div>
      )}

      {loadHistory && (
        <div>
          <Button variant="ghost" size="small" aria-expanded={historyOpen} onClick={toggleHistory}>
            <History aria-hidden="true" className="h-3.5 w-3.5" /> {historyOpen ? 'Hide history' : 'Availability history'}
          </Button>
          {historyOpen && (
            <div className="mt-2" aria-live="polite">
              {historyLoading ? (
                <p className="flex items-center gap-2 text-ui-sm text-muted-foreground">
                  <LoadingSpinner size="sm" className="text-primary" /> Loading history…
                </p>
              ) : historyError ? (
                <Notice tone="error">{historyError}</Notice>
              ) : !history?.length ? (
                <p className="text-ui-sm text-muted-foreground">No availability changes recorded yet.</p>
              ) : (
                <ol className="space-y-1.5 border-l border-[#10b98150] pl-3">
                  {history.map((event) => (
                    <li key={event.id} className="text-ui-sm text-muted-foreground">
                      <span className="font-semibold text-foreground">
                        {event.previousStatus && event.previousStatus !== event.newStatus
                          ? `${humanize(event.previousStatus)} → ${humanize(event.newStatus)}`
                          : event.previousStatus === event.newStatus
                            ? `Reconfirmed ${humanize(event.newStatus)}`
                            : humanize(event.newStatus)}
                      </span>{' '}
                      · {formatDateTime(event.createdAt)} · {humanize(event.source)}
                      {event.reason && <span className="block text-muted-foreground">{event.reason}</span>}
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
