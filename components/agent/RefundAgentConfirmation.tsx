'use client';

import { useState } from 'react';
import { MessageSquareWarning, ThumbsDown, ThumbsUp } from 'lucide-react';
import { refundsApi } from '@/lib/api/renter';
import type { AgentRefundDecision, RefundRequest } from '@/types/renter';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
import { FieldShell } from '@/components/ui/Select';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';

/**
 * The listing's Veriq Agent confirms or disputes that the unit became unavailable inside the renter's access
 * window (Master Blueprint §5: "Agent confirms or Admin decides in the renter's favour"). A confirmation on a case
 * that meets the launch rule credits the renter's wallet straight away; a dispute leaves the case with Admin.
 */
export function RefundAgentConfirmation({
  refund,
  onDecided,
}: {
  refund: RefundRequest;
  onDecided: (updated: RefundRequest) => void;
}) {
  const [decision, setDecision] = useState<AgentRefundDecision | null>(null);
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const alreadyDecided = !!refund.agentConfirmation;
  const isOpen = refund.status === 'requested' || refund.status === 'under_review';
  if (refund.caseType !== 'unlock_purchase' || !isOpen) return null;

  const submit = async (choice: AgentRefundDecision) => {
    setDecision(choice);
    setSaving(true);
    setError(null);
    try {
      const res = await refundsApi.agentConfirmation(refund.id, {
        decision: choice,
        ...(note.trim() ? { note: note.trim() } : {}),
      });
      setNote('');
      onDecided(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setSaving(false);
      setDecision(null);
    }
  };

  return (
    <section className="card space-y-3 p-5" aria-labelledby="agent-confirmation-heading">
      <div className="flex items-start gap-2.5">
        <MessageSquareWarning className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <h2 id="agent-confirmation-heading" className="font-display text-sm font-bold text-foreground">
            Confirm or dispute the availability change
          </h2>
          <p className="mt-1 text-xs leading-5 text-muted-foreground">
            The renter says the unit was available when they paid and became unavailable inside their access window.
            Confirm only what you have actually checked. A dispute sends the case to Admin.
          </p>
        </div>
      </div>

      {alreadyDecided && (
        <p className="rounded-xl border border-[#ffffff18] bg-[#070b1444] px-3 py-2 text-xs text-muted-foreground">
          Recorded as {refund.agentConfirmation?.decision === 'confirmed' ? 'confirmed' : 'disputed'}. Sending a new
          decision replaces it and is logged.
        </p>
      )}

      <FieldShell htmlFor="agent-confirmation-note" label="What you checked or observed" optional>
        <textarea
          id="agent-confirmation-note"
          className="input resize-none !py-2 text-sm"
          rows={3}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="e.g. Called the Operator on 12 Sept; the unit was taken on 10 Sept and availability was updated late."
        />
      </FieldShell>

      <ApiErrorNotice error={error} fallback="Your decision could not be recorded." />

      <div className="flex flex-col gap-2 sm:flex-row">
        <Button onClick={() => void submit('confirm')} disabled={saving} className="flex-1">
          {saving && decision === 'confirm' ? (
            <LoadingSpinner size="sm" />
          ) : (
            <ThumbsUp aria-hidden="true" className="h-4 w-4" />
          )}{' '}
          Confirm it became unavailable
        </Button>
        <Button variant="secondary" onClick={() => void submit('dispute')} disabled={saving} className="flex-1">
          {saving && decision === 'dispute' ? (
            <LoadingSpinner size="sm" />
          ) : (
            <ThumbsDown aria-hidden="true" className="h-4 w-4" />
          )}{' '}
          Dispute this claim
        </Button>
      </div>
      <p className="text-[11px] text-muted-foreground">
        Your earnings for this unlock stay on hold until the refund window and any dispute are resolved.
      </p>
    </section>
  );
}
