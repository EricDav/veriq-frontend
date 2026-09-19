import { ApiError } from '@/lib/api';

/** ₦ with Nigerian thousands separators; whole naira unless the value has kobo. */
export function naira(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '₦0';
  const sign = amount < 0 ? '-' : '';
  return `${sign}₦${Math.abs(amount).toLocaleString('en-NG', { maximumFractionDigits: 2 })}`;
}

/** Signed naira for adjustments (e.g. +₦2,000 / -₦2,000). */
export function signedNaira(value: number): string {
  return value > 0 ? `+${naira(value)}` : naira(value);
}

export function dateTime(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

export function dateOnly(value: string | Date | null | undefined): string {
  if (!value) return '—';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '—';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

/** snake_case / camelCase → "Sentence case". */
export function humanize(value: string | null | undefined): string {
  if (!value) return '—';
  const spaced = value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

export const CATEGORY_LABELS: Record<string, string> = {
  residential: 'Residential Property',
  short_let: 'Short Let',
  hostel: 'Hostel',
  shared_property: 'Shared Property',
  for_sale: 'Property for Sale',
};

export const REFUND_CASE_TYPE_LABELS: Record<string, string> = {
  unlock_purchase: 'Unlock purchase',
  excess_payment: 'Excess payment',
};

export function categoryLabel(category: string | null | undefined): string {
  if (!category) return '—';
  return CATEGORY_LABELS[category] ?? humanize(category);
}

/** Value for an `<input type="datetime-local">` in the viewer's timezone. */
export function toLocalInput(value: string | Date | null | undefined): string {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 16);
}

/** ISO timestamp from a `datetime-local` value, or undefined when empty. */
export function fromLocalInput(value: string): string | undefined {
  if (!value) return undefined;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date.toISOString();
}

export function shortId(id: string | null | undefined): string {
  if (!id) return '—';
  return id.length > 12 ? `${id.slice(0, 8)}…` : id;
}

export interface DescribedError {
  message: string;
  details: string[];
}

/** Backend message plus any structured `details` (`{ code|path, message }` or strings). */
export function describeError(err: unknown, fallback: string): DescribedError {
  if (err instanceof ApiError) {
    const details = (err.details ?? [])
      .map((item) => {
        if (typeof item === 'string') return item;
        if (item && typeof item === 'object') {
          const record = item as Record<string, unknown>;
          const message = typeof record.message === 'string' ? record.message : null;
          const label =
            typeof record.path === 'string'
              ? record.path
              : typeof record.code === 'string'
                ? humanize(record.code)
                : null;
          if (message && label) return `${label}: ${message}`;
          if (message) return message;
          return JSON.stringify(item);
        }
        return String(item);
      })
      .filter((line) => line && line !== err.message);
    return { message: err.message || fallback, details };
  }
  if (err instanceof Error && err.message) return { message: err.message, details: [] };
  return { message: fallback, details: [] };
}

/** One-line error text for toasts. */
export function errorText(err: unknown, fallback: string): string {
  const { message, details } = describeError(err, fallback);
  return details.length ? `${message} — ${details.join('; ')}` : message;
}
