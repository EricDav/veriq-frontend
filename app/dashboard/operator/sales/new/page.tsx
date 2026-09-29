'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Landmark, Save, Send } from 'lucide-react';
import { ownerSaleListingsApi } from '@/lib/api/operator';
import type { AnswerMap, SalePriceBasis, SaleSubtype, SchemaAnswers, SchemaIssue } from '@/types/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { FieldShell, Select } from '@/components/ui/Select';
import {
  EMPTY_LOCATION,
  IssueList,
  ListingDeclarationPanel,
  LocationSelector,
  Notice,
  OperatorGuard,
  PostingGate,
  SchemaTabs,
  SectionCard,
  parseApiError,
  toSubmissionLocation,
  useListingDeclaration,
  usePostingReadiness,
  useSchema,
  type LocationValue,
} from '@/components/listing-forms';
import { formatNaira } from '@/components/renter/format';
import { buttonClass } from '@/components/ui';

const SUBTYPES = [
  { value: 'built_property', label: 'Built Property — a house, flat or other building' },
  { value: 'land', label: 'Land — a plot or parcel' },
];

const PRICE_BASIS: Record<SaleSubtype, Array<{ value: SalePriceBasis; label: string }>> = {
  built_property: [{ value: 'total', label: 'Total price' }],
  land: [
    { value: 'total', label: 'Total price' },
    { value: 'per_plot', label: 'Per plot' },
    { value: 'per_square_metre', label: 'Per square metre' },
  ],
};

const NEGOTIABILITY = [
  { value: 'yes', label: 'Negotiable' },
  { value: 'no', label: 'Fixed price' },
];

const EMPTY_ANSWERS: SchemaAnswers = { facts: {}, commercial: {}, intelligence: {} };

/**
 * Owner submission for Property for Sale (Master Blueprint §6): the owner actively declares ownership and authority
 * to sell, supplies the facts, price and intelligence, and accepts the Veriq listing declaration. A Veriq Agent then
 * visits the property, reviews the documents and signs the representation agreement before publication.
 */
