'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Home, EyeOff, Eye, Search, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle, MapPin, X, User, MessageCircle,
} from 'lucide-react';
import { propertiesApi, mediaApi, chatApi, ApiError } from '@/lib/api';
import type { MediaItem, Property } from '@/types';
import { ListingStatus, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_STYLES: Record<ListingStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  occupied: 'bg-blue-100 text-blue-700',
  hidden: 'bg-slate-100 text-slate-500',
  taken: 'bg-purple-100 text-purple-700',
  expired: 'bg-red-100 text-red-600',
};

type ActionType = 'hide' | 'unhide';

interface PendingAction {
  propertyId: string;
  type: ActionType;
  title: string;
}

const money = (value: number | string | null | undefined) =>
  `₦${Number(value ?? 0).toLocaleString()}`;

const pretty = (value: unknown) => {
  if (value === null || value === undefined || value === '') return 'Not provided';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (Array.isArray(value)) return value.length ? value.map((item) => String(item).replace(/_/g, ' ')).join(', ') : 'None';
  return String(value).replace(/_/g, ' ');
};

const dateTime = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Not provided';

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

function mediaUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function DetailItem({ label, value }: { label: string; value: unknown }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase text-slate-400">{label}</p>
      <p className="mt-1 break-words text-xs font-medium capitalize text-navy-900">{pretty(value)}</p>
    </div>
  );
}

function DetailSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="text-sm font-bold text-navy-900">{title}</h3>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">{children}</div>
    </section>
  );
}

function AdminPropertiesPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const agentId = searchParams.get('agentId') ?? undefined;
  const agentName = searchParams.get('agentName') ?? undefined;

  const [properties, setProperties] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [statusSummary, setStatusSummary] = useState<Record<string, number>>({ total: 0 });
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActioning, setIsActioning] = useState(false);
  const [viewingProperty, setViewingProperty] = useState<Property | null>(null);
  const [propertyMedia, setPropertyMedia] = useState<MediaItem[]>([]);
  const [isLoadingMedia, setIsLoadingMedia] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  // Reset to page 1 whenever the agent filter changes
  useEffect(() => {
    setPage(1);
  }, [agentId]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Admin endpoint returns properties of every status (active, hidden, expired…)
      const res = await propertiesApi.listAdmin({ page, limit: 20, agentId });
      setProperties(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
      setStatusSummary(res.meta.summary ?? { total: res.meta.total });
    } catch {
      toastError('Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }, [page, agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    if (!viewingProperty?.id) {
      setPropertyMedia([]);
      return;
    }

    setIsLoadingMedia(true);
    mediaApi
      .getAll(viewingProperty.id)
      .then((res) => setPropertyMedia(res.data ?? []))
      .catch(() => setPropertyMedia([]))
      .finally(() => setIsLoadingMedia(false));
  }, [viewingProperty?.id]);

  const executeAction = async () => {
    if (!pendingAction) return;
    setIsActioning(true);
    try {
      const { propertyId, type } = pendingAction;
      if (type === 'hide') {
        const res = await propertiesApi.hide(propertyId);
        setProperties((prev) => prev.map((p) => (p.id === propertyId ? res.data : p)));
        success('Property hidden.');
      } else {
        const res = await propertiesApi.unhide(propertyId);
        setProperties((prev) => prev.map((p) => (p.id === propertyId ? res.data : p)));
        success('Property restored.');
      }
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setIsActioning(false);
      setPendingAction(null);
    }
  };

  const startAgentChat = async (propertyId: string) => {
    try {
      const res = await chatApi.startConversation(propertyId);
      router.push(`/dashboard/chat?conversation=${res.data.id}`);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to start chat with agent');
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  const filteredProps = search.trim()
    ? properties.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q)
        );
      })
    : properties;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Property Management</h1>
          <p className="text-sm text-veriq-muted">
            {agentId
              ? `${total} listing${total !== 1 ? 's' : ''}${agentName ? ` by ${agentName}` : ''}`
              : `${total} listings in the platform`}
          </p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Agent filter banner */}
      {agentId && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-veriq-secondary/30 bg-veriq-secondary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-navy-800">
            <User className="h-4 w-4 text-veriq-secondary flex-shrink-0" />
            Showing listings for <span className="font-semibold">{agentName || 'this agent'}</span>
          </div>
          <Link
            href="/dashboard/admin/properties"
            className="flex items-center gap-1 text-xs font-medium text-veriq-secondary hover:underline"
          >
            <X className="h-3 w-3" /> Clear filter
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
        {[
          { label: 'Total', value: total, cls: 'text-navy-900' },
          { label: 'Active', value: statusSummary.active ?? 0, cls: 'text-emerald-600' },
          { label: 'Pending', value: statusSummary.pending ?? 0, cls: 'text-amber-600' },
          { label: 'Occupied', value: statusSummary.occupied ?? 0, cls: 'text-blue-600' },
          { label: 'Hidden', value: statusSummary.hidden ?? 0, cls: 'text-slate-500' },
          { label: 'Expired/Taken', value: (statusSummary.expired ?? 0) + (statusSummary.taken ?? 0), cls: 'text-red-500' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 max-w-md">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by title, area, or city…"
          className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" className="text-veriq-secondary" />
          </div>
        ) : filteredProps.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Home className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-navy-900">No properties found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-veriq-surface">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Property</th>
                  <th className="px-4 py-4 font-medium">Agent</th>
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium">Rent</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Freshness</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProps.map((prop) => {
                  const agentName = prop.agent?.user
                    ? `${prop.agent.user.firstName} ${prop.agent.user.lastName}`
                    : 'Unknown';
                  const isHidden = prop.status === ListingStatus.HIDDEN;

                  return (
                    <tr key={prop.id} className={`hover:bg-slate-50 transition-colors ${isHidden ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-navy-900 text-xs max-w-[180px] truncate">{prop.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {prop.propertyType.replace(/_/g, ' ')} · {prop.bedrooms}bd {prop.bathrooms}ba
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-navy-700 truncate max-w-[100px]">{agentName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[90px]">{prop.area}, {prop.state}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-semibold text-navy-900">
                          ₦{Number(prop.rentAmount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] ${STATUS_STYLES[prop.status]}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] capitalize ${
                          prop.freshnessScore === 'freshly_verified' ? 'bg-emerald-50 text-emerald-600' :
                          prop.freshnessScore === 'recently_verified' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {prop.freshnessScore.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/properties/${prop.id}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View public listing"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          <button
                            onClick={() => setViewingProperty(prop)}
                            className="rounded-lg p-1.5 text-navy-700 hover:bg-slate-100 transition-colors"
                            title="View all admin data"
                          >
                            <Search className="h-3.5 w-3.5" />
                          </button>
                          {isHidden ? (
                            <button
                              onClick={() => setPendingAction({ propertyId: prop.id, type: 'unhide', title: prop.title })}
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 text-emerald-600 px-3 py-1.5 text-[10px] font-bold hover:bg-emerald-50"
                            >
                              <CheckCircle className="h-3 w-3" /> Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ propertyId: prop.id, type: 'hide', title: prop.title })}
                              className="flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-[10px] font-bold hover:bg-red-50"
                            >
                              <EyeOff className="h-3 w-3" /> Hide
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirm */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={executeAction}
        title={pendingAction?.type === 'hide' ? 'Hide Listing' : 'Restore Listing'}
        message={
          pendingAction?.type === 'hide'
            ? `Force-hide "${pendingAction?.title}"? It will no longer appear in public listings.`
            : `Restore "${pendingAction?.title}"? It will be visible to the public again.`
        }
        confirmLabel={pendingAction?.type === 'hide' ? 'Hide' : 'Restore'}
        variant={pendingAction?.type === 'hide' ? 'danger' : 'primary'}
        isLoading={isActioning}
      />

      {viewingProperty && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-3 py-6 sm:px-4">
          <div className="max-h-[92vh] w-full max-w-5xl overflow-y-auto rounded-2xl bg-white shadow-card-hover">
            <div className="sticky top-0 z-10 flex items-start justify-between gap-3 border-b border-slate-100 bg-white px-5 py-4">
              <div>
                <h2 className="font-display text-lg font-bold text-navy-900">Property Data</h2>
                <p className="text-xs text-veriq-muted">{viewingProperty.title}</p>
              </div>
              <button type="button" onClick={() => setViewingProperty(null)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100">
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-6 p-5">
              {viewingProperty.coverImageUrl && (
                <div className="overflow-hidden rounded-xl border border-slate-100">
                  <img src={mediaUrl(viewingProperty.coverImageUrl)} alt={viewingProperty.title} className="h-56 w-full object-cover sm:h-72" />
                </div>
              )}

              <DetailSection title="Basic Information">
                <DetailItem label="ID" value={viewingProperty.id} />
                <DetailItem label="Title" value={viewingProperty.title} />
                <DetailItem label="Type" value={viewingProperty.propertyType} />
                <DetailItem label="Description" value={viewingProperty.description} />
                <DetailItem label="Bedrooms" value={viewingProperty.bedrooms} />
                <DetailItem label="Bathrooms" value={viewingProperty.bathrooms} />
                <DetailItem label="Floor Level" value={viewingProperty.floorLevel} />
                <DetailItem label="Furnished" value={viewingProperty.isFurnished} />
              </DetailSection>

              <DetailSection title="Agent">
                <DetailItem label="Agent ID" value={viewingProperty.agentId} />
                <DetailItem label="Agent Name" value={viewingProperty.agent?.user ? `${viewingProperty.agent.user.firstName} ${viewingProperty.agent.user.lastName}` : null} />
                <DetailItem label="Business Name" value={viewingProperty.agent?.businessName} />
                <DetailItem label="Username" value={viewingProperty.agent?.username} />
                <DetailItem label="Phone" value={viewingProperty.agent?.user?.phone} />
                <DetailItem label="Trust Tier" value={viewingProperty.agent?.trustTier} />
                <DetailItem label="Verification Level" value={viewingProperty.agent?.verificationLevel} />
                <DetailItem label="Platform Verified" value={viewingProperty.agent?.isPlatformVerified} />
                <DetailItem label="Contact After Payment" value={viewingProperty.agent?.allowContactAfterPayment} />
              </DetailSection>
              <div className="-mt-4 flex justify-end">
                <button
                  type="button"
                  onClick={() => startAgentChat(viewingProperty.id)}
                  className="btn-primary !py-2.5 !text-sm flex items-center gap-2"
                >
                  <MessageCircle className="h-4 w-4" /> Chat Listing Agent
                </button>
              </div>

              <DetailSection title="Location">
                <DetailItem label="State" value={viewingProperty.state} />
                <DetailItem label="City" value={viewingProperty.city} />
                <DetailItem label="Area" value={viewingProperty.area} />
                <DetailItem label="Address" value={viewingProperty.address} />
                <DetailItem label="Latitude" value={viewingProperty.latitude} />
                <DetailItem label="Longitude" value={viewingProperty.longitude} />
              </DetailSection>

              <DetailSection title="Pricing">
                <DetailItem label="Rent" value={money(viewingProperty.rentAmount)} />
                <DetailItem label="Service Charge" value={money(viewingProperty.serviceCharge)} />
                <DetailItem label="Agency Fee" value={money(viewingProperty.agencyFee)} />
                <DetailItem label="Legal Fee" value={money(viewingProperty.legalFee)} />
                <DetailItem label="Caution Fee" value={money(viewingProperty.cautionFee)} />
                <DetailItem label="Inspection Fee" value={money(viewingProperty.inspectionFee)} />
                <DetailItem label="Total Move-in Estimate" value={money(viewingProperty.totalMoveInEstimate)} />
                <DetailItem label="Consultation Tier" value={viewingProperty.consultationTier} />
                <DetailItem label="Consultation Fee" value={money(viewingProperty.consultationFee)} />
              </DetailSection>

              <DetailSection title="Lifecycle">
                <DetailItem label="Status" value={viewingProperty.status} />
                <DetailItem label="Freshness" value={viewingProperty.freshnessScore} />
                <DetailItem label="Last Verified" value={dateTime(viewingProperty.lastVerifiedAt)} />
                <DetailItem label="Expires At" value={dateTime(viewingProperty.expiresAt)} />
                <DetailItem label="Reconfirmations" value={viewingProperty.reconfirmationCount} />
                <DetailItem label="Last Confirmed Rent" value={viewingProperty.lastConfirmedRent ? money(viewingProperty.lastConfirmedRent) : null} />
                <DetailItem label="Expiry Warning Sent" value={viewingProperty.expiryWarningSent} />
                <DetailItem label="Auto-hidden" value={viewingProperty.wasAutoHidden} />
                <DetailItem label="Created" value={dateTime(viewingProperty.createdAt)} />
                <DetailItem label="Updated" value={dateTime(viewingProperty.updatedAt)} />
              </DetailSection>

              <DetailSection title="Intelligence">
                <DetailItem label="Flood Risk" value={viewingProperty.floodRisk} />
                <DetailItem label="Electricity Situation" value={viewingProperty.electricitySituation} />
                <DetailItem label="Electricity Info" value={viewingProperty.electricityInfo} />
                <DetailItem label="Water Availability" value={viewingProperty.waterAvailability} />
                <DetailItem label="Water Source" value={viewingProperty.waterSource} />
                <DetailItem label="Road Access" value={viewingProperty.roadAccess} />
                <DetailItem label="Road Access In Rain" value={viewingProperty.roadAccessRain} />
                <DetailItem label="Network Quality" value={viewingProperty.networkQuality} />
                <DetailItem label="Best Network" value={viewingProperty.bestNetwork} />
                <DetailItem label="Noise Level" value={viewingProperty.noiseLevel} />
                <DetailItem label="Noise Source" value={viewingProperty.noiseSource} />
                <DetailItem label="Security Feel" value={viewingProperty.securityFeel} />
                <DetailItem label="Security Features" value={viewingProperty.securityFeatures} />
                <DetailItem label="Condition" value={viewingProperty.propertyCondition} />
                <DetailItem label="Known Issues" value={viewingProperty.knownIssues} />
                <DetailItem label="Compound Culture" value={viewingProperty.compoundCulture} />
                <DetailItem label="Agent Observation" value={viewingProperty.agentObservation} />
              </DetailSection>

              <DetailSection title="Hostel Details">
                <DetailItem label="Suitable For" value={viewingProperty.hostelSuitableFor} />
                <DetailItem label="Persons Per Room" value={viewingProperty.hostelPersonsPerRoom} />
                <DetailItem label="Gender" value={viewingProperty.hostelGender} />
                <DetailItem label="Campus Proximity" value={viewingProperty.hostelCampusProximity} />
                <DetailItem label="Nearest Campus" value={viewingProperty.hostelNearestCampus} />
                <DetailItem label="Distance From Campus" value={viewingProperty.hostelDistanceFromCampus} />
                <DetailItem label="Meals Included" value={viewingProperty.hostelMealsIncluded} />
                <DetailItem label="Rules" value={viewingProperty.hostelRulesNotes} />
              </DetailSection>

              <DetailSection title="Short Stay Details">
                <DetailItem label="Pricing Model" value={viewingProperty.shortStayPricingModel} />
                <DetailItem label="Daily Rate" value={viewingProperty.shortStayDailyRate ? money(viewingProperty.shortStayDailyRate) : null} />
                <DetailItem label="Weekly Rate" value={viewingProperty.shortStayWeeklyRate ? money(viewingProperty.shortStayWeeklyRate) : null} />
                <DetailItem label="Min Nights" value={viewingProperty.shortStayMinNights} />
                <DetailItem label="Max Nights" value={viewingProperty.shortStayMaxNights} />
                <DetailItem label="Check-in" value={viewingProperty.shortStayCheckInTime} />
                <DetailItem label="Check-out" value={viewingProperty.shortStayCheckOutTime} />
                <DetailItem label="Amenities" value={viewingProperty.shortStayAmenities} />
                <DetailItem label="House Rules" value={viewingProperty.shortStayHouseRules} />
                <DetailItem label="AC" value={viewingProperty.shortStayAC} />
                <DetailItem label="Internet" value={viewingProperty.shortStayInternet} />
                <DetailItem label="Cleanliness" value={viewingProperty.shortStayCleanliness} />
                <DetailItem label="Furnishing" value={viewingProperty.shortStayFurnishing} />
                <DetailItem label="Kitchen" value={viewingProperty.shortStayKitchen} />
                <DetailItem label="Agent Note" value={viewingProperty.shortStayAgentNote} />
              </DetailSection>

              <section className="space-y-3">
                <h3 className="text-sm font-bold text-navy-900">Uploaded Media</h3>
                {isLoadingMedia ? (
                  <div className="flex justify-center rounded-xl border border-slate-100 bg-slate-50 py-8">
                    <LoadingSpinner size="md" className="text-veriq-secondary" />
                  </div>
                ) : propertyMedia.length === 0 ? (
                  <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
                    No media uploaded for this listing.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {propertyMedia.map((item) => {
                      const src = mediaUrl(item.url);
                      const isImage = item.mimeType?.startsWith('image/') || item.mediaType === 'image';
                      const isVideo = item.mimeType?.startsWith('video/') || item.mediaType === 'video';

                      return (
                        <div key={item.id} className="overflow-hidden rounded-xl border border-slate-100 bg-white">
                          <div className="relative aspect-[4/3] bg-slate-100">
                            {isImage ? (
                              <img src={src} alt={item.caption ?? item.section} className="h-full w-full object-cover" />
                            ) : isVideo ? (
                              <video src={src} controls className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full items-center justify-center p-4 text-center text-xs text-slate-500">
                                Preview unavailable
                              </div>
                            )}
                          </div>
                          <div className="space-y-1 p-3">
                            <p className="text-xs font-bold capitalize text-navy-900">{pretty(item.section)}</p>
                            <p className="truncate text-xs text-slate-500">{item.caption || item.originalName || item.filename}</p>
                            <a href={src} target="_blank" rel="noopener noreferrer" className="inline-flex text-xs font-semibold text-veriq-secondary hover:underline">
                              Open media
                            </a>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminPropertiesPageInner />
    </Suspense>
  );
}
