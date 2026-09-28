'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  Camera,
  ChevronDown,
  ChevronUp,
  ClipboardList,
  FileLock2,
  MapPin,
  MessageCircle,
  Phone,
  Plus,
  Send,
  ShieldCheck,
  UserRound,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { propertySchemasApi, propertySubmissionsApi, unitAvailabilityApi } from '@/lib/api/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  AvailabilityControl,
  CASE_STATUS_META,
  CATEGORY_LABELS,
  ContactFields,
  EMPTY_CONTACT,
  EvidenceUploader,
  IssueList,
  LocationSelector,
  MediaChecklist,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  RevisionList,
  SchemaTabs,
  SectionCard,
  StatusBadge,
  StatusTimeline,
  VERIFICATION_STATUS_META,
  answersEqual,
  errorMessage,
  formatDateTime,
  locationFromRecord,
  needsReconfirmation,
  parseApiError,
  prefixIssues,
  propertyEvidenceKinds,
  scopeIssues,
  stripHiddenAnswers,
  toContactInput,
  toSubmissionLocation,
  useCatalogue,
  useSchema,
  withClearedKeys,
  type ContactValue,
  type LocationValue,
} from '@/components/listing-forms';
import { ListingDeclarationPanel, useListingDeclaration } from '@/components/listing-forms';
import { UnitCalendarPanel } from '@/components/availability/UnitCalendarPanel';
import type {
  ListingRevisionRecord,
  PropertyManagerData,
  PropertyUnitView,
  PublicationStatus,
  SchemaAnswers,
  SchemaCatalogueSubtype,
  SchemaIssue,
  UnitAvailabilityStatus,
} from '@/types/operator';

const EDITABLE: PublicationStatus[] = ['draft', 'needs_correction'];
const LIVE: PublicationStatus[] = ['published', 'ready_to_publish', 'suspended'];

type EditMode = 'direct' | 'revision' | 'locked';

function editModeFor(status: PublicationStatus, frozen: boolean): EditMode {
  if (frozen || status === 'archived') return 'locked';
  if (EDITABLE.includes(status)) return 'direct';
  if (LIVE.includes(status)) return 'revision';
  return 'locked';
}

