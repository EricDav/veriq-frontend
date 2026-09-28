'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BellRing, CalendarX2, CheckCircle, Home, MapPin, Search } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { availabilityNotificationsApi } from '@/lib/api/renter';
import type { ListingTargetType, SimilarAvailableListing, UnlockBlockedReason } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from './ApiErrorNotice';
import { CATEGORY_LABELS, formatNaira, listingHref, locationLine, mediaSrc } from './format';

/** Plain-language reason for a blocked unlock. Veriq never accepts money for a property with nothing available. */
const REASON_COPY: Record<UnlockBlockedReason, { heading: string; body: string }> = {
  no_available_unit: {
    heading: 'Currently unavailable — this property cannot be unlocked',
    body: 'No unit on this property is available right now, so paid unlock and direct Operator or Caretaker contact are switched off. Ask us to tell you when a unit is free again, or look at similar properties that are available today.',
  },
  no_unit_for_dates: {
    heading: 'No unit is free for the dates you chose',
    body: 'This property has availability, but not for every night of the stay you selected, so it cannot be unlocked for this search. Try different dates.',
  },
};

/**
 * The blocked-unlock state (Master Blueprint §5 and §9: "do not accept money for a property with no available
 * unit"). The property stays visible as Currently Unavailable with the reason in plain language, a "Notify me when
 * available" action and similar available properties. Independent Street Intelligence stays reachable throughout.
 */
export function UnlockBlockedCallout({
  reason,
  targetType,
  targetId,
  notifyMeAvailable,
  similarAvailable,
  isAuthenticated,
  returnPath,
  inDashboard = false,
  onChangeDates,
}: {
  reason: UnlockBlockedReason;
  targetType: ListingTargetType;
  targetId: string;
  notifyMeAvailable: boolean;
  similarAvailable: SimilarAvailableListing[];
  isAuthenticated: boolean;
  returnPath: string;
  inDashboard?: boolean;
  /** Offered instead of a watch when only the selected nights are taken. */
  onChangeDates?: () => void;
}) {
  const [watching, setWatching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const copy = REASON_COPY[reason];

  const notifyMe = async () => {
    setSaving(true);
    setError(null);
    try {
      await availabilityNotificationsApi.watch(targetType, targetId);
      setWatching(true);
    } catch (err) {
      // An open watch already exists, or a unit became available while the page was open: both are good news.
      if (err instanceof ApiError && err.statusCode === 400) setWatching(true);
      else setError(err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <section className="card overflow-hidden" aria-labelledby="unlock-blocked-heading">
      <div className="space-y-4 border-b border-slate-100 bg-amber-50 p-5 sm:p-6">
        <div className="flex items-start gap-3">
          <CalendarX2 className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
          <div className="min-w-0">
            <h2 id="unlock-blocked-heading" className="font-display text-base font-bold text-amber-900">
              {copy.heading}
            </h2>
            <p className="mt-1 text-sm leading-6 text-amber-900">{copy.body}</p>
          </div>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap" aria-live="polite">
          {reason === 'no_unit_for_dates' && onChangeDates && (
            <button type="button" onClick={onChangeDates} className="btn-primary !py-2.5">
              <CalendarX2 className="h-4 w-4" /> Change dates
            </button>
          )}

          {notifyMeAvailable &&
            (watching ? (
              <p className="inline-flex items-center gap-2 rounded-lg bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800">
                <CheckCircle className="h-4 w-4" /> We will let you know as soon as a unit is available
              </p>
            ) : isAuthenticated ? (
              <button type="button" onClick={notifyMe} disabled={saving} className="btn-primary !py-2.5">
                {saving ? <LoadingSpinner size="sm" /> : <BellRing className="h-4 w-4" />} Notify me when available
              </button>
            ) : (
              <Link href={`/auth/login?redirect=${encodeURIComponent(returnPath)}`} className="btn-primary !py-2.5">
                <BellRing className="h-4 w-4" /> Sign in to be notified
              </Link>
            ))}

          <Link href="/street-intelligence" className="btn-outline !py-2.5">
            <MapPin className="h-4 w-4" /> Street Intelligence for this area
          </Link>
        </div>

        {watching && (
          <p className="text-xs text-amber-800">
            Manage this in{' '}
            <Link href="/dashboard/availability-notifications" className="font-semibold underline">
              Availability alerts
            </Link>
            .
          </p>
        )}
        <ApiErrorNotice error={error} fallback="We could not save your notification request." />
      </div>

      <div className="space-y-3 p-5 sm:p-6">
        <h3 className="flex items-center gap-2 font-display text-sm font-bold text-navy-900">
          <Search className="h-4 w-4 text-veriq-secondary" /> Similar properties available now
        </h3>
        {similarAvailable.length === 0 ? (
          <p className="text-sm text-veriq-muted">
            Nothing comparable is available in this area today.{' '}
            <Link href="/properties" className="font-semibold text-veriq-secondary hover:underline">
              Browse all available properties
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {similarAvailable.map((item) => (
              <li key={item.id}>
                <Link
                  href={listingHref('property', item.id, inDashboard)}
                  className="group flex gap-3 rounded-xl border border-slate-200 p-3 transition-colors hover:border-veriq-secondary"
                >
                  <span className="relative grid h-16 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-lg bg-slate-100">
                    {item.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(item.coverImageUrl)} alt={item.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Home className="h-6 w-6 text-slate-300" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[11px] font-semibold uppercase tracking-wide text-veriq-secondary">
                      {CATEGORY_LABELS[item.category] ?? 'Property'}
                    </span>
                    <span className="block truncate text-sm font-semibold text-navy-900 group-hover:text-veriq-secondary">
                      {item.title}
                    </span>
                    <span className="block truncate text-xs text-veriq-muted">
                      {locationLine(item.area, item.city) || 'General area shown on the listing'}
                    </span>
                    {item.rentAmount > 0 && (
                      <span className="block text-xs font-semibold text-navy-800">{formatNaira(item.rentAmount)}</span>
                    )}
                  </span>
                  <ArrowRight className="mt-5 h-4 w-4 flex-shrink-0 text-slate-300 group-hover:text-veriq-secondary" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}
