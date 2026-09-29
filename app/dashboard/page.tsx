'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { agentsApi, consultationsApi, shortLetOperatorsApi, walletApi } from '@/lib/api';
import { agentPortfolioApi, verificationApi } from '@/lib/api/agent';
import { assignmentsAdminApi, auditAdminApi, ledgerAdminApi, verificationAdminApi } from '@/lib/api/admin';
import type { AuditEvent } from '@/types/admin';
import type { Consultation, Property } from '@/types';
import type { PortfolioProperty } from '@/types/agent';
import { AgentFeedbackTag, ConsultationStatus, ListingStatus, UserRole } from '@/types';
import { cn, formatCurrency } from '@/lib/utils';
import { AuditRow, Badge, Button, StatCard, type BadgeTone } from '@/components/ui';
import { Modal } from '@/components/ui/Modal';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { AgentFeedbackSelector } from '@/components/agents/AgentFeedbackSelector';
import {
  WorkspaceActionPanel,
  WorkspaceActivity,
  WorkspaceIntro,
  WorkspaceStatGrid,
} from '@/components/workspace/WorkspaceIntro';

// ─── Shared helpers ───────────────────────────────────────────────────────

/** The placeholder a figure wears until its request settles, and the one it keeps if that fails. */
const NO_FIGURE = '—';

