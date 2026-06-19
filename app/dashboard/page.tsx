'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import {
  Search, Lock, ArrowRight, Eye, TrendingUp,
  Clock, Shield, MapPin, Home, ShieldCheck, Users,
  CheckCircle, AlertCircle, RefreshCw, Star, X,
} from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { consultationsApi, propertiesApi, agentsApi } from '@/lib/api';
import type { Consultation, Property, Agent } from '@/types';
import { UserRole, AgentVerificationLevel, ConsultationStatus, ListingStatus } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

// ─── Formatters ───────────────────────────────────────────────────────────

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

function formatNaira(n: number): string {
  if (n >= 1_000_000) return `₦${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `₦${(n / 1_000).toFixed(0)}k`;
  return `₦${n}`;
}

// ─── Stat card ────────────────────────────────────────────────────────────

function StatCard({
  label, value, sub, icon, colorCls,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ReactNode;
  colorCls: string;
}) {
  return (
    <div className="card p-5">
      <div className={`inline-flex h-10 w-10 items-center justify-center rounded-xl ${colorCls} mb-3`}>
        {icon}
      </div>
      <p className="text-2xl font-black text-navy-900 mb-0.5">{value}</p>
      <p className="text-xs text-slate-500">{label}</p>
      {sub && <p className="text-[11px] text-emerald-600 font-medium mt-1">{sub}</p>}
    </div>
  );
}

// ─── User / Agent dashboard ────────────────────────────────────────────────

function UserDashboard({ userId }: { userId: string }) {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [loading, setLoading] = useState(true);
  const [ratingTarget, setRatingTarget] = useState<Consultation | null>(null);
  const [rating, setRating] = useState(5);
  const [inspectionOccurred, setInspectionOccurred] = useState(true);
  const [accuracyScore, setAccuracyScore] = useState(100);
  const [comment, setComment] = useState('');
  const [submittingRating, setSubmittingRating] = useState(false);
  const { success, error } = useToast();

  useEffect(() => {
    consultationsApi
      .getMyConsultations(1, 10)
      .then((r) => setConsultations(r.data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [userId]);

  const unlocked = consultations.filter(
    (c) => c.status === ConsultationStatus.UNLOCKED || c.status === ConsultationStatus.PAID,
  ).length;

  const recentConsultations = consultations.slice(0, 5);
  const canRate = (consultation: Consultation) =>
    [ConsultationStatus.PAID, ConsultationStatus.UNLOCKED, ConsultationStatus.EXPIRED].includes(
      consultation.status,
    );

  const openRating = (consultation: Consultation) => {
    setRatingTarget(consultation);
    setRating(Number(consultation.userSatisfactionRating ?? 5));
    setInspectionOccurred(consultation.inspectionOccurred ?? true);
    setAccuracyScore(Number(consultation.listingAccuracyScore ?? 100));
    setComment(consultation.userFeedbackComment ?? '');
  };

  const submitRating = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ratingTarget) return;

    setSubmittingRating(true);
    try {
      await agentsApi.recordInspectionOutcome({
        propertyId: ratingTarget.propertyId,
        inspectionOccurred,
        accuracyScore,
        satisfactionRating: rating,
        comment: comment.trim() || undefined,
      });

      const ratedAt = new Date().toISOString();
      setConsultations((items) =>
        items.map((item) =>
          item.id === ratingTarget.id
            ? {
                ...item,
                inspectionOccurred,
                listingAccuracyScore: accuracyScore,
                userSatisfactionRating: rating,
                userFeedbackComment: comment.trim() || null,
                ratedAt,
              }
            : item,
        ),
      );
      success('Thanks. Your agent rating has been recorded.');
      setRatingTarget(null);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Reports Unlocked"
          value={loading ? '…' : unlocked}
          sub={unlocked > 0 ? `${unlocked} total` : undefined}
          icon={<Lock className="h-5 w-5" />}
          colorCls="bg-gold-50 text-gold-600"
        />
        <StatCard
          label="Total Consultations"
          value={loading ? '…' : consultations.length}
          icon={<Eye className="h-5 w-5" />}
          colorCls="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Verified Reports"
          value={loading ? '…' : unlocked}
          sub="Intelligence reports"
          icon={<Shield className="h-5 w-5" />}
          colorCls="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Active Reports"
          value={loading ? '…' : consultations.filter((c) => c.status === ConsultationStatus.UNLOCKED).length}
          icon={<TrendingUp className="h-5 w-5" />}
          colorCls="bg-purple-50 text-purple-600"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent consultations */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-bold text-navy-900">Recent Reports</h2>
            <Link href="/properties" className="text-xs text-veriq-secondary font-medium hover:underline flex items-center gap-1">
              Browse <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" className="text-veriq-secondary" />
            </div>
          ) : recentConsultations.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Lock className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-navy-900 mb-1">No reports yet</p>
              <p className="text-xs text-veriq-muted mb-4">Unlock intelligence reports on properties you&apos;re interested in.</p>
              <Link href="/properties" className="btn-primary !text-xs !py-2">Browse Properties</Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentConsultations.map((c) => (
                <div key={c.id} className="flex flex-col gap-3 rounded-xl border border-slate-100 p-4 sm:flex-row sm:items-center">
                  <div className="flex min-w-0 flex-1 items-center gap-4">
                    <div className="h-10 w-10 flex-shrink-0 rounded-xl bg-navy-50 flex items-center justify-center">
                      <Lock className="h-4 w-4 text-veriq-secondary" />
                    </div>
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 text-sm truncate">
                        {c.property?.title ?? 'Property Report'}
                      </p>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1 mt-0.5">
                        <Clock className="h-2.5 w-2.5" /> {timeAgo(c.createdAt)}
                      </p>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2 sm:justify-end">
                    <span className={`badge text-[10px] capitalize ${
                      c.status === ConsultationStatus.UNLOCKED || c.status === ConsultationStatus.PAID
                        ? 'bg-emerald-100 text-emerald-700'
                        : c.status === ConsultationStatus.PENDING_PAYMENT
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-slate-100 text-slate-500'
                    }`}>
                      {c.status.replace(/_/g, ' ')}
                    </span>
                    {canRate(c) && (
                      <button
                        type="button"
                        onClick={() => openRating(c)}
                        className="rounded-lg border border-gold-100 px-3 py-2 text-[11px] font-bold text-gold-700 hover:bg-gold-50"
                      >
                        {c.userSatisfactionRating ? `Rated ${Number(c.userSatisfactionRating).toFixed(1)}/5` : 'Rate agent'}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right panel */}
        <div className="space-y-5">
          <div className="rounded-2xl bg-hero-pattern p-5">
            <div className="flex items-center gap-2 mb-3">
              <Shield className="h-4 w-4 text-gold-400" />
              <p className="text-white/80 text-xs font-semibold uppercase tracking-wider">Protection Active</p>
            </div>
            <p className="text-xs text-white/60 mb-4 leading-relaxed">
              Covered by Veriq&apos;s refund protection policy. If a property is unavailable after unlock, you may qualify for a credit.
            </p>
            <Link href="/properties" className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-navy-900">
              Browse Verified Properties <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
              <MapPin className="h-4 w-4 text-veriq-secondary" /> Find a Property
            </h3>
            <p className="text-xs text-veriq-muted leading-relaxed mb-4">
              Browse hundreds of verified listings with full intelligence reports, agent trust scores, and freshness ratings.
            </p>
            <Link href="/properties" className="btn-primary !text-xs !py-2.5 w-full flex items-center justify-center gap-2">
              <Search className="h-3.5 w-3.5" /> Search Properties
            </Link>
          </div>
        </div>
      </div>

      {ratingTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-navy-950/50 px-4 py-6">
          <form onSubmit={submitRating} className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl">
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-gold-600">Agent rating</p>
                <h3 className="font-display text-lg font-black text-navy-900">
                  {ratingTarget.property?.title ?? 'Property report'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setRatingTarget(null)}
                className="flex h-9 w-9 items-center justify-center rounded-full border border-slate-200 text-slate-500 hover:bg-slate-50"
                aria-label="Close rating dialog"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-bold text-navy-900">How would you rate this agent?</label>
                <div className="flex gap-2">
                  {[1, 2, 3, 4, 5].map((value) => (
                    <button
                      key={value}
                      type="button"
                      onClick={() => setRating(value)}
                      className="flex h-11 w-11 items-center justify-center rounded-xl border border-gold-100 hover:bg-gold-50"
                      aria-label={`Rate ${value} out of 5`}
                    >
                      <Star
                        className={`h-5 w-5 ${value <= rating ? 'fill-gold-500 text-gold-500' : 'text-slate-300'}`}
                      />
                    </button>
                  ))}
                </div>
              </div>

              <label className="flex items-center gap-3 rounded-xl border border-slate-100 p-3 text-sm font-semibold text-navy-800">
                <input
                  type="checkbox"
                  checked={inspectionOccurred}
                  onChange={(e) => setInspectionOccurred(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-veriq-secondary"
                />
                Physical inspection happened
              </label>

              <div>
                <div className="mb-2 flex items-center justify-between gap-3">
                  <label className="text-sm font-bold text-navy-900">Listing accuracy</label>
                  <span className="text-sm font-black text-veriq-secondary">{accuracyScore}%</span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={100}
                  value={accuracyScore}
                  onChange={(e) => setAccuracyScore(Number(e.target.value))}
                  className="w-full accent-veriq-secondary"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-bold text-navy-900">Comment</label>
                <textarea
                  value={comment}
                  onChange={(e) => setComment(e.target.value.slice(0, 500))}
                  rows={4}
                  className="input min-h-28 resize-y"
                  placeholder="Share how responsive, honest, or helpful the agent was."
                />
              </div>
            </div>

            <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setRatingTarget(null)} className="btn-outline !py-2.5">
                Cancel
              </button>
              <button type="submit" disabled={submittingRating} className="btn-primary !py-2.5 disabled:opacity-60">
                {submittingRating ? 'Submitting...' : 'Submit rating'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

// ─── Agent dashboard ──────────────────────────────────────────────────────

function AgentDashboard({ agentUserId }: { agentUserId: string }) {
  const [listings, setListings] = useState<Property[]>([]);
  const [agentProfile, setAgentProfile] = useState<Agent | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      agentsApi.getMyProfile().catch(() => null),
      propertiesApi.getMyListings(1, 20).catch(() => ({ data: [] as Property[] })),
    ]).then(([agentRes, listingsRes]) => {
      if (agentRes) setAgentProfile(agentRes.data);
      setListings(listingsRes.data);
    }).finally(() => setLoading(false));
  }, [agentUserId]);

  const activeListings = listings.filter((p) => p.status === ListingStatus.ACTIVE).length;
  const level = agentProfile?.verificationLevel ?? AgentVerificationLevel.NONE;
  const canList = level >= AgentVerificationLevel.BASIC;

  const verificationSteps = [
    { label: 'Profile Created', done: !!agentProfile },
    { label: 'Level 1 Verified', done: level >= AgentVerificationLevel.BASIC },
    { label: 'Level 2 Professional', done: level >= AgentVerificationLevel.PROFESSIONAL },
  ];

  return (
    <div className="space-y-6">
      {/* Verification warning */}
      {!canList && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-200 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-amber-900">Verification required to list properties</p>
            <p className="text-xs text-amber-700 mt-0.5">Complete Level 1 verification to start listing properties on Veriq.</p>
          </div>
          <Link href="/dashboard/agent" className="btn-primary !text-xs !py-2 flex-shrink-0">
            Verify Now
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard
          label="Active Listings"
          value={loading ? '…' : activeListings}
          sub={canList ? 'Visible to renters' : undefined}
          icon={<Home className="h-5 w-5" />}
          colorCls="bg-emerald-50 text-emerald-600"
        />
        <StatCard
          label="Total Listings"
          value={loading ? '…' : listings.length}
          icon={<Eye className="h-5 w-5" />}
          colorCls="bg-blue-50 text-blue-600"
        />
        <StatCard
          label="Trust Tier"
          value={agentProfile?.trustTier ? agentProfile.trustTier.charAt(0).toUpperCase() + agentProfile.trustTier.slice(1) : '—'}
          icon={<Shield className="h-5 w-5" />}
          colorCls="bg-gold-50 text-gold-600"
        />
        <StatCard
          label="Verification Level"
          value={`Level ${level}`}
          sub={level >= AgentVerificationLevel.BASIC ? 'Can list properties' : 'Pending verification'}
          icon={<ShieldCheck className="h-5 w-5" />}
          colorCls={level >= AgentVerificationLevel.BASIC ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-400'}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Recent listings */}
        <div className="lg:col-span-2 card p-6">
          <div className="flex items-center justify-between mb-5">
            <h2 className="font-display text-base font-bold text-navy-900">My Listings</h2>
            <Link href="/dashboard/properties" className="text-xs text-veriq-secondary font-medium hover:underline flex items-center gap-1">
              Manage All <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {loading ? (
            <div className="flex justify-center py-10">
              <LoadingSpinner size="md" className="text-veriq-secondary" />
            </div>
          ) : listings.length === 0 ? (
            <div className="flex flex-col items-center py-10 text-center">
              <Home className="h-10 w-10 text-slate-200 mb-3" />
              <p className="text-sm font-medium text-navy-900 mb-1">No listings yet</p>
              {canList ? (
                <>
                  <p className="text-xs text-veriq-muted mb-4">Create your first property listing.</p>
                  <Link href="/dashboard/properties/new" className="btn-primary !text-xs !py-2">Add Listing</Link>
                </>
              ) : (
                <p className="text-xs text-veriq-muted">Complete verification to list properties.</p>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {listings.slice(0, 5).map((prop) => (
                <div key={prop.id} className="flex items-center gap-4 rounded-xl border border-slate-100 p-4">
                  <div className="h-10 w-10 rounded-xl bg-veriq-surface flex items-center justify-center flex-shrink-0">
                    <Home className="h-4 w-4 text-veriq-secondary" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-navy-900 text-sm truncate">{prop.title}</p>
                    <p className="text-[10px] text-slate-400 mt-0.5">
                      {prop.area}, {prop.state} · {formatNaira(Number(prop.rentAmount))}/mo
                    </p>
                  </div>
                  <span className={`badge text-[10px] capitalize ${
                    prop.status === ListingStatus.ACTIVE ? 'bg-emerald-100 text-emerald-700' :
                    prop.status === ListingStatus.HIDDEN ? 'bg-slate-100 text-slate-500' :
                    'bg-amber-100 text-amber-700'
                  }`}>
                    {prop.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Verification checklist */}
        <div className="space-y-5">
          <div className="card p-5">
            <h3 className="font-display text-sm font-bold text-navy-900 mb-4">Verification Status</h3>
            <div className="space-y-3">
              {verificationSteps.map((step) => (
                <div key={step.label} className="flex items-center gap-3">
                  {step.done ? (
                    <CheckCircle className="h-4 w-4 text-emerald-500 flex-shrink-0" />
                  ) : (
                    <div className="h-4 w-4 rounded-full border-2 border-slate-300 flex-shrink-0" />
                  )}
                  <span className={`text-xs font-medium ${step.done ? 'text-emerald-700' : 'text-slate-400'}`}>
                    {step.label}
                  </span>
                </div>
              ))}
            </div>
            <Link href="/dashboard/agent" className="mt-4 w-full flex items-center justify-center gap-2 btn-primary !text-xs !py-2.5">
              Agent Profile <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="rounded-2xl bg-hero-pattern p-5">
            <h3 className="text-white font-bold text-sm mb-2">Grow your listings</h3>
            <p className="text-white/60 text-xs leading-relaxed mb-4">
              Complete Level 2 verification to earn the Professional badge and attract more renters.
            </p>
            <Link href="/dashboard/agent" className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-navy-900">
              <TrendingUp className="h-3.5 w-3.5" /> View Agent Profile
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Admin dashboard ──────────────────────────────────────────────────────

function AdminDashboard() {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-3">
        {[
          {
            href: '/dashboard/admin/agents',
            icon: ShieldCheck,
            colorCls: 'bg-emerald-100 text-emerald-600',
            title: 'Agent Management',
            desc: 'Approve verifications, review documents, manage agent accounts.',
          },
          {
            href: '/dashboard/admin/users',
            icon: Users,
            colorCls: 'bg-blue-100 text-blue-600',
            title: 'User Management',
            desc: 'View, activate, or deactivate user accounts.',
          },
          {
            href: '/dashboard/admin/properties',
            icon: Home,
            colorCls: 'bg-purple-100 text-purple-600',
            title: 'Property Listings',
            desc: 'Review all listings, hide inappropriate or misleading properties.',
          },
        ].map(({ href, icon: Icon, colorCls, title, desc }) => (
          <Link key={href} href={href} className="card p-6 hover:shadow-card-hover transition-shadow group flex flex-col">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${colorCls}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-display text-base font-bold text-navy-900 mb-2 group-hover:text-veriq-secondary transition-colors">{title}</h2>
            <p className="text-sm text-veriq-muted flex-1 leading-relaxed">{desc}</p>
            <div className="mt-4 flex items-center gap-1 text-xs font-semibold text-veriq-secondary">
              Go to {title.split(' ')[0]} <ArrowRight className="h-3.5 w-3.5" />
            </div>
          </Link>
        ))}
      </div>

      <div className="card p-6 bg-navy-900">
        <h2 className="font-display text-sm font-bold text-white mb-3">Verification Policy</h2>
        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
          <p><strong className="text-white">Level 1 (Basic):</strong> Requires valid government ID + selfie. Once approved, the agent can list properties.</p>
          <p><strong className="text-white">Level 2 (Professional):</strong> Requires CAC docs and/or real estate association membership. Grants the &quot;Professional&quot; badge.</p>
          <p><strong className="text-white">Deactivation:</strong> Blocks login and hides all of the agent&apos;s listings automatically.</p>
        </div>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────

export default function DashboardPage() {
  const { user } = useAuth();

  const heading =
    user?.role === UserRole.ADMIN
      ? 'Admin Panel'
      : user?.role === UserRole.AGENT
      ? 'Agent Dashboard'
      : 'Dashboard';

  const sub =
    user?.role === UserRole.ADMIN
      ? 'Full administrative access'
      : user?.role === UserRole.AGENT
      ? 'Manage your listings and verification'
      : 'Your property activity overview';

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">{heading}</h1>
          <p className="text-sm text-veriq-muted">
            Welcome back, {user?.firstName}. {sub}.
          </p>
        </div>
        {user?.role === UserRole.AGENT && (
          <Link href="/dashboard/properties/new" className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
            <Home className="h-4 w-4" /> New Listing
          </Link>
        )}
        {user?.role === UserRole.USER && (
          <Link href="/properties" className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
            <Search className="h-4 w-4" /> Browse Properties
          </Link>
        )}
        {user?.role === UserRole.ADMIN && (
          <Link href="/dashboard/admin" className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
            <RefreshCw className="h-4 w-4" /> Admin Overview
          </Link>
        )}
      </div>

      {/* Role-specific content */}
      {user?.role === UserRole.ADMIN && <AdminDashboard />}
      {user?.role === UserRole.AGENT && <AgentDashboard agentUserId={user.id} />}
      {user?.role === UserRole.USER && <UserDashboard userId={user.id} />}
    </div>
  );
}
