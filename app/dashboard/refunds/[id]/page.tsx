'use client';

import { useCallback, useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, CircleDot, FileText, Gift, Home, MessageSquare, Paperclip, Send, ShieldQuestion, Wallet, XCircle,
} from 'lucide-react';
import { ApiError } from '@/lib/api';
import { refundsApi } from '@/lib/api/renter';
import type { RefundRequest, SimilarPropertiesResult } from '@/types/renter';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { EvidenceUploader, MAX_EVIDENCE_FILES, type UploadedEvidence } from '@/components/renter/EvidenceUploader';
import {
  CATEGORY_LABELS, REFUND_REASON_LABELS, REFUND_STATUS_META, TARGET_TYPE_LABELS, formatDateTime, formatNaira, listingHref, locationLine, mediaSrc,
} from '@/components/renter/format';

const STEPS = [
  { key: 'requested', label: 'Submitted' },
  { key: 'under_review', label: 'Under review' },
  { key: 'decided', label: 'Decision' },
] as const;

function entryAuthor(from: string) {
  if (from === 'renter') return 'You';
  if (from === 'admin:renter') return 'Veriq asked you';
  if (from === 'admin:agent') return 'Veriq asked the listing’s Veriq Agent';
  if (from === 'admin:operator') return 'Veriq asked the Property Operator';
  if (from === 'agent') return 'Veriq Agent added evidence';
  if (from === 'property_operator') return 'Property Operator added evidence';
  return 'Update';
}

function fileName(url: string) {
  try {
    return decodeURIComponent(new URL(url).pathname.split('/').pop() || url);
  } catch {
    return url;
  }
}

