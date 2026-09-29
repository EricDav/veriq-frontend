'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, FileClock, Landmark, Users, Wallet } from 'lucide-react';
import { agentEarningsApi, agentPortfolioApi, revisionsApi, saleListingsApi, verificationApi } from '@/lib/api/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { panelClass } from '@/components/ui';
import { cn } from '@/lib/utils';
import { formatNaira } from './format';

interface Summary {
  openCases: number | null;
  pendingRevisions: number | null;
  withdrawable: number | null;
  properties: number | null;
  sales: number | null;
  publishingPermission: boolean | null;
}

const EMPTY: Summary = {
  openCases: null,
  pendingRevisions: null,
  withdrawable: null,
  properties: null,
  sales: null,
  publishingPermission: null,
};

/** Compact Agent work summary linking to the verification queue, revisions, earnings and portfolio (§17.3). */
export function AgentSummaryHeader() {
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([
      verificationApi.queue(),
      revisionsApi.pending(),
      agentEarningsApi.mine(),
      agentPortfolioApi.mine(),
      saleListingsApi.managed(),
    ]).then(([cases, revisions, earnings, portfolio, sales]) => {
      if (!active) return;
      setSummary({
        openCases: cases.status === 'fulfilled' ? cases.value.data.length : null,
        pendingRevisions: revisions.status === 'fulfilled' ? revisions.value.data.length : null,
        withdrawable: earnings.status === 'fulfilled' ? earnings.value.data.buckets.withdrawable : null,
        properties: portfolio.status === 'fulfilled' ? portfolio.value.data.properties.length : null,
        sales: sales.status === 'fulfilled' ? sales.value.data.length : null,
        publishingPermission: portfolio.status === 'fulfilled' ? portfolio.value.data.agent.publishingPermission : null,
      });
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  const tiles = [
    { href: '/dashboard/agent/verification', label: 'Verification queue', value: summary.openCases, icon: ClipboardCheck, suffix: 'open cases' },
    { href: '/dashboard/agent/revisions', label: 'Pending revisions', value: summary.pendingRevisions, icon: FileClock, suffix: 'awaiting review' },
    { href: '/dashboard/agent/sales', label: 'Property for Sale', value: summary.sales, icon: Landmark, suffix: 'listings managed' },
    { href: '/dashboard/agent/portfolio', label: 'Portfolio & referral', value: summary.properties, icon: Users, suffix: 'assigned properties' },
  ];

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        {tiles.map((tile) => (
          <Link key={tile.href} href={tile.href} className={cn(panelClass, "p-[17px] transition-colors hover:border-[#10b98170]")}>
            <tile.icon className="h-4 w-4 text-muted-foreground" />
            <p className="mt-1.5 text-xl font-black text-foreground">{loading ? <LoadingSpinner size="sm" /> : (tile.value ?? '—')}</p>
            <p className="text-[11px] font-semibold text-foreground">{tile.label}</p>
            <p className="text-[11px] text-muted-foreground">{tile.suffix}</p>
          </Link>
        ))}
        <Link href="/dashboard/agent/earnings" className={cn(panelClass, "p-[17px] transition-colors hover:border-[#10b98170]")}>
          <Wallet className="h-4 w-4 text-muted-foreground" />
          <p className="mt-1.5 text-xl font-black text-[#6ee7b7]">{loading ? <LoadingSpinner size="sm" /> : summary.withdrawable === null ? '—' : formatNaira(summary.withdrawable)}</p>
          <p className="text-[11px] font-semibold text-foreground">Earnings</p>
          <p className="text-[11px] text-muted-foreground">withdrawable now</p>
        </Link>
      </div>
      {summary.publishingPermission === false && (
        <p className="rounded-xl border border-[#fbbf2425] bg-[#fbbf2409] px-4 py-2 text-xs text-[#fcd34d]">
          Publishing permission is not active on your account, so publication is blocked on every assigned listing until Admin grants it (§8.3).
        </p>
      )}
    </div>
  );
}