function PropertyEditor() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { catalogue } = useCatalogue();
  const [data, setData] = useState<PropertyManagerData | null>(null);
  const [revisions, setRevisions] = useState<ListingRevisionRecord[]>([]);
  const [revisionsError, setRevisionsError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; issues: SchemaIssue[] } | null>(null);
  const declaration = useListingDeclaration();

  const loadRevisions = useCallback(async () => {
    try {
      const response = await propertySubmissionsApi.revisions(id);
      setRevisions(response.data);
      setRevisionsError(null);
    } catch (caught) {
      setRevisionsError(errorMessage(caught, 'Unable to load change requests'));
    }
  }, [id]);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const response = await propertySubmissionsApi.get(id);
      setData(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load this property'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const reloadAll = useCallback(() => {
    void load();
    void loadRevisions();
  }, [load, loadRevisions]);

  useEffect(() => {
    setLoading(true);
    reloadAll();
  }, [reloadAll]);

  useEffect(() => {
    if (!data || typeof window === 'undefined' || !window.location.hash) return;
    const target = document.getElementById(window.location.hash.slice(1));
    target?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, [data]);

  const unitSubtypes = useMemo<SchemaCatalogueSubtype[]>(
    () => catalogue?.categories.find((entry) => entry.category === data?.property.category)?.subtypes.filter((item) => item.level === 'unit') ?? [],
    [catalogue, data?.property.category],
  );

  if (loading) return <PageLoader />;
  if (loadError || !data) {
    return (
      <div className="mx-auto max-w-3xl space-y-4">
        <Link href="/dashboard/operator/properties" className="inline-flex items-center gap-1.5 text-sm text-slate-500"><ArrowLeft className="h-4 w-4" /> My Properties</Link>
        <Notice tone="error" title="Property unavailable">
          <p>{loadError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={() => { setLoading(true); reloadAll(); }}>Try again</button>
        </Notice>
      </div>
    );
  }

  const { property, units } = data;
  const status = property.publicationStatus;
  const mode = editModeFor(status, property.sensitiveChangesFrozen);
  const canSubmit = EDITABLE.includes(status) && !property.sensitiveChangesFrozen;
  const archived = status === 'archived';
  const publication = PUBLICATION_STATUS_META[status];
  const verification = VERIFICATION_STATUS_META[property.verificationStatus];

  const derivedIssues: SchemaIssue[] = [
    ...prefixIssues(property.issues, 'property.'),
    ...units.flatMap((unit) => prefixIssues(unit.issues, `units.${unit.displayLabel}.`)),
  ];
  const displayIssues = submitError?.issues.length ? submitError.issues : derivedIssues;

  const submit = async () => {
    if (!declaration.payload) {
      setSubmitError({ message: 'Accept the Veriq listing declaration to submit', issues: [] });
      document.getElementById('submission-checklist')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const response = await propertySubmissionsApi.submit(property.id, declaration.payload);
      setData(response.data);
      success(response.message || 'Submitted for verification');
      void loadRevisions();
      // A re-submission after a correction is a fresh acceptance, so the tick is cleared again (§3 step 1).
      declaration.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to submit this property');
      setSubmitError({ message: parsed.message, issues: parsed.issues });
      toastError(parsed.message);
      document.getElementById('submission-checklist')?.scrollIntoView({ behavior: 'smooth' });
    } finally {
      setSubmitting(false);
    }
  };

  const unitLabels = Object.fromEntries(units.map((unit) => [unit.id, unit.displayLabel]));
  const pendingCount = revisions.filter((revision) => revision.status === 'pending').length;

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <div className="space-y-3">
        <Link href="/dashboard/operator/properties" className="inline-flex items-center gap-1.5 text-sm text-slate-500 hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> My Properties</Link>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h1 className="font-display text-2xl font-bold text-navy-900">{property.title}</h1>
            <p className="text-sm text-slate-500">{CATEGORY_LABELS[property.category]} · {property.area}, {property.city}, {property.state}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              <StatusBadge tone={publication.tone}>{publication.label}</StatusBadge>
              <StatusBadge tone={verification.tone}><ShieldCheck className="h-3 w-3" /> {verification.label}</StatusBadge>
              {pendingCount > 0 && <StatusBadge tone="amber"><ClipboardList className="h-3 w-3" /> {pendingCount} change{pendingCount === 1 ? '' : 's'} awaiting Agent</StatusBadge>}
            </div>
          </div>
          {canSubmit && (
            <a href="#submission-checklist" className="btn-primary !py-2.5">
              <Send className="h-4 w-4" />
              {status === 'needs_correction' ? 'Resubmit for verification' : 'Submit for verification'}
            </a>
          )}
        </div>
        <nav className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 text-xs font-semibold sm:mx-0 sm:px-0" aria-label="Sections">
          {[
            ['status', 'Status'],
            ['details', 'Details'],
            ['units', `Units (${units.length})`],
            ['media', 'Property media'],
            ['contact', 'Contact'],
            ['evidence', 'Evidence'],
            ['revisions', 'Change requests'],
          ].map(([anchor, label]) => (
            <a key={anchor} href={`#${anchor}`} className="whitespace-nowrap rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:text-navy-900">{label}</a>
          ))}
        </nav>
      </div>

      {property.sensitiveChangesFrozen && (
        <Notice tone="warning" title="Changes frozen">
          Veriq has frozen sensitive changes on this Property while a dispute is reviewed. You can still update availability.
        </Notice>
      )}

      <div className="grid gap-5 lg:grid-cols-[1fr_300px]">
        <SectionCard id="status" title="Verification status">
          <StatusTimeline
            status={status}
            correctionNotes={data.verification?.correctionNotes}
            submittedAt={property.submittedAt}
            publishedAt={property.publishedAt}
            suspensionReason={property.suspensionReason}
          />
          {data.verification && (
            <p className="text-xs text-slate-500">
              Verification case: <StatusBadge tone={CASE_STATUS_META[data.verification.status].tone} className="!py-0.5">{CASE_STATUS_META[data.verification.status].label}</StatusBadge>
            </p>
          )}
          {status !== 'draft' && !data.readiness.ready && data.readiness.blockers.length > 0 && (
            <div className="rounded-xl border border-slate-200 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Still needed before publication</p>
              <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm text-slate-700">
                {data.readiness.blockers.map((blocker) => <li key={blocker.code}>{blocker.message}</li>)}
              </ul>
            </div>
          )}
        </SectionCard>

        <SectionCard title="Your Veriq Agent">
          {data.assignedAgent ? (
            <div className="space-y-2">
              <p className="flex items-center gap-2 font-semibold text-navy-900"><UserRound className="h-4 w-4 text-veriq-secondary" /> {data.assignedAgent.name || 'Assigned Veriq Agent'}</p>
              {data.assignedAgent.phone && (
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${data.assignedAgent.phone}`} className="btn-outline !px-3 !py-1.5 text-xs"><Phone className="h-3.5 w-3.5" /> Call</a>
                  <a href={`https://wa.me/${data.assignedAgent.phone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener noreferrer" className="btn-outline !px-3 !py-1.5 text-xs"><MessageCircle className="h-3.5 w-3.5" /> WhatsApp</a>
                </div>
              )}
              <p className="text-xs text-slate-500">Your Agent verifies, requests corrections and publishes this Property.</p>
            </div>
          ) : (
            <div className="space-y-1">
              <StatusBadge tone="amber">Awaiting assignment</StatusBadge>
              <p className="text-sm text-slate-600">Veriq Admin will assign a Veriq Agent. You can keep preparing and submit meanwhile.</p>
            </div>
          )}
        </SectionCard>
      </div>

      {canSubmit && (
        <SectionCard id="submission-checklist" title="Before you submit" description="Everything below is re-checked by Veriq when you submit.">
          {submitError && <IssueList message={submitError.message} issues={submitError.issues} />}
          {!submitError && derivedIssues.length === 0 && units.length > 0 ? (
            <Notice tone="success">All required property and Unit answers are complete. Add media and evidence to speed up verification.</Notice>
          ) : !submitError ? (
            <IssueList title="Required answers still missing" issues={derivedIssues.length ? derivedIssues : [{ path: 'units', message: 'Add at least one currently documentable Unit' }]} />
          ) : null}
          <ListingDeclarationPanel state={declaration} idPrefix="property-declaration" disabled={submitting} />
          <div className="flex justify-end">
            <button type="button" className="btn-primary !py-2.5" disabled={submitting || !declaration.canSubmit} onClick={() => void submit()}>
              {submitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
              {status === 'needs_correction' ? 'Resubmit for verification' : 'Submit for verification'}
            </button>
          </div>
        </SectionCard>
      )}

      <PropertyDetailsSection data={data} mode={mode} issues={scopeIssues(displayIssues, 'property.')} locationIssues={displayIssues.filter((issue) => issue.path.startsWith('location'))} onSaved={reloadAll} />

      <SectionCard
        id="units"
        title={`Units · ${units.length} documented of ${data.knownUnitCount ?? units.length}`}
        description="Each Unit has its own type, commercial terms, availability, intelligence and media. New Units stay hidden until your Agent verifies them."
      >
        {displayIssues.some((issue) => issue.path === 'units') && <IssueList issues={displayIssues.filter((issue) => issue.path === 'units')} />}
        {units.length === 0 && <p className="text-sm text-slate-500">No Units documented yet.</p>}
        <div className="space-y-3">
          {units.map((unit) => (
            <UnitCard
              key={unit.id}
              unit={unit}
              propertyStatus={status}
              frozen={property.sensitiveChangesFrozen}
              subtypes={unitSubtypes}
              isShortLet={property.category === 'short_let'}
              extraIssues={scopeIssues(submitError?.issues ?? [], `units.${unit.displayLabel}.`)}
              onChanged={reloadAll}
            />
          ))}
        </div>
        {!archived && !property.sensitiveChangesFrozen && <AddUnitForm propertyId={property.id} subtypes={unitSubtypes} published={status === 'published'} onAdded={reloadAll} />}
      </SectionCard>

      <SectionCard id="media" title={<span className="flex items-center gap-2"><Camera className="h-4 w-4 text-veriq-secondary" /> Property media</span>} description="Front view, compound and access road images for the whole property. Unit images are added on each Unit.">
        <MediaChecklist ownerType="property" ownerId={property.id} readOnly={archived} readOnlyReason="Archived properties cannot receive new media." onChanged={() => void load()} />
      </SectionCard>

      <ContactsSection data={data} disabled={archived || property.sensitiveChangesFrozen} issues={displayIssues.filter((issue) => issue.path.startsWith('contact'))} onSaved={() => void load()} />

      <SectionCard id="evidence" title={<span className="flex items-center gap-2"><FileLock2 className="h-4 w-4 text-veriq-secondary" /> Verification evidence</span>} description={property.category === 'residential' ? 'Evidence that you are the landlord/property owner, plus identity (§7.3).' : 'Evidence of your authority to operate this accommodation, plus identity (§7.4).'}>
        <EvidenceUploader ownerType="property" ownerId={property.id} kinds={propertyEvidenceKinds(property.category)} disabled={archived} />
      </SectionCard>

      <SectionCard id="revisions" title="Change requests" description="Changes to verified details, intelligence and address are reviewed by your Veriq Agent. The published version stays unchanged until approval.">
        {revisionsError ? (
          <Notice tone="error">{revisionsError} <button type="button" className="font-semibold underline" onClick={() => void loadRevisions()}>Retry</button></Notice>
        ) : (
          <RevisionList revisions={revisions} currentUserId={user?.id} targetLabels={{ ...unitLabels, [property.id]: 'Property' }} onWithdrawn={reloadAll} />
        )}
      </SectionCard>
    </div>
  );
}

// ─── Property details ───────────────────────────────────────────────────

function PropertyDetailsSection({
  data,
  mode,
  issues,
  locationIssues,
  onSaved,
}: {
  data: PropertyManagerData;
  mode: EditMode;
  issues: SchemaIssue[];
  locationIssues: SchemaIssue[];
  onSaved: () => void;
}) {
  const { property } = data;
  const { success, error: toastError } = useToast();
  const { schema, loading, error, reload } = useSchema(property.propertySchemaId);
  const original = useMemo<SchemaAnswers>(
    () => ({ facts: property.propertyFacts ?? {}, intelligence: property.propertyIntelligence ?? {} }),
    [property.propertyFacts, property.propertyIntelligence],
  );
  const [requesting, setRequesting] = useState(false);
  const [title, setTitle] = useState(property.title);
  const [known, setKnown] = useState(String(property.knownUnitCount ?? ''));
  const [answers, setAnswers] = useState<SchemaAnswers>(original);
  const [location, setLocation] = useState<LocationValue>(() => locationFromRecord(property));
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveIssues, setSaveIssues] = useState<SchemaIssue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setTitle(property.title);
    setKnown(String(property.knownUnitCount ?? ''));
    setAnswers(original);
    setLocation(locationFromRecord(property));
    setMessage('');
    setSaveIssues([]);
    setSaveError(null);
  }, [original, property]);

  useEffect(() => {
    reset();
    setRequesting(false);
  }, [reset]);

  const editable = mode === 'direct' || (mode === 'revision' && requesting);
  const originalLocation = locationFromRecord(property);
  const locationChanged = JSON.stringify(location) !== JSON.stringify(originalLocation);
  const factsChanged = !answersEqual(original.facts, answers.facts);
  const intelligenceChanged = !answersEqual(original.intelligence, answers.intelligence);
  const titleChanged = title.trim() !== property.title;
  const knownChanged = known !== String(property.knownUnitCount ?? '');
  const dirty = factsChanged || intelligenceChanged || titleChanged || knownChanged || locationChanged;

  const save = async () => {
    setSaveIssues([]);
    setSaveError(null);
    const localIssues: SchemaIssue[] = [];
    const trimmed = title.trim();
    if (titleChanged && (trimmed.length < 3 || trimmed.length > 300)) localIssues.push({ path: 'title', message: 'Enter a property title (3–300 characters)' });
    const knownNumber = Number(known);
    if (knownChanged && (!Number.isInteger(knownNumber) || knownNumber < 1 || knownNumber > 2000))
      localIssues.push({ path: 'knownUnitCount', message: 'Enter the total number of Units (1–2000)' });
    const { location: locationInput, issues: locIssues } = toSubmissionLocation(location);
    if (locationChanged) localIssues.push(...locIssues);
    if (localIssues.length) {
      setSaveIssues(localIssues);
      return;
    }
    const payload = {
      ...(titleChanged ? { title: trimmed } : {}),
      ...(knownChanged ? { knownUnitCount: knownNumber } : {}),
      ...(locationChanged && locationInput ? { location: locationInput } : {}),
      ...(factsChanged || intelligenceChanged
        ? {
            property: {
              ...(factsChanged ? { facts: withClearedKeys(original.facts, stripHiddenAnswers(answers.facts)) } : {}),
              ...(intelligenceChanged ? { intelligence: withClearedKeys(original.intelligence, stripHiddenAnswers(answers.intelligence)) } : {}),
            },
          }
        : {}),
      ...(mode === 'revision' && message.trim() ? { message: message.trim() } : {}),
    };
    setSaving(true);
    try {
      const response = await propertySubmissionsApi.update(property.id, payload);
      success(response.message);
      setRequesting(false);
      onSaved();
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to save changes');
      setSaveIssues(parsed.issues);
      setSaveError(parsed.message);
      toastError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  const combinedIssues = [...issues, ...scopeIssues(saveIssues, 'property.')];
  const topIssue = (path: string) =>
    saveIssues.filter((issue) => issue.path === path).map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-red-600">{issue.message}</p>);

  return (
    <SectionCard
      id="details"
      title="Property details"
      description={
        mode === 'direct'
          ? 'Changes save directly to this draft.'
          : mode === 'revision'
            ? 'This Property is verified. Edits are sent to your Veriq Agent as a change request; the published details stay unchanged until approved.'
            : 'Details are locked while your Veriq Agent verifies this Property.'
      }
      actions={
        mode === 'revision' && !requesting ? (
          <button type="button" className="btn-outline !px-3 !py-2 text-xs" onClick={() => setRequesting(true)}>Request changes</button>
        ) : undefined
      }
    >
      {mode === 'locked' && property.publicationStatus !== 'archived' && !property.sensitiveChangesFrozen && (
        <Notice tone="info">Wait for your Veriq Agent to finish verification or request a correction before editing. You can still add Units, media and evidence.</Notice>
      )}
      {requesting && (
        <Notice tone="warning" title="Requesting changes">
          Your edits are sent to your Veriq Agent for review. Intelligence changes are reviewed as an Intelligence Review request.
        </Notice>
      )}
      {saveError && <IssueList message={saveError} issues={saveIssues.filter((issue) => !issue.path.startsWith('property.'))} />}

      <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
        <div>
          <label htmlFor="edit-title" className="label">Property title</label>
          <input id="edit-title" className="input" maxLength={300} disabled={!editable} value={title} onChange={(event) => setTitle(event.target.value)} />
          {topIssue('title')}
        </div>
        <div>
          <label htmlFor="edit-known" className="label">Total Units in property</label>
          <input id="edit-known" className="input" type="number" min={1} max={2000} step={1} disabled={!editable} value={known} onChange={(event) => setKnown(event.target.value)} />
          {topIssue('knownUnitCount')}
        </div>
      </div>

      <div className="space-y-2">
        <p className="flex items-center gap-2 text-sm font-semibold text-navy-900"><MapPin className="h-4 w-4 text-veriq-secondary" /> Location</p>
        {editable ? (
          <LocationSelector
            value={location}
            onChange={setLocation}
            mode={mode === 'revision' ? 'address_only' : 'full'}
            issues={[...locationIssues, ...saveIssues.filter((issue) => issue.path.startsWith('location'))]}
            idPrefix="edit-location"
          />
        ) : (
          <div className="rounded-xl bg-slate-50 p-4 text-sm text-slate-700">
            <p>{[property.submittedAddress?.buildingName, property.submittedAddress?.address ?? property.address].filter(Boolean).join(', ')}</p>
            <p className="text-xs text-slate-500">{[property.submittedAddress?.streetName, property.area, property.city, property.state].filter(Boolean).join(', ')}</p>
            {property.verifiedAddress && <p className="mt-1 text-xs font-medium text-emerald-700">Address verified by your Veriq Agent</p>}
          </div>
        )}
      </div>

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> Loading form…</p>
      ) : error || !schema ? (
        <Notice tone="error">{error ?? 'The property form is unavailable.'} <button type="button" className="font-semibold underline" onClick={reload}>Retry</button></Notice>
      ) : (
        <SchemaTabs
          schema={schema}
          groups={['facts', 'intelligence']}
          value={answers}
          onChange={editable ? setAnswers : undefined}
          issues={combinedIssues}
          idPrefix="property-details"
        />
      )}

      {editable && (
        <div className="space-y-3 border-t border-slate-100 pt-4">
          {mode === 'revision' && (
            <label className="block">
              <span className="label">Note for your Veriq Agent <span className="text-xs font-normal text-slate-400">Optional</span></span>
              <textarea className="input" rows={2} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Explain what changed, e.g. the borehole was replaced in May." />
            </label>
          )}
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            {(dirty || requesting) && (
              <button type="button" className="btn-ghost" onClick={() => { reset(); setRequesting(false); }}>
                {requesting ? 'Cancel request' : 'Discard changes'}
              </button>
            )}
            <button type="button" className="btn-primary" disabled={saving || !dirty} onClick={() => void save()}>
              {saving && <LoadingSpinner size="sm" />} {mode === 'revision' ? 'Send for Agent review' : 'Save changes'}
            </button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

// ─── Units ──────────────────────────────────────────────────────────────

function unitAnswers(unit: PropertyUnitView): SchemaAnswers {
  return { facts: unit.facts ?? {}, commercial: unit.commercialTerms ?? {}, intelligence: unit.intelligence ?? {} };
}

function UnitCard({
  unit,
  propertyStatus,
  frozen,
  subtypes,
  isShortLet,
  extraIssues,
  onChanged,
}: {
  unit: PropertyUnitView;
  propertyStatus: PublicationStatus;
  frozen: boolean;
  subtypes: SchemaCatalogueSubtype[];
  /** Short Let availability is checked against dates, so its Units carry a booked/blocked calendar (§5). */
  isShortLet: boolean;
  extraIssues: SchemaIssue[];
  onChanged: () => void;
}) {
  const { success, error: toastError, info } = useToast();
  const [open, setOpen] = useState(false);
  const [requesting, setRequesting] = useState(false);
  const original = useMemo(() => unitAnswers(unit), [unit]);
  const [label, setLabel] = useState(unit.displayLabel);
  const [subtype, setSubtype] = useState(unit.subtype ?? '');
  const [answers, setAnswers] = useState<SchemaAnswers>(original);
  const [message, setMessage] = useState('');
  const [saving, setSaving] = useState<'direct' | 'commercial' | 'revision' | null>(null);
  const [saveIssues, setSaveIssues] = useState<SchemaIssue[]>([]);
  const [saveError, setSaveError] = useState<string | null>(null);

  const reset = useCallback(() => {
    setLabel(unit.displayLabel);
    setSubtype(unit.subtype ?? '');
    setAnswers(original);
    setMessage('');
    setSaveIssues([]);
    setSaveError(null);
  }, [original, unit.displayLabel, unit.subtype]);

  useEffect(() => {
    reset();
    setRequesting(false);
  }, [reset]);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.location.hash === `#unit-${unit.id}`) setOpen(true);
  }, [unit.id]);

  const schemaId = subtype === unit.subtype ? unit.schemaId : subtypes.find((item) => item.subtype === subtype)?.id ?? null;
  const { schema, loading, error, reload } = useSchema(schemaId);

  const archived = propertyStatus === 'archived';
  const locked = archived || frozen;
  const verified = unit.verificationStatus === 'verified';
  const structuralEditable = !locked && (!verified || requesting);
  const commercialEditable = !locked;
  const readOnlyGroups = (['facts', 'intelligence'] as const).filter(() => !structuralEditable);

  const factsChanged = !answersEqual(original.facts, answers.facts);
  const intelligenceChanged = !answersEqual(original.intelligence, answers.intelligence);
  const commercialChanged = !answersEqual(original.commercial, answers.commercial);
  const labelChanged = label.trim() !== unit.displayLabel;
  const subtypeChanged = subtype !== (unit.subtype ?? '');
  const structuralChanged = factsChanged || intelligenceChanged || labelChanged || subtypeChanged;
  const issues = [...(saveIssues.length ? scopeIssues(saveIssues, 'unit.') : unit.issues), ...extraIssues];
  const subtypeLabel = subtypes.find((item) => item.subtype === unit.subtype)?.label ?? unit.unitType;
  const labels = unit.availabilityLabels ?? schema?.availabilityLabels;
  const due = needsReconfirmation(unit);

  const changeSubtype = async (next: string) => {
    const nextSchemaId = next === unit.subtype ? unit.schemaId : subtypes.find((item) => item.subtype === next)?.id;
    setSubtype(next);
    if (!nextSchemaId) return;
    try {
      const response = await propertySchemasApi.validate(nextSchemaId, next === unit.subtype ? original : answers, 'draft');
      setAnswers({ ...response.data.normalized, commercial: response.data.normalized.commercial });
      if (response.data.removed.length) info(`${response.data.removed.length} answer${response.data.removed.length === 1 ? '' : 's'} not used by this Unit type will be removed when you save.`);
    } catch (caught) {
      toastError(errorMessage(caught, 'Unable to rebuild the Unit form'));
    }
  };

  const persist = async (kind: 'direct' | 'commercial' | 'revision') => {
    setSaveIssues([]);
    setSaveError(null);
    const trimmed = label.trim();
    if (kind !== 'commercial' && labelChanged && (!trimmed || trimmed.length > 160)) {
      setSaveIssues([{ path: 'unit.displayLabel', message: 'Enter a Display Label (up to 160 characters)' }]);
      return;
    }
    const payload =
      kind === 'commercial'
        ? { commercial: withClearedKeys(original.commercial, stripHiddenAnswers(answers.commercial)) }
        : {
            ...(labelChanged ? { displayLabel: trimmed } : {}),
            ...(subtypeChanged ? { subtype } : {}),
            ...(factsChanged || subtypeChanged ? { facts: subtypeChanged ? stripHiddenAnswers(answers.facts) : withClearedKeys(original.facts, stripHiddenAnswers(answers.facts)) } : {}),
            ...(intelligenceChanged || subtypeChanged ? { intelligence: subtypeChanged ? stripHiddenAnswers(answers.intelligence) : withClearedKeys(original.intelligence, stripHiddenAnswers(answers.intelligence)) } : {}),
            ...(kind === 'direct' && commercialChanged ? { commercial: withClearedKeys(original.commercial, stripHiddenAnswers(answers.commercial)) } : {}),
            ...(kind === 'revision' && message.trim() ? { message: message.trim() } : {}),
          };
    setSaving(kind);
    try {
      const response = await propertySubmissionsApi.updateUnit(unit.id, payload);
      success(response.message);
      if (response.data.removedAnswers.length) info(`${response.data.removedAnswers.length} answer${response.data.removedAnswers.length === 1 ? '' : 's'} that no longer apply were removed and kept in history.`);
      setRequesting(false);
      onChanged();
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to save this Unit');
      setSaveIssues(parsed.issues);
      setSaveError(parsed.message);
      toastError(parsed.message);
    } finally {
      setSaving(null);
    }
  };

  const verificationMeta = VERIFICATION_STATUS_META[unit.verificationStatus];

  return (
    <div id={`unit-${unit.id}`} className={cn('scroll-mt-24 rounded-2xl border', issues.length && !verified ? 'border-red-200' : due ? 'border-amber-300' : 'border-slate-200')}>
      <button type="button" className="flex w-full flex-col gap-2 p-4 text-left sm:flex-row sm:items-center sm:justify-between" onClick={() => setOpen((value) => !value)} aria-expanded={open}>
        <div className="min-w-0">
          <p className="truncate font-semibold text-navy-900">{unit.displayLabel}</p>
          <p className="text-xs text-slate-500">{subtypeLabel}</p>
        </div>
        <div className="flex flex-wrap items-center gap-1.5">
          <StatusBadge tone={verificationMeta.tone}>{verificationMeta.label}</StatusBadge>
          <StatusBadge tone={unit.availabilityStatus === 'available' ? 'emerald' : 'slate'}>
            {unit.availabilityStatus === 'available' ? labels?.available ?? 'Available' : labels?.unavailable ?? 'Unavailable'}
          </StatusBadge>
          {due && <StatusBadge tone="amber">Reconfirm</StatusBadge>}
          {!unit.media.complete && <StatusBadge tone="slate"><Camera className="h-3 w-3" /> Media incomplete</StatusBadge>}
          {issues.length > 0 && !verified && <StatusBadge tone="red">{issues.length} to fix</StatusBadge>}
          {open ? <ChevronUp className="h-4 w-4 text-slate-400" /> : <ChevronDown className="h-4 w-4 text-slate-400" />}
        </div>
      </button>

      {open && (
        <div className="space-y-6 border-t border-slate-100 p-4">
          <div className="space-y-2">
            <p className="text-sm font-semibold text-navy-900">Availability</p>
            <AvailabilityControl
              status={unit.availabilityStatus}
              labels={labels}
              changedAt={unit.availabilityChangedAt}
              confirmedAt={unit.availabilityConfirmedAt}
              freshnessExpiresAt={unit.freshnessExpiresAt}
              reconfirmPromptedAt={unit.reconfirmPromptedAt}
              disabled={archived}
              disabledReason="Archived properties cannot change availability."
              note={!verified ? <p className="text-xs text-slate-500">This Unit is shown to renters only after your Veriq Agent verifies it.</p> : undefined}
              onChange={async (next: UnitAvailabilityStatus, reason?: string) => {
                const response = await unitAvailabilityApi.change(unit.id, next, reason);
                onChanged();
                return response.message;
              }}
              onReconfirm={async () => {
                const response = await unitAvailabilityApi.reconfirm(unit.id);
                onChanged();
                return response.message;
              }}
              loadHistory={async () => (await unitAvailabilityApi.history(unit.id)).data}
            />
          </div>

          {isShortLet && <UnitCalendarPanel unitId={unit.id} unitLabel={unit.displayLabel} />}

          <div className="space-y-3">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm font-semibold text-navy-900">Unit details</p>
              {verified && !locked && !requesting && (
                <button type="button" className="btn-outline !px-3 !py-1.5 text-xs" onClick={() => setRequesting(true)}>Request changes to verified details</button>
              )}
            </div>
            {verified && !requesting && !locked && (
              <p className="text-xs text-slate-500">Commercial terms apply immediately (large price changes are flagged to your Agent). Facts and intelligence change only through Agent review.</p>
            )}
            {requesting && (
              <Notice tone="warning" title="Requesting changes">
                Your changes to facts, intelligence, label or type are sent to your Veriq Agent. The verified Unit stays unchanged until approved.
              </Notice>
            )}
            {saveError && <IssueList message={saveError} issues={saveIssues.filter((issue) => !issue.path.startsWith('unit.'))} />}

            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <label htmlFor={`${unit.id}-label`} className="label">Display Label</label>
                <input id={`${unit.id}-label`} className="input" maxLength={160} disabled={!structuralEditable} value={label} onChange={(event) => setLabel(event.target.value)} />
                {issues.filter((issue) => issue.path === 'displayLabel').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-red-600">{issue.message}</p>)}
              </div>
              <div>
                <label htmlFor={`${unit.id}-subtype`} className="label">Unit type</label>
                <select id={`${unit.id}-subtype`} className="input" disabled={!structuralEditable || subtypes.length === 0} value={subtype} onChange={(event) => void changeSubtype(event.target.value)}>
                  {subtypes.length === 0 && <option value={subtype}>{subtypeLabel}</option>}
                  {subtypes.map((item) => <option key={item.id} value={item.subtype ?? ''}>{item.label}</option>)}
                </select>
              </div>
            </div>

            {loading ? (
              <p className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> Loading Unit form…</p>
            ) : error || !schema ? (
              <Notice tone="error">{error ?? 'This Unit form is unavailable.'} <button type="button" className="font-semibold underline" onClick={reload}>Retry</button></Notice>
            ) : (
              <SchemaTabs
                schema={schema}
                groups={['facts', 'commercial', 'intelligence']}
                value={answers}
                onChange={commercialEditable || structuralEditable ? setAnswers : undefined}
                readOnlyGroups={[...readOnlyGroups, ...(commercialEditable ? [] : (['commercial'] as const))]}
                issues={issues}
                idPrefix={`unit-${unit.id}`}
              />
            )}

            {!locked && (
              <div className="space-y-3 border-t border-slate-100 pt-3">
                {requesting && (
                  <label className="block">
                    <span className="label">Note for your Veriq Agent <span className="text-xs font-normal text-slate-400">Optional</span></span>
                    <textarea className="input" rows={2} maxLength={2000} value={message} onChange={(event) => setMessage(event.target.value)} />
                  </label>
                )}
                <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
                  {(structuralChanged || commercialChanged || requesting) && (
                    <button type="button" className="btn-ghost" onClick={() => { reset(); setRequesting(false); }}>
                      {requesting ? 'Cancel request' : 'Discard changes'}
                    </button>
                  )}
                  {!verified && (
                    <button type="button" className="btn-primary" disabled={saving !== null || !(structuralChanged || commercialChanged)} onClick={() => void persist('direct')}>
                      {saving === 'direct' && <LoadingSpinner size="sm" />} Save Unit
                    </button>
                  )}
                  {verified && commercialChanged && !structuralChanged && (
                    <button type="button" className="btn-primary" disabled={saving !== null} onClick={() => void persist('commercial')}>
                      {saving === 'commercial' && <LoadingSpinner size="sm" />} Update commercial terms now
                    </button>
                  )}
                  {verified && requesting && (
                    <button type="button" className="btn-primary" disabled={saving !== null || !structuralChanged} onClick={() => void persist('revision')}>
                      {saving === 'revision' && <LoadingSpinner size="sm" />} Send for Agent review
                    </button>
                  )}
                </div>
                {verified && requesting && commercialChanged && (
                  <p className="text-right text-xs text-slate-500">Commercial changes are saved separately — send this request first, then update commercial terms.</p>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-semibold text-navy-900"><Camera className="h-4 w-4 text-veriq-secondary" /> Unit media</p>
            {subtypeChanged && <Notice tone="info">Save the new Unit type before uploading media for its sections.</Notice>}
            <MediaChecklist ownerType="unit" ownerId={unit.id} readOnly={archived} readOnlyReason="Archived properties cannot receive new media." compact onChanged={onChanged} />
          </div>

          <p className="text-xs text-slate-400">Verified {unit.verifiedAt ? formatDateTime(unit.verifiedAt) : 'not yet'} · schema v{unit.schemaVersion}</p>
        </div>
      )}
    </div>
  );
}

function AddUnitForm({ propertyId, subtypes, published, onAdded }: { propertyId: string; subtypes: SchemaCatalogueSubtype[]; published: boolean; onAdded: () => void }) {
  const { success, error: toastError } = useToast();
  const [open, setOpen] = useState(false);
  const [label, setLabel] = useState('');
  const [subtype, setSubtype] = useState('');
  const [answers, setAnswers] = useState<SchemaAnswers>({});
  const [availability, setAvailability] = useState<UnitAvailabilityStatus>('unavailable');
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const schemaId = subtypes.find((item) => item.subtype === subtype)?.id ?? null;
  const { schema, loading, error, reload } = useSchema(schemaId);

  const close = () => {
    setOpen(false);
    setLabel('');
    setSubtype('');
    setAnswers({});
    setAvailability('unavailable');
    setIssues([]);
    setFormError(null);
  };

  const save = async () => {
    setIssues([]);
    setFormError(null);
    const trimmed = label.trim();
    const local: SchemaIssue[] = [];
    if (!trimmed || trimmed.length > 160) local.push({ path: 'displayLabel', message: 'Enter a Display Label (up to 160 characters)' });
    if (!subtype) local.push({ path: 'subtype', message: 'Select the Unit type' });
    if (local.length) {
      setIssues(local);
      return;
    }
    setSaving(true);
    try {
      const response = await propertySubmissionsApi.addUnit(propertyId, {
        displayLabel: trimmed,
        subtype,
        facts: stripHiddenAnswers(answers.facts),
        commercial: stripHiddenAnswers(answers.commercial),
        intelligence: stripHiddenAnswers(answers.intelligence),
        availabilityStatus: availability,
      });
      success(response.message);
      close();
      onAdded();
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to add this Unit');
      setIssues(scopeIssues(parsed.issues, `units.${trimmed}.`));
      setFormError(parsed.message);
      toastError(parsed.message);
    } finally {
      setSaving(false);
    }
  };

  if (!open) {
    return (
      <button type="button" className="btn-outline w-full !py-2.5 sm:w-auto" onClick={() => setOpen(true)}>
        <Plus className="h-4 w-4" /> Add Unit
      </button>
    );
  }

  return (
    <div className="space-y-4 rounded-2xl border-2 border-dashed border-veriq-secondary/40 p-4">
      <p className="font-semibold text-navy-900">New Unit</p>
      {published && <Notice tone="info">New Units on a published Property stay hidden until your Veriq Agent verifies them.</Notice>}
      {formError && <IssueList message={formError} issues={issues.filter((issue) => !issue.path.includes('.'))} />}
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="new-unit-label" className="label">Display Label <span className="text-red-500">*</span></label>
          <input id="new-unit-label" className="input" maxLength={160} value={label} placeholder="e.g. Apartment 3" onChange={(event) => setLabel(event.target.value)} />
          {issues.filter((issue) => issue.path === 'displayLabel').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-red-600">{issue.message}</p>)}
        </div>
        <div>
          <label htmlFor="new-unit-subtype" className="label">Unit type <span className="text-red-500">*</span></label>
          <select id="new-unit-subtype" className="input" value={subtype} onChange={(event) => { setSubtype(event.target.value); setAnswers({}); }}>
            <option value="">Select Unit type</option>
            {subtypes.map((item) => <option key={item.id} value={item.subtype ?? ''}>{item.label}</option>)}
          </select>
          {issues.filter((issue) => issue.path === 'subtype').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-red-600">{issue.message}</p>)}
        </div>
        <div className="sm:col-span-2">
          <span className="label">Current availability</span>
          <div className="flex gap-2">
            {(['available', 'unavailable'] as UnitAvailabilityStatus[]).map((value) => (
              <button key={value} type="button" onClick={() => setAvailability(value)} className={cn('rounded-lg border px-3 py-2 text-xs font-semibold', availability === value ? 'border-veriq-secondary bg-emerald-50' : 'border-slate-200 text-slate-600')}>
                {value === 'available' ? schema?.availabilityLabels?.available ?? 'Available' : schema?.availabilityLabels?.unavailable ?? 'Unavailable'}
              </button>
            ))}
          </div>
        </div>
      </div>
      {subtype && (loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> Loading Unit form…</p>
      ) : error || !schema ? (
        <Notice tone="error">{error ?? 'This Unit form is unavailable.'} <button type="button" className="font-semibold underline" onClick={reload}>Retry</button></Notice>
      ) : (
        <SchemaTabs schema={schema} groups={['facts', 'commercial', 'intelligence']} value={answers} onChange={setAnswers} issues={issues} idPrefix="new-unit" />
      ))}
      <p className="text-xs text-slate-500">You can save a partly completed Unit and finish it later. Add Unit media after saving.</p>
      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" className="btn-ghost" onClick={close}>Cancel</button>
        <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>{saving && <LoadingSpinner size="sm" />} Add Unit</button>
      </div>
    </div>
  );
}

// ─── Contacts ───────────────────────────────────────────────────────────

function ContactsSection({ data, disabled, issues, onSaved }: { data: PropertyManagerData; disabled: boolean; issues: SchemaIssue[]; onSaved: () => void }) {
  const { success, error: toastError } = useToast();
  const { property, contacts } = data;
  const [editing, setEditing] = useState(false);
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [formIssues, setFormIssues] = useState<SchemaIssue[]>([]);
  const [saving, setSaving] = useState(false);
  const current = contacts.find((item) => item.isCurrent) ?? contacts[0] ?? null;

  const start = () => {
    setContact(
      current
        ? { contactType: current.contactType === 'caretaker' ? 'caretaker' : 'operator', name: current.name, phone: current.phone, whatsappPhone: current.whatsappPhone ?? '' }
        : { ...EMPTY_CONTACT, contactType: property.category === 'residential' ? 'caretaker' : 'operator' },
    );
    setFormIssues([]);
    setEditing(true);
  };

  const save = async () => {
    const { contact: input, issues: local } = toContactInput(contact);
    setFormIssues(local);
    if (!input) return;
    setSaving(true);
    try {
      const response = await propertySubmissionsApi.replaceContact(property.id, input);
      success(response.message || 'Property contact replaced');
      setEditing(false);
      onSaved();
    } catch (caught) {
      toastError(errorMessage(caught, 'Unable to replace the contact'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <SectionCard
      id="contact"
      title="Property contact"
      description={
        property.category === 'residential'
          ? 'Replace the caretaker at any time. Your account, Units, intelligence, availability history and Agent stay unchanged; the change is logged (§18.2).'
          : 'The contact renters reach after unlock. Changes are logged and shared with your Veriq Agent.'
      }
      actions={!editing && !disabled ? <button type="button" className="btn-outline !px-3 !py-2 text-xs" onClick={start}>{current ? (property.category === 'residential' ? 'Replace contact / caretaker' : 'Replace contact') : 'Add contact'}</button> : undefined}
    >
      {issues.length > 0 && <IssueList issues={issues} />}
      {current ? (
        <div className="flex flex-col gap-1 rounded-xl bg-slate-50 p-4 text-sm sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="font-semibold text-navy-900">{current.name}</p>
            <p className="text-xs text-slate-500">{current.contactType === 'caretaker' ? 'Caretaker' : 'Operator'} · {current.phone}{current.whatsappPhone && current.whatsappPhone !== current.phone ? ` · WhatsApp ${current.whatsappPhone}` : ''}</p>
          </div>
          <StatusBadge tone={current.isVerified ? 'emerald' : 'amber'}>{current.isVerified ? 'Confirmed by Veriq' : 'Awaiting Agent confirmation'}</StatusBadge>
        </div>
      ) : (
        <p className="text-sm text-slate-500">No current contact. Add one before submitting.</p>
      )}
      {editing && (
        <div className="space-y-4 rounded-xl border border-slate-200 p-4">
          <ContactFields value={contact} onChange={setContact} issues={formIssues} allowCaretaker={property.category === 'residential'} idPrefix="replace-contact" />
          <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
            <button type="button" className="btn-ghost" onClick={() => setEditing(false)}>Cancel</button>
            <button type="button" className="btn-primary" disabled={saving} onClick={() => void save()}>{saving && <LoadingSpinner size="sm" />} Save contact</button>
          </div>
        </div>
      )}
    </SectionCard>
  );
}

export default function OperatorPropertyEditorPage() {
  return (
    <OperatorGuard>
      <PropertyEditor />
    </OperatorGuard>
  );
}
