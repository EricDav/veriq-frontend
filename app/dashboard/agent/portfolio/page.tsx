'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { Building2, Check, Copy, ExternalLink, Landmark, RefreshCw, Share2, Users } from 'lucide-react';
import type { AgentPortfolio, SaleManagedItem, SharedQueueItem, VerificationQueueItem } from '@/types/agent';
import { UserRole } from '@/types';
import { agentPortfolioApi, saleListingsApi, sharedVerificationApi, verificationApi } from '@/lib/api/agent';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  CATEGORY_LABELS,
  IDENTITY_STATUS_LABELS,
  IDENTITY_STATUS_TONES,
  PUBLICATION_STATUS_TONES,
  errorMessage,
  formatDateTime,
  formatNaira,
  humanize,
} from '@/components/agent/format';
import { EmptyBlock, ErrorBlock, InlineNotice, LoadingBlock, PageHeader, PanelCard, StatusPill, smallButton } from '@/components/agent/ui';

async function copyToClipboard(value: string) {
  try {
    await navigator.clipboard.writeText(value);
    return true;
  } catch {
    try {
      const area = document.createElement('textarea');
      area.value = value;
      document.body.appendChild(area);
      area.select();
      document.execCommand('copy');
      document.body.removeChild(area);
      return true;
    } catch {
      return false;
    }
  }
}

