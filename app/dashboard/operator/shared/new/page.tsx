'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, BedDouble, DoorOpen, Save } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { propertySchemasApi, sharedPropertiesApi } from '@/lib/api/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import {
  ContactFields,
  EMPTY_CONTACT,
  EMPTY_LOCATION,
  IssueList,
  LocationSelector,
  Notice,
  OperatorGuard,
  SHARED_TYPE_LABELS,
  SchemaTabs,
  SectionCard,
  parseApiError,
  stripHiddenAnswers,
  toContactInput,
  toSubmissionLocation,
  useCatalogue,
  useSchema,
  type ContactValue,
  type LocationValue,
} from '@/components/listing-forms';
import type { SchemaAnswers, SchemaIssue, SharedOpportunityType } from '@/types/operator';
import { buttonClass } from '@/components/ui';

const TYPE_ICONS: Record<SharedOpportunityType, typeof DoorOpen> = {
  private_room: DoorOpen,
  shared_room_bedspace: BedDouble,
};

const TYPE_DESCRIPTIONS: Record<SharedOpportunityType, string> = {
  private_room: 'You are offering a room that the incoming resident will have to themselves inside your occupied home.',
  shared_room_bedspace: 'You are offering a bed or space inside a room that is already used by one or more people.',
};

function CreateSharedOpportunity() {
  const router = useRouter();
  const { user } = useAuth();
  const { success, error: toastError } = useToast();
  const { catalogue, loading: catalogueLoading, error: catalogueError, reload: reloadCatalogue } = useCatalogue();

  const [type, setType] = useState<SharedOpportunityType | null>(null);
  const [displayLabel, setDisplayLabel] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [answers, setAnswers] = useState<SchemaAnswers>({});
  const [contact, setContact] = useState<ContactValue>(EMPTY_CONTACT);
  const [permission, setPermission] = useState(false);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!user) return;
    setContact((current) =>
      current.name || current.phone
        ? current
        : { ...current, name: `${user.firstName ?? ''} ${user.lastName ?? ''}`.trim(), phone: (user.phone ?? '').replace(/[^0-9+]/g, '') },
    );
  }, [user]);

  const sharedEntry = catalogue?.categories.find((entry) => entry.category === 'shared_property') ?? null;
  const schemaId = type ? sharedEntry?.subtypes.find((item) => item.subtype === type)?.id ?? null : null;
  const { schema, loading: schemaLoading, error: schemaError, reload: reloadSchema } = useSchema(schemaId);

  const changeType = (next: SharedOpportunityType) => {
    if (next === type) return;
    setType(next);
    setAnswers({});
    setIssues([]);
    setFormError(null);
  };

  const save = async () => {
    setFormError(null);
    const local: SchemaIssue[] = [];
    if (!type) local.push({ path: 'opportunityType', message: 'Select what you are offering' });
    const label = displayLabel.trim();
    if (label.length < 3 || label.length > 160) local.push({ path: 'displayLabel', message: 'Enter a short title (3–160 characters)' });
    local.push(...toSubmissionLocation(location).issues);
    const { contact: contactInput, issues: contactIssues } = toContactInput(contact);
    local.push(...contactIssues);
    if (!permission) local.push({ path: 'permissionDeclared', message: 'Confirm that you are permitted to share this accommodation' });

    let remote: SchemaIssue[] = [];
    if (schemaId) {
      try {
        const response = await propertySchemasApi.validate(
          schemaId,
          {
            facts: stripHiddenAnswers(answers.facts),
            commercial: stripHiddenAnswers(answers.commercial),
            intelligence: stripHiddenAnswers(answers.intelligence),
          },
          'draft',
        );
        remote = response.data.issues;
      } catch (caught) {
        setFormError(parseApiError(caught, 'Unable to validate your answers').message);
        return;
      }
    }
    const all = [...local, ...remote];
    setIssues(all);
    if (all.length) {
      setFormError('Fix the highlighted items to save this opportunity.');
      return;
    }
    setSaving(true);
    try {
      const response = await sharedPropertiesApi.create({
        opportunityType: type!,
        displayLabel: label,
        location: toSubmissionLocation(location).location!,
        facts: stripHiddenAnswers(answers.facts),
        commercial: stripHiddenAnswers(answers.commercial),
        intelligence: stripHiddenAnswers(answers.intelligence),
        contactName: contactInput!.name,
        contactPhone: contactInput!.phone,
        ...(contactInput!.whatsappPhone ? { contactWhatsappPhone: contactInput!.whatsappPhone } : {}),
        permissionDeclared: true,
      });
      success(response.message || 'Shared Property draft saved');
      router.push(`/dashboard/operator/shared/${response.data.opportunity.id}`);
    } catch (caught) {
      const parsed = parseApiError(caught, 'Unable to save this opportunity');
      setIssues(parsed.issues);
      setFormError(parsed.message);
      toastError(parsed.message);
      setSaving(false);
    }
  };

  if (catalogueLoading) return <PageLoader />;
  if (catalogueError || !catalogue) {
    return (
      <div className="mx-auto max-w-3xl">
        <Notice tone="error" title="Shared Property is unavailable right now">
          <p>{catalogueError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={reloadCatalogue}>Try again</button>
        </Notice>
      </div>
    );
  }

  const fieldIssues = (path: string) =>
    issues.filter((issue) => issue.path === path).map((issue) => <p key={issue.message} className="mt-1 text-xs font-medium text-destructive">{issue.message}</p>);

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div>
        <Link href="/dashboard/operator/shared" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"><ArrowLeft className="h-4 w-4" /> Shared Property</Link>
        <h1 className="mt-2 font-display text-2xl font-bold text-foreground">New Shared Property opportunity</h1>
        <p className="text-sm text-muted-foreground">
          For the home you currently live in. After saving you will upload proof of occupancy and images, then submit for Veriq Agent verification.
        </p>
      </div>

      {formError && <IssueList message={formError} issues={issues} />}

      <SectionCard title="What are you offering?">
        <div className="grid gap-3 sm:grid-cols-2">
          {(Object.keys(SHARED_TYPE_LABELS) as SharedOpportunityType[]).map((value) => {
            const Icon = TYPE_ICONS[value];
            const available = sharedEntry?.subtypes.some((item) => item.subtype === value);
            return (
              <button
                key={value}
                type="button"
                disabled={!available}
                onClick={() => changeType(value)}
                className={cn(
                  'flex flex-col gap-2 rounded-2xl border-2 p-4 text-left disabled:opacity-50',
                  type === value ? 'border-primary bg-[#10b98112]' : 'border-[#ffffff18] hover:border-input',
                )}
              >
                <Icon className={cn('h-6 w-6', type === value ? 'text-primary' : 'text-muted-foreground')} />
                <span className="font-semibold text-foreground">{SHARED_TYPE_LABELS[value]}</span>
                <span className="text-xs text-muted-foreground">{TYPE_DESCRIPTIONS[value]}</span>
              </button>
            );
          })}
        </div>
        {fieldIssues('opportunityType')}
        <div>
          <label htmlFor="shared-label" className="label">Opportunity title <span className="text-destructive">*</span></label>
          <input id="shared-label" className="input" maxLength={160} value={displayLabel} placeholder="e.g. Private room in 3-bedroom flat, Woji" onChange={(event) => setDisplayLabel(event.target.value)} />
          {fieldIssues('displayLabel')}
        </div>
      </SectionCard>

      <SectionCard title="Where is the home?" description="Your exact address stays private until a renter unlocks the opportunity.">
        <LocationSelector value={location} onChange={setLocation} issues={issues} idPrefix="shared-location" />
      </SectionCard>

      <SectionCard title="Household, contribution and condition" description="Answer honestly — your Veriq Agent verifies the household arrangement, contribution and condition before publication.">
        {!type ? (
          <p className="rounded-lg border border-dashed border-[#ffffff18] px-4 py-3 text-sm text-muted-foreground">Choose what you are offering to load the questions.</p>
        ) : schemaLoading ? (
          <p className="flex items-center gap-2 text-sm text-muted-foreground"><LoadingSpinner size="sm" /> Loading form…</p>
        ) : schemaError || !schema ? (
          <Notice tone="error">{schemaError ?? 'This form is unavailable.'} <button type="button" className="font-semibold underline" onClick={reloadSchema}>Retry</button></Notice>
        ) : (
          <SchemaTabs schema={schema} groups={['facts', 'commercial', 'intelligence']} value={answers} onChange={setAnswers} issues={issues} idPrefix="shared-new" />
        )}
      </SectionCard>

      <SectionCard title="Who should interested renters contact?" description="Shown only after a renter unlocks the opportunity.">
        <ContactFields value={contact} onChange={setContact} issues={issues} allowCaretaker={false} idPrefix="shared-contact" />
      </SectionCard>

      <SectionCard title="Permission declaration" description="Required by Veriq for every Shared Property opportunity (§6.4).">
        <label className="flex items-start gap-3 rounded-xl border border-[#ffffff18] p-4 text-sm">
          <input type="checkbox" className="mt-1" checked={permission} onChange={(event) => setPermission(event.target.checked)} />
          <span className="text-muted-foreground">
            I currently live in this home, I am permitted to share or sublet this space, and listing it does not breach my tenancy or any agreement with my landlord.
            I understand Veriq verifies my occupancy and may remove the opportunity if this declaration is untrue.
          </span>
        </label>
        {fieldIssues('permissionDeclared')}
      </SectionCard>

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <Link href="/dashboard/operator/shared" className={buttonClass('ghost')}>Cancel</Link>
        <button type="button" className={buttonClass()} disabled={saving} onClick={() => void save()}>
          {saving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />} Save and continue
        </button>
      </div>
      <p className="text-xs text-muted-foreground">
        Next: upload proof that you occupy this home, add the required images, then submit for verification.
      </p>
    </div>
  );
}

export default function NewSharedOpportunityPage() {
  return (
    <OperatorGuard>
      <CreateSharedOpportunity />
    </OperatorGuard>
  );
}
