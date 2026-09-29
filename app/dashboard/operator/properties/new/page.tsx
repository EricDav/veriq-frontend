'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, ArrowRight, Building2, CheckCircle2, ChevronDown, ChevronUp, Hotel, Plus, Save, Send, Trash2, Warehouse } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { propertySchemasApi, propertySubmissionsApi } from '@/lib/api/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  CATEGORY_DESCRIPTIONS,
  CATEGORY_LABELS,
  ContactFields,
  EMPTY_CONTACT,
  EMPTY_LOCATION,
  IssueList,
  LocationSelector,
  Notice,
  ListingDeclarationPanel,
  OperatorGuard,
  SchemaForm,
  SchemaTabs,
  SectionCard,
  formatLocation,
  parseApiError,
  prefixIssues,
  scopeIssues,
  stripHiddenAnswers,
  toContactInput,
  toSubmissionLocation,
  useCatalogue,
  useSchema,
  type ContactValue,
  type LocationValue,
} from '@/components/listing-forms';
import { PostingGate, useListingDeclaration, usePostingReadiness } from '@/components/listing-forms';
import type {
  FormSchema,
  OperatorPropertyCategory,
  SchemaAnswers,
  SchemaCatalogueSubtype,
  SchemaIssue,
  UnitAvailabilityStatus,
  UnitSubmissionInput,
} from '@/types/operator';
import { buttonClass } from '@/components/ui';

interface DraftUnit {
  localId: string;
  displayLabel: string;
  subtype: string;
  answers: SchemaAnswers;
  availabilityStatus: UnitAvailabilityStatus;
}

const STEPS = [
  { key: 'category', label: 'Category' },
  { key: 'location', label: 'Location' },
  { key: 'property', label: 'Property details' },
  { key: 'units', label: 'Units' },
  { key: 'contact', label: 'Contact' },
  { key: 'review', label: 'Review & submit' },
] as const;

const CATEGORY_ICONS: Record<OperatorPropertyCategory, typeof Building2> = {
  residential: Building2,
  short_let: Hotel,
  hostel: Warehouse,
};

let unitSequence = 0;
const newLocalId = () => `unit-${Date.now().toString(36)}-${(unitSequence += 1)}`;

function stepForIssue(path: string): number {
  if (path.startsWith('title') || path.startsWith('knownUnitCount') || path.startsWith('location')) return 1;
  if (path.startsWith('property.')) return 2;
  if (path.startsWith('units')) return 3;
  if (path.startsWith('contact')) return 4;
  return 5;
}

