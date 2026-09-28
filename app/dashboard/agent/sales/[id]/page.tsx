'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarCheck,
  FileCheck2,
  FileSignature,
  FileText,
  Footprints,
  Image as ImageIcon,
  Landmark,
  MapPin,
  MessageSquare,
  Rocket,
  ShieldAlert,
  Trophy,
  Upload,
  UserCheck,
} from 'lucide-react';
import type {
  EvidenceKind,
  PartyVerificationStatus,
  SaleAvailabilityInput,
  SaleDocumentTypesPayload,
  SaleEnquiryStatus,
  SaleManageView,
  SaleOutcomeValue,
  SalePriceBasis,
  SchemaAnswers,
  SchemaIssue,
} from '@/types/agent';
import { UserRole } from '@/types';
import { saleEnquiriesApi, saleListingsApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Select';
import { AnswersEditor } from '@/components/agent/AnswersEditor';
import { AnswersView } from '@/components/agent/AnswersView';
import { SaleAvailabilityControl } from '@/components/agent/AvailabilityPanel';
import { BlockersList } from '@/components/agent/BlockersList';
import { DocumentChecklist } from '@/components/agent/DocumentChecklist';
import { EvidenceList } from '@/components/agent/EvidenceList';
import { LocationVerifier } from '@/components/agent/LocationVerifier';
import { MediaReviewPanel } from '@/components/agent/MediaReviewPanel';
import { ReasonDialog } from '@/components/agent/ReasonDialog';
import { StreetIntelligencePanel } from '@/components/agent/StreetIntelligencePanel';
import {
  PUBLICATION_STATUS_STYLES,
  describeError,
  errorMessage,
  formatDateTime,
  formatNaira,
  humanize,
} from '@/components/agent/format';
import {
  ErrorBlock,
  Field,
  InlineNotice,
  KeyValue,
  PageHeader,
  PanelCard,
  StatusPill,
  smallButton,
  smallDangerButton,
  smallPrimaryButton,
} from '@/components/agent/ui';

const PARTY_STATUS_STYLES: Record<string, string> = {
  not_required: 'bg-slate-100 text-slate-600',
  pending: 'bg-amber-50 text-amber-700',
  verified: 'bg-emerald-50 text-emerald-700',
  failed: 'bg-red-50 text-red-700',
};

const ENQUIRY_STATUS_STYLES: Record<string, string> = {
  new: 'bg-blue-50 text-blue-700',
  contacted: 'bg-amber-50 text-amber-700',
  closed: 'bg-slate-100 text-slate-600',
};

/** Only evidence kinds the Agent adds during review; the owner supplies ownership and authority documents. */
const EVIDENCE_KINDS = [
  { value: 'sale_document', label: 'Sale document' },
  { value: 'authority_to_sell', label: 'Authority to sell' },
  { value: 'ownership', label: 'Ownership document' },
  { value: 'other', label: 'Other' },
];

const PARTY_DECISIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'verified', label: 'Verified' },
  { value: 'failed', label: 'Failed' },
];

const ENQUIRY_STATUSES = [
  { value: 'contacted', label: 'Contacted the buyer' },
  { value: 'closed', label: 'Closed' },
];

const OUTCOME_OPTIONS = [
  { value: 'completed', label: 'Sale completed through Veriq' },
  { value: 'withdrawn', label: 'Representation withdrawn — no sale' },
];

const PRICE_BASIS: Record<string, Array<{ value: SalePriceBasis; label: string }>> = {
  built_property: [{ value: 'total', label: 'Total price' }],
  land: [
    { value: 'total', label: 'Total price' },
    { value: 'per_plot', label: 'Per plot' },
    { value: 'per_square_metre', label: 'Per square metre' },
  ],
};

const NEGOTIABILITY = [
  { value: 'yes', label: 'Negotiable' },
  { value: 'no', label: 'Fixed' },
];

const issuesFrom = (details: unknown[]): SchemaIssue[] =>
  details.filter(
    (item): item is SchemaIssue => typeof item === 'object' && item !== null && 'path' in item && 'message' in item,
  );

/**
 * Agent and Admin workspace for an owner-submitted sale listing (Master Blueprint §6): the physical visit, the
 * document review, owner identity and authority to sell, the sales representation agreement signed before
 * publication, buyer enquiries, and the recorded outcome that triggers the owner-paid commission. Signing the
 * agreement and recording the outcome are Admin actions, which the server enforces independently of this UI.
 */
