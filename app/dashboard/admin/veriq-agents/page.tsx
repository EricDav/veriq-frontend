'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  BadgeCheck,
  Ban,
  Copy,
  Percent,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  ShieldOff,
  TrendingUp,
  UserPlus,
} from 'lucide-react';
import { locationsApi } from '@/lib/api';
import { veriqAgentsAdminApi } from '@/lib/api/admin';
import type { AllowedState } from '@/types';
import type {
  AgentCommissionView,
  CreateVeriqAgentInput,
  PageMeta,
  VeriqAgentListItem,
} from '@/types/admin';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useDebounced } from '@/components/admin/useDebounced';
import {
  dateOnly,
  dateTime,
  describeError,
  errorText,
  fromLocalInput,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  Pagination,
  Panel,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type StatusFilter = '' | 'active' | 'suspended';

type AgentAction =
  | { kind: 'suspend'; agent: VeriqAgentListItem }
  | { kind: 'restore'; agent: VeriqAgentListItem }
  | { kind: 'publishing'; agent: VeriqAgentListItem; allowed: boolean };

const EMPTY_FORM: CreateVeriqAgentInput = {
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  password: '',
  state: '',
  generalOperatingArea: '',
};

const PHONE_PATTERN = /^\+?[0-9]{10,15}$/;
const PASSWORD_PATTERN = /(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])/;

