'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ImageOff, Star, Trash2 } from 'lucide-react';
import { listingMediaApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import type {
  ListingMediaItem,
  ListingMediaView,
  MediaChecklistSection,
  MediaOwnerType,
} from '@/types/operator';
import { errorMessage } from './issues';
import { MEDIA_REVIEW_META, MEDIA_STATE_META } from './labels';
import { MediaUploader } from './MediaUploader';
import { Notice, StatusBadge } from './ui';

export interface MediaChecklistProps {
  ownerType: MediaOwnerType;
  ownerId: string;
  /** Hide upload / Not Applicable actions (e.g. archived or frozen records). */
  readOnly?: boolean;
  readOnlyReason?: string;
  onChanged?: () => void;
  compact?: boolean;
}

const sectionId = (section: MediaChecklistSection) => `${section.key}:${section.componentKey ?? ''}`;

/**
 * Per-subtype, per-component media checklist (Appendix G, H.10–H.15): counts, independent max of five, state badges,
 * Not Applicable requests for Agent verification, replacement uploads and the Agent-selected cover.
 */
export function MediaChecklist({ ownerType, ownerId, readOnly = false, readOnlyReason, onChanged, compact = false }: MediaChecklistProps) {
  const [view, setView] = useState<ListingMediaView | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [naTarget, setNaTarget] = useState<MediaChecklistSection | null>(null);
  const [naReason, setNaReason] = useState('');
  const [naSaving, setNaSaving] = useState(false);
  const [naRequested, setNaRequested] = useState<Set<string>>(new Set());
  const [removing, setRemoving] = useState<string | null>(null);
  const [preview, setPreview] = useState<ListingMediaItem | null>(null);
  const { success, error } = useToast();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await listingMediaApi.view(ownerType, ownerId);
      setView(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load media'));
    } finally {
      setLoading(false);
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const refresh = () => {
    void load();
    onChanged?.();
  };

  const itemsBySection = useMemo(() => {
    const map = new Map<string, ListingMediaItem[]>();
    for (const item of view?.items ?? []) {
      if (!item.mediaCategory) continue;
      const key = `${item.mediaCategory}:${item.componentKey ?? ''}`;
      map.set(key, [...(map.get(key) ?? []), item]);
    }
    return map;
  }, [view]);

  const withdraw = async (item: ListingMediaItem) => {
    setRemoving(item.id);
    try {
      const response = await listingMediaApi.remove(item.id);
      success(response.message || 'Image withdrawn');
      refresh();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to withdraw this image'));
    } finally {
      setRemoving(null);
    }
  };

  const requestNotApplicable = async () => {
    if (!naTarget) return;
    if (naReason.trim().length < 3) {
      error('Explain why this section does not apply (at least 3 characters).');
      return;
    }
    setNaSaving(true);
    try {
      const response = await listingMediaApi.notApplicable(ownerType, ownerId, {
        mediaCategory: naTarget.key,
        componentKey: naTarget.componentKey,
        reason: naReason.trim(),
      });
      success(response.message || 'Not Applicable sent to your Veriq Agent for verification');
      setNaRequested((current) => new Set(current).add(sectionId(naTarget)));
      setNaTarget(null);
      setNaReason('');
      refresh();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to send the Not Applicable request'));
    } finally {
      setNaSaving(false);
    }
  };

  if (loading) {
    return (
      <div role="status" aria-live="polite" className="flex items-center gap-2 py-6 text-ui-md text-muted-foreground">
        <LoadingSpinner size="sm" className="text-primary" /> Loading media checklist…
      </div>
    );
  }

  if (loadError || !view) {
    return (
      <Notice tone="error" title="Media could not be loaded">
        <p>{loadError}</p>
        <Button variant="secondary" size="small" className="mt-3" onClick={() => { setLoading(true); void load(); }}>
          Retry
        </Button>
      </Notice>
    );
  }

  const { checklist } = view;
  const required = checklist.sections.filter((section) => section.required);
  const done = required.filter((section) => ['satisfied', 'at_limit', 'not_applicable'].includes(section.state)).length;
  const coverItem = view.items.find((item) => item.id === checklist.coverMediaId) ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        {checklist.complete ? (
          <StatusBadge tone="emerald">
            <CheckCircle2 aria-hidden="true" className="h-3.5 w-3.5" /> Media complete
          </StatusBadge>
        ) : (
          <StatusBadge tone="amber">
            <AlertTriangle aria-hidden="true" className="h-3.5 w-3.5" /> {done} of {required.length} required sections complete
          </StatusBadge>
        )}
        {checklist.coverRequired && (
          <StatusBadge tone={coverItem ? 'emerald' : 'slate'}>
            <Star aria-hidden="true" className="h-3.5 w-3.5" /> {coverItem ? 'Public cover selected' : 'Cover not yet selected'}
          </StatusBadge>
        )}
      </div>
      {!compact && (
        <p className="text-xs text-muted-foreground">
          Each category accepts up to 5 images. New and replacement images stay Pending Review until your Veriq Agent approves them; verified images stay live meanwhile.
          {checklist.coverRequired && ' Your Veriq Agent chooses the public cover from approved cover-eligible images.'}
        </p>
      )}
      {readOnly && readOnlyReason && <Notice tone="info">{readOnlyReason}</Notice>}

      {checklist.sections.length === 0 ? (
        <p className="rounded-unit border border-dashed border-[#ffffff25] px-4 py-3 text-ui-md text-muted-foreground">
          No media categories apply to this record.
        </p>
      ) : (
        <ul className="divide-y divide-[#ffffff10] rounded-review border border-[#ffffff18]">
          {checklist.sections.map((section) => {
            const id = sectionId(section);
            const items = (itemsBySection.get(`${section.key}:${section.componentKey ?? ''}`) ?? []).filter((item) =>
              ['approved', 'pending_review', 'rejected'].includes(item.reviewStatus),
            );
            const active = items.filter((item) => item.reviewStatus !== 'rejected').length;
            const remaining = Math.max(section.max - active, 0);
            const stateMeta = MEDIA_STATE_META[section.state];
            const canRequestNa =
              !readOnly && section.required && ['missing', 'pending_review'].includes(section.state) && !naRequested.has(id);
            return (
              <li key={id} className="space-y-3 p-4">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="flex flex-wrap items-center gap-2 text-ui-md font-semibold text-foreground">
                      {section.label}
                      {section.coverEligible && checklist.coverRequired && (
                        <span className="text-[11px] font-medium text-muted-foreground">Cover eligible</span>
                      )}
                    </p>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      {section.required ? `Required · at least ${section.min}` : 'Optional'} · {section.approved} approved · {section.pending} pending · {active}/{section.max}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge tone={stateMeta.tone}>{stateMeta.label}</StatusBadge>
                    {naRequested.has(id) && section.state !== 'not_applicable' && (
                      <StatusBadge tone="violet">Not Applicable requested</StatusBadge>
                    )}
                  </div>
                </div>

                {items.length > 0 && (
                  <div className="flex flex-wrap gap-3">
                    {items.map((item) => {
                      const meta = MEDIA_REVIEW_META[item.reviewStatus];
                      const pendingReplacement = items.some(
                        (other) => other.replacesMediaId === item.id && other.reviewStatus === 'pending_review',
                      );
                      const thumb = item.variants?.thumbnail ?? item.variants?.card ?? item.url;
                      return (
                        <div key={item.id} className="w-28 space-y-1">
                          <button
                            type="button"
                            className="relative block h-28 w-28 overflow-hidden rounded-unit border border-[#ffffff18] bg-[#070b1444] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                            onClick={() => setPreview(item)}
                            aria-label={`Preview ${section.label} image`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img src={thumb} alt={section.label} className="h-full w-full object-cover" loading="lazy" />
                            {item.id === checklist.coverMediaId && (
                              <span className="absolute left-1 top-1 rounded bg-primary px-1.5 py-0.5 text-[10px] font-semibold text-primary-foreground">Cover</span>
                            )}
                            {item.lowResolution && (
                              <span className="absolute bottom-1 left-1 rounded bg-[#070b14d9] px-1.5 py-0.5 text-[10px] font-semibold text-foreground">Low res</span>
                            )}
                          </button>
                          <StatusBadge tone={meta.tone} className="!px-2 !py-0.5 text-[10px]">{meta.label}</StatusBadge>
                          {item.replacesMediaId && item.reviewStatus === 'pending_review' && (
                            <p className="text-[10px] text-muted-foreground">Replacement</p>
                          )}
                          {item.reviewStatus === 'rejected' && item.rejectionReason && (
                            <p className="text-[10px] leading-snug text-[#fda4af]">{item.rejectionReason}</p>
                          )}
                          {!readOnly && item.reviewStatus === 'approved' && (
                            pendingReplacement ? (
                              <p className="text-[10px] text-[#fcd34d]">Replacement pending</p>
                            ) : (
                              <MediaUploader
                                ownerType={ownerType}
                                ownerId={ownerId}
                                mediaCategory={section.key}
                                componentKey={section.componentKey}
                                replacesMediaId={item.id}
                                remaining={1}
                                onUploaded={refresh}
                                className="w-full !px-2 !py-1 text-[11px]"
                              />
                            )
                          )}
                          {!readOnly && item.reviewStatus === 'pending_review' && item.source === 'operator' && (
                            <Button
                              variant="secondary"
                              size="small"
                              disabled={removing === item.id}
                              onClick={() => void withdraw(item)}
                              className="w-full px-2 py-1 text-[11px]"
                            >
                              {removing === item.id ? (
                                <LoadingSpinner size="sm" />
                              ) : (
                                <Trash2 aria-hidden="true" className="h-3 w-3" />
                              )}{' '}
                              Withdraw
                            </Button>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}

                {!readOnly && (
                  <div className="flex flex-wrap items-center gap-2">
                    <MediaUploader
                      ownerType={ownerType}
                      ownerId={ownerId}
                      mediaCategory={section.key}
                      componentKey={section.componentKey}
                      remaining={remaining}
                      onUploaded={refresh}
                    />
                    {remaining === 0 && (
                      <span className="text-xs text-muted-foreground">5 of 5 used. Replace an approved image to update this category.</span>
                    )}
                    {canRequestNa && (
                      <Button
                        variant="ghost"
                        size="small"
                        onClick={() => { setNaTarget(section); setNaReason(''); }}
                      >
                        <ImageOff aria-hidden="true" className="h-3.5 w-3.5" /> Not applicable
                      </Button>
                    )}
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <Modal isOpen={!!naTarget} onClose={() => setNaTarget(null)} title="Mark section Not Applicable">
        <div className="space-y-4">
          <p className="text-ui-md text-muted-foreground">
            Tell your Veriq Agent why <strong>{naTarget?.label}</strong> does not apply. The section only stops counting as missing after the Agent verifies your reason.
          </p>
          <div>
            <label htmlFor="media-na-reason" className="label">
              Reason
            </label>
            <textarea
              id="media-na-reason"
              className="input"
              rows={4}
              maxLength={1000}
              required
              value={naReason}
              onChange={(event) => setNaReason(event.target.value)}
              placeholder="e.g. This unit has no separate kitchen; cooking is done in the shared outside kitchen."
            />
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setNaTarget(null)}>
              Cancel
            </Button>
            <Button disabled={naSaving} onClick={() => void requestNotApplicable()}>
              {naSaving && <LoadingSpinner size="sm" />} Send to Agent
            </Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!preview} onClose={() => setPreview(null)} title="Image preview" size="lg">
        {preview && (
          <div className="space-y-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={preview.variants?.detail ?? preview.url} alt="Listing media preview" className="max-h-[70vh] w-full rounded-unit object-contain" />
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <StatusBadge tone={MEDIA_REVIEW_META[preview.reviewStatus].tone}>{MEDIA_REVIEW_META[preview.reviewStatus].label}</StatusBadge>
              {preview.width && preview.height && <span>{preview.width}×{preview.height}px</span>}
              {preview.lowResolution && <span>Flagged Low Resolution for Agent review</span>}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
