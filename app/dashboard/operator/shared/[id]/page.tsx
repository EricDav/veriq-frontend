'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Camera, FileLock2, MapPin, Send, ShieldCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { sharedPropertiesApi } from '@/lib/api/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import {
  AvailabilityControl,
  CASE_STATUS_META,
  ContactFields,
  EMPTY_CONTACT,
  EvidenceUploader,
  IssueList,
  MediaChecklist,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  RevisionList,
  SHARED_EVIDENCE_KINDS,
  SHARED_TYPE_LABELS,
  SchemaTabs,
  SectionCard,
  StatusBadge,
  StatusTimeline,
  VERIFICATION_STATUS_META,
  answersEqual,
  errorMessage,
  formatDateTime,
  parseApiError,
  stripHiddenAnswers,
  toContactInput,
  useSchema,
  withClearedKeys,
  type ContactValue,
} from '@/components/listing-forms';
import { ListingDeclarationPanel, useListingDeclaration } from '@/components/listing-forms';
import type {
  EvidenceRecord,
  PublicationStatus,
  SchemaAnswers,
  SchemaIssue,
  SharedManagerData,
  UnitAvailabilityStatus,
} from '@/types/operator';

const EDITABLE: PublicationStatus[] = ['draft', 'needs_correction'];
const LIVE: PublicationStatus[] = ['published', 'ready_to_publish', 'suspended'];

