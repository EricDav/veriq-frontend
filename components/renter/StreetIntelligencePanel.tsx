'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Share2, Users } from 'lucide-react';
import type { StreetIntelligencePresentation } from '@/types/renter';
import { useToast } from '@/components/ui/Toast';
import { formatDate, humanise } from './format';

const CONFIDENCE_STYLES: Record<string, string> = {
  high: 'bg-emerald-50 text-emerald-700',
  moderate: 'bg-amber-50 text-amber-700',
  low: 'bg-red-50 text-red-700',
};

/**
 * Linked Street Intelligence inside a valid unlock (§24.4): community-powered heading, source and confidence labels,
 * last-updated information and a street-only share action (never property data).
 */
export function StreetIntelligencePanel({ presentation }: { presentation: StreetIntelligencePresentation | null }) {
  const { success, error } = useToast();
  const [sharing, setSharing] = useState(false);

  if (!presentation) {
    return (
      <div className="card p-6">
        <h3 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
          <MapPin className="h-4 w-4 text-veriq-secondary" /> Street Intelligence
        </h3>
        <p className="mt-2 text-sm text-veriq-muted">Street Intelligence for this location is not available to display right now.</p>
      </div>
    );
  }

  const { street, results, share } = presentation;
  const answered = results.filter((item) => item.result);
  const pending = results.filter((item) => !item.result);

  const shareStreet = async () => {
    setSharing(true);
    try {
      if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
        await navigator.share({ title: share.title, text: share.text, url: share.url });
      } else if (typeof navigator !== 'undefined' && navigator.clipboard) {
        await navigator.clipboard.writeText(share.url);
        success('Street Intelligence link copied.');
      } else {
        error('Sharing is not supported on this device. Copy the street page address from your browser instead.');
      }
    } catch (err) {
      if (!(err instanceof DOMException && err.name === 'AbortError')) error('Could not share the street link.');
    } finally {
      setSharing(false);
    }
  };

  return (
    <div className="card p-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h3 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Users className="h-4 w-4 flex-shrink-0 text-veriq-secondary" /> {presentation.heading}
          </h3>
          <p className="mt-1 text-sm leading-6 text-veriq-muted">{presentation.supportingText}</p>
          <p className="mt-2 text-xs text-slate-500">
            <span className="font-semibold text-navy-900">{street.streetName}</span>, {street.area}, {street.city}
            {presentation.lastUpdated && <> · Last updated {formatDate(presentation.lastUpdated)}</>}
            {' '}· {presentation.contributors} contributor{presentation.contributors === 1 ? '' : 's'}
          </p>
          {presentation.sourceLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presentation.sourceLabels.map((label) => (
                <span key={label} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-semibold text-navy-700">{label}</span>
              ))}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={shareStreet}
          disabled={sharing}
          className={`${presentation.lowConfidence ? 'btn-primary' : 'btn-outline'} !px-4 !py-2 !text-sm flex-shrink-0`}
        >
          <Share2 className="h-4 w-4" /> Share Street Intelligence
        </button>
      </div>

      {presentation.lowConfidence && (
        <p className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs leading-5 text-amber-800">
          Confidence for this street is still low. Sharing the street page with people who know {street.streetName} helps improve it.
        </p>
      )}

      {answered.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {answered.map((item) => (
            <div key={item.slug} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
              <div className="flex items-start justify-between gap-2">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{item.category}</p>
                {item.confidenceLevel && (
                  <span className={`rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${CONFIDENCE_STYLES[item.confidenceLevel] ?? 'bg-slate-100 text-slate-600'}`}>
                    {item.confidenceLevel} confidence
                  </span>
                )}
              </div>
              <p className="mt-1 text-sm font-semibold text-navy-900">{humanise(item.result ?? '')}</p>
              <p className="mt-1 text-[11px] text-slate-500">
                {item.sourceLabels.join(' · ') || 'Community contributions'}
                {item.lastUpdated && <> · {formatDate(item.lastUpdated)}</>}
              </p>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <p className="mt-4 text-xs text-slate-500">
          Not enough contributions yet for: {pending.map((item) => item.category).join(', ')}.
        </p>
      )}

      <Link href={`/street-intelligence/${street.readableId ?? street.id}`} className="mt-4 inline-flex text-xs font-semibold text-veriq-secondary hover:underline">
        Open the standalone street page
      </Link>
    </div>
  );
}
