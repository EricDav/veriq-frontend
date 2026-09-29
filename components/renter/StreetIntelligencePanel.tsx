'use client';

import { useState } from 'react';
import Link from 'next/link';
import { MapPin, Share2, Users } from 'lucide-react';
import type { StreetIntelligencePresentation } from '@/types/renter';
import { Badge, Button, Eyebrow, Notice, Panel, type BadgeTone } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { formatDate, humanise } from './format';

const CONFIDENCE_TONES: Record<string, BadgeTone> = {
  high: 'success',
  moderate: 'amber',
  low: 'red',
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
      <Panel>
        <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
          <MapPin aria-hidden="true" className="h-4 w-4 text-primary" /> Street Intelligence
        </h3>
        <p className="mt-2 text-ui-md text-muted-foreground">
          Street Intelligence for this location is not available to display right now.
        </p>
      </Panel>
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
    <Panel>
      <div className="flex flex-col gap-4 wide:flex-row wide:items-start wide:justify-between">
        <div className="min-w-0">
          <h3 className="flex items-center gap-2 font-display text-base font-semibold text-foreground">
            <Users aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-primary" /> {presentation.heading}
          </h3>
          <p className="mt-1 text-ui-md leading-6 text-muted-foreground">{presentation.supportingText}</p>
          <p className="mt-2 text-ui-sm text-muted-foreground">
            <span className="font-semibold text-foreground">{street.streetName}</span>, {street.area}, {street.city}
            {presentation.lastUpdated && <> · Last updated {formatDate(presentation.lastUpdated)}</>}
            {' '}· {presentation.contributors} contributor{presentation.contributors === 1 ? '' : 's'}
          </p>
          {presentation.sourceLabels.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {presentation.sourceLabels.map((label) => (
                <Badge key={label} tone="neutral">
                  {label}
                </Badge>
              ))}
            </div>
          )}
        </div>
        <Button
          variant={presentation.lowConfidence ? 'primary' : 'secondary'}
          size="small"
          onClick={shareStreet}
          disabled={sharing}
          className="flex-shrink-0"
        >
          <Share2 aria-hidden="true" className="h-4 w-4" /> Share Street Intelligence
        </Button>
      </div>

      {presentation.lowConfidence && (
        <Notice tone="amber" className="mt-4">
          Confidence for this street is still low. Sharing the street page with people who know {street.streetName}{' '}
          helps improve it.
        </Notice>
      )}

      {answered.length > 0 && (
        <div className="mt-5 grid grid-cols-1 gap-3 wide:grid-cols-2">
          {answered.map((item) => (
            <div key={item.slug} className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
              <div className="flex items-start justify-between gap-2">
                <Eyebrow>{item.category}</Eyebrow>
                {item.confidenceLevel && (
                  <Badge tone={CONFIDENCE_TONES[item.confidenceLevel] ?? 'neutral'} className="capitalize">
                    {item.confidenceLevel} confidence
                  </Badge>
                )}
              </div>
              <p className="mt-1 text-ui-md font-semibold text-foreground">{humanise(item.result ?? '')}</p>
              <p className="mt-1 text-ui-sm text-muted-foreground">
                {item.sourceLabels.join(' · ') || 'Community contributions'}
                {item.lastUpdated && <> · {formatDate(item.lastUpdated)}</>}
              </p>
            </div>
          ))}
        </div>
      )}

      {pending.length > 0 && (
        <p className="mt-4 text-ui-sm text-muted-foreground">
          Not enough contributions yet for: {pending.map((item) => item.category).join(', ')}.
        </p>
      )}

      <Link
        href={`/street-intelligence/${street.readableId ?? street.id}`}
        className="mt-4 inline-flex text-ui-sm font-semibold text-primary hover:underline"
      >
        Open the standalone street page
      </Link>
    </Panel>
  );
}
