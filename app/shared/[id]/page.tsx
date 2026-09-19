'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, CheckCircle, Home, KeyRound, MapPin, ShieldCheck, Undo2, Users } from 'lucide-react';
import { sharedPropertiesApi } from '@/lib/api/renter';
import type { SharedListingPublic, SharedUnlockedPackage } from '@/types/renter';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { AccessCountdown } from '@/components/renter/AccessCountdown';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { ContactRouteCard } from '@/components/renter/ContactRouteCard';
import { ListingMediaGallery } from '@/components/renter/ListingMediaGallery';
import { LockedUnlockCallout } from '@/components/renter/LockedUnlockCallout';
import { SchemaAnswerGrid, useFormSchema } from '@/components/renter/SchemaAnswers';
import { StreetIntelligencePanel } from '@/components/renter/StreetIntelligencePanel';
import { UnlockCheckout } from '@/components/renter/UnlockCheckout';
import { VerifiedLocationCard } from '@/components/renter/VerifiedLocationCard';
import { formatDate, locationLine, mediaSrc } from '@/components/renter/format';
import { useListingViewer } from '@/components/renter/useListingViewer';

const SHARED_COVERS = [
  'Exact verified address and location',
  'Protected room and shared-space photos',
  'Sharing arrangement, house rules and household details',
  'Property-type intelligence and linked Street Intelligence',
  'Resident Operator phone and WhatsApp',
  'WhatsApp support from the assigned Veriq Agent',
];

const TYPE_LABELS: Record<string, string> = {
  private_room: 'Private Room in an Occupied Home',
  shared_room_bedspace: 'Shared Room / Bedspace in an Occupied Home',
};

function LockedView({ listing, onUnlock, isAuthenticated }: { listing: SharedListingPublic; onUnlock: () => void; isAuthenticated: boolean }) {
  const schema = useFormSchema(`shared_property.opportunity.${listing.opportunityType}`);
  return (
    <main className="min-h-screen bg-veriq-surface pb-16">
      <section className="bg-[#03131a] pb-10 pt-24 text-white">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <Link href="/shared" className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white"><ArrowLeft className="h-4 w-4" /> Shared Property</Link>
          <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_1fr] lg:items-center">
            <div className="relative aspect-[16/10] overflow-hidden rounded-2xl border border-emerald-400/40 bg-[#07303a]">
              {listing.coverImageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={mediaSrc(listing.coverImageUrl)} alt={listing.displayLabel} className="h-full w-full object-cover" />
              ) : (
                <Home className="absolute left-1/2 top-1/2 h-16 w-16 -translate-x-1/2 -translate-y-1/2 text-white/10" />
              )}
              <span className="absolute bottom-3 left-3 rounded-lg bg-black/55 px-3 py-1.5 text-xs font-semibold backdrop-blur">Verified room or living-area photo</span>
            </div>
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-emerald-300"><Users className="h-4 w-4" /> {listing.opportunityTypeLabel}</p>
              <h1 className="mt-2 font-display text-3xl font-bold sm:text-4xl">{listing.displayLabel}</h1>
              <p className="mt-3 flex items-center gap-2 text-sm text-white/70"><MapPin className="h-4 w-4" /> {locationLine(listing.area, listing.city, listing.state)}</p>
              <p className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-400/15 px-3 py-1.5 text-xs font-semibold text-emerald-200"><CheckCircle className="h-3.5 w-3.5" /> Available now</p>
              <p className="mt-4 text-sm leading-6 text-white/65">
                A current resident is offering this space in the home they occupy. Veriq verified their identity, occupancy and permission to share.
                The exact address, protected photos, house rules and resident contact are available after unlock.
              </p>
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto mt-8 grid max-w-6xl gap-6 px-4 sm:px-6 lg:grid-cols-3 lg:px-8">
        <div className="space-y-6 lg:col-span-2">
          <section className="card p-6">
            <h2 className="mb-4 font-display text-base font-bold text-navy-900">Basic details</h2>
            <SchemaAnswerGrid answers={listing.basics} schema={schema} />
            {Object.keys(listing.basics).length === 0 && <p className="text-sm text-veriq-muted">Basic details are shown after unlock for this opportunity.</p>}
          </section>
          <LockedUnlockCallout price={listing.unlockPrice} isFree={listing.isFreeUnlock} covers={SHARED_COVERS} onUnlock={onUnlock} isAuthenticated={isAuthenticated} />
        </div>
        <aside className="space-y-4">
          <div className="card p-5 text-sm leading-6 text-slate-600">
            <p className="mb-2 flex items-center gap-2 font-semibold text-navy-900"><ShieldCheck className="h-4 w-4 text-veriq-secondary" /> Before you unlock</p>
            <ul className="list-disc space-y-1 pl-4 text-xs">
              <li>Shared Property is listed only while the space is available; it is hidden as soon as it is taken.</li>
              <li>Veriq does not match people by personal characteristics. House rules describe the household arrangement only.</li>
              <li>Always view the space in person and agree terms directly with the resident before paying anything.</li>
            </ul>
            <Link href="/safety" className="mt-3 inline-flex text-xs font-semibold text-veriq-secondary hover:underline">Safety guidance</Link>
          </div>
        </aside>
      </div>
    </main>
  );
}