function SharedOpportunityManager() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const [data, setData] = useState<SharedManagerData | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [evidence, setEvidence] = useState<EvidenceRecord[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; issues: SchemaIssue[] } | null>(null);
  const declaration = useListingDeclaration();

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await sharedPropertiesApi.manage(id);
      setData(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load this opportunity'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    setLoading(true);
    void load();
  }, [load]);

  const opportunity = data?.opportunity;
  const original = useMemo<SchemaAnswers>(
    () => ({
      facts: opportunity?.facts ?? {},
      commercial: opportunity?.commercialTerms ?? {},
      intelligence: opportunity?.intelligence ?? {},
    }),
    [opportunity?.facts, opportunity?.commercialTerms, opportunity?.intelligence],
  );
  const [answers, setAnswers] = useState<SchemaAnswers>(original);
  const [displayLabel, setDisplayLabel] = useState(opportunity?.displayLabel ?? '');
  const [message, setMessage] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveIssues, setSaveIssues] = useState<SchemaIssue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [editingContact, setEditingContact] = useState(false);
  const [contactIssues, setContactIssues] = useState<SchemaIssue[]>([]);
  const [savingContact, setSavingContact] = useState(false);

  const resetDetails = useCallback(() => {
    setAnswers(original);
    setDisplayLabel(opportunity?.displayLabel ?? '');
    setMessage('');
    setSaveIssues([]);
    setSaveError(null);
  }, [original, opportunity?.displayLabel]);

  useEffect(() => {
    resetDetails();
    setRequesting(false);
  }, [resetDetails]);

  const { schema, loading: schemaLoading, error: schemaError, reload: reloadSchema } = useSchema(opportunity?.schemaId ?? null);

  if (loading) return <PageLoader />;
  if (loadError || !data || !opportunity) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/dashboard/operator/shared" className="inline-flex items-center gap-1.5 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> Shared Property</Link>
        <Notice tone="error" title="Opportunity unavailable">
          <p>{loadError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={() => { setLoading(true); void load(); }}>Try again</button>
        </Notice>
      </div>
    );
  }

  const status = opportunity.publicationStatus;
  const publication = PUBLICATION_STATUS_META[status];
  const verification = VERIFICATION_STATUS_META[opportunity.verificationStatus];
  const live = LIVE.includes(status);
  const direct = EDITABLE.includes(status);
  const editable = direct || (live && requesting);
  const canSubmit = direct;
  const hasOccupancy = evidence.some((record) => record.kind === 'occupancy');

  const factsChanged = !answersEqual(original.facts, answers.facts);
  const intelligenceChanged = !answersEqual(original.intelligence, answers.intelligence);
  const commercialChanged = !answersEqual(original.commercial, answers.commercial);
  const labelChanged = displayLabel.trim() !== opportunity.displayLabel;
  const dirty = factsChanged || intelligenceChanged || commercialChanged || labelChanged;

  const saveDetails = async () => {
    setSaveIssues([]);
    setSaveError(null);
    const trimmed = displayLabel.trim();
    if (labelChanged && (trimmed.length < 3 || trimmed.length > 160)) {
      setSaveIssues([{ path: 'displayLabel', message: 'Enter a short title (3–160 characters)' }]);
      return;
    }
    setSaving(true);
    try {
      const response = await sharedPropertiesApi.update(opportunity.id, {
        ...(labelChanged ? { displayLabel: trimmed } : {}),
        ...(factsChanged ? { facts: withClearedKeys(original.facts, stripHiddenAnswers(answers.facts)) } : {}),
        ...(intelligenceChanged ? { intelligence: withClearedKeys(original.intelligence, stripHiddenAnswers(answers.intelligence)) } : {}),
        ...(commercialChanged ? { commercial: withClearedKeys(original.commercial, stripHiddenAnswers(answers.commercial)) } : {}),
        ...(live && message.trim() ? { message: message.trim() } : {}),
      });
      success(response.message);
      setRequesting(false);
      setData(response.data.opportunity);
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to save your changes');
      setSaveIssues(parsed.issues);
      setSaveError(parsed.message);
      toastError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const saveContact = async () => {
    const { contact: input, issues } = toContactInput(contact);
    setContactIssues(issues);
    if (!input) return;
    setSavingContact(true);
    try {
      const response = await sharedPropertiesApi.update(opportunity.id, {
        contactName: input.name,
        contactPhone: input.phone,
        ...(input.whatsappPhone ? { contactWhatsappPhone: input.whatsappPhone } : {}),
      });
      success('Contact updated');
      setEditingContact(false);
      setData(response.data.opportunity);
    } catch (caught) {
      toastError(errorMessage(caught, 'Unable to update the contact'));
    } finally {
      setSavingContact(false);
    }
  };

  const submit = async () => {
    if (!declaration.payload) {
      setSubmitError({ message: 'Accept the Veriq listing declaration to submit', issues: [] });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await sharedPropertiesApi.submit(opportunity.id, declaration.payload);
      setData(response.data);
      success(response.message || 'Submitted for verification');
      declaration.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to submit this opportunity');
      setSubmitError({ message: parsed.message, issues: parsed.issues });
      toastError(parsed.message);
    } finally {
      setSubmitting(false);
    }
  };

  const displayIssues = submitError?.issues.length ? submitError.issues : opportunity.issues;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="space-y-3">
        <Link href="/dashboard/operator/shared" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Shared Property</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-navy-900">{opportunity.displayLabel}</h1>
            <p className="text-sm text-slate-500">{SHARED_TYPE_LABELS[opportunity.opportunityType]} · {opportunity.area}, {opportunity.city}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone={publication.tone}>{publication.label}</StatusBadge>
              <StatusBadge tone={verification.tone}><ShieldCheck className="h-3 w-3" /> {verification.label}</StatusBadge>
              {opportunity.reverificationRequired && <StatusBadge tone="amber">Awaiting re-verification</StatusBadge>}
            </div>
          </div>
          {canSubmit && (
            <a href="#shared-declaration" className="btn-primary !py-2.5">
              <Send className="h-4 w-4" />
              {status === 'needs_correction' ? 'Resubmit' : 'Submit for verification'}
            </a>
          )}
        </div>
      </div>

      <SectionCard title="Verification status">
        <StatusTimeline
          status={status}
          correctionNotes={data.verification?.correctionNotes}
          publishedAt={opportunity.publishedAt}
          suspensionReason={opportunity.suspensionReason}
        />
        {data.verification && (
          <p className="text-xs text-slate-500">
            Verification case: <StatusBadge tone={CASE_STATUS_META[data.verification.status].tone} className="!py-0.5">{CASE_STATUS_META[data.verification.status].label}</StatusBadge>
            {data.verification.isReverification ? ' · lightweight re-verification' : ''}
          </p>
        )}
        {submitError && <IssueList message={submitError.message} issues={submitError.issues} />}
        {canSubmit && !submitError && (
          <div className="space-y-2">
            {displayIssues.length > 0 ? (
              <IssueList title="Complete these answers before submitting" issues={displayIssues} />
            ) : (
              <Notice tone="success">Your answers are complete.</Notice>
            )}
            {!hasOccupancy && <Notice tone="warning" title="Proof of occupancy required">Upload evidence that you currently live in this home before submitting.</Notice>}
            <div id="shared-declaration" className="space-y-3">
              <ListingDeclarationPanel state={declaration} idPrefix="shared-declaration" disabled={submitting} />
              <div className="flex justify-end">
                <button type="button" className="btn-primary !py-2.5" disabled={submitting || !declaration.canSubmit} onClick={() => void submit()}>
                  {submitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
                  {status === 'needs_correction' ? 'Resubmit' : 'Submit for verification'}
                </button>
              </div>
            </div>
          </div>
        )}
        {status !== 'draft' && !data.readiness.ready && data.readiness.blockers.length > 0 && (
          <div className="rounded-xl border border-slate-200 p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Still needed before publication</p>
            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm text-slate-700">
              {data.readiness.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
            </ul>
            <p className="mt-1 text-xs text-slate-500">Some steps are completed by Veriq and your assigned Agent.</p>
          </div>
        )}
      </SectionCard>

      <SectionCard
        title="Availability"
        description="Marking the opportunity unavailable hides it immediately. Reactivation is immediate only while your verification is still fresh (§6.4, §10.2)."
      >
        <AvailabilityControl
          status={opportunity.availabilityStatus}
          changedAt={opportunity.availabilityChangedAt}
          confirmedAt={opportunity.availabilityConfirmedAt}
          freshnessExpiresAt={opportunity.freshnessExpiresAt}
          reconfirmPromptedAt={opportunity.reconfirmPromptedAt}
          disabled={status === 'archived'}
          disabledReason="Archived opportunities cannot change availability."
          note={
            opportunity.reverificationRequired ? (
              <Notice tone="warning" title="Re-verification in progress">
                Your verification period lapsed, so your Veriq Agent must re-verify this opportunity (continued occupancy, household arrangement and contribution) before it becomes public again.
              </Notice>
            ) : status !== 'published' ? (
              <p className="text-xs text-slate-500">Only a published opportunity can be made available to renters.</p>
            ) : undefined
          }
          onChange={async (next: UnitAvailabilityStatus, reason?: string) => {
            const response = await sharedPropertiesApi.availability(opportunity.id, next, reason);
            setData(response.data);
            return response.message;
          }}
          onReconfirm={
            status === 'published'
              ? async () => {
                  const response = await sharedPropertiesApi.availability(opportunity.id, 'available');
                  setData(response.data);
                  return response.message;
                }
              : undefined
          }
        />
      </SectionCard>

      <SectionCard
        title="Opportunity details"
        description={
          direct
            ? 'Changes save directly while this opportunity is a draft or needs correction.'
            : live
              ? 'Contribution, charges and contact details apply immediately. Household facts and intelligence are reviewed by your Veriq Agent before the public version changes.'
              : 'Details are locked while your Veriq Agent verifies this opportunity.'
        }
        actions={live && !requesting ? <button type="button" className="btn-outline !px-3 !py-2 text-xs" onClick={() => setRequesting(true)}>Request changes</button> : undefined}
      >
        {!direct && !live && <Notice tone="info">Wait for your Veriq Agent to finish verification or request a correction before editing.</Notice>}
        {requesting && <Notice tone="warning" title="Requesting changes">Facts and intelligence changes are sent to your Veriq Agent; the published version stays unchanged until approved.</Notice>}
        {saveError && <IssueList message={saveError} issues={saveIssues} />}

        <div>
          <label htmlFor="shared-title" className="label">Opportunity title</label>
          <input id="shared-title" className="input" maxLength={160} disabled={!editable} value={displayLabel} onChange={(event) => setDisplayLabel(event.target.value)} />
          {saveIssues.filter((issue) => issue.path === 'displayLabel').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-red-600">{issue.message}</p>)}
        </div>

        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="flex items-center gap-2 font-medium text-navy-900"><MapPin className="h-4 w-4 text-veriq-secondary" /> {[opportunity.submittedAddress?.streetName, opportunity.area, opportunity.city, opportunity.state].filter(Boolean).join(', ')}</p>
          <p className="text-xs text-slate-500">{opportunity.submittedAddress?.address}</p>
          <p className="mt-1 text-xs text-slate-500">Your Veriq Agent verifies the exact private location during verification; it cannot be changed here.</p>
        </div>

        {schemaLoading ? (
          <p className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> Loading form…</p>
        ) : schemaError || !schema ? (
          <Notice tone="error">{schemaError ?? 'This form is unavailable.'} <button type="button" className="font-semibold underline" onClick={reloadSchema}>Retry</button></Notice>
        ) : (
          <SchemaTabs
            schema={schema}
            groups={['facts', 'commercial', 'intelligence']}
            value={answers}
            onChange={editable || live ? setAnswers : undefined}
            readOnlyGroups={live && !requesting ? ['facts', 'intelligence'] : []}
            issues={[...displayIssues, ...saveIssues]}
            idPrefix="shared-details"
          />
        )}

        {(editable || (live && commercialChanged)) && (
          <div className="space-y-3 border-t border-slate-100 pt-4">
            {live && requesting && (
              <label className="block">
                <span className="label">Note for your Veriq Agent <span className="text-xs font-normal text-slate-400">Optional</span></span>
                <textarea className="input" rows={2} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} />
              </label>
            )}
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              {(dirty || requesting) && (
                <button type="button" className="btn-ghost" onClick={() => { resetDetails(); setRequesting(false); }}>{requesting ? 'Cancel request' : 'Discard changes'}</button>
              )}
              <button type="button" className="btn-primary" disabled={saving || !dirty} onClick={() => void saveDetails()}>
                {saving && <LoadingSpinner size="sm" />} {live && (factsChanged || intelligenceChanged || labelChanged) ? 'Send for Agent review' : 'Save changes'}
              </button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title={<span className="flex items-center gap-2"><Camera className="h-4 w-4 text-veriq-secondary" /> Media</span>} description="The offered room or bed, shared living area, kitchen and bathroom the incoming resident will use.">
        <MediaChecklist ownerType="shared_opportunity" ownerId={opportunity.id} readOnly={status === 'archived'} readOnlyReason="Archived opportunities cannot receive new media." onChanged={() => void load()} />
      </SectionCard>

      <SectionCard title={<span className="flex items-center gap-2"><FileLock2 className="h-4 w-4 text-veriq-secondary" /> Verification evidence</span>} description="Occupancy proof is required before submission. Files are private to you, your Veriq Agent and Veriq Admin.">
        <EvidenceUploader ownerType="shared_opportunity" ownerId={opportunity.id} kinds={SHARED_EVIDENCE_KINDS} disabled={status === 'archived'} onChanged={setEvidence} />
        {opportunity.permissionDeclaredAt && (
          <p className="text-xs text-slate-500">Sharing permission declared {formatDateTime(opportunity.permissionDeclaredAt)}.</p>
        )}
      </SectionCard>

      <SectionCard
        title="Contact"
        description="Shown to a renter only after they unlock this opportunity."
        actions={status !== 'archived' && !editingContact ? (
          <button
            type="button"
            className="btn-outline !px-3 !py-2 text-xs"
            onClick={() => {
              setContact({ contactType: 'operator', name: opportunity.contactName, phone: opportunity.contactPhone, whatsappPhone: opportunity.contactWhatsappPhone ?? '' });
              setContactIssues([]);
              setEditingContact(true);
            }}
          >
            Update contact
          </button>
        ) : undefined}
      >
        <div className="rounded-xl bg-slate-50 p-4 text-sm">
          <p className="font-semibold text-navy-900">{opportunity.contactName}</p>
          <p className="text-xs text-slate-500">{opportunity.contactPhone}{opportunity.contactWhatsappPhone && opportunity.contactWhatsappPhone !== opportunity.contactPhone ? ` · WhatsApp ${opportunity.contactWhatsappPhone}` : ''}</p>
        </div>
        {editingContact && (
          <div className="space-y-4 rounded-xl border border-slate-200 p-4">
            <ContactFields value={contact} onChange={setContact} issues={contactIssues} allowCaretaker={false} idPrefix="shared-contact-edit" />
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className="btn-ghost" onClick={() => setEditingContact(false)}>Cancel</button>
              <button type="button" className="btn-primary" disabled={savingContact} onClick={() => void saveContact()}>{savingContact && <LoadingSpinner size="sm" />} Save contact</button>
            </div>
          </div>
        )}
      </SectionCard>

      <SectionCard title="Change requests" description="Changes waiting for your Veriq Agent to review.">
        <RevisionList
          revisions={data.pendingRevisions}
          currentUserId={user?.id}
          targetLabels={{ [opportunity.id]: opportunity.displayLabel }}
          onWithdrawn={() => void load()}
          emptyText="No changes are waiting for review."
        />
      </SectionCard>
    </div>
  );
}

export default function SharedOpportunityPage() {
  return (
    <OperatorGuard>
      <SharedOpportunityManager />
    </OperatorGuard>
  );
}
