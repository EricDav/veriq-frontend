'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, CheckCircle, Bed, Bath, Lock,
  Shield, Eye, FileText, Clock, AlertCircle, Home, Wallet,
  Phone, MessageCircle, X, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { propertiesApi, consultationsApi, chatApi, mediaApi, ApiError } from '@/lib/api';
import type { ConsultationAccess, MediaItem, Property } from '@/types';
import { AgentVerificationLevel, AgentTrustTier, FreshnessScore, PropertyType } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AgentRatingButton } from '@/components/agents/AgentRatingButton';

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

function UnlockedMediaGallery({ propertyId }: { propertyId: string }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeSection, setActiveSection] = useState('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    mediaApi.getAll(propertyId)
      .then((res) => setMedia((res.data as MediaItem[]) ?? []))
      .catch(() => setMedia([]))
      .finally(() => setIsLoading(false));
  }, [propertyId]);

  if (isLoading) {
    return (
      <div className="card flex h-44 items-center justify-center p-6">
        <LoadingSpinner size="md" className="text-veriq-secondary" />
      </div>
    );
  }

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
  const { success, error: toastError } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDetails, setAccessDetails] = useState<ConsultationAccess | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [notFound, setNotFound] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      setNotFound(false);
      try {
        const res = await propertiesApi.getById(id);
        const loadedProperty = res.data;
        setProperty(loadedProperty);

        const isOwnListing =
          !!user?.id &&
          (loadedProperty.agent?.userId === user.id || loadedProperty.agent?.user?.id === user.id);

        if (isOwnListing) {
          setHasAccess(true);
          setAccessDetails(null);
          return;
        }

        // Check if user already has access
        if (isAuthenticated) {
          try {
            const accessRes = await consultationsApi.checkAccess(id);
            setHasAccess(accessRes.data?.hasAccess ?? false);
            setAccessDetails(accessRes.data ?? null);
          } catch {
            // Ignore — means no access
          }
        } else {
          setHasAccess(false);
          setAccessDetails(null);
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    if (id && !isAuthLoading) load();
  }, [id, isAuthenticated, isAuthLoading, user?.id]);

  const handleUnlock = async () => {
    if (!isAuthenticated) {
      window.location.href = `/auth/login?redirect=/properties/${id}`;
      return;
    }
    setIsUnlocking(true);
    try {
      await consultationsApi.initiate({ propertyId: id });
      const accessRes = await consultationsApi.checkAccess(id);
      const confirmedAccess = accessRes.data?.hasAccess ?? false;
      setHasAccess(confirmedAccess);
      setAccessDetails(accessRes.data ?? null);
      if (!confirmedAccess) {
        throw new Error('Payment was processed, but access could not be confirmed. Please refresh and try again.');
      }
      success('Wallet debited. Intelligence report unlocked!');
    } catch (err) {
      if (err instanceof ApiError) {
        toastError(err.message);
      } else if (err instanceof Error) {
        toastError(err.message);
      } else {
        toastError('Failed to unlock report. Please try again.');
      }
    } finally {
      setIsUnlocking(false);
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
  const isOwnListing = !!user?.id && (agent?.userId === user.id || agent?.user?.id === user.id);
  const hasFullAccess = hasAccess || isOwnListing;
  const canContactAgent = hasAccess && !isOwnListing && !!agentContact?.phone;
  const location = [property.area, property.city, property.state].filter(Boolean).join(', ');
  const gradient = 'from-blue-600 to-indigo-800';
  const coverImageSrc = property.coverImageUrl ? mediaUrl(property.coverImageUrl) : null;
  const isHostel = property.propertyType === PropertyType.HOSTEL;
  const isShortStay = property.propertyType === PropertyType.SHORT_STAY;

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

              {/* Move-in costs */}
              <div className="mt-5 rounded-xl bg-veriq-surface p-4">
                <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
                  <span className="flex h-4 w-4 items-center justify-center text-sm font-black text-veriq-secondary">₦</span> Move-in Estimate
                </h3>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  {[
                    { label: 'Annual Rent', value: property.rentAmount },
                    { label: 'Agency Fee', value: property.agencyFee },
                    { label: 'Service Charge', value: property.serviceCharge },
                    { label: 'Legal Fee', value: property.legalFee },
                    { label: 'Caution Fee', value: property.cautionFee },
                    { label: 'Inspection Fee', value: property.inspectionFee },
                  ].map(
                    ({ label, value }) =>
                      Number(value) > 0 && (
                        <div key={label} className="flex justify-between">
                          <span className="text-slate-500">{label}</span>
                          <span className="font-semibold text-navy-800">{formatNaira(value)}</span>
                        </div>
                      ),
                  )}
                </div>
                {Number(property.totalMoveInEstimate) > 0 && (
                  <div className="mt-3 pt-3 border-t border-slate-200 flex justify-between">
                    <span className="text-xs font-bold text-navy-900">Total Move-in</span>
                    <span className="text-sm font-black text-navy-900">
                      {formatNaira(property.totalMoveInEstimate)}
                    </span>
                  </div>
                )}
              </div>
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
            ) : !hasFullAccess ? (
              <div className="card p-6 border-2 border-dashed border-gold-300 bg-gold-50/50">
                <div className="flex items-start gap-4">
                  <div className="h-12 w-12 rounded-2xl bg-gold-100 flex items-center justify-center flex-shrink-0">
                    <Lock className="h-6 w-6 text-gold-600" />
                  </div>
                  <div className="flex-1">
                    <h3 className="font-display text-base font-bold text-navy-900 mb-1">Full Intelligence Report Locked</h3>
                    <p className="text-sm text-veriq-muted mb-4">
                      Unlock the complete property intelligence report to access detailed images, environmental data, utility disclosures, and direct agent consultation.
                    </p>
                    <div className="grid grid-cols-2 gap-3 mb-4">
                      {[
                        { icon: Eye, label: 'Full photo gallery' },
                        { icon: FileText, label: 'Utility disclosures' },
                        { icon: MapPin, label: 'Environmental report' },
                        { icon: Shield, label: 'Agent consultation' },
                      ].map(({ icon: Icon, label }) => (
                        <div key={label} className="flex items-center gap-2 text-xs text-navy-700">
                          <Icon className="h-4 w-4 text-emerald-500" />
                          {label}
                        </div>
                      ))}
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="flex items-center gap-1.5 text-sm font-bold text-navy-900">
                        <Wallet className="h-4 w-4 text-gold-500" />
                        {formatNaira(property.consultationFee)}
                      </div>
                      <button
                        onClick={handleUnlock}
                        disabled={isUnlocking}
                        className="btn-gold flex items-center gap-2"
                      >
                        {isUnlocking ? (
                          <LoadingSpinner size="sm" className="text-navy-900" />
                        ) : (
                          <Lock className="h-4 w-4" />
                        )}
                        {isUnlocking ? 'Unlocking…' : 'Unlock Intelligence Report'}
                      </button>
                    </div>
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
                    <div className="mt-4">
                      <AgentRatingButton propertyId={id} propertyTitle={property.title} />
                    </div>
                  </div>
                </div>
              </div>
            )}

            {hasFullAccess && (
              <div className="space-y-5">
                <UnlockedMediaGallery propertyId={id} />
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
                    title="Short Stay Intelligence"
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

              <div className="space-y-2 mb-4">
                {[
                  { label: 'Listing Accuracy', value: `${Number(agent?.listingAccuracyScore ?? 0).toFixed(0)}%` },
                  { label: 'Inspection Success', value: `${Number(agent?.inspectionSuccessRate ?? 0).toFixed(0)}%` },
                  { label: 'Total Consultations', value: agent?.totalConsultations ?? 0 },
                  { label: 'Avg Response', value: agent?.avgResponseHours ? `${Number(agent.avgResponseHours).toFixed(1)}h` : 'N/A' },
                ].map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-xs">
                    <span className="text-slate-500">{m.label}</span>
                    <span className="font-semibold text-navy-800">{m.value}</span>
                  </div>
                ))}
              </div>

              {agent?.bio && (
                <p className="text-xs text-veriq-muted italic mb-4 leading-relaxed">"{agent.bio}"</p>
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
                {/* Consultation fee info */}
                <div className="card p-5 bg-gradient-to-br from-navy-50 to-blue-50 border-blue-100">
                  <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intelligence Access Fee</p>
                  <p className="text-2xl font-black text-navy-900 mb-1">
                    {formatNaira(property.consultationFee)}
                  </p>
                  <p className="text-xs text-veriq-muted">One-time fee for full report access (valid 48 hours)</p>
                </div>

                {/* Refund protection */}
                <div className="rounded-2xl bg-navy-900 p-5">
                  <div className="flex items-start gap-3">
                    <Shield className="h-5 w-5 text-gold-400 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-white text-sm font-semibold mb-1">Refund Protection</p>
                      <p className="text-slate-400 text-xs leading-relaxed">
                        If this property is unavailable after you unlock the report, you may qualify for a credit toward a similar available property.
                      </p>
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
