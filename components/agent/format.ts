import { ApiError } from '@/lib/api';

export const humanize = (value: string | null | undefined) =>
  value
    ? value
        .replace(/([a-z])([A-Z])/g, '$1 $2')
        .replace(/[_.]+/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .replace(/^./, (char) => char.toUpperCase())
    : '';

export const formatNaira = (value: number | string | null | undefined) =>
  `₦${Number(value ?? 0).toLocaleString('en-NG', { maximumFractionDigits: 0 })}`;

export const formatDateTime = (value: string | null | undefined) =>
  value
    ? new Date(value).toLocaleString('en-NG', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—';

export const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export const ageInDays = (value: string) => Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));

export const relativeAge = (value: string) => {
  const days = ageInDays(value);
  if (days === 0) {
    const hours = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 3_600_000));
    return hours <= 1 ? 'Just now' : `${hours}h ago`;
  }
  return days === 1 ? '1 day ago' : `${days} days ago`;
};

/** Extracts the backend message plus structured details (publication blockers or schema issues). */
export function describeError(err: unknown, fallback: string): { message: string; details: unknown[] } {
  if (err instanceof ApiError) return { message: err.message || fallback, details: err.details ?? [] };
  if (err instanceof Error && err.message) return { message: err.message, details: [] };
  return { message: fallback, details: [] };
}

export const errorMessage = (err: unknown, fallback: string) => describeError(err, fallback).message;

export const toNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const PUBLICATION_STATUS_STYLES: Record<string, string> = {
  draft: 'bg-slate-100 text-slate-600',
  submitted: 'bg-blue-50 text-blue-700',
  verification_in_progress: 'bg-indigo-50 text-indigo-700',
  needs_correction: 'bg-amber-50 text-amber-700',
  ready_to_publish: 'bg-teal-50 text-teal-700',
  published: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
  archived: 'bg-slate-200 text-slate-600',
};

export const CASE_STATUS_STYLES: Record<string, string> = {
  pending: 'bg-blue-50 text-blue-700',
  in_progress: 'bg-indigo-50 text-indigo-700',
  needs_correction: 'bg-amber-50 text-amber-700',
  ready_to_publish: 'bg-teal-50 text-teal-700',
  published: 'bg-emerald-50 text-emerald-700',
  suspended: 'bg-red-50 text-red-700',
  closed: 'bg-slate-200 text-slate-600',
};

export const CATEGORY_LABELS: Record<string, string> = {
  residential: 'Residential',
  short_let: 'Short Let',
  hostel: 'Hostel',
  shared_property: 'Shared Property',
  for_sale: 'Property for Sale',
};

export const IDENTITY_STATUS_LABELS: Record<string, string> = {
  account_submitted: 'Account submitted',
  identity_pending: 'Identity pending',
  identity_verified: 'Identity verified',
  identity_rejected: 'Identity rejected',
};

export const IDENTITY_STATUS_STYLES: Record<string, string> = {
  account_submitted: 'bg-slate-100 text-slate-600',
  identity_pending: 'bg-amber-50 text-amber-700',
  identity_verified: 'bg-emerald-50 text-emerald-700',
  identity_rejected: 'bg-red-50 text-red-700',
};
