'use client';

import { useCallback, useEffect, useState } from 'react';
import { CalendarClock, CalendarDays, Trash2 } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { unitCalendarApi } from '@/lib/api/renter';
import type { UnitCalendar, UnitCalendarPeriodKind } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { FieldShell, Select } from '@/components/ui/Select';
import {
  DateRangeFields,
  EMPTY_STAY,
  formatStay,
  nightsBetween,
  stayError,
  type StayRange,
} from '@/components/ui/DateRangeFields';
import { Notice, SectionCard } from '@/components/listing-forms/ui';
import { errorMessage } from '@/components/listing-forms/issues';
import { formatDate } from '@/components/renter/format';
import { Badge, type BadgeTone } from '@/components/ui';

const KIND_OPTIONS = [
  { value: 'booked', label: 'Booked — a confirmed stay' },
  { value: 'blocked', label: 'Blocked — dates I am withholding' },
];

const KIND_META: Record<UnitCalendarPeriodKind, { label: string; tone: BadgeTone }> = {
  booked: { label: 'Booked', tone: 'amber' },
  blocked: { label: 'Blocked', tone: 'neutral' },
};

/**
 * Per-Unit booked and blocked dates for the Operator, the assigned Agent and Admin (Master Blueprint §5). Ranges
 * are half-open `[start, end)`, so the check-out date is free again for the next guest, and a range that clashes
 * with an existing one is refused by the server with 409 and shown here as such.
 */
