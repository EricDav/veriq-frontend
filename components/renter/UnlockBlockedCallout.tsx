'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, BellRing, CalendarX2, CheckCircle, Home, MapPin, Search } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { availabilityNotificationsApi } from '@/lib/api/renter';
import type { ListingTargetType, SimilarAvailableListing, UnlockBlockedReason } from '@/types/renter';
import { Button, Eyebrow, Notice, Panel } from '@/components/ui';
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
 *
 * The prototype has no counterpart for the notify-me watch, so it is built in the prototype's grammar: an amber
 * `.notice` for the reason, the prototype's button set for the actions, and `.unit`-weight rows for the
 * alternatives.
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
    <Panel as="section" className="space-y-5" aria-labelledby="unlock-blocked-heading">
      <Notice
        tone="amber"
        icon={<CalendarX2 className="h-5 w-5" />}
        title={
          <span id="unlock-blocked-heading" className="font-display">
            {copy.heading}
          </span>
        }
      >
        {copy.body}
      </Notice>

      <div className="flex flex-col gap-3 wide:flex-row wide:flex-wrap" aria-live="polite">
        {reason === 'no_unit_for_dates' && onChangeDates && (
          <Button onClick={onChangeDates}>
            <CalendarX2 aria-hidden="true" className="h-4 w-4" /> Change dates
          </Button>
        )}

        {notifyMeAvailable &&
          (watching ? (
            <p className="inline-flex items-center gap-2.5 rounded-btn border border-[#10b98130] bg-[#10b9810b] px-5 py-3 text-ui-md font-semibold text-[#6ee7b7]">
              <CheckCircle aria-hidden="true" className="h-4 w-4 flex-shrink-0" /> We will let you know as soon as a
              unit is available
            </p>
          ) : isAuthenticated ? (
            <Button onClick={notifyMe} disabled={saving}>
              {saving ? <LoadingSpinner size="sm" /> : <BellRing aria-hidden="true" className="h-4 w-4" />} Notify me
              when available
            </Button>
          ) : (
            <Button asChild>
              <Link href={`/auth/login?redirect=${encodeURIComponent(returnPath)}`}>
                <BellRing aria-hidden="true" className="h-4 w-4" /> Sign in to be notified
              </Link>
            </Button>
          ))}

        <Button asChild variant="secondary">
          <Link href="/street-intelligence">
            <MapPin aria-hidden="true" className="h-4 w-4" /> Street Intelligence for this area
          </Link>
        </Button>
      </div>

      {watching && (
        <p className="text-ui-sm text-muted-foreground">
          Manage this in{' '}
          <Link href="/dashboard/availability-notifications" className="font-semibold text-primary hover:underline">
            Availability alerts
          </Link>
          .
        </p>
      )}

      <ApiErrorNotice error={error} fallback="We could not save your notification request." />

      <div className="space-y-3 border-t border-[#ffffff12] pt-5">
        <Eyebrow>Available today</Eyebrow>
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <Search aria-hidden="true" className="h-4 w-4 text-primary" /> Similar properties available now
        </h3>
        {similarAvailable.length === 0 ? (
          <p className="text-ui-md text-muted-foreground">
            Nothing comparable is available in this area today.{' '}
            <Link href="/properties" className="font-semibold text-primary hover:underline">
              Browse all available properties
            </Link>
            .
          </p>
        ) : (
          <ul className="grid gap-3 wide:grid-cols-2">
            {similarAvailable.map((item) => (
              <li key={item.id}>
                <Link
                  href={listingHref('property', item.id, inDashboard)}
                  className="group flex gap-3 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] transition-colors hover:border-[#10b98170] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  <span className="relative grid h-16 w-20 flex-shrink-0 place-items-center overflow-hidden rounded-lg bg-[#ffffff08]">
                    {item.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={mediaSrc(item.coverImageUrl)}
                        alt={item.title}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <Home aria-hidden="true" className="h-6 w-6 text-muted-foreground" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-ui-xs font-semibold uppercase tracking-[0.18em] text-primary">
                      {CATEGORY_LABELS[item.category] ?? 'Property'}
                    </span>
                    <span className="mt-0.5 block truncate font-semibold text-foreground">{item.title}</span>
                    <span className="block truncate text-ui-sm text-muted-foreground">
                      {locationLine(item.area, item.city) || 'General area shown on the listing'}
                    </span>
                    {item.rentAmount > 0 && (
                      <span className="mt-0.5 block text-ui-sm font-semibold text-foreground">
                        {formatNaira(item.rentAmount)}
                      </span>
                    )}
                  </span>
                  <ArrowRight
                    aria-hidden="true"
                    className="mt-5 h-4 w-4 flex-shrink-0 text-muted-foreground transition-colors group-hover:text-primary"
                  />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Panel>
  );
}
