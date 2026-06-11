'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useParams } from 'next/navigation';
import {
  ArrowLeft, CheckCircle, MapPin, Star, Clock, Shield,
  Home, Users, Award, Briefcase, AlertCircle,
} from 'lucide-react';
import { agentsApi, propertiesApi, ApiError } from '@/lib/api';
import type { Agent, Property } from '@/types';
import { AgentTrustTier, AgentVerificationLevel } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { PropertyCard } from '@/components/properties/PropertyCard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TIER_STYLES: Record<AgentTrustTier, { label: string; cls: string; badge: string }> = {
  bronze: { label: 'Bronze', cls: 'text-orange-700', badge: 'bg-orange-100 text-orange-700' },
  silver: { label: 'Silver', cls: 'text-slate-700', badge: 'bg-slate-100 text-slate-700' },
  gold: { label: 'Gold', cls: 'text-amber-700', badge: 'bg-amber-100 text-amber-700' },
  platinum: { label: 'Platinum', cls: 'text-purple-700', badge: 'bg-purple-100 text-purple-700' },
};

function MetricBar({ label, value, color }: { label: string; value: number; color: string }) {
  return (
    <div>
      <div className="flex items-center justify-between mb-1.5">
        <p className="text-xs text-slate-500">{label}</p>
        <p className="text-xs font-bold text-navy-900">{value.toFixed(0)}%</p>
      </div>
      <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
        <div className={`h-2 rounded-full ${color}`} style={{ width: `${Math.min(value, 100)}%` }} />
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

/**
 * Public agent profile page — veriqproperty.com/{username}
 * Shows the agent's verification status, performance stats, and all
 * of their active property listings.
 */
export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [listings, setListings] = useState<Property[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const res = await agentsApi.getByUsername(username);
        const a = res.data;
        setAgent(a);

        // Fetch all of the agent's active listings
        try {
          const listRes = await propertiesApi.list({ agentId: a.id, limit: 100 });
          setListings(listRes.data);
        } catch {
          // listings optional
        }
      } catch (err) {
        if (err instanceof ApiError && err.statusCode === 404) {
          setNotFound(true);
        } else {
          setNotFound(true);
        }
      } finally {
        setIsLoading(false);
      }
    }
    if (username) load();
  }, [username]);

  if (isLoading) return <PageLoader />;

  if (notFound || !agent) {
    return (
      <div className="min-h-screen pt-24 flex items-center justify-center px-4">
        <div className="text-center">
          <Shield className="h-14 w-14 text-slate-200 mx-auto mb-4" />
          <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Profile Not Found</h1>
          <p className="text-slate-500 mb-6">This profile doesn&apos;t exist or may have been removed.</p>
          <Link href="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      </div>
    );
  }

  const agentName = agent.user ? `${agent.user.firstName} ${agent.user.lastName}` : 'Agent';
  const agentInitial = agentName[0]?.toUpperCase() ?? 'A';
  const tier = TIER_STYLES[agent.trustTier ?? AgentTrustTier.BRONZE];
  const isVerified = agent.isPlatformVerified || (agent.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;

  return (
    <div className="min-h-screen bg-veriq-surface">
      {/* ── Hero band ── */}
      <div className="bg-hero-pattern pt-24 pb-12 px-4">
        <div className="max-w-5xl mx-auto">
          <Link
            href="/properties"
            className="inline-flex items-center gap-2 text-sm text-white/60 hover:text-white mb-6 transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to Properties
          </Link>

          <div className="flex items-start gap-5 flex-wrap">
            {/* Photo */}
            <div className="h-20 w-20 rounded-2xl bg-veriq-secondary overflow-hidden flex items-center justify-center flex-shrink-0 border-2 border-white/20">
              {agent.profilePhotoUrl ? (
                <Image
                  src={agent.profilePhotoUrl}
                  alt={agentName}
                  width={80}
                  height={80}
                  className="object-cover w-full h-full"
                />
              ) : (
                <span className="text-white text-2xl font-bold">{agentInitial}</span>
              )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap mb-2">
                <h1 className="font-display text-2xl font-bold text-white">{agentName}</h1>
                {isVerified && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-3 py-1 text-xs font-semibold text-emerald-300">
                    <CheckCircle className="h-3 w-3" /> Verified Agent
                  </span>
                )}
                <span className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${tier.badge}`}>
                  {tier.label} Tier
                </span>
              </div>

              {agent.businessName && (
                <p className="text-white/60 text-sm mb-2">{agent.businessName}</p>
              )}

              <div className="flex items-center gap-4 flex-wrap text-xs text-white/50">
                {agent.username && (
                  <span className="flex items-center gap-1">
                    veriqproperty.com/{agent.username}
                  </span>
                )}
                {agent.stateOfOperation && (
                  <span className="flex items-center gap-1">
                    <MapPin className="h-3 w-3" /> {agent.stateOfOperation}
                  </span>
                )}
                {agent.yearsOfExperience && (
                  <span className="flex items-center gap-1">
                    <Briefcase className="h-3 w-3" /> {agent.yearsOfExperience}+ yrs experience
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Home className="h-3 w-3" /> {listings.length} active listing{listings.length !== 1 ? 's' : ''}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-3">

          {/* ── Left: bio + metrics ── */}
          <div className="space-y-5">
            {/* Bio */}
            {agent.bio && (
              <div className="card p-5">
                <h3 className="font-display text-sm font-bold text-navy-900 mb-3">About</h3>
                <p className="text-sm text-slate-600 leading-relaxed">&quot;{agent.bio}&quot;</p>
              </div>
            )}

            {/* Quick stats */}
            <div className="card p-5">
              <h3 className="font-display text-sm font-bold text-navy-900 mb-4">Agent Stats</h3>
              <div className="grid grid-cols-2 gap-4 mb-4">
                {[
                  { label: 'Consultations', value: agent.totalConsultations, icon: Users },
                  { label: 'Inspections', value: agent.successfulInspections, icon: CheckCircle },
                  {
                    label: 'Avg Response',
                    value: agent.avgResponseHours ? `${Number(agent.avgResponseHours).toFixed(1)}h` : 'N/A',
                    icon: Clock,
                  },
                  {
                    label: 'Satisfaction',
                    value: agent.consultationSatisfactionRating
                      ? `${(Number(agent.consultationSatisfactionRating)).toFixed(1)}/5`
                      : 'N/A',
                    icon: Star,
                  },
                ].map((stat) => {
                  const Icon = stat.icon;
                  return (
                    <div key={stat.label} className="text-center">
                      <Icon className="h-4 w-4 text-veriq-secondary mx-auto mb-1" />
                      <p className="text-base font-black text-navy-900">{stat.value}</p>
                      <p className="text-[10px] text-slate-400">{stat.label}</p>
                    </div>
                  );
                })}
              </div>
              <div className="space-y-3 border-t border-slate-100 pt-4">
                <MetricBar label="Listing Accuracy" value={Number(agent.listingAccuracyScore)} color="bg-blue-500" />
                <MetricBar label="Inspection Success" value={Number(agent.inspectionSuccessRate)} color="bg-emerald-500" />
                <MetricBar label="Availability" value={Number(agent.availabilityReliabilityScore)} color="bg-amber-500" />
              </div>
            </div>

            {/* Specializations */}
            {(agent.specializations?.length || agent.specialization) && (
              <div className="card p-5">
                <h3 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <Award className="h-4 w-4 text-veriq-secondary" /> Specialization
                </h3>
                <div className="flex flex-wrap gap-2">
                  {(agent.specializations?.length
                    ? agent.specializations
                    : agent.specialization?.split(',').map((s) => s.trim()) ?? []
                  ).map((spec) => (
                    <span
                      key={spec}
                      className="rounded-full bg-veriq-surface border border-slate-200 px-3 py-1.5 text-xs font-medium text-navy-700"
                    >
                      {spec}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Areas of operation */}
            {agent.operatingLocations?.length ? (
              <div className="card p-5">
                <h3 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-veriq-secondary" /> Areas of Operation
                </h3>
                <div className="flex flex-wrap gap-2">
                  {agent.operatingLocations.map((loc) => (
                    <span
                      key={loc}
                      className="inline-flex items-center gap-1 rounded-full bg-navy-50 border border-navy-100 px-3 py-1.5 text-xs font-medium text-navy-700"
                    >
                      <MapPin className="h-2.5 w-2.5" /> {loc}
                    </span>
                  ))}
                </div>
              </div>
            ) : null}

            {/* Verification status */}
            <div className="card p-5">
              <h3 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
                <Shield className="h-4 w-4 text-veriq-secondary" /> Verification
              </h3>
              <div className="space-y-2.5">
                {[
                  { label: 'Identity Verified', done: agent.isGovIdVerified },
                  { label: 'Platform Verified', done: agent.isPlatformVerified },
                  { label: 'Professional Verified', done: agent.isProfessionallyVerified },
                ].map(({ label, done }) => (
                  <div key={label} className="flex items-center gap-2.5 text-xs">
                    {done ? (
                      <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                    ) : (
                      <div className="h-4 w-4 rounded-full border border-slate-300 flex-shrink-0" />
                    )}
                    <span className={done ? 'text-navy-800 font-medium' : 'text-slate-400'}>{label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 p-4">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-[11px] text-amber-700 leading-relaxed">
                Contact information is only revealed after unlocking a property intelligence report. Veriq protects your privacy and the agent&apos;s.
              </p>
            </div>
          </div>

          {/* ── Right: listings ── */}
          <div className="lg:col-span-2">
            <div className="flex items-center justify-between mb-5">
              <h2 className="font-display text-base font-bold text-navy-900">
                Active Listings
                {listings.length > 0 && (
                  <span className="ml-2 text-sm font-normal text-slate-400">({listings.length})</span>
                )}
              </h2>
            </div>

            {listings.length === 0 ? (
              <div className="rounded-2xl bg-white border border-slate-200 flex flex-col items-center justify-center py-20 text-center">
                <Home className="h-12 w-12 text-slate-200 mb-4" />
                <h3 className="font-display text-base font-bold text-navy-900 mb-1">No Active Listings</h3>
                <p className="text-sm text-slate-400 max-w-xs">
                  This agent doesn&apos;t have any active listings right now. Check back soon.
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                {listings.map((property) => (
                  <PropertyCard
                    key={property.id}
                    property={property}
                    detailHref={`/properties/${property.id}`}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
