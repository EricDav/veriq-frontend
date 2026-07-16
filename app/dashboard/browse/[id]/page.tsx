'use client';

import React, { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft, MapPin, CheckCircle, Bed, Bath, Lock, Unlock,
  Shield, Eye, FileText, Clock, AlertCircle, Home, Wallet,
  Phone, Zap, Droplets, Wifi, Volume2, Star, MessageCircle,
  ChevronLeft, ChevronRight, X, Play, Timer, RefreshCw,
  Building2, Trees, Sun, Cloud, Car, Users, Gift,
} from 'lucide-react';
import { propertiesApi, consultationsApi, mediaApi, chatApi, communityApi, ApiError } from '@/lib/api';
import type { ConsultationAccess, Property, Consultation, MediaItem, FreeUnlockStatus } from '@/types';
import {
  AgentVerificationLevel, AgentTrustTier, FreshnessScore,
  FloodRisk, ElectricitySituation, WaterAvailability, WaterSource,
  RoadAccess, RoadAccessRain, NetworkQuality, NoiseLevel,
  SecurityFeel, PropertyCondition, CompoundCulture, PropertyType,
  ShortStayAC, ShortStayInternet, ShortStayCleanliness,
  ShortStayFurnishing, ShortStayKitchen, UserRole,
} from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { AgentRatingButton } from '@/components/agents/AgentRatingButton';

// ─── Constants ────────────────────────────────────────────────────────────

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

const FRESHNESS_INFO: Record<FreshnessScore, { label: string; cls: string; width: string }> = {
  freshly_verified: { label: 'Freshly verified — within 24 hours', cls: 'bg-emerald-500', width: 'w-full' },
  recently_verified: { label: 'Recently verified — 1–3 days ago', cls: 'bg-blue-500', width: 'w-4/5' },
  verification_expiring: { label: 'Verification expiring soon', cls: 'bg-amber-500', width: 'w-2/5' },
  unverified: { label: 'Not recently verified', cls: 'bg-slate-300', width: 'w-1/5' },
};

const TRUST_TIER_BADGE: Record<AgentTrustTier, { label: string; cls: string }> = {
  bronze: { label: 'Bronze', cls: 'bg-orange-100 text-orange-700' },
  silver: { label: 'Silver', cls: 'bg-slate-100 text-slate-700' },
  gold: { label: 'Gold', cls: 'bg-amber-100 text-amber-700' },
  platinum: { label: 'Platinum', cls: 'bg-purple-100 text-purple-700' },
};

// Section display labels
const SECTION_LABELS: Record<string, string> = {
  road_access: 'Road Access',
  environment: 'Environment',
  living_room: 'Living Room',
  kitchen: 'Kitchen',
  bathroom: 'Bathroom',
  bedroom: 'Bedroom',
  compound: 'Compound',
  water_area: 'Water Area',
  ceiling: 'Ceiling',
  other: 'Other',
};

// ─── Helpers ─────────────────────────────────────────────────────────────

function formatNaira(amount: number | null | undefined): string {
  if (!amount) return '₦0';
  return `₦${Number(amount).toLocaleString()}`;
}

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function useCountdown(expiresAt: string | null) {
  const [timeLeft, setTimeLeft] = useState<string>('');
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const diff = new Date(expiresAt).getTime() - Date.now();
      if (diff <= 0) {
        setIsExpired(true);
        setTimeLeft('Expired');
        return;
      }
      const h = Math.floor(diff / 3_600_000);
      const m = Math.floor((diff % 3_600_000) / 60_000);
      const s = Math.floor((diff % 60_000) / 1_000);
      setTimeLeft(`${h}h ${m}m ${s}s`);
    };

    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [expiresAt]);

  return { timeLeft, isExpired };
}

// ─── Media Gallery ────────────────────────────────────────────────────────

