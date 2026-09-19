'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Check, ImageOff, ImagePlus, MinusCircle, Star, Trash2, Upload, X } from 'lucide-react';
import type { ListingMediaItem, ListingMediaView, MediaChecklistSection, MediaOwnerType } from '@/types/agent';
import { listingMediaApi } from '@/lib/api/agent';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { errorMessage, formatDateTime, humanize } from './format';
import { ErrorBlock, Field, InlineNotice, LoadingBlock, smallButton, smallDangerButton, smallPrimaryButton } from './ui';

const SECTION_STATE_STYLES: Record<string, string> = {
  satisfied: 'bg-emerald-50 text-emerald-700',
  at_limit: 'bg-emerald-50 text-emerald-700',
  not_applicable: 'bg-slate-100 text-slate-600',
  pending_review: 'bg-amber-50 text-amber-700',
  missing: 'bg-red-50 text-red-700',
  optional: 'bg-slate-50 text-slate-500',
};

const ACCEPTED_IMAGES = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

type ModalState =
  | { kind: 'reject'; item: ListingMediaItem }
  | { kind: 'remove'; item: ListingMediaItem }
  | { kind: 'upload'; section: MediaChecklistSection; replaces?: ListingMediaItem }
  | { kind: 'not_applicable'; section: MediaChecklistSection }
  | null;

const sectionId = (section: { key: string; componentKey: string | null }) => `${section.key}::${section.componentKey ?? ''}`;

