'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  ClipboardList,
  Clock,
  FilePen,
  Home,
  MessageCircle,
  Phone,
  Plus,
  Send,
  UserCheck,
  Users,
} from 'lucide-react';
import { propertySubmissionsApi, sharedPropertiesApi } from '@/lib/api/operator';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import {
  CATEGORY_LABELS,
  EmptyState,
  IDENTITY_STATUS_META,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  SectionCard,
  StatusBadge,
  errorMessage,
  formatDateTime,
  needsReconfirmation,
} from '@/components/listing-forms';
import type {
  AssignedAgentSummary,
  OperatorPropertiesList,
  PublicationStatus,
  SharedOpportunitySummary,
} from '@/types/operator';

interface ReconfirmItem {
  propertyId: string;
  propertyTitle: string;
  unitId: string;
  unitLabel: string;
  freshnessExpiresAt: string | null;
}

const IN_VERIFICATION: PublicationStatus[] = ['submitted', 'verification_in_progress', 'ready_to_publish'];

async function inBatches<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(...(await Promise.allSettled(items.slice(index, index + size).map(task))));
  }
  return results;
}

function OperatorDashboard() {
  const [list, setList] = useState<OperatorPropertiesList | null>(null);
  const [shared, setShared] = useState<SharedOpportunitySummary[]>([]);
  const [sharedError, setSharedError] = useState<string | null>(null);
  const [agent, setAgent] = useState<AssignedAgentSummary | null>(null);
  const [reconfirm, setReconfirm] = useState<ReconfirmItem[]>([]);
  const [detailsIncomplete, setDetailsIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const [propertiesResponse, sharedResult] = await Promise.all([
        propertySubmissionsApi.mine(),
        sharedPropertiesApi.mine().then(
          (response) => ({ ok: true as const, data: response.data }),
          (caught: unknown) => ({ ok: false as const, error: errorMessage(caught, 'Unable to load Shared Property opportunities') }),
        ),
      ]);
      const data = propertiesResponse.data;
      setList(data);
      if (sharedResult.ok) {
        setShared(sharedResult.data);
        setSharedError(null);
      } else {
        setSharedError(sharedResult.error);
      }

      // Unit freshness and Agent contact live on each Property's manager view.
      const withAvailable = data.properties.filter((property) => property.availableUnits > 0);
      const agentSource = data.properties.find((property) => property.agentAssigned);
      const targets = [...withAvailable];
      if (agentSource && !targets.some((property) => property.id === agentSource.id)) targets.push(agentSource);
      const details = await inBatches(targets, 4, (property) => propertySubmissionsApi.get(property.id));
      const items: ReconfirmItem[] = [];
      let foundAgent: AssignedAgentSummary | null = null;
      let failed = false;
      for (const result of details) {
        if (result.status !== 'fulfilled') {
          failed = true;
          continue;
        }
        const detail = result.value.data;
        if (!foundAgent && detail.assignedAgent) foundAgent = detail.assignedAgent;
        for (const unit of detail.units) {
          if (needsReconfirmation(unit)) {
            items.push({
              propertyId: detail.property.id,
              propertyTitle: detail.property.title,
              unitId: unit.id,
              unitLabel: unit.displayLabel,
              freshnessExpiresAt: unit.freshnessExpiresAt,
            });
          }
        }
      }
      setAgent(foundAgent);
      setReconfirm(items);
      setDetailsIncomplete(failed);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load your Operator dashboard'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  if (loading) return <PageLoader />;

  if (loadError || !list) {
    return (
      <div className="mx-auto max-w-3xl">
        <Notice tone="error" title="Dashboard unavailable">
          <p>{loadError}</p>
          <button type="button" className="mt-1 font-semibold underline" onClick={() => { setLoading(true); void load(); }}>
            Try again
          </button>
        </Notice>
      </div>
    );
  }

  const { operator, properties } = list;
  const identity = IDENTITY_STATUS_META[operator.identityStatus];
  const count = (statuses: PublicationStatus[]) => properties.filter((property) => statuses.includes(property.publicationStatus)).length;
  const needsCorrection = properties.filter((property) => property.publicationStatus === 'needs_correction');
  const pendingRevisions = properties.reduce((total, property) => total + property.pendingRevisions, 0);
  const sharedNeedsReverification = shared.filter((item) => item.reverificationRequired);
  const sharedCorrection = shared.filter((item) => item.publicationStatus === 'needs_correction');

  const stats = [
    { label: 'Drafts', value: count(['draft']), icon: FilePen, href: '/dashboard/operator/properties?status=draft' },
    { label: 'In verification', value: count(IN_VERIFICATION), icon: Send, href: '/dashboard/operator/properties?status=in_verification' },
    { label: 'Needs correction', value: needsCorrection.length, icon: AlertTriangle, href: '/dashboard/operator/properties?status=needs_correction', alert: needsCorrection.length > 0 },
    { label: 'Published', value: count(['published']), icon: BadgeCheck, href: '/dashboard/operator/properties?status=published' },
    { label: 'Units to reconfirm', value: reconfirm.length, icon: Clock, href: '#reconfirm', alert: reconfirm.length > 0 },
    { label: 'Changes awaiting Agent', value: pendingRevisions, icon: ClipboardList, href: '/dashboard/operator/properties?status=pending_revisions' },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Operator Dashboard</h1>
          <p className="text-sm text-slate-500">Submit properties for Veriq verification, keep availability fresh and track Agent reviews.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/dashboard/operator/properties/new" className="btn-primary !py-2.5"><Plus className="h-4 w-4" /> Add Property</Link>
          <Link href="/dashboard/operator/shared/new" className="btn-outline !py-2.5"><Users className="h-4 w-4" /> Share a room</Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard title="Identity verification" description="Identity verification is separate from property verification (§7.6).">
          <div className="flex flex-col gap-2">
            <StatusBadge tone={identity.tone} className="self-start">
              <UserCheck className="h-3.5 w-3.5" /> {identity.label}
            </StatusBadge>
            <p className="text-sm text-slate-600">{identity.description}</p>
            <p className="text-xs text-slate-500">
              Property authority (ownership for Residential, authority to operate for Short Lets and Hostels, occupancy for Shared Property) is verified on each submission.
            </p>
          </div>
        </SectionCard>

        <SectionCard title="Your Veriq Agent" description="Your assigned Agent verifies and publishes your listings.">
          {agent ? (
            <div className="space-y-2">
              <p className="text-base font-semibold text-navy-900">{agent.name || 'Assigned Veriq Agent'}</p>
              {agent.phone ? (
                <div className="flex flex-wrap gap-2">
                  <a href={`tel:${agent.phone}`} className="btn-outline !px-3 !py-2 text-xs"><Phone className="h-3.5 w-3.5" /> {agent.phone}</a>
                  <a
                    href={`https://wa.me/${agent.phone.replace(/[^0-9]/g, '')}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-outline !px-3 !py-2 text-xs"
                  >
                    <MessageCircle className="h-3.5 w-3.5" /> WhatsApp
                  </a>
                </div>
              ) : (
                <p className="text-xs text-slate-500">Contact details are shared once your Agent adds a phone number.</p>
              )}
            </div>
          ) : operator.assignedAgentId ? (
            <p className="text-sm text-slate-600">
              A Veriq Agent is assigned to your account. Their contact details appear here once one of your properties is routed to them.
            </p>
          ) : (
            <div className="space-y-1">
              <StatusBadge tone="amber">Awaiting assignment</StatusBadge>
              <p className="text-sm text-slate-600">
                Veriq Admin assigns an Agent when you submit your first property or opportunity. You can keep preparing drafts meanwhile.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
        {stats.map((stat) => (
          <Link
            key={stat.label}
            href={stat.href}
            className={`card flex flex-col gap-2 p-4 ${stat.alert ? 'ring-1 ring-amber-300' : ''}`}
          >
            <stat.icon className={`h-5 w-5 ${stat.alert ? 'text-amber-500' : 'text-veriq-secondary'}`} />
            <span className="font-display text-2xl font-bold text-navy-900">{stat.value}</span>
            <span className="text-xs font-medium text-slate-500">{stat.label}</span>
          </Link>
        ))}
      </div>

      {detailsIncomplete && (
        <Notice tone="warning">Some property details could not be loaded, so reconfirmation counts may be incomplete. Refresh to try again.</Notice>
      )}

      {needsCorrection.length > 0 && (
        <SectionCard title="Needs correction" description="Your Veriq Agent requested changes before verification can continue.">
          <ul className="divide-y divide-slate-100">
            {needsCorrection.map((property) => (
              <li key={property.id} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-navy-900">{property.title}</p>
                  <p className="text-xs text-slate-500">{CATEGORY_LABELS[property.category]} · {property.area}, {property.city}</p>
                </div>
                <Link href={`/dashboard/operator/properties/${property.id}`} className="btn-primary !px-3 !py-2 text-xs">Review corrections</Link>
              </li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard id="reconfirm" title="Units needing availability reconfirmation" description="Available Units move to Unavailable automatically when the freshness deadline passes (§10.3).">
        {reconfirm.length === 0 ? (
          <p className="text-sm text-slate-500">All available Units are fresh.</p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {reconfirm.map((item) => (
              <li key={item.unitId} className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium text-navy-900">{item.unitLabel} <span className="font-normal text-slate-500">· {item.propertyTitle}</span></p>
                  <p className="text-xs text-amber-700">Confirm by {formatDateTime(item.freshnessExpiresAt)}</p>
                </div>
                <Link href={`/dashboard/operator/properties/${item.propertyId}#unit-${item.unitId}`} className="btn-outline !px-3 !py-2 text-xs">Reconfirm</Link>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>

      <div className="grid gap-4 lg:grid-cols-2">
        <SectionCard
          title="Recent properties"
          actions={<Link href="/dashboard/operator/properties" className="text-sm font-semibold text-veriq-secondary">View all</Link>}
        >
          {properties.length === 0 ? (
            <EmptyState icon={<Building2 className="h-10 w-10" />} title="No properties yet">
              Add your first Residential Property, Short Let or Hostel for verification.
              <div className="mt-3">
                <Link href="/dashboard/operator/properties/new" className="btn-primary !py-2">Add Property</Link>
              </div>
            </EmptyState>
          ) : (
            <ul className="divide-y divide-slate-100">
              {properties.slice(0, 5).map((property) => {
                const meta = PUBLICATION_STATUS_META[property.publicationStatus];
                return (
                  <li key={property.id}>
                    <Link href={`/dashboard/operator/properties/${property.id}`} className="flex items-center justify-between gap-3 py-3 hover:bg-slate-50/60">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-navy-900">{property.title}</p>
                        <p className="text-xs text-slate-500">
                          {CATEGORY_LABELS[property.category]} · {property.documentedUnits} Unit{property.documentedUnits === 1 ? '' : 's'} · {property.availableUnits} available
                        </p>
                      </div>
                      <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </SectionCard>

        <SectionCard
          title="Shared Property opportunities"
          actions={<Link href="/dashboard/operator/shared" className="text-sm font-semibold text-veriq-secondary">View all</Link>}
        >
          {sharedError ? (
            <Notice tone="error">{sharedError}</Notice>
          ) : shared.length === 0 ? (
            <EmptyState icon={<Home className="h-10 w-10" />} title="No opportunities yet">
              Offering a room or bedspace in the home you live in? Create a Shared Property opportunity.
            </EmptyState>
          ) : (
            <div className="space-y-3">
              {(sharedNeedsReverification.length > 0 || sharedCorrection.length > 0) && (
                <Notice tone="warning">
                  {sharedCorrection.length > 0 && `${sharedCorrection.length} need correction. `}
                  {sharedNeedsReverification.length > 0 && `${sharedNeedsReverification.length} awaiting Agent re-verification before going public again.`}
                </Notice>
              )}
              <ul className="divide-y divide-slate-100">
                {shared.slice(0, 5).map((item) => {
                  const meta = PUBLICATION_STATUS_META[item.publicationStatus];
                  return (
                    <li key={item.id}>
                      <Link href={`/dashboard/operator/shared/${item.id}`} className="flex items-center justify-between gap-3 py-3">
                        <div className="min-w-0">
                          <p className="truncate font-medium text-navy-900">{item.displayLabel}</p>
                          <p className="text-xs text-slate-500">{item.area}, {item.city} · {item.availabilityStatus === 'available' ? 'Available' : 'Unavailable'}</p>
                        </div>
                        <StatusBadge tone={meta.tone}>{meta.label}</StatusBadge>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </SectionCard>
      </div>
    </div>
  );
}

export default function OperatorDashboardPage() {
  return (
    <OperatorGuard>
      <OperatorDashboard />
    </OperatorGuard>
  );
}
