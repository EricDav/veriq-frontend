'use client';

import { CalendarDays } from 'lucide-react';
import { cn } from '@/lib/utils';
import { FieldShell } from './Select';

/** A stay is half-open `[checkIn, checkOut)`: the renter leaves on the check-out date, so it is never occupied. */
export interface StayRange {
  checkIn: string;
  checkOut: string;
}

export const EMPTY_STAY: StayRange = { checkIn: '', checkOut: '' };

const DAY_MS = 86_400_000;

function dateOnlyMs(value: string) {
  return Date.parse(`${value}T00:00:00Z`);
}

/** Calendar date in the renter's own timezone, so "today" is never yesterday for them. */
export function todayDateOnly(now = new Date()) {
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function addDays(date: string, days: number) {
  return new Date(dateOnlyMs(date) + days * DAY_MS).toISOString().slice(0, 10);
}

/** Nights in a half-open range; 0 when either end is missing or the range is not at least one night. */
export function nightsBetween(range: StayRange) {
  if (!range.checkIn || !range.checkOut) return 0;
  const nights = (dateOnlyMs(range.checkOut) - dateOnlyMs(range.checkIn)) / DAY_MS;
  return Number.isFinite(nights) && nights >= 1 ? nights : 0;
}

export function isCompleteStay(range: StayRange) {
  return nightsBetween(range) >= 1;
}

/** A partially filled range is not an error yet; a filled one must be at least one night and start today or later. */
export function stayError(range: StayRange, today = todayDateOnly()): string | null {
  if (!range.checkIn && !range.checkOut) return null;
  if (!range.checkIn) return 'Choose a check-in date.';
  if (!range.checkOut) return 'Choose a check-out date.';
  if (dateOnlyMs(range.checkIn) < dateOnlyMs(today)) return 'Check-in cannot be in the past.';
  if (nightsBetween(range) < 1) return 'Check-out must be at least one night after check-in.';
  return null;
}

export function formatStay(range: StayRange) {
  const nights = nightsBetween(range);
  if (!nights) return '';
  const nice = (value: string) =>
    new Date(`${value}T00:00:00Z`).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return `${nice(range.checkIn)} → ${nice(range.checkOut)} · ${nights} night${nights === 1 ? '' : 's'}`;
}

/**
 * Check-in and check-out dates for a Short Let (Master Blueprint §5: "Availability is checked against selected
 * dates"). Native date inputs keep the pair fully keyboard-operable and reachable by screen readers; check-out is
 * constrained to at least one night after check-in so an impossible range cannot be submitted.
 */
export function DateRangeFields({
  value,
  onChange,
  idPrefix,
  minDate,
  maxDate,
  optional = false,
  required = false,
  hint,
  error,
  className,
  compact = false,
}: {
  value: StayRange;
  onChange: (next: StayRange) => void;
  idPrefix: string;
  minDate?: string;
  maxDate?: string;
  optional?: boolean;
  required?: boolean;
  hint?: string;
  error?: string | null;
  className?: string;
  compact?: boolean;
}) {
  const today = minDate ?? todayDateOnly();
  const nights = nightsBetween(value);
  const inputClass = cn('input', compact && '!py-2 text-sm');

  const setCheckIn = (checkIn: string) => {
    // Moving check-in past the current check-out would leave an impossible range, so the stay is re-anchored.
    const checkOut =
      value.checkOut && checkIn && dateOnlyMs(value.checkOut) <= dateOnlyMs(checkIn) ? addDays(checkIn, 1) : value.checkOut;
    onChange({ checkIn, checkOut });
  };

  return (
    <div className={cn('space-y-2', className)}>
      <div className="grid gap-3 sm:grid-cols-2">
        <FieldShell htmlFor={`${idPrefix}-check-in`} label="Check-in" optional={optional} required={required}>
          <input
            id={`${idPrefix}-check-in`}
            type="date"
            className={inputClass}
            value={value.checkIn}
            min={today}
            max={maxDate}
            required={required}
            onChange={(event) => setCheckIn(event.target.value)}
          />
        </FieldShell>
        <FieldShell htmlFor={`${idPrefix}-check-out`} label="Check-out" optional={optional} required={required}>
          <input
            id={`${idPrefix}-check-out`}
            type="date"
            className={inputClass}
            value={value.checkOut}
            min={value.checkIn ? addDays(value.checkIn, 1) : addDays(today, 1)}
            max={maxDate}
            required={required}
            onChange={(event) => onChange({ ...value, checkOut: event.target.value })}
          />
        </FieldShell>
      </div>
      <p className="flex items-start gap-1.5 text-xs text-slate-500" aria-live="polite">
        <CalendarDays className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
        {error ? (
          <span className="font-medium text-red-600">{error}</span>
        ) : nights ? (
          <span>
            {formatStay(value)}. You check out on {value.checkOut}, so that night stays free for the next guest.
          </span>
        ) : (
          <span>{hint ?? 'Availability and the unlock fee are checked against the dates you choose.'}</span>
        )}
      </p>
    </div>
  );
}
