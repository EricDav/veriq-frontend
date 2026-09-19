'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarCheck,
  FileCheck2,
  FileText,
  Image as ImageIcon,
  Landmark,
  MapPin,
  Rocket,
  ShieldAlert,
  Upload,
  UserCheck,
} from 'lucide-react';
import type {
  EvidenceKind,
  PartyVerificationStatus,
  SaleAvailabilityInput,
  SaleContactRoute,
  SaleDocumentTypesPayload,
  SaleManageView,
  SalePriceBasis,
  SchemaAnswers,
  SchemaIssue,
} from '@/types/agent';
import { UserRole } from '@/types';
import { saleListingsApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
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
import { PUBLICATION_STATUS_STYLES, describeError, errorMessage, formatNaira, humanize } from '@/components/agent/format';
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

const EVIDENCE_KINDS: Array<{ value: EvidenceKind; label: string }> = [
  { value: 'seller_identity', label: 'Seller / owner identity' },
  { value: 'authority_to_sell', label: 'Authority to sell' },
  { value: 'sale_document', label: 'Sale document' },
  { value: 'ownership', label: 'Ownership document' },
  { value: 'other', label: 'Other' },
];

const PRICE_BASIS: Record<string, Array<{ value: SalePriceBasis; label: string }>> = {
  built_property: [
    { value: 'total', label: 'Total price' },
    { value: 'other', label: 'Other basis' },
  ],
  land: [
    { value: 'total', label: 'Total price' },
    { value: 'per_plot', label: 'Per plot' },
    { value: 'per_square_metre', label: 'Per square metre' },
  ],
};

const issuesFrom = (details: unknown[]): SchemaIssue[] =>
  details.filter((item): item is SchemaIssue => typeof item === 'object' && item !== null && 'path' in item && 'message' in item);

export default function SaleListingWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<SaleManageView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [documentTypes, setDocumentTypes] = useState<SaleDocumentTypesPayload | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'escalate' | 'publish' | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<unknown[] | null>(null);

  const [title, setTitle] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [priceBasis, setPriceBasis] = useState<SalePriceBasis>('total');
  const [negotiable, setNegotiable] = useState<'' | 'yes' | 'no'>('');
  const [contactRoute, setContactRoute] = useState<SaleContactRoute>('veriq_agent');
  const [observation, setObservation] = useState('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerWhatsapp, setSellerWhatsapp] = useState('');
  const [sellerIsOwner, setSellerIsOwner] = useState(true);
  const [identityStatus, setIdentityStatus] = useState<PartyVerificationStatus | ''>('');
  const [authorityStatus, setAuthorityStatus] = useState<PartyVerificationStatus | ''>('');
  const [partyNote, setPartyNote] = useState('');
  const [evidenceKind, setEvidenceKind] = useState<EvidenceKind>('seller_identity');
  const [evidenceNotes, setEvidenceNotes] = useState('');
  const [evidenceFile, setEvidenceFile] = useState<File | null>(null);

  const hydrate = useCallback((data: SaleManageView) => {
    setView(data);
    setTitle(data.sale.title);
    setAskingPrice(String(data.sale.askingPrice));
    setPriceBasis(data.sale.priceBasis);
    setNegotiable(data.sale.negotiable === null ? '' : data.sale.negotiable ? 'yes' : 'no');
    setContactRoute(data.sale.contactRoute);
    setObservation(data.sale.agentObservation ?? '');
    setSellerName(data.sale.sellerName);
    setSellerPhone(data.sale.sellerPhone ?? '');
    setSellerWhatsapp(data.sale.sellerWhatsappPhone ?? '');
    setSellerIsOwner(data.sale.sellerIsOwner);
  }, []);

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await saleListingsApi.manage(id);
      hydrate(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the Sale Listing'));
    }
  }, [id, hydrate]);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

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
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="Property for Sale listings are managed by Veriq Agents." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Sale Listing" backHref="/dashboard/agent/sales" backLabel="Property for Sale" />
        <ErrorBlock message={loadError} onRetry={load} />
      </div>
    );
  }
  if (!view) return <PageLoader />;

  const { sale, property } = view;
  const canPublish = sale.publicationStatus !== 'published' && sale.publicationStatus !== 'suspended';

  const publish = async () => {
    setBusy('publish');
    setPublishBlockers(null);
    try {
      const res = await saleListingsApi.publish(id);
      success(res.message || 'Sale Listing published');
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
    return act(
      'details',
      () =>
        saleListingsApi.update(id, {
          title: title.trim(),
          askingPrice: Math.trunc(price),
          priceBasis,
          ...(negotiable ? { negotiable: negotiable === 'yes' } : {}),
          contactRoute,
          agentObservation: observation.trim(),
          seller: {
            name: sellerName.trim(),
            ...(sellerPhone.trim() ? { phone: sellerPhone.trim() } : {}),
            ...(sellerWhatsapp.trim() ? { whatsappPhone: sellerWhatsapp.trim() } : {}),
            isOwner: sellerIsOwner,
          },
        }),
      'Could not update the Sale Listing',
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
            <span className={`badge !px-2.5 !py-0.5 text-[11px] ${sale.availabilityStatus === 'available' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
              {sale.availabilityStatus === 'available' ? 'Available' : `Unavailable${sale.unavailableReason ? ` · ${humanize(sale.unavailableReason)}` : ''}`}
            </span>
            {sale.escalationOpen && <span className="badge bg-red-100 !px-2.5 !py-0.5 text-[11px] text-red-800">Escalated to Admin</span>}
          </>
        }
        actions={
          <>
            {!sale.escalationOpen && (
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
          <strong>Escalated:</strong> {sale.escalationReason ?? 'Recorded by the verification workflow'}. Only Admin can clear this escalation; the
          listing cannot be published until it is cleared.
        </InlineNotice>
      )}
      {sale.publicationStatus === 'suspended' && (
        <InlineNotice tone="danger">
          <strong>Suspended by Admin:</strong> {sale.suspensionReason ?? 'No reason recorded'}.
        </InlineNotice>
      )}

      <PanelCard title="Publication readiness" icon={Rocket}>
        <div className="space-y-3">
          {publishBlockers && publishBlockers.length > 0 && <BlockersList title="Publish was blocked" blockers={publishBlockers} />}
          <BlockersList blockers={view.readiness.blockers} />
        </div>
      </PanelCard>

      <PanelCard title="Listing details" icon={Landmark} subtitle="Asking price, basis, negotiability, buyer contact route and the optional Agent Observation.">
        <div className="space-y-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Title">
              <input className="input !py-2 text-sm" maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
            <Field label="Asking price (₦)" hint={askingPrice ? formatNaira(Number(askingPrice)) : undefined}>
              <input className="input !py-2 text-sm" type="number" min={1} step={1} value={askingPrice} onChange={(event) => setAskingPrice(event.target.value)} />
            </Field>
            <Field label="Price basis">
              <select className="input !py-2 text-sm" value={priceBasis} onChange={(event) => setPriceBasis(event.target.value as SalePriceBasis)}>
                {(PRICE_BASIS[sale.subtype] ?? PRICE_BASIS.built_property).map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Negotiability">
              <select className="input !py-2 text-sm" value={negotiable} onChange={(event) => setNegotiable(event.target.value as typeof negotiable)}>
                <option value="">Not stated</option>
                <option value="yes">Negotiable</option>
                <option value="no">Fixed</option>
              </select>
            </Field>
            <Field label="Seller name">
              <input className="input !py-2 text-sm" maxLength={160} value={sellerName} onChange={(event) => setSellerName(event.target.value)} />
            </Field>
            <Field label="Seller phone">
              <input className="input !py-2 text-sm" value={sellerPhone} onChange={(event) => setSellerPhone(event.target.value)} />
            </Field>
            <Field label="Seller WhatsApp">
              <input className="input !py-2 text-sm" value={sellerWhatsapp} onChange={(event) => setSellerWhatsapp(event.target.value)} />
            </Field>
            <Field label="Buyer contact route">
              <select className="input !py-2 text-sm" value={contactRoute} onChange={(event) => setContactRoute(event.target.value as SaleContactRoute)}>
                <option value="veriq_agent">Veriq Agent handles buyer contact</option>
                <option value="seller">Seller contact released after unlock</option>
              </select>
            </Field>
            <Field label="Agent Observation (optional)" className="sm:col-span-2" hint="Only where explanation is genuinely necessary.">
              <textarea className="input resize-none !py-2 text-sm" rows={2} maxLength={500} value={observation} onChange={(event) => setObservation(event.target.value)} />
            </Field>
            <label className="flex items-start gap-2 sm:col-span-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={sellerIsOwner} onChange={(event) => setSellerIsOwner(event.target.checked)} />
              <span className="text-xs text-slate-600">The seller is the beneficial owner. Unchecking makes authority to sell a required verification step.</span>
            </label>
          </div>
          <div className="flex justify-end">
            <button type="button" className={smallPrimaryButton} disabled={busy !== null || title.trim().length < 3 || sellerName.trim().length < 2} onClick={saveDetails}>
              {busy === 'details' && <LoadingSpinner size="sm" />} Save listing details
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Seller identity & authority" icon={UserCheck} subtitle="Step 2 of §8.5: verify who you are dealing with before anything is published.">
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KeyValue label="Seller identity" value={<StatusPill value={sale.sellerIdentityStatus} styles={PARTY_STATUS_STYLES} />} />
            <KeyValue label="Authority to sell" value={<StatusPill value={sale.authorityToSellStatus} styles={PARTY_STATUS_STYLES} />} />
            <KeyValue label="Seller is owner" value={sale.sellerIsOwner ? 'Yes' : 'No — representative'} />
          </dl>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Seller identity decision">
              <select className="input !py-2 text-sm" value={identityStatus} onChange={(event) => setIdentityStatus(event.target.value as PartyVerificationStatus | '')}>
                <option value="">No change</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
              </select>
            </Field>
            <Field label="Authority to sell decision" hint={sale.sellerIsOwner ? 'Not required while the seller is the owner' : undefined}>
              <select
                className="input !py-2 text-sm"
                value={authorityStatus}
                disabled={sale.sellerIsOwner}
                onChange={(event) => setAuthorityStatus(event.target.value as PartyVerificationStatus | '')}
              >
                <option value="">No change</option>
                <option value="pending">Pending</option>
                <option value="verified">Verified</option>
                <option value="failed">Failed</option>
              </select>
            </Field>
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
                      ...(identityStatus ? { sellerIdentityStatus: identityStatus } : {}),
                      ...(authorityStatus ? { authorityToSellStatus: authorityStatus } : {}),
                      ...(partyNote.trim() ? { note: partyNote.trim() } : {}),
                    }),
                  'Could not update seller verification',
                );
                if (ok) {
                  setIdentityStatus('');
                  setAuthorityStatus('');
                  setPartyNote('');
                }
              }}
            >
              {busy === 'party' && <LoadingSpinner size="sm" />} Record seller verification
            </button>
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Document checklist" icon={FileCheck2} subtitle="Availability / sighting per document, with the independent legal search recorded separately (§6.5).">
        <DocumentChecklist
          types={view.documentChecklist}
          documents={view.documents}
          availabilityLabels={documentTypes?.availability}
          legalLabels={documentTypes?.legalSearch}
          onSave={(input) => act('document', () => saleListingsApi.recordDocument(id, input), 'Could not record the document status')}
        />
      </PanelCard>

      <PanelCard title="Private evidence" icon={FileText} subtitle="Identity, authority and document files stay private — never public or in unlocked packages.">
        <div className="space-y-4">
          <EvidenceList items={view.evidence} />
          <div className="grid grid-cols-1 gap-3 rounded-xl border border-slate-100 p-3 sm:grid-cols-[200px_1fr_auto] sm:items-end">
            <Field label="Evidence type">
              <select className="input !py-2 text-sm" value={evidenceKind} onChange={(event) => setEvidenceKind(event.target.value as EvidenceKind)}>
                {EVIDENCE_KINDS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
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
              disabled={busy !== null || !evidenceFile}
              onClick={async () => {
                if (!evidenceFile) return;
                const ok = await act('evidence', () => saleListingsApi.uploadEvidence(id, { file: evidenceFile, kind: evidenceKind, notes: evidenceNotes }), 'Upload failed');
                if (ok) {
                  setEvidenceFile(null);
                  setEvidenceNotes('');
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

      <PanelCard title="Canonical Property location" icon={MapPin} subtitle="Location verification is recorded on the canonical Property the sale is linked to (§4.3).">
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

      <PanelCard title="Street Intelligence" icon={MapPin} subtitle="A Sale Listing uses the canonical Property's street link (§24.3).">
        <StreetIntelligencePanel
          targetType="property"
          targetId={property.id}
          location={{ localGovernmentId: null, areaId: null, state: property.state, city: property.city }}
          onChanged={load}
        />
      </PanelCard>

      <PanelCard title="Sale facts & intelligence" icon={Landmark} subtitle="Built Property or Land record used for the buyer-decision summary and the unlocked package.">
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

      <PanelCard title="Media" icon={ImageIcon} subtitle="Sale media is managed by you; uploads are approved immediately and one image is the public cover.">
        <MediaReviewPanel ownerType="sale_listing" ownerId={sale.id} onChanged={load} />
      </PanelCard>

      <PanelCard title="Sale availability" icon={CalendarCheck} subtitle="Only Available published listings are discoverable; confirm according to the freshness policy (§8.5 step 6).">
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
      <Modal isOpen={dialog === 'publish'} onClose={() => busy === null && setDialog(null)} title="Publish Sale Listing" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-slate-600">
            Publishing makes the listing publicly discoverable while it is Available. Seller identity, authority, document checklist, location,
            street link, record and media are all checked server-side.
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