function MediaGallery({ propertyId }: { propertyId: string }) {
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeSection, setActiveSection] = useState<string>('all');
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  useEffect(() => {
    mediaApi.getAll(propertyId).then((res) => {
      setMedia((res.data as MediaItem[]) ?? []);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [propertyId]);

  const sections = ['all', ...Array.from(new Set(media.map((m) => m.section)))];
  const filtered = activeSection === 'all' ? media : media.filter((m) => m.section === activeSection);

  if (loading) return (
    <div className="flex items-center justify-center h-48">
      <LoadingSpinner size="md" />
    </div>
  );

  if (media.length === 0) return (
    <div className="flex flex-col items-center justify-center h-48 text-center">
      <Eye className="h-10 w-10 text-slate-300 mb-3" />
      <p className="text-sm text-slate-400">No media uploaded yet</p>
    </div>
  );

  const closeLightbox = () => setLightboxIdx(null);
  const prevImg = () => setLightboxIdx((i) => (i !== null ? Math.max(0, i - 1) : null));
  const nextImg = () => setLightboxIdx((i) => (i !== null ? Math.min(filtered.length - 1, i + 1) : null));

  return (
    <div>
      {/* Section filter tabs */}
      {sections.length > 2 && (
        <div className="flex gap-2 mb-4 overflow-x-auto pb-1 scrollbar-hide">
          {sections.map((s) => (
            <button
              key={s}
              onClick={() => setActiveSection(s)}
              className={`flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-semibold transition-all ${
                activeSection === s
                  ? 'bg-navy-900 text-white'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {SECTION_LABELS[s] ?? s}
            </button>
          ))}
        </div>
      )}

      {/* Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {filtered.map((item, idx) => (
          <button
            key={item.id}
            onClick={() => setLightboxIdx(idx)}
            className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 hover:opacity-90 transition-opacity"
          >
            <Image
              src={mediaUrl(item.url)}
              alt={item.caption ?? SECTION_LABELS[item.section] ?? item.section}
              fill
              className="object-cover"
              sizes="(max-width: 640px) 50vw, 33vw"
            />
            {item.caption && (
              <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/60 px-2 py-1.5">
                <p className="text-[10px] text-white truncate">{item.caption}</p>
              </div>
            )}
          </button>
        ))}
      </div>

      {/* Lightbox */}
      {lightboxIdx !== null && (
        <div
          className="fixed inset-0 z-[100] bg-black/90 flex items-center justify-center"
          onClick={closeLightbox}
        >
          <button
            onClick={(e) => { e.stopPropagation(); closeLightbox(); }}
            className="absolute top-4 right-4 text-white/60 hover:text-white"
          >
            <X className="h-7 w-7" />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); prevImg(); }}
            disabled={lightboxIdx === 0}
            className="absolute left-4 text-white/60 hover:text-white disabled:opacity-20"
          >
            <ChevronLeft className="h-10 w-10" />
          </button>
          <div
            className="relative w-full max-w-3xl max-h-[80vh] mx-16"
            onClick={(e) => e.stopPropagation()}
          >
            <Image
              src={mediaUrl(filtered[lightboxIdx].url)}
              alt={filtered[lightboxIdx].caption ?? ''}
              width={1200}
              height={800}
              className="object-contain w-full h-full max-h-[80vh] rounded-xl"
            />
            {filtered[lightboxIdx].caption && (
              <p className="text-center text-white/70 text-sm mt-3">
                {filtered[lightboxIdx].caption}
              </p>
            )}
            <p className="text-center text-white/40 text-xs mt-1">
              {lightboxIdx + 1} / {filtered.length}
            </p>
          </div>
          <button
            onClick={(e) => { e.stopPropagation(); nextImg(); }}
            disabled={lightboxIdx === filtered.length - 1}
            className="absolute right-4 text-white/60 hover:text-white disabled:opacity-20"
          >
            <ChevronRight className="h-10 w-10" />
          </button>
        </div>
      )}
    </div>
  );
}

// ─── Quick Intelligence Panel ─────────────────────────────────────────────

function displayValue(value: unknown) {
  if (value === null || value === undefined || value === '' || value === false) return null;
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) {
    return value.length ? value.map((item) => String(item).replace(/_/g, ' ')).join(', ') : null;
  }
  return String(value).replace(/_/g, ' ');
}

function QIRow({ label, value, icon: Icon }: { label: string; value: unknown; icon?: React.ElementType }) {
  const display = displayValue(value);
  if (!display) return null;
  return (
    <div className="flex items-center justify-between py-2.5 border-b border-slate-100 last:border-0">
      <div className="flex items-center gap-2 text-xs text-slate-500">
        {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
        {label}
      </div>
      <span className="text-xs font-semibold text-navy-800 capitalize">{display}</span>
    </div>
  );
}

function QIChips({ label, values }: { label: string; values: string[] | null | undefined }) {
  if (!values?.length) return null;
  return (
    <div className="py-2.5 border-b border-slate-100 last:border-0">
      <p className="text-xs text-slate-500 mb-1.5">{label}</p>
      <div className="flex flex-wrap gap-1.5">
        {values.map((v) => (
          <span key={v} className="rounded-full bg-navy-50 px-2.5 py-0.5 text-[11px] font-medium text-navy-700 capitalize">
            {v.replace(/_/g, ' ')}
          </span>
        ))}
      </div>
    </div>
  );
}

function QuickIntelligencePanel({ property }: { property: Property }) {
  const hasQI = property.floodRisk || property.electricitySituation || property.waterAvailability
    || property.roadAccess || property.networkQuality || property.noiseLevel || property.securityFeel
    || property.propertyCondition || property.compoundCulture;

  if (!hasQI) return null;

  return (
    <div className="card p-6">
      <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
        <Shield className="h-4 w-4 text-veriq-secondary" /> Veriq Quick Intelligence
      </h2>
      <div className="space-y-0">
        <QIRow label="Flood Risk" value={property.floodRisk} icon={Cloud} />
        <QIRow label="Electricity" value={property.electricitySituation} icon={Zap} />
        <QIChips label="Electricity Details" values={property.electricityInfo} />
        <QIRow label="Water Availability" value={property.waterAvailability} icon={Droplets} />
        <QIRow label="Water Source" value={property.waterSource} icon={Droplets} />
        <QIRow label="Road Access" value={property.roadAccess} icon={Car} />
        <QIRow label="Road in Rain" value={property.roadAccessRain} icon={Car} />
        <QIRow label="Network Quality" value={property.networkQuality} icon={Wifi} />
        <QIChips label="Best Networks" values={property.bestNetwork} />
        <QIRow label="Noise Level" value={property.noiseLevel} icon={Volume2} />
        <QIRow label="Noise Source" value={property.noiseSource} icon={Volume2} />
        <QIRow label="Security Feel" value={property.securityFeel} icon={Shield} />
        <QIChips label="Security Features" values={property.securityFeatures} />
        <QIRow label="Property Condition" value={property.propertyCondition} icon={Building2} />
        <QIChips label="Known Issues" values={property.knownIssues} />
        <QIRow label="Compound Culture" value={property.compoundCulture} icon={Users} />
      </div>
      {property.agentObservation && (
        <div className="mt-4 rounded-xl bg-veriq-surface p-3.5">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider mb-1">Agent Observation</p>
          <p className="text-sm text-navy-800 italic">"{property.agentObservation}"</p>
        </div>
      )}
    </div>
  );
}

// ─── Short Stay Intelligence Panel ────────────────────────────────────────

function ShortStayPanel({ property }: { property: Property }) {
  if (property.propertyType !== PropertyType.SHORT_STAY) return null;
  const hasData = property.shortStayPricingModel || property.shortStayDailyRate || property.shortStayWeeklyRate
    || property.shortStayMinNights || property.shortStayMaxNights || property.shortStayCheckInTime
    || property.shortStayCheckOutTime || property.shortStayAmenities?.length || property.shortStayHouseRules
    || property.shortStayAC || property.shortStayInternet || property.shortStayCleanliness
    || property.shortStayFurnishing || property.shortStayKitchen || property.shortStayAgentNote;
  if (!hasData) return null;

  return (
    <div className="card p-6">
      <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
        <Sun className="h-4 w-4 text-amber-500" /> Short Stay Intelligence
      </h2>
      <div className="space-y-0">
        <QIRow label="Pricing Model" value={property.shortStayPricingModel} icon={Wallet} />
        <QIRow label="Daily Rate" value={property.shortStayDailyRate ? formatNaira(property.shortStayDailyRate) : null} icon={Wallet} />
        <QIRow label="Weekly Rate" value={property.shortStayWeeklyRate ? formatNaira(property.shortStayWeeklyRate) : null} icon={Wallet} />
        <QIRow label="Min Nights" value={property.shortStayMinNights} icon={Timer} />
        <QIRow label="Max Nights" value={property.shortStayMaxNights} icon={Timer} />
        <QIRow label="Check-in" value={property.shortStayCheckInTime} icon={Clock} />
        <QIRow label="Check-out" value={property.shortStayCheckOutTime} icon={Clock} />
        <QIChips label="Amenities" values={property.shortStayAmenities} />
        <QIRow label="House Rules" value={property.shortStayHouseRules} icon={FileText} />
        <QIRow label="Air Conditioning" value={property.shortStayAC} icon={Sun} />
        <QIRow label="Internet" value={property.shortStayInternet} icon={Wifi} />
        <QIRow label="Cleanliness" value={property.shortStayCleanliness} icon={Star} />
        <QIRow label="Furnishing" value={property.shortStayFurnishing} icon={Home} />
        <QIRow label="Kitchen Access" value={property.shortStayKitchen} icon={Building2} />
      </div>
      {property.shortStayAgentNote && (
        <div className="mt-4 rounded-xl bg-amber-50 p-3.5">
          <p className="text-[10px] font-semibold text-amber-600 uppercase tracking-wider mb-1">Agent Note</p>
          <p className="text-sm text-navy-800 italic">"{property.shortStayAgentNote}"</p>
        </div>
      )}
    </div>
  );
}

function HostelPanel({ property }: { property: Property }) {
  if (property.propertyType !== PropertyType.HOSTEL) return null;
  const hasData = property.hostelSuitableFor?.length || property.hostelPersonsPerRoom
    || property.hostelGender || property.hostelCampusProximity || property.hostelNearestCampus
    || property.hostelDistanceFromCampus || property.hostelMealsIncluded || property.hostelRulesNotes;
  if (!hasData) return null;

  return (
    <div className="card p-6">
      <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
        <Users className="h-4 w-4 text-veriq-secondary" /> Hostel Intelligence
      </h2>
      <div className="space-y-0">
        <QIChips label="Suitable For" values={property.hostelSuitableFor} />
        <QIRow label="Persons Per Room" value={property.hostelPersonsPerRoom} icon={Users} />
        <QIRow label="Gender" value={property.hostelGender} icon={Users} />
        <QIRow label="Campus Proximity" value={property.hostelCampusProximity} icon={MapPin} />
        <QIRow label="Nearest Campus" value={property.hostelNearestCampus} icon={Building2} />
        <QIRow label="Distance From Campus" value={property.hostelDistanceFromCampus} icon={MapPin} />
        <QIRow label="Meals Included" value={property.hostelMealsIncluded} icon={Home} />
        <QIRow label="Rules" value={property.hostelRulesNotes} icon={FileText} />
      </div>
    </div>
  );
}

// ─── Access Timer ─────────────────────────────────────────────────────────

function AccessTimer({ expiresAt }: { expiresAt: string }) {
  const { timeLeft, isExpired } = useCountdown(expiresAt);

  return (
    <div className={`flex w-full items-center gap-3 rounded-xl border px-4 py-3 ${
      isExpired
        ? 'bg-red-50 border-red-200'
        : 'bg-emerald-50 border-emerald-200'
    }`}>
      <Timer className={`h-4 w-4 flex-shrink-0 ${isExpired ? 'text-red-500' : 'text-emerald-600'}`} />
      <div className="min-w-0">
        <p className={`text-xs font-semibold ${isExpired ? 'text-red-700' : 'text-emerald-700'}`}>
          {isExpired ? 'Access Expired' : 'Access expires in'}
        </p>
        {!isExpired && <p className="break-words text-sm font-bold text-navy-900">{timeLeft}</p>}
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function DashboardPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const { success, error: toastError } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [consultation, setConsultation] = useState<Consultation | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [accessDetails, setAccessDetails] = useState<ConsultationAccess | null>(null);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [freeUnlock, setFreeUnlock] = useState<FreeUnlockStatus | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [isCoverPreviewOpen, setIsCoverPreviewOpen] = useState(false);
  const [heroImgIdx, setHeroImgIdx] = useState(0);
  const [viewAsUser, setViewAsUser] = useState(false);

  const load = useCallback(async () => {
    setIsLoading(true);
    setNotFound(false);
    try {
      const res = await propertiesApi.getById(id);
      const loadedProperty = res.data;
      setProperty(loadedProperty);
      communityApi.freeUnlockStatus(id).then((statusRes) => setFreeUnlock(statusRes.data)).catch(() => setFreeUnlock(null));

      const isOwnListing =
        !!user?.id &&
        (loadedProperty.agent?.userId === user.id || loadedProperty.agent?.user?.id === user.id);

      if (isOwnListing) {
        setHasAccess(false);
        setAccessDetails(null);
        setConsultation(null);
        return;
      }

      if (isAuthenticated) {
        try {
          const accessRes = await consultationsApi.checkAccess(id);
          const access = accessRes.data?.hasAccess ?? false;
          setHasAccess(access);
          setAccessDetails(accessRes.data ?? null);
          if (access) {
            // Find active consultation for the timer
            const myRes = await consultationsApi.getMyConsultations(1, 50);
            const active = myRes.data.find(
              (c) => c.propertyId === id && (c.status === 'unlocked' || c.status === 'paid'),
            );
            if (active) setConsultation(active);
          }
        } catch {
          // no access yet — ok
        }
      } else {
        setHasAccess(false);
        setAccessDetails(null);
        setConsultation(null);
      }
    } catch {
      setNotFound(true);
    } finally {
      setIsLoading(false);
    }
  }, [id, isAuthenticated, user?.id]);

  useEffect(() => { if (id && !isAuthLoading) load(); }, [id, isAuthLoading, load]);

  // ── Wallet unlock flow ──
  const handleUnlock = useCallback(async () => {
    if (!isAuthenticated) { toastError('Please log in to unlock this report.'); return; }
    if (property?.agent?.userId === user?.id || property?.agent?.user?.id === user?.id) {
      toastError('Agents cannot unlock their own listings.');
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
      await load();
    } catch (err) {
      toastError(err instanceof ApiError || err instanceof Error ? err.message : 'Failed to unlock report.');
    } finally {
      setIsUnlocking(false);
    }
  }, [id, isAuthenticated, load, property?.agent?.user?.id, property?.agent?.userId, success, toastError, user?.id]);

  const handleFreeUnlock = useCallback(async () => {
    if (!isAuthenticated) { toastError('Please log in to claim a Free Unlock.'); return; }
    if (property?.agent?.userId === user?.id || property?.agent?.user?.id === user?.id) {
      toastError('Agents cannot unlock their own listings.');
      return;
    }
    if (freeUnlock?.eligibility?.reason === 'community_membership_required') {
      router.push('/dashboard/community');
      return;
    }

    setIsUnlocking(true);
    try {
      await communityApi.unlockFreeProperty(id);
      const accessRes = await consultationsApi.checkAccess(id);
      setHasAccess(accessRes.data?.hasAccess ?? true);
      setAccessDetails(accessRes.data ?? null);
      success('Free Unlock claimed. Intelligence report unlocked!');
      await load();
    } catch (err) {
      toastError(err instanceof ApiError || err instanceof Error ? err.message : 'Unable to claim Free Unlock.');
    } finally {
      setIsUnlocking(false);
    }
  }, [freeUnlock?.eligibility?.reason, id, isAuthenticated, load, property?.agent?.user?.id, property?.agent?.userId, router, success, toastError, user?.id]);

  const handleStartChat = useCallback(async () => {
    if (!isAuthenticated) { toastError('Please log in to chat with this agent.'); return; }
    try {
      const res = await chatApi.startConversation(id);
      router.push(`/dashboard/chat?conversation=${res.data.id}`);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to start chat.');
    }
  }, [id, isAuthenticated, router, toastError]);

  if (isLoading) return <PageLoader />;

  if (notFound || !property) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Property Not Found</h1>
        <p className="text-veriq-muted mb-6">This listing may have been removed or is no longer available.</p>
        <Link href="/dashboard/browse" className="btn-primary">Back to Browse</Link>
      </div>
    );
  }

  const agent = property.agent;
  const agentName = agent?.user ? `${agent.user.firstName} ${agent.user.lastName}` : 'Unknown Agent';
  const agentInitial = agentName[0]?.toUpperCase() ?? 'A';
  const agentVerified = (agent?.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;
  const freshness = FRESHNESS_INFO[property.freshnessScore];
  const tierBadge = TRUST_TIER_BADGE[agent?.trustTier ?? AgentTrustTier.BRONZE];
  const location = [property.area, property.city, property.state].filter(Boolean).join(', ');
  const isShortStay = property.propertyType === PropertyType.SHORT_STAY;
  const agentContact = accessDetails?.agentContact;
  const isOwnListing = !!user?.id && user.role === UserRole.AGENT && (agent?.userId === user.id || agent?.user?.id === user.id);
  const ownerFullAccess = isOwnListing && !viewAsUser;
  const hasFullAccess = hasAccess || ownerFullAccess;
  const canContactAgent = hasAccess && !isOwnListing && !!agentContact?.phone;

  // Hero image — cover or gradient fallback
  const hasCover = !!property.coverImageUrl;
  const coverImageSrc = hasCover ? mediaUrl(property.coverImageUrl!) : null;

  return (
    <div className="max-w-7xl mx-auto">
      {/* Back */}
      <Link
        href="/dashboard/browse"
        className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Browse
      </Link>

      {isOwnListing && (
        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-bold text-navy-900">You are viewing your own listing</p>
              <p className="mt-0.5 text-xs text-blue-800">
                Owner view shows all private details by default. Switch to user preview to see the locked renter experience.
              </p>
            </div>
            <div className="flex rounded-xl bg-white p-1 shadow-sm">
              <button
                type="button"
                onClick={() => setViewAsUser(false)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  !viewAsUser ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                Owner view
              </button>
              <button
                type="button"
                onClick={() => setViewAsUser(true)}
                className={`rounded-lg px-3 py-2 text-xs font-bold transition-colors ${
                  viewAsUser ? 'bg-navy-900 text-white' : 'text-slate-600 hover:bg-slate-50'
                }`}
              >
                View as user
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* ── Left ── */}
        <div className="lg:col-span-2 space-y-6">

          {/* Hero */}
          <div className="relative h-72 rounded-2xl overflow-hidden bg-gradient-to-br from-blue-600 to-indigo-800">
            {hasCover ? (
              hasFullAccess ? (
                <button
                  type="button"
                  onClick={() => setIsCoverPreviewOpen(true)}
                  className="group absolute inset-0 cursor-zoom-in"
                  aria-label={`View full cover photo for ${property.title}`}
                >
                  <img
                    src={coverImageSrc!}
                    alt={property.title}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-[1.02]"
                  />
                  <span className="absolute bottom-4 left-4 rounded-lg bg-navy-900/80 px-3 py-2 text-xs font-semibold text-white backdrop-blur-sm opacity-0 transition-opacity group-hover:opacity-100">
                    View full photo
                  </span>
                </button>
              ) : (
                <img
                  src={coverImageSrc!}
                  alt={property.title}
                  className="h-full w-full object-cover"
                />
              )
            ) : (
              <div className="absolute inset-0 flex items-center justify-center">
                <Home className="h-20 w-20 text-white/10" />
              </div>
            )}
            {/* Overlay badges */}
            <div className="absolute top-4 left-4 flex gap-2">
              <span className={`badge text-xs font-semibold capitalize ${
                property.status === 'active' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-700'
              }`}>
                {property.status}
              </span>
              {agentVerified && (
                <span className="badge bg-white/90 text-emerald-700 text-xs gap-1">
                  <CheckCircle className="h-3 w-3" /> Verified
                </span>
              )}
            </div>
            {/* Lock overlay for non-unlocked */}
            {!hasFullAccess && (
              <div className="absolute bottom-4 right-4 flex items-center gap-1.5 rounded-lg bg-navy-900/80 backdrop-blur-sm px-3 py-2">
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span className="text-xs font-semibold text-white">Full gallery unlocked after payment</span>
              </div>
            )}
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
                  <MapPin className="h-4 w-4" /> {location}
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
              {property.floorLevel && (
                <span className="text-sm text-navy-700">{property.floorLevel}</span>
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
              <div className="grid grid-cols-2 gap-x-6 gap-y-1.5 text-xs">
                {[
                  { label: 'Annual Rent', value: property.rentAmount },
                  { label: 'Agency Fee', value: property.agencyFee },
                  { label: 'Service Charge', value: property.serviceCharge },
                  { label: 'Legal Fee', value: property.legalFee },
                  { label: 'Caution Fee', value: property.cautionFee },
                  { label: 'Inspection Fee', value: property.inspectionFee },
                ].map(({ label, value }) =>
                  Number(value) > 0 ? (
                    <div key={label} className="flex justify-between">
                      <span className="text-slate-500">{label}</span>
                      <span className="font-semibold text-navy-800">{formatNaira(value)}</span>
                    </div>
                  ) : null,
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

            {/* Short Stay-specific details */}
            {isShortStay && (property.shortStayDailyRate || property.shortStayWeeklyRate) && (
              <div className="mt-4 rounded-xl bg-amber-50 border border-amber-100 p-4">
                <h3 className="font-semibold text-navy-900 mb-3 flex items-center gap-2">
                  <Sun className="h-4 w-4 text-amber-500" /> Short Stay Rates
                </h3>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  {property.shortStayDailyRate && (
                    <div>
                      <p className="text-slate-500">Per night</p>
                      <p className="font-bold text-navy-900">{formatNaira(property.shortStayDailyRate)}</p>
                    </div>
                  )}
                  {property.shortStayWeeklyRate && (
                    <div>
                      <p className="text-slate-500">Per week</p>
                      <p className="font-bold text-navy-900">{formatNaira(property.shortStayWeeklyRate)}</p>
                    </div>
                  )}
                  {property.shortStayMinNights && (
                    <div>
                      <p className="text-slate-500">Min nights</p>
                      <p className="font-bold text-navy-900">{property.shortStayMinNights}</p>
                    </div>
                  )}
                  {property.shortStayCheckInTime && (
                    <div>
                      <p className="text-slate-500">Check-in</p>
                      <p className="font-bold text-navy-900">{property.shortStayCheckInTime}</p>
                    </div>
                  )}
                </div>
                {property.shortStayHouseRules && (
                  <p className="mt-3 text-xs text-slate-600 border-t border-amber-200 pt-3">
                    <span className="font-semibold">House rules: </span>{property.shortStayHouseRules}
                  </p>
                )}
              </div>
            )}
          </div>

          {/* ── Intelligence Report Block ── */}
          {!hasFullAccess ? (
            /* Lock panel */
            <div className="card p-6 border-2 border-dashed border-amber-300 bg-amber-50/40">
              <div className="flex items-start gap-4">
                <div className="h-12 w-12 rounded-2xl bg-amber-100 flex items-center justify-center flex-shrink-0">
                  <Lock className="h-6 w-6 text-amber-600" />
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-base font-bold text-navy-900 mb-1">
                    Full Intelligence Report Locked
                  </h3>
                  <p className="text-sm text-veriq-muted mb-4">
                    Unlock the complete property intelligence report to access full photo gallery, environmental data,
                    utility disclosures, and direct agent consultation — valid for 48 hours.
                  </p>
                  {isOwnListing && viewAsUser && (
                    <p className="mb-4 rounded-xl border border-blue-100 bg-white px-3 py-2 text-xs font-semibold text-blue-800">
                      Preview mode only: agents cannot unlock or pay for their own listings.
                    </p>
                  )}
                  <div className="grid grid-cols-2 gap-3 mb-5">
                    {[
                      { icon: Eye, label: 'Full photo gallery' },
                      { icon: FileText, label: 'Utility disclosures' },
                      { icon: MapPin, label: 'Environmental report' },
                      { icon: Shield, label: 'Agent phone number' },
                      { icon: Zap, label: 'Electricity & water data' },
                      { icon: Clock, label: '48-hour access window' },
                    ].map(({ icon: Icon, label }) => (
                      <div key={label} className="flex items-center gap-2 text-xs text-navy-700">
                        <Icon className="h-3.5 w-3.5 text-emerald-500 flex-shrink-0" /> {label}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-4 flex-wrap">
                    {freeUnlock?.available && !isOwnListing && (
                      <div className="w-full rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="flex items-center gap-2 text-sm font-black text-emerald-800">
                              <Gift className="h-4 w-4" /> Free Unlock Available
                            </p>
                            <p className="mt-1 text-xs text-emerald-700">Active contributors can open this report without wallet payment.</p>
                          </div>
                          <button type="button" onClick={handleFreeUnlock} disabled={isUnlocking} className="rounded-lg bg-emerald-600 px-4 py-2 text-xs font-bold text-white hover:bg-emerald-700 disabled:opacity-60">
                            {isUnlocking ? 'Claiming…' : freeUnlock.eligibility?.reason === 'community_membership_required' ? 'Join Community to Unlock' : 'Claim Free Unlock'}
                          </button>
                        </div>
                      </div>
                    )}
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-amber-500" />
                      <span className="text-base font-black text-navy-900">
                        {formatNaira(property.consultationFee)}
                      </span>
                      <span className="text-xs text-slate-400">one-time</span>
                    </div>
                    <button
                      onClick={handleUnlock}
                      disabled={isUnlocking || isOwnListing}
                      className="btn-gold flex items-center gap-2"
                    >
                      {isUnlocking ? (
                        <LoadingSpinner size="sm" className="text-navy-900" />
                      ) : (
                        <Lock className="h-4 w-4" />
                      )}
                      {isOwnListing ? 'Own listing cannot be unlocked' : isUnlocking ? 'Unlocking…' : 'Unlock Intelligence Report'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Post-unlock content */
            <div className="space-y-6">
              {/* Unlocked header */}
              <div className="rounded-2xl border-2 border-emerald-200 bg-emerald-50 p-5">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex items-start gap-3">
                    <Unlock className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
                    <div className="min-w-0">
                      <p className="mb-0.5 font-semibold text-emerald-800">
                        {isOwnListing ? 'Owner Full Details' : 'Intelligence Report Unlocked'}
                      </p>
                      <p className="text-xs text-emerald-700">
                        {isOwnListing
                          ? 'This is your listing, so all report details are visible without unlocking.'
                          : 'You have full access. Contact the agent to arrange an inspection.'}
                      </p>
                    </div>
                  </div>
                  {!isOwnListing && consultation?.accessExpiresAt && (
                    <div className="w-full sm:w-auto sm:flex-shrink-0">
                      <AccessTimer expiresAt={consultation.accessExpiresAt} />
                    </div>
                  )}
                </div>
              </div>

              {/* Agent contact */}
              {canContactAgent && (
                <div className="card p-5">
                  <h3 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
                    <Phone className="h-4 w-4 text-veriq-secondary" /> Agent Contact
                  </h3>
                  <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-veriq-secondary flex items-center justify-center text-white font-bold text-sm">
                      {agentInitial}
                    </div>
                    <div>
                      <p className="font-semibold text-navy-900">{agentName}</p>
                      <p className="text-veriq-secondary font-semibold text-sm">{agentContact!.phone}</p>
                    </div>
                  </div>
                  <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button type="button" onClick={handleStartChat} className="btn-primary !py-2.5 !text-sm flex items-center justify-center gap-2">
                      <MessageCircle className="h-4 w-4" /> Chat Agent
                    </button>
                    <a href={`tel:${agentContact!.phone}`} className="btn-outline !py-2.5 !text-sm flex items-center justify-center gap-2">
                      <Phone className="h-4 w-4" /> Call Agent
                    </a>
                  </div>
                  <div className="mt-2">
                    <AgentRatingButton propertyId={id} propertyTitle={property.title} className="btn-outline !py-2.5 !text-sm flex w-full items-center justify-center gap-2" />
                  </div>
                  <p className="mt-3 text-xs text-slate-400">
                    Always physically inspect the property before making any payments or commitments.
                  </p>
                </div>
              )}
              {hasAccess && !isOwnListing && !canContactAgent && (
                <div className="card p-5">
                  <h3 className="font-display text-sm font-bold text-navy-900 mb-2 flex items-center gap-2">
                    <MessageCircle className="h-4 w-4 text-slate-400" /> Agent Contact
                  </h3>
                  <p className="text-sm text-veriq-muted">
                    This agent has not enabled direct contact for unlocked reports. Use the property intelligence details to decide your next step.
                  </p>
                  <div className="mt-4">
                    <AgentRatingButton propertyId={id} propertyTitle={property.title} className="btn-outline !py-2.5 !text-sm flex w-full items-center justify-center gap-2" />
                  </div>
                </div>
              )}

              {/* Media gallery */}
              <div className="card p-6">
                <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
                  <Eye className="h-4 w-4 text-veriq-secondary" /> Property Photos
                </h2>
                <MediaGallery propertyId={id} />
              </div>

              {/* Quick Intelligence */}
              <QuickIntelligencePanel property={property} />

              {/* Hostel Intelligence */}
              <HostelPanel property={property} />

              {/* Short Stay Intelligence */}
              <ShortStayPanel property={property} />
            </div>
          )}
        </div>

        {/* ── Right sidebar ── */}
        <div className="space-y-5">
          {/* Agent card */}
          <div className="card p-6">
            <h3 className="font-display text-sm font-bold text-navy-900 mb-4">Listing Agent</h3>
            <div className="flex items-center gap-3 mb-4">
              <div className="h-12 w-12 rounded-full bg-veriq-secondary flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                {agentInitial}
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-navy-900 truncate">{agentName}</p>
                {agent?.businessName && (
                  <p className="text-xs text-slate-500 truncate">{agent.businessName}</p>
                )}
                <span className={`inline-block mt-1 badge text-[10px] ${tierBadge.cls}`}>
                  {tierBadge.label} Tier
                </span>
              </div>
              {agentVerified && (
                <div className="ml-auto flex-shrink-0">
                  <span className="badge bg-emerald-50 text-emerald-700 text-[10px] gap-1">
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
                Phone number revealed after unlocking the report.
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
            <div className="h-2 rounded-full bg-slate-100 mb-2 overflow-hidden">
              <div className={`h-2 rounded-full transition-all ${freshness.cls} ${freshness.width}`} />
            </div>
            <p className={`text-xs font-medium ${
              property.freshnessScore === 'freshly_verified' ? 'text-emerald-600' :
              property.freshnessScore === 'recently_verified' ? 'text-blue-600' :
              property.freshnessScore === 'verification_expiring' ? 'text-amber-600' :
              'text-slate-500'
            }`}>
              {freshness.label}
            </p>
            {property.lastVerifiedAt && (
              <p className="text-[11px] text-slate-400 mt-1">
                Last verified: {new Date(property.lastVerifiedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })}
              </p>
            )}
          </div>

          {/* Access fee / timer */}
          {!hasFullAccess ? (
            <div className="card p-5 bg-gradient-to-br from-navy-50 to-blue-50 border-blue-100">
              <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intelligence Access Fee</p>
              <p className="text-2xl font-black text-navy-900 mb-0.5">
                {formatNaira(property.consultationFee)}
              </p>
              <p className="text-xs text-veriq-muted">One-time fee — valid 48 hours</p>
            </div>
          ) : !isOwnListing && consultation?.accessExpiresAt ? (
            <AccessTimer expiresAt={consultation.accessExpiresAt} />
          ) : null}

          {/* Refund protection */}
          <div className="rounded-2xl bg-navy-900 p-5">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-amber-400 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-white text-sm font-semibold mb-1">Refund Protection</p>
                <p className="text-slate-400 text-xs leading-relaxed">
                  If this property is unavailable after you unlock the report, you may qualify for a credit toward another available property.
                </p>
              </div>
            </div>
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-4">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-[11px] text-amber-700 leading-relaxed">
              Always physically inspect properties before making commitments. Veriq provides intelligence — not a guarantee.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