/** Media verification per owner (§9, G.1, H.10–H.15): approve/reject, upload (auto-approved), cover, remove and Not Applicable. */
export function MediaReviewPanel({
  ownerType,
  ownerId,
  onChanged,
  readOnly,
}: {
  ownerType: MediaOwnerType;
  ownerId: string;
  onChanged?: () => void;
  readOnly?: boolean;
}) {
  const { success, error: toastError } = useToast();
  const [view, setView] = useState<ListingMediaView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [modal, setModal] = useState<ModalState>(null);
  const [text, setText] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [caption, setCaption] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await listingMediaApi.view(ownerType, ownerId);
      setView(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load media'));
    }
  }, [ownerType, ownerId]);

  useEffect(() => {
    load();
  }, [load]);

  const refresh = async () => {
    await load();
    onChanged?.();
  };

  const run = async (id: string, action: () => Promise<{ message?: string }>, fallback: string) => {
    setBusyId(id);
    try {
      const res = await action();
      success(res.message || 'Media updated');
      setModal(null);
      setText('');
      setFile(null);
      setCaption('');
      await refresh();
    } catch (err) {
      toastError(errorMessage(err, fallback));
    } finally {
      setBusyId(null);
    }
  };

  const grouped = useMemo(() => {
    if (!view) return [];
    return view.checklist.sections.map((section) => ({
      section,
      items: view.items.filter(
        (item) => item.mediaCategory === section.key && (item.componentKey ?? null) === (section.componentKey ?? null),
      ),
    }));
  }, [view]);

  if (loadError) return <ErrorBlock message={loadError} onRetry={load} />;
  if (!view) return <LoadingBlock label="Loading media…" />;

  const { checklist } = view;
  const openModal = (next: ModalState) => {
    setText('');
    setFile(null);
    setCaption('');
    setModal(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className={cn('badge !px-2.5 !py-0.5', checklist.complete ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
          {checklist.complete ? 'Media complete' : 'Media incomplete'}
        </span>
        {checklist.coverRequired && (
          <span className={cn('badge !px-2.5 !py-0.5', checklist.coverMediaId ? 'bg-emerald-50 text-emerald-700' : 'bg-red-50 text-red-700')}>
            {checklist.coverMediaId ? 'Public cover set' : 'Public cover required'}
          </span>
        )}
        <span className="text-slate-400">Schema v{checklist.schemaVersion}</span>
      </div>

      {checklist.coverRequired && !checklist.coverMediaId && (
        <InlineNotice tone="warning">
          Set one approved cover-eligible image (front view, land frontage, or offered room / living area) as the single public image. All
          other media remains unlock-only.
        </InlineNotice>
      )}

      {grouped.length === 0 && <p className="text-sm text-slate-500">This schema has no media sections.</p>}

      <div className="space-y-3">
        {grouped.map(({ section, items }) => {
          const activeCount = items.filter((item) => item.reviewStatus === 'approved' || item.reviewStatus === 'pending_review').length;
          const canUpload = !readOnly && section.approved < section.max && activeCount < section.max;
          const canMarkNotApplicable = !readOnly && section.required && !['satisfied', 'at_limit', 'not_applicable'].includes(section.state);
          return (
            <div key={sectionId(section)} className="rounded-xl border border-slate-100 p-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">
                    {section.label}
                    {section.coverEligible && <span className="ml-2 text-[10px] font-bold uppercase text-veriq-secondary">Cover eligible</span>}
                  </p>
                  <p className="text-[11px] text-slate-500">
                    {section.required ? `Required · min ${section.min}` : 'Optional'} · max {section.max} · {section.approved} approved
                    {section.pending ? ` · ${section.pending} pending` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  <span className={cn('badge !px-2 !py-0.5 text-[11px]', SECTION_STATE_STYLES[section.state])}>{humanize(section.state)}</span>
                  {canUpload && (
                    <button type="button" className={smallButton} onClick={() => openModal({ kind: 'upload', section })}>
                      <ImagePlus className="h-3.5 w-3.5" /> Upload
                    </button>
                  )}
                  {canMarkNotApplicable && (
                    <button type="button" className={smallButton} onClick={() => openModal({ kind: 'not_applicable', section })}>
                      <MinusCircle className="h-3.5 w-3.5" /> Not Applicable
                    </button>
                  )}
                </div>
              </div>

              {items.length > 0 && (
                <ul className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {items.map((item) => {
                    const src = item.variants?.thumbnail ?? item.variants?.card ?? item.url;
                    const busy = busyId === item.id;
                    return (
                      <li key={item.id} className={cn('overflow-hidden rounded-xl border', item.isCover ? 'border-veriq-secondary' : 'border-slate-100')}>
                        <a href={item.variants?.detail ?? item.url} target="_blank" rel="noopener noreferrer" className="block aspect-[4/3] bg-slate-100">
                          {src ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={src} alt={item.caption ?? section.label} className="h-full w-full object-cover" loading="lazy" />
                          ) : (
                            <span className="grid h-full place-items-center text-slate-400">
                              <ImageOff className="h-6 w-6" />
                            </span>
                          )}
                        </a>
                        <div className="space-y-2 p-2.5">
                          <div className="flex flex-wrap items-center gap-1">
                            <span
                              className={cn(
                                'badge !px-2 !py-0.5 text-[10px]',
                                item.reviewStatus === 'approved'
                                  ? 'bg-emerald-50 text-emerald-700'
                                  : item.reviewStatus === 'pending_review'
                                    ? 'bg-amber-50 text-amber-700'
                                    : 'bg-red-50 text-red-700',
                              )}
                            >
                              {humanize(item.reviewStatus)}
                            </span>
                            {item.isCover && <span className="badge bg-veriq-secondary !px-2 !py-0.5 text-[10px] text-white">Public cover</span>}
                            {item.lowResolution && <span className="badge bg-amber-50 !px-2 !py-0.5 text-[10px] text-amber-700">Low resolution</span>}
                            {item.replacesMediaId && <span className="badge bg-blue-50 !px-2 !py-0.5 text-[10px] text-blue-700">Replacement</span>}
                          </div>
                          <p className="text-[11px] text-slate-500">
                            {humanize(item.source)} · {formatDateTime(item.createdAt)}
                          </p>
                          {item.caption && <p className="text-xs text-slate-600">{item.caption}</p>}
                          {item.rejectionReason && <p className="text-xs text-red-600">Rejected: {item.rejectionReason}</p>}
                          {!readOnly && (
                            <div className="flex flex-wrap gap-1.5">
                              {item.reviewStatus === 'pending_review' && (
                                <>
                                  <button
                                    type="button"
                                    className={smallPrimaryButton}
                                    disabled={busy}
                                    onClick={() => run(item.id, () => listingMediaApi.review(item.id, 'approve'), 'Could not approve the image')}
                                  >
                                    {busy ? <LoadingSpinner size="sm" /> : <Check className="h-3.5 w-3.5" />} Approve
                                  </button>
                                  <button type="button" className={smallDangerButton} disabled={busy} onClick={() => openModal({ kind: 'reject', item })}>
                                    <X className="h-3.5 w-3.5" /> Reject
                                  </button>
                                </>
                              )}
                              {item.reviewStatus === 'approved' && section.coverEligible && !item.isCover && checklist.coverRequired && (
                                <button
                                  type="button"
                                  className={smallButton}
                                  disabled={busy}
                                  onClick={() => run(item.id, () => listingMediaApi.setCover(item.id), 'Could not set the cover')}
                                >
                                  {busy ? <LoadingSpinner size="sm" /> : <Star className="h-3.5 w-3.5" />} Set cover
                                </button>
                              )}
                              {item.reviewStatus === 'approved' && (
                                <button type="button" className={smallButton} disabled={busy} onClick={() => openModal({ kind: 'upload', section, replaces: item })}>
                                  <Upload className="h-3.5 w-3.5" /> Replace
                                </button>
                              )}
                              {item.reviewStatus !== 'rejected' && (
                                <button type="button" className={smallDangerButton} disabled={busy} onClick={() => openModal({ kind: 'remove', item })}>
                                  <Trash2 className="h-3.5 w-3.5" /> Remove
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          );
        })}
      </div>

      <Modal
        isOpen={modal?.kind === 'reject'}
        onClose={() => busyId === null && setModal(null)}
        title="Reject image"
        size="sm"
      >
        {modal?.kind === 'reject' && (
          <div className="space-y-4">
            <Field label="Reason shown to the Operator">
              <textarea className="input resize-none !py-2 text-sm" rows={3} maxLength={500} value={text} onChange={(event) => setText(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButton} onClick={() => setModal(null)} disabled={busyId !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={smallDangerButton}
                disabled={busyId !== null || !text.trim()}
                onClick={() => run(modal.item.id, () => listingMediaApi.review(modal.item.id, 'reject', text), 'Could not reject the image')}
              >
                {busyId ? <LoadingSpinner size="sm" /> : <X className="h-3.5 w-3.5" />} Reject image
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={modal?.kind === 'remove'} onClose={() => busyId === null && setModal(null)} title="Remove image" size="sm">
        {modal?.kind === 'remove' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              The image is removed from this listing and capacity in the category is restored. If it is the public cover, set a new cover afterwards.
            </p>
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButton} onClick={() => setModal(null)} disabled={busyId !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={smallDangerButton}
                disabled={busyId !== null}
                onClick={() => run(modal.item.id, () => listingMediaApi.remove(modal.item.id), 'Could not remove the image')}
              >
                {busyId ? <LoadingSpinner size="sm" /> : <Trash2 className="h-3.5 w-3.5" />} Remove
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal
        isOpen={modal?.kind === 'upload'}
        onClose={() => busyId === null && setModal(null)}
        title={modal?.kind === 'upload' && modal.replaces ? 'Replace image' : 'Upload verified image'}
        size="md"
      >
        {modal?.kind === 'upload' && (
          <div className="space-y-4">
            <InlineNotice tone="info">
              Images uploaded by the Veriq Agent are approved immediately for <strong>{modal.section.label}</strong>
              {modal.replaces ? ' and supersede the replaced image.' : '.'} Location metadata is stripped on processing.
            </InlineNotice>
            <Field label="Image file">
              <input
                type="file"
                accept={ACCEPTED_IMAGES}
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                onChange={(event) => setFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <Field label="Caption (optional)">
              <input className="input !py-2 text-sm" maxLength={300} value={caption} onChange={(event) => setCaption(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButton} onClick={() => setModal(null)} disabled={busyId !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={smallPrimaryButton}
                disabled={busyId !== null || !file}
                onClick={() =>
                  file &&
                  run(
                    `upload-${sectionId(modal.section)}`,
                    () =>
                      listingMediaApi.upload(ownerType, ownerId, {
                        file,
                        mediaCategory: modal.section.key,
                        componentKey: modal.section.componentKey,
                        replacesMediaId: modal.replaces?.id,
                        caption,
                      }),
                    'Upload failed',
                  )
                }
              >
                {busyId ? <LoadingSpinner size="sm" /> : <Upload className="h-3.5 w-3.5" />} Upload
              </button>
            </div>
          </div>
        )}
      </Modal>

      <Modal isOpen={modal?.kind === 'not_applicable'} onClose={() => busyId === null && setModal(null)} title="Record Not Applicable" size="md">
        {modal?.kind === 'not_applicable' && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Record that <strong>{modal.section.label}</strong> does not apply to this listing. Your decision is verified immediately and audited.
            </p>
            <Field label="Why this section is not applicable">
              <textarea className="input resize-none !py-2 text-sm" rows={3} maxLength={1000} value={text} onChange={(event) => setText(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButton} onClick={() => setModal(null)} disabled={busyId !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={smallPrimaryButton}
                disabled={busyId !== null || text.trim().length < 3}
                onClick={() =>
                  run(
                    `na-${sectionId(modal.section)}`,
                    () =>
                      listingMediaApi.recordNotApplicable(ownerType, ownerId, {
                        mediaCategory: modal.section.key,
                        componentKey: modal.section.componentKey,
                        reason: text.trim(),
                      }),
                    'Could not record Not Applicable',
                  )
                }
              >
                {busyId ? <LoadingSpinner size="sm" /> : <MinusCircle className="h-3.5 w-3.5" />} Record Not Applicable
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
