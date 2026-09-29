'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Archive, ExternalLink, Home, Lock, RotateCcw, Search, ShieldAlert, Snowflake, UserCog } from 'lucide-react';
import { pricingAdminApi, verificationAdminApi } from '@/lib/api/admin';
import type {
  OperatorIdentityStatus,
  SelectorOperator,
  VerificationCaseStatus,
  VerificationEvidenceRow,
  VerificationQueueItem,
  VerificationWorkspace,
} from '@/types/admin';
import {
  OPERATOR_IDENTITY_STATUSES,
  PROPERTY_CATEGORIES,
  VERIFICATION_CASE_STATUSES,
  VERIQ_MANAGED_OPERATOR_ID,
} from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useAgentDirectory } from '@/components/admin/useAgentDirectory';
import { useDebounced } from '@/components/admin/useDebounced';
import {
  categoryLabel,
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
  KeyValue,
  LoadingBlock,
  Panel,
  StatCard,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type DialogKind = 'clear' | 'suspend' | 'restore' | 'archive' | 'freeze' | 'transfer' | 'identity' | null;

const CHECKLIST_LABELS: Record<string, string> = {
  authority: 'Authority to list',
  identity: 'Operator identity',
  location: 'Exact location',
  duplicate: 'Duplicate check',
  facts: 'Verified facts',
  media: 'Media',
  intelligence: 'Property intelligence',
  streetLink: 'Street link',
  units: 'Units',
  commercial: 'Commercial terms',
};

export default function AdminVerificationPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const directory = useAgentDirectory();

  const [status, setStatus] = useState<VerificationCaseStatus | ''>('');
  const [cases, setCases] = useState<VerificationQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [escalatedOnly, setEscalatedOnly] = useState(false);

  const [caseId, setCaseId] = useState<string | null>(null);
  const [workspace, setWorkspace] = useState<VerificationWorkspace | null>(null);
  const [workspaceLoading, setWorkspaceLoading] = useState(false);
  const [workspaceError, setWorkspaceError] = useState<DescribedError | null>(null);
  const [evidence, setEvidence] = useState<VerificationEvidenceRow[]>([]);

  const [dialog, setDialog] = useState<DialogKind>(null);
  const [identityStatus, setIdentityStatus] = useState('');
  const [operatorQuery, setOperatorQuery] = useState('');
  const debouncedOperatorQuery = useDebounced(operatorQuery);
  const [operatorResults, setOperatorResults] = useState<SelectorOperator[]>([]);
  const [operatorSearching, setOperatorSearching] = useState(false);
  const [operatorSearchError, setOperatorSearchError] = useState<string | null>(null);
  const [transferOperator, setTransferOperator] = useState<SelectorOperator | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await verificationAdminApi.cases(status || undefined);
      setCases(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load verification cases'));
    } finally {
      setLoading(false);
    }
  }, [status]);

  const loadWorkspace = useCallback(async (id: string) => {
    setWorkspaceLoading(true);
    try {
      const res = await verificationAdminApi.workspace(id);
      setWorkspace(res.data);
      setWorkspaceError(null);
      try {
        const evidenceRes = await verificationAdminApi.propertyEvidence(res.data.property.id);
        setEvidence(evidenceRes.data);
      } catch {
        setEvidence([]);
      }
    } catch (err) {
      setWorkspaceError(describeError(err, 'Could not load the verification case'));
    } finally {
      setWorkspaceLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  // Notifications link straight to a case: /dashboard/admin/verification?case=<id>
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const requested = new URLSearchParams(window.location.search).get('case');
    if (requested) setCaseId(requested);
  }, []);

  useEffect(() => {
    if (ready && caseId) {
      setWorkspace(null);
      setEvidence([]);
      void loadWorkspace(caseId);
    }
  }, [ready, caseId, loadWorkspace]);

  useEffect(() => {
    if (dialog !== 'transfer') return;
    let cancelled = false;
    setOperatorSearching(true);
    pricingAdminApi
      .operators(debouncedOperatorQuery.trim() || undefined)
      .then((res) => {
        if (cancelled) return;
        setOperatorResults(res.data.filter((item) => item.id !== VERIQ_MANAGED_OPERATOR_ID));
        setOperatorSearchError(null);
      })
      .catch((err: unknown) => {
        if (!cancelled) setOperatorSearchError(errorText(err, 'Could not search Property Operators'));
      })
      .finally(() => {
        if (!cancelled) setOperatorSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [dialog, debouncedOperatorQuery]);

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase();
    return cases.filter(
      (item) =>
        (!q ||
          item.property?.title.toLowerCase().includes(q) ||
          item.property?.id.toLowerCase().includes(q) ||
          item.id.toLowerCase().includes(q) ||
          (item.property?.operatorId ?? '').toLowerCase().includes(q)) &&
        (!categoryFilter || item.property?.category === categoryFilter) &&
        (!escalatedOnly || item.escalated),
    );
  }, [cases, search, categoryFilter, escalatedOnly]);

  const afterAction = () => {
    setDialog(null);
    void load();
    if (caseId) void loadWorkspace(caseId);
  };

  const runAction = async (kind: Exclude<DialogKind, null>, reason: string) => {
    if (!workspace) return;
    const propertyId = workspace.property.id;
    try {
      switch (kind) {
        case 'clear': {
          const res = await verificationAdminApi.clearEscalation(workspace.case.id, reason);
          success(res.message);
          break;
        }
        case 'suspend': {
          const res = await verificationAdminApi.suspend(propertyId, reason);
          success(res.message);
          break;
        }
        case 'restore': {
          const res = await verificationAdminApi.restore(propertyId, reason);
          success(res.message);
          break;
        }
        case 'archive': {
          const res = await verificationAdminApi.archive(propertyId, reason);
          success(res.message);
          break;
        }
        case 'freeze': {
          const res = await verificationAdminApi.disputeFreeze(propertyId, !workspace.property.sensitiveChangesFrozen, reason);
          success(res.message);
          break;
        }
        case 'transfer': {
          if (!transferOperator) return;
          const res = await verificationAdminApi.transferOperator(propertyId, transferOperator.id, reason);
          success(res.message);
          setTransferOperator(null);
          setOperatorQuery('');
          break;
        }
        case 'identity': {
          if (!workspace.operator) return;
          const res = await verificationAdminApi.operatorIdentity(workspace.operator.id, identityStatus as OperatorIdentityStatus, reason || undefined);
          success(res.message);
          break;
        }
      }
      afterAction();
    } catch (err) {
      toastError(errorText(err, 'Action failed'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const escalated = cases.filter((item) => item.escalated).length;
  const needsCorrection = cases.filter((item) => item.status === 'needs_correction').length;
  const readyToPublish = cases.filter((item) => item.status === 'ready_to_publish').length;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={ShieldAlert}
        eyebrow="Oversight"
        title="Verification Oversight"
        description="Verification cases across all Veriq Agents (§8.2), with Admin safeguards: clear escalations, emergency suspend or restore, archive, freeze sensitive changes during a dispute, transfer the Operator relationship and decide Operator identity."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard icon={Home} label="Cases in view" value={loading ? '…' : cases.length} sub={status ? humanize(status) : 'Open cases'} />
        <StatCard icon={ShieldAlert} tone={escalated ? 'red' : 'slate'} label="Escalated" value={loading ? '…' : escalated} sub="Publication blocked until cleared" />
        <StatCard icon={RotateCcw} tone="amber" label="Needs correction" value={loading ? '…' : needsCorrection} />
        <StatCard icon={Lock} tone="green" label="Ready to publish" value={loading ? '…' : readyToPublish} />
      </div>

      <div className="card grid grid-cols-1 gap-3 p-4 hover:shadow-card sm:grid-cols-2 lg:grid-cols-4">
        <div className="relative lg:col-span-2">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input aria-label="Search verification cases" className="input !pl-9" value={search} onChange={(event) => setSearch(event.target.value)} placeholder="Property title, Property ID, case ID or Operator ID" />
        </div>
        <select aria-label="Case status" className="input" value={status} onChange={(event) => setStatus(event.target.value as VerificationCaseStatus | '')}>
          <option value="">Open cases</option>
          {VERIFICATION_CASE_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
        </select>
        <select aria-label="Category" className="input" value={categoryFilter} onChange={(event) => setCategoryFilter(event.target.value)}>
          <option value="">All categories</option>
          {PROPERTY_CATEGORIES.map((value) => <option key={value} value={value}>{categoryLabel(value)}</option>)}
        </select>
        <label className="flex items-center gap-2 rounded-lg border border-[#ffffff12] px-3 py-2 text-sm font-medium text-foreground sm:col-span-2 lg:col-span-1">
          <input type="checkbox" checked={escalatedOnly} onChange={(event) => setEscalatedOnly(event.target.checked)} className="h-4 w-4 accent-[#fb7185]" />
          Escalated only
        </label>
      </div>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <Panel title="Verification cases" description="Oldest first. Agents run verification; Admin intervenes on escalations, disputes and emergencies.">
        {loading && cases.length === 0 ? (
          <LoadingBlock />
        ) : visible.length === 0 ? (
          <EmptyState icon={Home} title={cases.length ? 'No cases match these filters' : 'No verification cases in this view'} />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[900px]">
              <thead className="bg-[#ffffff08]">
                <tr>
                  <th className={th}>Property</th>
                  <th className={th}>Case status</th>
                  <th className={th}>Publication</th>
                  <th className={th}>Signals</th>
                  <th className={th}>Opened</th>
                  <th className={th}><span className="sr-only">Review</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff12]">
                {visible.map((item) => (
                  <tr key={item.id} className={item.escalated ? 'bg-[#fb718510]' : 'hover:bg-[#ffffff08]'}>
                    <td className={td}>
                      <p className="max-w-[260px] truncate font-semibold">{item.property?.title ?? 'Property unavailable'}</p>
                      <p className="text-[11px] text-muted-foreground">{item.property ? `${categoryLabel(item.property.category)} · ${[item.property.area, item.property.city].filter(Boolean).join(', ') || 'No area'}` : ''}</p>
                      <p className="break-all font-mono text-[11px] text-muted-foreground">{item.property?.id ?? item.id}</p>
                    </td>
                    <td className={td}><StatusBadge status={item.status} /></td>
                    <td className={td}>{item.property ? <StatusBadge status={item.property.publicationStatus} /> : '—'}</td>
                    <td className={td}>
                      <div className="flex max-w-[220px] flex-wrap gap-1">
                        {item.escalated && <StatusBadge status="failed" label="Escalated" />}
                        {item.duplicateCandidates > 0 && <StatusBadge status={item.duplicateResolved ? 'verified' : 'pending'} label={`${item.duplicateCandidates} duplicate candidate${item.duplicateCandidates === 1 ? '' : 's'}${item.duplicateResolved ? ' resolved' : ''}`} />}
                        {item.isReverification && <StatusBadge status="scheduled" label="Re-verification" />}
                      </div>
                    </td>
                    <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(item.createdAt)}</span></td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setCaseId(item.id)} className="whitespace-nowrap rounded-lg bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-[#ffffff0d]">Review</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Modal isOpen={!!caseId} onClose={() => setCaseId(null)} title="Verification case" size="lg" className="max-h-[92vh] overflow-y-auto">
        {workspaceError ? (
          <ErrorPanel error={workspaceError} onRetry={() => caseId && void loadWorkspace(caseId)} />
        ) : workspaceLoading && !workspace ? (
          <LoadingBlock />
        ) : workspace ? (
          <div className="space-y-5">
            <div>
              <h3 className="font-display text-base font-bold text-foreground">{workspace.property.title}</h3>
              <p className="text-xs text-muted-foreground">{categoryLabel(workspace.property.category)} · <span className="font-mono">{workspace.property.id}</span></p>
              <div className="mt-2 flex flex-wrap gap-2">
                <StatusBadge status={workspace.case.status} />
                <StatusBadge status={workspace.property.publicationStatus} />
                {workspace.case.escalated && <StatusBadge status="failed" label="Escalated" />}
                {workspace.property.sensitiveChangesFrozen && <StatusBadge status="pending" label="Dispute freeze" />}
              </div>
            </div>

            {workspace.case.escalated && (
              <div className="rounded-xl border border-[#fb718530] bg-[#fb718510] p-4 text-sm text-destructive">
                <p className="font-semibold">Escalation open</p>
                <p className="mt-1 text-xs">{workspace.case.escalationReason || 'No reason recorded.'}</p>
              </div>
            )}
            {workspace.property.suspensionReason && (
              <div className="rounded-xl border border-[#fbbf2430] bg-[#fbbf2410] p-4 text-xs text-[#fcd34d]">
                <p className="font-semibold">Suspension / archive reason</p>
                <p className="mt-1">{workspace.property.suspensionReason}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <KeyValue label="Assigned Veriq Agent" value={directory.nameOf(workspace.property.agentId)} />
              <KeyValue label="Verification status" value={humanize(workspace.property.verificationStatus)} />
              <KeyValue label="Property Operator" value={workspace.operator ? workspace.operator.name : 'None'} />
              <KeyValue label="Operator identity" value={workspace.operator ? <StatusBadge status={workspace.operator.identityStatus} /> : '—'} />
              <KeyValue label="Location" value={[workspace.property.area, workspace.property.city, workspace.property.state].filter(Boolean).join(', ') || '—'} />
              <KeyValue label="Last updated" value={dateTime(workspace.property.updatedAt)} />
            </div>

            <section>
              <h4 className="mb-2 text-sm font-bold text-foreground">Verification checklist</h4>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {Object.entries(CHECKLIST_LABELS).map(([key, label]) => {
                  const item = workspace.case.checklist?.[key];
                  return (
                    <div key={key} className="flex items-start justify-between gap-2 rounded-lg border border-[#ffffff12] bg-[#ffffff08] px-3 py-2">
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-foreground">{label}</p>
                        {item?.note && <p className="text-[11px] text-muted-foreground">{item.note}</p>}
                      </div>
                      <StatusBadge status={item?.status ?? 'pending'} />
                    </div>
                  );
                })}
              </div>
            </section>

            <section>
              <h4 className="mb-2 text-sm font-bold text-foreground">Publication readiness</h4>
              {workspace.readiness.ready ? (
                <p className="rounded-lg bg-[#10b98112] p-3 text-xs text-primary">All publication requirements are met.</p>
              ) : (
                <ul className="list-disc space-y-1 rounded-lg bg-[#fbbf2410] p-3 pl-7 text-xs text-[#fcd34d]">
                  {workspace.readiness.blockers.map((blocker) => (
                    <li key={blocker.code}>{blocker.message}</li>
                  ))}
                </ul>
              )}
            </section>

            {workspace.units.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-foreground">Units</h4>
                <TableScroll>
                  <table className="w-full min-w-[420px]">
                    <thead className="bg-[#ffffff08]">
                      <tr>
                        <th className={th}>Unit</th>
                        <th className={th}>Verification</th>
                        <th className={th}>Availability</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff12]">
                      {workspace.units.map((unit) => (
                        <tr key={unit.id}>
                          <td className={td}><span className="text-xs font-semibold">{unit.displayLabel ?? unit.id}</span></td>
                          <td className={td}><StatusBadge status={unit.verificationStatus} /></td>
                          <td className={td}><StatusBadge status={unit.availabilityStatus} /></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              </section>
            )}

            {evidence.length > 0 && (
              <section>
                <h4 className="mb-2 text-sm font-bold text-foreground">Private verification evidence</h4>
                <ul className="space-y-1">
                  {evidence.map((item) => (
                    <li key={item.id} className="text-xs">
                      <a href={item.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 font-semibold text-primary underline">
                        {humanize(item.kind)}{item.fileName ? ` · ${item.fileName}` : ''} <ExternalLink className="h-3 w-3" />
                      </a>
                      <span className="ml-2 text-muted-foreground">{dateTime(item.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            <div className="flex flex-wrap gap-2 border-t border-[#ffffff12] pt-4">
              {workspace.case.escalated && (
                <button type="button" onClick={() => setDialog('clear')} className="rounded-lg border border-[#10b98135] px-3 py-2 text-xs font-bold text-primary hover:bg-[#10b98112]">Clear escalation</button>
              )}
              {workspace.property.publicationStatus === 'suspended' ? (
                <button type="button" onClick={() => setDialog('restore')} className="inline-flex items-center gap-1 rounded-lg border border-[#10b98135] px-3 py-2 text-xs font-bold text-primary hover:bg-[#10b98112]"><RotateCcw className="h-3.5 w-3.5" /> Restore property</button>
              ) : (
                workspace.property.publicationStatus !== 'archived' && (
                  <button type="button" onClick={() => setDialog('suspend')} className="rounded-lg border border-[#fb718530] px-3 py-2 text-xs font-bold text-destructive hover:bg-[#fb718510]">Suspend property</button>
                )
              )}
              {workspace.property.publicationStatus !== 'archived' && (
                <button type="button" onClick={() => setDialog('archive')} className="inline-flex items-center gap-1 rounded-lg border border-[#ffffff12] px-3 py-2 text-xs font-bold text-foreground hover:bg-[#ffffff08]"><Archive className="h-3.5 w-3.5" /> Archive</button>
              )}
              <button type="button" onClick={() => setDialog('freeze')} className="inline-flex items-center gap-1 rounded-lg border border-[#ffffff12] px-3 py-2 text-xs font-bold text-muted-foreground hover:bg-[#ffffff08]">
                <Snowflake className="h-3.5 w-3.5" /> {workspace.property.sensitiveChangesFrozen ? 'Unfreeze sensitive changes' : 'Freeze sensitive changes'}
              </button>
              <button type="button" onClick={() => { setTransferOperator(null); setOperatorQuery(''); setDialog('transfer'); }} className="rounded-lg border border-[#ffffff12] px-3 py-2 text-xs font-bold text-foreground hover:bg-[#ffffff08]">Transfer Operator</button>
              {workspace.operator && (
                <button type="button" onClick={() => { setIdentityStatus(workspace.operator!.identityStatus); setDialog('identity'); }} className="inline-flex items-center gap-1 rounded-lg border border-[#ffffff12] px-3 py-2 text-xs font-bold text-foreground hover:bg-[#ffffff08]"><UserCog className="h-3.5 w-3.5" /> Operator identity</button>
              )}
            </div>
          </div>
        ) : null}
      </Modal>

      <ReasonDialog
        isOpen={dialog === 'clear'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('clear', reason)}
        title="Clear verification escalation"
        confirmLabel="Clear escalation"
        maxLength={1000}
        message={<p>The assigned Veriq Agent can continue; publication is unblocked. The escalation stays in the case history.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'suspend'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('suspend', reason)}
        title="Suspend property"
        confirmLabel="Suspend property"
        variant="danger"
        maxLength={1000}
        message={<p>Emergency unpublish: the property leaves public discovery immediately and the Operator and Agent are notified. Renters with an active unlock keep their paid access period.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'restore'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('restore', reason)}
        title="Restore property"
        confirmLabel="Restore to published"
        maxLength={1000}
        message={<p>The property returns to public discovery. Restoration is refused while any publication blocker other than the checklist remains — the error will list what to fix.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'archive'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('archive', reason)}
        title="Archive property"
        confirmLabel="Archive property"
        variant="danger"
        maxLength={1000}
        acknowledgement="I understand the record and its history are preserved, open verification cases are closed, and the property is no longer published."
        message={<p>Archiving keeps the canonical Property record and all history. Use it when a property should no longer be worked on at all.</p>}
      />

      <ReasonDialog
        isOpen={dialog === 'freeze'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('freeze', reason)}
        title={workspace?.property.sensitiveChangesFrozen ? 'Unfreeze sensitive changes' : 'Freeze sensitive changes'}
        confirmLabel={workspace?.property.sensitiveChangesFrozen ? 'Unfreeze' : 'Freeze'}
        variant={workspace?.property.sensitiveChangesFrozen ? 'primary' : 'danger'}
        maxLength={1000}
        message={
          workspace?.property.sensitiveChangesFrozen ? (
            <p>Sensitive changes (ownership, Operator and other disputed data) can be made again, and publication is no longer blocked by the freeze.</p>
          ) : (
            <p>During an ownership or Operator dispute, freezing blocks sensitive changes and publication for this property until it is lifted.</p>
          )
        }
      />

      <ReasonDialog
        isOpen={dialog === 'transfer'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('transfer', reason)}
        title="Transfer the Operator relationship"
        confirmLabel="Transfer Operator"
        maxLength={1000}
        canConfirm={!!transferOperator}
        acknowledgement="I understand the canonical Property ID and its history are kept, and the Property moves to the new Operator’s assigned Veriq Agent."
        message={<p>The new Operator must already be identity-verified. Ownership and Operator transfers are recorded in the audit history.</p>}
      >
        <div className="space-y-2">
          <label className="label text-xs" htmlFor="transfer-operator">New Property Operator</label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input id="transfer-operator" className="input !pl-9" value={operatorQuery} onChange={(event) => setOperatorQuery(event.target.value)} placeholder="Search by name, email, phone or ID" />
          </div>
          {transferOperator ? (
            <div className="flex items-center justify-between gap-2 rounded-lg border border-[#10b98135] bg-[#10b98112] px-3 py-2 text-xs">
              <span className="font-semibold text-foreground">{transferOperator.name || transferOperator.id}</span>
              <button type="button" onClick={() => setTransferOperator(null)} className="font-bold text-muted-foreground hover:text-foreground">Change</button>
            </div>
          ) : (
            <ul className="max-h-48 divide-y divide-[#ffffff12] overflow-y-auto rounded-lg border border-[#ffffff12]">
              {operatorSearching && <li className="px-3 py-2 text-xs text-muted-foreground">Searching…</li>}
              {operatorSearchError && <li className="px-3 py-2 text-xs text-destructive">{operatorSearchError}</li>}
              {!operatorSearching && !operatorSearchError && operatorResults.length === 0 && <li className="px-3 py-2 text-xs text-muted-foreground">No Operators found.</li>}
              {operatorResults
                .filter((item) => item.id !== workspace?.operator?.id)
                .map((item) => (
                  <li key={item.id}>
                    <button type="button" onClick={() => setTransferOperator(item)} className="w-full px-3 py-2 text-left hover:bg-[#ffffff08]">
                      <span className="block truncate text-xs font-semibold text-foreground">{item.name || item.id}</span>
                      <span className="block truncate text-[11px] text-muted-foreground">{[item.email, item.phone].filter(Boolean).join(' · ') || item.id}</span>
                    </button>
                  </li>
                ))}
            </ul>
          )}
        </div>
      </ReasonDialog>

      <ReasonDialog
        isOpen={dialog === 'identity'}
        onClose={() => setDialog(null)}
        onConfirm={(reason) => runAction('identity', reason)}
        title="Operator identity decision"
        confirmLabel="Save identity status"
        reasonRequired={identityStatus === 'identity_rejected'}
        reasonLabel={identityStatus === 'identity_rejected' ? 'Why identity verification failed (required)' : 'Review note (optional)'}
        maxLength={500}
        message={
          workspace?.operator ? (
            <p>
              <strong className="text-foreground">{workspace.operator.name}</strong> · currently {humanize(workspace.operator.identityStatus)}. Identity verification is separate from property verification.
            </p>
          ) : null
        }
      >
        <Select
          id="identity-status"
          label="Identity status"
          labelClassName="text-xs"
          options={OPERATOR_IDENTITY_STATUSES.map((value) => ({ value, label: humanize(value) }))}
          value={identityStatus}
          onValueChange={setIdentityStatus}
          required
        />
      </ReasonDialog>
    </div>
  );
}
