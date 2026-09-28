'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BellRing, CheckCircle2, MapPin, Search, Trash2 } from 'lucide-react';
import { availabilityNotificationsApi } from '@/lib/api/renter';
import type { AvailabilityWatch, AvailabilityWatchStatus } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { TARGET_TYPE_LABELS, formatDateTime, listingHref, locationLine } from '@/components/renter/format';

const STATUS_META: Record<AvailabilityWatchStatus, { label: string; cls: string; help: string }> = {
  waiting: {
    label: 'Waiting',
    cls: 'bg-amber-50 text-amber-700',
    help: 'We are watching this listing. You will hear from us the moment a unit is available again.',
  },
  notified: {
    label: 'Notified',
    cls: 'bg-emerald-50 text-emerald-700',
    help: 'A unit became available and we told you. Open the listing to unlock it.',
  },
  cancelled: {
    label: 'Cancelled',
    cls: 'bg-slate-100 text-slate-600',
    help: 'You cancelled this alert, so we are no longer watching this listing.',
  },
};

/**
 * "Notify me when available" requests (Master Blueprint §5). When a listing has no available unit it cannot be
 * unlocked, so the renter leaves an alert instead; the first availability change notifies them and closes it.
 */
export default function AvailabilityNotificationsPage() {
  const [watches, setWatches] = useState<AvailabilityWatch[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [cancelling, setCancelling] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await availabilityNotificationsApi.mine();
      setWatches(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const cancel = async (id: string) => {
    setCancelling(id);
    setError(null);
    try {
      const res = await availabilityNotificationsApi.cancel(id);
      setStatus(res.message);
      await load();
    } catch (err) {
      setError(err);
    } finally {
      setCancelling(null);
    }
  };

  const open = watches.filter((watch) => watch.status === 'waiting');

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900">
          <BellRing className="h-5 w-5 text-veriq-secondary" /> Availability alerts
        </h1>
        <p className="text-sm leading-6 text-slate-500">
          Veriq never takes payment for a property with no available unit. When a listing you want is unavailable, ask
          us to tell you when a unit is free again — {open.length === 0 ? 'you have no alerts waiting right now' : `${open.length} alert${open.length === 1 ? ' is' : 's are'} waiting`}.
        </p>
      </header>

      <p className="text-xs text-emerald-700" role="status" aria-live="polite">
        {status ?? ''}
      </p>

      <ApiErrorNotice error={error} fallback="Your availability alerts could not be loaded." onRetry={() => void load()} />

      {loading ? (
        <div className="flex items-center justify-center gap-2 py-16 text-sm text-slate-500">
          <LoadingSpinner size="lg" className="text-veriq-secondary" /> Loading your alerts…
        </div>
      ) : watches.length === 0 ? (
        <div className="card flex flex-col items-center gap-3 p-8 text-center">
          <BellRing className="h-10 w-10 text-slate-200" />
          <p className="font-semibold text-navy-900">No availability alerts yet</p>
          <p className="max-w-md text-sm text-slate-500">
            On any property with no available unit, choose &ldquo;Notify me when available&rdquo; and it will appear
            here. You can cancel an alert at any time.
          </p>
          <Link href="/properties" className="btn-primary !py-2.5">
            <Search className="h-4 w-4" /> Browse available properties
          </Link>
        </div>
      ) : (
        <ul className="space-y-3">
          {watches.map((watch) => {
            const meta = STATUS_META[watch.status];
            return (
              <li key={watch.id} className="card space-y-2 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-veriq-secondary">
                      {TARGET_TYPE_LABELS[watch.targetType]}
                    </p>
                    <Link
                      href={listingHref(watch.targetType, watch.targetId)}
                      className="block truncate font-semibold text-navy-900 hover:text-veriq-secondary"
                    >
                      {watch.title ?? 'This listing is no longer published'}
                    </Link>
                    {locationLine(watch.area, watch.city) && (
                      <p className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                        <MapPin className="h-3.5 w-3.5 flex-shrink-0" /> {locationLine(watch.area, watch.city)}
                      </p>
                    )}
                  </div>
                  <span className={`badge flex-shrink-0 ${meta.cls}`}>
                    {watch.status === 'notified' && <CheckCircle2 className="h-3 w-3" />}
                    {meta.label}
                  </span>
                </div>
                <p className="text-xs leading-5 text-slate-500">{meta.help}</p>
                <p className="text-[11px] text-slate-400">
                  Asked {formatDateTime(watch.createdAt)}
                  {watch.notifiedAt && ` · notified ${formatDateTime(watch.notifiedAt)}`}
                </p>
                {watch.status === 'waiting' && (
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => void cancel(watch.id)}
                      disabled={cancelling === watch.id}
                      className="btn-outline !px-3 !py-2 !text-xs"
                    >
                      {cancelling === watch.id ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Cancel
                      this alert
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
