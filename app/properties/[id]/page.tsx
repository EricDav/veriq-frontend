'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, CheckCircle, Bed, Bath, Lock,
  Shield, Eye, FileText, Clock, AlertCircle, Home, Wallet,
  Phone, MessageCircle, X, ChevronLeft, ChevronRight, Gift,
  ImageIcon, Building2, BarChart3, UsersRound, PhoneCall, KeyRound, ArrowRight,
} from 'lucide-react';
import { chatApi, ApiError } from '@/lib/api';
import type { ConsultationAccess, MediaItem, Property } from '@/types';
import type { UnlockedPropertyWithStreet } from '@/types/renter';
import { loadPropertyForViewer, toConsultationAccess } from '@/lib/property-access';
import { AgentVerificationLevel, AgentTrustTier, FreshnessScore, PropertyType } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AgentRatingButton } from '@/components/agents/AgentRatingButton';
import { MoveInEstimate } from '@/components/properties/MoveInEstimate';
import { ContactActions, DocumentedUnits, PublicUnitList } from '@/components/properties/UnlockedPropertySections';
import { StreetIntelligencePanel } from '@/components/renter/StreetIntelligencePanel';
import { UnlockCheckout } from '@/components/renter/UnlockCheckout';

const FRESHNESS_INFO: Record<FreshnessScore, { label: string; cls: string; width: string }> = {
  freshly_verified: { label: 'Freshly verified — within 24 hours', cls: 'bg-emerald-500', width: 'w-full' },
  recently_verified: { label: 'Recently verified — 1–3 days ago', cls: 'bg-blue-500', width: 'w-4/5' },
  verification_expiring: { label: 'Verification expiring soon', cls: 'bg-amber-500', width: 'w-2/5' },
  unverified: { label: 'Not recently verified', cls: 'bg-slate-300', width: 'w-1/5' },
};

const TRUST_TIER_BADGE: Record<AgentTrustTier, { label: string; cls: string }> = {
  bronze: { label: 'Bronze', cls: 'bg-orange-100 text-orange-700' },
  silver: { label: 'Silver', cls: 'bg-slate-100 text-slate-700' },
  gold: { label: 'Gold', cls: 'bg-gold-100 text-gold-700' },
  platinum: { label: 'Platinum', cls: 'bg-purple-100 text-purple-700' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

const SECTION_LABELS: Record<string, string> = {
  road_access: 'Road Access',
  environment: 'Surroundings',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  compound: 'Compound',
  water_area: 'Water Area',
  ceiling: 'Ceiling',
  other: 'Other',
};

function formatNaira(amount: number | null | undefined): string {
  if (!amount) return '₦0';
  return `₦${Number(amount).toLocaleString()}`;
}

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function hasDisplayValue(value: unknown) {
  if (value === null || value === undefined || value === '' || value === false) return false;
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

function pretty(value: unknown) {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item).replace(/_/g, ' ')).join(', ') : 'Not provided';
  }
  return String(value).replace(/_/g, ' ');
}

function propertyCategoryLabel(type: PropertyType) {
  if (type === PropertyType.SHORT_STAY) return 'Short Let';
  if (type === PropertyType.HOSTEL) return 'Hostel';
  if (type === PropertyType.SHARED_APARTMENT) return 'Shared Apartment';
  return 'Residential Property';
}

interface PublicPreviewProps {
  property: Property;
  coverImageSrc: string | null;
  location: string;
  agentVerified: boolean;
  isFreeUnlock: boolean;
  onUnlock: () => void;
  onOpenCover: () => void;
  isCoverOpen: boolean;
  onCloseCover: () => void;
}