export default function RefundDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();
  const [refund, setRefund] = useState<RefundRequest | null>(null);
  const [similar, setSimilar] = useState<SimilarPropertiesResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const [explanation, setExplanation] = useState('');
  const [evidence, setEvidence] = useState<UploadedEvidence[]>([]);
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<unknown>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await refundsApi.get(id);
      setRefund(res.data);
      if (res.data.status === 'approved') {
        refundsApi.similar(id).then((similarRes) => setSimilar(similarRes.data)).catch(() => setSimilar(null));
      }
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const sendEvidence = async (event: FormEvent) => {
    event.preventDefault();
    if (!explanation.trim() && evidence.length === 0) return;
    setSending(true);
    setSendError(null);
    try {
      const res = await refundsApi.addEvidence(id, {
        explanation: explanation.trim() || undefined,
        evidenceUrls: evidence.length ? evidence.map((file) => file.url) : undefined,
      });
      setRefund((prev) => (prev ? { ...prev, ...res.data } : res.data));
      setExplanation('');
      setEvidence([]);
      success(res.message || 'Evidence added');
    } catch (err) {
      setSendError(err);
    } finally {
      setSending(false);
    }
  };

  if (loading) return <PageLoader />;

  const back = (
    <Link href="/dashboard/refunds" className="inline-flex items-center gap-2 text-sm text-veriq-muted transition-colors hover:text-navy-900">
      <ArrowLeft className="h-4 w-4" /> Back to Refunds
    </Link>
  );

  if (notFound || (!refund && !error)) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center">
          <p className="font-semibold text-navy-900">Refund request not found</p>
          <p className="mt-1 text-sm text-veriq-muted">It may belong to another account or the link may be incorrect.</p>
        </div>
      </div>
    );
  }

  if (!refund) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        {back}
        <ApiErrorNotice error={error} fallback="This refund request could not be loaded." onRetry={() => void load()} />
      </div>
    );
  }

  const status = REFUND_STATUS_META[refund.status];
  const isOpen = refund.status === 'requested' || refund.status === 'under_review';
  const decided = refund.status === 'approved' || refund.status === 'rejected';
  const stepIndex = decided ? 2 : refund.status === 'under_review' ? 1 : 0;
  const renterRequests = refund.evidenceRequests.filter((entry) => entry.from === 'admin:renter');
  const latestRequest = renterRequests[renterRequests.length - 1];

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {back}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
            {refund.caseType === 'excess_payment' ? 'Excess-payment refund' : 'Unlock-purchase refund'}
          </p>
          <h1 className="font-display text-2xl font-bold text-navy-900">{refund.listing?.title ?? 'Refund request'}</h1>
          {refund.listing && (
            <p className="text-sm text-veriq-muted">
              {CATEGORY_LABELS[refund.listing.category] ?? TARGET_TYPE_LABELS[refund.listing.targetType]} · {locationLine(refund.listing.area, refund.listing.city)}
            </p>
          )}
        </div>
        <span className={`self-start rounded-full px-3 py-1.5 text-xs font-semibold ${status.cls}`}>{status.label}</span>
      </div>

      <ol className="card grid grid-cols-3 gap-2 p-4">
        {STEPS.map((step, index) => {
          const done = index <= stepIndex;
          const label = step.key === 'decided' && decided ? (refund.status === 'approved' ? 'Approved' : 'Not approved') : step.label;
          return (
            <li key={step.key} className="flex flex-col items-center gap-1 text-center">
              {done ? (
                refund.status === 'rejected' && step.key === 'decided' ? <XCircle className="h-5 w-5 text-red-500" /> : <CheckCircle className="h-5 w-5 text-emerald-500" />
              ) : (
                <CircleDot className="h-5 w-5 text-slate-300" />
              )}
              <span className={`text-xs font-semibold ${done ? 'text-navy-900' : 'text-slate-400'}`}>{label}</span>
            </li>
          );
        })}
      </ol>

      {refund.status === 'approved' && (
        <section className="rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="flex items-center gap-2 font-display text-lg font-bold text-emerald-900"><Wallet className="h-5 w-5" /> {formatNaira(refund.creditedAmount ?? refund.chargedAmount)} credited to your Veriq Wallet</p>
          <p className="mt-1 text-sm leading-6 text-emerald-900">{refund.creditedMessage}</p>
          {similar && <p className="mt-2 text-sm text-emerald-800">Available wallet credit now: <span className="font-bold">{formatNaira(similar.credit.available)}</span></p>}
          {refund.decisionReason && <p className="mt-2 text-xs text-emerald-800">Decision note: {refund.decisionReason}</p>}
          <div className="mt-4 flex flex-wrap gap-2">
            <Link href="/dashboard/wallet" className="btn-primary !px-4 !py-2 !text-sm"><Wallet className="h-4 w-4" /> View Wallet</Link>
            <Link href="/dashboard/browse" className="btn-outline !px-4 !py-2 !text-sm"><Home className="h-4 w-4" /> Browse properties</Link>
          </div>
        </section>
      )}

      {refund.status === 'rejected' && (
        <section className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-800">
          <p className="font-semibold">Veriq reviewed this request and did not approve it.</p>
          {refund.decisionReason && <p className="mt-1 leading-6">Reason: {refund.decisionReason}</p>}
          <p className="mt-2 text-xs">Decided {formatDateTime(refund.decidedAt)}</p>
        </section>
      )}

      {isOpen && latestRequest && (
        <section className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
          <p className="flex items-center gap-2 font-semibold text-amber-900"><ShieldQuestion className="h-5 w-5" /> Veriq needs more information from you</p>
          <p className="mt-1 whitespace-pre-line text-sm leading-6 text-amber-900">{latestRequest.message}</p>
          <p className="mt-1 text-xs text-amber-700">Requested {formatDateTime(latestRequest.at)}</p>
        </section>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <section className="card space-y-4 p-5">
            <h2 className="font-display text-base font-bold text-navy-900">Your request</h2>
            <div>
              <p className="text-xs text-slate-500">Reason</p>
              <p className="text-sm font-semibold text-navy-900">{REFUND_REASON_LABELS[refund.reason] ?? refund.reason}</p>
            </div>
            {refund.explanation && (
              <div>
                <p className="text-xs text-slate-500">Explanation</p>
                <p className="whitespace-pre-line text-sm leading-6 text-navy-800">{refund.explanation}</p>
              </div>
            )}
            <div>
              <p className="mb-1 text-xs text-slate-500">Evidence ({refund.evidenceUrls.length})</p>
              {refund.evidenceUrls.length === 0 ? (
                <p className="text-sm text-slate-500">No files attached.</p>
              ) : (
                <ul className="space-y-1.5">
                  {refund.evidenceUrls.map((url) => (
                    <li key={url}>
                      <a href={url} target="_blank" rel="noopener noreferrer" className="inline-flex max-w-full items-center gap-2 text-sm text-veriq-secondary hover:underline">
                        <Paperclip className="h-3.5 w-3.5 flex-shrink-0" /> <span className="truncate">{fileName(url)}</span>
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          {refund.evidenceRequests.length > 0 && (
            <section className="card p-5">
              <h2 className="mb-4 flex items-center gap-2 font-display text-base font-bold text-navy-900"><MessageSquare className="h-4 w-4 text-veriq-secondary" /> Case updates</h2>
              <ol className="space-y-3">
                {refund.evidenceRequests.map((entry, index) => {
                  const showMessage = entry.from === 'renter' || entry.from === 'admin:renter';
                  return (
                    <li key={`${entry.at}-${index}`} className={`rounded-xl p-3 text-sm ${entry.from === 'renter' ? 'bg-slate-50' : 'bg-blue-50/60'}`}>
                      <p className="text-xs font-semibold text-navy-900">{entryAuthor(entry.from)} <span className="font-normal text-slate-400">· {formatDateTime(entry.at)}</span></p>
                      {showMessage && <p className="mt-1 whitespace-pre-line leading-6 text-navy-800">{entry.message}</p>}
                    </li>
                  );
                })}
              </ol>
            </section>
          )}

          {isOpen && (
            <form onSubmit={sendEvidence} className="card space-y-4 p-5">
              <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><FileText className="h-4 w-4 text-veriq-secondary" /> Add information or evidence</h2>
              <textarea
                value={explanation}
                onChange={(event) => setExplanation(event.target.value)}
                maxLength={2000}
                className="input min-h-24 resize-y"
                placeholder={latestRequest ? 'Reply to Veriq’s request' : 'Add anything that helps Veriq review your request'}
              />
              <EvidenceUploader files={evidence} onChange={setEvidence} max={MAX_EVIDENCE_FILES} disabled={sending} />
              <ApiErrorNotice error={sendError} fallback="Your evidence could not be added." />
              <div className="flex justify-end">
                <button type="submit" disabled={sending || (!explanation.trim() && evidence.length === 0)} className="btn-primary !py-2.5">
                  {sending ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />} Send to Veriq
                </button>
              </div>
            </form>
          )}
        </div>

        <aside className="space-y-4">
          <section className="card space-y-3 p-5 text-sm">
            <h2 className="font-display text-base font-bold text-navy-900">Payment</h2>
            <div className="flex justify-between gap-2"><span className="text-slate-500">Charged</span><span className="font-semibold text-navy-900">{formatNaira(refund.chargedAmount)}</span></div>
            {refund.unlock && refund.unlock.walletAmount > 0 && (
              <p className="text-xs text-slate-500">{formatNaira(refund.unlock.walletAmount)} from wallet credit · {formatNaira(refund.unlock.externalAmount)} paid directly</p>
            )}
            {refund.unlock && (
              <>
                <div><p className="text-xs text-slate-500">Reference</p><p className="break-all font-mono text-xs text-navy-900">{refund.unlock.paymentReference}</p></div>
                <div><p className="text-xs text-slate-500">Unlocked</p><p className="text-navy-900">{formatDateTime(refund.unlock.unlockedAt)}</p></div>
                <div><p className="text-xs text-slate-500">Refund window closed</p><p className="text-navy-900">{formatDateTime(refund.unlock.refundDeadlineAt)}</p></div>
              </>
            )}
            <div><p className="text-xs text-slate-500">Submitted</p><p className="text-navy-900">{formatDateTime(refund.createdAt)}</p></div>
            <p className="rounded-lg bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-800">Approved refunds are credited to your Veriq Wallet, never paid out as cash. Credit does not expire.</p>
            {refund.caseType === 'unlock_purchase' && isOpen && (
              <p className="text-xs leading-5 text-slate-500">If this refund is approved, access to the unlocked listing ends immediately.</p>
            )}
          </section>
          {refund.listing && refund.status !== 'approved' && (
            <Link href={listingHref(refund.listing.targetType, refund.listing.targetId, true)} className="btn-outline w-full !py-2.5">View listing</Link>
          )}
        </aside>
      </div>

      {refund.status === 'approved' && similar && (
        <section>
          <h2 className="mb-1 font-display text-lg font-bold text-navy-900">Similar properties you could unlock</h2>
          <p className="mb-4 text-sm text-veriq-muted">Suggestions only — nothing is unlocked or spent automatically. Your credit stays in the wallet until you choose.</p>
          {similar.properties.length === 0 ? (
            <p className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-veriq-muted">We did not find a close match right now. Your credit is saved, so you can browse whenever you are ready.</p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {similar.properties.map((property) => (
                <Link key={property.id} href={`/dashboard/browse/${property.id}`} className="card group overflow-hidden">
                  <div className="relative h-36 bg-gradient-to-br from-navy-700 to-navy-900">
                    {property.coverImageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={mediaSrc(property.coverImageUrl)} alt={property.title} className="h-full w-full object-cover" loading="lazy" />
                    ) : (
                      <Home className="absolute left-1/2 top-1/2 h-10 w-10 -translate-x-1/2 -translate-y-1/2 text-white/15" />
                    )}
                  </div>
                  <div className="p-4">
                    <p className="line-clamp-1 font-semibold text-navy-900 group-hover:text-veriq-secondary">{property.title}</p>
                    <p className="text-xs text-slate-500">{locationLine(property.area, property.city)}</p>
                    <p className="mt-2 flex items-center gap-1.5 text-xs">
                      {property.unlockPrice === 0 ? (
                        <span className="inline-flex items-center gap-1 font-semibold text-emerald-700"><Gift className="h-3.5 w-3.5" /> Free unlock</span>
                      ) : (
                        <span className="text-slate-600">Unlock {formatNaira(property.unlockPrice)}</span>
                      )}
                      {property.noAdditionalPaymentNeeded && property.unlockPrice > 0 && <span className="rounded-full bg-emerald-50 px-2 py-0.5 font-semibold text-emerald-700">No additional payment needed</span>}
                    </p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  );
}
