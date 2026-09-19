'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { History, Link2, MapPin, Search, Sparkles } from 'lucide-react';
import type { IntelligenceCategory, Street } from '@/types';
import type { InitialIntelligenceAnswer, StreetIntelligenceLink, StreetLinkState, StreetLinkTargetType } from '@/types/agent';
import { streetLinksApi } from '@/lib/api/agent';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { cn } from '@/lib/utils';
import { errorMessage, formatDateTime } from './format';
import { ErrorBlock, Field, InlineNotice, LoadingBlock, smallButton, smallPrimaryButton } from './ui';

function InitialIntelligenceForm({
  categories,
  onSubmit,
  onCancel,
  submitting,
}: {
  categories: IntelligenceCategory[];
  onSubmit: (answers: InitialIntelligenceAnswer[], evidenceNote: string) => void;
  onCancel: () => void;
  submitting: boolean;
}) {
  const [answers, setAnswers] = useState<Record<string, InitialIntelligenceAnswer>>({});
  const [evidenceNote, setEvidenceNote] = useState('');
  const [showErrors, setShowErrors] = useState(false);
  const missing = categories.filter((category) => !answers[category.id]?.optionId);

  const sections = Array.from(new Set(categories.map((category) => category.section)));

  return (
    <form
      className="space-y-5"
      onSubmit={(event) => {
        event.preventDefault();
        if (missing.length) {
          setShowErrors(true);
          return;
        }
        onSubmit(Object.values(answers), evidenceNote);
      }}
    >
      <InlineNotice tone="info">
        Saved against the approved street and visibly labelled <strong>Initial Veriq Intelligence</strong>. Every question must be
        deliberately answered; there is no Unknown option (§24.3). It never overwrites community contributions.
      </InlineNotice>
      {sections.map((section) => (
        <fieldset key={section} className="space-y-3">
          <legend className="text-[11px] font-bold uppercase tracking-wide text-slate-400">{section}</legend>
          {categories
            .filter((category) => category.section === section)
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((category) => {
              const answer = answers[category.id];
              const invalid = showErrors && !answer?.optionId;
              const supplementary = category.supplementaryConfig;
              return (
                <div key={category.id} className={cn('rounded-xl border p-3', invalid ? 'border-red-200 bg-red-50/40' : 'border-slate-100')}>
                  <label className="label !mb-1 !text-xs" htmlFor={`initial-${category.id}`}>
                    {category.question || category.name} <span className="text-red-500">*</span>
                  </label>
                  <select
                    id={`initial-${category.id}`}
                    className="input !py-2"
                    value={answer?.optionId ?? ''}
                    onChange={(event) =>
                      setAnswers((current) => ({
                        ...current,
                        [category.id]: { categoryId: category.id, optionId: event.target.value, supplementaryValue: current[category.id]?.supplementaryValue },
                      }))
                    }
                  >
                    <option value="">Select…</option>
                    {category.options
                      .filter((option) => option.isActive)
                      .sort((a, b) => a.sortOrder - b.sortOrder)
                      .map((option) => (
                        <option key={option.id} value={option.id}>
                          {option.label}
                        </option>
                      ))}
                  </select>
                  {supplementary && supplementary.options.length > 0 && (
                    <div className="mt-2">
                      <p className="mb-1 text-[11px] text-slate-500">{supplementary.question}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {supplementary.options.map((option) => {
                          const selected = answer?.supplementaryValue ?? [];
                          const active = selected.includes(option);
                          return (
                            <button
                              key={option}
                              type="button"
                              aria-pressed={active}
                              onClick={() =>
                                setAnswers((current) => {
                                  const existing = current[category.id] ?? { categoryId: category.id, optionId: '' };
                                  const values = existing.supplementaryValue ?? [];
                                  return {
                                    ...current,
                                    [category.id]: {
                                      ...existing,
                                      supplementaryValue: values.includes(option) ? values.filter((item) => item !== option) : [...values, option],
                                    },
                                  };
                                })
                              }
                              className={cn(
                                'rounded-full border px-2.5 py-1 text-[11px] font-medium',
                                active ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600',
                              )}
                            >
                              {option}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                  {invalid && <p className="mt-1 text-[11px] text-red-600">Answer this question</p>}
                </div>
              );
            })}
        </fieldset>
      ))}
      <Field label="Source / evidence note (optional)">
        <textarea className="input resize-none !py-2 text-sm" rows={2} maxLength={1000} value={evidenceNote} onChange={(event) => setEvidenceNote(event.target.value)} />
      </Field>
      {showErrors && missing.length > 0 && (
        <p className="text-xs text-red-600">Answer every question before saving: {missing.map((category) => category.name).join(', ')}</p>
      )}
      <div className="flex flex-wrap justify-end gap-2">
        <button type="button" className={smallButton} onClick={onCancel} disabled={submitting}>
          Cancel
        </button>
        <button type="submit" className={smallPrimaryButton} disabled={submitting}>
          {submitting ? <LoadingSpinner size="sm" /> : <Sparkles className="h-3.5 w-3.5" />} Save Initial Veriq Intelligence &amp; link
        </button>
      </div>
    </form>
  );
}

/**
 * Street Intelligence linkage (§17.3, §24.3). Two distinct actions: Link Existing Street Intelligence (approved street with
 * intelligence) and Provide Initial Veriq Intelligence (approved street with no intelligence record).
 */
export function StreetIntelligencePanel({
  targetType,
  targetId,
  location,
  onChanged,
  readOnly,
}: {
  targetType: StreetLinkTargetType;
  targetId: string;
  location: { localGovernmentId: string | null; areaId: string | null; state?: string; city?: string };
  onChanged?: () => void;
  readOnly?: boolean;
}) {
  const { success, error: toastError } = useToast();
  const [state, setState] = useState<StreetLinkState | null>(null);
  const [history, setHistory] = useState<StreetIntelligenceLink[]>([]);
  const [loadError, setLoadError] = useState('');
  const [busy, setBusy] = useState<'link' | 'initial' | null>(null);
  const [initialOpen, setInitialOpen] = useState(false);
  const [categories, setCategories] = useState<IntelligenceCategory[] | null>(null);
  const [categoriesError, setCategoriesError] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Street[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState('');
  const [relinkTarget, setRelinkTarget] = useState<Street | null>(null);
  const [relinkReason, setRelinkReason] = useState('');
  const [showHistory, setShowHistory] = useState(false);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const [stateRes, historyRes] = await Promise.all([
        streetLinksApi.state(targetType, targetId),
        streetLinksApi.history(targetType, targetId),
      ]);
      setState(stateRes.data);
      setHistory(historyRes.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the Street Intelligence link'));
    }
  }, [targetType, targetId]);

  useEffect(() => {
    load();
  }, [load]);

  const afterChange = async () => {
    await load();
    onChanged?.();
  };

  const linkStreet = async (streetId: string, reason?: string) => {
    setBusy('link');
    try {
      await streetLinksApi.link({ targetType, targetId, streetId, ...(reason?.trim() ? { reason: reason.trim() } : {}) });
      success('Street Intelligence linked');
      setRelinkTarget(null);
      setRelinkReason('');
      setSearchOpen(false);
      await afterChange();
    } catch (err) {
      toastError(errorMessage(err, 'Could not link the street'));
    } finally {
      setBusy(null);
    }
  };

  const openInitial = async () => {
    setInitialOpen(true);
    if (categories) return;
    setCategoriesError('');
    try {
      const res = await streetLinksApi.categories();
      setCategories(res.data);
    } catch (err) {
      setCategoriesError(errorMessage(err, 'Could not load Street Intelligence questions'));
    }
  };

  const submitInitial = async (answers: InitialIntelligenceAnswer[], evidenceNote: string) => {
    if (!state?.street) return;
    setBusy('initial');
    try {
      await streetLinksApi.provideInitial({
        targetType,
        targetId,
        streetId: state.street.id,
        answers,
        ...(evidenceNote.trim() ? { evidenceNote: evidenceNote.trim() } : {}),
      });
      if (state.link?.streetId !== state.street.id) {
        await streetLinksApi.link({ targetType, targetId, streetId: state.street.id });
      }
      success('Initial Veriq Intelligence saved and linked');
      setInitialOpen(false);
      await afterChange();
    } catch (err) {
      toastError(errorMessage(err, 'Could not save Initial Veriq Intelligence'));
      await load();
    } finally {
      setBusy(null);
    }
  };

  const search = async () => {
    if (!location.localGovernmentId && !(location.state && location.city)) {
      setSearchError('Verify the listing location (LGA and Veriq Area) before selecting a different street.');
      return;
    }
    setSearching(true);
    setSearchError('');
    try {
      const res = await streetLinksApi.searchStreets({
        q: query.trim() || undefined,
        locationId: location.localGovernmentId ?? undefined,
        areaId: location.areaId ?? undefined,
        state: location.localGovernmentId ? undefined : location.state,
        city: location.localGovernmentId ? undefined : location.city,
      });
      setResults(res.data);
    } catch (err) {
      setSearchError(errorMessage(err, 'Street search failed'));
    } finally {
      setSearching(false);
    }
  };

  if (loadError) return <ErrorBlock message={loadError} onRetry={load} />;
  if (!state) return <LoadingBlock label="Loading street link…" />;

  const street = state.street;
  const linkedToCurrent = !!state.link && !!street && state.link.streetId === street.id;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-slate-100 p-4">
        {street ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
            <div className="min-w-0">
              <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
                <MapPin className="h-4 w-4 flex-shrink-0 text-veriq-secondary" /> {street.streetName}
              </p>
              <p className="text-xs text-slate-500">
                {street.area}, {street.city}, {street.state}
                {street.readableId ? ` · ${street.readableId}` : ''}
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              <span className={cn('badge !px-2 !py-0.5 text-[11px]', state.streetApproved ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                {state.streetApproved ? 'Approved street' : `Street ${street.status}`}
              </span>
              <span className={cn('badge !px-2 !py-0.5 text-[11px]', state.hasIntelligence ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600')}>
                {state.hasIntelligence ? 'Has intelligence' : 'No intelligence record'}
              </span>
              <span className={cn('badge !px-2 !py-0.5 text-[11px]', linkedToCurrent ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700')}>
                {linkedToCurrent ? `Linked · ${state.link?.intelligenceSource === 'initial_veriq' ? 'Initial Veriq Intelligence' : 'Existing intelligence'}` : 'Not linked'}
              </span>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No street is recorded for this listing yet. Select the verified canonical street below.</p>
        )}
        {state.publicationReady && (
          <p className="mt-3 text-xs font-medium text-emerald-700">Street linkage satisfies publication requirements.</p>
        )}
      </div>

      {street && !state.streetApproved && (
        <InlineNotice tone="warning">
          This street is still a proposal. Admin must approve it before it can be linked or receive Initial Veriq Intelligence; publication stays
          blocked until then.
        </InlineNotice>
      )}

      {!readOnly && (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Link2 className="h-4 w-4" /> Link Existing Street Intelligence
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Reuse the approved street&apos;s intelligence even when confidence is low. Never match on name alone.
            </p>
            <button
              type="button"
              className={cn(smallPrimaryButton, 'mt-3')}
              disabled={!state.canLinkExisting || linkedToCurrent || busy !== null || !street}
              onClick={() => street && linkStreet(street.id)}
            >
              {busy === 'link' ? <LoadingSpinner size="sm" /> : <Link2 className="h-3.5 w-3.5" />}
              {linkedToCurrent ? 'Already linked' : 'Link existing intelligence'}
            </button>
            {!state.canLinkExisting && street && state.streetApproved && !state.hasIntelligence && (
              <p className="mt-2 text-[11px] text-slate-400">Unavailable: this approved street has no intelligence record yet.</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-100 p-4">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900">
              <Sparkles className="h-4 w-4" /> Provide Initial Veriq Intelligence
            </p>
            <p className="mt-1 text-xs text-slate-500">Only for an approved street with no intelligence record. Answers every Street Intelligence question.</p>
            <button type="button" className={cn(smallButton, 'mt-3')} disabled={!state.canProvideInitial || busy !== null} onClick={openInitial}>
              <Sparkles className="h-3.5 w-3.5" /> Provide initial intelligence
            </button>
            {!state.canProvideInitial && state.hasIntelligence && (
              <p className="mt-2 text-[11px] text-slate-400">Unavailable: the street already has intelligence — link it instead.</p>
            )}
          </div>
        </div>
      )}

      {!readOnly && (
        <div className="rounded-xl border border-slate-100 p-4">
          <button type="button" className="flex w-full items-center justify-between text-left text-sm font-semibold text-navy-900" onClick={() => setSearchOpen((open) => !open)}>
            <span className="flex items-center gap-2">
              <Search className="h-4 w-4" /> {street ? 'Wrong street? Select the verified canonical street' : 'Select the verified canonical street'}
            </span>
            <span className="text-xs text-slate-400">{searchOpen ? 'Hide' : 'Show'}</span>
          </button>
          {searchOpen && (
            <div className="mt-3 space-y-3">
              <p className="text-[11px] text-slate-500">Approved streets in the verified LGA and Veriq Area only. Relinking is audited.</p>
              <div className="flex gap-2">
                <input
                  value={query}
                  onChange={(event) => setQuery(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                      search();
                    }
                  }}
                  placeholder="Street / estate / road name"
                  className="input !py-2 text-sm"
                />
                <button type="button" className={smallButton} onClick={search} disabled={searching}>
                  {searching ? <LoadingSpinner size="sm" /> : <Search className="h-3.5 w-3.5" />} Search
                </button>
              </div>
              {searchError && <p className="text-xs text-red-600">{searchError}</p>}
              {results.length > 0 && (
                <ul className="divide-y divide-slate-100 rounded-lg border border-slate-100">
                  {results.map((result) => (
                    <li key={result.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-navy-900">{result.streetName}</p>
                        <p className="text-[11px] text-slate-500">
                          {result.area}, {result.city}
                          {result.landmark ? ` · ${result.landmark}` : ''}
                        </p>
                      </div>
                      <button
                        type="button"
                        className={smallButton}
                        disabled={result.id === state.link?.streetId || busy !== null}
                        onClick={() => {
                          setRelinkTarget(result);
                          setRelinkReason('');
                        }}
                      >
                        {result.id === state.link?.streetId ? 'Current link' : 'Use this street'}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
              {!searching && results.length === 0 && query && !searchError && <p className="text-xs text-slate-400">Search to see approved streets.</p>}
            </div>
          )}
        </div>
      )}

      {history.length > 0 && (
        <div>
          <button type="button" className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900" onClick={() => setShowHistory((open) => !open)}>
            <History className="h-3.5 w-3.5" /> {showHistory ? 'Hide' : 'Show'} link history ({history.length})
          </button>
          {showHistory && (
            <ul className="mt-2 space-y-1 text-xs text-slate-600">
              {history.map((item) => (
                <li key={item.id} className="rounded-lg bg-slate-50 px-3 py-2">
                  {formatDateTime(item.createdAt)} · street {item.streetId} · {item.intelligenceSource === 'initial_veriq' ? 'Initial Veriq Intelligence' : 'Existing'}
                  {item.isCurrent ? ' · current' : item.unlinkedAt ? ` · unlinked ${formatDateTime(item.unlinkedAt)}` : ''}
                  {item.reason ? ` · “${item.reason}”` : ''}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      <Modal isOpen={initialOpen} onClose={() => busy === null && setInitialOpen(false)} title="Provide Initial Veriq Intelligence" size="lg">
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {categoriesError ? (
            <ErrorBlock message={categoriesError} onRetry={openInitial} />
          ) : !categories ? (
            <LoadingBlock label="Loading questions…" />
          ) : (
            <InitialIntelligenceForm categories={categories} submitting={busy === 'initial'} onCancel={() => setInitialOpen(false)} onSubmit={submitInitial} />
          )}
        </div>
      </Modal>

      <Modal isOpen={!!relinkTarget} onClose={() => busy === null && setRelinkTarget(null)} title="Link this street" size="md">
        {relinkTarget && (
          <div className="space-y-4">
            <p className="text-sm text-slate-600">
              Link <strong>{relinkTarget.streetName}</strong> ({relinkTarget.area}, {relinkTarget.city}) as the canonical Street Intelligence record. The
              listing&apos;s street, LGA and Veriq Area are updated to match. If this street has no intelligence yet, provide Initial Veriq
              Intelligence next.
            </p>
            <Field label={state.link ? 'Reason for relinking' : 'Reason (optional)'}>
              <textarea className="input resize-none !py-2 text-sm" rows={2} maxLength={500} value={relinkReason} onChange={(event) => setRelinkReason(event.target.value)} />
            </Field>
            <div className="flex justify-end gap-2">
              <button type="button" className={smallButton} onClick={() => setRelinkTarget(null)} disabled={busy !== null}>
                Cancel
              </button>
              <button
                type="button"
                className={smallPrimaryButton}
                disabled={busy !== null || (!!state.link && relinkReason.trim().length < 3)}
                onClick={() => linkStreet(relinkTarget.id, relinkReason)}
              >
                {busy === 'link' ? <LoadingSpinner size="sm" /> : <Link2 className="h-3.5 w-3.5" />} Link street
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