function PublicPropertyPreview({ property, coverImageSrc, location, agentVerified, isFreeUnlock,
  onUnlock, onOpenCover, isCoverOpen, onCloseCover }: PublicPreviewProps) {
  const category = propertyCategoryLabel(property.propertyType);
  const unlockFee = isFreeUnlock ? 'Free · ₦0' : formatNaira(property.consultationFee);
  const summary = property.availabilitySummary;
  const isUnavailable = summary ? summary.overall === 'unavailable' : property.status !== 'active';
  const availableLabel = isUnavailable ? 'Currently unavailable' : 'Available now';
  const units = property.units ?? [];

  return (
    <main className="min-h-screen bg-[#03131a] pb-14 pt-24 text-white">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 overflow-hidden text-xs text-white/45" aria-label="Breadcrumb"><Link href="/" className="hover:text-white">Home</Link><ChevronRight className="h-3 w-3" /><Link href="/properties" className="hover:text-white">Properties</Link><ChevronRight className="h-3 w-3" /><span className="truncate">{category}</span><ChevronRight className="h-3 w-3" /><span className="text-white">Preview</span></nav>
        <div className="mt-8 flex flex-col gap-4 border-l-2 border-transparent lg:flex-row lg:items-end lg:justify-between">
          <div><p className="text-xs font-bold uppercase text-cyan-300">Property preview</p><h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">Preview this <span className="text-cyan-300">Property</span></h1><p className="mt-3 text-sm text-white/65 sm:text-base">See the essentials first, so you only unlock when the property looks right for you.</p></div>
          <p className="max-w-[190px] border-l-2 border-emerald-400 pl-4 text-xs leading-5 text-white/70">A more transparent property market for a better Nigeria.</p>
        </div>

        <button type="button" onClick={onOpenCover} disabled={!coverImageSrc} className="group relative mt-7 block aspect-[16/7] min-h-64 w-full overflow-hidden rounded-lg border border-emerald-400/60 bg-[#07303a] text-left disabled:cursor-default">
          {coverImageSrc ? <Image src={coverImageSrc} alt={property.title} fill priority className="object-cover transition-transform duration-500 group-hover:scale-[1.01]" sizes="100vw" /> : <span className="absolute inset-0 grid place-items-center"><Home className="h-20 w-20 text-white/10" /></span>}
          <span className="absolute bottom-4 left-4 flex items-center gap-2 rounded border border-white/20 bg-black/55 px-3 py-2 text-xs font-semibold backdrop-blur"><ImageIcon className="h-4 w-4" /> Public preview</span>
        </button>

        <section className="mt-5 rounded-lg border border-emerald-400/60 bg-gradient-to-r from-[#063038] to-[#052a27] p-5 sm:p-7">
          <div className="flex flex-wrap gap-2"><span className="inline-flex items-center gap-2 rounded bg-white px-3 py-2 text-xs font-bold text-[#03131a]"><Home className="h-4 w-4 text-emerald-600" />{category}</span>{agentVerified && <span className="inline-flex items-center gap-2 rounded bg-emerald-400/15 px-3 py-2 text-xs font-semibold text-emerald-200"><Shield className="h-4 w-4" /> Verified</span>}</div>
          <h2 className="mt-4 font-display text-2xl font-bold sm:text-3xl">{property.title}</h2>
          <div className="mt-4 flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/70"><span className="flex items-center gap-2"><MapPin className="h-4 w-4" />{location}</span>{summary && summary.documentedUnits > 0 ? <><span className="flex items-center gap-2"><Building2 className="h-4 w-4" />{summary.documentedUnits} documented {summary.documentedUnits === 1 ? 'unit' : 'units'}</span><span className="flex items-center gap-2"><Bed className="h-4 w-4" />{summary.availableUnits} available now</span></> : <span className="flex items-center gap-2"><Bed className="h-4 w-4" />{property.bedrooms}-Bedroom</span>}</div>
          {isUnavailable && <p className="mt-4 flex items-start gap-2 rounded border border-amber-300/50 bg-amber-400/10 px-3 py-2 text-xs leading-5 text-amber-100"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />This property is currently unavailable. You can still unlock it to research it for future availability, but knowingly unlocking an unavailable property is not by itself a refund reason.</p>}
          <p className="mt-5 border-t border-white/15 pt-5 text-sm leading-6 text-white/70">This quick preview helps you confirm the essentials first. Unlock the full report to view complete details, protected photos, verified location, and contact access.</p>
        </section>

        <section className="mt-7"><h2 className="font-display text-xl font-semibold">Documented Units</h2><p className="mt-1 text-xs text-white/50">Unit types, basic prices and current availability. Unit photos and details unlock with the full report.</p>
          {units.length > 0 ? <PublicUnitList units={units} /> : <div className="mt-3 grid gap-3 md:grid-cols-2"><div className="rounded-lg border border-emerald-400/60 bg-gradient-to-r from-[#063039] to-[#06312e] p-5"><div className="flex items-start justify-between"><div><h3 className="font-display text-lg font-semibold">{property.title}</h3><span className="mt-2 inline-block rounded bg-cyan-400/10 px-2 py-1 text-xs text-cyan-300">{property.bedrooms}-Bedroom</span></div><ChevronRight className="h-5 w-5" /></div><p className="mt-3 text-xl font-bold text-cyan-300">{formatNaira(property.rentAmount)} <span className="text-sm font-normal">/ yr</span></p><div className="mt-4 flex flex-wrap gap-5 text-xs text-white/65"><span className="flex items-center gap-2"><KeyRound className="h-4 w-4" />{property.bedrooms}-Bedroom</span><span className="flex items-center gap-2"><span className="h-2.5 w-2.5 rounded-full bg-cyan-300" />{availableLabel}</span></div></div></div>}
        </section>

        <section className="mt-7"><h2 className="font-display text-xl font-semibold">What Unlock Covers</h2><p className="mt-1 text-xs text-white/50">Get the complete picture with verified information and direct contacts.</p>
          <div className="mt-3 grid gap-5 rounded-lg border border-emerald-400/60 bg-[#052b2d] p-5 sm:grid-cols-2 lg:grid-cols-3">{[
            [MapPin, 'Exact property location'], [ImageIcon, 'Full gallery'], [FileText, 'All documented units'], [BarChart3, 'Full property intelligence'], [Home, 'Unit-specific intelligence'], [PhoneCall, 'Operator or caretaker contact'], [UsersRound, 'Assigned Veriq Agent support'], [Clock, 'Time-limited access period'], [Wallet, `Unlock fee: ${unlockFee}`],
          ].map(([Icon, label]) => { const ItemIcon = Icon as React.ElementType; return <div key={String(label)} className="flex items-center gap-3 text-xs text-white/75"><ItemIcon className="h-5 w-5 shrink-0 text-cyan-300" />{String(label)}</div>; })}</div>
        </section>

        <section className="mt-5 flex flex-col gap-5 rounded-lg border border-emerald-400/50 bg-[#063038] p-5 sm:flex-row sm:items-center sm:justify-between"><div className="flex items-center gap-4"><span className="grid h-12 w-12 shrink-0 place-items-center rounded-full bg-cyan-400/15 text-cyan-300"><Lock className="h-5 w-5" /></span><div><h2 className="font-display text-lg font-semibold">Unlock Full Intelligence Report</h2><p className="mt-1 text-xs text-white/55">Wallet credit is applied automatically at checkout, and approved refunds are credited back to your Veriq Wallet.</p></div></div><button type="button" onClick={onUnlock} className="flex min-h-12 items-center justify-center gap-2 rounded bg-gradient-to-r from-cyan-400 to-emerald-400 px-7 text-sm font-bold text-[#03161b]">{isFreeUnlock ? <Gift className="h-4 w-4" /> : <Lock className="h-4 w-4" />}{isFreeUnlock ? 'Unlock Full Report Free' : `Unlock Full Report — ${unlockFee}`}<ArrowRight className="h-4 w-4" /></button></section>
      </div>
      {isCoverOpen && coverImageSrc && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4" onClick={onCloseCover}><button type="button" onClick={onCloseCover} className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white" aria-label="Close image preview"><X className="h-6 w-6" /></button><Image src={coverImageSrc} alt={property.title} width={1600} height={1000} className="max-h-[88vh] w-auto max-w-full rounded-lg object-contain" /></div>}
    </main>
  );
}

