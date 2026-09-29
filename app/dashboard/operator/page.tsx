'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { AlertTriangle, Clock } from 'lucide-react';
import { propertySubmissionsApi } from '@/lib/api/operator';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { CATEGORY_LABELS, PUBLICATION_STATUS_META, OperatorGuard, errorMessage, formatDateTime, needsReconfirmation } from '@/components/listing-forms';
import type {
  AssignedAgentSummary,
  OperatorPropertiesList,
  OperatorPropertySummary,
  PublicationStatus,
} from '@/types/operator';
import { AuditRow, Badge, Button, Notice, Panel, StatCard, type BadgeTone } from '@/components/ui';
import {
  WorkspaceActionPanel,
  WorkspaceActivity,
  WorkspaceIntro,
  WorkspaceStatGrid,
} from '@/components/workspace/WorkspaceIntro';

interface ReconfirmItem {
  propertyId: string;
  propertyTitle: string;
  unitId: string;
  unitLabel: string;
  freshnessExpiresAt: string | null;
}

const IN_VERIFICATION: PublicationStatus[] = ['submitted', 'verification_in_progress', 'ready_to_publish'];

/** The publication states the shared {@link Badge} tones map onto. Everything else reads as neutral. */
const STATUS_TONES: Partial<Record<PublicationStatus, BadgeTone>> = {
  published: 'success',
  ready_to_publish: 'success',
  submitted: 'amber',
  verification_in_progress: 'amber',
  needs_correction: 'red',
};

const PROPERTIES_HREF = '/dashboard/operator/properties';

async function inBatches<T, R>(items: T[], size: number, task: (item: T) => Promise<R>): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = [];
  for (let index = 0; index < items.length; index += size) {
    results.push(...(await Promise.allSettled(items.slice(index, index + size).map(task))));
  }
  return results;
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.max(0, Math.floor(diff / 60000));
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

/** The welcome the prototype uses: the person's name when we know it, the neutral line otherwise. */
function welcome(firstName?: string | null, lastName?: string | null): string {
  const name = [firstName, lastName].filter(Boolean).join(' ').trim();
  return name ? `Welcome, ${name}.` : 'Welcome back.';
}

function figure(loading: boolean, value: number | string | null): React.ReactNode {
  if (loading) return '…';
  if (value === null) return '—';
  return typeof value === 'number' ? value.toLocaleString('en-NG') : value;
}