function validateCreate(form: CreateVeriqAgentInput): string[] {
  const issues: string[] = [];
  if (!form.firstName.trim()) issues.push('First name is required.');
  if (!form.lastName.trim()) issues.push('Last name is required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) issues.push('Enter a valid email address.');
  if (!PHONE_PATTERN.test(form.phone.trim())) issues.push('Phone must be 10–15 digits, optionally starting with +.');
  if (form.password.length < 8 || form.password.length > 72) issues.push('Password must be 8–72 characters.');
  else if (!PASSWORD_PATTERN.test(form.password)) issues.push('Password needs upper and lower case letters, a number and a symbol.');
  if (!form.state) issues.push('Select the Agent’s state of operation.');
  return issues;
}

export default function AdminVeriqAgentsPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const { success, error: toastError } = useToast();

  const [agents, setAgents] = useState<VeriqAgentListItem[]>([]);
  const [meta, setMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 25, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('');
  const [query, setQuery] = useState('');
  const debouncedQuery = useDebounced(query);
  const [page, setPage] = useState(1);

  const [createOpen, setCreateOpen] = useState(false);
  const [form, setForm] = useState<CreateVeriqAgentInput>(EMPTY_FORM);
  const [states, setStates] = useState<AllowedState[]>([]);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<DescribedError | null>(null);
  const [createdAgent, setCreatedAgent] = useState<{ name: string; referralCode: string | null } | null>(null);

  const [action, setAction] = useState<AgentAction | null>(null);

  const [commissionAgent, setCommissionAgent] = useState<VeriqAgentListItem | null>(null);
  const [commission, setCommission] = useState<AgentCommissionView | null>(null);
  const [commissionLoading, setCommissionLoading] = useState(false);
  const [commissionError, setCommissionError] = useState<DescribedError | null>(null);
  const [commissionMode, setCommissionMode] = useState<'override' | 'default'>('override');
  const [sharePercent, setSharePercent] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [commissionConfirmOpen, setCommissionConfirmOpen] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await veriqAgentsAdminApi.list({
        status: statusFilter || undefined,
        q: debouncedQuery.trim() || undefined,
        page,
        limit: 25,
      });
      setAgents(res.data);
      setMeta(res.meta);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load Veriq Agents'));
    } finally {
      setLoading(false);
    }
  }, [statusFilter, debouncedQuery, page]);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    setPage(1);
  }, [statusFilter, debouncedQuery]);

  useEffect(() => {
    if (!createOpen || states.length) return;
    locationsApi
      .activeStates()
      .then((res) => setStates(res.data))
      .catch((err: unknown) => setCreateError(describeError(err, 'Could not load active states')));
  }, [createOpen, states.length]);

  const openCreate = () => {
    setForm(EMPTY_FORM);
    setCreateError(null);
    setCreatedAgent(null);
    setCreateOpen(true);
  };

  const submitCreate = async (event: React.FormEvent) => {
    event.preventDefault();
    const issues = validateCreate(form);
    if (issues.length) {
      setCreateError({ message: 'Fix the highlighted details before creating the account.', details: issues });
      return;
    }
    setCreating(true);
    setCreateError(null);
    try {
      const res = await veriqAgentsAdminApi.create({
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        password: form.password,
        state: form.state,
        generalOperatingArea: form.generalOperatingArea?.trim() || undefined,
      });
      success(res.message);
      setCreatedAgent({ name: res.data.name, referralCode: res.data.referralCode });
      setForm(EMPTY_FORM);
      void load();
    } catch (err) {
      setCreateError(describeError(err, 'Could not create the Veriq Agent account'));
    } finally {
      setCreating(false);
    }
  };

  const confirmAction = async (reason: string) => {
    if (!action) return;
    try {
      const res =
        action.kind === 'suspend'
          ? await veriqAgentsAdminApi.suspend(action.agent.id, reason)
          : action.kind === 'restore'
            ? await veriqAgentsAdminApi.restore(action.agent.id, reason)
            : await veriqAgentsAdminApi.setPublishingPermission(action.agent.id, action.allowed, reason);
      success(res.message);
      setAction(null);
      void load();
    } catch (err) {
      toastError(errorText(err, 'Action failed'));
    }
  };

  const loadCommission = useCallback(async (agentId: string) => {
    setCommissionLoading(true);
    try {
      const res = await veriqAgentsAdminApi.commission(agentId);
      setCommission(res.data);
      setCommissionError(null);
    } catch (err) {
      setCommissionError(describeError(err, 'Could not load the commission share'));
    } finally {
      setCommissionLoading(false);
    }
  }, []);

  const openCommission = (agent: VeriqAgentListItem) => {
    setCommissionAgent(agent);
    setCommission(null);
    setCommissionMode('override');
    setSharePercent('');
    setEffectiveFrom('');
    void loadCommission(agent.id);
  };

  const shareValue = Number(sharePercent);
  const shareValid =
    commissionMode === 'default' ||
    (sharePercent.trim() !== '' && Number.isFinite(shareValue) && shareValue >= 0 && shareValue <= 100 && Math.abs(Math.round(shareValue * 100) - shareValue * 100) < 1e-6);
  const effectiveValid = !effectiveFrom || new Date(effectiveFrom).getTime() >= Date.now() - 60_000;

  const confirmCommission = async (reason: string) => {
    if (!commissionAgent) return;
    try {
      const res = await veriqAgentsAdminApi.setCommission(commissionAgent.id, {
        sharePercent: commissionMode === 'default' ? null : shareValue,
        effectiveFrom: fromLocalInput(effectiveFrom),
        reason,
      });
      success(res.message);
      setCommissionConfirmOpen(false);
      setSharePercent('');
      setEffectiveFrom('');
      void loadCommission(commissionAgent.id);
    } catch (err) {
      toastError(errorText(err, 'Could not save the commission share'));
    }
  };

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code);
      success(`Referral code ${code} copied`);
    } catch {
      toastError('Copy failed; select the code and copy it manually');
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={ShieldCheck}
        eyebrow="Veriq Agents"
        title="Veriq Agent Management"
        description="Agents cannot self-register. Create accounts, share referral codes with Property Operators, suspend or restore Agents, control publishing permission independently of the account, and set per-Agent commission share."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <button type="button" onClick={openCreate} className="btn-primary !px-4 !py-2.5 !text-sm">
            <UserPlus className="h-4 w-4" /> Create Veriq Agent
          </button>
        }
      />

      <div className="card flex flex-col gap-3 p-4 hover:shadow-card sm:flex-row sm:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input aria-label="Search Veriq Agents" className="input !pl-9" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name, email or referral code" />
        </div>
        <select aria-label="Status" className="input sm:!w-48" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as StatusFilter)}>
          <option value="">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
      </div>

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      <Panel title="Veriq Agents" description="Operator counts are Operator-level assignments; property counts include property-level overrides.">
        {loading && agents.length === 0 ? (
          <LoadingBlock />
        ) : agents.length === 0 ? (
          <EmptyState icon={UserPlus} title={query || statusFilter ? 'No Agents match these filters' : 'No Veriq Agents yet'} description={query || statusFilter ? undefined : 'Create the first Veriq Agent account to start assigning Operators.'} />
        ) : (
          <>
            <TableScroll>
              <table className="w-full min-w-[1080px]">
                <thead className="bg-slate-50">
                  <tr>
                    <th className={th}>Agent</th>
                    <th className={th}>Referral code</th>
                    <th className={th}>Account</th>
                    <th className={th}>Publishing</th>
                    <th className={th}>Portfolio</th>
                    <th className={th}>Operating area</th>
                    <th className={th}>Payout details</th>
                    <th className={th}><span className="sr-only">Actions</span></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {agents.map((agent) => (
                    <tr key={agent.id} className="hover:bg-slate-50/60">
                      <td className={td}>
                        <p className="font-semibold">{agent.name || 'Unnamed Agent'}</p>
                        <p className="text-xs text-slate-500">{agent.email ?? '—'}</p>
                        <p className="text-xs text-slate-500">{agent.phone ?? ''}{agent.username ? ` · @${agent.username}` : ''}</p>
                        <p className="text-[11px] text-slate-400">Created {dateOnly(agent.createdAt)}</p>
                      </td>
                      <td className={td}>
                        {agent.referralCode ? (
                          <button type="button" onClick={() => void copyCode(agent.referralCode!)} className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-slate-50 px-2 py-1 font-mono text-xs font-bold text-navy-900 hover:bg-white" title="Copy referral code">
                            {agent.referralCode} <Copy className="h-3 w-3 text-slate-400" />
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">Pending</span>
                        )}
                      </td>
                      <td className={td}>
                        <StatusBadge status={agent.isActive ? 'active' : 'suspended'} />
                        {agent.suspendedAt && <p className="mt-1 whitespace-nowrap text-[11px] text-slate-500">Since {dateOnly(agent.suspendedAt)}</p>}
                      </td>
                      <td className={td}>
                        <StatusBadge status={agent.publishingPermission ? 'active' : 'disabled'} label={agent.publishingPermission ? 'Allowed' : 'Revoked'} />
                        {agent.publishingPermissionChangedAt && <p className="mt-1 whitespace-nowrap text-[11px] text-slate-500">Changed {dateOnly(agent.publishingPermissionChangedAt)}</p>}
                      </td>
                      <td className={td}>
                        <p className="whitespace-nowrap text-xs">{agent.operators} Operator{agent.operators === 1 ? '' : 's'}</p>
                        <p className="whitespace-nowrap text-[11px] text-slate-500">{agent.properties.total} properties · {agent.properties.published} published</p>
                      </td>
                      <td className={td}>
                        <p className="text-xs">{agent.stateOfOperation ?? '—'}</p>
                        {agent.operatingLocations.length > 0 && <p className="max-w-[160px] text-[11px] text-slate-500">{agent.operatingLocations.join(', ')}</p>}
                      </td>
                      <td className={td}>
                        <StatusBadge status={agent.bankDetailsComplete ? 'verified' : 'pending'} label={agent.bankDetailsComplete ? 'Complete' : 'Missing'} />
                      </td>
                      <td className={`${td} text-right`}>
                        <div className="flex flex-wrap justify-end gap-1.5">
                          <button type="button" onClick={() => openCommission(agent)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50">
                            <Percent className="h-3.5 w-3.5" /> Commission
                          </button>
                          <Link href={`/dashboard/admin/quality?agentId=${encodeURIComponent(agent.id)}`} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50">
                            <TrendingUp className="h-3.5 w-3.5" /> Quality
                          </Link>
                          {agent.publishingPermission ? (
                            <button type="button" onClick={() => setAction({ kind: 'publishing', agent, allowed: false })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-amber-200 px-2.5 py-1.5 text-xs font-bold text-amber-700 hover:bg-amber-50">
                              <ShieldOff className="h-3.5 w-3.5" /> Revoke publishing
                            </button>
                          ) : (
                            <button type="button" disabled={!agent.isActive} title={agent.isActive ? undefined : 'Restore the account first'} onClick={() => setAction({ kind: 'publishing', agent, allowed: true })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50 disabled:opacity-40">
                              <BadgeCheck className="h-3.5 w-3.5" /> Grant publishing
                            </button>
                          )}
                          {agent.isActive ? (
                            <button type="button" onClick={() => setAction({ kind: 'suspend', agent })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">
                              <Ban className="h-3.5 w-3.5" /> Suspend
                            </button>
                          ) : (
                            <button type="button" onClick={() => setAction({ kind: 'restore', agent })} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-emerald-200 px-2.5 py-1.5 text-xs font-bold text-emerald-700 hover:bg-emerald-50">
                              <RotateCcw className="h-3.5 w-3.5" /> Restore
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onChange={setPage} noun="Agents" />
          </>
        )}
      </Panel>

      {/* Create */}
      <Modal isOpen={createOpen} onClose={() => !creating && setCreateOpen(false)} title="Create Veriq Agent account" size="lg" className="max-h-[92vh] overflow-y-auto">
        {createdAgent ? (
          <div className="space-y-4">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm text-emerald-900">
              <p className="font-semibold">{createdAgent.name || 'The Agent'} can now sign in with the email and initial password you set.</p>
              {createdAgent.referralCode && (
                <p className="mt-2">
                  Referral code: <span className="font-mono font-bold">{createdAgent.referralCode}</span>. Operators who sign up with it are assigned to this Agent automatically.
                </p>
              )}
              <p className="mt-2 text-xs">Share the initial password privately; the Agent should change it after first sign-in.</p>
            </div>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50">Close</button>
              <button type="button" onClick={() => setCreatedAgent(null)} className="btn-primary !py-2.5"><Plus className="h-4 w-4" /> Create another</button>
            </div>
          </div>
        ) : (
          <form onSubmit={submitCreate} className="space-y-4" noValidate>
            {createError && <ErrorPanel error={createError} />}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <div>
                <label className="label text-xs" htmlFor="agent-first">First name</label>
                <input id="agent-first" className="input" maxLength={80} value={form.firstName} onChange={(e) => setForm((f) => ({ ...f, firstName: e.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs" htmlFor="agent-last">Last name</label>
                <input id="agent-last" className="input" maxLength={80} value={form.lastName} onChange={(e) => setForm((f) => ({ ...f, lastName: e.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs" htmlFor="agent-email">Email</label>
                <input id="agent-email" type="email" autoComplete="off" className="input" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs" htmlFor="agent-phone">Phone</label>
                <input id="agent-phone" type="tel" className="input" placeholder="+2348012345678" value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} required />
              </div>
              <div>
                <label className="label text-xs" htmlFor="agent-state">State of operation</label>
                <select id="agent-state" className="input" value={form.state} onChange={(e) => setForm((f) => ({ ...f, state: e.target.value }))} required>
                  <option value="">{states.length ? 'Select state' : 'Loading active states…'}</option>
                  {states.map((state) => (
                    <option key={state.id} value={state.name}>{state.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="label text-xs" htmlFor="agent-area">General operating area <span className="font-normal text-slate-400">(optional)</span></label>
                <input id="agent-area" className="input" maxLength={200} value={form.generalOperatingArea ?? ''} onChange={(e) => setForm((f) => ({ ...f, generalOperatingArea: e.target.value }))} />
              </div>
              <div className="sm:col-span-2">
                <label className="label text-xs" htmlFor="agent-password">Initial password</label>
                <input id="agent-password" type="password" autoComplete="new-password" className="input" maxLength={72} value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} required />
                <p className="mt-1 text-[11px] text-slate-400">8–72 characters with upper and lower case letters, a number and a symbol.</p>
              </div>
            </div>
            <p className="rounded-lg bg-slate-50 p-3 text-xs text-slate-600">
              A unique referral code is issued automatically. The account starts active with publishing permission and the default commission share.
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setCreateOpen(false)} disabled={creating} className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50 disabled:opacity-50">Cancel</button>
              <button type="submit" disabled={creating} className="btn-primary !py-2.5">
                {creating ? <LoadingSpinner size="sm" /> : <UserPlus className="h-4 w-4" />} Create account
              </button>
            </div>
          </form>
        )}
      </Modal>

      {/* Suspend / restore / publishing */}
      <ReasonDialog
        isOpen={!!action}
        onClose={() => setAction(null)}
        onConfirm={confirmAction}
        variant={action?.kind === 'suspend' || (action?.kind === 'publishing' && !action.allowed) ? 'danger' : 'primary'}
        title={
          action?.kind === 'suspend'
            ? 'Suspend Veriq Agent'
            : action?.kind === 'restore'
              ? 'Restore Veriq Agent'
              : action?.kind === 'publishing' && action.allowed
                ? 'Grant publishing permission'
                : 'Revoke publishing permission'
        }
        confirmLabel={
          action?.kind === 'suspend' ? 'Suspend Agent' : action?.kind === 'restore' ? 'Restore Agent' : action?.kind === 'publishing' && action.allowed ? 'Grant permission' : 'Revoke permission'
        }
        message={
          action ? (
            <div className="space-y-2">
              <p><strong className="text-navy-900">{action.agent.name || action.agent.email}</strong></p>
              {action.kind === 'suspend' && (
                <p>Suspension blocks Agent work, new assignments and publishing. Earnings already recorded remain valid under the withdrawal rules. The Agent’s {action.agent.operators} Operator{action.agent.operators === 1 ? '' : 's'} will appear in the assignment queue for reassignment.</p>
              )}
              {action.kind === 'restore' && <p>The account becomes active again. Publishing permission stays revoked until you grant it separately.</p>}
              {action.kind === 'publishing' && action.allowed && <p>The Agent can publish verified listings again.</p>}
              {action.kind === 'publishing' && !action.allowed && <p>The Agent keeps the account and portfolio but can no longer publish listings.</p>}
            </div>
          ) : null
        }
      />

      {/* Commission */}
      <Modal isOpen={!!commissionAgent} onClose={() => setCommissionAgent(null)} title="Per-Agent commission share" size="lg" className="max-h-[92vh] overflow-y-auto">
        {commissionAgent && (
          <div className="space-y-4">
            <p className="text-sm font-semibold text-navy-900">{commissionAgent.name || commissionAgent.email}</p>
            {commissionError ? (
              <ErrorPanel error={commissionError} onRetry={() => void loadCommission(commissionAgent.id)} />
            ) : commissionLoading && !commission ? (
              <LoadingBlock />
            ) : commission ? (
              <>
                <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                  <div className="rounded-xl bg-emerald-50 p-3">
                    <p className="text-[11px] font-semibold uppercase text-emerald-700">Share in force now</p>
                    <p className="font-display text-2xl font-black text-navy-900">{commission.currentSharePercent}%</p>
                    <p className="text-xs text-slate-600">{commission.source === 'agent_override' ? 'Per-Agent override' : 'Default Agent share (Business Rules)'}</p>
                  </div>
                  <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-600">
                    Share of the gross configured unlock price. Changes apply only to unlocks at or after the effective time; recorded earnings are never recalculated.
                  </div>
                </div>

                <div className="space-y-3 rounded-xl border border-slate-200 p-4">
                  <div className="flex flex-wrap gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="commission-mode" checked={commissionMode === 'override'} onChange={() => setCommissionMode('override')} className="accent-emerald-600" />
                      Set an override
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input type="radio" name="commission-mode" checked={commissionMode === 'default'} onChange={() => setCommissionMode('default')} className="accent-emerald-600" />
                      Return to default share
                    </label>
                  </div>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    {commissionMode === 'override' && (
                      <div>
                        <label className="label text-xs" htmlFor="share-percent">Agent share (%)</label>
                        <input id="share-percent" type="number" min={0} max={100} step="0.01" className="input" value={sharePercent} onChange={(e) => setSharePercent(e.target.value)} />
                        {!shareValid && sharePercent !== '' && <p className="mt-1 text-[11px] text-red-600">Enter 0–100 with at most two decimals.</p>}
                      </div>
                    )}
                    <div>
                      <label className="label text-xs" htmlFor="share-effective">Effective from <span className="font-normal text-slate-400">(blank = now)</span></label>
                      <input id="share-effective" type="datetime-local" className="input" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
                      {!effectiveValid && <p className="mt-1 text-[11px] text-red-600">The effective time cannot be in the past.</p>}
                    </div>
                  </div>
                  <button type="button" disabled={!shareValid || !effectiveValid || (commissionMode === 'override' && sharePercent === '')} onClick={() => setCommissionConfirmOpen(true)} className="btn-primary !py-2.5 !text-sm">
                    Review change
                  </button>
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-bold text-navy-900">Override history</h3>
                  {commission.history.length === 0 ? (
                    <EmptyState title="No per-Agent overrides" description="This Agent has always used the default share." />
                  ) : (
                    <TableScroll>
                      <table className="w-full min-w-[520px]">
                        <thead className="bg-slate-50">
                          <tr>
                            <th className={th}>Share</th>
                            <th className={th}>Effective from</th>
                            <th className={th}>Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {commission.history.map((row) => (
                            <tr key={row.id}>
                              <td className={td}>{row.sharePercent === null ? 'Default share' : `${row.sharePercent}%`}</td>
                              <td className={td}>
                                <p className="whitespace-nowrap text-xs">{dateTime(row.effectiveFrom)}</p>
                                {new Date(row.effectiveFrom).getTime() > Date.now() && <StatusBadge status="scheduled" />}
                              </td>
                              <td className={td}><p className="text-xs text-slate-600">{row.reason || '—'}</p></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                  )}
                </div>
              </>
            ) : null}
          </div>
        )}
      </Modal>

      <ReasonDialog
        isOpen={commissionConfirmOpen}
        onClose={() => setCommissionConfirmOpen(false)}
        onConfirm={confirmCommission}
        title="Confirm commission change"
        confirmLabel="Save commission"
        acknowledgement="I understand this applies only to unlocks from the effective time and does not change earnings already recorded."
        message={
          <p>
            {commissionAgent?.name || 'This Agent'} will earn{' '}
            <strong className="text-navy-900">{commissionMode === 'default' ? 'the default Agent share' : `${shareValue}%`}</strong>{' '}
            of the gross configured unlock price from {effectiveFrom ? dateTime(new Date(effectiveFrom)) : 'now'}.
          </p>
        }
      />
    </div>
  );
}
