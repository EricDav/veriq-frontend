'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, FileCheck2, Home, Landmark, MapPin, ShieldCheck } from 'lucide-react';
import { ApiError } from '@/lib/api';
import { saleListingsApi } from '@/lib/api/renter';
import type { SaleListingPublic } from '@/types/renter';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { ListingMediaGallery } from '@/components/renter/ListingMediaGallery';
import { SaleDocumentStatusList } from '@/components/renter/SaleDocumentStatusList';
import { SaleEnquiryForm } from '@/components/renter/SaleEnquiryForm';
import { SchemaAnswerGrid, useFormSchema } from '@/components/renter/SchemaAnswers';
import { StreetIntelligencePanel } from '@/components/renter/StreetIntelligencePanel';
import { formatDate, formatNaira, locationLine, mediaSrc } from '@/components/renter/format';

const PRICE_BASIS_LABELS: Record<string, string> = {
  total: 'Total price',
  per_plot: 'Per plot',
  per_square_metre: 'Per square metre',
};

/** Asking price, basis and negotiability are shown in the price block, so they are not repeated in the answer grid. */
const PRICE_KEYS = ['asking_price', 'price_basis', 'negotiability'];

function PriceBlock({
  askingPrice,
  priceBasis,
  negotiable,
  tone = 'light',
}: {
  askingPrice: number;
  priceBasis: string;
  negotiable: boolean | null;
  tone?: 'light' | 'dark';
}) {
  const dark = tone === 'dark';
  return (
    <div>
      <p className={`text-xs uppercase tracking-wider ${dark ? 'text-white/50' : 'text-slate-400'}`}>Asking price</p>
      <p className={`font-display text-3xl font-black ${dark ? 'text-white' : 'text-navy-900'}`}>
        {formatNaira(askingPrice)}
      </p>
      <p className={`text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>
        {PRICE_BASIS_LABELS[priceBasis] ?? priceBasis}
        {negotiable !== null && ` · ${negotiable ? 'Negotiable' : 'Fixed price'}`}
      </p>
    </div>
  );
}

/**
 * Property for Sale is a controlled representation service, free to view and separate from the unlock fee
 * (Master Blueprint §6). The buyer sees the whole listing — facts, intelligence, document statuses, photos and
 * Street Intelligence — and enquires through Veriq. The exact address, document files and the owner's own contact
 * stay internal.
 */
export default function SaleListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [listing, setListing] = useState<SaleListingPublic | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);
  const schema = useFormSchema(listing ? `for_sale.sale.${listing.subtype}` : null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const res = await saleListingsApi.get(id);
      setListing(res.data);
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 404) setNotFound(true);
      else setError(err);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  if (loading) return <PageLoader />;

  if (error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="w-full max-w-md">
          <ApiErrorNotice error={error} fallback="This sale listing could not be loaded." onRetry={() => void load()} />
        </div>
      </main>
    );
  }

  if (notFound || !listing) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="text-center">
          <Landmark className="mx-auto mb-4 h-14 w-14 text-slate-200" />
          <h1 className="mb-2 font-display text-2xl font-bold text-navy-900">Listing no longer available</h1>
          <p className="mb-6 max-w-md text-veriq-muted">
            Sale listings are removed from public view once sold, withdrawn or no longer offered.
          </p>
          <Link href="/for-sale" className="btn-primary">
            Browse Property for Sale
          </Link>
        </div>
      </main>
    );
  }

  const hasBasics = Object.keys(listing.basics).some((key) => !PRICE_KEYS.includes(key));

  return (
    <main className="min-h-screen bg-veriq-surface pb-16">
      <section className="bg-navy-900 pb-10 pt-24 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/for-sale" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white">
            <ArrowLeft className="h-4 w-4" /> Property for Sale
          </Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-emerald-400/40 bg-navy-800">
              {listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(listing.coverImageUrl)} alt={listing.title} className="h-full w-full object-cover" />
              ) : (
                <Home className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/10" />
              )}
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold backdrop-blur">
                {listing.subtype === 'land' ? 'Verified site / frontage view' : 'Verified front view'}
              </span>
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300">
                <Landmark className="h-4 w-4" /> {listing.subtypeLabel}
              </p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{listing.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/70">
                <MapPin className="h-4 w-4" /> {locationLine(listing.area, listing.city, listing.state)}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200">
                  <CheckCircle className="h-3.5 w-3.5" /> Available for sale
                </span>
                <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1.5 text-xs font-semibold text-white/80">
                  <FileCheck2 className="h-3.5 w-3.5" /> Free to view — no unlock fee
                </span>
              </div>
              <div className="mt-5">
                <PriceBlock
                  askingPrice={listing.askingPrice}
                  priceBasis={listing.priceBasis}
                  negotiable={listing.negotiable}
                  tone="dark"
                />
              </div>
              {listing.verifiedAt && (
                <p className="mt-3 text-xs text-white/50">Verified {formatDate(listing.verifiedAt)}</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          {(hasBasics || Object.keys(listing.facts).length > 0 || Object.keys(listing.intelligence).length > 0) && (
            <section className="card space-y-5 p-6">
              <h2 className="font-display text-base font-bold text-navy-900">Property facts and intelligence</h2>
              <SchemaAnswerGrid answers={listing.facts} schema={schema} exclude={PRICE_KEYS} />
              <SchemaAnswerGrid
                title="Verified sale intelligence"
                answers={listing.intelligence}
                schema={schema}
                exclude={['agent_observation']}
              />
            </section>
          )}
          <SaleDocumentStatusList documents={listing.documentStatuses} disclaimer={listing.documentDisclaimer} />
          <ListingMediaGallery
            media={listing.media}
            title={listing.subtype === 'land' ? 'Site photos' : 'Property photos'}
          />
          <StreetIntelligencePanel presentation={listing.streetIntelligence} />
          <SaleEnquiryForm
            saleListingId={listing.id}
            listingTitle={listing.title}
            agentName={listing.buyerContact.agentName}
            note={listing.buyerContact.note}
          />
        </div>

        <aside className="space-y-4">
          <div className="card p-5 text-sm leading-6 text-slate-600">
            <p className="mb-2 flex items-center gap-2 font-semibold text-navy-900">
              <ShieldCheck className="h-4 w-4 text-veriq-secondary" /> How this listing was prepared
            </p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>The owner submitted this property; only an owner may ask Veriq to represent a sale.</li>
              <li>The assigned Veriq Agent visited the property in person and confirmed the property facts.</li>
              <li>The Agent reviewed ownership, authority to sell and the other relevant documents.</li>
              <li>Veriq and the owner signed a sales representation agreement before publication.</li>
              <li>Document review is not a legal title guarantee — take your own legal and professional advice.</li>
            </ul>
            <Link href="/verification-rules" className="mt-3 inline-flex text-xs font-semibold text-veriq-secondary hover:underline">
              Verification rules
            </Link>
          </div>
          <div className="card p-5 text-xs leading-5 text-slate-600">
            <p className="mb-1 font-semibold text-navy-900">Veriq is your contact for this property</p>
            <p>
              The owner&apos;s direct contact is not displayed. Send an enquiry and the assigned Veriq Agent will
              contact you about viewing, price and the sale process.
            </p>
          </div>
        </aside>
      </div>
    </main>
  );
}
