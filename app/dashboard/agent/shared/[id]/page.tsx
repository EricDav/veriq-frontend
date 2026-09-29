'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'next/navigation';
import {
  CalendarCheck,
  ClipboardList,
  FileClock,
  FileText,
  Image as ImageIcon,
  MapPin,
  Phone,
  Rocket,
  Send,
  ShieldAlert,
  Users,
} from 'lucide-react';
import type {
  ChecklistItemStatus,
  OperatorIdentityStatus,
  SchemaAnswers,
  SchemaIssue,
  SharedManageView,
  VerificationChecklistKey,
  VerificationEvidence,
} from '@/types/agent';
import { SHARED_CHECK_KEYS, SHARED_REVERIFICATION_CHECK_KEYS } from '@/types/agent';
import { UserRole } from '@/types';
import { sharedVerificationApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { AnswersEditor } from '@/components/agent/AnswersEditor';
import { AnswersView } from '@/components/agent/AnswersView';
import { UnitAvailabilityControl } from '@/components/agent/AvailabilityPanel';
import { BlockersList } from '@/components/agent/BlockersList';
import { ChecklistPanel } from '@/components/agent/ChecklistPanel';
import { EvidenceList } from '@/components/agent/EvidenceList';
import { IdentityDecisionForm } from '@/components/agent/IdentityDecisionForm';
import { LocationVerifier } from '@/components/agent/LocationVerifier';
import { MediaReviewPanel } from '@/components/agent/MediaReviewPanel';
import { NotApplicableRequests } from '@/components/agent/NotApplicableRequests';
import { ReasonDialog } from '@/components/agent/ReasonDialog';
import { RevisionReviewCard } from '@/components/agent/RevisionReviewCard';
import { StreetIntelligencePanel } from '@/components/agent/StreetIntelligencePanel';
import {
  CASE_STATUS_TONES,
  PUBLICATION_STATUS_TONES,
  describeError,
  errorMessage,
  formatDateTime,
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

const TYPE_LABELS: Record<string, string> = {
  private_room: 'Private room',
  shared_room_bedspace: 'Shared room / bedspace',
};

const issuesFrom = (details: unknown[]): SchemaIssue[] =>
  details.filter((item): item is SchemaIssue => typeof item === 'object' && item !== null && 'path' in item && 'message' in item);

export default function SharedPropertyWorkspacePage() {
  const params = useParams<{ id: string }>();
  const id = params.id;
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [view, setView] = useState<SharedManageView | null>(null);
  const [loadError, setLoadError] = useState('');
  const [evidence, setEvidence] = useState<VerificationEvidence[] | null>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'correction' | 'suspend' | 'publish' | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<unknown[] | null>(null);
  const [labelDraft, setLabelDraft] = useState('');
  const [observationDraft, setObservationDraft] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await sharedVerificationApi.manage(id);
      setView(res.data);
      setLabelDraft(res.data.opportunity.displayLabel);
      setObservationDraft(res.data.opportunity.agentObservation ?? '');
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the Shared Property opportunity'));
    }
  }, [id]);

  const loadEvidence = useCallback(async () => {
    setEvidenceError('');
    try {
      const res = await sharedVerificationApi.evidence(id);
      setEvidence(res.data);
    } catch (err) {
      setEvidenceError(errorMessage(err, 'Could not load occupancy and identity evidence'));
    }
  }, [id]);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) {
      load();
      loadEvidence();
    }
  }, [load, loadEvidence, user?.role]);

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

  const opportunity = view?.opportunity;
  const answers = useMemo<SchemaAnswers>(
    () => ({ facts: opportunity?.facts ?? {}, commercial: opportunity?.commercialTerms ?? {}, intelligence: opportunity?.intelligence ?? {} }),
    [opportunity?.facts, opportunity?.commercialTerms, opportunity?.intelligence],
  );

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="This workspace is available to Veriq Agents only." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Shared Property" backHref="/dashboard/agent/shared" backLabel="Shared Property queue" />
        <ErrorBlock message={loadError} onRetry={load} />
      </div>
    );
  }
  if (!view || !opportunity) return <PageLoader />;

  const verification = view.verification;
  const checkKeys: readonly VerificationChecklistKey[] = verification?.isReverification ? SHARED_REVERIFICATION_CHECK_KEYS : SHARED_CHECK_KEYS;
  const identityUnverified = view.readiness.blockers.some((blocker) => blocker.code === 'operator_identity_unverified');
  const canPublish = opportunity.publicationStatus !== 'published' || opportunity.reverificationRequired;

  const publish = async () => {
    setBusy('publish');
    setPublishBlockers(null);
    try {
      const res = await sharedVerificationApi.publish(id);
      success(res.message || 'Shared Property published');
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

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={opportunity.displayLabel}
        backHref="/dashboard/agent/shared"
        backLabel="Shared Property queue"
        subtitle={`${TYPE_LABELS[opportunity.opportunityType] ?? humanize(opportunity.opportunityType)} · ${opportunity.area}, ${opportunity.city}, ${opportunity.state} · ID ${opportunity.id}`}
        badges={
          <>
            {verification && <StatusPill value={verification.status} tones={CASE_STATUS_TONES} label={`Case: ${humanize(verification.status)}`} />}
            <StatusPill value={opportunity.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
            <span className={`badge !px-2.5 !py-0.5 text-[11px] ${opportunity.availabilityStatus === 'available' ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#ffffff0f] text-muted-foreground'}`}>
              {humanize(opportunity.availabilityStatus)}
            </span>
            {opportunity.reverificationRequired && <span className="badge bg-[#ffffff06] !px-2.5 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">Re-verification required</span>}
          </>
        }
        actions={
          <>
            {verification && ['pending', 'in_progress', 'ready_to_publish'].includes(verification.status) && (
              <button type="button" className={smallButton} disabled={busy !== null} onClick={() => setDialog('correction')}>
                <Send className="h-3.5 w-3.5" /> Request correction
              </button>
            )}
            {canPublish && (
              <button type="button" className={smallPrimaryButton} disabled={busy !== null} onClick={() => setDialog('publish')}>
                {busy === 'publish' ? <LoadingSpinner size="sm" /> : <Rocket className="h-3.5 w-3.5" />}
                {opportunity.reverificationRequired ? 'Re-verify & publish' : 'Publish'}
              </button>
            )}
            {opportunity.publicationStatus === 'published' && (
              <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => setDialog('suspend')}>
                <ShieldAlert className="h-3.5 w-3.5" /> Suspend
              </button>
            )}
          </>
        }
      />

      {opportunity.suspensionReason && opportunity.publicationStatus === 'suspended' && (
        <InlineNotice tone="danger">
          <strong>Suspended:</strong> {opportunity.suspensionReason}
          {opportunity.suspendedAt ? ` · ${formatDateTime(opportunity.suspendedAt)}` : ''}
        </InlineNotice>
      )}
      {verification?.correctionNotes && verification.status === 'needs_correction' && (
        <InlineNotice tone="warning">
          <strong>Correction requested:</strong> {verification.correctionNotes}
        </InlineNotice>
      )}
      {opportunity.reverificationRequired && (
        <InlineNotice tone="info">
          The resident marked this opportunity available after its verification period lapsed. Confirm continued occupancy and permission, the
          household facts and the contribution terms, then publish to make it public again (§28.2).
        </InlineNotice>
      )}

      <PanelCard title="Publication readiness" icon={Rocket}>
        <div className="space-y-3">
          {publishBlockers && publishBlockers.length > 0 && <BlockersList title="Publish was blocked" blockers={publishBlockers} />}
          <BlockersList blockers={view.readiness.blockers} />
        </div>
      </PanelCard>

      <PanelCard title="Resident & contact" icon={Users} subtitle="Resident identity, permission declaration and the contact route for renters.">
        <div className="space-y-4">
          <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <KeyValue label="Contact name" value={opportunity.contactName} />
            <KeyValue
              label="Phone"
              value={
                <a className="inline-flex items-center gap-1 text-primary hover:underline" href={`tel:${opportunity.contactPhone}`}>
                  <Phone className="h-3 w-3" /> {opportunity.contactPhone}
                </a>
              }
            />
            <KeyValue label="WhatsApp" value={opportunity.contactWhatsappPhone ?? '—'} />
            <KeyValue
              label="Permission declaration"
              value={opportunity.permissionDeclaredAt ? `Declared ${formatDateTime(opportunity.permissionDeclaredAt)}` : 'Not declared — required before publication'}
            />
            <KeyValue label="Resident identity" value={identityUnverified ? 'Not verified' : 'Verified'} />
            <KeyValue label="Canonical Property" value={opportunity.canonicalPropertyId ?? 'Not reconciled'} />
          </dl>
          <IdentityDecisionForm
            onDecide={(status: OperatorIdentityStatus, note) =>
              act('identity', () => verificationApi.setOperatorIdentity(opportunity.operatorId, status, note), 'Could not update the identity status')
            }
          />
        </div>
      </PanelCard>

      <PanelCard
        title="Verification checks"
        icon={ClipboardList}
        subtitle={verification?.isReverification ? 'Lightweight re-verification: authority, facts and contribution terms.' : 'Full Shared Property checks (no Unit structure).'}
      >
        {verification ? (
          <ChecklistPanel
            keys={checkKeys}
            checklist={verification.checklist}
            onUpdate={(key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) =>
              act(`check-${key}`, () => sharedVerificationApi.recordCheck(id, key, status, note), 'Could not record the check')
            }
          />
        ) : (
          <p className="text-sm text-muted-foreground">This opportunity has no open verification case. It must be submitted or reactivated by the resident first.</p>
        )}
      </PanelCard>

      <PanelCard title="Occupancy & identity evidence" icon={FileText} subtitle="Proof of current occupancy is required; a utility bill alone is not automatically sufficient (§6.4).">
        {evidenceError ? <ErrorBlock message={evidenceError} onRetry={loadEvidence} /> : evidence ? <EvidenceList items={evidence} /> : <p className="text-sm text-muted-foreground">Loading evidence…</p>}
      </PanelCard>

      <PanelCard title="Private location" icon={MapPin} subtitle="A verified private location reference is required even when no canonical Property exists yet.">
        <LocationVerifier
          key={JSON.stringify(opportunity.verifiedAddress ?? {})}
          submitted={opportunity.submittedAddress}
          verified={opportunity.verifiedAddress}
          allowLandmark={false}
          canonicalPropertyField
          currentCanonicalPropertyId={opportunity.canonicalPropertyId}
          onSubmit={(input) =>
            act(
              'location',
              () =>
                sharedVerificationApi.verifyLocation(id, {
                  address: input.address,
                  latitude: input.latitude,
                  longitude: input.longitude,
                  ...(input.canonicalPropertyId ? { canonicalPropertyId: input.canonicalPropertyId } : {}),
                }),
              'Could not save the verified location',
            )
          }
        />
      </PanelCard>

      <PanelCard title="Street Intelligence" icon={MapPin} subtitle="Shared Property links through its own verified location (§24.3).">
        <StreetIntelligencePanel
          targetType="shared_opportunity"
          targetId={opportunity.id}
          location={{ localGovernmentId: opportunity.localGovernmentId, areaId: opportunity.areaId, state: opportunity.state, city: opportunity.city }}
          onChanged={load}
        />
      </PanelCard>

      <PanelCard title="Opportunity record" icon={FileText} subtitle="Household facts, contribution terms and structured intelligence.">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Display label">
              <input className="input !py-2 text-sm" maxLength={160} value={labelDraft} onChange={(event) => setLabelDraft(event.target.value)} />
            </Field>
            <button
              type="button"
              className={smallButton}
              disabled={busy !== null || labelDraft.trim().length < 3 || labelDraft.trim() === opportunity.displayLabel}
              onClick={() => act('label', () => sharedVerificationApi.update(id, { displayLabel: labelDraft.trim() }), 'Could not update the label')}
            >
              {busy === 'label' && <LoadingSpinner size="sm" />} Save label
            </button>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
            <Field label="Agent Observation (optional)" hint="Only where explanation is genuinely necessary; shown as an Agent-authored note.">
              <textarea className="input resize-none !py-2 text-sm" rows={2} maxLength={300} value={observationDraft} onChange={(event) => setObservationDraft(event.target.value)} />
            </Field>
            <button
              type="button"
              className={smallButton}
              disabled={busy !== null || observationDraft === (opportunity.agentObservation ?? '')}
              onClick={() => act('observation', () => sharedVerificationApi.update(id, { agentObservation: observationDraft.trim() }), 'Could not save the observation')}
            >
              {busy === 'observation' && <LoadingSpinner size="sm" />} Save observation
            </button>
          </div>
          <AnswersView schemaId={opportunity.schemaId} answers={answers} issues={opportunity.issues} />
          <details className="rounded-xl border border-[#ffffff10] p-3">
            <summary className="cursor-pointer text-sm font-semibold text-foreground">Correct facts, terms &amp; intelligence</summary>
            <div className="mt-4">
              <AnswersEditor
                key={opportunity.updatedAt}
                schemaId={opportunity.schemaId}
                initial={answers}
                groups={['facts', 'commercial', 'intelligence']}
                onSave={async (next) => {
                  setBusy('record');
                  try {
                    const res = await sharedVerificationApi.update(id, { facts: next.facts, commercial: next.commercial, intelligence: next.intelligence });
                    success(res.message || 'Opportunity updated');
                    await load();
                    return null;
                  } catch (err) {
                    const { message, details } = describeError(err, 'Could not update the record');
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

      <PanelCard title="Media" icon={ImageIcon} subtitle="Room / living area imagery with one public image; occupant privacy rules apply (§9.4).">
        <div className="space-y-5">
          <MediaReviewPanel ownerType="shared_opportunity" ownerId={opportunity.id} onChanged={load} />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Resident Not Applicable requests</p>
            <NotApplicableRequests listingTitle={opportunity.displayLabel} onChanged={load} />
          </div>
        </div>
      </PanelCard>

      <PanelCard title="Availability" icon={CalendarCheck} subtitle="Unavailable hides the opportunity immediately; reactivation after a lapsed period needs re-verification.">
        <UnitAvailabilityControl
          status={opportunity.availabilityStatus}
          changedAt={opportunity.availabilityChangedAt}
          confirmedAt={opportunity.availabilityConfirmedAt}
          expiresAt={opportunity.freshnessExpiresAt}
          onChange={(status, reason) => act('availability', () => sharedVerificationApi.availability(id, status, reason), 'Could not update availability')}
        />
      </PanelCard>

      <PanelCard title={`Pending resident revisions (${view.pendingRevisions.length})`} icon={FileClock}>
        {view.pendingRevisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No pending changes from the resident.</p>
        ) : (
          <ul className="space-y-3">
            {view.pendingRevisions.map((revision) => (
              <RevisionReviewCard key={revision.id} revision={revision} showTargetLink={false} onDecided={() => load()} />
            ))}
          </ul>
        )}
      </PanelCard>

      <ReasonDialog
        isOpen={dialog === 'correction'}
        title="Request correction from the resident"
        description="The resident is notified and the opportunity moves to Needs correction."
        label="What must the resident correct?"
        confirmLabel="Send correction request"
        maxLength={2000}
        onClose={() => setDialog(null)}
        onConfirm={(notes) => act('correction', () => sharedVerificationApi.requestCorrection(id, notes), 'Could not request correction')}
      />
      <ReasonDialog
        isOpen={dialog === 'suspend'}
        title="Suspend this opportunity"
        description="Use when legitimate authority to share is disputed. The opportunity is hidden immediately and the resident is notified (§6.4)."
        label="Reason for suspension"
        confirmLabel="Suspend"
        tone="danger"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('suspend', () => sharedVerificationApi.suspend(id, reason), 'Could not suspend the opportunity')}
      />
      <Modal isOpen={dialog === 'publish'} onClose={() => busy === null && setDialog(null)} title={opportunity.reverificationRequired ? 'Re-verify and publish' : 'Publish Shared Property'} size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Publishing makes the opportunity public and Available. Every gate — identity, occupancy evidence, permission declaration, location,
            street link, record and media — is checked server-side.
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
