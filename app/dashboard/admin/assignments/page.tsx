'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ClipboardCheck, History, Search, UserCheck, UserX, Home, Users } from 'lucide-react';
import { assignmentsAdminApi, pricingAdminApi } from '@/lib/api/admin';
import type {
  AssignmentHistoryRow,
  AssignmentQueue,
  OperatorAssignmentView,
  PropertyAssignmentView,
  SelectorListing,
  SelectorOperator,
} from '@/types/admin';
import { VERIQ_MANAGED_OPERATOR_ID } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { AgentSelect } from '@/components/admin/AgentSelect';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useAgentDirectory } from '@/components/admin/useAgentDirectory';
import { useDebounced } from '@/components/admin/useDebounced';
import {
  categoryLabel,
  dateOnly,
  dateTime,
  describeError,
  errorText,
  humanize,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  Panel,
  StatCard,
  StatusBadge,
  TableScroll,
  Tabs,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type TabId = 'operators' | 'properties' | 'lookup';

type AssignTarget =
  | { kind: 'operator'; id: string; name: string; currentAgentId: string | null }
  | { kind: 'property'; id: string; name: string; currentAgentId: string | null };

type HistoryTarget = { kind: 'operator' | 'property'; id: string; name: string };

const SOURCE_LABELS: Record<string, string> = {
  referral: 'Referral code',
  admin: 'Admin assignment',
  admin_override: 'Admin override',
  migration: 'Migration',
};

function HistoryTable({ rows, nameOf }: { rows: AssignmentHistoryRow[]; nameOf: (id: string | null) => string }) {
  if (rows.length === 0) {
    return <EmptyState title="No assignment history" description="No Agent has been assigned yet." />;
  }
  return (
    <TableScroll>
      <table className="w-full min-w-[640px]">
        <thead className="bg-[#ffffff08]">
          <tr>
            <th className={th}>Veriq Agent</th>
            <th className={th}>Source</th>
            <th className={th}>Effective</th>
            <th className={th}>Reason</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-[#ffffff12]">
          {rows.map((row) => (
            <tr key={row.id}>
              <td className={td}>
                <p className="font-semibold">{nameOf(row.agentId)}</p>
                {!row.effectiveUntil && <StatusBadge status="active" label="Current" />}
              </td>
              <td className={td}><span className="text-xs">{SOURCE_LABELS[row.source] ?? humanize(row.source)}</span></td>
              <td className={td}>
                <p className="whitespace-nowrap text-xs">From {dateTime(row.effectiveFrom)}</p>
                <p className="whitespace-nowrap text-xs text-muted-foreground">{row.effectiveUntil ? `Until ${dateTime(row.effectiveUntil)}` : 'Still in effect'}</p>
              </td>
              <td className={td}><p className="max-w-xs text-xs text-muted-foreground">{row.reason || '—'}</p></td>
            </tr>
          ))}
        </tbody>
      </table>
    </TableScroll>
  );
}

export default function AdminAssignmentsPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const directory = useAgentDirectory();

  const [tab, setTab] = useState<TabId>('operators');
  const [queue, setQueue] = useState<AssignmentQueue | null>(null);
  const [queueLoading, setQueueLoading] = useState(true);
  const [queueError, setQueueError] = useState<DescribedError | null>(null);

  const [assignTarget, setAssignTarget] = useState<AssignTarget | null>(null);
  const [assignAgentId, setAssignAgentId] = useState('');

  const [historyTarget, setHistoryTarget] = useState<HistoryTarget | null>(null);
  const [operatorView, setOperatorView] = useState<OperatorAssignmentView | null>(null);
  const [propertyView, setPropertyView] = useState<PropertyAssignmentView | null>(null);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<DescribedError | null>(null);
  const [clearTarget, setClearTarget] = useState<HistoryTarget | null>(null);

  const [operatorQuery, setOperatorQuery] = useState('');
  const debouncedOperatorQuery = useDebounced(operatorQuery);
  const [lookupOperators, setLookupOperators] = useState<SelectorOperator[]>([]);
  const [lookupLoading, setLookupLoading] = useState(false);
  const [lookupError, setLookupError] = useState<DescribedError | null>(null);
  const [lookupOperator, setLookupOperator] = useState<SelectorOperator | null>(null);
  const [lookupListings, setLookupListings] = useState<SelectorListing[]>([]);
  const [lookupListingsLoading, setLookupListingsLoading] = useState(false);
  const [lookupListingsError, setLookupListingsError] = useState<DescribedError | null>(null);
  const [lookupRefresh, setLookupRefresh] = useState(0);

  const loadQueue = useCallback(async () => {
    setQueueLoading(true);
    try {
      const res = await assignmentsAdminApi.queue();
      setQueue(res.data);
      setQueueError(null);
    } catch (err) {
      setQueueError(describeError(err, 'Could not load the assignment queue'));
    } finally {
      setQueueLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void loadQueue();
  }, [ready, loadQueue]);

  useEffect(() => {
    if (!ready || tab !== 'lookup') return;
    let cancelled = false;
    setLookupLoading(true);
    pricingAdminApi
      .operators(debouncedOperatorQuery.trim() || undefined)
      .then((res) => {
        if (cancelled) return;
        setLookupOperators(res.data.filter((item) => item.id !== VERIQ_MANAGED_OPERATOR_ID));
        setLookupError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLookupError(describeError(err, 'Could not search Property Operators'));
      })
      .finally(() => {
        if (!cancelled) setLookupLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [ready, tab, debouncedOperatorQuery, lookupRefresh]);

  useEffect(() => {
    setLookupOperator((current) => (current ? lookupOperators.find((item) => item.id === current.id) ?? current : current));
  }, [lookupOperators]);

  const lookupOperatorId = lookupOperator?.id ?? null;
  useEffect(() => {
    if (!lookupOperatorId) {
      setLookupListings([]);
      return;
    }
    let cancelled = false;
    setLookupListingsLoading(true);
    pricingAdminApi
      .operatorListings(lookupOperatorId, { targetType: 'property' })
      .then((res) => {
        if (cancelled) return;
        setLookupListings(res.data);
        setLookupListingsError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setLookupListingsError(describeError(err, 'Could not load this Operator’s properties'));
      })
      .finally(() => {
        if (!cancelled) setLookupListingsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [lookupOperatorId, lookupRefresh]);

  const loadHistory = useCallback(async (target: HistoryTarget) => {
    setHistoryLoading(true);
    setHistoryError(null);
    setOperatorView(null);
    setPropertyView(null);
    try {
      if (target.kind === 'operator') {
        const res = await assignmentsAdminApi.operator(target.id);
        setOperatorView(res.data);
      } else {
        const res = await assignmentsAdminApi.property(target.id);
        setPropertyView(res.data);
      }
    } catch (err) {
      setHistoryError(describeError(err, 'Could not load assignment history'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (target: HistoryTarget) => {
    setHistoryTarget(target);
    void loadHistory(target);
  };

  const openAssign = (target: AssignTarget) => {
    setAssignAgentId('');
    setAssignTarget(target);
  };

  const refreshAll = () => {
    void loadQueue();
    void directory.reload();
    setLookupRefresh((value) => value + 1);
  };

  const confirmAssign = async (reason: string) => {
    if (!assignTarget || !assignAgentId) return;
    try {
      const res =
        assignTarget.kind === 'operator'
          ? await assignmentsAdminApi.assignOperator(assignTarget.id, { agentId: assignAgentId, reason })
          : await assignmentsAdminApi.assignProperty(assignTarget.id, { agentId: assignAgentId, reason });
      success(res.message);
      const target = assignTarget;
      setAssignTarget(null);
      refreshAll();
      if (historyTarget && historyTarget.id === target.id) void loadHistory(historyTarget);
    } catch (err) {
      toastError(errorText(err, 'Assignment failed'));
    }
  };

  const confirmClearOverride = async (reason: string) => {
    if (!clearTarget) return;
    try {
      const res = await assignmentsAdminApi.clearPropertyOverride(clearTarget.id, reason);
      success(res.message);
      setClearTarget(null);
      setPropertyView(res.data);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not clear the property-level assignment'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const unassigned = queue?.operators.filter((item) => item.reason === 'unassigned').length ?? 0;
  const suspendedAgent = queue?.operators.filter((item) => item.reason === 'agent_suspended').length ?? 0;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={ClipboardCheck}
        eyebrow="Assignment"
        title="Operator Assignment Queue"
        description="Assign Property Operators to Veriq Agents. An Operator assignment moves that Operator’s properties and Shared Property opportunities to the Agent, except properties with a property-level override. Earnings already recorded stay with the Agent who earned them."
        onRefresh={refreshAll}
        refreshing={queueLoading}
        actions={
          <Link href="/dashboard/admin/veriq-agents" className="btn-outline !px-4 !py-2.5 !text-sm">
            <Users className="h-4 w-4" /> Veriq Agents
          </Link>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard icon={UserX} tone="amber" label="Operators without an Agent" value={queueLoading ? '…' : unassigned} sub="Signed up without a referral code" />
        <StatCard icon={UserCheck} tone="red" label="Operators with a suspended Agent" value={queueLoading ? '…' : suspendedAgent} sub="Reassign to an active Agent" />
        <StatCard icon={Home} tone="blue" label="Properties without an Agent" value={queueLoading ? '…' : queue?.propertiesWithoutAgent.length ?? 0} sub="Cannot be verified or published" />
      </div>

      {directory.error && <ErrorPanel error={{ message: directory.error, details: [] }} onRetry={() => void directory.reload()} />}

      <Tabs<TabId>
        label="Assignment views"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'operators', label: 'Operator queue', count: queue?.operators.length },
          { id: 'properties', label: 'Properties without Agent', count: queue?.propertiesWithoutAgent.length },
          { id: 'lookup', label: 'Reassign any Operator or Property' },
        ]}
      />

      {tab !== 'lookup' && queueError && <ErrorPanel error={queueError} onRetry={() => void loadQueue()} />}

      {tab === 'operators' && !queueError && (
        <Panel title="Operators needing an Agent" description="Oldest first. Suspended-Agent Operators keep their history; reassigning moves future work and future unlock earnings only.">
          {queueLoading && !queue ? (
            <LoadingBlock />
          ) : !queue || queue.operators.length === 0 ? (
            <EmptyState icon={UserCheck} title="Every Operator has an active Veriq Agent" description="New Operators without a referral code will appear here." />
          ) : (
            <TableScroll>
              <table className="w-full min-w-[860px]">
                <thead className="bg-[#ffffff08]">
                  <tr>
                    <th className={th}>Operator</th>
                    <th className={th}>Categories</th>
                    <th className={th}>Identity</th>
                    <th className={th}>Why queued</th>
                    <th className={th}>Properties</th>
                    <th className={th}>Joined</th>
                    <th className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff12]">
                  {queue.operators.map((item) => (
                    <tr key={item.id} className="hover:bg-[#ffffff08]">
                      <td className={td}>
                        <p className="font-semibold">{item.name || 'Unnamed Operator'}</p>
                        <p className="text-xs text-muted-foreground">{[item.email, item.phone].filter(Boolean).join(' · ') || item.id}</p>
                      </td>
                      <td className={td}>
                        <p className="max-w-[180px] text-xs">{item.categories.length ? item.categories.map(categoryLabel).join(', ') : '—'}</p>
                      </td>
                      <td className={td}><StatusBadge status={item.identityStatus} /></td>
                      <td className={td}>
                        {item.reason === 'unassigned' ? (
                          <StatusBadge status="pending" label="Unassigned" />
                        ) : (
                          <div>
                            <StatusBadge status="suspended" label="Agent suspended" />
                            <p className="mt-1 text-[11px] text-muted-foreground">{directory.nameOf(item.assignedAgentId)}</p>
                          </div>
                        )}
                      </td>
                      <td className={td}>
                        <p className="text-xs">{item.properties.total} total</p>
                        <p className="text-[11px] text-muted-foreground">{item.properties.pending} not yet published</p>
                      </td>
                      <td className={td}><span className="whitespace-nowrap text-xs">{dateOnly(item.createdAt)}</span></td>
                      <td className={`${td} text-right`}>
                        <div className="flex justify-end gap-2">
                          <button type="button" onClick={() => openHistory({ kind: 'operator', id: item.id, name: item.name })} className="rounded-lg border border-[#ffffff12] p-2 text-muted-foreground hover:bg-[#ffffff08]" title="Assignment history" aria-label="Assignment history">
                            <History className="h-4 w-4" />
                          </button>
                          <button type="button" onClick={() => openAssign({ kind: 'operator', id: item.id, name: item.name, currentAgentId: item.assignedAgentId })} className="whitespace-nowrap rounded-lg bg-primary px-3 py-2 text-xs font-bold text-foreground hover:bg-[#34d399]">
                            {item.assignedAgentId ? 'Reassign' : 'Assign Agent'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      )}

      {tab === 'properties' && !queueError && (
        <Panel title="Properties without a Veriq Agent" description="Usually these belong to an unassigned Operator; assigning the Operator is preferred. A property-level assignment is an exception that overrides the Operator’s Agent for one Property.">
          {queueLoading && !queue ? (
            <LoadingBlock />
          ) : !queue || queue.propertiesWithoutAgent.length === 0 ? (
            <EmptyState icon={Home} title="Every Operator property has a Veriq Agent" />
          ) : (
            <TableScroll>
              <table className="w-full min-w-[760px]">
                <thead className="bg-[#ffffff08]">
                  <tr>
                    <th className={th}>Property</th>
                    <th className={th}>Category</th>
                    <th className={th}>Publication</th>
                    <th className={th}>Operator</th>
                    <th className={th}>Created</th>
                    <th className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff12]">
                  {queue.propertiesWithoutAgent.map((item) => {
                    const operator = queue.operators.find((row) => row.id === item.operatorId);
                    return (
                      <tr key={item.id} className="hover:bg-[#ffffff08]">
                        <td className={td}>
                          <p className="max-w-[240px] truncate font-semibold">{item.title}</p>
                          <p className="font-mono text-[11px] text-muted-foreground">{item.id}</p>
                        </td>
                        <td className={td}><span className="text-xs">{categoryLabel(item.category)}</span></td>
                        <td className={td}><StatusBadge status={item.publicationStatus} /></td>
                        <td className={td}>
                          <p className="text-xs">{operator?.name ?? item.operatorId ?? '—'}</p>
                          {operator && (
                            <button type="button" onClick={() => openAssign({ kind: 'operator', id: operator.id, name: operator.name, currentAgentId: operator.assignedAgentId })} className="mt-1 text-[11px] font-bold text-primary hover:underline">
                              Assign this Operator instead
                            </button>
                          )}
                        </td>
                        <td className={td}><span className="whitespace-nowrap text-xs">{dateOnly(item.createdAt)}</span></td>
                        <td className={`${td} text-right`}>
                          <div className="flex justify-end gap-2">
                            <button type="button" onClick={() => openHistory({ kind: 'property', id: item.id, name: item.title })} className="rounded-lg border border-[#ffffff12] p-2 text-muted-foreground hover:bg-[#ffffff08]" title="Assignment history" aria-label="Assignment history">
                              <History className="h-4 w-4" />
                            </button>
                            <button type="button" onClick={() => openAssign({ kind: 'property', id: item.id, name: item.title, currentAgentId: null })} className="whitespace-nowrap rounded-lg border border-[#10b98135] px-3 py-2 text-xs font-bold text-primary hover:bg-[#10b98112]">
                              Property-level assign
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </TableScroll>
          )}
        </Panel>
      )}

      {tab === 'lookup' && (
        <div className="grid gap-6 lg:grid-cols-[360px_1fr]">
          <Panel title="Property Operators" description="Search any Operator to reassign or review history.">
            <div className="space-y-3 p-4">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input aria-label="Search Operators" className="input !pl-9" value={operatorQuery} onChange={(event) => setOperatorQuery(event.target.value)} placeholder="Name, email, phone or ID" />
              </div>
              {lookupError ? (
                <ErrorPanel error={lookupError} />
              ) : lookupLoading ? (
                <LoadingBlock />
              ) : lookupOperators.length === 0 ? (
                <EmptyState title="No Operators found" />
              ) : (
                <ul className="max-h-[520px] divide-y divide-[#ffffff12] overflow-y-auto rounded-lg border border-[#ffffff12]">
                  {lookupOperators.map((item) => (
                    <li key={item.id}>
                      <button type="button" onClick={() => setLookupOperator(item)} className={`w-full px-3 py-2.5 text-left ${lookupOperator?.id === item.id ? 'bg-[#10b98112]' : 'hover:bg-[#ffffff08]'}`}>
                        <span className="block truncate text-sm font-semibold text-foreground">{item.name || item.id}</span>
                        <span className="block truncate text-xs text-muted-foreground">{directory.nameOf(item.assignedAgentId)} · {item.listingCount} listing{item.listingCount === 1 ? '' : 's'}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </Panel>

          {lookupOperator ? (
            <Panel
              title={lookupOperator.name || lookupOperator.id}
              description={`Assigned Agent: ${directory.nameOf(lookupOperator.assignedAgentId)}`}
              actions={
                <>
                  <button type="button" onClick={() => openHistory({ kind: 'operator', id: lookupOperator.id, name: lookupOperator.name })} className="btn-outline !px-3 !py-2 !text-xs">
                    <History className="h-3.5 w-3.5" /> History
                  </button>
                  <button type="button" onClick={() => openAssign({ kind: 'operator', id: lookupOperator.id, name: lookupOperator.name, currentAgentId: lookupOperator.assignedAgentId })} className="rounded-lg bg-primary px-3 py-2 text-xs font-bold text-foreground hover:bg-[#34d399]">
                    {lookupOperator.assignedAgentId ? 'Reassign Operator' : 'Assign Operator'}
                  </button>
                </>
              }
            >
              {lookupListingsError ? (
                <div className="p-4"><ErrorPanel error={lookupListingsError} /></div>
              ) : lookupListingsLoading ? (
                <LoadingBlock />
              ) : lookupListings.length === 0 ? (
                <EmptyState icon={Home} title="This Operator has no Properties" />
              ) : (
                <TableScroll>
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-[#ffffff08]">
                      <tr>
                        <th className={th}>Property</th>
                        <th className={th}>Status</th>
                        <th className={th}>Current Agent</th>
                        <th className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff12]">
                      {lookupListings.map((row) => {
                        const differs = row.agentId !== lookupOperator.assignedAgentId;
                        return (
                          <tr key={row.targetId}>
                            <td className={td}>
                              <p className="max-w-[240px] truncate font-semibold">{row.title}</p>
                              <p className="text-[11px] text-muted-foreground">{categoryLabel(row.category)} · <span className="font-mono">{row.targetId}</span></p>
                            </td>
                            <td className={td}><StatusBadge status={row.publicationStatus} /></td>
                            <td className={td}>
                              <p className="text-xs">{row.currentAgent?.name || directory.nameOf(row.agentId)}</p>
                              {differs && <p className="text-[11px] font-semibold text-[#fcd34d]">Differs from Operator’s Agent</p>}
                            </td>
                            <td className={`${td} text-right`}>
                              <div className="flex justify-end gap-2">
                                <button type="button" onClick={() => openHistory({ kind: 'property', id: row.targetId, name: row.title })} className="rounded-lg border border-[#ffffff12] p-2 text-muted-foreground hover:bg-[#ffffff08]" title="History and override" aria-label="History and override">
                                  <History className="h-4 w-4" />
                                </button>
                                <button type="button" onClick={() => openAssign({ kind: 'property', id: row.targetId, name: row.title, currentAgentId: row.agentId })} className="whitespace-nowrap rounded-lg border border-[#10b98135] px-3 py-2 text-xs font-bold text-primary hover:bg-[#10b98112]">
                                  Override Agent
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </TableScroll>
              )}
            </Panel>
          ) : (
            <div className="card flex items-center justify-center p-8">
              <EmptyState icon={Users} title="Select an Operator" description="Choose a Property Operator to reassign it or override the Agent for one of its Properties." />
            </div>
          )}
        </div>
      )}

      <Modal
        isOpen={!!historyTarget}
        onClose={() => setHistoryTarget(null)}
        title={historyTarget ? `${historyTarget.kind === 'operator' ? 'Operator' : 'Property'} assignment history` : ''}
        size="lg"
        className="max-h-[92vh] overflow-y-auto"
      >
        {historyTarget && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-foreground">{historyTarget.name || historyTarget.id}</p>
            {historyError ? (
              <ErrorPanel error={historyError} onRetry={() => void loadHistory(historyTarget)} />
            ) : historyLoading ? (
              <LoadingBlock />
            ) : operatorView ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Current Agent</p><p className="font-semibold text-foreground">{directory.nameOf(operatorView.assignedAgentId)}</p></div>
                  <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Referral code used at signup</p><p className="font-mono font-semibold text-foreground">{operatorView.referralCodeUsed ?? 'None'}</p></div>
                </div>
                <HistoryTable rows={operatorView.history} nameOf={directory.nameOf} />
              </>
            ) : propertyView ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                  <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Current Agent</p><p className="font-semibold text-foreground">{directory.nameOf(propertyView.agentId)}</p></div>
                  <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Operator</p><p className="break-all font-mono font-semibold text-foreground">{propertyView.operatorId ?? 'None'}</p></div>
                  <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Assignment basis</p><p className="font-semibold text-foreground">{propertyView.hasPropertyOverride ? 'Property-level override' : 'Follows Operator'}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => openAssign({ kind: 'property', id: propertyView.propertyId, name: historyTarget.name, currentAgentId: propertyView.agentId })} className="rounded-lg border border-[#10b98135] px-3 py-2 text-xs font-bold text-primary hover:bg-[#10b98112]">
                    Override Agent for this Property
                  </button>
                  {propertyView.hasPropertyOverride && (
                    <button type="button" onClick={() => setClearTarget(historyTarget)} className="rounded-lg border border-[#fb718530] px-3 py-2 text-xs font-bold text-destructive hover:bg-[#fb718510]">
                      Clear override
                    </button>
                  )}
                </div>
                <HistoryTable rows={propertyView.history} nameOf={directory.nameOf} />
              </>
            ) : null}
          </div>
        )}
      </Modal>

      <ReasonDialog
        isOpen={!!assignTarget}
        onClose={() => setAssignTarget(null)}
        onConfirm={confirmAssign}
        title={assignTarget?.kind === 'operator' ? 'Assign Operator to a Veriq Agent' : 'Property-level Agent assignment'}
        confirmLabel={assignTarget?.currentAgentId ? 'Reassign' : 'Assign'}
        canConfirm={!!assignAgentId}
        message={
          assignTarget ? (
            <div className="space-y-2">
              <p><strong className="text-foreground">{assignTarget.name || assignTarget.id}</strong></p>
              <p>Current Agent: {directory.nameOf(assignTarget.currentAgentId)}</p>
              {assignTarget.kind === 'operator' ? (
                <p className="rounded-lg bg-[#ffffff08] p-3 text-xs">All of this Operator’s Properties and Shared Property opportunities move to the selected Agent, except Properties with a property-level override. Future qualifying unlocks earn for the new Agent; recorded earnings stay with the previous Agent.</p>
              ) : (
                <p className="rounded-lg bg-[#fbbf2410] p-3 text-xs text-[#fcd34d]">This overrides the Operator’s Agent for this Property only. Later Operator reassignments will not move it until the override is cleared.</p>
              )}
            </div>
          ) : null
        }
      >
        <div>
          <label className="label text-xs" htmlFor="assign-agent">New Veriq Agent</label>
          <AgentSelect id="assign-agent" value={assignAgentId} onChange={(agentId) => setAssignAgentId(agentId)} excludeAgentId={assignTarget?.currentAgentId} required />
          <p className="mt-1 text-[11px] text-muted-foreground">Suspended Agents cannot receive assignments.</p>
        </div>
      </ReasonDialog>

      <ReasonDialog
        isOpen={!!clearTarget}
        onClose={() => setClearTarget(null)}
        onConfirm={confirmClearOverride}
        title="Clear property-level assignment"
        confirmLabel="Clear override"
        variant="danger"
        message={<p>The Property returns to its Operator’s assigned Veriq Agent. The override stays in the assignment history.</p>}
      />
    </div>
  );
}