function CreatePropertyWizard() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();
  const { catalogue, loading: catalogueLoading, error: catalogueError, reload: reloadCatalogue } = useCatalogue();

  const [step, setStep] = useState(0);
  const [category, setCategory] = useState<OperatorPropertyCategory | null>(null);
  const [title, setTitle] = useState('');
  const [knownUnitCount, setKnownUnitCount] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [propertyAnswers, setPropertyAnswers] = useState<SchemaAnswers>({});
  const [units, setUnits] = useState<DraftUnit[]>([]);
  const [expandedUnit, setExpandedUnit] = useState<string | null>(null);
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'validate' | 'draft' | 'submit' | null>(null);
  const declaration = useListingDeclaration();
  const [validated, setValidated] = useState(false);
  const [createdId, setCreatedId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    setContact((current) =>
      current.name || current.phone
        ? current
        : { ...current, name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), phone: (user.phone ?? '').replace(/[^0-9+]/g, '') },
    );
  }, [user]);

  const categoryEntry = useMemo(
    () => catalogue?.categories.find((entry) => entry.category === category) ?? null,
    [catalogue, category],
  );
  const unitSubtypes = useMemo<SchemaCatalogueSubtype[]>(
    () => categoryEntry?.subtypes.filter((subtype) => subtype.level === 'unit') ?? [],
    [categoryEntry],
  );
  const { schema: propertySchema, loading: propertySchemaLoading, error: propertySchemaError, reload: reloadPropertySchema } = useSchema(
    categoryEntry?.propertySchemaId ?? null,
  );

  const clearIssues = () => {
    setIssues([]);
    setFormError(null);
    setValidated(false);
  };

  const chooseCategory = (next: OperatorPropertyCategory) => {
    if (next === category) return;
    if ((units.length || Object.keys(propertyAnswers).length) && category) {
      const confirmed = window.confirm('Changing the category clears the property details and Units you entered. Continue?');
      if (!confirmed) return;
    }
    setCategory(next);
    setPropertyAnswers({});
    setUnits([]);
    clearIssues();
    if (next !== 'residential') setContact((current) => ({ ...current, contactType: 'operator' }));
  };

  const subtypeSchemaId = (subtype: string) => unitSubtypes.find((item) => item.subtype === subtype)?.id ?? null;

  const addUnit = () => {
    const unit: DraftUnit = {
      localId: newLocalId(),
      displayLabel: `Unit ${units.length + 1}`,
      subtype: '',
      answers: {},
      availabilityStatus: 'unavailable',
    };
    setUnits((current) => [...current, unit]);
    setExpandedUnit(unit.localId);
    setValidated(false);
  };

  const updateUnit = (localId: string, patch: Partial<DraftUnit>) => {
    setUnits((current) => current.map((unit) => (unit.localId === localId ? { ...unit, ...patch } : unit)));
    setValidated(false);
  };

  /** Rebuilds a Unit form for a new subtype and drops incompatible answers (H.1). */
  const changeSubtype = async (unit: DraftUnit, subtype: string) => {
    const schemaId = subtypeSchemaId(subtype);
    if (!schemaId) {
      updateUnit(unit.localId, { subtype, answers: {} });
      return;
    }
    const hasAnswers = Object.values(unit.answers).some((group) => group && Object.keys(group).length);
    if (!hasAnswers) {
      updateUnit(unit.localId, { subtype, answers: {} });
      return;
    }
    try {
      const response = await propertySchemasApi.validate(schemaId, unit.answers, 'draft');
      const { normalized, removed } = response.data;
      updateUnit(unit.localId, { subtype, answers: normalized });
      if (removed.length) info(`${removed.length} answer${removed.length === 1 ? '' : 's'} that do not apply to the new Unit type were removed.`);
    } catch (caught) {
      updateUnit(unit.localId, { subtype, answers: {} });
      toastError(parseApiError(caught, 'The Unit form was rebuilt without your previous answers.').message);
    }
  };

  const removeUnit = (localId: string) => {
    setUnits((current) => current.filter((unit) => unit.localId !== localId));
    setIssues((current) => current.filter((issue) => !issue.path.startsWith(`units.${localId}.`)));
  };

  // ─── Validation ────────────────────────────────────────────────────────

  const localIssues = (mode: 'draft' | 'submit'): SchemaIssue[] => {
    const found: SchemaIssue[] = [];
    if (!category) found.push({ path: 'category', message: 'Select a property category' });
    const trimmedTitle = title.trim();
    if (trimmedTitle.length < 3 || trimmedTitle.length > 300)
      found.push({ path: 'title', message: 'Enter a property title (3–300 characters)' });
    const known = Number(knownUnitCount);
    if (!Number.isInteger(known) || known < 1 || known > 2000)
      found.push({ path: 'knownUnitCount', message: 'Enter the total number of Units in the property (1–2000)' });
    else if (units.length > known)
      found.push({ path: 'knownUnitCount', message: `You documented ${units.length} Units but the property has ${known} in total` });
    found.push(...toSubmissionLocation(location).issues);
    const labels = new Map<string, string>();
    if (mode === 'submit' && units.length === 0) found.push({ path: 'units', message: 'Add at least one currently documentable Unit' });
    for (const unit of units) {
      const label = unit.displayLabel.trim();
      if (!label || label.length > 160) found.push({ path: `units.${unit.localId}.displayLabel`, message: 'Each Unit needs a Display Label (up to 160 characters)' });
      else if (labels.has(label.toLowerCase())) found.push({ path: `units.${unit.localId}.displayLabel`, message: `"${label}" is already used by another Unit` });
      labels.set(label.toLowerCase(), unit.localId);
      if (!unit.subtype) found.push({ path: `units.${unit.localId}.subtype`, message: `${label || 'Unit'}: select the Unit type` });
    }
    const contactProvided = contact.name.trim() || contact.phone.trim();
    if (mode === 'submit' || contactProvided) found.push(...toContactInput(contact).issues);
    return found;
  };

  const serverIssues = async (mode: 'draft' | 'submit'): Promise<SchemaIssue[]> => {
    const found: SchemaIssue[] = [];
    if (categoryEntry?.propertySchemaId) {
      const response = await propertySchemasApi.validate(
        categoryEntry.propertySchemaId,
        { facts: stripHiddenAnswers(propertyAnswers.facts), intelligence: stripHiddenAnswers(propertyAnswers.intelligence) },
        mode,
      );
      found.push(...prefixIssues(response.data.issues, 'property.'));
    }
    const checks = units
      .filter((unit) => unit.subtype && subtypeSchemaId(unit.subtype))
      .map(async (unit) => {
        const response = await propertySchemasApi.validate(subtypeSchemaId(unit.subtype)!, unitPayloadAnswers(unit), mode);
        return prefixIssues(response.data.issues, `units.${unit.localId}.`);
      });
    for (const result of await Promise.all(checks)) found.push(...result);
    return found;
  };

  /** Maps backend `units.<Display Label>.` paths to local Unit ids so issues land on the right Unit card. */
  const mapBackendIssues = (backend: SchemaIssue[]) =>
    backend.map((issue) => {
      if (!issue.path.startsWith('units.')) return issue;
      const match = units.find((unit) => issue.path.startsWith(`units.${unit.displayLabel.trim()}.`));
      return match ? { ...issue, path: `units.${match.localId}.${issue.path.slice(`units.${match.displayLabel.trim()}.`.length)}` } : issue;
    });

  const runValidation = async (mode: 'draft' | 'submit') => {
    const local = localIssues(mode);
    let remote: SchemaIssue[] = [];
    try {
      remote = await serverIssues(mode);
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to validate your answers');
      setFormError(parsed.message);
      return null;
    }
    const all = [...local, ...remote];
    setIssues(all);
    return all;
  };

  const buildPayload = () => {
    const { location: submissionLocation } = toSubmissionLocation(location);
    const { contact: contactInput } = toContactInput(contact);
    const unitInputs: UnitSubmissionInput[] = units.map((unit) => ({
      displayLabel: unit.displayLabel.trim(),
      subtype: unit.subtype,
      ...unitPayloadAnswers(unit),
      availabilityStatus: unit.availabilityStatus,
    }));
    return {
      category: category as OperatorPropertyCategory,
      title: title.trim(),
      knownUnitCount: Number(knownUnitCount),
      location: submissionLocation!,
      property: {
        facts: stripHiddenAnswers(propertyAnswers.facts),
        intelligence: stripHiddenAnswers(propertyAnswers.intelligence),
      },
      units: unitInputs,
      ...(contactInput ? { contact: contactInput } : {}),
    };
  };

  const check = async () => {
    setBusy('validate');
    setFormError(null);
    const found = await runValidation('submit');
    setBusy(null);
    if (found) setValidated(found.length === 0);
  };

  const save = async (submit: boolean) => {
    setBusy(submit ? 'submit' : 'draft');
    setFormError(null);
    const found = await runValidation(submit ? 'submit' : 'draft');
    if (!found) {
      setBusy(null);
      return;
    }
    if (found.length) {
      setBusy(null);
      setFormError(submit ? 'Fix the highlighted issues before submitting.' : 'Fix the highlighted issues before saving the draft.');
      return;
    }
    let propertyId: string;
    try {
      const response = await propertySubmissionsApi.create(buildPayload());
      propertyId = response.data.property.id;
      setCreatedId(propertyId);
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to save the property draft');
      setIssues(mapBackendIssues(parsed.issues));
      setFormError(parsed.message);
      setBusy(null);
      return;
    }
    if (!submit) {
      success('Property draft saved. Add media and verification evidence next.');
      router.push(`/dashboard/operator/properties/${propertyId}`);
      return;
    }
    try {
      const response = await propertySubmissionsApi.submit(propertyId, declaration.payload!);
      success(response.message || 'Submitted for verification');
      router.push(`/dashboard/operator/properties/${propertyId}`);
    } catch (caught) {
      const parsed = parseApiError(caught, 'The draft was saved but could not be submitted');
      setIssues(mapBackendIssues(parsed.issues));
      setFormError(`Your draft was saved, but submission needs attention: ${parsed.message}`);
      setBusy(null);
    }
  };

  // ─── Render ────────────────────────────────────────────────────────────

  if (catalogueLoading) return <PageLoader />;
  if (catalogueError || !catalogue) {
    return (
      <div className="mx-auto max-w-3xl">
        <Notice tone="error" title="Property categories could not be loaded">
          <p>{catalogueError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={reloadCatalogue}>Try again</button>
        </Notice>
      </div>
    );
  }

  const issueCount = (index: number) => issues.filter((issue) => stepForIssue(issue.path) === index).length;
  const locked = !!createdId;
  const goNext = () => {
    if (step === 0 && !category) {
      toastError('Select a property category to continue.');
      return;
    }
    if (step === 0 && category && !categoryEntry?.propertySchemaId) {
      toastError('This category is not available for submissions right now.');
      return;
    }
    setStep((current) => Math.min(current + 1, STEPS.length - 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };
  const goBack = () => {
    setStep((current) => Math.max(current - 1, 0));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const fieldIssues = (path: string) =>
    issues.filter((issue) => issue.path === path).map((issue) => (
      <p key={issue.message} className="mt-1 text-xs font-medium text-destructive">{issue.message}</p>
    ));

  return (
    <div className="mx-auto max-w-4xl space-y-5 pb-24">
      <div>
        <Link href="/dashboard/operator/properties" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> My Properties
        </Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">Add Property</h1>
        <p className="text-sm text-muted-foreground">
          Your property stays private until your Veriq Agent verifies and publishes it. Listing on Veriq is free.
        </p>
      </div>

      <nav aria-label="Steps" className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
        <ol className="flex min-w-max gap-2">
          {STEPS.map((item, index) => {
            const count = issueCount(index);
            const disabled = index > 0 && !category;
            return (
              <li key={item.key}>
                <button
                  type="button"
                  disabled={disabled}
                  onClick={() => setStep(index)}
                  className={cn(
                    'flex items-center gap-2 rounded-full border px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-40',
                    step === index ? 'border-primary bg-primary text-primary-foreground' : 'border-[#ffffff18] bg-card text-muted-foreground',
                  )}
                  aria-current={step === index ? 'step' : undefined}
                >
                  <span>{index + 1}. {item.label}</span>
                  {count > 0 && <span className={cn('rounded-full px-1.5 text-[10px]', step === index ? 'bg-[#ffffff25] text-primary-foreground' : 'bg-[#fb718518] text-[#fda4af]')}>{count}</span>}
                </button>
              </li>
            );
          })}
        </ol>
      </nav>

      {locked && (
        <Notice tone="warning" title="Draft saved">
          <p>
            Your property was saved as a draft. Continue in the property editor to fix the remaining issues, add media and evidence, and submit.
          </p>
          <Link href={`/dashboard/operator/properties/${createdId}`} className={buttonClass('primary', 'default', 'mt-2')}>Open draft editor</Link>
        </Notice>
      )}

      {formError && <IssueList message={formError} issues={step === 5 ? issues : issues.filter((issue) => stepForIssue(issue.path) === step)} />}

      <fieldset disabled={locked} className="space-y-5">
        {step === 0 && (
          <SectionCard title="What are you listing?" description="Shared rooms in a home you live in are listed as Shared Property opportunities instead.">
            <div className="grid gap-3 sm:grid-cols-3">
              {(Object.keys(CATEGORY_LABELS) as OperatorPropertyCategory[]).map((value) => {
                const Icon = CATEGORY_ICONS[value];
                const entry = catalogue.categories.find((item) => item.category === value);
                const unavailable = !entry?.propertySchemaId;
                return (
                  <button
                    key={value}
                    type="button"
                    disabled={unavailable}
                    onClick={() => chooseCategory(value)}
                    className={cn(
                      'flex flex-col gap-2 rounded-2xl border-2 p-4 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-50',
                      category === value ? 'border-primary bg-[#10b98112]' : 'border-[#ffffff18] hover:border-input',
                    )}
                  >
                    <Icon className={cn('h-6 w-6', category === value ? 'text-primary' : 'text-muted-foreground')} />
                    <span className="font-semibold text-foreground">{CATEGORY_LABELS[value]}</span>
                    <span className="text-xs text-muted-foreground">{unavailable ? 'Not accepting submissions' : CATEGORY_DESCRIPTIONS[value]}</span>
                  </button>
                );
              })}
            </div>
            <p className="text-xs text-muted-foreground">
              Offering a room or bedspace in the home you live in?{' '}
              <Link href="/dashboard/operator/shared/new" className="font-semibold text-primary">Create a Shared Property opportunity</Link>.
            </p>
          </SectionCard>
        )}

        {step === 1 && (
          <SectionCard title="Property and location" description="Select the canonical location. The exact address is private until unlock.">
            <div className="grid gap-4 sm:grid-cols-[1fr_200px]">
              <div>
                <label htmlFor="property-title" className="label">Property title <span className="text-destructive">*</span></label>
                <input id="property-title" className="input" maxLength={300} value={title} placeholder="e.g. Adeyemi Court, Rumuola" onChange={(event) => { setTitle(event.target.value); setValidated(false); }} />
                {fieldIssues('title')}
              </div>
              <div>
                <label htmlFor="known-units" className="label">Total Units in property <span className="text-destructive">*</span></label>
                <input id="known-units" className="input" type="number" inputMode="numeric" min={1} max={2000} step={1} value={knownUnitCount} onChange={(event) => { setKnownUnitCount(event.target.value); setValidated(false); }} />
                <p className="mt-1 text-xs text-muted-foreground">All apartments/rooms, including occupied ones.</p>
                {fieldIssues('knownUnitCount')}
              </div>
            </div>
            <LocationSelector value={location} onChange={(next) => { setLocation(next); setValidated(false); }} issues={issues} idPrefix="new-property-location" />
          </SectionCard>
        )}

        {step === 2 && (
          <SectionCard
            title={propertySchema ? `${propertySchema.label} details` : 'Property details'}
            description="Facts and intelligence shared by the whole property. Unit-specific details are captured on each Unit (§31.1–31.3)."
          >
            {propertySchemaLoading ? (
              <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoadingSpinner size="sm" /> Loading form…</p>
            ) : propertySchemaError || !propertySchema ? (
              <Notice tone="error">
                {propertySchemaError ?? 'The property form is not available.'}{' '}
                <button type="button" className="font-semibold underline" onClick={reloadPropertySchema}>Retry</button>
              </Notice>
            ) : (
              <SchemaForm
                schema={propertySchema}
                groups={['facts', 'intelligence']}
                value={propertyAnswers}
                onChange={(next) => { setPropertyAnswers(next); setValidated(false); }}
                issues={scopeIssues(issues, 'property.')}
                idPrefix="new-property"
                groupTitles={{ facts: 'Property facts', intelligence: 'Property intelligence' }}
              />
            )}
          </SectionCard>
        )}

        {step === 3 && (
          <SectionCard
            title="Units"
            description="Add the Units you can document now. You can add more later as they become documentable without disturbing occupants (§9.4)."
            actions={<button type="button" className={buttonClass('secondary', 'small')} onClick={addUnit}><Plus className="h-4 w-4" /> Add Unit</button>}
          >
            {fieldIssues('units')}
            {units.length === 0 ? (
              <div className="rounded-xl border border-dashed border-[#ffffff18] p-6 text-center">
                <p className="text-sm text-muted-foreground">No Units added yet. At least one Unit is required to submit.</p>
                <button type="button" className={buttonClass('primary', 'default', 'mt-3')} onClick={addUnit}><Plus className="h-4 w-4" /> Add first Unit</button>
              </div>
            ) : (
              <div className="space-y-3">
                {units.map((unit) => (
                  <DraftUnitCard
                    key={unit.localId}
                    unit={unit}
                    subtypes={unitSubtypes}
                    schemaId={unit.subtype ? subtypeSchemaId(unit.subtype) : null}
                    expanded={expandedUnit === unit.localId}
                    onToggle={() => setExpandedUnit((current) => (current === unit.localId ? null : unit.localId))}
                    issues={scopeIssues(issues, `units.${unit.localId}.`)}
                    onLabel={(displayLabel) => updateUnit(unit.localId, { displayLabel })}
                    onSubtype={(subtype) => void changeSubtype(unit, subtype)}
                    onAnswers={(answers) => updateUnit(unit.localId, { answers })}
                    onAvailability={(availabilityStatus) => updateUnit(unit.localId, { availabilityStatus })}
                    onRemove={() => removeUnit(unit.localId)}
                  />
                ))}
              </div>
            )}
          </SectionCard>
        )}

        {step === 4 && (
          <SectionCard
            title="Property contact"
            description="Renters reach this contact only after unlocking. Caretakers are replaceable contacts and never get account access (§18.2)."
          >
            <ContactFields value={contact} onChange={(next) => { setContact(next); setValidated(false); }} issues={issues} allowCaretaker={category === 'residential'} idPrefix="new-property" />
          </SectionCard>
        )}

        {step === 5 && (
          <SectionCard title="Review" description="Check your submission. Your Veriq Agent verifies every detail before publication.">
            <dl className="grid gap-3 text-sm sm:grid-cols-2">
              <ReviewRow label="Category" value={category ? CATEGORY_LABELS[category] : 'Not selected'} onEdit={() => setStep(0)} />
              <ReviewRow label="Title" value={title.trim() || 'Not entered'} onEdit={() => setStep(1)} />
              <ReviewRow label="Units" value={`${units.length} documented of ${knownUnitCount || '—'} total`} onEdit={() => setStep(3)} />
              <ReviewRow label="Contact" value={contact.name ? `${contact.name} · ${contact.phone}` : 'Not entered'} onEdit={() => setStep(4)} />
              <ReviewRow label="Location" value={formatLocation(location) || 'Not selected'} onEdit={() => setStep(1)} wide />
            </dl>
            {units.length > 0 && (
              <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff18] text-sm">
                {units.map((unit) => (
                  <li key={unit.localId} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <span className="font-medium text-foreground">{unit.displayLabel || 'Unnamed Unit'}</span>
                    <span className="text-xs text-muted-foreground">
                      {unitSubtypes.find((item) => item.subtype === unit.subtype)?.label ?? 'Type not selected'} · {unit.availabilityStatus === 'available' ? 'Available' : 'Unavailable'}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {issues.length > 0 && (
              <div className="space-y-2">
                <IssueList title={`${issues.length} item${issues.length === 1 ? '' : 's'} need attention`} issues={issues} />
                <div className="flex flex-wrap gap-2">
                  {[1, 2, 3, 4].filter((index) => issueCount(index) > 0).map((index) => (
                    <button key={index} type="button" className={buttonClass('secondary', 'small')} onClick={() => setStep(index)}>
                      Fix {STEPS[index].label} ({issueCount(index)})
                    </button>
                  ))}
                </div>
              </div>
            )}
            {validated && issues.length === 0 && (
              <Notice tone="success" title="Ready to submit">All required answers are complete. Media and evidence can be added right after submission.</Notice>
            )}

            <Notice tone="info">
              After saving, open the property editor to upload category-based images for the property and each Unit, and private identity/authority evidence for your Agent.
            </Notice>

            <ListingDeclarationPanel state={declaration} idPrefix="new-property-declaration" disabled={busy !== null} />

            <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
              <button type="button" className={buttonClass('ghost')} disabled={busy !== null} onClick={() => void check()}>
                {busy === 'validate' ? <LoadingSpinner size="sm" /> : <CheckCircle2 className="h-4 w-4" />} Check answers
              </button>
              <button type="button" className={buttonClass('secondary')} disabled={busy !== null} onClick={() => void save(false)}>
                {busy === 'draft' ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />} Save draft
              </button>
              <button
                type="button"
                className={buttonClass()}
                disabled={busy !== null || !declaration.canSubmit}
                onClick={() => void save(true)}
              >
                {busy === 'submit' ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />} Save &amp; submit for verification
              </button>
            </div>
          </SectionCard>
        )}
      </fieldset>

      {step < 5 && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#ffffff18] bg-[#111827f2] px-4 py-3 backdrop-blur lg:static lg:border-0 lg:bg-transparent lg:p-0">
          <div className="mx-auto flex max-w-4xl items-center justify-between gap-2">
            <button type="button" className={buttonClass('ghost')} disabled={step === 0} onClick={goBack}>
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <button type="button" className={buttonClass()} onClick={goNext}>
              Continue <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function unitPayloadAnswers(unit: DraftUnit): SchemaAnswers {
  return {
    facts: stripHiddenAnswers(unit.answers.facts),
    commercial: stripHiddenAnswers(unit.answers.commercial),
    intelligence: stripHiddenAnswers(unit.answers.intelligence),
  };
}

function ReviewRow({ label, value, onEdit, wide }: { label: string; value: string; onEdit: () => void; wide?: boolean }) {
  return (
    <div className={cn('rounded-xl bg-[#070b1444] px-4 py-3', wide && 'sm:col-span-2')}>
      <dt className="flex items-center justify-between text-xs text-muted-foreground">
        {label}
        <button type="button" className="font-semibold text-primary" onClick={onEdit}>Edit</button>
      </dt>
      <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
    </div>
  );
}

function DraftUnitCard({
  unit,
  subtypes,
  schemaId,
  expanded,
  onToggle,
  issues,
  onLabel,
  onSubtype,
  onAnswers,
  onAvailability,
  onRemove,
}: {
  unit: DraftUnit;
  subtypes: SchemaCatalogueSubtype[];
  schemaId: string | null;
  expanded: boolean;
  onToggle: () => void;
  issues: SchemaIssue[];
  onLabel: (value: string) => void;
  onSubtype: (value: string) => void;
  onAnswers: (answers: SchemaAnswers) => void;
  onAvailability: (value: UnitAvailabilityStatus) => void;
  onRemove: () => void;
}) {
  const { schema, loading, error, reload } = useSchema(schemaId);
  const subtypeLabel = subtypes.find((item) => item.subtype === unit.subtype)?.label;
  return (
    <div className={cn('rounded-2xl border', issues.length ? 'border-[#fb718530]' : 'border-[#ffffff18]')}>
      <button type="button" onClick={onToggle} className="flex w-full items-center justify-between gap-3 p-4 text-left" aria-expanded={expanded}>
        <div className="min-w-0">
          <p className="truncate font-semibold text-foreground">{unit.displayLabel || 'Unnamed Unit'}</p>
          <p className="text-xs text-muted-foreground">{subtypeLabel ?? 'Select the Unit type'}</p>
        </div>
        <div className="flex items-center gap-2">
          {issues.length > 0 && <span className="rounded-full bg-[#fb718518] px-2 py-0.5 text-[11px] font-bold text-[#fda4af]">{issues.length}</span>}
          {expanded ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
        </div>
      </button>
      {expanded && (
        <div className="space-y-4 border-t border-[#ffffff10] p-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor={`${unit.localId}-label`} className="label">Unit Display Label <span className="text-destructive">*</span></label>
              <input id={`${unit.localId}-label`} className="input" maxLength={160} value={unit.displayLabel} placeholder="e.g. Apartment 1, Room B2" onChange={(event) => onLabel(event.target.value)} />
              <p className="mt-1 text-xs text-muted-foreground">Unique within this property and kept stable for history.</p>
              {issues.filter((issue) => issue.path === 'displayLabel').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-destructive">{issue.message}</p>)}
            </div>
            <div>
              <label htmlFor={`${unit.localId}-subtype`} className="label">Unit type <span className="text-destructive">*</span></label>
              <select id={`${unit.localId}-subtype`} className="input" value={unit.subtype} onChange={(event) => onSubtype(event.target.value)}>
                <option value="">Select Unit type</option>
                {subtypes.map((subtype) => (
                  <option key={subtype.id} value={subtype.subtype ?? ''}>{subtype.label}</option>
                ))}
              </select>
              {issues.filter((issue) => issue.path === 'subtype').map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-destructive">{issue.message}</p>)}
            </div>
            <div className="sm:col-span-2">
              <span className="label">Current availability</span>
              <div className="flex gap-2">
                {(['available', 'unavailable'] as UnitAvailabilityStatus[]).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => onAvailability(status)}
                    className={cn('rounded-lg border px-3 py-2 text-xs font-semibold', unit.availabilityStatus === status ? 'border-primary bg-[#10b98112] text-foreground' : 'border-[#ffffff18] text-muted-foreground')}
                  >
                    {status === 'available' ? (schema?.availabilityLabels?.available ?? 'Available') : (schema?.availabilityLabels?.unavailable ?? 'Unavailable')}
                  </button>
                ))}
              </div>
              <p className="mt-1 text-xs text-muted-foreground">Units are shown to renters only after Veriq Agent verification.</p>
            </div>
          </div>

          {!unit.subtype ? (
            <p className="rounded-lg border border-dashed border-[#ffffff18] px-4 py-3 text-sm text-muted-foreground">Select the Unit type to load its questions.</p>
          ) : loading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoadingSpinner size="sm" /> Loading {subtypeLabel} form…</p>
          ) : error || !schema ? (
            <Notice tone="error">
              {error ?? 'This Unit type form is unavailable.'}{' '}
              <button type="button" className="font-semibold underline" onClick={reload}>Retry</button>
            </Notice>
          ) : (
            <UnitSchemaSection schema={schema} unit={unit} issues={issues} onAnswers={onAnswers} />
          )}

          <div className="flex justify-end">
            <button type="button" className="inline-flex items-center gap-1.5 text-xs font-semibold text-destructive" onClick={onRemove}>
              <Trash2 className="h-3.5 w-3.5" /> Remove Unit
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function UnitSchemaSection({ schema, unit, issues, onAnswers }: { schema: FormSchema; unit: DraftUnit; issues: SchemaIssue[]; onAnswers: (answers: SchemaAnswers) => void }) {
  return (
    <SchemaTabs
      schema={schema}
      groups={['facts', 'commercial', 'intelligence']}
      value={unit.answers}
      onChange={onAnswers}
      issues={issues}
      idPrefix={unit.localId}
    />
  );
}

export default function NewOperatorPropertyPage() {
  return (
    <OperatorGuard>
      <PostingGateway />
    </OperatorGuard>
  );
}

/**
 * Before posting, the Operator needs phone OTP, a government ID and a selfie holding that ID (Master Blueprint §3).
 * Blocking the wizard here explains what is missing instead of letting the submit fail at the server.
 */
function PostingGateway() {
  const readiness = usePostingReadiness();
  return (
    <PostingGate state={readiness}>
      <CreatePropertyWizard />
    </PostingGate>
  );
}
