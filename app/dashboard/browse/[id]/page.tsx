'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, MapPin, CheckCircle, Bed, Bath, Lock,
  Shield, Eye, FileText, Clock, AlertCircle, Home, Wallet, DollarSign,
} from 'lucide-react';
import { propertiesApi, consultationsApi, ApiError } from '@/lib/api';
import type { Property } from '@/types';
import { AgentVerificationLevel, AgentTrustTier, FreshnessScore } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';

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

function formatNaira(amount: number | null | undefined): string {
  if (!amount) return '₦0';
  return `₦${Number(amount).toLocaleString()}`;
}

export default function DashboardPropertyDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const { success, error: toastError } = useToast();

  const [property, setProperty] = useState<Property | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hasAccess, setHasAccess] = useState(false);
  const [isUnlocking, setIsUnlocking] = useState(false);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await propertiesApi.getById(id);
        setProperty(res.data);
        if (isAuthenticated) {
          try {
            const accessRes = await consultationsApi.checkAccess(id);
            setHasAccess(accessRes.data?.hasAccess ?? false);
          } catch {
            // no access yet
          }
        }
      } catch {
        setNotFound(true);
      } finally {
        setIsLoading(false);
      }
    }
    if (id) load();
  }, [id, isAuthenticated]);

  const handleUnlock = async () => {
    setIsUnlocking(true);
    try {
      await consultationsApi.initiate({ propertyId: id });
      success('Intelligence report unlocked!');
      setHasAccess(true);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to unlock report.');
    } finally {
      setIsUnlocking(false);
    }
  };

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

  return (
    <div className="max-w-7xl mx-auto space-y-0">
      {/* Back */}
      <Link
        href="/dashboard/browse"
        className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900 mb-6 transition-colors"
      >
        <ArrowLeft className="h-4 w-4" /> Back to Browse
      </Link>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">
        {/* Left: Images & details */}
        <div className="lg:col-span-2 space-y-6">
          {/* Hero image placeholder */}
          <div className="relative h-72 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 overflow-hidden">
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="h-20 w-20 text-white/10" />
            </div>
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
                <DollarSign className="h-4 w-4 text-veriq-secondary" /> Move-in Estimate
              </h3>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {[
                  { label: 'Annual Rent', value: property.rentAmount },
                  { label: 'Agency Fee', value: property.agencyFee },
                  { label: 'Service Charge', value: property.serviceCharge },
                  { label: 'Legal Fee', value: property.legalFee },
                  { label: 'Caution Fee', value: property.cautionFee },
                  { label: 'Inspection Fee', value: property.inspectionFee },
                ].map(({ label, value }) =>
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

          {/* Intelligence report */}
          {!hasAccess ? (
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
                        <Icon className="h-4 w-4 text-emerald-500" /> {label}
                      </div>
                    ))}
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
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
                  {agent?.user?.phone && (
                    <p className="mt-3 text-sm font-semibold text-navy-900">
                      Agent contact: {agent.user.phone}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Agent & meta */}
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
            {!hasAccess && (
              <p className="text-[11px] text-slate-400">
                Unlock the intelligence report to contact this agent directly.
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

          {/* Access fee */}
          <div className="card p-5 bg-gradient-to-br from-navy-50 to-blue-50 border-blue-100">
            <p className="text-xs text-slate-500 uppercase tracking-wider mb-1">Intelligence Access Fee</p>
            <p className="text-2xl font-black text-navy-900 mb-1">
              {formatNaira(property.consultationFee)}
            </p>
            <p className="text-xs text-veriq-muted">One-time fee — valid 7 days</p>
          </div>

          {/* Refund protection */}
          <div className="rounded-2xl bg-navy-900 p-5">
            <div className="flex items-start gap-3">
              <Shield className="h-5 w-5 text-gold-400 flex-shrink-0 mt-0.5" />
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
