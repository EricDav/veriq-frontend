'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  Copy,
  FileClock,
  FileText,
  Home,
  Image as ImageIcon,
  MapPin,
  Play,
  Rocket,
  Send,
  ShieldAlert,
  UserCheck,
} from 'lucide-react';
import type {
  ChecklistItemStatus,
  ListingRevision,
  OperatorIdentityStatus,
  SchemaAnswers,
  SchemaCatalogue,
  SchemaIssue,
  VerificationChecklistKey,
  VerificationEvidence,
  VerificationWorkspace,
  WorkspaceUnit,
} from '@/types/agent';
import { VERIFICATION_CHECKLIST_KEYS } from '@/types/agent';
import { UserRole } from '@/types';
import { schemasApi, unitAvailabilityApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { AnswersView } from '@/components/agent/AnswersView';
import { AnswersEditor } from '@/components/agent/AnswersEditor';
import { UnitAvailabilityControl } from '@/components/agent/AvailabilityPanel';
import { BlockersList } from '@/components/agent/BlockersList';
import { ChecklistPanel } from '@/components/agent/ChecklistPanel';
import { EvidenceList } from '@/components/agent/EvidenceList';
import { IdentityDecisionForm } from '@/components/agent/IdentityDecisionForm';
import { LocationVerifier } from '@/components/agent/LocationVerifier';
import { MediaReviewPanel } from '@/components/agent/MediaReviewPanel';
import { NotApplicableRequests } from '@/components/agent/NotApplicableRequests';
import { ReasonDialog } from '@/components/agent/ReasonDialog';
import { StreetIntelligencePanel } from '@/components/agent/StreetIntelligencePanel';
import {
  CASE_STATUS_TONES,
  CATEGORY_LABELS,
  IDENTITY_STATUS_LABELS,
  IDENTITY_STATUS_TONES,
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

const OPEN_CASE = ['pending', 'in_progress', 'needs_correction', 'ready_to_publish'];

const SECTIONS = [
  { id: 'readiness', label: 'Readiness' },
  { id: 'operator', label: 'Operator' },
  { id: 'checklist', label: 'Checklist' },
  { id: 'duplicates', label: 'Duplicates' },
  { id: 'location', label: 'Location' },
  { id: 'street', label: 'Street' },
  { id: 'record', label: 'Record' },
  { id: 'units', label: 'Units' },
  { id: 'media', label: 'Media' },
  { id: 'evidence', label: 'Evidence' },
  { id: 'revisions', label: 'Revisions' },
];

const issuesFrom = (details: unknown[]): SchemaIssue[] =>
  details.filter((item): item is SchemaIssue => typeof item === 'object' && item !== null && 'path' in item && 'message' in item);

function OperatorIdentityCard({
  workspace,
  onDecide,
}: {
  workspace: VerificationWorkspace;
  onDecide: (status: OperatorIdentityStatus, note: string) => Promise<boolean>;
}) {
  const operator = workspace.operator;

  if (!operator) {
    return <p className="text-sm text-muted-foreground">This Property has no Property Operator (Agent-created record). Identity checks do not apply.</p>;
  }
  return (
    <div className="space-y-4">
      <dl className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <KeyValue label="Operator" value={operator.name || '—'} />
        <KeyValue label="Type" value={humanize(operator.operatorType)} />
        <KeyValue label="Phone" value={operator.phone ? <a className="text-primary hover:underline" href={`tel:${operator.phone}`}>{operator.phone}</a> : '—'} />
      </dl>
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">Identity status:</span>
        <StatusPill value={operator.identityStatus} tones={IDENTITY_STATUS_TONES} label={IDENTITY_STATUS_LABELS[operator.identityStatus]} />
      </div>
      <IdentityDecisionForm onDecide={onDecide} />
    </div>
  );
}

function DuplicatesCard({
  workspace,
  disabled,
  onResolve,
}: {
  workspace: VerificationWorkspace;
  disabled: boolean;
  onResolve: (decision: 'not_duplicate' | 'duplicate', note: string, duplicateOfId?: string) => Promise<boolean>;
}) {
  const { case: verificationCase } = workspace;
  const [decision, setDecision] = useState<'not_duplicate' | 'duplicate' | ''>('');
  const [duplicateOfId, setDuplicateOfId] = useState('');
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);

  const candidates = verificationCase.duplicateCandidates;
  const submit = async () => {
    if (!decision) return;
    setBusy(true);
    const ok = await onResolve(decision, note.trim(), decision === 'duplicate' ? duplicateOfId : undefined);
    setBusy(false);
    if (ok) {
      setConfirming(false);
      setDecision('');
      setNote('');
      setDuplicateOfId('');
    }
  };

  return (
    <div className="space-y-3">
      {candidates.length === 0 ? (
        <p className="text-sm text-muted-foreground">No probable duplicate Properties were detected for this location.</p>
      ) : (
        <ul className="space-y-2">
          {candidates.map((candidate) => (
            <li key={candidate.targetId} className="rounded-xl border border-[#ffffff10] p-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-mono text-xs text-foreground">{candidate.targetId}</p>
                <span className="badge bg-[#ffffff0f] !px-2 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">Score {Math.round(candidate.score * 100) / 100}</span>
              </div>
              {candidate.reasons.length > 0 && <p className="mt-1 text-xs text-muted-foreground">{candidate.reasons.map(humanize).join(' · ')}</p>}
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs">
        Status:{' '}
        <strong className={verificationCase.duplicateResolved ? 'text-[#6ee7b7]' : 'text-[#fcd34d]'}>
          {verificationCase.duplicateResolved ? 'Resolved' : 'Unresolved — reconcile before publication'}
        </strong>
      </p>
      {!disabled && candidates.length > 0 && (
        <div className="space-y-3 rounded-xl border border-[#ffffff10] p-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Decision">
              <select className="input !py-2 text-sm" value={decision} onChange={(event) => setDecision(event.target.value as typeof decision)}>
                <option value="">Select…</option>
                <option value="not_duplicate">Not a duplicate — distinct physical Property</option>
                <option value="duplicate">Duplicate of an existing canonical Property</option>
              </select>
            </Field>
            {decision === 'duplicate' && (
              <Field label="Canonical Property">
                <select className="input !py-2 text-sm" value={duplicateOfId} onChange={(event) => setDuplicateOfId(event.target.value)}>
                  <option value="">Select candidate…</option>
                  {candidates.map((candidate) => (
                    <option key={candidate.targetId} value={candidate.targetId}>
                      {candidate.targetId}
                    </option>
                  ))}
                </select>
              </Field>
            )}
          </div>
          <Field label="Reconciliation note">
            <textarea className="input resize-none !py-2 text-sm" rows={2} maxLength={1000} value={note} onChange={(event) => setNote(event.target.value)} />
          </Field>
          <div className="flex justify-end">
            <button
              type="button"
              className={decision === 'duplicate' ? smallDangerButton : smallPrimaryButton}
              disabled={busy || !decision || note.trim().length < 3 || (decision === 'duplicate' && !duplicateOfId)}
              onClick={() => (decision === 'duplicate' ? setConfirming(true) : submit())}
            >
              {busy ? <LoadingSpinner size="sm" /> : <Copy className="h-3.5 w-3.5" />} Record decision
            </button>
          </div>
        </div>
      )}
      <Modal isOpen={confirming} onClose={() => !busy && setConfirming(false)} title="Reconcile as duplicate" size="sm">
        <p className="mb-5 text-sm text-muted-foreground">
          This submission will be archived as a duplicate of <span className="font-mono">{duplicateOfId}</span> and this verification case closes. The
          canonical Property keeps its ID and history (§4.5).
        </p>
        <div className="flex justify-end gap-2">
          <button type="button" className={smallButton} onClick={() => setConfirming(false)} disabled={busy}>
            Cancel
          </button>
          <button type="button" className={smallDangerButton} onClick={submit} disabled={busy}>
            {busy && <LoadingSpinner size="sm" />} Archive as duplicate
          </button>
        </div>
      </Modal>
    </div>
  );
}

function UnitCard({
  unit,
  category,
  catalogue,
  onCorrect,
  onVerify,
  onAvailability,
  onReconfirm,
  onMediaChanged,
}: {
  unit: WorkspaceUnit;
  category: string;
  catalogue: SchemaCatalogue | null;
  onCorrect: (unit: WorkspaceUnit, input: { displayLabel?: string; subtype?: string; answers?: SchemaAnswers }) => Promise<SchemaIssue[] | null>;
  onVerify: (unit: WorkspaceUnit) => Promise<boolean>;
  onAvailability: (unit: WorkspaceUnit, status: 'available' | 'unavailable', reason?: string) => Promise<boolean>;
  onReconfirm: (unit: WorkspaceUnit) => Promise<boolean>;
  onMediaChanged: () => void;
}) {
  const [tab, setTab] = useState<'record' | 'edit' | 'media' | 'availability'>('record');
  const [label, setLabel] = useState(unit.displayLabel);
  const [subtype, setSubtype] = useState(unit.subtype ?? '');
  const [savingMeta, setSavingMeta] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const subtypeOptions = catalogue?.categories.find((entry) => entry.category === category)?.subtypes.filter((entry) => entry.level === 'unit') ?? [];
  const unitAnswers = useMemo<SchemaAnswers>(
    () => ({ facts: unit.facts, commercial: unit.commercialTerms, intelligence: unit.intelligence }),
    [unit.facts, unit.commercialTerms, unit.intelligence],
  );

  return (
    <div className="rounded-2xl border border-[#ffffff10]">
      <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{unit.displayLabel}</p>
          <p className="text-xs text-muted-foreground">
            {unit.unitType}
            {unit.subtype ? ` · ${humanize(unit.subtype)}` : ''}
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            <span className={`badge !px-2 !py-0.5 text-[11px] ${unit.verificationStatus === 'verified' ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#fbbf2410] text-[#fcd34d]'}`}>
              {humanize(unit.verificationStatus)}
            </span>
            <span className={`badge !px-2 !py-0.5 text-[11px] ${unit.availabilityStatus === 'available' ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#ffffff0f] text-muted-foreground'}`}>
              {humanize(unit.availabilityStatus)}
            </span>
            {unit.issues.length > 0 && <span className="badge bg-[#fb718510] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">{unit.issues.length} incomplete field{unit.issues.length === 1 ? '' : 's'}</span>}
            {unit.media && !unit.media.complete && <span className="badge bg-[#fb718510] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Media incomplete</span>}
          </div>
        </div>
        {unit.verificationStatus !== 'verified' && (
          <button
            type="button"
            className={smallPrimaryButton}
            disabled={verifying}
            onClick={async () => {
              setVerifying(true);
              await onVerify(unit);
              setVerifying(false);
            }}
          >
            {verifying ? <LoadingSpinner size="sm" /> : <BadgeCheck className="h-3.5 w-3.5" />} Verify unit
          </button>
        )}
      </div>
      <div className="flex gap-1 overflow-x-auto border-t border-[#ffffff10] px-2">
        {(['record', 'edit', 'media', 'availability'] as const).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`whitespace-nowrap border-b-2 px-3 py-2 text-xs font-semibold ${tab === key ? 'border-primary text-foreground' : 'border-transparent text-muted-foreground hover:text-foreground'}`}
          >
            {key === 'record' ? 'Record' : key === 'edit' ? 'Correct' : key === 'media' ? 'Media' : 'Availability'}
          </button>
        ))}
      </div>
      <div className="p-4">
        {tab === 'record' && <AnswersView schemaId={unit.schemaId} answers={unitAnswers} issues={unit.issues} />}
        {tab === 'edit' && (
          <div className="space-y-5">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
              <Field label="Display label">
                <input className="input !py-2 text-sm" maxLength={160} value={label} onChange={(event) => setLabel(event.target.value)} />
              </Field>
              <Field label="Subtype" hint="Changing the subtype removes answers that do not belong to it (kept in audit history).">
                <select className="input !py-2 text-sm" value={subtype} onChange={(event) => setSubtype(event.target.value)}>
                  {subtypeOptions.length === 0 && <option value={unit.subtype ?? ''}>{humanize(unit.subtype)}</option>}
                  {subtypeOptions.map((option) => (
                    <option key={option.id} value={option.subtype ?? ''}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>
              <button
                type="button"
                className={smallButton}
                disabled={savingMeta || (label.trim() === unit.displayLabel && subtype === (unit.subtype ?? '')) || !label.trim()}
                onClick={async () => {
                  setSavingMeta(true);
                  await onCorrect(unit, {
                    ...(label.trim() !== unit.displayLabel ? { displayLabel: label.trim() } : {}),
                    ...(subtype !== (unit.subtype ?? '') ? { subtype } : {}),
                  });
                  setSavingMeta(false);
                }}
              >
                {savingMeta && <LoadingSpinner size="sm" />} Save label / subtype
              </button>
            </div>
            <AnswersEditor
              key={`${unit.schemaId}-${unit.updatedAt}`}
              schemaId={unit.schemaId}
              initial={unitAnswers}
              groups={['facts', 'commercial', 'intelligence']}
              onSave={(answers) => onCorrect(unit, { answers })}
            />
          </div>
        )}
        {tab === 'media' && <MediaReviewPanel ownerType="unit" ownerId={unit.id} onChanged={onMediaChanged} />}
        {tab === 'availability' && (
          <UnitAvailabilityControl
            status={unit.availabilityStatus}
            changedAt={unit.availabilityChangedAt}
            confirmedAt={unit.availabilityConfirmedAt}
            expiresAt={unit.freshnessExpiresAt}
            availableLabel={category === 'short_let' ? 'Available Now' : 'Available'}
            onChange={(status, reason) => onAvailability(unit, status, reason)}
            onReconfirm={() => onReconfirm(unit)}
          />
        )}
      </div>
    </div>
  );
}

export default function VerificationWorkspacePage() {
  const params = useParams<{ caseId: string }>();
  const caseId = params.caseId;
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [workspace, setWorkspace] = useState<VerificationWorkspace | null>(null);
  const [loadError, setLoadError] = useState('');
  const [catalogue, setCatalogue] = useState<SchemaCatalogue | null>(null);
  const [evidence, setEvidence] = useState<VerificationEvidence[] | null>(null);
  const [evidenceError, setEvidenceError] = useState('');
  const [revisions, setRevisions] = useState<ListingRevision[] | null>(null);
  const [publishBlockers, setPublishBlockers] = useState<unknown[] | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [dialog, setDialog] = useState<'correction' | 'escalate' | 'publish' | null>(null);
  const [titleDraft, setTitleDraft] = useState('');
  const [unitCountDraft, setUnitCountDraft] = useState('');

  const load = useCallback(async () => {
    setLoadError('');
    try {
      const res = await verificationApi.workspace(caseId);
      setWorkspace(res.data);
      setTitleDraft(res.data.property.title);
      setUnitCountDraft(res.data.property.knownUnitCount?.toString() ?? '');
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load the verification workspace'));
    }
  }, [caseId]);

  const propertyId = workspace?.property.id;

  const loadSecondary = useCallback(async () => {
    if (!propertyId) return;
    setEvidenceError('');
    const [evidenceRes, revisionRes] = await Promise.allSettled([
      verificationApi.propertyEvidence(propertyId),
      verificationApi.propertyRevisions(propertyId),
    ]);
    if (evidenceRes.status === 'fulfilled') setEvidence(evidenceRes.value.data);
    else setEvidenceError(errorMessage(evidenceRes.reason, 'Could not load evidence'));
    setRevisions(revisionRes.status === 'fulfilled' ? revisionRes.value.data : []);
  }, [propertyId]);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  useEffect(() => {
    loadSecondary();
  }, [loadSecondary]);

  useEffect(() => {
    schemasApi
      .catalogue()
      .then((res) => setCatalogue(res.data))
      .catch(() => setCatalogue(null));
  }, []);

  const act = useCallback(
    async (key: string, action: () => Promise<{ message?: string }>, fallback: string, options: { reload?: boolean } = {}) => {
      setBusy(key);
      try {
        const res = await action();
        success(res.message || 'Saved');
        if (options.reload !== false) await load();
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

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="The verification workspace is available to Veriq Agents only." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Verification workspace" backHref="/dashboard/agent/verification" backLabel="Verification queue" />
        <ErrorBlock message={loadError} onRetry={load} />
      </div>
    );
  }
  if (!workspace) return <PageLoader />;

  const { case: verificationCase, property, readiness } = workspace;
  const caseOpen = OPEN_CASE.includes(verificationCase.status);
  const canStart = ['pending', 'needs_correction'].includes(verificationCase.status);
  const canMarkReady = verificationCase.status === 'in_progress';
  const canPublish = ['ready_to_publish', 'verification_in_progress'].includes(property.publicationStatus);
  const propertySchemaId = workspace.propertyMedia ? `${property.category}.property` : null;
  const checklistKeys = VERIFICATION_CHECKLIST_KEYS;

  const updateChecklist = async (key: VerificationChecklistKey, status: ChecklistItemStatus, note?: string) =>
    act(`check-${key}`, () => verificationApi.updateChecklist(verificationCase.id, key, status, note), 'Could not update the checklist');

  const publish = async () => {
    setBusy('publish');
    setPublishBlockers(null);
    try {
      const res = await verificationApi.publish(property.id);
      success(res.message || 'Property published');
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

  const correctUnit = async (unit: WorkspaceUnit, input: { displayLabel?: string; subtype?: string; answers?: SchemaAnswers }) => {
    setBusy(`unit-${unit.id}`);
    try {
      const res = await verificationApi.correctUnit(unit.id, {
        ...(input.displayLabel ? { displayLabel: input.displayLabel } : {}),
        ...(input.subtype ? { subtype: input.subtype } : {}),
        ...(input.answers?.facts ? { facts: input.answers.facts } : {}),
        ...(input.answers?.commercial ? { commercial: input.answers.commercial } : {}),
        ...(input.answers?.intelligence ? { intelligence: input.answers.intelligence } : {}),
      });
      const removed = res.data.removedAnswers ?? [];
      success(removed.length ? `${res.message}. ${removed.length} answer(s) no longer apply and were removed.` : res.message || 'Unit corrected');
      await load();
      return null;
    } catch (err) {
      const { message, details } = describeError(err, 'Could not correct the unit');
      toastError(message);
      return issuesFrom(details);
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mx-auto max-w-6xl space-y-5">
      <PageHeader
        title={property.title}
        backHref="/dashboard/agent/verification"
        backLabel="Verification queue"
        subtitle={`${CATEGORY_LABELS[property.category] ?? property.category} · ${property.area}, ${property.city}, ${property.state} · Property ID ${property.id}`}
        badges={
          <>
            <StatusPill value={verificationCase.status} tones={CASE_STATUS_TONES} label={`Case: ${humanize(verificationCase.status)}`} />
            <StatusPill value={property.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
            {verificationCase.isReverification && <span className="badge bg-[#ffffff06] !px-2.5 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">Re-verification</span>}
            {verificationCase.escalated && <span className="badge bg-[#fb718518] !px-2.5 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Escalated</span>}
            {property.sensitiveChangesFrozen && <span className="badge bg-[#fb718510] !px-2.5 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">Dispute freeze</span>}
          </>
        }
        actions={
          <>
            {canStart && (
              <button type="button" className={smallPrimaryButton} disabled={busy !== null} onClick={() => act('start', () => verificationApi.start(verificationCase.id), 'Could not start verification')}>
                {busy === 'start' ? <LoadingSpinner size="sm" /> : <Play className="h-3.5 w-3.5" />} Start verification
              </button>
            )}
            {['pending', 'in_progress', 'ready_to_publish'].includes(verificationCase.status) && (
              <button type="button" className={smallButton} disabled={busy !== null} onClick={() => setDialog('correction')}>
                <Send className="h-3.5 w-3.5" /> Request correction
              </button>
            )}
            {caseOpen && !verificationCase.escalated && (
              <button type="button" className={smallDangerButton} disabled={busy !== null} onClick={() => setDialog('escalate')}>
                <ShieldAlert className="h-3.5 w-3.5" /> Escalate
              </button>
            )}
            {canMarkReady && (
              <button type="button" className={smallButton} disabled={busy !== null} onClick={() => act('ready', () => verificationApi.markReady(verificationCase.id), 'Not ready to publish')}>
                {busy === 'ready' ? <LoadingSpinner size="sm" /> : <BadgeCheck className="h-3.5 w-3.5" />} Mark ready
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

      <nav className="sticky top-0 z-10 -mx-4 overflow-x-auto border-y border-[#ffffff10] bg-[#111827f2] px-4 py-2 backdrop-blur sm:mx-0 sm:rounded-xl sm:border">
        <ul className="flex gap-1">
          {SECTIONS.map((section) => (
            <li key={section.id}>
              <a href={`#${section.id}`} className="block whitespace-nowrap rounded-lg px-2.5 py-1 text-xs font-semibold text-muted-foreground hover:bg-[#ffffff0f] hover:text-foreground">
                {section.label}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      {verificationCase.correctionNotes && verificationCase.status === 'needs_correction' && (
        <InlineNotice tone="warning">
          <strong>Correction requested:</strong> {verificationCase.correctionNotes}
        </InlineNotice>
      )}
      {verificationCase.escalated && (
        <InlineNotice tone="danger">
          <strong>Escalated to Admin:</strong> {verificationCase.escalationReason ?? 'No reason recorded'}. Publication is blocked until Admin clears the escalation.
        </InlineNotice>
      )}
      {!caseOpen && (
        <InlineNotice tone="info">
          This case is {humanize(verificationCase.status).toLowerCase()}
          {verificationCase.closedAt ? ` (closed ${formatDateTime(verificationCase.closedAt)})` : ''}. Checklist and case actions are locked.
        </InlineNotice>
      )}

      <PanelCard id="readiness" title="Publication readiness" icon={Rocket} subtitle="Every gate is enforced server-side; blockers update after each change.">
        <div className="space-y-3">
          {publishBlockers && publishBlockers.length > 0 && <BlockersList title="Publish was blocked" blockers={publishBlockers} />}
          <BlockersList blockers={readiness.blockers} />
        </div>
      </PanelCard>

      <PanelCard id="operator" title="Operator identity" icon={UserCheck}>
        <OperatorIdentityCard
          workspace={workspace}
          onDecide={(status, note) =>
            workspace.operator
              ? act('identity', () => verificationApi.setOperatorIdentity(workspace.operator!.id, status, note), 'Could not update the identity status')
              : Promise.resolve(false)
          }
        />
      </PanelCard>

      <PanelCard id="checklist" title="Verification checklist" icon={ClipboardList} subtitle="Record findings for each verification task (§8.2).">
        <ChecklistPanel keys={checklistKeys} checklist={verificationCase.checklist} disabled={!caseOpen} onUpdate={updateChecklist} />
      </PanelCard>

      <PanelCard id="duplicates" title="Duplicate reconciliation" icon={Copy} subtitle="Probable duplicates are reconciled, never published as a second canonical record (§4.5).">
        <DuplicatesCard
          workspace={workspace}
          disabled={!caseOpen}
          onResolve={(decision, note, duplicateOfId) =>
            act('duplicates', () => verificationApi.resolveDuplicates(verificationCase.id, { decision, note, ...(duplicateOfId ? { duplicateOfId } : {}) }), 'Could not record the duplicate decision')
          }
        />
      </PanelCard>

      <PanelCard id="location" title="Location verification" icon={MapPin} subtitle="Confirm the exact address and coordinates; changing them re-checks duplicates.">
        <LocationVerifier
          key={JSON.stringify(property.verifiedAddress ?? {})}
          submitted={property.submittedAddress}
          verified={property.verifiedAddress}
          onSubmit={(input) =>
            act('location', () => verificationApi.verifyLocation(property.id, { address: input.address, latitude: input.latitude, longitude: input.longitude, ...(input.landmark ? { landmark: input.landmark } : {}) }), 'Could not save the verified location')
          }
        />
      </PanelCard>

      <PanelCard id="street" title="Street Intelligence" icon={MapPin} subtitle="All Units use the parent Property's link (§24.3).">
        <StreetIntelligencePanel
          targetType="property"
          targetId={property.id}
          location={{ localGovernmentId: property.localGovernmentId, areaId: property.areaId, state: property.state, city: property.city }}
          onChanged={load}
        />
      </PanelCard>

      <PanelCard id="record" title="Property record" icon={Building2} subtitle="Correct property-level facts and structured intelligence. Corrections are audited (F.1).">
        <div className="space-y-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-[1fr_180px_auto] sm:items-end">
            <Field label="Title">
              <input className="input !py-2 text-sm" maxLength={300} value={titleDraft} onChange={(event) => setTitleDraft(event.target.value)} />
            </Field>
            <Field label="Known unit count">
              <input className="input !py-2 text-sm" type="number" min={1} value={unitCountDraft} onChange={(event) => setUnitCountDraft(event.target.value)} />
            </Field>
            <button
              type="button"
              className={smallButton}
              disabled={
                busy !== null ||
                !propertySchemaId ||
                titleDraft.trim().length < 3 ||
                (titleDraft.trim() === property.title && unitCountDraft === (property.knownUnitCount?.toString() ?? ''))
              }
              onClick={() =>
                act(
                  'record-meta',
                  () =>
                    verificationApi.correctProperty(property.id, {
                      ...(titleDraft.trim() !== property.title ? { title: titleDraft.trim() } : {}),
                      ...(unitCountDraft !== '' && Number(unitCountDraft) >= 1 ? { knownUnitCount: Math.trunc(Number(unitCountDraft)) } : {}),
                    }),
                  'Could not update the property record',
                )
              }
            >
              {busy === 'record-meta' && <LoadingSpinner size="sm" />} Save title / count
            </button>
          </div>
          {propertySchemaId ? (
            <>
              <AnswersView
                schemaId={propertySchemaId}
                answers={{ facts: property.propertyFacts, intelligence: property.propertyIntelligence }}
                groups={['facts', 'intelligence']}
                issues={workspace.propertyIssues}
              />
              <details className="rounded-xl border border-[#ffffff10] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-foreground">Correct facts &amp; intelligence</summary>
                <div className="mt-4">
                  <AnswersEditor
                    key={property.updatedAt}
                    schemaId={propertySchemaId}
                    initial={{ facts: property.propertyFacts, intelligence: property.propertyIntelligence }}
                    groups={['facts', 'intelligence']}
                    onSave={async (answers) => {
                      setBusy('record');
                      try {
                        const res = await verificationApi.correctProperty(property.id, { facts: answers.facts, intelligence: answers.intelligence });
                        success(res.message || 'Property record corrected');
                        await load();
                        return null;
                      } catch (err) {
                        const { message, details } = describeError(err, 'Could not correct the property record');
                        toastError(message);
                        return issuesFrom(details);
                      } finally {
                        setBusy(null);
                      }
                    }}
                  />
                </div>
              </details>
            </>
          ) : (
            <p className="text-sm text-muted-foreground">This category has no property-level schema.</p>
          )}
        </div>
      </PanelCard>

      <PanelCard id="units" title={`Units (${workspace.units.length})`} icon={Home} subtitle="A Unit becomes verified only with complete subtype facts, intelligence and media (G.9).">
        {workspace.units.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Units have been documented for this Property.</p>
        ) : (
          <div className="space-y-4">
            {workspace.units.map((unit) => (
              <UnitCard
                key={unit.id}
                unit={unit}
                category={property.category}
                catalogue={catalogue}
                onCorrect={correctUnit}
                onVerify={(target) => act(`verify-${target.id}`, () => verificationApi.verifyUnit(target.id), 'Unit cannot be verified yet')}
                onAvailability={(target, status, reason) => act(`avail-${target.id}`, () => unitAvailabilityApi.change(target.id, status, reason), 'Could not update availability')}
                onReconfirm={(target) => act(`reconfirm-${target.id}`, () => unitAvailabilityApi.reconfirm(target.id), 'Could not reconfirm availability')}
                onMediaChanged={load}
              />
            ))}
          </div>
        )}
      </PanelCard>

      <PanelCard id="media" title="Property media" icon={ImageIcon} subtitle="Property-level sections and the single public cover. Unit media is reviewed on each Unit.">
        <div className="space-y-5">
          {workspace.propertyMedia ? <MediaReviewPanel ownerType="property" ownerId={property.id} onChanged={load} /> : <p className="text-sm text-muted-foreground">This category has no property-level media schema.</p>}
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Operator Not Applicable requests</p>
            <NotApplicableRequests listingTitle={property.title} onChanged={load} />
          </div>
        </div>
      </PanelCard>

      <PanelCard id="evidence" title="Authority & verification evidence" icon={FileText}>
        {evidenceError ? <ErrorBlock message={evidenceError} onRetry={loadSecondary} /> : evidence ? <EvidenceList items={evidence} /> : <p className="text-sm text-muted-foreground">Loading evidence…</p>}
      </PanelCard>

      <PanelCard
        id="revisions"
        title="Revision history"
        icon={FileClock}
        actions={
          <Link href="/dashboard/agent/revisions" className={smallButton}>
            Review pending revisions
          </Link>
        }
      >
        {!revisions ? (
          <p className="text-sm text-muted-foreground">Loading revisions…</p>
        ) : revisions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No Operator revisions for this Property.</p>
        ) : (
          <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
            {revisions.map((revision) => (
              <li key={revision.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2 text-xs">
                <span className="text-foreground">
                  {humanize(revision.kind)} · {humanize(revision.targetType)}
                  {revision.message ? ` · “${revision.message}”` : ''}
                </span>
                <span className="flex items-center gap-2 text-muted-foreground">
                  <span className={`badge !px-2 !py-0.5 text-[10px] ${revision.status === 'pending' ? 'bg-[#fbbf2410] text-[#fcd34d]' : revision.status === 'approved' ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#ffffff0f] text-muted-foreground'}`}>
                    {humanize(revision.status)}
                  </span>
                  {formatDateTime(revision.createdAt)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <ReasonDialog
        isOpen={dialog === 'correction'}
        title="Request correction from the Operator"
        description="The Operator is notified with these notes and the case moves to Needs correction. A published Property stays published."
        label="What must the Operator correct?"
        confirmLabel="Send correction request"
        maxLength={2000}
        onClose={() => setDialog(null)}
        onConfirm={(notes) => act('correction', () => verificationApi.requestCorrection(verificationCase.id, notes), 'Could not request correction')}
      />
      <ReasonDialog
        isOpen={dialog === 'escalate'}
        title="Escalate to Admin"
        description="Use for risk, dispute or authority concerns. Publication is blocked until Admin clears the escalation."
        label="Reason for escalation"
        confirmLabel="Escalate"
        tone="danger"
        onClose={() => setDialog(null)}
        onConfirm={(reason) => act('escalate', () => verificationApi.escalate(verificationCase.id, reason), 'Could not escalate the case')}
      />
      <Modal isOpen={dialog === 'publish'} onClose={() => busy === null && setDialog(null)} title="Publish Property" size="sm">
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            You are publishing directly under your publishing permission (§8.3). The Operator is notified and verified Units become discoverable.
          </p>
          {readiness.blockers.length > 0 && <BlockersList title="Current blockers" blockers={readiness.blockers} compact />}
          <div className="flex justify-end gap-2">
            <button type="button" className={smallButton} onClick={() => setDialog(null)} disabled={busy !== null}>
              Cancel
            </button>
            <button type="button" className={smallPrimaryButton} onClick={publish} disabled={busy !== null}>
              {busy === 'publish' ? <LoadingSpinner size="sm" /> : <Rocket className="h-3.5 w-3.5" />} Publish now
            </button>
          </div>
          {readiness.blockers.length > 0 && (
            <p className="flex items-start gap-1.5 text-[11px] text-[#fcd34d]">
              <AlertTriangle className="mt-0.5 h-3 w-3 flex-shrink-0" /> Publication will be refused while blockers remain.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