function useCountdown(expiresAt: string | null | undefined) {
  const [timeLeft, setTimeLeft] = useState('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }
      const hours = Math.floor(diff / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      setTimeLeft(`${hours}h ${minutes}m`);
      setIsExpired(false);
    };

    update();
    const interval = window.setInterval(update, 60_000);
    return () => window.clearInterval(interval);
  }, [expiresAt]);

  return { timeLeft, isExpired };
}

function AccessTimer({ expiresAt }: { expiresAt: string }) {
  const { timeLeft, isExpired } = useCountdown(expiresAt);

  return (
    <div className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 ${
      isExpired
        ? 'border-red-200 bg-red-50'
        : 'border-emerald-200 bg-emerald-50'
    }`}>
      <Clock className={`h-4 w-4 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-emerald-600'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
          {isExpired ? 'Access Expired' : 'Access expires in'}
        </p>
        {!isExpired && <p className="break-words text-sm font-bold text-navy-900">{timeLeft}</p>}
      </div>
    </div>
  );
}

function IntelligenceGrid({ title, items }: { title: string; items: Array<{ label: string; value: unknown }> }) {
  const visibleItems = items.filter((item) => hasDisplayValue(item.value));
  if (visibleItems.length === 0) return null;

  return (
    <div className="card p-6">
      <h3 className="font-display mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
        <Shield className="h-4 w-4 text-veriq-secondary" /> {title}
      </h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {visibleItems.map((item) => (
          <div key={item.label} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
            <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{item.label}</p>
            <p className="mt-1 text-sm font-medium capitalize text-navy-900">{pretty(item.value)}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function UnlockedMediaGallery({ media }: { media: MediaItem[] }) {
  const [activeSection, setActiveSection] = useState('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  if (media.length === 0) return null;

  const sections = ['all', ...Array.from(new Set(media.map((item) => item.section)))];
  const filtered = activeSection === 'all' ? media : media.filter((item) => item.section === activeSection);
  const closeLightbox = () => setLightboxIdx(null);
  const prevImg = () => setLightboxIdx((index) => (index !== null ? Math.max(0, index - 1) : null));
  const nextImg = () => setLightboxIdx((index) => (index !== null ? Math.min(filtered.length - 1, index + 1) : null));

  return (
    <div className="card p-6">
      <h3 className="font-display mb-4 flex items-center gap-2 text-base font-bold text-navy-900">
        <Eye className="h-4 w-4 text-veriq-secondary" /> Full Photo Gallery
      </h3>
      {sections.length > 2 && (
        <div className="mb-4 flex gap-2 overflow-x-auto pb-1">
          {sections.map((section) => (
            <button
              key={section}
              type="button"
              onClick={() => {
                setActiveSection(section);
                setLightboxIdx(null);
              }}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSection === section
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {section === 'all' ? 'All' : SECTION_LABELS[section] ?? section.replace(/_/g, ' ')}
            </button>
          ))}
        </div>
      )}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {filtered.map((item, idx) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setLightboxIdx(idx)}
            className="relative aspect-[4/3] overflow-hidden rounded-xl bg-slate-100 text-left transition-opacity hover:opacity-90"
          >
            <Image
              src={mediaUrl(item.url)}
              alt={item.caption ?? SECTION_LABELS[item.section] ?? item.section}
              fill
              sizes="(max-width: 640px) 50vw, 33vw"
              className="object-cover"
            />
            {(item.caption || item.section) && (
              <div className="absolute inset-x-0 bottom-0 bg-navy-950/70 px-2 py-1 text-[10px] capitalize text-white">
                {item.caption ?? SECTION_LABELS[item.section] ?? item.section.replace(/_/g, ' ')}
              </div>
            )}
          </button>
        ))}
      </div>
      {lightboxIdx !== null && filtered[lightboxIdx] && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90" onClick={closeLightbox}>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 hover:text-white"
            aria-label="Close image preview"
          >
            <X className="h-6 w-6" />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); prevImg(); }}
            disabled={lightboxIdx === 0}
            className="absolute left-3 rounded-full bg-white/10 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:left-6"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-7 w-7" />
          </button>
          <div className="relative mx-14 w-full max-w-4xl" onClick={(e) => e.stopPropagation()}>
            <Image
              src={mediaUrl(filtered[lightboxIdx].url)}
              alt={filtered[lightboxIdx].caption ?? SECTION_LABELS[filtered[lightboxIdx].section] ?? ''}
              width={1400}
              height={950}
              className="max-h-[80vh] w-full rounded-xl object-contain"
            />
            <p className="mt-3 text-center text-sm text-white/70">
              {filtered[lightboxIdx].caption ?? SECTION_LABELS[filtered[lightboxIdx].section] ?? filtered[lightboxIdx].section.replace(/_/g, ' ')}
            </p>
            <p className="mt-1 text-center text-xs text-white/40">{lightboxIdx + 1} / {filtered.length}</p>
          </div>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); nextImg(); }}
            disabled={lightboxIdx === filtered.length - 1}
            className="absolute right-3 rounded-full bg-white/10 p-2 text-white/70 hover:text-white disabled:opacity-20 sm:right-6"
            aria-label="Next image"
          >
            <ChevronRight className="h-7 w-7" />
          </button>
        </div>
      )}
    </div>
  );
}

