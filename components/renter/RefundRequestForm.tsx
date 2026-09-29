'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Send, Timer, Wallet } from 'lucide-react';
import { refundsApi } from '@/lib/api/renter';
import type { RefundPolicy, RefundReason, RefundRequest, UnlockHistoryItem } from '@/types/renter';
import { Button, CheckLine, Eyebrow, Notice, Panel, Select } from '@/components/ui';
import { FieldShell } from '@/components/ui/Select';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { ApiErrorNotice } from './ApiErrorNotice';
import { EvidenceUploader, type UploadedEvidence } from './EvidenceUploader';
import { RefundPolicySummary } from './RefundPolicySummary';
import { REFUND_REASON_LABELS, TARGET_TYPE_LABELS, formatDateTime, formatNaira } from './format';
import { useCountdown } from './useCountdown';

const SALE_ONLY: RefundReason[] = ['sale_document_status_inaccurate', 'sale_already_sold_at_unlock'];
const RENTAL_ONLY: RefundReason[] = ['availability_stale_at_unlock', 'contact_invalid'];

/** Reasons offered for this charge: a duplicate charge is reviewed only as an excess payment (§14.2, §14.7). */
export function reasonsForUnlock(policy: RefundPolicy, unlock: UnlockHistoryItem): RefundReason[] {
  if (unlock.status === 'duplicate_payment') return policy.reasons.filter((reason) => reason === 'duplicate_payment');
  return policy.reasons.filter((reason) => {
    if (reason === 'duplicate_payment') return false;
    if (unlock.targetType === 'sale_listing') return !RENTAL_ONLY.includes(reason);
    return !SALE_ONLY.includes(reason);
  });
}

/** Renter refund request (§14.2): conditions first, reason, explanation, evidence, and the wallet-credit destination. */
export function RefundRequestForm({
  unlock,
  policy,
  onSubmitted,
}: {
  unlock: UnlockHistoryItem;
  policy: RefundPolicy;
  onSubmitted: (refund: RefundRequest) => void;
}) {
  const { success } = useToast();
  const reasons = useMemo(() => reasonsForUnlock(policy, unlock), [policy, unlock]);
  const [reason, setReason] = useState<RefundReason | ''>(reasons.length === 1 ? reasons[0] : '');
  const [explanation, setExplanation] = useState('');
  const [evidence, setEvidence] = useState<UploadedEvidence[]>([]);
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const deadline = useCountdown(unlock.refundDeadlineAt);

  const explanationRequired = reason === 'other';
  const windowClosed = !unlock.refundWindowOpen || deadline.isExpired;
  const canSubmit = !!reason && acknowledged && !submitting && !windowClosed && (!explanationRequired || explanation.trim().length > 0);

  const reasonOptions = useMemo(
    () => reasons.map((item) => ({ value: item, label: REFUND_REASON_LABELS[item] ?? item })),
    [reasons],
  );

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (!reason) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await refundsApi.create({
        unlockId: unlock.id,
        reason,
        explanation: explanation.trim() || undefined,
        evidenceUrls: evidence.length ? evidence.map((file) => file.url) : undefined,
      });
      success(res.message || 'Refund request submitted for Veriq review');
      onSubmitted(res.data);
    } catch (err) {
      setError(err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-6">
      <Panel>
        <Eyebrow>{TARGET_TYPE_LABELS[unlock.targetType]} unlock</Eyebrow>
        <p className="mt-1 font-display text-lg font-semibold text-foreground">{unlock.listing?.title ?? 'Unlocked listing'}</p>
        <dl className="mt-4 grid gap-4 text-ui-md wide:grid-cols-3">
          <div>
            <dt className="text-ui-sm text-muted-foreground">Amount charged</dt>
            <dd className="font-semibold text-foreground">{formatNaira(unlock.feeAmount)}</dd>
            {unlock.walletAmount > 0 && (
              <dd className="text-ui-sm text-muted-foreground">
                {formatNaira(unlock.walletAmount)} credit · {formatNaira(unlock.externalAmount)} paid
              </dd>
            )}
          </div>
          <div>
            <dt className="text-ui-sm text-muted-foreground">Payment reference</dt>
            <dd className="break-all font-mono text-ui-sm text-foreground">{unlock.paymentReference}</dd>
          </div>
          <div>
            <dt className="text-ui-sm text-muted-foreground">Request before</dt>
            <dd className="font-semibold text-foreground">{formatDateTime(unlock.refundDeadlineAt)}</dd>
            {!windowClosed && (
              <dd className="flex items-center gap-1.5 text-ui-sm text-[#fcd34d]">
                <Timer aria-hidden="true" className="h-3 w-3" /> {deadline.label} left
              </dd>
            )}
          </div>
        </dl>
        {unlock.status === 'duplicate_payment' && (
          <Notice tone="amber" className="mt-4" title="Reviewed as an excess payment">
            This is a duplicate charge, so your separately paid active unlock and its access stay unchanged.
          </Notice>
        )}
      </Panel>

      <section>
        <h2 className="mb-3 font-display text-base font-semibold text-foreground">Before you submit</h2>
        <RefundPolicySummary policy={policy} />
      </section>

      {windowClosed ? (
        <Notice tone="amber" title="The refund window for this unlock has closed">
          If you still need help, contact Veriq support through the Contact page.
        </Notice>
      ) : (
        <Panel as="section" className="space-y-5">
          <Select
            id="refund-reason"
            label="Reason"
            required
            placeholder="Select the qualifying issue"
            options={reasonOptions}
            value={reason}
            onValueChange={(value) => setReason(value as RefundReason)}
          />

          <FieldShell
            htmlFor="refund-explanation"
            label="What happened?"
            required={explanationRequired}
            optional={!explanationRequired}
            hint={explanationRequired ? undefined : 'Recommended — it is what Admin reads first.'}
          >
            <textarea
              id="refund-explanation"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              maxLength={2000}
              required={explanationRequired}
              className="input min-h-28 resize-y"
              placeholder="Describe what was inaccurate and when you noticed it. Include call times, dates or what you found at the location."
            />
            <p className="mt-1 text-right text-xs text-muted-foreground" aria-hidden="true">
              {explanation.length}/2000
            </p>
          </FieldShell>

          <FieldShell label="Evidence" optional hint="Photos, screenshots or PDFs. Strongly recommended.">
            <EvidenceUploader files={evidence} onChange={setEvidence} disabled={submitting} />
          </FieldShell>

          <CheckLine
            id="refund-acknowledge"
            checked={acknowledged}
            onCheckedChange={setAcknowledged}
            className="rounded-unit border border-[#10b98130] bg-[#10b9810b] p-[17px]"
            hint="Admin reviews the evidence and makes the decision."
          >
            <span className="flex items-start gap-2">
              <Wallet aria-hidden="true" className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
              <span>
                I understand that if Veriq approves this request, the refund is credited to my Veriq Wallet for future
                unlocks and is not paid out as cash.
              </span>
            </span>
          </CheckLine>

          <ApiErrorNotice error={error} fallback="Your refund request could not be submitted." />

          <div className="flex justify-end">
            <Button type="submit" disabled={!canSubmit}>
              {submitting ? <LoadingSpinner size="sm" /> : <Send aria-hidden="true" className="h-4 w-4" />} Submit refund
              request
            </Button>
          </div>
        </Panel>
      )}
    </form>
  );
}
