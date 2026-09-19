'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Building2, Landmark, Plus, UserCheck } from 'lucide-react';
import type {
  CreateSaleListingInput,
  FormSchema,
  PortfolioProperty,
  SaleContactRoute,
  SalePriceBasis,
  SaleSubtype,
  SchemaAnswers,
  SchemaIssue,
} from '@/types/agent';
import { UserRole } from '@/types';
import { agentPortfolioApi, saleListingsApi, schemasApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { AnswersFields } from '@/components/agent/AnswersEditor';
import { LocationPicker, emptyLocationDraft, locationDraftToInput, type LocationDraft } from '@/components/agent/LocationPicker';
import { describeError, formatNaira } from '@/components/agent/format';
import { ErrorBlock, Field, InlineNotice, PageHeader, PanelCard, smallButton } from '@/components/agent/ui';

const SUBTYPES: Array<{ value: SaleSubtype; label: string; description: string }> = [
  { value: 'built_property', label: 'Built Property', description: 'Bungalow, duplex, terrace, block of flats, detached or semi-detached house.' },
  { value: 'land', label: 'Land', description: 'Plots and parcels; boundaries, terrain and site access are recorded on site.' },
];

const PRICE_BASIS: Record<SaleSubtype, Array<{ value: SalePriceBasis; label: string }>> = {
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

export default function NewSaleListingPage() {
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [subtype, setSubtype] = useState<SaleSubtype>('built_property');
  const [schema, setSchema] = useState<FormSchema | null>(null);
  const [schemaError, setSchemaError] = useState('');
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<'new' | 'existing'>('new');
  const [propertyId, setPropertyId] = useState('');
  const [properties, setProperties] = useState<PortfolioProperty[]>([]);
  const [location, setLocation] = useState<LocationDraft>(emptyLocationDraft);
  const [askingPrice, setAskingPrice] = useState('');
  const [priceBasis, setPriceBasis] = useState<SalePriceBasis>('total');
  const [negotiable, setNegotiable] = useState<'' | 'yes' | 'no'>('');
  const [sellerName, setSellerName] = useState('');
  const [sellerPhone, setSellerPhone] = useState('');
  const [sellerWhatsapp, setSellerWhatsapp] = useState('');
  const [sellerIsOwner, setSellerIsOwner] = useState(true);
  const [contactRoute, setContactRoute] = useState<SaleContactRoute>('veriq_agent');
  const [answers, setAnswers] = useState<SchemaAnswers>({ facts: {}, intelligence: {} });
  const [publicKeys, setPublicKeys] = useState<string[] | null>(null);
  const [issues, setIssues] = useState<SchemaIssue[]>([]);
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    setSchemaError('');
    setSchema(null);
    schemasApi
      .get(`for_sale.sale.${subtype}`)
      .then((result) => {
        setSchema(result);
        setPublicKeys(result.fields.filter((field) => field.group === 'intelligence' && field.public && !field.component).map((field) => field.key));
      })
      .catch((err) => setSchemaError(describeError(err, 'Could not load the sale form').message));
    setPriceBasis('total');
  }, [subtype]);

  useEffect(() => {
    agentPortfolioApi
      .mine()
      .then((res) => setProperties(res.data.properties))
      .catch(() => setProperties([]));
  }, []);

  const publicOptions = useMemo(
    () => (schema ? schema.fields.filter((field) => field.group === 'intelligence' && field.type !== 'observation' && !field.component) : []),
    [schema],
  );

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="Only Veriq Agents create Property for Sale listings." />;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setFormError('');
    setIssues([]);
    if (title.trim().length < 3) return setFormError('Enter a listing title of at least 3 characters.');
    const price = Number(askingPrice);
    if (!Number.isFinite(price) || price < 1) return setFormError('Enter the asking price in whole naira.');
    if (sellerName.trim().length < 2) return setFormError('Enter the seller/owner name.');
    if (sellerPhone && !/^\+?[0-9]{10,15}$/.test(sellerPhone.trim())) return setFormError('Enter a valid seller phone number.');
    if (sellerWhatsapp && !/^\+?[0-9]{10,15}$/.test(sellerWhatsapp.trim())) return setFormError('Enter a valid WhatsApp number.');

    const payload: CreateSaleListingInput = {
      subtype,
      title: title.trim(),
      askingPrice: Math.trunc(price),
      priceBasis,
      ...(negotiable ? { negotiable: negotiable === 'yes' } : {}),
      seller: {
        name: sellerName.trim(),
        ...(sellerPhone.trim() ? { phone: sellerPhone.trim() } : {}),
        ...(sellerWhatsapp.trim() ? { whatsappPhone: sellerWhatsapp.trim() } : {}),
        isOwner: sellerIsOwner,
      },
      contactRoute,
      facts: answers.facts ?? {},
      intelligence: answers.intelligence ?? {},
      ...(publicKeys ? { publicIntelligenceKeys: publicKeys } : {}),
    };

    if (mode === 'existing') {
      if (!propertyId) return setFormError('Select the existing canonical Property.');
      payload.propertyId = propertyId;
    } else {
      const resolved = locationDraftToInput(location);
      if (!resolved) return setFormError('Complete the location: State, LGA, Veriq Area, street (or proposed street) and address.');
      payload.location = resolved;
    }

    setSubmitting(true);
    try {
      const res = await saleListingsApi.create(payload);
      success(res.message || 'Sale Listing draft created');
      router.push(`/dashboard/agent/sales/${res.data.sale.id}`);
    } catch (err) {
      const { message, details } = describeError(err, 'Could not create the Sale Listing');
      setFormError(message);
      setIssues(issuesFrom(details));
      toastError(message);
      setSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <PageHeader
        title="New Sale Listing"
        backHref="/dashboard/agent/sales"
        backLabel="Property for Sale"
        subtitle="Step 1 of the Property for Sale workflow: create the draft and link or create the canonical Property record (§8.5)."
      />

      <form onSubmit={submit} className="space-y-5">
        <PanelCard title="Subtype & title" icon={Landmark}>
          <div className="space-y-3">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {SUBTYPES.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setSubtype(option.value)}
                  className={`rounded-xl border p-3 text-left transition-colors ${subtype === option.value ? 'border-veriq-secondary bg-emerald-50' : 'border-slate-200 hover:border-navy-400'}`}
                >
                  <p className="text-sm font-semibold text-navy-900">{option.label}</p>
                  <p className="text-[11px] text-slate-500">{option.description}</p>
                </button>
              ))}
            </div>
            <Field label="Listing title">
              <input className="input !py-2 text-sm" maxLength={300} value={title} onChange={(event) => setTitle(event.target.value)} />
            </Field>
          </div>
        </PanelCard>

        <PanelCard title="Canonical Property" icon={Building2} subtitle="A sale never creates a duplicate physical Property record (§6.5).">
          <div className="space-y-3">
            <div className="flex flex-wrap gap-2">
              {[
                { value: 'new' as const, label: 'Create the canonical record from a location' },
                { value: 'existing' as const, label: 'Link an existing canonical Property' },
              ].map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => setMode(option.value)}
                  className={`rounded-full border px-3 py-1.5 text-xs font-semibold ${mode === option.value ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                >
                  {option.label}
                </button>
              ))}
            </div>
            {mode === 'existing' ? (
              <Field label="Canonical Property from your portfolio">
                <select className="input !py-2 text-sm" value={propertyId} onChange={(event) => setPropertyId(event.target.value)}>
                  <option value="">Select Property…</option>
                  {properties.map((property) => (
                    <option key={property.id} value={property.id}>
                      {property.title} — {property.area}, {property.city}
                    </option>
                  ))}
                </select>
              </Field>
            ) : (
              <LocationPicker value={location} onChange={setLocation} />
            )}
          </div>
        </PanelCard>

        <PanelCard title="Price" icon={Landmark}>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label="Asking price (₦)" hint={askingPrice ? formatNaira(Number(askingPrice)) : undefined}>
              <input className="input !py-2 text-sm" type="number" min={1} step={1} value={askingPrice} onChange={(event) => setAskingPrice(event.target.value)} />
            </Field>
            <Field label="Price basis">
              <select className="input !py-2 text-sm" value={priceBasis} onChange={(event) => setPriceBasis(event.target.value as SalePriceBasis)}>
                {PRICE_BASIS[subtype].map((option) => (
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
          </div>
        </PanelCard>

        <PanelCard title="Seller / owner" icon={UserCheck} subtitle="Identity and authority to sell are verified in the workspace before publication.">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <Field label="Seller name">
              <input className="input !py-2 text-sm" maxLength={160} value={sellerName} onChange={(event) => setSellerName(event.target.value)} />
            </Field>
            <Field label="Seller phone (optional)">
              <input className="input !py-2 text-sm" value={sellerPhone} onChange={(event) => setSellerPhone(event.target.value)} placeholder="+2348012345678" />
            </Field>
            <Field label="WhatsApp (optional)">
              <input className="input !py-2 text-sm" value={sellerWhatsapp} onChange={(event) => setSellerWhatsapp(event.target.value)} />
            </Field>
            <Field label="Buyer contact route">
              <select className="input !py-2 text-sm" value={contactRoute} onChange={(event) => setContactRoute(event.target.value as SaleContactRoute)}>
                <option value="veriq_agent">Veriq Agent handles buyer contact</option>
                <option value="seller">Seller contact released after unlock</option>
              </select>
            </Field>
            <label className="flex items-start gap-2 sm:col-span-2">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={sellerIsOwner} onChange={(event) => setSellerIsOwner(event.target.checked)} />
              <span className="text-xs text-slate-600">
                The person dealing with Veriq is the beneficial owner. Uncheck when a representative is selling — authority to sell then becomes a
                required verification step.
              </span>
            </label>
          </div>
        </PanelCard>

        <PanelCard title="Sale facts & intelligence" icon={Landmark} subtitle="Complete what you verified on site; the rest can be finished in the workspace before publication.">
          {schemaError ? (
            <ErrorBlock message={schemaError} />
          ) : !schema ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <LoadingSpinner size="sm" /> Loading the {subtype === 'land' ? 'Land' : 'Built Property'} form…
            </div>
          ) : (
            <div className="space-y-5">
              <AnswersFields schema={schema} value={answers} onChange={setAnswers} groups={['facts', 'intelligence']} issues={issues} />
              <div>
                <p className="label !text-xs">Public buyer-decision summary</p>
                <p className="mb-2 text-[11px] text-slate-400">Selected intelligence shown before unlock (Appendix D). Everything else stays protected.</p>
                <div className="flex flex-wrap gap-1.5">
                  {publicOptions.map((field) => {
                    const active = publicKeys?.includes(field.key) ?? false;
                    return (
                      <button
                        key={field.key}
                        type="button"
                        onClick={() => setPublicKeys((current) => ((current ?? []).includes(field.key) ? (current ?? []).filter((key) => key !== field.key) : [...(current ?? []), field.key]))}
                        className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${active ? 'border-navy-900 bg-navy-900 text-white' : 'border-slate-200 bg-white text-slate-600'}`}
                      >
                        {field.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}
        </PanelCard>

        <InlineNotice tone="info">
          The draft is created immediately. Seller verification, the document checklist, location verification, Street Intelligence, media and
          publication continue in the listing workspace.
        </InlineNotice>

        {formError && <ErrorBlock message={formError} />}

        <div className="flex flex-wrap justify-end gap-2 pb-6">
          <button type="button" className={smallButton} onClick={() => router.push('/dashboard/agent/sales')} disabled={submitting}>
            Cancel
          </button>
          <button type="submit" className="btn-primary !px-5 !py-2.5 text-sm" disabled={submitting || !schema}>
            {submitting ? <LoadingSpinner size="sm" /> : <Plus className="h-4 w-4" />} Create draft Sale Listing
          </button>
        </div>
      </form>
    </div>
  );
}
