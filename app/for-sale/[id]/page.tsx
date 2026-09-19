'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Home, KeyRound, Landmark, MapPin, ShieldCheck, Undo2 } from 'lucide-react';
import { saleListingsApi } from '@/lib/api/renter';
import type { SaleListingPublic, SaleUnlockedPackage } from '@/types/renter';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { AccessCountdown } from '@/components/renter/AccessCountdown';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { ContactRouteCard } from '@/components/renter/ContactRouteCard';
import { ListingMediaGallery } from '@/components/renter/ListingMediaGallery';
import { LockedUnlockCallout } from '@/components/renter/LockedUnlockCallout';
import { SaleDocumentStatusList } from '@/components/renter/SaleDocumentStatusList';
import { SchemaAnswerGrid, useFormSchema } from '@/components/renter/SchemaAnswers';
import { StreetIntelligencePanel } from '@/components/renter/StreetIntelligencePanel';
import { UnlockCheckout } from '@/components/renter/UnlockCheckout';
import { VerifiedLocationCard } from '@/components/renter/VerifiedLocationCard';
import { formatDate, formatNaira, locationLine, mediaSrc } from '@/components/renter/format';
import { useListingViewer } from '@/components/renter/useListingViewer';

const SALE_COVERS = [
  'Exact verified location',
  'Full sale intelligence and linked Street Intelligence',
  'Built Property or Land photos',
  'Document-status detail and Agent notes (private source documents are not disclosed)',
  'Seller or Veriq Agent contact route',
];

const PRICE_BASIS_LABELS: Record<string, string> = {
  total: 'Total price',
  per_plot: 'Per plot',
  per_square_metre: 'Per square metre',
  other: 'Other basis',
};

const SUBTYPE_LABELS: Record<string, string> = { built_property: 'Built Property', land: 'Land' };

/** Asking price, basis and negotiability are shown in the price block, so they are not repeated in the answer grid. */
const PRICE_KEYS = ['asking_price', 'price_basis', 'negotiability'];

function PriceBlock({ askingPrice, priceBasis, negotiable, tone = 'light' }: { askingPrice: number; priceBasis: string; negotiable: boolean | null; tone?: 'light' | 'dark' }) {
  const dark = tone === 'dark';
  return (
    <div>
      <p className={`text-xs uppercase tracking-wider ${dark ? 'text-white/50' : 'text-slate-400'}`}>Asking price</p>
      <p className={`font-display text-3xl font-black ${dark ? 'text-white' : 'text-navy-900'}`}>{formatNaira(askingPrice)}</p>
      <p className={`text-xs ${dark ? 'text-white/60' : 'text-slate-500'}`}>
        {PRICE_BASIS_LABELS[priceBasis] ?? priceBasis}
        {negotiable !== null && ` · ${negotiable ? 'Negotiable' : 'Fixed price'}`}
      </p>
    </div>
  );
}

