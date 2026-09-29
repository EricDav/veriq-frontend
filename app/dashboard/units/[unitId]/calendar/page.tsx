'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { CalendarDays, Home, ShieldAlert } from 'lucide-react';
import { unitCalendarApi } from '@/lib/api/renter';
import type { UnitCalendar } from '@/types/renter';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { UnitCalendarPanel } from '@/components/availability/UnitCalendarPanel';
import { Notice } from '@/components/listing-forms/ui';
import { errorMessage } from '@/components/listing-forms/issues';
import { formatDate } from '@/components/renter/format';

const MANAGER_ROLES: string[] = [
  UserRole.PROPERTY_OPERATOR,
  UserRole.SHORT_LET_OPERATOR,
  UserRole.AGENT,
  UserRole.ADMIN,
  UserRole.SUPER_ADMIN,
];

/**
 * Per-unit booked and blocked dates for the people who manage the listing (Master Blueprint §5). Server-side
 * authorisation decides who may change a calendar: this page only shows the screen, and a viewer who does not
 * manage the unit is told so rather than shown controls that would fail.
 */
export default function UnitCalendarPage() {
  const { unitId } = useParams<{ unitId: string }>();
  const { user, isLoading: authLoading } = useAuth();
  const [calendar, setCalendar] = useState<UnitCalendar | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await unitCalendarApi.view(unitId);
      setCalendar(res.data);
    } catch (err) {
      setCalendar(null);
      setLoadError(errorMessage(err, 'This unit calendar could not be loaded'));
    } finally {
      setLoading(false);
    }
  }, [unitId]);

  useEffect(() => {
    if (unitId) void load();
  }, [unitId, load]);

  if (authLoading || loading) return <PageLoader />;

  if (!user || !MANAGER_ROLES.includes(user.role)) {
    return (
      <div className="mx-auto max-w-lg">
        <Notice tone="error" title="This screen is for the people who manage a listing">
          <p>
            Operators, the assigned Veriq Agent and Admin mark the nights a unit is taken. Renters see those nights on
            the listing itself when they pick their dates.
          </p>
        </Notice>
      </div>
    );
  }

  if (!calendar) {
    return (
      <div className="mx-auto max-w-lg">
        <Notice tone="error" title="This unit calendar could not be loaded">
          <p>{loadError ?? 'Try again in a moment.'}</p>
          <button type="button" onClick={() => void load()} className="mt-2 text-sm font-semibold underline">
            Try again
          </button>
        </Notice>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <CalendarDays className="h-5 w-5 text-primary" /> {calendar.displayLabel} calendar
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Short Let availability is checked against the dates a renter selects. Marking the nights this unit is taken is
          what stops someone paying to unlock a stay that is not free. Bookable from {formatDate(calendar.bookableFrom)}{' '}
          to {formatDate(calendar.bookableUntil)}.
        </p>
        <Link
          href={`/dashboard/browse/${calendar.propertyId}`}
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
        >
          <Home className="h-3.5 w-3.5" /> Open the property
        </Link>
      </header>

      {!calendar.viewerIsManager && (
        <Notice tone="warning" title="You do not manage this unit">
          <p className="flex items-start gap-1.5">
            <ShieldAlert className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            You can see the taken nights, but only this listing&apos;s Operator, its assigned Veriq Agent or Admin can
            change them.
          </p>
        </Notice>
      )}

      {calendar.availabilityStatus === 'unavailable' && (
        <Notice tone="info" title="This unit is marked Unavailable overall">
          <p>
            While that is the case the property cannot be unlocked at all, whatever the calendar says. Set the unit back
            to Available once it can be let again.
          </p>
        </Notice>
      )}

      <UnitCalendarPanel unitId={unitId} unitLabel={calendar.displayLabel} />
    </div>
  );
}
