'use client';

import { useState, type FormEvent } from 'react';
import { CheckCircle, HelpCircle } from 'lucide-react';
import { outcomesApi } from '@/lib/api/renter';
import type { OutcomeChoice, PendingOutcome } from '@/types/renter';
import { cn } from '@/lib/utils';
import { Button, CheckLine, ChipIcon, Eyebrow, Select, panelClass } from '@/components/ui';
import { FieldShell } from '@/components/ui/Select';
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
    <form onSubmit={submit} className={cn(panelClass, 'space-y-5')}>
      <div className="flex items-start gap-3">
        <ChipIcon>
          <HelpCircle className="h-5 w-5" />
        </ChipIcon>
        <div className="min-w-0">
          <Eyebrow>Record outcome</Eyebrow>
          <p className="font-display text-base font-semibold text-foreground">
            What happened with {prompt.listing?.title ?? `this ${TARGET_TYPE_LABELS[prompt.targetType].toLowerCase()}`}?
          </p>
          <p className="text-ui-sm text-muted-foreground">
            {prompt.listing
              ? `${CATEGORY_LABELS[prompt.listing.category] ?? TARGET_TYPE_LABELS[prompt.targetType]}${prompt.listing.area ? ` · ${prompt.listing.area}` : ''} · `
              : ''}
            Access ended {formatDateTime(prompt.accessExpiresAt)}
          </p>
        </div>
      </div>

      <fieldset className="space-y-3">
        <legend className="sr-only">Outcome</legend>
        {CHOICES.map((option) => (
          <label
            key={option.value}
            className={cn(
              'flex cursor-pointer items-start gap-3 rounded-unit border p-[17px] transition-colors',
              choice === option.value ? 'border-primary bg-[#10b9810b]' : 'border-[#ffffff18] bg-[#070b1444] hover:border-[#10b98170]',
            )}
          >
            <input
              type="radio"
              name={name}
              value={option.value}
              checked={choice === option.value}
              onChange={() => setChoice(option.value)}
              className="mt-1 h-4 w-4 flex-shrink-0 accent-[#10b981] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            />
            <span className="min-w-0">
              <span className="block text-ui-md font-semibold text-foreground">{option.label}</span>
              <span className="block text-ui-sm text-muted-foreground">{option.hint}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {choice === 'took' && prompt.units.length > 0 && (
        <Select
          id={`${name}-unit`}
          label="Which Unit did you take?"
          required={unitRequired}
          optional={!unitRequired}
          placeholder="Select the Unit"
          options={prompt.units.map((unit) => ({
            value: unit.id,
            label: `${unit.displayLabel} — ${unit.unitType.replace(/_/g, ' ')}`,
          }))}
          value={unitId}
          onValueChange={setUnitId}
        />
      )}

      {choice === 'took' && (
        <CheckLine
          id={`${name}-consent`}
          checked={consent}
          onCheckedChange={setConsent}
          className="rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-ui-sm"
          hint="My answers are reviewed by Veriq and are never published automatically or treated as verified."
        >
          Invite me to share resident experience later — electricity, water, flooding, noise, maintenance and network.
        </CheckLine>
      )}

      {choice && (
        <FieldShell htmlFor={`${name}-note`} label="Anything else?" optional>
          <textarea
            id={`${name}-note`}
            value={note}
            onChange={(event) => setNote(event.target.value)}
            maxLength={1000}
            className="input min-h-20 resize-y"
            placeholder="For example, why you did not take it"
          />
        </FieldShell>
      )}

      <ApiErrorNotice error={error} />

      <div className="flex justify-end">
        <Button type="submit" disabled={!canSubmit}>
          {submitting ? <LoadingSpinner size="sm" /> : <CheckCircle aria-hidden="true" className="h-4 w-4" />} Save answer
        </Button>
      </div>
    </form>
  );
}