function OwnerSaleSubmissionForm() {
  const router = useRouter();
  const { success } = useToast();
  const declaration = useListingDeclaration();

  const [subtype, setSubtype] = useState('');
  const [title, setTitle] = useState('');
  const [askingPrice, setAskingPrice] = useState('');
  const [priceBasis, setPriceBasis] = useState('');
  const [negotiable, setNegotiable] = useState('');
  const [location, setLocation] = useState<LocationValue>(EMPTY_LOCATION);
  const [answers, setAnswers] = useState<SchemaAnswers>(EMPTY_ANSWERS);
  const [ownerDeclaration, setOwnerDeclaration] = useState(false);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState<'draft' | 'submit' | null>(null);

  const schemaId = subtype ? `for_sale.sale.${subtype}` : null;
  const { schema, loading: schemaLoading, error: schemaError, reload: reloadSchema } = useSchema(schemaId);

  const price = Number(askingPrice);
  const locationResult = useMemo(() => toSubmissionLocation(location), [location]);

  const validate = (): SchemaIssue[] => {
    const found: SchemaIssue[] = [];
    if (!subtype) found.push({ path: 'subtype', message: 'Choose whether this is a Built Property or Land' });
    if (title.trim().length < 3) found.push({ path: 'title', message: 'Give the listing a title of at least 3 characters' });
    if (!Number.isFinite(price) || price < 1) found.push({ path: 'askingPrice', message: 'Enter the asking price in whole naira' });
    if (!priceBasis) found.push({ path: 'priceBasis', message: 'Choose the price basis' });
    if (!ownerDeclaration)
      found.push({ path: 'ownerDeclaration', message: 'Confirm that you own this property and are authorised to sell it' });
    return [...found, ...locationResult.issues];
  };

  const save = async (andSubmit: boolean) => {
    const found = validate();
    if (andSubmit && !declaration.payload) {
      found.push({ path: 'declaration', message: 'Accept the Veriq listing declaration to submit' });
    }
    setIssues(found);
    setFormError(null);
    if (found.length) return;

    setBusy(andSubmit ? 'submit' : 'draft');
    let saleId: string;
    try {
      const res = await ownerSaleListingsApi.create({
        ownerDeclaration: true,
        subtype: subtype as SaleSubtype,
        title: title.trim(),
        askingPrice: Math.trunc(price),
        priceBasis: priceBasis as SalePriceBasis,
        ...(negotiable ? { negotiable: negotiable === 'yes' } : {}),
        ...(locationResult.location ? { location: locationResult.location } : {}),
        facts: answers.facts as AnswerMap,
        intelligence: answers.intelligence as AnswerMap,
      });
      saleId = res.data.sale.id;
    } catch (caught) {
      const parsed = parseApiError(caught, 'Your sale submission could not be saved');
      setIssues(parsed.issues);
      setFormError(parsed.message);
      setBusy(null);
      return;
    }

    if (!andSubmit) {
      success('Draft saved. Upload your ownership documents and photos next.');
      router.push(`/dashboard/operator/sales/${saleId}`);
      return;
    }

    try {
      const res = await ownerSaleListingsApi.submit(saleId, declaration.payload!);
      success(res.message || 'Submitted to Veriq');
      router.push(`/dashboard/operator/sales/${saleId}`);
    } catch (caught) {
      const parsed = parseApiError(caught, 'The draft was saved but could not be submitted');
      setIssues(parsed.issues);
      setFormError(`Your draft was saved, but submission needs attention: ${parsed.message}`);
      setBusy(null);
      router.push(`/dashboard/operator/sales/${saleId}`);
    }
  };

  const issueFor = (path: string) => issues.find((issue) => issue.path === path)?.message;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-1">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <Landmark className="h-5 w-5 text-primary" /> Submit a property for sale
        </h1>
        <p className="text-sm leading-6 text-muted-foreground">
          Only the owner may ask Veriq to represent a sale. Your listing will be free for buyers to view, Veriq will be
          the buyer contact, and you pay a success commission only if a Veriq-generated sale completes.
        </p>
        <Link href="/dashboard/operator/sales" className="text-sm font-medium text-primary hover:underline">
          Back to my sale submissions
        </Link>
      </header>

      <SectionCard title="What you are selling">
        <div className="grid gap-3 sm:grid-cols-2">
          <Select
            id="sale-subtype"
            label="Type"
            options={SUBTYPES}
            value={subtype}
            onValueChange={(value) => {
              setSubtype(value);
              setPriceBasis('');
              setAnswers(EMPTY_ANSWERS);
            }}
            required
            error={issueFor('subtype')}
            fieldClassName="sm:col-span-2"
          />
          <FieldShell htmlFor="sale-title" label="Listing title" required error={issueFor('title')} className="sm:col-span-2">
            <input
              id="sale-title"
              className="input"
              maxLength={300}
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="e.g. 4-bedroom detached house in Woji"
            />
          </FieldShell>
          <FieldShell
            htmlFor="sale-asking-price"
            label="Asking price (₦)"
            required
            hint={Number.isFinite(price) && price > 0 ? formatNaira(price) : undefined}
            error={issueFor('askingPrice')}
          >
            <input
              id="sale-asking-price"
              className="input"
              type="number"
              min={1}
              step={1}
              value={askingPrice}
              onChange={(event) => setAskingPrice(event.target.value)}
            />
          </FieldShell>
          <Select
            id="sale-price-basis"
            label="Price basis"
            options={subtype ? PRICE_BASIS[subtype as SaleSubtype] : []}
            value={priceBasis}
            onValueChange={setPriceBasis}
            required
            disabled={!subtype}
            hint={subtype ? undefined : 'Choose the type first.'}
            error={issueFor('priceBasis')}
          />
          <Select
            id="sale-negotiable"
            label="Is the price negotiable?"
            placeholder="Prefer not to say"
            options={NEGOTIABILITY}
            value={negotiable}
            onValueChange={setNegotiable}
            optional
            fieldClassName="sm:col-span-2"
          />
        </div>
      </SectionCard>

      <SectionCard
        title="Where it is"
        description="The exact address stays private until Veriq publishes, and it is never shown to buyers on the listing."
      >
        <LocationSelector
          value={location}
          onChange={setLocation}
          issues={issues.filter((issue) => issue.path.startsWith('location'))}
          idPrefix="sale-location"
          disabled={busy !== null}
        />
      </SectionCard>

      {subtype && (
        <SectionCard title="Property facts and intelligence" description="Answer what applies. Veriq confirms these on the physical visit.">
          {schemaLoading ? (
            <p className="flex items-center gap-2 text-sm text-muted-foreground">
              <LoadingSpinner size="sm" /> Loading the form for this property type…
            </p>
          ) : schemaError || !schema ? (
            <Notice tone="error">
              {schemaError ?? 'This form is unavailable right now.'}{' '}
              <button type="button" className="font-semibold underline" onClick={reloadSchema}>
                Try again
              </button>
            </Notice>
          ) : (
            <SchemaTabs
              schema={schema}
              groups={['facts', 'intelligence']}
              value={answers}
              onChange={setAnswers}
              issues={issues}
              idPrefix="sale-answers"
            />
          )}
        </SectionCard>
      )}

      <SectionCard title="Your declarations" description="Both are active choices: neither is ticked for you.">
        <div className="space-y-4">
          <label
            htmlFor="owner-declaration"
            className="flex items-start gap-2.5 rounded-xl border border-[#ffffff18] bg-[#070b1444] p-4 text-sm text-foreground"
          >
            <input
              id="owner-declaration"
              type="checkbox"
              className="mt-0.5 h-4 w-4 flex-shrink-0 accent-[#10b981]"
              checked={ownerDeclaration}
              onChange={(event) => setOwnerDeclaration(event.target.checked)}
            />
            <span>
              I own this property and I am authorised to sell it. I understand Veriq will review my ownership and
              authority-to-sell documents, that the review is not a legal title guarantee, and that Veriq will be the
              buyer contact for this listing.
            </span>
          </label>
          {issueFor('ownerDeclaration') && (
            <p role="alert" className="text-xs font-medium text-destructive">
              {issueFor('ownerDeclaration')}
            </p>
          )}
          <ListingDeclarationPanel state={declaration} idPrefix="sale-declaration" disabled={busy !== null} />
        </div>
      </SectionCard>

      {(formError || issues.length > 0) && <IssueList message={formError} issues={issues} />}

      <div className="flex flex-col gap-2 sm:flex-row sm:justify-end">
        <button type="button" className={buttonClass('secondary')} disabled={busy !== null} onClick={() => void save(false)}>
          {busy === 'draft' ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />} Save draft
        </button>
        <button
          type="button"
          className={buttonClass()}
          disabled={busy !== null || !declaration.canSubmit}
          onClick={() => void save(true)}
        >
          {busy === 'submit' ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />} Save &amp; submit to Veriq
        </button>
      </div>
    </div>
  );
}

export default function NewOwnerSaleListingPage() {
  return (
    <OperatorGuard>
      <SaleSubmissionGateway />
    </OperatorGuard>
  );
}

/** The pre-posting gate applies to a sale submission exactly as it does to a property (Master Blueprint §3). */
function SaleSubmissionGateway() {
  const readiness = usePostingReadiness();
  return (
    <PostingGate state={readiness} title="Finish Operator verification before you submit a property for sale">
      <OwnerSaleSubmissionForm />
    </PostingGate>
  );
}