function UnlockedView({ pkg }: { pkg: SharedUnlockedPackage }) {
  const { opportunity } = pkg;
  const schema = useFormSchema(`shared_property.opportunity.${opportunity.opportunityType}`);
  const isManager = pkg.access.level === 'manager';
  return (
    <main className="min-h-screen bg-veriq-surface pb-16 pt-24">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Link href="/shared" className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900"><ArrowLeft className="h-4 w-4" /> Shared Property</Link>

        <div className="mt-4 flex flex-col gap-4 rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <KeyRound className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
            <div>
              <p className="font-semibold text-emerald-900">{isManager ? 'Manager view — full details' : 'Shared Property unlocked'}</p>
              <p className="text-xs text-emerald-800">{isManager ? 'You manage this opportunity, so protected details are visible without an unlock.' : 'Contact the resident to arrange a viewing. Details lock again when access ends.'}</p>
            </div>
          </div>
          {!isManager && pkg.access.accessExpiresAt && <div className="sm:w-72"><AccessCountdown expiresAt={pkg.access.accessExpiresAt} withSeconds /></div>}
        </div>

        <div className="mt-6 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            <section className="card p-6">
              <p className="text-xs font-semibold uppercase tracking-wide text-veriq-secondary">{TYPE_LABELS[opportunity.opportunityType] ?? 'Shared Property'}</p>
              <h1 className="mt-1 font-display text-2xl font-bold text-navy-900">{opportunity.displayLabel}</h1>
              <p className="mt-1 text-sm text-veriq-muted">
                {opportunity.availabilityStatus === 'available' ? 'Available' : 'Currently unavailable'}
                {opportunity.verifiedAt && ` · Verified ${formatDate(opportunity.verifiedAt)}`}
              </p>
              <div className="mt-5 space-y-5">
                <SchemaAnswerGrid title="Household and space" answers={opportunity.facts} schema={schema} />
                <SchemaAnswerGrid title="Contribution and bills" answers={opportunity.commercialTerms} schema={schema} />
                <SchemaAnswerGrid title="Verified intelligence" answers={opportunity.intelligence} schema={schema} exclude={['agent_observation']} />
              </div>
              {opportunity.agentObservation && (
                <div className="mt-5 rounded-xl bg-veriq-surface p-4">
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">Veriq Agent observation</p>
                  <p className="mt-1 text-sm italic text-navy-800">&ldquo;{opportunity.agentObservation}&rdquo;</p>
                </div>
              )}
            </section>
            <ListingMediaGallery media={pkg.media} title="Room and shared-space photos" />
            <StreetIntelligencePanel presentation={pkg.streetIntelligence} />
          </div>

          <aside className="space-y-4">
            <VerifiedLocationCard
              address={opportunity.verifiedAddress}
              latitude={opportunity.latitude}
              longitude={opportunity.longitude}
              area={opportunity.area}
              city={opportunity.city}
              state={opportunity.state}
            />
            <div className="card space-y-3 p-5">
              <h3 className="font-display text-base font-bold text-navy-900">Contacts</h3>
              <ContactRouteCard contact={pkg.residentContact} title="Resident Operator" description="For viewing, availability and household questions" />
              {pkg.agentSupport && (
                <ContactRouteCard contact={pkg.agentSupport} title="Assigned Veriq Agent" description="For questions about verification, intelligence or your unlock" variant="agent" />
              )}
            </div>
            {!isManager && (
              <div className="card p-5 text-xs leading-5 text-slate-600">
                <p>Something materially wrong — the space was already taken at unlock, the contact is invalid or the location is wrong?</p>
                <Link href="/dashboard/unlocks" className="btn-outline mt-3 !px-4 !py-2 !text-sm"><Undo2 className="h-4 w-4" /> Unlock history &amp; refunds</Link>
              </div>
            )}
          </aside>
        </div>
      </div>
    </main>
  );
}

export default function SharedPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const viewer = useListingViewer<SharedListingPublic, SharedUnlockedPackage>(id, isAuthenticated, !authLoading, sharedPropertiesApi.get, sharedPropertiesApi.unlocked);

  if (authLoading || viewer.loading) return <PageLoader />;

  if (viewer.error) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="w-full max-w-md"><ApiErrorNotice error={viewer.error} fallback="This Shared Property opportunity could not be loaded." onRetry={() => void viewer.reload()} /></div>
      </main>
    );
  }

  if (viewer.unlocked) return <UnlockedView pkg={viewer.unlocked} />;

  if (viewer.notFound || !viewer.publicData) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-veriq-surface px-4 pt-24">
        <div className="text-center">
          <Users className="mx-auto mb-4 h-14 w-14 text-slate-200" />
          <h1 className="mb-2 font-display text-2xl font-bold text-navy-900">Opportunity no longer available</h1>
          <p className="mb-6 max-w-md text-veriq-muted">Shared Property opportunities are hidden as soon as the space is taken or becomes unavailable.</p>
          <Link href="/shared" className="btn-primary">Browse Shared Property</Link>
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
        targetType="shared_opportunity"
        targetId={id}
        returnPath={`/shared/${id}`}
        onUnlocked={viewer.reload}
      />
    </>
  );
}
