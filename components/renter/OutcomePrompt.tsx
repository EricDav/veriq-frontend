'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle, HelpCircle } from 'lucide-react';
import { outcomesApi } from '@/lib/api/renter';
import type { OutcomeChoice, PendingOutcome } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { ApiErrorNotice } from './ApiErrorNotice';
import { CATEGORY_LABELS, TARGET_TYPE_LABELS, formatDateTime } from './format';

const CHOICES: Array<{ value: OutcomeChoice; label: string; hint: string }> = [
  { value: 'took', label: 'I took / rented / booked it', hint: 'Tell us which Unit so future resident intelligence is attached correctly.' },
  { value: 'did_not_take', label: 'I did not take it', hint: 'That is fine — this helps keep availability accurate.' },
  { value: 'still_considering', label: 'I am still considering it', hint: 'You can update your answer later.' },
];

/** Post-unlock outcome question (§20): took / did not take / still considering, Unit selection and optional consent. */
export function OutcomePrompt({ prompt, onAnswered }: { prompt: PendingOutcome; onAnswered: (unlockId: string) => void }) {
  const { success } = useToast();
  const [choice, setChoice] = useState<OutcomeChoice | null>(null);
  const [unitId, setUnitId] = useState('');
  const [consent, setConsent] = useState(false);
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const unitRequired = choice === 'took' && prompt.units.length > 1;
  const canSubmit = !!choice && (!unitRequired || !!unitId) && !submitting;
  const name = `outcome-${prompt.unlockId}`;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!choice) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await outcomesApi.record({
        unlockId: prompt.unlockId,
        outcome: choice,
        unitId: choice === 'took' && unitId ? unitId : undefined,
        residentIntelligenceConsent: choice === 'took' ? consent : undefined,
        note: note.trim() || undefined,
      });
      success(res.message || 'Thanks — your answer helps keep Veriq accurate');
      onAnswered(prompt.unlockId);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="rounded-2xl border border-blue-100 bg-white p-5 shadow-sm">
      <div className="flex items-start gap-3">
        <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-blue-50 text-blue-600"><HelpCircle className="h-4 w-4" /></span>
        <div className="min-w-0">
          <p className="text-sm font-bold text-navy-900">What happened with {prompt.listing?.title ?? `this ${TARGET_TYPE_LABELS[prompt.targetType].toLowerCase()}`}?</p>
          <p className="text-xs text-veriq-muted">
            {prompt.listing ? `${CATEGORY_LABELS[prompt.listing.category] ?? TARGET_TYPE_LABELS[prompt.targetType]}${prompt.listing.area ? ` · ${prompt.listing.area}` : ''} · ` : ''}
            Access ended {formatDateTime(prompt.accessExpiresAt)}
          </p>
        </div>
      </div>

      <fieldset className="mt-4 space-y-2">
        <legend className="sr-only">Outcome</legend>
        {CHOICES.map((option) => (
          <label key={option.value} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${choice === option.value ? 'border-veriq-secondary bg-emerald-50/60' : 'border-slate-200 hover:border-slate-300'}`}>
            <input type="radio" name={name} value={option.value} checked={choice === option.value} onChange={() => setChoice(option.value)} className="mt-1 accent-emerald-600" />
            <span>
              <span className="block text-sm font-semibold text-navy-900">{option.label}</span>
              <span className="block text-xs text-slate-500">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {choice === 'took' && prompt.units.length > 0 && (
        <div className="mt-4">
          <label htmlFor={`${name}-unit`} className="label">
            Which Unit did you take?{unitRequired ? <span className="text-red-500"> *</span> : <span className="font-normal text-slate-400"> (optional)</span>}
          </label>
          <select id={`${name}-unit`} value={unitId} onChange={(event) => setUnitId(event.target.value)} className="input" required={unitRequired}>
            <option value="">{unitRequired ? 'Select the Unit' : prompt.units.length === 1 ? prompt.units[0].displayLabel : 'Select the Unit'}</option>
            {prompt.units.map((unit) => (
              <option key={unit.id} value={unit.id}>{unit.displayLabel} — {unit.unitType.replace(/_/g, ' ')}</option>
            ))}
          </select>
        </div>
      )}

      {choice === 'took' && (
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-xl bg-slate-50 p-3 text-xs leading-5 text-slate-600">
          <input type="checkbox" checked={consent} onChange={(event) => setConsent(event.target.checked)} className="mt-0.5 accent-emerald-600" />
          <span>
            Invite me to share resident experience later (electricity, water, flooding, noise, maintenance and network). My answers are
            reviewed by Veriq and are never published automatically or treated as verified.
          </span>
        </label>
      )}

      {choice && (
        <div className="mt-4">
          <label htmlFor={`${name}-note`} className="label">Anything else? <span className="font-normal text-slate-400">(optional)</span></label>
          <textarea id={`${name}-note`} value={note} onChange={(event) => setNote(event.target.value)} maxLength={1000} className="input min-h-20 resize-y" placeholder="For example, why you did not take it" />
        </div>
      )}

      <ApiErrorNotice error={error} className="mt-4" />

      <div className="mt-4 flex justify-end">
        <button type="submit" disabled={!canSubmit} className="btn-primary !py-2.5">
          {submitting ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4" />} Save answer
        </button>
      </div>
    </form>
  );
}