export default function PropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { error: toastError } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDetails, setAccessDetails] = useState<ConsultationAccess | null>(null);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [unlocked, setUnlocked] = useState<UnlockedPropertyWithStreet | null>(null);

  const applyViewerState = (state: Awaited<ReturnType<typeof loadPropertyForViewer>>) => {
    if (!state) {
      setNotFound(true);
      return;
    }
    setProperty(state.property);
    setUnlocked(state.unlocked);
    setHasAccess(state.unlocked?.access.level === 'unlocked');
    setAccessDetails(toConsultationAccess(state.unlocked));
  };

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setNotFound(false);
      try {
        applyViewerState(await loadPropertyForViewer(id, isAuthenticated));
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    if (id && !isAuthLoading) load();
  }, [id, isAuthenticated, isAuthLoading, user?.id]);

  /** Re-reads the server-authorised package after a settled unlock; access is never inferred on the client. */
  const refreshAccess = async () => {
    const state = await loadPropertyForViewer(id, isAuthenticated);
    applyViewerState(state);
    if (state?.unlocked?.access.level !== 'unlocked') {
      toastError('Access could not be confirmed yet. Check My Unlocks for the payment status.');
    }
  };

  const handleStartChat = async () => {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?redirect=/properties/${id}`;
      return;
    }
    try {
      const res = await chatApi.startConversation(id);
      router.push(`/dashboard/chat?conversation=${res.data.id}`);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to start chat.');
    }
  };

  if (isLoading) return <PageLoader />;

  if (notFound || !property) {
    return (
      <div className="min-h-screen bg-veriq-surface pt-24 flex items-center justify-center">
        <div className="text-center">
          <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Property Not Found</h1>
          <p className="text-veriq-muted mb-6">This listing may have been removed or is no longer available.</p>
          <Link href="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      </div>
    );
  }

  const agent = property.agent;
  const agentName = agent?.user ? `${agent.user.firstName} ${agent.user.lastName}` : 'Unknown Agent';
  const agentInitial = agentName[0]?.toUpperCase() ?? 'A';
  const agentVerified = (agent?.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;
  const freshness = FRESHNESS_INFO[property.freshnessScore] ?? FRESHNESS_INFO.unverified;
  const tierBadge = TRUST_TIER_BADGE[agent?.trustTier ?? AgentTrustTier.BRONZE] ?? TRUST_TIER_BADGE.bronze;
  const agentContact = accessDetails?.agentContact;
  // Managers (assigned Agent, owning Operator, Admin) are authorised server-side via the unlocked package.
  const isOwnListing = unlocked?.access.level === 'manager';
  const hasFullAccess = hasAccess || isOwnListing;
  const canContactAgent = hasAccess && !isOwnListing && !!agentContact?.phone;
  const location = [property.area, property.city, property.state].filter(Boolean).join(', ');
  const gradient = 'from-blue-600 to-indigo-800';
  const coverImageSrc = property.coverImageUrl ? mediaUrl(property.coverImageUrl) : null;
  const isHostel = property.propertyType === PropertyType.HOSTEL;
  const isShortStay = property.propertyType === PropertyType.SHORT_STAY;
  // The public projection carries the effective unlock price, so ₦0 means an active Free Unlock (§12.7).
  const isFreeUnlock = Number(property.consultationFee) === 0;

  if (!hasFullAccess) {
    return (
      <>
        <PublicPropertyPreview
          property={property}
          coverImageSrc={coverImageSrc}
          location={location}
          agentVerified={agentVerified}
          isFreeUnlock={isFreeUnlock}
          onUnlock={() => setIsCheckoutOpen(true)}
          onOpenCover={() => setIsCoverPreviewOpen(true)}
          isCoverOpen={isCoverPreviewOpen}
          onCloseCover={() => setIsCoverPreviewOpen(false)}
        />
        <UnlockCheckout
          isOpen={isCheckoutOpen}
          onClose={() => setIsCheckoutOpen(false)}
          targetType="property"
          targetId={id}
          returnPath={`/properties/${id}`}
          onUnlocked={refreshAccess}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen bg-veriq-surface pt-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-10">
        {/* Back */}
        <Link href="/properties" className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900 mb-6 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Properties
        </Link>

        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
          {/* Left: Images & details */}
          <div className="lg:col-span-2 space-y-6">
            {/* Main image */}
            <div className={`relative h-80 rounded-2xl bg-gradient-to-br ${gradient} overflow-hidden`}>
              {coverImageSrc ? (
                hasFullAccess ? (
                  <button
                    type="button"
                    onClick={() => setIsCoverPreviewOpen(true)}
                    className="group absolute inset-0 cursor-zoom-in"
                    aria-label={`View full cover photo for ${property.title}`}
                  >
                    <img
                      src={coverImageSrc}
                      alt={property.title}
                      className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                    />
                    <span className="absolute bottom-4 left-4 rounded-lg bg-navy-900/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                      View full photo
                    </span>
                  </button>
                ) : (
                  <img
                    src={coverImageSrc}
                    alt={property.title}
                    className="h-full w-full object-cover"
                  />
                )
              ) : (
                <div className="absolute inset-0 flex items-center justify-center">
                  <Home className="h-24 w-24 text-white/10" />
                </div>
              )}
              <div className="absolute top-4 left-4 flex gap-2">
                <span className={`badge text-xs font-semibold capitalize ${
                  property.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
                }`}>
                  {property.status}
                </span>
                {agentVerified && (
                  <span className="badge bg-white/90 text-emerald-700 text-xs">
                    <CheckCircle className="h-3 w-3" /> Verified
                  </span>
                )}
              </div>
            </div>

            {isCoverPreviewOpen && coverImageSrc && (
              <div
                className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4"
                onClick={() => setIsCoverPreviewOpen(false)}
              >
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setIsCoverPreviewOpen(false);
                  }}
                  className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white/70 transition-colors hover:bg-white/20 hover:text-white"
                  aria-label="Close cover photo"
                >
                  <X className="h-7 w-7" />
                </button>
                <div className="max-h-[86vh] max-w-5xl" onClick={(e) => e.stopPropagation()}>
                  <img
                    src={coverImageSrc}
                    alt={property.title}
                    className="max-h-[86vh] w-auto max-w-full rounded-xl object-contain"
                  />
                  <p className="mt-3 text-center text-sm text-white/70">{property.title}</p>
                </div>
              </div>
            )}

            {/* Basic info */}
            <div className="card p-6">
              <div className="flex items-start justify-between mb-4 gap-4">
                <div>
                  <h1 className="font-display text-2xl font-bold text-navy-900 mb-1">{property.title}</h1>
                  <div className="flex items-center gap-1.5 text-veriq-muted text-sm">
                    <MapPin className="h-4 w-4" />
                    {location}
                  </div>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="text-2xl font-black text-navy-900">{formatNaira(property.rentAmount)}</p>
                  <p className="text-xs text-slate-400">per year</p>
                </div>
              </div>

              {/* Specs */}
              <div className="flex flex-wrap gap-6 py-4 border-y border-slate-100 mb-4">
                <div className="flex items-center gap-2 text-sm text-navy-700">
                  <Bed className="h-4 w-4 text-slate-400" /> {property.bedrooms} Bedrooms
                </div>
                <div className="flex items-center gap-2 text-sm text-navy-700">
                  <Bath className="h-4 w-4 text-slate-400" /> {property.bathrooms} Bathrooms
                </div>
                <div className="flex items-center gap-2 text-sm text-navy-700">
                  <Home className="h-4 w-4 text-slate-400" />
                  <span className="capitalize">{property.propertyType.replace(/_/g, ' ')}</span>
                </div>
                {property.isFurnished && (
                  <span className="badge bg-blue-50 text-blue-700 text-xs">Furnished</span>
                )}
              </div>

              {property.description && (
                <>
                  <h3 className="font-semibold text-navy-900 mb-2">Description</h3>
                  <p className="text-sm text-veriq-muted leading-relaxed">{property.description}</p>
                </>
              )}

              <MoveInEstimate {...property} />
            </div>

            {/* Intelligence report lock */}
            {isOwnListing ? (
              <div className="card border-2 border-blue-100 bg-blue-50/60 p-6">
                <div className="flex items-start gap-4">
                  <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-2xl bg-blue-100">
                    <Eye className="h-6 w-6 text-blue-700" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display mb-1 text-base font-bold text-navy-900">Owner Preview</h3>
                    <p className="mb-4 text-sm text-veriq-muted">
                      This is your own listing, so the full intelligence report, gallery, and private listing details are visible without unlocking.
                    </p>
                    <Link
                      href={`/dashboard/properties/${property.id}/edit`}
                      className="btn-primary inline-flex items-center gap-2 !py-2.5 !text-sm"
                    >
                      <FileText className="h-4 w-4" /> Edit Listing
                    </Link>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card p-6 border-2 border-emerald-200 bg-emerald-50/50">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-emerald-100 flex items-center justify-center flex-shrink-0">
                    <CheckCircle className="h-6 w-6 text-emerald-600" />
                  </div>
                  <div>
                    <h3 className="font-display text-base font-bold text-navy-900 mb-1">Intelligence Report Unlocked</h3>
                    <p className="text-sm text-veriq-muted">
                      You have full access to this property&apos;s intelligence report. Contact the agent directly to arrange an inspection.
                    </p>
                    {accessDetails?.accessExpiresAt && (
                      <div className="mt-4 w-full max-w-sm">
                        <AccessTimer expiresAt={accessDetails.accessExpiresAt} />
                      </div>
                    )}
                    {canContactAgent && (
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button type="button" onClick={handleStartChat} className="btn-primary !py-2.5 !text-sm flex items-center gap-2">
                          <MessageCircle className="h-4 w-4" /> Chat Agent
                        </button>
                        <a href={`tel:${agentContact!.phone}`} className="btn-outline !py-2.5 !text-sm flex items-center gap-2">
                          <Phone className="h-4 w-4" /> Call {agentContact!.phone}
                        </a>
                      </div>
                    )}
                    {hasAccess && !canContactAgent && (
                      <p className="mt-3 text-sm text-veriq-muted">
                        This agent has not enabled direct contact for unlocked reports.
                      </p>
                    )}
                    <div className="mt-4 flex flex-wrap items-center gap-2">
                      <AgentRatingButton propertyId={id} propertyTitle={property.title} />
                      <Link href="/dashboard/unlocks" className="btn-ghost !py-2.5 !text-sm">Unlock history &amp; refunds</Link>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasFullAccess && (
              <div className="space-y-5">
                <UnlockedMediaGallery media={unlocked?.media ?? []} />
                {unlocked && <DocumentedUnits units={unlocked.units} />}
                {unlocked && hasAccess && (
                  <ContactActions contacts={unlocked.propertyContacts} agentSupport={unlocked.agentSupport} bookingLink={unlocked.bookingLink} />
                )}
                <StreetIntelligencePanel presentation={unlocked?.streetIntelligence ?? null} />
                <IntelligenceGrid
                  title="Location & Access Intelligence"
                  items={[
                    { label: 'Exact Address', value: property.address },
                    { label: 'Flood Risk', value: property.floodRisk },
                    { label: 'Road Access', value: property.roadAccess },
                    { label: 'Road During Rain', value: property.roadAccessRain },
                  ]}
                />
                <IntelligenceGrid
                  title="Utilities & Connectivity"
                  items={[
                    { label: 'Electricity Situation', value: property.electricitySituation },
                    { label: 'Electricity Details', value: property.electricityInfo },
                    { label: 'Water Availability', value: property.waterAvailability },
                    { label: 'Water Source', value: property.waterSource },
                    { label: 'Network Quality', value: property.networkQuality },
                    { label: 'Best Networks', value: property.bestNetwork },
                  ]}
                />
                <IntelligenceGrid
                  title="Environment & Safety"
                  items={[
                    { label: 'Noise Level', value: property.noiseLevel },
                    { label: 'Noise Source', value: property.noiseSource },
                    { label: 'Security Feel', value: property.securityFeel },
                    { label: 'Security Features', value: property.securityFeatures },
                    { label: 'Compound Culture', value: property.compoundCulture },
                  ]}
                />
                {isHostel && (
                  <IntelligenceGrid
                    title="Hostel Intelligence"
                    items={[
                      { label: 'Suitable For', value: property.hostelSuitableFor },
                      { label: 'Persons Per Room', value: property.hostelPersonsPerRoom },
                      { label: 'Gender', value: property.hostelGender },
                      { label: 'Campus Proximity', value: property.hostelCampusProximity },
                      { label: 'Nearest Campus', value: property.hostelNearestCampus },
                      { label: 'Distance From Campus', value: property.hostelDistanceFromCampus },
                      { label: 'Meals Included', value: property.hostelMealsIncluded },
                      { label: 'Rules', value: property.hostelRulesNotes },
                    ]}
                  />
                )}
                {isShortStay && (
                  <IntelligenceGrid
                    title="Short Let Intelligence"
                    items={[
                      { label: 'Pricing Model', value: property.shortStayPricingModel },
                      { label: 'Daily Rate', value: property.shortStayDailyRate ? formatNaira(property.shortStayDailyRate) : null },
                      { label: 'Weekly Rate', value: property.shortStayWeeklyRate ? formatNaira(property.shortStayWeeklyRate) : null },
                      { label: 'Min Nights', value: property.shortStayMinNights },
                      { label: 'Max Nights', value: property.shortStayMaxNights },
                      { label: 'Check-in', value: property.shortStayCheckInTime },
                      { label: 'Check-out', value: property.shortStayCheckOutTime },
                      { label: 'Amenities', value: property.shortStayAmenities },
                      { label: 'House Rules', value: property.shortStayHouseRules },
                      { label: 'Air Conditioning', value: property.shortStayAC },
                      { label: 'Internet', value: property.shortStayInternet },
                      { label: 'Cleanliness', value: property.shortStayCleanliness },
                      { label: 'Furnishing', value: property.shortStayFurnishing },
                      { label: 'Kitchen Access', value: property.shortStayKitchen },
                      { label: 'Agent Note', value: property.shortStayAgentNote },
                    ]}
                  />
                )}
                <IntelligenceGrid
                  title="Condition & Agent Notes"
                  items={[
                    { label: 'Property Condition', value: property.propertyCondition },
                    { label: 'Known Issues', value: property.knownIssues },
                    { label: 'Agent Observation', value: property.agentObservation },
                  ]}
                />
              </div>
            )}
          </div>

          {/* Right: Agent card & meta */}
          <div className="space-y-5">
            {/* Agent card */}
            <div className="card p-6">
              <h3 className="font-display text-sm font-bold text-navy-900 mb-4">Listing Agent</h3>
              <div className="flex items-center gap-3 mb-4">
                <div className="h-12 w-12 rounded-full bg-veriq-secondary flex items-center justify-center text-white font-bold text-lg">
                  {agentInitial}
                </div>
                <div>
                  <p className="font-semibold text-navy-900">{agentName}</p>
                  {agent?.businessName && (
                    <p className="text-xs text-slate-500">{agent.businessName}</p>
                  )}
                  <span className={`inline-block mt-1 badge text-[10px] ${tierBadge.cls}`}>
                    {tierBadge.label} Tier
                  </span>
                </div>
                {agentVerified && (
                  <div className="ml-auto">
                    <span className="badge bg-emerald-50 text-emerald-700 text-[10px]">
                      <CheckCircle className="h-2.5 w-2.5" /> Verified
                    </span>
                  </div>
                )}
              </div>

              {agent?.bio && (
                <p className="text-xs text-veriq-muted italic mb-4 leading-relaxed">&ldquo;{agent.bio}&rdquo;</p>
              )}

              {!hasFullAccess && (
                <p className="text-[11px] text-slate-400">
                  Unlock the intelligence report to contact this agent directly.
                </p>
              )}
              {hasAccess && !isOwnListing && !agentContact && (
                <p className="text-[11px] text-slate-400">
                  This agent has disabled direct contact after payment.
                </p>
              )}
            </div>

            {/* Freshness */}
            <div className="card p-5">
              <div className="flex items-center gap-2 mb-3">
                <Clock className="h-4 w-4 text-emerald-500" />
                <span className="text-sm font-semibold text-navy-900">Listing Freshness</span>
              </div>
              <div className="h-2 rounded-full bg-slate-100 mb-2">
                <div className={`h-2 rounded-full ${freshness.cls} ${freshness.width}`} />
              </div>
              <p className={`text-xs font-medium ${
                property.freshnessScore === 'freshly_verified' ? 'text-emerald-600' :
                property.freshnessScore === 'recently_verified' ? 'text-blue-600' :
                property.freshnessScore === 'verification_expiring' ? 'text-amber-600' :
                'text-slate-500'
              }`}>
                {freshness.label}
              </p>
              <p className="text-[11px] text-slate-400 mt-1">
                Agents must reconfirm availability regularly to maintain freshness.
              </p>
            </div>

            {!isOwnListing && (
              <>
                {/* Unlock fee */}
                <div className="card p-5 bg-gradient-to-br from-navy-50 to-blue-50 border-blue-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Unlock fee</p>
                  <p className="text-2xl font-black text-navy-900 mb-1">
                    {isFreeUnlock ? 'Free · ₦0' : formatNaira(property.consultationFee)}
                  </p>
                  <p className="text-xs text-veriq-muted">
                    One unlock covers this property and every documented Unit for the access period shown on your unlock.
                  </p>
                </div>

                {/* Refund protection */}
                <div className="rounded-2xl bg-navy-900 p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-gold-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-semibold mb-1">Refund Protection</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        If a qualifying problem affected your unlock — stale availability, an invalid contact or a materially inaccurate verified fact —
                        request a refund inside the refund window. Approved refunds are credited to your Veriq Wallet.
                      </p>
                      <Link href="/refund-policy" className="mt-2 inline-flex text-xs font-semibold text-gold-400 hover:underline">Refund Policy</Link>
                    </div>
                  </div>
                </div>
              </>
            )}

            {/* Disclaimer */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-4">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Always physically inspect properties before making commitments. Veriq Property provides intelligence — not a guarantee.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
