'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { ClipboardList, Gauge, Star, TrendingUp } from 'lucide-react';
import { qualityAdminApi } from '@/lib/api/admin';
import type {
  AgentQualityDetail,
  AgentQualityRow,
  OutcomeSummaryRow,
  QualityAuditOutcome,
  QualityComponentKey,
  QualityListMeta,
} from '@/types/admin';
import { QUALITY_AUDIT_OUTCOMES, QUALITY_COMPONENT_KEYS } from '@/types/admin';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { dateTime, describeError, errorText, humanize, type DescribedError } from '@/components/admin/format';
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

const COMPONENT_LABELS: Record<QualityComponentKey, string> = {
  userRatings: 'User ratings',
  auditOutcomes: 'Audit outcomes',
  refundAccuracy: 'Refund accuracy',
  availabilityFreshness: 'Availability freshness',
  mediaQuality: 'Media quality',
  correctionStability: 'Correction stability',
};

const OUTCOME_LABELS: Record<string, string> = {
  took: 'Took the property',
  did_not_take: 'Did not take',
  still_considering: 'Still considering',
};

function scoreTone(score: number | null): 'green' | 'amber' | 'red' | 'slate' {
  if (score === null) return 'slate';
  if (score >= 80) return 'green';
  if (score >= 60) return 'amber';
  return 'red';
}

function ScoreBar({ score }: { score: number | null }) {
  const tone = scoreTone(score);
  const colour = tone === 'green' ? 'bg-primary' : tone === 'amber' ? 'bg-[#fcd34d]' : tone === 'red' ? 'bg-destructive' : 'bg-[#ffffff08]';
  return (
    <div className="min-w-[120px]">
      <div className="flex items-center justify-between gap-2">
        <span className="font-display text-lg font-black text-foreground">{score === null ? 'No data' : score}</span>
        {score !== null && <span className="text-[11px] text-muted-foreground">/ 100</span>}
      </div>
      <div className="mt-1 h-1.5 w-full rounded-full bg-[#ffffff08]">
        <div className={`h-1.5 rounded-full ${colour}`} style={{ width: `${score === null ? 0 : Math.max(2, Math.min(100, score))}%` }} />
      </div>
    </div>
  );
}

function ComponentGrid({ components, weights }: { components: Record<QualityComponentKey, number | null>; weights?: Record<QualityComponentKey, number> }) {
  return (
    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
      {QUALITY_COMPONENT_KEYS.map((key) => (
        <div key={key} className="rounded-lg border border-[#ffffff12] bg-[#ffffff08] px-3 py-2">
          <p className="text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
            {COMPONENT_LABELS[key]}
            {weights ? ` · ${Math.round(weights[key] * 100)}%` : ''}
          </p>
          <p className="text-sm font-bold text-foreground">{components[key] === null ? 'No data' : components[key]}</p>
        </div>
      ))}
    </div>
  );
}

function AdminQualityInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const [rows, setRows] = useState<AgentQualityRow[]>([]);
  const [meta, setMeta] = useState<QualityListMeta | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [outcomes, setOutcomes] = useState<OutcomeSummaryRow[]>([]);
  const [outcomesError, setOutcomesError] = useState<DescribedError | null>(null);

  const [detailAgentId, setDetailAgentId] = useState<string | null>(searchParams.get('agentId'));
  const [detail, setDetail] = useState<AgentQualityDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<DescribedError | null>(null);

  const [auditOutcome, setAuditOutcome] = useState('');
  const [auditScore, setAuditScore] = useState('80');
  const [auditTargetType, setAuditTargetType] = useState('');
  const [auditTargetId, setAuditTargetId] = useState('');
  const [auditNotes, setAuditNotes] = useState('');
  const [savingAudit, setSavingAudit] = useState(false);
  const [auditError, setAuditError] = useState<DescribedError | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await qualityAdminApi.list();
      setRows(res.data);
      setMeta(res.meta);
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load Agent quality scores'));
    } finally {
      setLoading(false);
    }
  }, []);

  const loadOutcomes = useCallback(async () => {
    try {
      const res = await qualityAdminApi.outcomeSummary();
      setOutcomes(res.data);
      setOutcomesError(null);
    } catch (err) {
      setOutcomesError(describeError(err, 'Could not load unlock outcomes'));
    }
  }, []);

  const loadDetail = useCallback(async (agentId: string) => {
    setDetailLoading(true);
    try {
      const res = await qualityAdminApi.detail(agentId);
      setDetail(res.data);
      setDetailError(null);
    } catch (err) {
      setDetailError(describeError(err, 'Could not load this Agent’s quality detail'));
    } finally {
      setDetailLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!ready) return;
    void load();
    void loadOutcomes();
  }, [ready, load, loadOutcomes]);

  useEffect(() => {
    if (ready && detailAgentId) {
      setDetail(null);
      setAuditError(null);
      void loadDetail(detailAgentId);
    }
  }, [ready, detailAgentId, loadDetail]);

  const scoreValue = Number(auditScore);
  const auditValid = Number.isInteger(scoreValue) && scoreValue >= 0 && scoreValue <= 100;

  const submitAudit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!detailAgentId || !auditValid) return;
    setSavingAudit(true);
    setAuditError(null);
    try {
      const res = await qualityAdminApi.recordAudit({
        agentId: detailAgentId,
        outcome: auditOutcome as QualityAuditOutcome,
        score: scoreValue,
        targetType: auditTargetType.trim() || undefined,
        targetId: auditTargetId.trim() || undefined,
        notes: auditNotes.trim() || undefined,
      });
      success(res.message);
      setAuditNotes('');
      setAuditTargetId('');
      setAuditTargetType('');
      void loadDetail(detailAgentId);
      void load();
    } catch (err) {
      setAuditError(describeError(err, 'Could not record the quality audit'));
      toastError(errorText(err, 'Could not record the quality audit'));
    } finally {
      setSavingAudit(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const totalOutcomes = outcomes.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={TrendingUp}
        eyebrow="Internal quality"
        title="Agent Quality"
        description={`Internal Agent Quality Score (§16.3) over the last ${meta?.windowDays ?? 90} days. Never shown publicly. Components without data are excluded rather than assumed perfect, so a score can read "No data".`}
        onRefresh={() => { void load(); void loadOutcomes(); }}
        refreshing={loading}
      />

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}
      {outcomesError && <ErrorPanel error={outcomesError} onRetry={() => void loadOutcomes()} />}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard icon={Gauge} label="Agents scored" value={loading ? '…' : rows.filter((row) => row.score !== null).length} sub={`${rows.length} Agent accounts`} />
        {['took', 'did_not_take', 'still_considering'].map((outcome) => {
          const row = outcomes.find((item) => item.outcome === outcome);
          return (
            <StatCard
              key={outcome}
              icon={Star}
              tone={outcome === 'took' ? 'green' : outcome === 'did_not_take' ? 'amber' : 'slate'}
              label={OUTCOME_LABELS[outcome]}
              value={row?.count ?? 0}
              sub={totalOutcomes ? `${Math.round(((row?.count ?? 0) / totalOutcomes) * 100)}% of recorded outcomes${row?.consented ? ` · ${row.consented} resident consent` : ''}` : 'No outcomes recorded yet'}
            />
          );
        })}
      </div>

      <Panel title="Agent quality scores" description="Lowest scores first. Use the score to guide audits, training, commission changes, publishing restrictions or suspension.">
        {loading && rows.length === 0 ? (
          <LoadingBlock />
        ) : rows.length === 0 ? (
          <EmptyState icon={TrendingUp} title="No Veriq Agents yet" />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[1040px]">
              <thead className="bg-[#ffffff08]">
                <tr>
                  <th className={th}>Agent</th>
                  <th className={th}>Score</th>
                  <th className={th}>Components</th>
                  <th className={th}>Key metrics</th>
                  <th className={th}>Account</th>
                  <th className={th}><span className="sr-only">Detail</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff12]">
                {rows.map((row) => (
                  <tr key={row.agentId} className="hover:bg-[#ffffff08]">
                    <td className={td}>
                      <p className="font-semibold">{row.name || row.agentId}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{row.agentId}</p>
                    </td>
                    <td className={td}><ScoreBar score={row.score} /></td>
                    <td className={td}>
                      <div className="flex max-w-[280px] flex-wrap gap-1">
                        {QUALITY_COMPONENT_KEYS.map((key) => (
                          <span key={key} className="rounded-md bg-[#ffffff08] px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {COMPONENT_LABELS[key]}: <strong>{row.components[key] === null ? '—' : row.components[key]}</strong>
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className={td}>
                      <p className="text-[11px] text-muted-foreground">{row.metrics.ratingCount} ratings{row.metrics.ratingAverage !== null ? ` · avg ${row.metrics.ratingAverage.toFixed(1)}/5` : ''}</p>
                      <p className="text-[11px] text-muted-foreground">{row.metrics.verificationRefunds} verification refunds of {row.metrics.paidUnlocks} paid unlocks</p>
                      <p className="text-[11px] text-muted-foreground">{row.metrics.staleExpiries} stale availability expiries · {row.metrics.lowResolutionMedia}/{row.metrics.approvedMedia} low-resolution images</p>
                      <p className="text-[11px] text-muted-foreground">{row.metrics.postPublicationCorrections} corrections after publication · {row.metrics.publishedListings} published</p>
                    </td>
                    <td className={td}>
                      <div className="flex flex-col gap-1">
                        <StatusBadge status={row.isActive ? 'active' : 'suspended'} />
                        <StatusBadge status={row.publishingPermission ? 'active' : 'disabled'} label={row.publishingPermission ? 'Publishing allowed' : 'Publishing revoked'} />
                      </div>
                    </td>
                    <td className={`${td} text-right`}>
                      <button type="button" onClick={() => setDetailAgentId(row.agentId)} className="whitespace-nowrap rounded-lg bg-background px-3 py-1.5 text-xs font-bold text-foreground hover:bg-[#ffffff0d]">
                        Audits &amp; detail
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <Modal isOpen={!!detailAgentId} onClose={() => setDetailAgentId(null)} title="Agent quality detail" size="lg" className="max-h-[92vh] overflow-y-auto">
        {detailError ? (
          <ErrorPanel error={detailError} onRetry={() => detailAgentId && void loadDetail(detailAgentId)} />
        ) : detailLoading && !detail ? (
          <LoadingBlock />
        ) : detail ? (
          <div className="space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-display text-base font-bold text-foreground">{detail.name || detail.agentId}</p>
                <p className="font-mono text-[11px] text-muted-foreground">{detail.agentId}</p>
              </div>
              <ScoreBar score={detail.score} />
            </div>

            <ComponentGrid components={detail.components} weights={detail.weights} />

            <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
              <KeyValue label="Private ratings" value={`${detail.metrics.ratingCount}${detail.metrics.ratingAverage !== null ? ` · avg ${detail.metrics.ratingAverage.toFixed(1)}/5` : ''}`} />
              <KeyValue label="Audits in window" value={`${detail.metrics.auditCount}${detail.metrics.auditAverage !== null ? ` · avg ${Math.round(detail.metrics.auditAverage)}` : ''}`} />
              <KeyValue label="Paid unlocks" value={detail.metrics.paidUnlocks} />
              <KeyValue label="Verification refunds" value={detail.metrics.verificationRefunds} />
              <KeyValue label="Documented Units" value={detail.metrics.documentedUnits} />
              <KeyValue label="Stale availability expiries" value={detail.metrics.staleExpiries} />
              <KeyValue label="Approved media" value={`${detail.metrics.approvedMedia} (${detail.metrics.lowResolutionMedia} low-res)`} />
              <KeyValue label="Post-publication corrections" value={detail.metrics.postPublicationCorrections} />
            </div>

            <form onSubmit={submitAudit} className="space-y-3 rounded-xl border border-[#ffffff12] p-4">
              <h3 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
                <ClipboardList className="h-4 w-4 text-primary" /> Record a quality audit
              </h3>
              {auditError && <ErrorPanel error={auditError} />}
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <Select
                  id="audit-outcome"
                  label="Outcome"
                  labelClassName="text-xs"
                  options={QUALITY_AUDIT_OUTCOMES.map((value) => ({ value, label: humanize(value) }))}
                  value={auditOutcome}
                  onValueChange={setAuditOutcome}
                  required
                />
                <div>
                  <label className="label text-xs" htmlFor="audit-score">Score (0–100)</label>
                  <input id="audit-score" type="number" min={0} max={100} step={1} className="input" value={auditScore} onChange={(event) => setAuditScore(event.target.value)} required />
                  {!auditValid && <p className="mt-1 text-[11px] text-destructive">Enter a whole number between 0 and 100.</p>}
                </div>
                <div>
                  <label className="label text-xs" htmlFor="audit-target-type">Audited record type <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input id="audit-target-type" className="input" maxLength={40} placeholder="property, sale_listing, unit…" value={auditTargetType} onChange={(event) => setAuditTargetType(event.target.value)} />
                </div>
                <div>
                  <label className="label text-xs" htmlFor="audit-target-id">Audited record ID <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input id="audit-target-id" className="input font-mono" maxLength={64} value={auditTargetId} onChange={(event) => setAuditTargetId(event.target.value)} />
                </div>
                <div className="sm:col-span-2">
                  <label className="label text-xs" htmlFor="audit-notes">Findings <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <textarea id="audit-notes" className="input min-h-20" maxLength={2000} value={auditNotes} onChange={(event) => setAuditNotes(event.target.value)} />
                </div>
              </div>
              <p className="text-[11px] text-muted-foreground">The Agent is notified that an audit was recorded. Audits are permanent and feed the internal score.</p>
              <button type="submit" disabled={!auditValid || savingAudit} className="btn-primary !py-2.5 !text-sm">
                {savingAudit && <LoadingSpinner size="sm" />} Record audit
              </button>
            </form>

            <div>
              <h3 className="mb-2 text-sm font-bold text-foreground">Recent audits</h3>
              {detail.audits.length === 0 ? (
                <EmptyState title="No audits recorded" description="Record the first audit above." />
              ) : (
                <TableScroll>
                  <table className="w-full min-w-[560px]">
                    <thead className="bg-[#ffffff08]">
                      <tr>
                        <th className={th}>When</th>
                        <th className={th}>Outcome</th>
                        <th className={th}>Score</th>
                        <th className={th}>Record</th>
                        <th className={th}>Findings</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#ffffff12]">
                      {detail.audits.map((audit) => (
                        <tr key={audit.id}>
                          <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(audit.createdAt)}</span></td>
                          <td className={td}><StatusBadge status={audit.outcome} /></td>
                          <td className={td}><span className="text-xs font-bold">{audit.score}</span></td>
                          <td className={td}><span className="break-all font-mono text-[11px] text-muted-foreground">{audit.targetType ? `${audit.targetType}: ${audit.targetId ?? '—'}` : '—'}</span></td>
                          <td className={td}><p className="max-w-xs text-xs text-muted-foreground">{audit.notes || '—'}</p></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
              )}
            </div>
          </div>
        ) : null}
      </Modal>
    </div>
  );
}

export default function AdminQualityPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminQualityInner />
    </Suspense>
  );
}
