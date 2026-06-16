'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { RefreshCw, Save, Settings2, Trash2, Users } from 'lucide-react';
import { agentsApi, ApiError, consultationPricingApi } from '@/lib/api';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import type {
  Agent,
  ConsultationPricingRule,
  ConsultationTier,
  UpsertConsultationPricingRuleDto,
} from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';

const TIERS = ['tier_1', 'tier_2', 'tier_3', 'tier_4'] as ConsultationTier[];

const EMPTY_RULE: UpsertConsultationPricingRuleDto = {
  agentId: null,
  tier: 'tier_1' as ConsultationTier,
  label: 'Tier 1',
  minRent: 0,
  maxRent: null,
  fee: 1000,
  platformCommissionPercent: 30,
  isActive: true,
};

function money(value: number | null | undefined) {
  if (value === null || value === undefined) return 'No upper limit';
  return `₦${Number(value).toLocaleString('en-NG')}`;
}

function agentName(agent?: Agent | null) {
  if (!agent?.user) return 'Default pricing';
  const fullName = `${agent.user.firstName ?? ''} ${agent.user.lastName ?? ''}`.trim();
  return agent.businessName || fullName || agent.username || 'Partner';
}

export default function AdminPricingPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [rules, setRules] = useState<ConsultationPricingRule[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [selectedAgentId, setSelectedAgentId] = useState('');
  const [form, setForm] = useState<UpsertConsultationPricingRuleDto>(EMPTY_RULE);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const [pricingRes, agentsRes] = await Promise.all([
        consultationPricingApi.listAdmin(selectedAgentId || undefined),
        agentsApi.list(1, 100),
      ]);
      setRules(pricingRes.data);
      setAgents(agentsRes.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load pricing');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.ADMIN) {
      load();
    }
  }, [authLoading, user?.role, selectedAgentId]); // eslint-disable-line react-hooks/exhaustive-deps

  const grouped = useMemo(() => ({
    defaults: rules.filter((rule) => !rule.agentId),
    partners: rules.filter((rule) => rule.agentId),
  }), [rules]);

  const startEdit = (rule: ConsultationPricingRule) => {
    setForm({
      agentId: rule.agentId,
      tier: rule.tier,
      label: rule.label,
      minRent: Number(rule.minRent),
      maxRent: rule.maxRent === null ? null : Number(rule.maxRent),
      fee: Number(rule.fee),
      platformCommissionPercent:
        rule.platformCommissionPercent === null ? null : Number(rule.platformCommissionPercent),
      isActive: rule.isActive,
    });
  };

  const save = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSaving(true);
    try {
      await consultationPricingApi.upsert({
        ...form,
        agentId: form.agentId || null,
        minRent: Number(form.minRent),
        maxRent: form.maxRent === null || form.maxRent === undefined || String(form.maxRent) === '' ? null : Number(form.maxRent),
        fee: Number(form.fee),
        platformCommissionPercent:
          form.platformCommissionPercent === null ||
          form.platformCommissionPercent === undefined ||
          String(form.platformCommissionPercent) === ''
            ? null
            : Number(form.platformCommissionPercent),
      });
      success('Pricing saved');
      await load();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to save pricing');
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async (rule: ConsultationPricingRule) => {
    if (!window.confirm(`Delete ${rule.label} pricing?`)) return;
    try {
      await consultationPricingApi.delete(rule.id);
      success('Pricing deleted');
      await load();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to delete pricing');
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-veriq-secondary">
            <Settings2 className="h-3.5 w-3.5" />
            Revenue controls
          </p>
          <h1 className="font-display text-2xl font-bold text-navy-900">Consultation Pricing</h1>
          <p className="text-sm text-veriq-muted">Edit default tiers and create partner-specific overrides.</p>
        </div>
        <button type="button" onClick={load} disabled={isLoading} className="btn-secondary !py-2.5 !text-sm">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1fr_420px]">
        <section className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="font-display text-base font-bold text-navy-900">Active pricing rules</h2>
              <select value={selectedAgentId} onChange={(e) => setSelectedAgentId(e.target.value)} className="input max-w-xs !py-2.5">
                <option value="">Default pricing only</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>{agentName(agent)}</option>
                ))}
              </select>
            </div>
          </div>

          {isLoading ? (
            <div className="flex justify-center py-16"><LoadingSpinner size="lg" /></div>
          ) : (
            <div className="divide-y divide-slate-100">
              {[...grouped.defaults, ...grouped.partners].map((rule) => (
                <div key={rule.id} className="grid gap-4 p-5 md:grid-cols-[1fr_auto] md:items-center">
                  <div>
                    <div className="mb-2 flex flex-wrap items-center gap-2">
                      <span className="rounded-full bg-navy-900 px-2 py-0.5 text-[10px] font-bold uppercase text-white">{rule.tier.replace('_', ' ')}</span>
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ${rule.agentId ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                        {rule.agentId ? 'Partner' : 'Default'}
                      </span>
                      {!rule.isActive && <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-500">Inactive</span>}
                    </div>
                    <p className="font-bold text-navy-900">{rule.label}</p>
                    <p className="mt-1 text-sm text-slate-500">
                      {money(Number(rule.minRent))} - {money(rule.maxRent === null ? null : Number(rule.maxRent))}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      Fee {money(Number(rule.fee))} · Veriq share {rule.platformCommissionPercent ?? 'default'}%
                      {rule.agentId ? ` · ${agentName(rule.agent)}` : ''}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <button type="button" onClick={() => startEdit(rule)} className="rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-navy-700 hover:bg-slate-50">
                      Edit
                    </button>
                    {rule.agentId && (
                      <button type="button" onClick={() => remove(rule)} className="rounded-lg border border-red-100 p-2 text-red-500 hover:bg-red-50">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        <form onSubmit={save} className="card space-y-4 p-5">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900">Edit pricing rule</h2>
            <p className="text-xs text-slate-500">Leave partner empty to update the platform default.</p>
          </div>

          <div>
            <label className="label">Partner override</label>
            <select value={form.agentId ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, agentId: e.target.value || null }))} className="input">
              <option value="">Default pricing</option>
              {agents.map((agent) => (
                <option key={agent.id} value={agent.id}>{agentName(agent)}</option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Tier</label>
              <select value={form.tier} onChange={(e) => setForm((prev) => ({ ...prev, tier: e.target.value as ConsultationTier }))} className="input">
                {TIERS.map((tier) => <option key={tier} value={tier}>{tier.replace('_', ' ')}</option>)}
              </select>
            </div>
            <div>
              <label className="label">Label</label>
              <input value={form.label} onChange={(e) => setForm((prev) => ({ ...prev, label: e.target.value }))} className="input" required />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Min rent</label>
              <input type="number" min={0} value={form.minRent} onChange={(e) => setForm((prev) => ({ ...prev, minRent: Number(e.target.value) }))} className="input" />
            </div>
            <div>
              <label className="label">Max rent</label>
              <input type="number" min={0} value={form.maxRent ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, maxRent: e.target.value ? Number(e.target.value) : null }))} className="input" placeholder="No limit" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Consultation fee</label>
              <input type="number" min={0} value={form.fee} onChange={(e) => setForm((prev) => ({ ...prev, fee: Number(e.target.value) }))} className="input" />
            </div>
            <div>
              <label className="label">Veriq share %</label>
              <input type="number" min={0} max={100} value={form.platformCommissionPercent ?? ''} onChange={(e) => setForm((prev) => ({ ...prev, platformCommissionPercent: e.target.value ? Number(e.target.value) : null }))} className="input" placeholder="Default" />
            </div>
          </div>

          <label className="flex items-center gap-2 rounded-xl border border-slate-200 p-3 text-sm font-semibold text-navy-800">
            <input type="checkbox" checked={form.isActive ?? true} onChange={(e) => setForm((prev) => ({ ...prev, isActive: e.target.checked }))} className="h-4 w-4 accent-emerald-600" />
            Active
          </label>

          <button type="submit" disabled={isSaving} className="btn-primary w-full !py-2.5 !text-sm">
            {isSaving ? <LoadingSpinner size="sm" /> : <Save className="h-4 w-4" />}
            Save pricing
          </button>

          <div className="rounded-xl bg-emerald-50 p-4 text-xs leading-relaxed text-emerald-800">
            <Users className="mb-2 h-4 w-4" />
            Partner rules override the default only for listings owned by that partner. Missing partner tiers fall back to the default table.
          </div>
        </form>
      </div>
    </div>
  );
}