function figure(loading: boolean, value: number | string | null | undefined): React.ReactNode {
  if (loading) return '…';
  if (value === null || value === undefined) return NO_FIGURE;
  return typeof value === 'number' ? value.toLocaleString('en-NG') : value;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

function sentenceCase(value: string): string {
  const words = value.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
}

/** The welcome the prototype uses: the person's name when we know it, the neutral line otherwise. */
function welcome(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name ? `Welcome, ${name}.` : 'Welcome back.';
}

function EmptyActivity({ children }: { children: React.ReactNode }) {
  return <p className="text-ui-sm text-muted-foreground">{children}</p>;
}

// ─── Renter ───────────────────────────────────────────────────────────────

const CONSULTATION_TONES: Partial<Record<ConsultationStatus, BadgeTone>> = {
  [ConsultationStatus.UNLOCKED]: 'success',
  [ConsultationStatus.PAID]: 'success',
  [ConsultationStatus.PENDING_PAYMENT]: 'amber',
  [ConsultationStatus.REFUND_REQUESTED]: 'amber',
  [ConsultationStatus.REFUNDED]: 'neutral',
  [ConsultationStatus.EXPIRED]: 'neutral',
};

const RATEABLE: ConsultationStatus[] = [
  ConsultationStatus.PAID,
  ConsultationStatus.UNLOCKED,
  ConsultationStatus.EXPIRED,
];

function RenterOverview({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  const { success, error } = useToast();

  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [walletCredit, setWalletCredit] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  const [ratingTarget, setRatingTarget] = useState<Consultation | null>(null);
  const [rating, setRating] = useState(5);
  const [inspectionOccurred, setInspectionOccurred] = useState(true);
  const [accuracyScore, setAccuracyScore] = useState(100);
  const [feedbackTags, setFeedbackTags] = useState<AgentFeedbackTag[]>([]);
  const [submittingRating, setSubmittingRating] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([consultationsApi.getMyConsultations(1, 10), walletApi.getBalance()]).then(
      ([myConsultations, wallet]) => {
        if (!active) return;
        if (myConsultations.status === 'fulfilled') setConsultations(myConsultations.value.data);
        if (wallet.status === 'fulfilled') {
          setWalletCredit(wallet.value.data.available ?? wallet.value.data.balance);
        }
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const activeUnlocks = consultations.filter((item) => item.status === ConsultationStatus.UNLOCKED).length;
  const recent = consultations.slice(0, 5);

  const openRating = (consultation: Consultation) => {
    setRatingTarget(consultation);
    setRating(Number(consultation.userSatisfactionRating ?? 5));
    setInspectionOccurred(consultation.inspectionOccurred ?? true);
    setAccuracyScore(Number(consultation.listingAccuracyScore ?? 100));
    setFeedbackTags(consultation.userFeedbackTags ?? []);
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
        feedbackTags,
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
                userFeedbackTags: feedbackTags,
                ratedAt,
              }
            : item,
        ),
      );
      success('Thanks. Your agent rating has been recorded.');
      setRatingTarget(null);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Unable to submit rating.');
    } finally {
      setSubmittingRating(false);
    }
  };

  return (
    <>
      <WorkspaceIntro workspace="Renter workspace" title={welcome(firstName, lastName)} />

      <WorkspaceStatGrid busy={loading}>
        <StatCard
          label="Active unlocks"
          value={figure(loading, activeUnlocks)}
          hint="View details →"
          href="/dashboard/unlocks"
        />
        <StatCard
          label="Wallet credit"
          value={figure(loading, walletCredit === null ? null : formatCurrency(walletCredit))}
          hint="View details →"
          href="/dashboard/wallet"
        />
        {/* No saved-properties endpoint exists yet, so the figure stays honest rather than invented. */}
        <StatCard label="Saved properties" value={NO_FIGURE} hint="View details →" href="/dashboard/saved" />
      </WorkspaceStatGrid>

      <WorkspaceActionPanel
        title="Find your next possibility"
        actions={
          <Button asChild>
            <Link href="/properties">Browse properties</Link>
          </Button>
        }
      >
        Click Unlock to pay directly. Approved refund credit applies automatically when you next unlock.
      </WorkspaceActionPanel>

      <WorkspaceActivity busy={loading}>
        {loading ? (
          <EmptyActivity>Loading your recent unlocks…</EmptyActivity>
        ) : recent.length === 0 ? (
          <EmptyActivity>Nothing yet. Your unlocks and refund decisions will appear here.</EmptyActivity>
        ) : (
          recent.map((item) => (
            <AuditRow
              key={item.id}
              meta={
                <span className="flex items-center gap-3">
                  <span>{timeAgo(item.createdAt)}</span>
                  {RATEABLE.includes(item.status) && (
                    <Button variant="secondary" size="small" onClick={() => openRating(item)}>
                      {item.userSatisfactionRating
                        ? `Rated ${Number(item.userSatisfactionRating).toFixed(1)}/5`
                        : 'Rate agent'}
                    </Button>
                  )}
                </span>
              }
            >
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-foreground">{item.property?.title ?? 'Property report'}</span>
                <Badge tone={CONSULTATION_TONES[item.status] ?? 'neutral'}>{sentenceCase(item.status)}</Badge>
              </span>
            </AuditRow>
          ))
        )}
      </WorkspaceActivity>

      <Modal isOpen={!!ratingTarget} onClose={() => setRatingTarget(null)} title="Rate your agent" size="lg">
        <form onSubmit={submitRating} className="space-y-5">
          <p className="text-ui-sm text-muted-foreground">{ratingTarget?.property?.title ?? 'Property report'}</p>

          <fieldset>
            <legend className="mb-2 text-sm font-semibold text-foreground">How would you rate this agent?</legend>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  aria-pressed={value === rating}
                  aria-label={`Rate ${value} out of 5`}
                  className={cn(
                    'h-11 w-11 rounded-unit border text-sm font-semibold transition-colors',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
                    value <= rating
                      ? 'border-[#10b98135] bg-[#10b98112] text-[#6ee7b7]'
                      : 'border-input bg-[#ffffff06] text-muted-foreground hover:bg-[#ffffff12]',
                  )}
                >
                  {value}
                </button>
              ))}
            </div>
          </fieldset>

          <label className="flex items-center gap-3 rounded-unit border border-[#ffffff18] bg-[#070b1444] px-4 py-3 text-sm font-medium text-foreground">
            <input
              type="checkbox"
              checked={inspectionOccurred}
              onChange={(event) => setInspectionOccurred(event.target.checked)}
              className="h-4 w-4 accent-[#10b981]"
            />
            Physical inspection happened
          </label>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="listing-accuracy" className="text-sm font-semibold text-foreground">
                Listing accuracy
              </label>
              <span className="text-sm font-semibold text-[#34d399]">{accuracyScore}%</span>
            </div>
            <input
              id="listing-accuracy"
              type="range"
              min={0}
              max={100}
              value={accuracyScore}
              onChange={(event) => setAccuracyScore(Number(event.target.value))}
              className="w-full accent-[#10b981]"
            />
          </div>

          <AgentFeedbackSelector value={feedbackTags} onChange={setFeedbackTags} />

          <div className="flex flex-col-reverse gap-3 wide:flex-row wide:justify-end">
            <Button variant="secondary" onClick={() => setRatingTarget(null)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submittingRating}>
              {submittingRating ? 'Submitting…' : 'Submit rating'}
            </Button>
          </div>
        </form>
      </Modal>
    </>
  );
}

// ─── Agent ────────────────────────────────────────────────────────────────

