'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowRight,
  Building2,
  ClipboardCheck,
  Coins,
  FileText,
  Gauge,
  Home,
  KeyRound,
  Landmark,
  Settings2,
  ShieldCheck,
  Undo2,
  Users,
} from 'lucide-react';
import { assignmentsAdminApi, ledgerAdminApi } from '@/lib/api/admin';
import type { AssignmentQueue, LedgerOverview } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { describeError, naira, type DescribedError } from '@/components/admin/format';
import { AdminPageHeader, ErrorPanel, StatCard, useAdminGuard } from '@/components/admin/ui';

const SECTIONS = [
  {
    href: '/dashboard/admin/assignments',
    icon: ClipboardCheck,
    cls: 'bg-[#10b98112] text-primary',
    title: 'Operator Assignment Queue',
    description: 'Assign and reassign Property Operators and, exceptionally, individual properties, with full history.',
  },
  {
    href: '/dashboard/admin/veriq-agents',
    icon: ShieldCheck,
    cls: 'bg-[#10b98112] text-primary',
    title: 'Veriq Agents',
    description: 'Create Agent accounts, issue referral codes, suspend or restore, control publishing permission and commission share.',
  },
  {
    href: '/dashboard/admin/verification',
    icon: Home,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'Verification Oversight',
    description: 'Cases across Agents, escalations, emergency suspension, dispute freeze, Operator transfer and identity decisions.',
  },
  {
    href: '/dashboard/admin/sales',
    icon: Landmark,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'Property for Sale',
    description: 'Sale listings, seller verification, document statuses, escalations and availability.',
  },
  {
    href: '/dashboard/admin/refunds',
    icon: Undo2,
    cls: 'bg-[#fbbf2410] text-[#fcd34d]',
    title: 'Refund Queue',
    description: 'Decide refund cases; approved refunds are credited to the renter’s Veriq Wallet.',
  },
  {
    href: '/dashboard/admin/ledger',
    icon: Coins,
    cls: 'bg-[#10b98112] text-primary',
    title: 'Ledger',
    description: 'Overview, unlock transactions, revenue split, wallet ledger, Agent balances and withdrawals.',
  },
  {
    href: '/dashboard/admin/pricing',
    icon: KeyRound,
    cls: 'bg-[#10b98112] text-primary',
    title: 'Pricing & Free Unlock',
    description: 'Listing-level unlock prices and Free Unlock rules, each with Operator-first listing selection.',
  },
  {
    href: '/dashboard/admin/business-rules',
    icon: Settings2,
    cls: 'bg-[#10b98112] text-primary',
    title: 'Business Rules',
    description: 'Effective-dated prices, windows, holds, shares and limits. Changes are never retroactive.',
  },
  {
    href: '/dashboard/admin/categories',
    icon: Building2,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'Category Configuration',
    description: 'Enable or disable supported property categories without deleting data, schemas or history.',
  },
  {
    href: '/dashboard/admin/quality',
    icon: Gauge,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'Agent Quality',
    description: 'Internal quality scores, audits and unlock outcomes. Never shown publicly.',
  },
  {
    href: '/dashboard/admin/audit',
    icon: FileText,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'Audit Log',
    description: 'Every material action with actor, previous and new values, source and reason.',
  },
  {
    href: '/dashboard/admin/users',
    icon: Users,
    cls: 'bg-[#ffffff08] text-muted-foreground',
    title: 'User Management',
    description: 'View accounts, activate or deactivate users and monitor platform activity.',
  },
];

export default function AdminOverviewPage() {
  const { ready, loading: authLoading } = useAdminGuard();

  const [overview, setOverview] = useState<LedgerOverview | null>(null);
  const [queue, setQueue] = useState<AssignmentQueue | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [ledger, assignments] = await Promise.all([ledgerAdminApi.overview(), assignmentsAdminApi.queue()]);
      setOverview(ledger.data);
      setQueue(assignments.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load the admin snapshot'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      {/*
        The Admin workspace overview — the welcome, the three figures and what to do next — is the
        sidebar's Overview at /dashboard. This screen is the full index behind it, so it names itself
        rather than welcoming the viewer a second time.
      */}
      <AdminPageHeader
        icon={ShieldCheck}
        eyebrow="Admin workspace"
        title="Admin Panel"
        description="Every Admin area in one place, over the last 30 days of unlocks, refunds and assignment work."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      <div className="flex items-start gap-3 rounded-xl border border-[#fbbf2430] bg-[#fbbf2410] p-4">
        <AlertCircle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#fcd34d]" />
        <p className="text-sm text-[#fcd34d]">
          <strong>Admin actions are recorded and mostly irreversible.</strong> Suspensions, refunds, price and rule changes affect real money and real users, and every action is written to the audit log with your reason.
        </p>
      </div>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Coins} label="Unlock revenue (30 days)" value={loading ? '…' : naira(overview?.revenue.gross ?? 0)} sub={`${(overview?.unlocks.count ?? 0).toLocaleString('en-NG')} unlocks · ${overview?.unlocks.freeUnlocks ?? 0} free`} />
        <StatCard icon={Undo2} tone="amber" label="Open refund cases" value={loading ? '…' : overview?.refunds.open ?? 0} sub={`${naira(overview?.refunds.credited ?? 0)} credited in 30 days`} />
        <StatCard icon={ClipboardCheck} tone="blue" label="Operators awaiting assignment" value={loading ? '…' : queue?.operators.length ?? 0} sub={`${queue?.propertiesWithoutAgent.length ?? 0} properties without an Agent`} />
        <StatCard icon={AlertCircle} tone={(overview?.paymentExceptions ?? 0) > 0 ? 'red' : 'slate'} label="Payment exceptions" value={loading ? '…' : overview?.paymentExceptions ?? 0} sub="Duplicate or failed charges" />
      </div>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {SECTIONS.map(({ href, icon: Icon, cls, title, description }) => (
          <div key={href} className="card flex flex-col p-5 hover:shadow-card-hover">
            <div className={`mb-4 flex h-11 w-11 items-center justify-center rounded-2xl ${cls}`}>
              <Icon className="h-5 w-5" />
            </div>
            <h2 className="font-display text-base font-bold text-foreground">{title}</h2>
            <p className="mb-5 mt-2 flex-1 text-sm leading-relaxed text-muted-foreground">{description}</p>
            <Link href={href} className="inline-flex items-center justify-center gap-2 rounded-xl bg-background py-2.5 text-sm font-bold text-foreground transition-colors hover:bg-[#ffffff0d]">
              Open <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      <div className="card bg-background p-6">
        <h2 className="mb-3 font-display text-sm font-bold text-foreground">Operating principles</h2>
        <div className="space-y-2 text-xs leading-relaxed text-muted-foreground">
          <p><strong className="text-foreground">Effective-dated configuration:</strong> price, window, hold and share changes apply from their effective time only; recorded transactions keep the values used when they were created.</p>
          <p><strong className="text-foreground">Assignment vs earnings:</strong> reassigning an Operator or Property moves future qualifying unlock earnings only; earnings already recorded stay with the Agent who earned them.</p>
          <p><strong className="text-foreground">Refunds:</strong> approved refunds are Veriq Wallet credit, applied once as a single ledger operation, never cash.</p>
        </div>
      </div>
    </div>
  );
}