function OperatorDashboard() {
  const { user } = useAuth();
  const [list, setList] = useState<OperatorPropertiesList | null>(null);
  const [agent, setAgent] = useState<AssignedAgentSummary | null>(null);
  const [reconfirm, setReconfirm] = useState<ReconfirmItem[]>([]);
  const [detailsIncomplete, setDetailsIncomplete] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const propertiesResponse = await propertySubmissionsApi.mine();
      const data = propertiesResponse.data;
      setList(data);

      // Unit freshness and the Agent's name live on each Property's manager view, so the overview
      // opens only the Properties that can carry either: one with available Units, or an assigned one.
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

  if (loading && !list) return <PageLoader />;

  if (loadError && !list) {
    return (
      <>
        <WorkspaceIntro workspace="Property Operator workspace" title={welcome(user?.firstName, user?.lastName)} />
        <Notice tone="amber" icon={<AlertTriangle className="h-4 w-4" />} title="Dashboard unavailable">
          <p>{loadError}</p>
          <Button
            variant="secondary"
            size="small"
            className="mt-3"
            onClick={() => {
              setLoading(true);
              void load();
            }}
          >
            Try again
          </Button>
        </Notice>
      </>
    );
  }

  const properties: OperatorPropertySummary[] = list?.properties ?? [];
  const awaitingReview = properties.filter((property) => IN_VERIFICATION.includes(property.publicationStatus)).length;
  const needsCorrection = properties.filter((property) => property.publicationStatus === 'needs_correction');
  const recent = [...properties]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5);

  return (
    <>
      <WorkspaceIntro workspace="Property Operator workspace" title={welcome(user?.firstName, user?.lastName)} />

      <WorkspaceStatGrid busy={loading}>
        <StatCard
          label="Your properties"
          value={figure(loading, properties.length)}
          hint="View details →"
          href={PROPERTIES_HREF}
        />
        <StatCard
          label="Awaiting review"
          value={figure(loading, awaitingReview)}
          hint="View details →"
          href={`${PROPERTIES_HREF}?status=in_verification`}
        />
        <StatCard
          label="Assigned Agent"
          value={figure(loading, agent?.name ?? null)}
          hint="View details →"
          href={PROPERTIES_HREF}
        />
      </WorkspaceStatGrid>

      <WorkspaceActionPanel
        title="Keep your workflow moving"
        actions={
          <Button asChild>
            <Link href={PROPERTIES_HREF}>Open property portfolio</Link>
          </Button>
        }
      >
        Provide property and unit intelligence. Edit each unit from My properties; the approved listing stays live
        while your Agent reviews the changes.
      </WorkspaceActionPanel>

      {detailsIncomplete && (
        <Notice tone="amber" className="mt-6" icon={<AlertTriangle className="h-4 w-4" />} title="Counts may be incomplete">
          Some property details could not be loaded, so the reconfirmation list below may be short. Reload to try again.
        </Notice>
      )}

      {needsCorrection.length > 0 && (
        <Panel as="section" className="mt-6">
          <h2 className="font-display text-[1.12rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            Needs correction
          </h2>
          <p className="mt-[7px] text-muted-foreground">
            Your Veriq Agent asked for changes before verification can continue.
          </p>
          <div className="mt-4">
            {needsCorrection.map((property) => (
              <AuditRow
                key={property.id}
                meta={
                  <Button asChild variant="secondary" size="small">
                    <Link href={`${PROPERTIES_HREF}/${property.id}`}>Review corrections</Link>
                  </Button>
                }
              >
                <span className="text-foreground">{property.title}</span> · {CATEGORY_LABELS[property.category]} ·{' '}
                {property.area}, {property.city}
              </AuditRow>
            ))}
          </div>
        </Panel>
      )}

      {reconfirm.length > 0 && (
        <Panel as="section" id="reconfirm" className="mt-6">
          <h2 className="font-display text-[1.12rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            Units needing availability reconfirmation
          </h2>
          <p className="mt-[7px] text-muted-foreground">
            An available Unit becomes Unavailable automatically once its freshness deadline passes (§10.3).
          </p>
          <div className="mt-4">
            {reconfirm.map((item) => (
              <AuditRow
                key={item.unitId}
                meta={
                  <Button asChild variant="secondary" size="small">
                    <Link href={`${PROPERTIES_HREF}/${item.propertyId}#unit-${item.unitId}`}>Reconfirm</Link>
                  </Button>
                }
              >
                <span className="flex flex-wrap items-center gap-2">
                  <span className="text-foreground">{item.unitLabel}</span>
                  <span>· {item.propertyTitle}</span>
                  <Badge tone="amber">
                    <Clock aria-hidden="true" className="h-3 w-3" /> Confirm by {formatDateTime(item.freshnessExpiresAt)}
                  </Badge>
                </span>
              </AuditRow>
            ))}
          </div>
        </Panel>
      )}

      <WorkspaceActivity busy={loading}>
        {recent.length === 0 ? (
          <p className="text-ui-sm text-muted-foreground">
            Nothing yet. Add your first property and its verification trail appears here.
          </p>
        ) : (
          recent.map((property) => {
            const meta = PUBLICATION_STATUS_META[property.publicationStatus];
            return (
              <AuditRow key={property.id} meta={timeAgo(property.updatedAt)}>
                <span className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`${PROPERTIES_HREF}/${property.id}`}
                    className="text-foreground underline-offset-4 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                  >
                    {property.title}
                  </Link>
                  <span>
                    {CATEGORY_LABELS[property.category]} · {property.documentedUnits} Unit
                    {property.documentedUnits === 1 ? '' : 's'} · {property.availableUnits} available
                  </span>
                  <Badge tone={STATUS_TONES[property.publicationStatus] ?? 'neutral'}>{meta.label}</Badge>
                </span>
              </AuditRow>
            );
          })
        )}
      </WorkspaceActivity>
    </>
  );
}

export default function OperatorDashboardPage() {
  return (
    <OperatorGuard>
      <OperatorDashboard />
    </OperatorGuard>
  );
}