export function UnitCalendarPanel({
  unitId,
  unitLabel,
  className,
}: {
  unitId: string;
  unitLabel?: string;
  className?: string;
}) {
  const [calendar, setCalendar] = useState<UnitCalendar | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<unknown>(null);
  const [range, setRange] = useState<StayRange>(EMPTY_STAY);
  const [kind, setKind] = useState('');
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [clash, setClash] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await unitCalendarApi.view(unitId, { includeCancelled: true });
      setCalendar(res.data);
    } catch (err) {
      setCalendar(null);
      setLoadError(err);
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    void load();
  }, [load]);

  const nights = nightsBetween(range);
  const rangeError = calendar ? stayError(range, calendar.today) : null;
  const overStay = calendar && kind === 'booked' && nights > calendar.maxStayNights;

  const addPeriod = async () => {
    setFormError(null);
    setClash(null);
    setStatus(null);
    if (!kind) {
      setFormError('Choose whether these dates are booked or blocked.');
      return;
    }
    if (nights < 1) {
      setFormError(rangeError ?? 'Choose a check-in and a check-out date at least one night apart.');
      return;
    }
    if (overStay) {
      setFormError(`A booked stay cannot exceed ${calendar?.maxStayNights} nights.`);
      return;
    }
    setSaving(true);
    try {
      const res = await unitCalendarApi.addPeriod(unitId, {
        kind: kind as UnitCalendarPeriodKind,
        startDate: range.checkIn,
        endDate: range.checkOut,
        ...(reason.trim() ? { reason: reason.trim() } : {}),
      });
      setRange(EMPTY_STAY);
      setKind('');
      setReason('');
      setStatus(res.message);
      await load();
    } catch (err) {
      // 409 means the range overlaps one already on this Unit; the message names the range to cancel first.
      if (err instanceof ApiError && err.statusCode === 409) setClash(err.message);
      else setFormError(errorMessage(err, 'These dates could not be saved.'));
    } finally {
      setSaving(false);
    }
  };

  const cancelPeriod = async (periodId: string) => {
    setRemoving(periodId);
    setFormError(null);
    setClash(null);
    try {
      const res = await unitCalendarApi.cancelPeriod(periodId);
      setStatus(res.message);
      await load();
    } catch (err) {
      setFormError(errorMessage(err, 'That range could not be released.'));
    } finally {
      setRemoving(null);
    }
  };

  if (loading && !calendar) {
    return (
      <div className={`flex items-center gap-2 rounded-xl border border-border p-4 text-sm text-muted-foreground ${className ?? ''}`}>
        <LoadingSpinner size="sm" /> Loading the unit calendar…
      </div>
    );
  }

  if (!calendar) {
    return (
      <Notice tone="error" title="The unit calendar could not be loaded" className={className}>
        <p>{errorMessage(loadError, 'Try again in a moment.')}</p>
        <button type="button" onClick={() => void load()} className="mt-2 text-sm font-semibold underline">
          Try again
        </button>
      </Notice>
    );
  }

  const active = calendar.periods.filter((period) => !period.cancelledAt);
  const released = calendar.periods.filter((period) => period.cancelledAt);

  return (
    <SectionCard
      className={className}
      title={
        <span className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-veriq-secondary" /> Calendar — {unitLabel ?? calendar.displayLabel}
        </span>
      }
      description={
        <>
          Mark the nights this unit is taken so a renter never pays for dates that are not free. A stay runs from the
          first occupied night up to but not including the check-out date. Bookable up to {formatDate(calendar.bookableUntil)},
          maximum {calendar.maxStayNights} nights per booked stay.
        </>
      }
    >
      <div className="grid gap-3 rounded-xl border border-border p-4">
        <Select
          id={`calendar-kind-${unitId}`}
          label="These dates are"
          placeholder="Select…"
          options={KIND_OPTIONS}
          value={kind}
          onValueChange={setKind}
          required
        />
        <DateRangeFields
          idPrefix={`calendar-${unitId}`}
          value={range}
          onChange={setRange}
          minDate={calendar.bookableFrom}
          maxDate={calendar.bookableUntil}
          required
          error={rangeError ?? (overStay ? `A booked stay cannot exceed ${calendar.maxStayNights} nights.` : null)}
          hint="The unit is free again on the check-out date."
          compact
        />
        <FieldShell htmlFor={`calendar-reason-${unitId}`} label="Why these dates are unavailable" optional>
          <input
            id={`calendar-reason-${unitId}`}
            className="input !py-2 text-sm"
            maxLength={500}
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="e.g. guest booking, renovation, own use"
          />
        </FieldShell>
        {formError && <Notice tone="error">{formError}</Notice>}
        {clash && <Notice tone="warning" title="These dates clash with a range already on this unit">{clash}</Notice>}
        <div className="flex justify-end">
          <button type="button" onClick={addPeriod} disabled={saving} className="btn-primary !py-2.5">
            {saving ? <LoadingSpinner size="sm" /> : <CalendarClock className="h-4 w-4" />} Save these dates
          </button>
        </div>
      </div>

      <p className="text-xs text-[#34d399]" role="status" aria-live="polite">
        {status ?? ''}
      </p>

      <div className="space-y-2">
        <h3 className="text-sm font-semibold text-foreground">Dates on this unit</h3>
        {active.length === 0 ? (
          <p className="rounded-xl border border-dashed border-border px-4 py-6 text-center text-sm text-muted-foreground">
            Nothing is marked. Every night in the bookable window is searchable and unlockable.
          </p>
        ) : (
          <ul className="space-y-2">
            {active.map((period) => (
              <li
                key={period.id}
                className="flex flex-col gap-2 rounded-xl border border-border p-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="flex flex-wrap items-center gap-2 text-sm font-semibold text-foreground">
                    <Badge tone={KIND_META[period.kind].tone}>{KIND_META[period.kind].label}</Badge>
                    {formatStay({ checkIn: period.startDate, checkOut: period.endDate })}
                  </p>
                  {period.reason && <p className="mt-0.5 truncate text-xs text-muted-foreground">{period.reason}</p>}
                </div>
                <button
                  type="button"
                  onClick={() => void cancelPeriod(period.id)}
                  disabled={removing === period.id}
                  className="btn-outline flex-shrink-0 !px-3 !py-2 !text-xs"
                >
                  {removing === period.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Release
                </button>
              </li>
            ))}
          </ul>
        )}
        {released.length > 0 && (
          <details className="rounded-xl border border-border px-3 py-2">
            <summary className="cursor-pointer text-xs font-semibold text-muted-foreground">
              {released.length} released range{released.length === 1 ? '' : 's'}
            </summary>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              {released.map((period) => (
                <li key={period.id}>
                  {KIND_META[period.kind].label} · {period.startDate} → {period.endDate} · released{' '}
                  {formatDate(period.cancelledAt)}
                </li>
              ))}
            </ul>
          </details>
        )}
      </div>
    </SectionCard>
  );
}