export default function AgentPortfolioPage() {
  const { user, isLoading: authLoading } = useAuth();
  const { success, error: toastError } = useToast();
  const [portfolio, setPortfolio] = useState<AgentPortfolio | null>(null);
  const [cases, setCases] = useState<VerificationQueueItem[]>([]);
  const [shared, setShared] = useState<SharedQueueItem[]>([]);
  const [sales, setSales] = useState<SaleManagedItem[]>([]);
  const [loadError, setLoadError] = useState('');
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState<'code' | 'link' | 'profile' | null>(null);
  const [origin, setOrigin] = useState('');

  useEffect(() => {
    if (typeof window !== 'undefined') setOrigin(window.location.origin);
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError('');
    try {
      const [portfolioRes, casesRes, sharedRes, salesRes] = await Promise.allSettled([
        agentPortfolioApi.mine(),
        verificationApi.queue(),
        sharedVerificationApi.queue(),
        saleListingsApi.managed(),
      ]);
      if (portfolioRes.status === 'rejected') throw portfolioRes.reason;
      setPortfolio(portfolioRes.value.data);
      if (casesRes.status === 'fulfilled') setCases(casesRes.value.data);
      if (sharedRes.status === 'fulfilled') setShared(sharedRes.value.data);
      if (salesRes.status === 'fulfilled') setSales(salesRes.value.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load your portfolio'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user?.role === UserRole.AGENT) load();
  }, [load, user?.role]);

  const caseByProperty = useMemo(() => {
    const map = new Map<string, string>();
    cases.forEach((item) => {
      if (item.property?.id) map.set(item.property.id, item.id);
    });
    return map;
  }, [cases]);

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.AGENT) return <ErrorBlock message="The Agent portfolio is available to Veriq Agents only." />;
  if (loadError) {
    return (
      <div className="mx-auto max-w-5xl space-y-4">
        <PageHeader title="Portfolio & Referral" backHref="/dashboard/agent" backLabel="Agent dashboard" />
        <ErrorBlock message={loadError} onRetry={load} />
      </div>
    );
  }
  if (loading && !portfolio) return <LoadingBlock label="Loading portfolio…" />;
  if (!portfolio) return <PageLoader />;

  const { agent, operators, properties } = portfolio;
  const referralLink = agent.referralCode ? `${origin}/auth/register?role=property_operator&ref=${agent.referralCode}` : '';
  const profileLink = agent.username ? `${origin}/${agent.username}` : '';

  const copy = async (value: string, kind: 'code' | 'link' | 'profile', label: string) => {
    if (await copyToClipboard(value)) {
      setCopied(kind);
      success(`${label} copied`);
      setTimeout(() => setCopied(null), 2000);
    } else {
      toastError('Could not copy — select and copy manually');
    }
  };

  const shareReferral = async () => {
    if (!referralLink) return;
    const payload = {
      title: 'Join Veriq as a Property Operator',
      text: `Use my Veriq referral code ${agent.referralCode} to register your properties with a verified Veriq Agent.`,
      url: referralLink,
    };
    if (typeof navigator !== 'undefined' && navigator.share) {
      try {
        await navigator.share(payload);
        return;
      } catch {
        // Share dismissed — fall back to copying below.
      }
    }
    copy(referralLink, 'link', 'Referral link');
  };

  return (
    <div className="mx-auto max-w-5xl space-y-5">
      <PageHeader
        title="Portfolio & Referral"
        subtitle="Your assigned Operators, the listings you manage, and the referral code that attributes new Operators to you (§3)."
        backHref="/dashboard/agent"
        backLabel="Agent dashboard"
        badges={
          <>
            <span className={`badge !px-2.5 !py-0.5 text-[11px] ${agent.isActive ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#fb718510] text-[#fda4af]'}`}>
              {agent.isActive ? 'Active Agent' : 'Suspended'}
            </span>
            <span className={`badge !px-2.5 !py-0.5 text-[11px] ${agent.publishingPermission ? 'bg-[#10b98112] text-[#6ee7b7]' : 'bg-[#fbbf2410] text-[#fcd34d]'}`}>
              {agent.publishingPermission ? 'Publishing permission active' : 'No publishing permission'}
            </span>
          </>
        }
        actions={
          <button type="button" className={smallButton} onClick={load} disabled={loading}>
            <RefreshCw className="h-3.5 w-3.5" /> Refresh
          </button>
        }
      />

      {!agent.publishingPermission && (
        <InlineNotice tone="warning">
          Admin has not granted publishing permission, so publication is blocked on every listing assigned to you. You can still verify, correct and
          prepare records.
        </InlineNotice>
      )}

      <PanelCard title="Referral code" icon={Share2} subtitle="Operators who register with your code are assigned to you (§3.2). It creates no separate or permanent earnings rights.">
        {agent.referralCode ? (
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-unit border border-[#ffffff18] bg-[#070b1444] px-4 py-2 font-mono text-lg font-semibold tracking-widest text-foreground">{agent.referralCode}</span>
              <button type="button" className={smallButton} onClick={() => copy(agent.referralCode ?? '', 'code', 'Referral code')}>
                {copied === 'code' ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />} Copy code
              </button>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <p className="min-w-0 flex-1 truncate rounded-lg border border-[#ffffff18] bg-veriq-surface px-3 py-2 text-xs text-foreground">{referralLink || '—'}</p>
              <div className="flex gap-2">
                <button type="button" className={smallButton} onClick={() => copy(referralLink, 'link', 'Referral link')} disabled={!referralLink}>
                  {copied === 'link' ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />} Copy link
                </button>
                <button type="button" className={smallButton} onClick={shareReferral} disabled={!referralLink}>
                  <Share2 className="h-3.5 w-3.5" /> Share
                </button>
              </div>
            </div>
            <p className="text-[11px] text-muted-foreground">The link opens Property Operator registration with your code pre-filled.</p>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Admin has not issued a referral code for your account yet.</p>
        )}
      </PanelCard>

      <PanelCard
        title="Public profile"
        icon={ExternalLink}
        subtitle="Your public profile presents you as a Veriq verification professional and lists the published properties you manage (§16.1)."
      >
        {agent.username ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <p className="min-w-0 flex-1 truncate rounded-lg border border-[#ffffff18] bg-veriq-surface px-3 py-2 text-xs text-foreground">{profileLink}</p>
            <div className="flex gap-2">
              <button type="button" className={smallButton} onClick={() => copy(profileLink, 'profile', 'Profile link')}>
                {copied === 'profile' ? <Check className="h-3.5 w-3.5 text-[#34d399]" /> : <Copy className="h-3.5 w-3.5" />} Copy
              </button>
              <Link href={`/${agent.username}`} target="_blank" className={smallButton}>
                <ExternalLink className="h-3.5 w-3.5" /> View profile
              </Link>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Your public profile username is not set yet. Complete your{' '}
            <Link href="/dashboard/agent" className="font-semibold text-primary hover:underline">
              Agent profile
            </Link>
            .
          </p>
        )}
      </PanelCard>

      <PanelCard title={`Assigned Operators (${operators.length})`} icon={Users}>
        {operators.length === 0 ? (
          <EmptyBlock title="No Operators assigned yet" message="Admin assigns Operators to you, or they register with your referral code." />
        ) : (
          <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
            {operators.map((operator) => (
              <li key={operator.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-foreground">{operator.name || 'Property Operator'}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {operator.phone ?? '—'}
                    {operator.email ? ` · ${operator.email}` : ''} · {operator.propertyCount} propert{operator.propertyCount === 1 ? 'y' : 'ies'}
                    {operator.referralCodeUsed ? ` · referral ${operator.referralCodeUsed}` : ''}
                  </p>
                  {operator.categories && operator.categories.length > 0 && (
                    <p className="text-[11px] text-muted-foreground">{operator.categories.map((category) => CATEGORY_LABELS[category] ?? category).join(', ')}</p>
                  )}
                </div>
                <StatusPill value={operator.identityStatus} tones={IDENTITY_STATUS_TONES} label={IDENTITY_STATUS_LABELS[operator.identityStatus]} />
              </li>
            ))}
          </ul>
        )}
      </PanelCard>

      <PanelCard title={`Properties (${properties.length})`} icon={Building2}>
        {properties.length === 0 ? (
          <EmptyBlock title="No properties assigned" message="Properties submitted by your Operators appear here." />
        ) : (
          <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
            {properties.map((property) => {
              const caseId = caseByProperty.get(property.id);
              return (
                <li key={property.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{property.title}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {CATEGORY_LABELS[property.category] ?? property.category} · {property.area}, {property.city} · updated {formatDateTime(property.updatedAt)}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusPill value={property.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                    {caseId ? (
                      <Link href={`/dashboard/agent/verification/${caseId}`} className={smallButton}>
                        Open case
                      </Link>
                    ) : property.publicationStatus === 'published' ? (
                      <Link href={`/properties/${property.id}`} target="_blank" className={smallButton}>
                        View public page
                      </Link>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>

      <PanelCard
        title={`Shared Property opportunities (${shared.length})`}
        icon={Users}
        subtitle="Open verification and re-verification cases assigned to you."
        actions={
          <Link href="/dashboard/agent/shared" className={smallButton}>
            Open queue
          </Link>
        }
      >
        {shared.length === 0 ? (
          <p className="text-sm text-muted-foreground">No open Shared Property cases.</p>
        ) : (
          <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
            {shared.map((item) =>
              item.opportunity ? (
                <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-foreground">{item.opportunity.displayLabel}</p>
                    <p className="text-[11px] text-muted-foreground">
                      {humanize(item.opportunity.opportunityType)} · {item.opportunity.area}, {item.opportunity.city}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <StatusPill value={item.opportunity.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                    <Link href={`/dashboard/agent/shared/${item.opportunity.id}`} className={smallButton}>
                      Open
                    </Link>
                  </div>
                </li>
              ) : null,
            )}
          </ul>
        )}
      </PanelCard>

      <PanelCard
        title={`Sale Listings (${sales.length})`}
        icon={Landmark}
        actions={
          <Link href="/dashboard/agent/sales" className={smallButton}>
            Open workspace
          </Link>
        }
      >
        {sales.length === 0 ? (
          <p className="text-sm text-muted-foreground">You do not manage any Property for Sale listings yet.</p>
        ) : (
          <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
            {sales.map((sale) => (
              <li key={sale.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{sale.title}</p>
                  <p className="text-[11px] text-muted-foreground">
                    {sale.subtype === 'land' ? 'Land' : 'Built Property'} · {formatNaira(sale.askingPrice)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusPill value={sale.publicationStatus} tones={PUBLICATION_STATUS_TONES} />
                  <Link href={`/dashboard/agent/sales/${sale.id}`} className={smallButton}>
                    Open
                  </Link>
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
