'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Landmark, Wallet as WalletIcon, TrendingUp, Users, RefreshCw,
  ChevronLeft, ChevronRight, Search, ArrowDownCircle, ArrowUpCircle,
  Clock, CheckCircle, XCircle, Award,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { walletApi, ApiError } from '@/lib/api';
import type { WalletLedgerEntry, WalletAdminSummary } from '@/types';
import { UserRole, WalletTransactionType, WalletTransactionStatus } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

// ─── Formatters ───────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleString('en-NG', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function fmtNaira(n: number): string {
  return `₦${Number(n).toLocaleString('en-NG')}`;
}

const TYPE_LABEL: Record<WalletTransactionType, string> = {
  [WalletTransactionType.TOPUP]: 'Top-up',
  [WalletTransactionType.DEBIT]: 'Debit',
  [WalletTransactionType.REFUND]: 'Refund',
  [WalletTransactionType.EARNING]: 'Agent Earning',
  [WalletTransactionType.WITHDRAWAL]: 'Withdrawal',
};

const STATUS_BADGE: Record<WalletTransactionStatus, { icon: React.ReactNode; cls: string }> = {
  [WalletTransactionStatus.SUCCESS]: { icon: <CheckCircle className="h-3 w-3" />, cls: 'text-emerald-600 bg-emerald-50' },
  [WalletTransactionStatus.PENDING]: { icon: <Clock className="h-3 w-3" />, cls: 'text-gold-600 bg-gold-50' },
  [WalletTransactionStatus.FAILED]: { icon: <XCircle className="h-3 w-3" />, cls: 'text-red-600 bg-red-50' },
};

const CREDIT_TYPES = new Set([WalletTransactionType.TOPUP, WalletTransactionType.REFUND, WalletTransactionType.EARNING]);

// ─── Summary card ───────────────────────────────────────────────────────────

function SummaryCard({
  icon: Icon, iconCls, label, value, sub,
}: { icon: React.ElementType; iconCls: string; label: string; value: string; sub?: string }) {
  return (
    <div className="card p-5">
      <div className={`h-9 w-9 rounded-xl flex items-center justify-center mb-3 ${iconCls}`}>
        <Icon className="h-4.5 w-4.5" />
      </div>
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">{label}</p>
      <p className="font-display text-xl font-black text-navy-900">{value}</p>
      {sub && <p className="text-[11px] text-veriq-muted mt-1">{sub}</p>}
    </div>
  );
}

// ─── Ledger row ─────────────────────────────────────────────────────────────

