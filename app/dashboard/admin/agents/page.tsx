'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, ChevronLeft, ChevronRight,
  Search, RefreshCw, User, ExternalLink, Phone, MessageCircle, Mail, UserCog, ArrowRight,
} from 'lucide-react';
import { agentsApi, usersApi, ApiError } from '@/lib/api';
import type { Agent } from '@/types';
import { AgentTrustTier, AgentVerificationLevel } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

const TIER_BADGE: Record<AgentTrustTier, string> = {
  bronze: 'bg-[#ffffff08] text-muted-foreground',
  silver: 'bg-[#ffffff08] text-muted-foreground',
  gold: 'bg-[#10b98112] text-primary',
  platinum: 'bg-[#ffffff08] text-muted-foreground',
};

type ActionType = 'approve-l1' | 'approve-l2' | 'approve-listing' | 'revoke-listing' | 'deactivate' | 'reactivate';

interface PendingAction {
  agentId: string;
  userId: string;
  type: ActionType;
  label: string;
  message: string;
}

function phoneLinks(phone: string | null | undefined) {
  const raw = phone?.trim();
  if (!raw) return null;

  const digits = raw.replace(/\D/g, '');
  if (!digits) return null;

  const internationalDigits = digits.startsWith('0')
    ? `234${digits.slice(1)}`
    : digits;

  return {
    display: raw,
    call: `tel:+${internationalDigits}`,
    whatsapp: `https://wa.me/${internationalDigits}`,
  };
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
      'approve-listing': {
        label: 'Approve to list',
        message: `Allow ${agentName} to list properties before phone and identity verification is complete? This grants listing access only and does not mark the agent as verified.`,
      },
      'revoke-listing': {
        label: 'Revoke listing access',
        message: `Revoke the temporary listing approval for ${agentName}? Existing listings will remain, but they cannot create another listing until verified or approved again.`,
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
      } else if (type === 'approve-listing' || type === 'revoke-listing') {
        const res = await agentsApi.setListingApproval(agentId, type === 'approve-listing');
        setAgents((prev) => prev.map((a) => (a.id === agentId ? res.data : a)));
        success(type === 'approve-listing' ? 'Agent can now list properties.' : 'Temporary listing access revoked.');
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
        const phone = (a.user?.phone ?? '').toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q) || phone.includes(q);
      })
    : agents;

  const hasProfessionalSubmission = (agent: Agent) =>
    Boolean(
      agent.cacNumber ||
      agent.cacDocumentUrl ||
      agent.realEstateAssociation ||
      agent.associationMembershipUrl ||
      agent.landlordAuthorizationUrl ||
      agent.referralAgentId,
    );

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Agent Management</h1>
          <p className="text-sm text-muted-foreground">
            {total} registered agent{total !== 1 ? 's' : ''}
          </p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Veriq Agent account controls */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#10b98135] bg-[#10b98112] p-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <UserCog className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
          <p className="text-sm leading-6 text-primary">
            <strong>Veriq Agent accounts are Admin-created.</strong> Create accounts, issue referral codes, suspend or restore Agents,
            change publishing permission and set per-Agent commission share from Veriq Agents. This page keeps legacy verification document review.
          </p>
        </div>
        <Link href="/dashboard/admin/veriq-agents" className="inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-foreground hover:bg-[#34d399]">
          Open Veriq Agents <ArrowRight className="h-4 w-4" />
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Agents', value: total, cls: 'bg-[#ffffff08] text-muted-foreground' },
          { label: 'L1 Verified', value: agents.filter((a) => a.isGovIdVerified).length, cls: 'bg-[#10b98112] text-primary' },
          { label: 'L2 Professional', value: agents.filter((a) => a.isProfessionallyVerified).length, cls: 'bg-[#ffffff08] text-muted-foreground' },
          { label: 'Pending Review', value: agents.filter((a) => (!a.isGovIdVerified && a.govIdUrl) || (!a.isProfessionallyVerified && hasProfessionalSubmission(a))).length, cls: 'bg-[#fbbf2410] text-[#fcd34d]' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-black ${s.cls.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="flex flex-wrap gap-3 items-center">
        <div className="flex items-center gap-2 flex-1 min-w-64 rounded-xl border border-[#ffffff12] bg-card px-4 py-2.5">
          <Search className="h-4 w-4 text-muted-foreground flex-shrink-0" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search agents by name, email or phone…"
            className="flex-1 text-sm text-foreground placeholder:text-muted-foreground outline-none bg-transparent"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => { setStatusFilter(e.target.value as typeof statusFilter); setPage(1); }}
          className="rounded-xl border border-[#ffffff12] bg-card px-4 py-2.5 text-sm text-foreground outline-none focus:border-primary"
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
            <LoadingSpinner size="lg" className="text-primary" />
          </div>
        ) : filteredAgents.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <User className="h-10 w-10 text-muted-foreground mb-3" />
            <p className="text-sm font-medium text-foreground">No agents found</p>
            <p className="text-xs text-muted-foreground mt-1">Try adjusting your filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-background">
                <tr className="text-left text-xs text-muted-foreground border-b border-[#ffffff12]">
                  <th className="px-6 py-4 font-medium">Agent</th>
                  <th className="px-4 py-4 font-medium">Tier</th>
                  <th className="px-4 py-4 font-medium">Verification</th>
                  <th className="px-4 py-4 font-medium">Docs Submitted</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff12]">
                {filteredAgents.map((agent) => {
                  const name = `${agent.user?.firstName ?? ''} ${agent.user?.lastName ?? ''}`.trim();
                  const initial = name[0]?.toUpperCase() ?? 'A';
                  const userActive = agent.user?.isActive !== false;
                  const isActive = agent.isActive && userActive;
                  const hasPendingL1 = agent.govIdUrl && !agent.isGovIdVerified;
                  const hasPendingL2 = hasProfessionalSubmission(agent) && !agent.isProfessionallyVerified;
                  const contact = phoneLinks(agent.user?.phone);

                  return (
                    <tr key={agent.id} className="hover:bg-[#ffffff08] transition-colors">
                      {/* Agent */}
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-9 w-9 rounded-full bg-primary flex items-center justify-center text-foreground text-sm font-bold flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-foreground text-xs truncate">{name || 'Unknown'}</p>
                            <p className="text-[10px] text-muted-foreground truncate">{agent.user?.email}</p>
                            {contact ? (
                              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                                <span className="text-[10px] font-medium text-muted-foreground">{contact.display}</span>
                                <a
                                  href={contact.call}
                                  className="inline-grid h-6 w-6 place-items-center rounded-md border border-[#ffffff12] text-muted-foreground transition-colors hover:border-primary hover:bg-[#10b98112] hover:text-primary"
                                  title={`Call ${name || 'agent'}`}
                                  aria-label={`Call ${name || 'agent'} on ${contact.display}`}
                                >
                                  <Phone className="h-3 w-3" />
                                </a>
                                <a
                                  href={contact.whatsapp}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-grid h-6 w-6 place-items-center rounded-md border border-[#10b98135] text-primary transition-colors hover:bg-[#10b98112]"
                                  title={`WhatsApp ${name || 'agent'}`}
                                  aria-label={`Message ${name || 'agent'} on WhatsApp`}
                                >
                                  <MessageCircle className="h-3 w-3" />
                                </a>
                              </div>
                            ) : (
                              <p className="mt-1 text-[10px] italic text-muted-foreground">No phone provided</p>
                            )}
                            {agent.businessName && (
                              <p className="text-[10px] text-muted-foreground italic truncate">{agent.businessName}</p>
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
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            ) : hasPendingL1 ? (
                              <Clock className="h-3.5 w-3.5 text-[#fcd34d]" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-[10px] text-muted-foreground">L1 Basic</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            {agent.isProfessionallyVerified ? (
                              <CheckCircle className="h-3.5 w-3.5 text-primary" />
                            ) : hasPendingL2 ? (
                              <Clock className="h-3.5 w-3.5 text-[#fcd34d]" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5 text-muted-foreground" />
                            )}
                            <span className="text-[10px] text-muted-foreground">L2 Professional</span>
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
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> ID Doc
                            </a>
                          ) : (
                            <span className="text-[10px] text-muted-foreground">No L1 docs</span>
                          )}
                          {agent.selfieUrl ? (
                            <a
                              href={agent.selfieUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Selfie
                            </a>
                          ) : null}
                          {agent.cacDocumentUrl ? (
                            <a
                              href={agent.cacDocumentUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> CAC Doc
                            </a>
                          ) : null}
                          {agent.associationMembershipUrl ? (
                            <a
                              href={agent.associationMembershipUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Association Doc
                            </a>
                          ) : null}
                          {agent.landlordAuthorizationUrl ? (
                            <a
                              href={agent.landlordAuthorizationUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1 text-[10px] text-muted-foreground hover:underline"
                            >
                              <ExternalLink className="h-3 w-3" /> Authorization
                            </a>
                          ) : null}
                          {(agent.cacNumber || agent.realEstateAssociation) && (
                            <p className="max-w-[140px] truncate text-[10px] text-muted-foreground">
                              {[agent.cacNumber, agent.realEstateAssociation].filter(Boolean).join(' · ')}
                            </p>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-4">
                        {isActive ? (
                          <span className="badge bg-[#10b98112] text-primary text-[10px]">
                            <CheckCircle className="h-2.5 w-2.5" /> Active
                          </span>
                        ) : (
                          <span className="badge bg-[#fb718510] text-destructive text-[10px]">
                            <XCircle className="h-2.5 w-2.5" /> Inactive
                          </span>
                        )}
                        {hasPendingL1 && !agent.isGovIdVerified && (
                          <span className="badge bg-[#fbbf2410] text-[#fcd34d] text-[10px] mt-1">
                            <Clock className="h-2.5 w-2.5" /> L1 Pending
                          </span>
                        )}
                        {hasPendingL2 && !agent.isProfessionallyVerified && (
                          <span className="badge bg-[#ffffff08] text-muted-foreground text-[10px] mt-1">
                            <Clock className="h-2.5 w-2.5" /> L2 Pending
                          </span>
                        )}
                        {agent.isListingApprovedByAdmin && (
                          <span className="badge mt-1 bg-[#ffffff08] text-[10px] text-muted-foreground">
                            <CheckCircle className="h-2.5 w-2.5" /> Listing override
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="px-4 py-4">
                        <div className="flex flex-col gap-1.5 items-end">
                          <Link href={`/dashboard/admin/communications?directUserId=${agent.userId}&recipient=${encodeURIComponent(name || 'Agent')}`} className="flex items-center gap-1 text-[10px] font-bold text-primary"><Mail className="h-3 w-3" />Send email</Link>
                          <Link
                            href={`/dashboard/admin/properties?agentId=${agent.id}&agentName=${encodeURIComponent(name || 'Agent')}`}
                            className="text-[10px] font-bold text-foreground hover:text-primary hover:underline"
                          >
                            View listings
                          </Link>
                          {hasPendingL1 && !agent.isGovIdVerified && (
                            <button
                              onClick={() => initiateAction(agent, 'approve-l1')}
                              className="rounded-lg bg-primary text-primary-foreground px-3 py-1.5 text-[10px] font-bold hover:bg-[#34d399] transition-colors"
                            >
                              Approve identity
                            </button>
                          )}
                          {hasPendingL2 && !agent.isProfessionallyVerified && agent.isGovIdVerified && (
                            <button
                              onClick={() => initiateAction(agent, 'approve-l2')}
                              className="rounded-lg bg-[#ffffff12] text-foreground px-3 py-1.5 text-[10px] font-bold hover:bg-[#ffffff12] transition-colors"
                            >
                              Approve professional
                            </button>
                          )}
                          {agent.verificationLevel < AgentVerificationLevel.BASIC && (
                            agent.isListingApprovedByAdmin ? (
                              <button
                                onClick={() => initiateAction(agent, 'revoke-listing')}
                                className="text-[10px] font-bold text-[#fcd34d] hover:underline"
                              >
                                Revoke listing access
                              </button>
                            ) : (
                              <button
                                onClick={() => initiateAction(agent, 'approve-listing')}
                                className="rounded-lg bg-[#ffffff12] px-3 py-1.5 text-[10px] font-bold text-foreground transition-colors hover:bg-[#ffffff12]"
                              >
                                Approve to list
                              </button>
                            )
                          )}
                          {agent.isActive && userActive ? (
                            <button
                              onClick={() => initiateAction(agent, 'deactivate')}
                              className="text-[10px] font-bold text-destructive hover:underline"
                            >
                              Deactivate
                            </button>
                          ) : !userActive ? (
                            <button
                              onClick={() => initiateAction(agent, 'reactivate')}
                              className="text-[10px] font-bold text-primary hover:underline"
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
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#ffffff12] disabled:opacity-40"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            className="h-9 w-9 flex items-center justify-center rounded-lg border border-[#ffffff12] disabled:opacity-40"
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