function AgentOverview({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  const [properties, setProperties] = useState<PortfolioProperty[] | null>(null);
  const [operators, setOperators] = useState<number | null>(null);
  const [openCases, setOpenCases] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([agentPortfolioApi.mine(), verificationApi.queue()]).then(([portfolio, queue]) => {
      if (!active) return;
      if (portfolio.status === 'fulfilled') {
        setProperties(portfolio.value.data.properties);
        setOperators(portfolio.value.data.operators.length);
      }
      if (queue.status === 'fulfilled') setOpenCases(queue.value.data.length);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const recent = [...(properties ?? [])]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <>
      <WorkspaceIntro workspace="Agent workspace" title={welcome(firstName, lastName)} />

      <WorkspaceStatGrid busy={loading}>
        {/*
          The prototype labels this tile "Your properties". An Agent verifies and publishes on an
          Operator's behalf and never owns the listing (Master Blueprint §2), and the tile beside it
          already reads "Assigned Operators" — so "Assigned properties" is both correct and consistent.
        */}
        <StatCard
          label="Assigned properties"
          value={figure(loading, properties?.length ?? null)}
          hint="View details →"
          href="/dashboard/agent/portfolio"
        />
        <StatCard
          label="Awaiting review"
          value={figure(loading, openCases)}
          hint="View details →"
          href="/dashboard/agent/verification"
        />
        <StatCard
          label="Assigned Operators"
          value={figure(loading, operators)}
          hint="View details →"
          href="/dashboard/agent/portfolio"
        />
      </WorkspaceStatGrid>

      <WorkspaceActionPanel
        title="Keep your workflow moving"
        actions={
          <>
            <Button asChild>
              <Link href="/dashboard/agent/portfolio">Open property portfolio</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/agent/portfolio#referral">My referral code</Link>
            </Button>
          </>
        }
      >
        Review the Operator&rsquo;s submission, add Agent Observation, attach existing Street Intelligence or
        supply Initial Veriq Intelligence, then publish.
      </WorkspaceActionPanel>

      <WorkspaceActivity busy={loading}>
        {loading ? (
          <EmptyActivity>Loading your assigned properties…</EmptyActivity>
        ) : recent.length === 0 ? (
          <EmptyActivity>Nothing yet. Properties assigned to you will appear here as they move.</EmptyActivity>
        ) : (
          recent.map((item) => (
            <AuditRow key={item.id} meta={timeAgo(item.updatedAt)}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-foreground">{item.title}</span>
                <span>
                  {item.area}, {item.city}
                </span>
                <Badge tone={item.publicationStatus === 'published' ? 'success' : 'amber'}>
                  {sentenceCase(item.publicationStatus)}
                </Badge>
              </span>
            </AuditRow>
          ))
        )}
      </WorkspaceActivity>
    </>
  );
}

// ─── Admin ────────────────────────────────────────────────────────────────

function AdminOverview({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  const [awaitingReview, setAwaitingReview] = useState<number | null>(null);
  const [refundRequests, setRefundRequests] = useState<number | null>(null);
  const [accountActions, setAccountActions] = useState<number | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const [cases, ledger, queue, audit] = await Promise.allSettled([
      verificationAdminApi.cases(),
      ledgerAdminApi.overview(),
      assignmentsAdminApi.queue(),
      auditAdminApi.list({ page: 1, limit: 5 }),
    ]);

    if (cases.status === 'fulfilled') setAwaitingReview(cases.value.data.length);
    if (ledger.status === 'fulfilled') setRefundRequests(ledger.value.data.refunds.open);
    if (queue.status === 'fulfilled') {
      setAccountActions(queue.value.data.operators.length + queue.value.data.propertiesWithoutAgent.length);
    }
    if (audit.status === 'fulfilled') setEvents(audit.value.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <>
      <WorkspaceIntro workspace="Admin workspace" title={welcome(firstName, lastName)} />

      <WorkspaceStatGrid busy={loading}>
        <StatCard
          label="Awaiting review"
          value={figure(loading, awaitingReview)}
          hint="View details →"
          href="/dashboard/admin/verification"
        />
        <StatCard
          label="Refund requests"
          value={figure(loading, refundRequests)}
          hint="View details →"
          href="/dashboard/admin/refunds"
        />
        <StatCard
          label="Account actions"
          value={figure(loading, accountActions)}
          hint="View details →"
          href="/dashboard/admin/assignments"
        />
      </WorkspaceStatGrid>

      <WorkspaceActionPanel
        title="Keep your workflow moving"
        actions={
          <>
            <Button asChild>
              <Link href="/dashboard/admin/ledger">Open Ledger</Link>
            </Button>
            <Button asChild variant="secondary">
              <Link href="/dashboard/admin/veriq-agents">Manage Agent accounts</Link>
            </Button>
          </>
        }
      >
        Manage accounts and assignments, resolve reviews and inspect the complete money trail.
      </WorkspaceActionPanel>

      <WorkspaceActivity busy={loading}>
        {loading ? (
          <EmptyActivity>Loading the audit trail…</EmptyActivity>
        ) : events.length === 0 ? (
          <EmptyActivity>Nothing yet. Every material action lands here with its actor and reason.</EmptyActivity>
        ) : (
          events.map((event) => (
            <AuditRow key={event.id} meta={timeAgo(event.createdAt)}>
              <span className="text-foreground">{sentenceCase(event.action)}</span> · {sentenceCase(event.targetType)}
              {event.reason ? ` · ${event.reason}` : ''}
            </AuditRow>
          ))
        )}
      </WorkspaceActivity>
    </>
  );
}

// ─── Short Let Operator ───────────────────────────────────────────────────

function ShortLetOverview({ firstName, lastName }: { firstName?: string | null; lastName?: string | null }) {
  const [listings, setListings] = useState<Property[] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    shortLetOperatorsApi
      .portalListings()
      .then((response) => {
        if (active) setListings(response.data);
      })
      .catch(() => {
        if (active) setListings(null);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const count = (status: ListingStatus) => listings?.filter((item) => item.status === status).length ?? null;
  const recent = (listings ?? []).slice(0, 5);

  return (
    <>
      <WorkspaceIntro workspace="Short let workspace" title={welcome(firstName, lastName)} />

      <WorkspaceStatGrid busy={loading}>
        <StatCard
          label="Your properties"
          value={figure(loading, listings?.length ?? null)}
          hint="View details →"
          href="/dashboard/operator-properties"
        />
        <StatCard
          label="Live listings"
          value={figure(loading, count(ListingStatus.ACTIVE))}
          hint="View details →"
          href="/dashboard/operator-properties"
        />
        <StatCard
          label="Awaiting review"
          value={figure(loading, count(ListingStatus.PENDING))}
          hint="View details →"
          href="/dashboard/operator-properties"
        />
      </WorkspaceStatGrid>

      <WorkspaceActionPanel
        title="Keep your workflow moving"
        actions={
          <Button asChild>
            <Link href="/dashboard/operator-properties">Open property portfolio</Link>
          </Button>
        }
      >
        Keep each stay&rsquo;s details, price and availability current. The approved listing stays live while your
        Veriq Agent reviews the changes.
      </WorkspaceActionPanel>

      <WorkspaceActivity busy={loading}>
        {loading ? (
          <EmptyActivity>Loading your properties…</EmptyActivity>
        ) : recent.length === 0 ? (
          <EmptyActivity>Nothing yet. Add your first Short Let to start the verification trail.</EmptyActivity>
        ) : (
          recent.map((item) => (
            <AuditRow key={item.id} meta={timeAgo(item.updatedAt)}>
              <span className="flex flex-wrap items-center gap-2">
                <span className="text-foreground">{item.title}</span>
                <Badge tone={item.status === ListingStatus.ACTIVE ? 'success' : 'neutral'}>
                  {sentenceCase(item.status)}
                </Badge>
              </span>
            </AuditRow>
          ))
        )}
      </WorkspaceActivity>
    </>
  );
}

// ─── Route ────────────────────────────────────────────────────────────────

/**
 * Every role lands here after sign-in and the sidebar's "Overview" points at it, so this screen is
 * the workspace overview for each of them. The Property Operator is the one exception: their
 * Overview has its own route, and keeping a second copy of it here would only let the two drift.
 */
export default function DashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const isPropertyOperator = user?.role === UserRole.PROPERTY_OPERATOR;

  useEffect(() => {
    if (isPropertyOperator) router.replace('/dashboard/operator');
  }, [isPropertyOperator, router]);

  if (!user || isPropertyOperator) return <PageLoader />;

  const names = { firstName: user.firstName, lastName: user.lastName };

  if (user.role === UserRole.ADMIN || user.role === UserRole.SUPER_ADMIN) return <AdminOverview {...names} />;
  if (user.role === UserRole.AGENT) return <AgentOverview {...names} />;
  if (user.role === UserRole.SHORT_LET_OPERATOR) return <ShortLetOverview {...names} />;
  return <RenterOverview {...names} />;
}