function LockedView({ listing, onUnlock, isAuthenticated }: { listing: SaleListingPublic; onUnlock: () => void; isAuthenticated: boolean }) {
  const schema = useFormSchema(`for_sale.sale.${listing.subtype}`);
  const hasBasics = Object.keys(listing.basics).some((key) => !PRICE_KEYS.includes(key));
  return (
    <main className="min-h-screen bg-veriq-surface pb-16">
      <section className="bg-[#03131a] pb-10 pt-24 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/for-sale" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Property for Sale</Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-emerald-400/40 bg-[#07303a]">
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
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><Landmark className="h-4 w-4" /> {listing.subtypeLabel}</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{listing.title}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/70"><MapPin className="h-4 w-4" /> {locationLine(listing.area, listing.city, listing.state)}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200"><CheckCircle className="h-3.5 w-3.5" /> Available for sale</p>
              <div className="mt-5"><PriceBlock askingPrice={listing.askingPrice} priceBasis={listing.priceBasis} negotiable={listing.negotiable} tone="dark" /></div>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          {(hasBasics || Object.keys(listing.publicIntelligence).length > 0) && (
            <section className="card space-y-5 p-6">
              <h2 className="font-display text-base font-bold text-navy-900">Basic sale facts</h2>
              <SchemaAnswerGrid answers={listing.basics} schema={schema} exclude={PRICE_KEYS} />
              <SchemaAnswerGrid title="Selected verified intelligence" answers={listing.publicIntelligence} schema={schema} />
            </section>
          )}
          <SaleDocumentStatusList documents={listing.documentAvailability} />
          <LockedUnlockCallout price={listing.unlockPrice} isFree={listing.isFreeUnlock} covers={SALE_COVERS} onUnlock={onUnlock} isAuthenticated={isAuthenticated} />
        </div>
        <aside className="space-y-4">
          <div className="card p-5 text-sm leading-6 text-slate-600">
            <p className="mb-2 flex items-center gap-2 font-semibold text-navy-900"><ShieldCheck className="h-4 w-4 text-veriq-secondary" /> How this listing was prepared</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>A Veriq Agent created this listing after checking the seller&apos;s identity and authority to sell.</li>
              <li>The Agent confirmed the physical property or land and recorded each document&apos;s status.</li>
              <li>An unlock does not reserve the property, and the buying decision, price and legal due diligence remain yours.</li>
            </ul>
            <Link href="/verification-rules" className="mt-3 inline-flex text-xs font-semibold text-veriq-secondary hover:underline">Verification rules</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function UnlockedView({ pkg }: { pkg: SaleUnlockedPackage }) {
  const { listing, location } = pkg;
  const schema = useFormSchema(`for_sale.sale.${listing.subtype}`);
  const isManager = pkg.access.level === 'manager';
  const routeIsSeller = pkg.contactRoute?.role === 'seller';
  return (
    <main className="min-h-screen bg-veriq-surface pb-16 pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link href="/for-sale" className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Property for Sale</Link>

        <div className="mt-4 flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">{isManager ? 'Manager view — full sale package' : 'Sale listing unlocked'}</p>
              <p className="text-xs text-emerald-800">{isManager ? 'You manage this listing, so protected details are visible without an unlock.' : 'Use the contact route to arrange a viewing or enquiry. Details lock again when access ends.'}</p>
            </div>
          </div>
          {!isManager && pkg.access.accessExpiresAt && <div className="sm:w-72"><AccessCountdown expiresAt={pkg.access.accessExpiresAt} withSeconds /></div>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-veriq-secondary">{SUBTYPE_LABELS[listing.subtype] ?? 'Property for Sale'}</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-navy-900">{listing.title}</h1>
              <p className="mt-1 text-sm text-veriq-muted">
                {listing.availabilityStatus === 'available' ? 'Available' : 'No longer available'}
                {listing.verifiedAt && ` · Verified ${formatDate(listing.verifiedAt)}`}
              </p>
              <div className="mt-4"><PriceBlock askingPrice={listing.askingPrice} priceBasis={listing.priceBasis} negotiable={listing.negotiable} /></div>
              <div className="mt-5 space-y-5">
                <SchemaAnswerGrid title="Property facts" answers={listing.facts} schema={schema} exclude={PRICE_KEYS} />
                <SchemaAnswerGrid title="Sale intelligence" answers={listing.intelligence} schema={schema} exclude={['agent_observation']} />
              </div>
              {listing.agentObservation && (
                <div className="mt-5 rounded-xl bg-veriq-surface p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Veriq Agent observation</p>
                  <p className="mt-1 text-sm italic text-navy-800">&ldquo;{listing.agentObservation}&rdquo;</p>
                </div>
              )}
            </section>
            <SaleDocumentStatusList documents={pkg.documentStatuses} unlocked />
            <ListingMediaGallery media={pkg.media} title={listing.subtype === 'land' ? 'Site photos' : 'Property photos'} />
            <StreetIntelligencePanel presentation={pkg.streetIntelligence} />
          </div>

          <aside className="space-y-4">
            <VerifiedLocationCard
              address={location.verifiedAddress}
              latitude={location.latitude}
              longitude={location.longitude}
              area={location.area}
              city={location.city}
              state={location.state}
            />
            <div className="card space-y-3 p-5">
              <h3 className="font-display text-base font-bold text-navy-900">Contact route</h3>
              {pkg.contactRoute ? (
                <ContactRouteCard
                  contact={pkg.contactRoute}
                  title={routeIsSeller ? 'Seller' : 'Veriq Agent managing this sale'}
                  description={routeIsSeller ? 'For viewing, price and sale enquiries' : 'For viewing, price and sale enquiries on the seller’s behalf'}
                />
              ) : (
                <p className="text-sm text-veriq-muted">The contact route for this listing is being updated. Please check again shortly.</p>
              )}
              {pkg.agentSupport && routeIsSeller && (
                <ContactRouteCard contact={pkg.agentSupport} title="Assigned Veriq Agent" description="For questions about verification, documents or your unlock" variant="agent" />
              )}
            </div>
            {!isManager && (
              <div className="card p-5 text-xs leading-5 text-slate-600">
                <p>A public document status was materially wrong, or the property was already sold when you unlocked?</p>
                <Link href="/dashboard/unlocks" className="btn-outline mt-3 !px-4 !py-2 !text-sm"><Undo2 className="h-4 w-4" /> Unlock history &amp; refunds</Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function SaleListingDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const viewer = useListingViewer<SaleListingPublic, SaleUnlockedPackage>(id, isAuthenticated, !authLoading, saleListingsApi.get, saleListingsApi.unlocked);

  if (authLoading || viewer.loading) return <PageLoader />;

  if (viewer.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="w-full max-w-md"><ApiErrorNotice error={viewer.error} fallback="This sale listing could not be loaded." onRetry={() => void viewer.reload()} /></div>
      </main>
    );
  }

  if (viewer.unlocked) return <UnlockedView pkg={viewer.unlocked} />;

  if (viewer.notFound || !viewer.publicData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="text-center">
          <Landmark className="mx-auto mb-4 h-14 w-14 text-slate-200" />
          <h1 className="mb-2 font-display text-2xl font-bold text-navy-900">Listing no longer available</h1>
          <p className="mb-6 max-w-md text-veriq-muted">Sale listings are removed from public view once sold, withdrawn or no longer offered.</p>
          <Link href="/for-sale" className="btn-primary">Browse Property for Sale</Link>
        </div>
      </main>
    );
  }

  return (
    <>
      <LockedView listing={viewer.publicData} onUnlock={() => setCheckoutOpen(true)} isAuthenticated={isAuthenticated} />
      <UnlockCheckout
        isOpen={checkoutOpen}
        onClose={() => setCheckoutOpen(false)}
        targetType="sale_listing"
        targetId={id}
        returnPath={`/for-sale/${id}`}
        onUnlocked={viewer.reload}
      />
    </>
  );
}