function LedgerRow({
  tx,
  onMarkPaid,
  onReject,
  isActioning,
}: {
  tx: WalletLedgerEntry;
  onMarkPaid: (id: string) => void;
  onReject: (id: string) => void;
  isActioning: boolean;
}) {
  const isCredit = CREDIT_TYPES.has(tx.type);
  const statusBadge = STATUS_BADGE[tx.status];
  const canActionWithdrawal =
    tx.type === WalletTransactionType.WITHDRAWAL &&
    tx.status === WalletTransactionStatus.PENDING;

  return (
    <tr className="border-b border-slate-100 last:border-0 hover:bg-slate-50/60">
      <td className="py-3 px-3">
        <div className="flex items-center gap-2.5">
          <div className={`flex-shrink-0 h-8 w-8 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
            {isCredit ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900 truncate">
              {tx.user ? tx.user.name : 'Unknown user'}
            </p>
            <p className="text-xs text-slate-400 truncate">{tx.user?.email}</p>
          </div>
        </div>
      </td>
      <td className="py-3 px-3">
        <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold text-slate-600 capitalize">
          {TYPE_LABEL[tx.type]}
        </span>
      </td>
      <td className="py-3 px-3 max-w-[220px]">
        <p className="text-sm text-navy-900 truncate">{tx.description || '—'}</p>
        {tx.paymentReference && <p className="text-[11px] text-slate-400 truncate">{tx.paymentReference}</p>}
      </td>
      <td className="py-3 px-3 text-right">
        <p className={`text-sm font-bold whitespace-nowrap ${isCredit ? 'text-emerald-600' : 'text-navy-900'}`}>
          {isCredit ? '+' : '-'}{fmtNaira(tx.amount)}
        </p>
      </td>
      <td className="py-3 px-3">
        <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadge.cls}`}>
          {statusBadge.icon} {tx.status}
        </span>
      </td>
      <td className="py-3 px-3 text-right whitespace-nowrap">
        {canActionWithdrawal ? (
          <div className="flex flex-col items-end gap-1.5">
            <button
              type="button"
              disabled={isActioning}
              onClick={() => onMarkPaid(tx.id)}
              className="rounded-lg bg-emerald-600 px-2.5 py-1 text-[10px] font-bold text-white hover:bg-emerald-700 disabled:opacity-50"
            >
              Mark paid
            </button>
            <button
              type="button"
              disabled={isActioning}
              onClick={() => onReject(tx.id)}
              className="text-[10px] font-bold text-red-500 hover:underline disabled:opacity-50"
            >
              Reject
            </button>
          </div>
        ) : (
          <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
        )}
      </td>
    </tr>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function AdminLedgerPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [summary, setSummary] = useState<WalletAdminSummary | null>(null);
  const [loadingSummary, setLoadingSummary] = useState(true);

  const [entries, setEntries] = useState<WalletLedgerEntry[]>([]);
  const [loadingEntries, setLoadingEntries] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);

  const [typeFilter, setTypeFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [actioningTxId, setActioningTxId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const loadSummary = useCallback(() => {
    setLoadingSummary(true);
    walletApi
      .adminGetSummary()
      .then((res) => setSummary(res.data))
      .catch(() => toastError('Failed to load revenue summary'))
      .finally(() => setLoadingSummary(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const loadEntries = useCallback(() => {
    setLoadingEntries(true);
    walletApi
      .adminGetLedger({
        page,
        limit: 20,
        type: (typeFilter || undefined) as never,
        status: (statusFilter || undefined) as never,
        search: search || undefined,
      })
      .then((res) => {
        setEntries(res.data);
        setTotal(res.meta.total);
        setTotalPages(res.meta.pages);
      })
      .catch(() => toastError('Failed to load wallet ledger'))
      .finally(() => setLoadingEntries(false));
  }, [page, typeFilter, statusFilter, search]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

  useEffect(() => {
    loadEntries();
  }, [loadEntries]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput.trim());
  };

  const refreshAll = () => {
    loadSummary();
    loadEntries();
  };

  const handleMarkWithdrawalPaid = async (transactionId: string) => {
    setActioningTxId(transactionId);
    try {
      await walletApi.adminMarkWithdrawalPaid(transactionId);
      success('Withdrawal marked as paid.');
      refreshAll();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update withdrawal');
    } finally {
      setActioningTxId(null);
    }
  };

  const handleRejectWithdrawal = async (transactionId: string) => {
    setActioningTxId(transactionId);
    try {
      await walletApi.adminRejectWithdrawal(transactionId);
      success('Withdrawal rejected and funds returned.');
      refreshAll();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to reject withdrawal');
    } finally {
      setActioningTxId(null);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="h-10 w-10 rounded-xl bg-gold-100 flex items-center justify-center">
              <Landmark className="h-5 w-5 text-gold-600" />
            </div>
            <h1 className="font-display text-2xl font-bold text-navy-900">Wallet Ledger & Revenue</h1>
          </div>
          <p className="text-sm text-veriq-muted">
            Every wallet transaction across the platform, plus the revenue split between Veriq and listing agents.
          </p>
        </div>
        <button
          onClick={refreshAll}
          className="text-slate-400 hover:text-navy-900 transition-colors p-2 rounded-lg hover:bg-slate-100"
          title="Refresh"
        >
          <RefreshCw className="h-4 w-4" />
        </button>
      </div>

      {/* Revenue split summary */}
      {loadingSummary ? (
        <div className="card p-8 flex justify-center">
          <LoadingSpinner size="md" className="text-veriq-secondary" />
        </div>
      ) : summary ? (
        <>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <SummaryCard
              icon={WalletIcon}
              iconCls="bg-navy-900 text-white"
              label="Customer Wallet Balances"
              value={summary.wallets.customerBalanceFormatted}
              sub={`${summary.wallets.walletCount} wallets · excludes agent earnings`}
            />
            <SummaryCard
              icon={TrendingUp}
              iconCls="bg-emerald-100 text-emerald-600"
              label="Total Top-ups"
              value={summary.transactions.totalTopUpsFormatted}
              sub="All-time successful top-ups"
            />
            <SummaryCard
              icon={Landmark}
              iconCls="bg-gold-100 text-gold-600"
              label="Veriq Revenue (Company Share)"
              value={summary.revenue.platformShareFormatted}
              sub={`${summary.revenue.commissionLabel} · ${summary.revenue.paidConsultations} consultations`}
            />
            <SummaryCard
              icon={Award}
              iconCls="bg-purple-100 text-purple-600"
              label="Agent Earnings (Commission)"
              value={summary.revenue.agentShareFormatted}
              sub="Actual agent share from paid consultations"
            />
          </div>

          <div className="card p-5">
            <h2 className="font-display text-sm font-bold text-navy-900 mb-3 flex items-center gap-2">
              <Users className="h-4 w-4 text-veriq-secondary" /> Revenue Breakdown
            </h2>
            <p className="mb-4 text-xs text-veriq-muted">
              Splits vary by pricing tier and partner-specific rules. These totals use the actual
              split saved on each paid consultation, excluding approved refunds.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm">
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-veriq-muted">Total consultation revenue</span>
                <span className="font-bold text-navy-900">{summary.revenue.totalConsultationRevenueFormatted}</span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-veriq-muted">Veriq share (actual)</span>
                <span className="font-bold text-gold-600">{summary.revenue.platformShareFormatted}</span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                <span className="text-veriq-muted">Agent share (actual)</span>
                <span className="font-bold text-purple-600">{summary.revenue.agentShareFormatted}</span>
              </div>
            </div>
            {(summary.transactions.totalDebits > 0 || summary.transactions.totalRefunds > 0) && (
              <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-veriq-muted">Total wallet debits (payments)</span>
                  <span className="font-bold text-navy-900">{summary.transactions.totalDebitsFormatted}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-veriq-muted">Total refunds</span>
                  <span className="font-bold text-navy-900">{summary.transactions.totalRefundsFormatted}</span>
                </div>
              </div>
            )}
            {summary.revenue.refundedConsultations > 0 && (
              <div className="mt-4 pt-4 border-t border-slate-100">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-veriq-muted">
                  Reversed by approved refunds ({summary.revenue.refundedConsultations})
                </p>
                <div className="grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-veriq-muted">Refunded unlock value</span>
                    <span className="font-bold text-navy-900">{summary.revenue.refundedConsultationRevenueFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-veriq-muted">Veriq share reversed</span>
                    <span className="font-bold text-gold-600">{summary.revenue.refundedPlatformShareFormatted}</span>
                  </div>
                  <div className="flex items-center justify-between sm:flex-col sm:items-start gap-1">
                    <span className="text-veriq-muted">Agent share reversed</span>
                    <span className="font-bold text-purple-600">{summary.revenue.refundedAgentShareFormatted}</span>
                  </div>
                </div>
              </div>
            )}
            <div className="mt-4 pt-4 border-t border-slate-100 grid grid-cols-1 gap-4 text-sm sm:grid-cols-3">
              <div className="flex items-center justify-between sm:flex-col sm:items-start">
                <span className="text-veriq-muted">Agent wallet balances</span>
                <span className="font-bold text-navy-900">{summary.wallets.agentBalanceFormatted}</span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start">
                <span className="text-veriq-muted">Top-ups minus customer balances</span>
                <span className="font-bold text-navy-900">{summary.revenue.topUpsLessCustomerBalancesFormatted}</span>
              </div>
              <div className="flex items-center justify-between sm:flex-col sm:items-start">
                <span className="text-veriq-muted">Difference vs Veriq + agent earnings</span>
                <span className={`font-bold ${Math.abs(summary.revenue.reconciliationDifference) < 1 ? 'text-emerald-600' : 'text-red-600'}`}>
                  {summary.revenue.reconciliationDifferenceFormatted}
                </span>
              </div>
            </div>
          </div>
        </>
      ) : null}

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap items-center gap-3">
          <form onSubmit={handleSearchSubmit} className="flex-1 min-w-[200px] flex items-center gap-2">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name, email, or reference"
                className="input !pl-9"
              />
            </div>
          </form>

          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            className="input !w-auto"
          >
            <option value="">All types</option>
            {Object.values(WalletTransactionType).map((t) => (
              <option key={t} value={t}>{TYPE_LABEL[t]}</option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            className="input !w-auto"
          >
            <option value="">All statuses</option>
            {Object.values(WalletTransactionStatus).map((s) => (
              <option key={s} value={s} className="capitalize">{s}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Ledger table */}
      <div className="card p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-400">
                <th className="py-3 px-3">User</th>
                <th className="py-3 px-3">Type</th>
                <th className="py-3 px-3">Description</th>
                <th className="py-3 px-3 text-right">Amount</th>
                <th className="py-3 px-3">Status</th>
                <th className="py-3 px-3 text-right">Date</th>
              </tr>
            </thead>
            <tbody>
              {loadingEntries ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center">
                    <LoadingSpinner size="md" className="text-veriq-secondary mx-auto" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-10 text-center text-sm text-veriq-muted">
                    No transactions found.
                  </td>
                </tr>
              ) : (
                entries.map((tx) => (
                  <LedgerRow
                    key={tx.id}
                    tx={tx}
                    onMarkPaid={handleMarkWithdrawalPaid}
                    onReject={handleRejectWithdrawal}
                    isActioning={actioningTxId === tx.id}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between border-t border-slate-100 px-4 py-3">
            <p className="text-xs text-veriq-muted">
              Page {page} of {totalPages} · {total.toLocaleString('en-NG')} transactions
            </p>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="rounded-lg p-1.5 border border-slate-200 text-slate-500 disabled:opacity-40 hover:border-slate-300"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="rounded-lg p-1.5 border border-slate-200 text-slate-500 disabled:opacity-40 hover:border-slate-300"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
