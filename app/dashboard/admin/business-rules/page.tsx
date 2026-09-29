'use client';

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CalendarClock, History, Lock, Settings2, SlidersHorizontal, XCircle } from 'lucide-react';
import { businessRulesAdminApi } from '@/lib/api/admin';
import type {
  BusinessRuleOverview,
  BusinessRuleSettingView,
  BusinessRuleUnit,
  BusinessRulesPayload,
  PropertyCategory,
} from '@/types/admin';
import { PROPERTY_CATEGORIES } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import {
  categoryLabel,
  dateTime,
  describeError,
  errorText,
  fromLocalInput,
  humanize,
  naira,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  StatusBadge,
  TableScroll,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

const UNIT_LABELS: Record<BusinessRuleUnit, string> = {
  naira: 'Naira (₦)',
  hours: 'Hours',
  percent: 'Percent (%)',
  bytes: 'Bytes',
  pixels: 'Pixels',
  count: 'Count',
  minutes: 'Minutes',
  days: 'Days',
};

function formatRuleValue(value: number | null, unit: BusinessRuleUnit): string {
  if (value === null) return 'Cleared (uses global)';
  const plain = value.toLocaleString('en-NG', { maximumFractionDigits: 2 });
  switch (unit) {
    case 'naira':
      return naira(value);
    case 'percent':
      return `${plain}%`;
    case 'bytes':
      return `${(value / (1024 * 1024)).toLocaleString('en-NG', { maximumFractionDigits: 2 })} MB (${plain} bytes)`;
    case 'pixels':
      return `${plain} px`;
    case 'hours':
      return `${plain} hour${value === 1 ? '' : 's'}`;
    case 'minutes':
      return `${plain} minute${value === 1 ? '' : 's'}`;
    case 'days':
      return `${plain} day${value === 1 ? '' : 's'}`;
    default:
      return plain;
  }
}

function scopeLabel(scope: string): string {
  if (scope === 'global') return 'Global';
  if (scope.startsWith('category:')) return categoryLabel(scope.slice('category:'.length));
  return humanize(scope);
}

const SOURCE_LABELS: Record<BusinessRuleOverview['currentSource'], string> = {
  global: 'Global setting',
  default: 'Launch default',
  category: 'Category setting',
};

interface ChangeState {
  rule: BusinessRuleOverview;
  scope: 'global' | PropertyCategory;
}

export default function AdminBusinessRulesPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const { success, error: toastError } = useToast();

  const [payload, setPayload] = useState<BusinessRulesPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);

  const [change, setChange] = useState<ChangeState | null>(null);
  const [value, setValue] = useState('');
  const [effectiveFrom, setEffectiveFrom] = useState('');
  const [reviewOpen, setReviewOpen] = useState(false);

  const [clearTarget, setClearTarget] = useState<{ rule: BusinessRuleOverview; category: PropertyCategory } | null>(null);
  const [clearEffectiveFrom, setClearEffectiveFrom] = useState('');

  const [historyRule, setHistoryRule] = useState<BusinessRuleOverview | null>(null);
  const [history, setHistory] = useState<BusinessRuleSettingView[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState<DescribedError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await businessRulesAdminApi.overview();
      setPayload(res.data);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load business rules'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  useEffect(() => {
    if (!payload || typeof window === 'undefined' || !window.location.hash) return;
    const element = document.getElementById(window.location.hash.slice(1));
    if (element) window.setTimeout(() => element.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
  }, [payload]);

  const loadHistory = useCallback(async (rule: BusinessRuleOverview) => {
    setHistoryLoading(true);
    try {
      const res = await businessRulesAdminApi.history(rule.key);
      setHistory(res.data);
      setHistoryError(null);
    } catch (err) {
      setHistoryError(describeError(err, 'Could not load rule history'));
    } finally {
      setHistoryLoading(false);
    }
  }, []);

  const openHistory = (rule: BusinessRuleOverview) => {
    setHistoryRule(rule);
    setHistory([]);
    void loadHistory(rule);
  };

  const openChange = (rule: BusinessRuleOverview, scope: ChangeState['scope'] = 'global') => {
    setChange({ rule, scope });
    const current = scope === 'global' ? rule.currentValue : rule.categoryValues?.[scope] ?? rule.currentValue;
    setValue(String(current));
    setEffectiveFrom('');
  };

  const numericValue = Number(value);
  const validation = useMemo(() => {
    if (!change) return null;
    const { rule } = change;
    if (value.trim() === '' || !Number.isFinite(numericValue)) return 'Enter a number.';
    if (numericValue < rule.min || numericValue > rule.max)
      return `Must be between ${formatRuleValue(rule.min, rule.unit)} and ${formatRuleValue(rule.max, rule.unit)}.`;
    if (rule.unit !== 'percent' && !Number.isInteger(numericValue)) return 'Must be a whole number.';
    if (effectiveFrom && new Date(effectiveFrom).getTime() < Date.now() - 60_000)
      return 'The effective time cannot be in the past; history is never rewritten.';
    return null;
  }, [change, value, numericValue, effectiveFrom]);

  const confirmChange = async (reason: string) => {
    if (!change) return;
    try {
      const res = await businessRulesAdminApi.set({
        key: change.rule.key,
        value: numericValue,
        category: change.scope === 'global' ? undefined : change.scope,
        effectiveFrom: fromLocalInput(effectiveFrom),
        reason,
      });
      success(res.message);
      setReviewOpen(false);
      setChange(null);
      void load();
      if (historyRule?.key === change.rule.key) void loadHistory(historyRule);
    } catch (err) {
      toastError(errorText(err, 'Could not save the rule'));
    }
  };

  const confirmClear = async (reason: string) => {
    if (!clearTarget) return;
    try {
      const res = await businessRulesAdminApi.clearCategory({
        key: clearTarget.rule.key,
        category: clearTarget.category,
        effectiveFrom: fromLocalInput(clearEffectiveFrom),
        reason,
      });
      success(res.message);
      setClearTarget(null);
      void load();
    } catch (err) {
      toastError(errorText(err, 'Could not clear the category override'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const clearEffectiveValid = !clearEffectiveFrom || new Date(clearEffectiveFrom).getTime() >= Date.now() - 60_000;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Settings2}
        eyebrow="Configuration"
        title="Business Rules"
        description="Admin-configurable rules (§22). Every change is effective-dated and audited. Values in force at a transaction are recorded with it, so changes never alter past unlocks, refunds or earnings."
        onRefresh={() => void load()}
        refreshing={loading}
      />

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      {loading && !payload ? (
        <LoadingBlock label="Loading business rules…" />
      ) : payload ? (
        <>
          <section className="card p-5 hover:shadow-card">
            <h2 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
              <Lock className="h-4 w-4 text-muted-foreground" /> Fixed policies (not editable in this version)
            </h2>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Property Operator unlock share</p><p className="text-base font-bold text-foreground">{payload.fixedPolicies.operatorUnlockSharePercent}%</p></div>
              <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Listing / submission fee</p><p className="text-base font-bold text-foreground">{naira(payload.fixedPolicies.listingSubmissionFeeNaira)}</p></div>
              <div className="rounded-xl bg-[#ffffff08] p-3 text-xs"><p className="text-muted-foreground">Agent commission basis</p><p className="text-base font-bold text-foreground">{humanize(payload.fixedPolicies.agentCommissionBasis)}</p></div>
            </div>
          </section>

          <div className="space-y-4">
            {payload.rules.map((rule) => (
              <section key={rule.key} id={`rule-${rule.key}`} className="card scroll-mt-24 overflow-hidden hover:shadow-card">
                <div className="flex flex-col gap-4 p-5 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="font-display text-base font-bold text-foreground">{rule.label}</h2>
                      {rule.financial && <StatusBadge status="scheduled" label="Financial · effective-dated" />}
                      {rule.categoryScoped && <StatusBadge status="draft" label="Category overrides allowed" tone="purple" />}
                    </div>
                    <p className="mt-1 text-sm text-muted-foreground">{rule.description}</p>
                    <p className="mt-2 font-mono text-[11px] text-muted-foreground">{rule.key} · {UNIT_LABELS[rule.unit]} · range {formatRuleValue(rule.min, rule.unit)} – {formatRuleValue(rule.max, rule.unit)}</p>
                  </div>
                  <div className="flex flex-col items-start gap-2 lg:items-end">
                    <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">In force now</p>
                    <p className="font-display text-2xl font-black text-foreground">{formatRuleValue(rule.currentValue, rule.unit)}</p>
                    <p className="text-xs text-muted-foreground">{SOURCE_LABELS[rule.currentSource]} · launch default {formatRuleValue(rule.defaultValue, rule.unit)}</p>
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => openHistory(rule)} className="inline-flex items-center gap-1 rounded-lg border border-[#ffffff12] px-3 py-1.5 text-xs font-bold text-foreground hover:bg-[#ffffff08]">
                        <History className="h-3.5 w-3.5" /> History
                      </button>
                      <button type="button" onClick={() => openChange(rule)} className="inline-flex items-center gap-1 rounded-lg bg-primary px-3 py-1.5 text-xs font-bold text-foreground hover:bg-[#34d399]">
                        <SlidersHorizontal className="h-3.5 w-3.5" /> Change global value
                      </button>
                    </div>
                  </div>
                </div>

                {rule.categoryScoped && rule.categoryValues && (
                  <div className="border-t border-[#ffffff12] bg-[#ffffff08] p-5">
                    <p className="mb-3 text-xs font-bold uppercase tracking-wide text-muted-foreground">Category overrides</p>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-5">
                      {PROPERTY_CATEGORIES.map((category) => {
                        const override = rule.categoryValues?.[category] ?? null;
                        return (
                          <div key={category} className="rounded-xl border border-[#ffffff12] bg-card p-3">
                            <p className="text-xs font-semibold text-foreground">{categoryLabel(category)}</p>
                            <p className="mt-1 text-sm font-bold text-foreground">{override === null ? formatRuleValue(rule.currentValue, rule.unit) : formatRuleValue(override, rule.unit)}</p>
                            <p className="text-[11px] text-muted-foreground">{override === null ? 'Uses global value' : 'Category override'}</p>
                            <div className="mt-2 flex flex-wrap gap-1.5">
                              <button type="button" onClick={() => openChange(rule, category)} className="rounded-md border border-[#ffffff12] px-2 py-1 text-[11px] font-bold text-foreground hover:bg-[#ffffff08]">
                                {override === null ? 'Set override' : 'Change'}
                              </button>
                              {override !== null && (
                                <button type="button" onClick={() => { setClearEffectiveFrom(''); setClearTarget({ rule, category }); }} className="inline-flex items-center gap-1 rounded-md border border-[#fb718530] px-2 py-1 text-[11px] font-bold text-destructive hover:bg-[#fb718510]">
                                  <XCircle className="h-3 w-3" /> Clear
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {rule.scheduled.length > 0 && (
                  <div className="border-t border-[#ffffff12] p-5">
                    <p className="mb-2 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-muted-foreground">
                      <CalendarClock className="h-3.5 w-3.5" /> Scheduled future values
                    </p>
                    <TableScroll>
                      <table className="w-full min-w-[560px]">
                        <thead>
                          <tr>
                            <th className={th}>Scope</th>
                            <th className={th}>Value</th>
                            <th className={th}>Effective from</th>
                            <th className={th}>Reason</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#ffffff12]">
                          {rule.scheduled.map((row) => (
                            <tr key={row.id}>
                              <td className={td}><span className="text-xs">{scopeLabel(row.scope)}</span></td>
                              <td className={td}><span className="text-xs font-semibold">{formatRuleValue(row.value, rule.unit)}</span></td>
                              <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(row.effectiveFrom)}</span></td>
                              <td className={td}><span className="text-xs text-muted-foreground">{row.reason || '—'}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </TableScroll>
                    <p className="mt-2 text-[11px] text-muted-foreground">Scheduled rows cannot be deleted. To cancel one, schedule another value at or after the same time.</p>
                  </div>
                )}
              </section>
            ))}
          </div>
        </>
      ) : null}

      {/* Change form */}
      <Modal isOpen={!!change && !reviewOpen} onClose={() => setChange(null)} title="Schedule rule change" size="md" className="max-h-[92vh] overflow-y-auto">
        {change && (
          <form
            className="space-y-4"
            onSubmit={(event) => {
              event.preventDefault();
              if (!validation) setReviewOpen(true);
            }}
          >
            <div>
              <p className="font-semibold text-foreground">{change.rule.label}</p>
              <p className="text-xs text-muted-foreground">Scope: {change.scope === 'global' ? 'Global' : categoryLabel(change.scope)}</p>
            </div>
            <div>
              <label className="label text-xs" htmlFor="rule-value">New value ({UNIT_LABELS[change.rule.unit]})</label>
              <input id="rule-value" type="number" className="input" min={change.rule.min} max={change.rule.max} step={change.rule.unit === 'percent' ? '0.01' : '1'} value={value} onChange={(event) => setValue(event.target.value)} required />
              {value.trim() !== '' && Number.isFinite(numericValue) && <p className="mt-1 text-[11px] text-muted-foreground">{formatRuleValue(numericValue, change.rule.unit)}</p>}
            </div>
            <div>
              <label className="label text-xs" htmlFor="rule-effective">Effective from <span className="font-normal text-muted-foreground">(blank = immediately)</span></label>
              <input id="rule-effective" type="datetime-local" className="input" value={effectiveFrom} onChange={(event) => setEffectiveFrom(event.target.value)} />
            </div>
            {validation && <p className="text-xs font-semibold text-destructive">{validation}</p>}
            <p className="rounded-lg bg-[#ffffff08] p-3 text-xs text-muted-foreground">
              {change.rule.financial
                ? 'Applies to new transactions from the effective time only. Existing unlocks, refund windows and earnings keep the values recorded when they were created.'
                : 'Applies from the effective time. Earlier records keep their recorded values.'}
            </p>
            <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setChange(null)} className="rounded-xl border border-[#ffffff12] px-5 py-2.5 text-sm font-medium text-foreground hover:bg-[#ffffff08]">Cancel</button>
              <button type="submit" disabled={!!validation} className="btn-primary !py-2.5">Review change</button>
            </div>
          </form>
        )}
      </Modal>

      <ReasonDialog
        isOpen={!!change && reviewOpen}
        onClose={() => setReviewOpen(false)}
        onConfirm={confirmChange}
        title="Confirm rule change"
        confirmLabel="Save rule"
        acknowledgement={change?.rule.financial ? 'I understand this change is not retroactive and is permanently recorded in the rule history.' : undefined}
        message={
          change ? (
            <p>
              <strong className="text-foreground">{change.rule.label}</strong> ({change.scope === 'global' ? 'global' : categoryLabel(change.scope)}) becomes{' '}
              <strong className="text-foreground">{formatRuleValue(numericValue, change.rule.unit)}</strong> from{' '}
              {effectiveFrom ? dateTime(new Date(effectiveFrom)) : 'now'}.
            </p>
          ) : null
        }
      />

      <ReasonDialog
        isOpen={!!clearTarget}
        onClose={() => setClearTarget(null)}
        onConfirm={confirmClear}
        title="Clear category override"
        confirmLabel="Clear override"
        variant="danger"
        canConfirm={clearEffectiveValid}
        message={
          clearTarget ? (
            <p>
              {categoryLabel(clearTarget.category)} will use the global <strong className="text-foreground">{clearTarget.rule.label}</strong> ({formatRuleValue(clearTarget.rule.currentValue, clearTarget.rule.unit)} today) from the effective time.
            </p>
          ) : null
        }
      >
        <div>
          <label className="label text-xs" htmlFor="clear-effective">Effective from <span className="font-normal text-muted-foreground">(blank = immediately)</span></label>
          <input id="clear-effective" type="datetime-local" className="input" value={clearEffectiveFrom} onChange={(event) => setClearEffectiveFrom(event.target.value)} />
          {!clearEffectiveValid && <p className="mt-1 text-[11px] text-destructive">The effective time cannot be in the past.</p>}
        </div>
      </ReasonDialog>

      <Modal isOpen={!!historyRule} onClose={() => setHistoryRule(null)} title={historyRule ? `${historyRule.label} history` : ''} size="lg" className="max-h-[92vh] overflow-y-auto">
        {historyRule && (
          historyError ? (
            <ErrorPanel error={historyError} onRetry={() => void loadHistory(historyRule)} />
          ) : historyLoading ? (
            <LoadingBlock />
          ) : history.length === 0 ? (
            <EmptyState title="No changes recorded" description={`This rule uses its launch default of ${formatRuleValue(historyRule.defaultValue, historyRule.unit)}.`} />
          ) : (
            <TableScroll>
              <table className="w-full min-w-[640px]">
                <thead className="bg-[#ffffff08]">
                  <tr>
                    <th className={th}>Scope</th>
                    <th className={th}>Value</th>
                    <th className={th}>Effective from</th>
                    <th className={th}>Recorded</th>
                    <th className={th}>Reason</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#ffffff12]">
                  {history.map((row) => (
                    <tr key={row.id}>
                      <td className={td}><span className="text-xs">{scopeLabel(row.scope)}</span></td>
                      <td className={td}><span className="text-xs font-semibold">{formatRuleValue(row.value, historyRule.unit)}</span></td>
                      <td className={td}>
                        <p className="whitespace-nowrap text-xs">{dateTime(row.effectiveFrom)}</p>
                        {new Date(row.effectiveFrom).getTime() > Date.now() && <StatusBadge status="scheduled" />}
                      </td>
                      <td className={td}><span className="whitespace-nowrap text-xs text-muted-foreground">{dateTime(row.createdAt)}</span></td>
                      <td className={td}><span className="text-xs text-muted-foreground">{row.reason || '—'}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableScroll>
          )
        )}
      </Modal>
    </div>
  );
}
