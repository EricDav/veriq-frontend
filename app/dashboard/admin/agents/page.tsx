'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
  Search, RefreshCw, User, ExternalLink,
} from 'lucide-react';
import { agentsApi, usersApi, ApiError } from '@/lib/api';
import type { Agent } from '@/types';
import { AgentTrustTier } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIER_BADGE: Record<AgentTrustTier, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-gold-100 text-gold-700',
  platinum: 'bg-purple-100 text-purple-700',
};

type ActionType = 'approve-l1' | 'approve-l2' | 'deactivate' | 'reactivate';

interface PendingAction {
  agentId: string;
  userId: string;
  type: ActionType;
  label: string;
  message: string;
}

export default function AdminAgentsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [agents, setAgents] = useState<Agent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'verified' | 'inactive'>('all');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  // ── Auth guard ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  // ── Load agents ────────────────────────────────────────────────────────
  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await agentsApi.listAdmin(page, 20, statusFilter);
      setAgents(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      toastError('Failed to load agents');
    } finally {
      setIsLoading(false);
    }
  }, [page, statusFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  // ── Action handlers ────────────────────────────────────────────────────

  const initiateAction = (agent: Agent, type: ActionType) => {
    const agentName = `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`.trim() || 'this agent';
    const labels: Record<ActionType, { label: string; message: string }> = {
      'approve-l1': {
        label: 'Approve Level 1',
        message: `Approve Level 1 (Basic) verification for ${agentName}? This allows them to list properties on the platform.`,
      },
      'approve-l2': {
        label: 'Approve Level 2',
        message: `Approve Level 2 (Professional) verification for ${agentName}? This grants their Professional badge.`,
      },
      deactivate: {
        label: 'Deactivate Agent',
        message: `Deactivate ${agentName}'s account? They will no longer be able to log in or list properties.`,
      },
      reactivate: {
        label: 'Reactivate Agent',
        message: `Reactivate ${agentName}'s account?`,
      },
    };
    setPendingAction({
      agentId: agent.id,
      userId: agent.userId,
      type,
      ...labels[type],
    });
  };

  const executeAction = async () => {
    if (!pendingAction) return;
    setIsActioning(true);
    try {
      const { agentId, userId, type } = pendingAction;
      if (type === 'approve-l1') {
        const res = await agentsApi.approveLevel1(agentId);
        setAgents((prev) => prev.map((a) => (a.id === agentId ? res.data : a)));
        success('Level 1 verification approved!');
      } else if (type === 'approve-l2') {
        const res = await agentsApi.approveLevel2(agentId);
        setAgents((prev) => prev.map((a) => (a.id === agentId ? res.data : a)));
        success('Level 2 verification approved!');
      } else if (type === 'deactivate') {
        await usersApi.deactivate(userId);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId ? { ...a, isActive: false, user: { ...a.user, isActive: false } } : a,
          ),
        );
        success('Agent account deactivated.');
      } else if (type === 'reactivate') {
        await usersApi.activate(userId);
        setAgents((prev) =>
          prev.map((a) =>
            a.id === agentId ? { ...a, isActive: true, user: { ...a.user, isActive: true } } : a,
          ),
        );
        success('Agent account reactivated.');
      }
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setIsActioning(false);
      setPendingAction(null);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  const filteredAgents = search.trim()
    ? agents.filter((a) => {
        const name = `${a.user?.firstName ?? ''} ${a.user?.lastName ?? ''}`.toLowerCase();
        const email = (a.user?.email ?? '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q);
      })
    : agents;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Agent Management</h1>
          <p className="text-sm text-veriq-muted">
            {total} registered agent{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Agents', value: total, cls: 'bg-blue-50 text-blue-600' },
          { label: 'L1 Verified', value: agents.filter((a) => a.isGovIdVerified).length, cls: 'bg-emerald-50 text-emerald-600' },
          { label: 'L2 Professional', value: agents.filter((a) => a.isProfessionallyVerified).length, cls: 'bg-purple-50 text-purple-600' },
          { label: 'Pending Review', value: agents.filter((a) => !a.isGovIdVerified && a.govIdUrl).length, cls: 'bg-amber-50 text-amber-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-black ${s.cls.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-64 rounded-xl border border-slate-200 bg-white px-4 py-2.5">
          <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name or email…"
            className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-navy-700 outline-none focus:border-veriq-secondary"
        >
          <option value="all">All agents</option>
          <option value="pending">Pending review</option>
          <option value="verified">Verified</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" className="text-veriq-secondary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <User className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-navy-900">No agents found</p>
            <p className="text-xs text-veriq-muted mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-veriq-surface">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Agent</th>
                  <th className="px-4 py-4 font-medium">Tier</th>
                  <th className="px-4 py-4 font-medium">Verification</th>
                  <th className="px-4 py-4 font-medium">Docs Submitted</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredAgents.map((agent) => {
                  const name = `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`.trim();
                  const initial = name[0]?.toUpperCase() ?? 'A';
                  const userActive = agent.user?.isActive !== false;
                  const isActive = agent.isActive && userActive;
                  const hasPendingL1 = agent.govIdUrl && !agent.isGovIdVerified;
                  const hasPendingL2 = agent.cacNumber && !agent.isProfessionallyVerified;

                  return (
                    <tr key={agent.id} className="hover:bg-slate-50 transition-colors">
                      {/* Agent */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-veriq-secondary flex items-center justify-center text-white text-sm font-bold flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-navy-900 text-xs truncate">{name || 'Unknown'}</p>
                            <p className="text-[10px] text-slate-400 truncate">{agent.user?.email}</p>
                            {agent.businessName && (
                              <p className="text-[10px] text-slate-400 italic truncate">{agent.businessName}</p>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Tier */}
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] ${TIER_BADGE[agent.trustTier]}`}>
                          {agent.trustTier}
                        </span>
                      </td>

                      {/* Verification level */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            {agent.isGovIdVerified ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : hasPendingL1 ? (
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-slate-300" />
                            )}
                            <span className="text-[10px] text-slate-600">L1 Basic</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {agent.isProfessionallyVerified ? (
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />
                            ) : hasPendingL2 ? (
                              <Clock className="h-3.5 w-3.5 text-amber-500" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-slate-300" />
                            )}
                            <span className="text-[10px] text-slate-600">L2 Professional</span>
                          </div>
                        </div>
                      </td>

                      {/* Docs */}
                      <td className="px-4 py-4">
                        <div className="space-y-1">
                          {agent.govIdUrl ? (
                            <a
                              href={agent.govIdUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> ID Doc
                            </a>
                          ) : (
                            <span className="text-[10px] text-slate-400">No L1 docs</span>
                          )}
                          {agent.selfieUrl ? (
                            <a
                              href={agent.selfieUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Selfie
                            </a>
                          ) : null}
                          {agent.cacDocumentUrl ? (
                            <a
                              href={agent.cacDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-blue-600 hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> CAC Doc
                            </a>
                          ) : null}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {isActive ? (
                          <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                            <CheckCircle className="h-2.5 w-2.5" /> Active
                          </span>
                        ) : (
                          <span className="badge bg-red-100 text-red-600 text-[10px]">
                            <XCircle className="h-2.5 w-2.5" /> Inactive
                          </span>
                        )}
                        {hasPendingL1 && !agent.isGovIdVerified && (
                          <span className="badge bg-amber-100 text-amber-700 text-[10px] mt-1">
                            <Clock className="h-2.5 w-2.5" /> L1 Pending
                          </span>
                        )}
                        {hasPendingL2 && !agent.isProfessionallyVerified && (
                          <span className="badge bg-blue-100 text-blue-700 text-[10px] mt-1">
                            <Clock className="h-2.5 w-2.5" /> L2 Pending
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 items-end">
                          <Link
                            href={`/dashboard/admin/properties?agentId=${agent.id}&agentName=${encodeURIComponent(name || 'Agent')}`}
                            className="text-[10px] font-bold text-navy-700 hover:text-veriq-secondary hover:underline"
                          >
                            View listings
                          </Link>
                          {hasPendingL1 && !agent.isGovIdVerified && (
                            <button
                              onClick={() => initiateAction(agent, 'approve-l1')}
                              className="rounded-lg bg-emerald-600 text-white px-3 py-1.5 text-[10px] font-bold hover:bg-emerald-700 transition-colors"
                            >
                              Approve identity
                            </button>
                          )}
                          {hasPendingL2 && !agent.isProfessionallyVerified && agent.isGovIdVerified && (
                            <button
                              onClick={() => initiateAction(agent, 'approve-l2')}
                              className="rounded-lg bg-purple-600 text-white px-3 py-1.5 text-[10px] font-bold hover:bg-purple-700 transition-colors"
                            >
                              Approve professional
                            </button>
                          )}
                          {agent.isActive && userActive ? (
                            <button
                              onClick={() => initiateAction(agent, 'deactivate')}
                              className="text-[10px] font-bold text-red-500 hover:underline"
                            >
                              Deactivate
                            </button>
                          ) : !userActive ? (
                            <button
                              onClick={() => initiateAction(agent, 'reactivate')}
                              className="text-[10px] font-bold text-emerald-600 hover:underline"
                            >
                              Reactivate
                            </button>
                          ) : null}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirm dialog */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={executeAction}
        title={pendingAction?.label ?? 'Confirm'}
        message={pendingAction?.message ?? ''}
        confirmLabel={pendingAction?.label}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        isLoading={isActioning}
      />
    </div>
  );
}