export default function SaleListingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<SaleManageView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [documentTypes, setDocumentTypes] = useState<SaleDocumentTypesPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'escalate' | 'publish' | 'correction' | 'clear' | 'cancel-agreement' | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<unknown[] | null>(null);

  const [title, setTitle] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [priceBasis, setPriceBasis] = useState('');
  const [negotiable, setNegotiable] = useState('');
  const [identityStatus, setIdentityStatus] = useState('');
  const [authorityStatus, setAuthorityStatus] = useState('');
  const [partyNote, setPartyNote] = useState('');
  const [visitedAt, setVisitedAt] = useState('');
  const [visitNotes, setVisitNotes] = useState('');
  const [commissionPercent, setCommissionPercent] = useState('');
  const [agentSharePercent, setAgentSharePercent] = useState('');
  const [agreementNotes, setAgreementNotes] = useState('');
  const [signedByOwnerName, setSignedByOwnerName] = useState('');
  const [agreementDocumentUrl, setAgreementDocumentUrl] = useState('');
  const [outcome, setOutcome] = useState('');
  const [salePriceAmount, setSalePriceAmount] = useState('');
  const [outcomeNotes, setOutcomeNotes] = useState('');
  const [evidenceKind, setEvidenceKind] = useState('');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const hydrate = useCallback((data: SaleManageView) => {
    setView(data);
    setTitle(data.sale.title);
    setAskingPrice(String(data.sale.askingPrice));
    setPriceBasis(data.sale.priceBasis);
    setNegotiable(data.sale.negotiable === null ? '' : data.sale.negotiable ? 'yes' : 'no');
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await saleListingsApi.manage(id);
      hydrate(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the sale listing'));
    }
  }, [id, hydrate]);

  const isManager = user?.role === UserRole.AGENT || user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (isManager) load();
  }, [isManager, load]);

  const subtype = view?.sale.subtype;
  useEffect(() => {
    if (!subtype) return;
    saleListingsApi
      .documentTypes(subtype)
      .then((res) => setDocumentTypes(res.data))
      .catch(() => setDocumentTypes(null));
  }, [subtype]);

  const act = useCallback(
    async (key: string, action: () => Promise<{ message?: string }>, fallback: string) => {
      setBusy(key);
      try {
        const res = await action();
        success(res.message || 'Saved');
        await load();
        return true;
      } catch (err) {
        toastError(errorMessage(err, fallback));
        return false;
      } finally {
        setBusy(null);
      }
    },
    [load, success, toastError],
  );

  const answers = useMemo<SchemaAnswers>(
    () => ({ facts: view?.sale.facts ?? {}, commercial: {}, intelligence: view?.sale.intelligence ?? {} }),
    [view?.sale.facts, view?.sale.intelligence],
  );

  if (authLoading) return <PageLoader />;
  if (!isManager) return <ErrorBlock message="Property for Sale listings are managed by Veriq Agents and Admin." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Sale listing" backHref="/dashboard/agent/sales" backLabel="Property for Sale" />
        <ErrorBlock message={loadError} onRetry={load} />
      </div>
    );
  }
  if (!view) return <PageLoader />;

  const { sale, owner, property, agreement, enquiries } = view;
  const canPublish = sale.publicationStatus !== 'published' && sale.publicationStatus !== 'suspended';
  const newEnquiries = enquiries.filter((item) => item.status === 'new').length;

  const publish = async () => {
    setBusy('publish');
    setPublishBlockers(null);
    try {
      const res = await saleListingsApi.publish(id);
      success(res.message || 'Sale listing published');
      setDialog(null);
      await load();
    } catch (err) {
      const { message, details } = describeError(err, 'Publication failed');
      toastError(message);
      setPublishBlockers(details.length ? details : [{ code: 'publish_failed', message }]);
      setDialog(null);
      await load();
    } finally {
      setBusy(null);
    }
  };

  const saveDetails = () => {
    const price = Number(askingPrice);
    if (!Number.isFinite(price) || price < 1) {
      toastError('Enter the asking price in whole naira');
      return;
    }
    if (!priceBasis) {
      toastError('Choose the price basis');
      return;
    }
    return act(
      'details',
      () =>
        saleListingsApi.update(id, {
          title: title.trim(),
          askingPrice: Math.trunc(price),
          priceBasis: priceBasis as SalePriceBasis,
          ...(negotiable ? { negotiable: negotiable === 'yes' } : {}),
        }),
      'Could not update the sale listing',
    );
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={sale.title}
        backHref="/dashboard/agent/sales"
        backLabel="Property for Sale"
        subtitle={`${sale.subtype === 'land' ? 'Land' : 'Built Property'} · ${formatNaira(sale.askingPrice)} ${humanize(sale.priceBasis)} · ${property.area}, ${property.city}, ${property.state} · Property ${property.id}`}
        badges={
          <>
            <StatusPill value={sale.publicationStatus} styles={PUBLICATION_STATUS_STYLES} />
            <span
              className={`badge !px-2.5 !py-0.5 text-[11px] ${sale.availabilityStatus === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}
            >
              {sale.availabilityStatus === 'available'
                ? 'Available'
                : `Unavailable${sale.unavailableReason ? ` · ${humanize(sale.unavailableReason)}` : ''}`}
            </span>
            {sale.saleOutcome && (
              <span className="badge bg-slate-100 !px-2.5 !py-0.5 text-[11px] text-slate-700">
                Sale {humanize(sale.saleOutcome)}
              </span>
            )}
            {sale.escalationOpen && (
              <span className="badge bg-red-100 !px-2.5 !py-0.5 text-[11px] text-red-800">Escalated to Admin</span>
            )}
          </>
        }
        actions={
          <>
            <button type="button" className={smallButton} disabled={busy !== null} onClick={() => setDialog('correction')}>
              <FileText className="h-3.5 w-3.5" /> Request correction
            </button>
            {sale.escalationOpen ? (
              isAdmin && (
                <button type="button" className={smallButton} disabled={busy !== null} onClick={() => setDialog('clear')}>
                  <ShieldAlert className="h-3.5 w-3.5" /> Clear escalation
                </button>
              )
            ) : (
              <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => setDialog('escalate')}>
                <ShieldAlert className="h-3.5 w-3.5" /> Escalate
              </button>
            )}
            {canPublish && (
              <button type="button" className={smallPrimaryButton} disabled={busy !== null} onClick={() => setDialog('publish')}>
                {busy === 'publish' ? <LoadingSpinner size="sm" /> : <Rocket className="h-3.5 w-3.5" />} Publish
              </button>
            )}
          </>
        }
      />

      {sale.escalationOpen && (
        <InlineNotice tone="danger">
          <strong>Escalated:</strong> {sale.escalationReason ?? 'Recorded by the verification workflow'}. Only Admin can
          clear this escalation; the listing cannot be published until it is cleared.
        </InlineNotice>
      )}
      {sale.correctionNote && (
        <InlineNotice tone="warning">
          <strong>Correction requested from the owner:</strong> {sale.correctionNote}
        </InlineNotice>
      )}
      {sale.publicationStatus === 'suspended' && (
        <InlineNotice tone="danger">
          <strong>Suspended by Admin:</strong> {sale.suspensionReason ?? 'No reason recorded'}.
        </InlineNotice>
      )}

      <PanelCard title="Publication readiness" icon={Rocket} subtitle="Every blocker comes from the API, so this list always matches what the server will allow.">
        <div className="space-y-3">
          {publishBlockers && publishBlockers.length > 0 && <BlockersList title="Publish was blocked" blockers={publishBlockers} />}
          <BlockersList blockers={view.readiness.blockers} />
        </div>
      </PanelCard>

      <PanelCard title="Owner" icon={UserCheck} subtitle="The owner submitted this listing. Veriq is the buyer contact, so the owner's own contact is never published.">
        <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
          <KeyValue label="Owner (Operator)" value={owner.legalName ?? owner.operatorId} />
          <KeyValue
            label="Account identity"
            value={owner.identityStatus ? <StatusPill value={owner.identityStatus} styles={PARTY_STATUS_STYLES} /> : 'Not recorded'}
          />
          <KeyValue label="Ownership declared" value={formatDateTime(owner.declaredAt)} />
          <KeyValue label="Submitted" value={formatDateTime(sale.submittedAt)} />
        </dl>
      </PanelCard>

      <PanelCard title="Listing details" icon={Landmark} subtitle="Asking price, basis and negotiability. The owner's facts and intelligence are edited below.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title">
              <input className="input !py-2 text-sm" maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Asking price (₦)" hint={askingPrice ? formatNaira(Number(askingPrice)) : undefined}>
              <input
                className="input !py-2 text-sm"
                type="number"
                min={1}
                step={1}
                value={askingPrice}
                onChange={(event) => setAskingPrice(event.target.value)}
              />
            </Field>
            <Select
              id="sale-price-basis"
              label="Price basis"
              labelClassName="!mb-1 !text-xs"
              className="!py-2 text-sm"
              options={PRICE_BASIS[sale.subtype] ?? PRICE_BASIS.built_property}
              value={priceBasis}
              onValueChange={setPriceBasis}
              required
            />
            <Select
              id="sale-negotiable"
              label="Negotiability"
              labelClassName="!mb-1 !text-xs"
              className="!py-2 text-sm"
              placeholder="Not stated"
              options={NEGOTIABILITY}
              value={negotiable}
              onValueChange={setNegotiable}
              optional
            />
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className={smallPrimaryButton}
              disabled={busy !== null || title.trim().length < 3}
              onClick={saveDetails}
            >
              {busy === 'details' && <LoadingSpinner size="sm" />} Save listing details
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Physical visit"
        icon={Footprints}
        subtitle="You visit the property in person and confirm the property facts before publication. This is a blocker in its own right."
      >
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KeyValue label="Visit recorded" value={formatDateTime(sale.physicalVisitAt)} />
            <KeyValue label="Notes on file" value={sale.physicalVisitNotes ?? 'None recorded'} />
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr]">
            <Field label="Date of the visit" hint="Leave blank for today. A future date is rejected.">
              <input
                className="input !py-2 text-sm"
                type="date"
                max={new Date().toISOString().slice(0, 10)}
                value={visitedAt}
                onChange={(event) => setVisitedAt(event.target.value)}
              />
            </Field>
            <Field label="What you confirmed on site" hint="At least 10 characters; this is recorded against the listing.">
              <textarea
                className="input resize-none !py-2 text-sm"
                rows={3}
                maxLength={2000}
                value={visitNotes}
                onChange={(event) => setVisitNotes(event.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end">
            <button
              type="button"
              className={smallPrimaryButton}
              disabled={busy !== null || visitNotes.trim().length < 10}
              onClick={async () => {
                const ok = await act(
                  'visit',
                  () =>
                    saleListingsApi.recordPhysicalVisit(id, {
                      notes: visitNotes.trim(),
                      ...(visitedAt ? { visitedAt: new Date(`${visitedAt}T12:00:00`).toISOString() } : {}),
                    }),
                  'Could not record the visit',
                );
                if (ok) {
                  setVisitNotes('');
                  setVisitedAt('');
                }
              }}
            >
              {busy === 'visit' && <LoadingSpinner size="sm" />} Record my physical visit
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Owner identity & authority to sell"
        icon={UserCheck}
        subtitle="Decided from the submitted documents. Verifying the account confirms the person, never ownership of this property."
      >
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <KeyValue label="Owner identity" value={<StatusPill value={sale.ownerIdentityStatus} styles={PARTY_STATUS_STYLES} />} />
            <KeyValue label="Authority to sell" value={<StatusPill value={sale.authorityToSellStatus} styles={PARTY_STATUS_STYLES} />} />
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Select
              id="owner-identity-decision"
              label="Owner identity decision"
              labelClassName="!mb-1 !text-xs"
              className="!py-2 text-sm"
              placeholder="No change"
              options={PARTY_DECISIONS}
              value={identityStatus}
              onValueChange={setIdentityStatus}
            />
            <Select
              id="authority-decision"
              label="Authority to sell decision"
              labelClassName="!mb-1 !text-xs"
              className="!py-2 text-sm"
              placeholder="No change"
              options={PARTY_DECISIONS}
              value={authorityStatus}
              onValueChange={setAuthorityStatus}
            />
            <Field label="Note">
              <input className="input !py-2 text-sm" maxLength={500} value={partyNote} onChange={(event) => setPartyNote(event.target.value)} />
            </Field>
          </div>
          <InlineNotice tone="warning">A failed identity or authority check escalates the listing to Admin and blocks publication.</InlineNotice>
          <div className="flex justify-end">
            <button
              type="button"
              className={smallPrimaryButton}
              disabled={busy !== null || (!identityStatus && !authorityStatus)}
              onClick={async () => {
                const ok = await act(
                  'party',
                  () =>
                    saleListingsApi.setPartyStatus(id, {
                      ...(identityStatus ? { ownerIdentityStatus: identityStatus as PartyVerificationStatus } : {}),
                      ...(authorityStatus ? { authorityToSellStatus: authorityStatus as PartyVerificationStatus } : {}),
                      ...(partyNote.trim() ? { note: partyNote.trim() } : {}),
                    }),
                  'Could not update owner verification',
                );
                if (ok) {
                  setIdentityStatus('');
                  setAuthorityStatus('');
                  setPartyNote('');
                }
              }}
            >
              {busy === 'party' && <LoadingSpinner size="sm" />} Record owner verification
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard
        title="Document checklist"
        icon={FileCheck2}
        subtitle="Availability or sighting per document, with any independent legal search recorded separately. Sighting is not a legal search."
      >
        <DocumentChecklist
          types={view.documentChecklist}
          documents={view.documents}
          availabilityLabels={documentTypes?.availability}
          legalLabels={documentTypes?.legalSearch}
          onSave={(input) => act('document', () => saleListingsApi.recordDocument(id, input), 'Could not record the document status')}
        />
      </PanelCard>

      <PanelCard
        title="Sales representation agreement"
        icon={FileSignature}
        subtitle="Veriq and the owner sign this before publication. It states the owner-paid success commission for a Veriq-generated sale."
      >
        <div className="space-y-4">
          {agreement ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <KeyValue label="Status" value={humanize(agreement.status)} />
              <KeyValue label="Owner commission" value={`${agreement.commissionPercent}%`} />
              <KeyValue label="Sales Agent share" value={`${agreement.agentSharePercent}% of the commission`} />
              <KeyValue label="Signed" value={agreement.signedAt ? `${formatDateTime(agreement.signedAt)} by ${agreement.signedByOwnerName ?? 'the owner'}` : 'Not signed'} />
            </dl>
          ) : (
            <InlineNotice tone="info">
              No agreement has been prepared yet. Publication is blocked until one exists and is signed.
            </InlineNotice>
          )}

          {agreement?.status !== 'signed' && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-3">
              <Field label="Owner commission %" hint="Leave blank for the configured sale commission rule.">
                <input
                  className="input !py-2 text-sm"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={commissionPercent}
                  onChange={(event) => setCommissionPercent(event.target.value)}
                />
              </Field>
              <Field label="Sales Agent share %" hint="Leave blank for the configured agent share rule.">
                <input
                  className="input !py-2 text-sm"
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={agentSharePercent}
                  onChange={(event) => setAgentSharePercent(event.target.value)}
                />
              </Field>
              <Field label="Notes (optional)">
                <input className="input !py-2 text-sm" maxLength={2000} value={agreementNotes} onChange={(event) => setAgreementNotes(event.target.value)} />
              </Field>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="button"
                  className={smallPrimaryButton}
                  disabled={busy !== null}
                  onClick={async () => {
                    const ok = await act(
                      'agreement',
                      () =>
                        saleListingsApi.prepareAgreement(id, {
                          ...(commissionPercent ? { commissionPercent: Number(commissionPercent) } : {}),
                          ...(agentSharePercent ? { agentSharePercent: Number(agentSharePercent) } : {}),
                          ...(agreementNotes.trim() ? { notes: agreementNotes.trim() } : {}),
                        }),
                      'Could not prepare the agreement',
                    );
                    if (ok) setAgreementNotes('');
                  }}
                >
                  {busy === 'agreement' && <LoadingSpinner size="sm" />} {agreement ? 'Update the agreement' : 'Prepare the agreement'}
                </button>
              </div>
            </div>
          )}

          {isAdmin && agreement && agreement.status !== 'signed' && (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3 sm:grid-cols-3">
              <Field label="Name the owner signed as">
                <input className="input !py-2 text-sm" maxLength={200} value={signedByOwnerName} onChange={(event) => setSignedByOwnerName(event.target.value)} />
              </Field>
              <Field label="Signed document URL (optional)">
                <input className="input !py-2 text-sm" maxLength={2048} value={agreementDocumentUrl} onChange={(event) => setAgreementDocumentUrl(event.target.value)} />
              </Field>
              <div className="flex items-end justify-end">
                <button
                  type="button"
                  className={smallPrimaryButton}
                  disabled={busy !== null || signedByOwnerName.trim().length < 2}
                  onClick={async () => {
                    const ok = await act(
                      'sign',
                      () =>
                        saleListingsApi.signAgreement(id, {
                          signedByOwnerName: signedByOwnerName.trim(),
                          ...(agreementDocumentUrl.trim() ? { documentUrl: agreementDocumentUrl.trim() } : {}),
                        }),
                      'Could not record the signature',
                    );
                    if (ok) {
                      setSignedByOwnerName('');
                      setAgreementDocumentUrl('');
                    }
                  }}
                >
                  {busy === 'sign' && <LoadingSpinner size="sm" />} Record the signature
                </button>
              </div>
            </div>
          )}

          {isAdmin && agreement && (
            <div className="flex justify-end">
              <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => setDialog('cancel-agreement')}>
                Cancel this agreement
              </button>
            </div>
          )}
          {!isAdmin && agreement?.status === 'draft' && (
            <InlineNotice tone="info">Admin records the owner&apos;s signature once the agreement is signed.</InlineNotice>
          )}
        </div>
      </PanelCard>

      <PanelCard
        title={`Buyer enquiries${newEnquiries ? ` · ${newEnquiries} new` : ''}`}
        icon={MessageSquare}
        subtitle="Viewing a sale listing is free, so the enquiry is the buyer's only route to this property — and it comes to you, not the owner."
      >
        {enquiries.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
            No buyer enquiries yet. They appear here as soon as the listing is published and a buyer gets in touch.
          </p>
        ) : (
          <ul className="space-y-3">
            {enquiries.map((enquiry) => (
              <li key={enquiry.id} className="space-y-2 rounded-xl border border-slate-200 p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-sm font-semibold text-navy-900">
                    {enquiry.name} · <a href={`tel:${enquiry.phone}`} className="text-veriq-secondary hover:underline">{enquiry.phone}</a>
                    {enquiry.email && <span className="font-normal text-slate-500"> · {enquiry.email}</span>}
                  </p>
                  <StatusPill value={enquiry.status} styles={ENQUIRY_STATUS_STYLES} />
                </div>
                <p className="whitespace-pre-line text-sm leading-6 text-slate-700">{enquiry.message}</p>
                <p className="text-[11px] text-slate-400">Received {formatDateTime(enquiry.createdAt)}</p>
                {enquiry.status !== 'closed' && (
                  <div className="flex flex-wrap gap-2">
                    {ENQUIRY_STATUSES.filter((option) => option.value !== enquiry.status).map((option) => (
                      <button
                        key={option.value}
                        type="button"
                        className={smallButton}
                        disabled={busy !== null}
                        onClick={() =>
                          act(
                            `enquiry-${enquiry.id}`,
                            () => saleEnquiriesApi.updateStatus(enquiry.id, { status: option.value as SaleEnquiryStatus }),
                            'Could not update the enquiry',
                          )
                        }
                      >
                        {busy === `enquiry-${enquiry.id}` && <LoadingSpinner size="sm" />} {option.label}
                      </button>
                    ))}
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard
        title="Sale outcome"
        icon={Trophy}
        subtitle="Commission is due only after the sale completes as defined in the agreement. Recording a completed sale is what triggers it."
      >
        <div className="space-y-4">
          {sale.saleOutcome ? (
            <dl className="grid grid-cols-1 gap-3 sm:grid-cols-4">
              <KeyValue label="Outcome" value={humanize(sale.saleOutcome)} />
              <KeyValue label="Sale price" value={sale.salePriceAmount === null ? 'Not recorded' : formatNaira(sale.salePriceAmount)} />
              <KeyValue label="Owner commission" value={sale.commissionAmount === null ? 'Not calculated' : formatNaira(sale.commissionAmount)} />
              <KeyValue label="Recorded" value={formatDateTime(sale.outcomeRecordedAt)} />
            </dl>
          ) : !isAdmin ? (
            <InlineNotice tone="info">
              Admin records the outcome once the sale completes or the representation is withdrawn. Tell Admin as soon
              as you know which it is.
            </InlineNotice>
          ) : (
            <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-3">
              <Select
                id="sale-outcome"
                label="Outcome"
                labelClassName="!mb-1 !text-xs"
                className="!py-2 text-sm"
                options={OUTCOME_OPTIONS}
                value={outcome}
                onValueChange={setOutcome}
                required
              />
              <Field
                label="Completed sale price (₦)"
                hint={outcome === 'completed' ? 'Required for a completed sale; the commission is calculated from it.' : 'Only for a completed sale.'}
              >
                <input
                  className="input !py-2 text-sm"
                  type="number"
                  min={1}
                  step={1}
                  disabled={outcome !== 'completed'}
                  value={salePriceAmount}
                  onChange={(event) => setSalePriceAmount(event.target.value)}
                />
              </Field>
              <Field label="Notes (optional)">
                <input className="input !py-2 text-sm" maxLength={1000} value={outcomeNotes} onChange={(event) => setOutcomeNotes(event.target.value)} />
              </Field>
              <div className="sm:col-span-3 flex justify-end">
                <button
                  type="button"
                  className={smallPrimaryButton}
                  disabled={busy !== null || !outcome || (outcome === 'completed' && !salePriceAmount)}
                  onClick={async () => {
                    const ok = await act(
                      'outcome',
                      () =>
                        saleListingsApi.recordOutcome(id, {
                          outcome: outcome as SaleOutcomeValue,
                          ...(outcome === 'completed' ? { salePriceAmount: Math.trunc(Number(salePriceAmount)) } : {}),
                          ...(outcomeNotes.trim() ? { notes: outcomeNotes.trim() } : {}),
                        }),
                      'Could not record the outcome',
                    );
                    if (ok) {
                      setOutcome('');
                      setSalePriceAmount('');
                      setOutcomeNotes('');
                    }
                  }}
                >
                  {busy === 'outcome' && <LoadingSpinner size="sm" />} Record the outcome
                </button>
              </div>
            </div>
          )}
        </div>
      </PanelCard>

      <PanelCard title="Private evidence" icon={FileText} subtitle="Identity, authority and document files stay private and are never published.">
        <div className="space-y-4">
          <EvidenceList items={view.evidence} />
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
            <Select
              id="sale-evidence-kind"
              label="Evidence type"
              labelClassName="!mb-1 !text-xs"
              className="!py-2 text-sm"
              options={EVIDENCE_KINDS}
              value={evidenceKind}
              onValueChange={setEvidenceKind}
              required
            />
            <Field label="File (PDF or photo, max 10 MB)" hint={evidenceNotes ? undefined : 'Add a note below if the file needs context'}>
              <input
                type="file"
                accept="application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
                className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
                onChange={(event) => setEvidenceFile(event.target.files?.[0] ?? null)}
              />
            </Field>
            <button
              type="button"
              className={smallPrimaryButton}
              disabled={busy !== null || !evidenceFile || !evidenceKind}
              onClick={async () => {
                if (!evidenceFile || !evidenceKind) return;
                const ok = await act(
                  'evidence',
                  () =>
                    saleListingsApi.uploadEvidence(id, {
                      file: evidenceFile,
                      kind: evidenceKind as EvidenceKind,
                      notes: evidenceNotes,
                    }),
                  'Upload failed',
                );
                if (ok) {
                  setEvidenceFile(null);
                  setEvidenceNotes('');
                  setEvidenceKind('');
                }
              }}
            >
              {busy === 'evidence' ? <LoadingSpinner size="sm" /> : <Upload className="h-3.5 w-3.5" />} Upload
            </button>
            <Field label="Note (optional)" className="sm:col-span-3">
              <input className="input !py-2 text-sm" maxLength={1000} value={evidenceNotes} onChange={(event) => setEvidenceNotes(event.target.value)} />
            </Field>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Canonical Property location" icon={MapPin} subtitle="Location verification is recorded on the canonical Property the sale is linked to.">
        <LocationVerifier
          key={JSON.stringify(property.verifiedAddress ?? {})}
          submitted={null}
          verified={property.verifiedAddress}
          onSubmit={(input) =>
            act(
              'location',
              () =>
                verificationApi.verifyLocation(property.id, {
                  address: input.address,
                  latitude: input.latitude,
                  longitude: input.longitude,
                  ...(input.landmark ? { landmark: input.landmark } : {}),
                }),
              'Could not save the verified location',
            )
          }
        />
      </PanelCard>

      <PanelCard title="Street Intelligence" icon={MapPin} subtitle="A sale listing uses the canonical Property's street link.">
        <StreetIntelligencePanel
          targetType="property"
          targetId={property.id}
          location={{ localGovernmentId: null, areaId: null, state: property.state, city: property.city }}
          onChanged={load}
        />
      </PanelCard>

      <PanelCard title="Sale facts & intelligence" icon={Landmark} subtitle="The Built Property or Land record buyers read on the free listing page.">
        <div className="space-y-5">
          <AnswersView schemaId={sale.schemaId} answers={answers} groups={['facts', 'intelligence']} issues={sale.issues} />
          <details className="rounded-xl border border-slate-100 p-3">
            <summary className="cursor-pointer text-sm font-semibold text-navy-900">Edit facts &amp; intelligence</summary>
            <div className="mt-4">
              <AnswersEditor
                key={sale.updatedAt}
                schemaId={sale.schemaId}
                initial={answers}
                groups={['facts', 'intelligence']}
                onSave={async (next) => {
                  setBusy('record');
                  try {
                    const res = await saleListingsApi.update(id, { facts: next.facts, intelligence: next.intelligence });
                    success(res.message || 'Sale record updated');
                    await load();
                    return null;
                  } catch (err) {
                    const { message, details } = describeError(err, 'Could not update the sale record');
                    toastError(message);
                    return issuesFrom(details);
                  } finally {
                    setBusy(null);
                  }
                }}
              />
            </div>
          </details>
        </div>
      </PanelCard>

      <PanelCard title="Media" icon={ImageIcon} subtitle="Uploads are approved immediately and one image is the public cover.">
        <MediaReviewPanel ownerType="sale_listing" ownerId={sale.id} onChanged={load} />
      </PanelCard>

      <PanelCard title="Sale availability" icon={CalendarCheck} subtitle="Only Available published listings are discoverable; confirm according to the freshness policy.">
        <SaleAvailabilityControl
          status={sale.availabilityStatus}
          unavailableReason={sale.unavailableReason}
          changedAt={sale.availabilityChangedAt}
          confirmedAt={sale.availabilityConfirmedAt}
          expiresAt={sale.freshnessExpiresAt}
          onChange={(input: SaleAvailabilityInput) => act('availability', () => saleListingsApi.availability(id, input), 'Could not update availability')}
        />
      </PanelCard>

      <ReasonDialog
        isOpen={dialog === 'escalate'}
        title="Escalate to Admin"
        description="Use for identity, authority, document or risk concerns. Publication is blocked until Admin clears the escalation."
        label="Reason for escalation"
        confirmLabel="Escalate"
        tone="danger"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('escalate', () => saleListingsApi.escalate(id, reason), 'Could not escalate the listing')}
      />
      <ReasonDialog
        isOpen={dialog === 'clear'}
        title="Clear the escalation"
        description="Record what changed. The listing becomes publishable again once the remaining blockers are cleared."
        label="Reason"
        confirmLabel="Clear escalation"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('clear', () => saleListingsApi.clearEscalation(id, reason), 'Could not clear the escalation')}
      />
      <ReasonDialog
        isOpen={dialog === 'correction'}
        title="Request a correction from the owner"
        description="Say exactly what must change. The owner re-accepts the listing declaration when they re-submit."
        label="What the owner must correct"
        confirmLabel="Send the request"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('correction', () => saleListingsApi.requestCorrection(id, reason), 'Could not request a correction')}
      />
      <ReasonDialog
        isOpen={dialog === 'cancel-agreement'}
        title="Cancel the sales representation agreement"
        description="Publication is blocked again until a new agreement is prepared and signed."
        label="Reason for cancelling"
        confirmLabel="Cancel the agreement"
        tone="danger"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('cancel-agreement', () => saleListingsApi.cancelAgreement(id, reason), 'Could not cancel the agreement')}
      />
      <Modal isOpen={dialog === 'publish'} onClose={() => busy === null && setDialog(null)} title="Publish sale listing" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Publishing makes the listing publicly discoverable and free to view while it is Available. Owner identity,
            authority to sell, your physical visit, the document checklist, the signed agreement, location, street link,
            record and media are all checked server-side.
          </p>
          {view.readiness.blockers.length > 0 && <BlockersList title="Current blockers" blockers={view.readiness.blockers} compact />}
          <div className="flex justify-end gap-2">
            <button type="button" className={smallButton} onClick={() => setDialog(null)} disabled={busy !== null}>
              Cancel
            </button>
            <button type="button" className={smallPrimaryButton} onClick={publish} disabled={busy !== null}>
              {busy === 'publish' ? <LoadingSpinner size="sm" /> : <Rocket className="h-3.5 w-3.5" />} Publish now
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
