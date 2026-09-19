'use client';

import { useMemo, useState, type FormEvent } from 'react';
import { Send, Timer, Wallet } from 'lucide-react';
import { refundsApi } from '@/lib/api/renter';
import type { RefundPolicy, RefundReason, RefundRequest, UnlockHistoryItem } from '@/types/renter';
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
      <div className="card p-5">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">{TARGET_TYPE_LABELS[unlock.targetType]} unlock</p>
        <p className="mt-1 font-display text-lg font-bold text-navy-900">{unlock.listing?.title ?? 'Unlocked listing'}</p>
        <dl className="mt-3 grid gap-3 text-sm sm:grid-cols-3">
          <div>
            <dt className="text-xs text-slate-500">Amount charged</dt>
            <dd className="font-semibold text-navy-900">{formatNaira(unlock.feeAmount)}</dd>
            {unlock.walletAmount > 0 && <dd className="text-[11px] text-slate-500">{formatNaira(unlock.walletAmount)} from wallet · {formatNaira(unlock.externalAmount)} paid</dd>}
          </div>
          <div>
            <dt className="text-xs text-slate-500">Payment reference</dt>
            <dd className="break-all font-mono text-xs text-navy-900">{unlock.paymentReference}</dd>
          </div>
          <div>
            <dt className="text-xs text-slate-500">Request before</dt>
            <dd className="font-semibold text-navy-900">{formatDateTime(unlock.refundDeadlineAt)}</dd>
            {!windowClosed && <dd className="flex items-center gap-1 text-[11px] text-amber-700"><Timer className="h-3 w-3" /> {deadline.label} left</dd>}
          </div>
        </dl>
        {unlock.status === 'duplicate_payment' && (
          <p className="mt-3 rounded-lg bg-orange-50 px-3 py-2 text-xs leading-5 text-orange-800">
            This is a duplicate charge. It is reviewed as an excess-payment refund, so your separately paid active unlock and its access stay unchanged.
          </p>
        )}
      </div>

      <section>
        <h2 className="mb-3 font-display text-base font-bold text-navy-900">Before you submit</h2>
        <RefundPolicySummary policy={policy} />
      </section>

      {windowClosed ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
          The refund window for this unlock has closed. If you still need help, contact Veriq support through the Contact page.
        </div>
      ) : (
        <section className="card space-y-5 p-5">
          <div>
            <label htmlFor="refund-reason" className="label">Reason <span className="text-red-500">*</span></label>
            <select id="refund-reason" value={reason} onChange={(event) => setReason(event.target.value as RefundReason)} className="input" required>
              <option value="">Select the qualifying issue</option>
              {reasons.map((item) => (
                <option key={item} value={item}>{REFUND_REASON_LABELS[item] ?? item}</option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="refund-explanation" className="label">
              What happened?{explanationRequired ? <span className="text-red-500"> *</span> : <span className="font-normal text-slate-400"> (recommended)</span>}
            </label>
            <textarea
              id="refund-explanation"
              value={explanation}
              onChange={(event) => setExplanation(event.target.value)}
              maxLength={2000}
              required={explanationRequired}
              className="input min-h-28 resize-y"
              placeholder="Describe what was inaccurate and when you noticed it. Include call times, dates or what you found at the location."
            />
            <p className="mt-1 text-right text-[11px] text-slate-400">{explanation.length}/2000</p>
          </div>

          <div>
            <p className="label">Evidence <span className="font-normal text-slate-400">(optional, strongly recommended)</span></p>
            <EvidenceUploader files={evidence} onChange={setEvidence} disabled={submitting} />
          </div>

          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm leading-6 text-emerald-900">
            <input type="checkbox" checked={acknowledged} onChange={(event) => setAcknowledged(event.target.checked)} className="mt-1 accent-emerald-600" />
            <span className="flex items-start gap-2">
              <Wallet className="mt-1 h-4 w-4 flex-shrink-0 text-emerald-600" />
              <span>I understand that if Veriq approves this request, the refund is credited to my Veriq Wallet for future unlocks and is not paid out as cash. Admin reviews the evidence and makes the decision.</span>
            </span>
          </label>

          <ApiErrorNotice error={error} fallback="Your refund request could not be submitted." />

          <div className="flex justify-end">
            <button type="submit" disabled={!canSubmit} className="btn-primary">
              {submitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />} Submit refund request
            </button>
          </div>
        </section>
      )}
    </form>
  );
}
