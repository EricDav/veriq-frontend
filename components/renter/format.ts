import { ApiError } from '@/lib/api';
import type { BadgeTone } from '@/components/ui';
import type { ListingTargetType, RefundReason, RefundStatus, UnlockStatus } from '@/types/renter';

const API_ORIGIN = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

export function formatNaira(value: number | string | null | undefined): string {
  const amount = Number(value ?? 0);
  if (!Number.isFinite(amount)) return '₦0';
  return `₦${amount.toLocaleString('en-NG')}`;
}

export function formatDateTime(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });
}

export function formatDate(value: string | null | undefined): string {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function formatHours(hours: number): string {
  if (hours % 24 === 0 && hours >= 24) {
    const days = hours / 24;
    return `${days} ${days === 1 ? 'day' : 'days'}`;
  }
  return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
}

export function humanise(key: string): string {
  return key
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/_/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/^./, (char) => char.toUpperCase());
}

export function mediaSrc(url: string | null | undefined): string {
  if (!url) return '';
  if (/^(https?:|blob:|data:)/.test(url)) return url;
  return `${API_ORIGIN}${url.startsWith('/') ? '' : '/'}${url}`;
}

export function locationLine(...parts: Array<string | null | undefined>): string {
  return parts.filter((part): part is string => !!part && part.trim().length > 0).join(', ');
}

/** Public route for a listing by target type. Properties open inside the dashboard when requested. */
export function listingHref(targetType: ListingTargetType, targetId: string, inDashboard = false): string {
  if (targetType === 'shared_opportunity') return `/shared/${targetId}`;
  if (targetType === 'sale_listing') return `/for-sale/${targetId}`;
  return inDashboard ? `/dashboard/browse/${targetId}` : `/properties/${targetId}`;
}

export const TARGET_TYPE_LABELS: Record<ListingTargetType, string> = {
  property: 'Property',
  shared_opportunity: 'Shared Property',
  sale_listing: 'Property for Sale',
};

export const CATEGORY_LABELS: Record<string, string> = {
  residential: 'Residential Property',
  short_let: 'Short Let',
  hostel: 'Hostel',
  shared_property: 'Shared Property',
  for_sale: 'Property for Sale',
};

export const UNLOCK_STATUS_META: Record<UnlockStatus, { label: string; tone: BadgeTone }> = {
  pending_payment: { label: 'Awaiting payment', tone: 'amber' },
  paid: { label: 'Paid', tone: 'neutral' },
  unlocked: { label: 'Unlocked', tone: 'success' },
  expired: { label: 'Access ended', tone: 'neutral' },
  refund_requested: { label: 'Refund requested', tone: 'amber' },
  refunded: { label: 'Refunded to wallet', tone: 'success' },
  payment_failed: { label: 'Payment not completed', tone: 'red' },
  cancelled: { label: 'Checkout cancelled', tone: 'neutral' },
  duplicate_payment: { label: 'Duplicate payment', tone: 'amber' },
};

export const REFUND_STATUS_META: Record<RefundStatus, { label: string; tone: BadgeTone }> = {
  requested: { label: 'Submitted', tone: 'neutral' },
  under_review: { label: 'Under review', tone: 'amber' },
  approved: { label: 'Approved — credited to wallet', tone: 'success' },
  rejected: { label: 'Not approved', tone: 'red' },
};

export const REFUND_REASON_LABELS: Record<RefundReason, string> = {
  availability_stale_at_unlock: 'Shown as available, but it was already unavailable at unlock',
  contact_invalid: 'The property contact was invalid or not connected to the property',
  property_materially_different: 'The property is materially different from what Veriq verified',
  location_wrong: 'The verified location is materially wrong',
  verified_fact_inaccurate: 'A significant verified fact or intelligence item is inaccurate',
  street_link_wrong: 'The listing was linked to the wrong street',
  initial_street_intelligence_inaccurate: 'Initial Veriq Intelligence for the street was materially wrong',
  community_street_intelligence_disputed: 'Community Street Intelligence was materially misleading',
  payment_without_access: 'I paid but did not receive proper access',
  duplicate_payment: 'I was charged twice for the same unlock',
  sale_document_status_inaccurate: 'A public document status or verified sale fact was inaccurate',
  sale_already_sold_at_unlock: 'Shown as available, but it was already sold or withdrawn',
  other: 'Another qualifying issue (explain below)',
};

/** Structured `details` from an ApiError, normalised to readable lines. */
export function apiErrorLines(error: unknown): string[] {
  if (!(error instanceof ApiError) || !Array.isArray(error.details)) return [];
  return error.details
    .map((item) => {
      if (typeof item === 'string') return item;
      if (item && typeof item === 'object') {
        const record = item as Record<string, unknown>;
        const message = typeof record.message === 'string' ? record.message : null;
        const prefix = typeof record.path === 'string' ? `${humanise(record.path)}: ` : '';
        return message ? `${prefix}${message}` : null;
      }
      return null;
    })
    .filter((line): line is string => !!line);
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof ApiError || error instanceof Error) return error.message || fallback;
  return fallback;
}

export function newIdempotencyKey(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
}
