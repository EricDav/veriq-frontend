'use client';

import React, { useEffect, useState } from 'react';
import {
  Wallet as WalletIcon, Plus, ArrowDownCircle, ArrowUpCircle, RefreshCw,
  Clock, CheckCircle, XCircle, Landmark, Timer, TrendingUp,
} from 'lucide-react';
import { walletApi, ApiError } from '@/lib/api';
import type { AgentEarningsSummary, Wallet, WalletTransaction } from '@/types';
import { UserRole, WalletTransactionType, WalletTransactionStatus } from '@/types';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

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

const QUICK_AMOUNTS = [1000, 5000, 10000, 25000, 50000, 100000];

// ─── Transaction row ────────────────────────────────────────────────────────

function TransactionRow({ tx }: { tx: WalletTransaction }) {
  const isCredit =
    tx.type === WalletTransactionType.TOPUP ||
    tx.type === WalletTransactionType.REFUND ||
    tx.type === WalletTransactionType.EARNING;

  const statusBadge = {
    [WalletTransactionStatus.SUCCESS]: { icon: <CheckCircle className="h-3 w-3" />, cls: 'text-emerald-600 bg-emerald-50' },
    [WalletTransactionStatus.PENDING]: { icon: <Clock className="h-3 w-3" />, cls: 'text-gold-600 bg-gold-50' },
    [WalletTransactionStatus.FAILED]: { icon: <XCircle className="h-3 w-3" />, cls: 'text-red-600 bg-red-50' },
  }[tx.status];

  const typeLabel = {
    [WalletTransactionType.TOPUP]: 'Wallet Top-up',
    [WalletTransactionType.DEBIT]: 'Payment',
    [WalletTransactionType.REFUND]: 'Refund',
    [WalletTransactionType.EARNING]: 'Commission Earning',
    [WalletTransactionType.WITHDRAWAL]: 'Withdrawal Request',
  }[tx.type];

  return (
    <div className="flex items-center gap-3 py-3 border-b border-slate-100 last:border-0">
      <div className={`flex-shrink-0 h-9 w-9 rounded-full flex items-center justify-center ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-500'}`}>
        {isCredit ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold text-navy-900 truncate">{tx.description || typeLabel}</p>
        <p className="text-xs text-slate-400">{formatDate(tx.createdAt)}</p>
      </div>
      <div className="text-right flex-shrink-0">
        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-navy-900'}`}>
          {isCredit ? '+' : '-'}₦{Number(tx.amount).toLocaleString('en-NG')}
        </p>
        <span className={`inline-flex items-center gap-1 mt-0.5 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${statusBadge.cls}`}>
          {statusBadge.icon} {tx.status}
        </span>
      </div>
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

export default function WalletPage() {
  const { user } = useAuth();
  const { success, error: toastError } = useToast();

  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [earnings, setEarnings] = useState<AgentEarningsSummary | null>(null);
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [loadingWallet, setLoadingWallet] = useState(true);
  const [loadingEarnings, setLoadingEarnings] = useState(false);
  const [loadingTx, setLoadingTx] = useState(true);

  const [amount, setAmount] = useState('');
  const [topUpLoading, setTopUpLoading] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawNote, setWithdrawNote] = useState('');
  const [withdrawLoading, setWithdrawLoading] = useState(false);

  const isAgent = user?.role === UserRole.AGENT;

  const loadWallet = () => {
    setLoadingWallet(true);
    walletApi
      .getBalance()
      .then((res) => setWallet(res.data))
      .catch(() => {})
      .finally(() => setLoadingWallet(false));
  };

  const loadTransactions = () => {
    setLoadingTx(true);
    walletApi
      .getTransactions(1, 20)
      .then((res) => setTransactions(res.data))
      .catch(() => {})
      .finally(() => setLoadingTx(false));
  };

  const loadEarnings = () => {
    if (!isAgent) return;
    setLoadingEarnings(true);
    walletApi
      .getAgentEarnings()
      .then((res) => setEarnings(res.data))
      .catch(() => {})
      .finally(() => setLoadingEarnings(false));
  };

  useEffect(() => {
    loadWallet();
    loadTransactions();
  }, []);

  useEffect(() => {
    loadEarnings();
  }, [isAgent]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleTopUp = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(amount);
    if (!value || value < 100) {
      toastError('Enter a valid amount (minimum ₦100)');
      return;
    }

    setTopUpLoading(true);
    try {
      // Initiate the top-up — Paystack returns a hosted checkout URL
      const initiated = await walletApi.topUp({ amount: value });
      const { authorizationUrl } = initiated.data;

      if (!authorizationUrl) {
        throw new Error('Payment provider did not return a checkout URL');
      }

      // Redirect to Paystack's hosted checkout. The user returns to
      // /dashboard/wallet/callback which verifies the payment.
      window.location.href = authorizationUrl;
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Top-up failed. Please try again.');
      setTopUpLoading(false);
    }
  };

  const handleWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = Number(withdrawAmount);
    if (!earnings) return;
    if (!value || value < earnings.minWithdrawalAmount) {
      toastError(`Minimum withdrawal is ${earnings.minWithdrawalAmountFormatted}`);
      return;
    }
    if (value > earnings.availableForWithdrawal) {
      toastError(`You can withdraw up to ${earnings.availableForWithdrawalFormatted}`);
      return;
    }

    setWithdrawLoading(true);
    try {
      const res = await walletApi.requestWithdrawal({
        amount: value,
        note: withdrawNote.trim() || undefined,
      });
      setEarnings(res.data.earnings);
      setWithdrawAmount('');
      setWithdrawNote('');
      success('Withdrawal request submitted.');
      loadWallet();
      loadTransactions();
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Withdrawal request failed.');
    } finally {
      setWithdrawLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold text-navy-900">
          {isAgent ? 'Transactions & Earnings' : 'Wallet'}
        </h1>
        <p className="text-sm text-veriq-muted">
          {isAgent
            ? 'Track commission earnings, clearance status, withdrawals, and wallet activity'
            : 'View your balance, top up funds, and track transactions'}
        </p>
      </div>

      {/* Balance card */}
      <div className="card p-6 bg-navy-900 border-none">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 flex items-center gap-2">
              <WalletIcon className="h-3.5 w-3.5" /> Wallet Balance
            </p>
            {loadingWallet ? (
              <LoadingSpinner size="md" className="text-white" />
            ) : (
              <p className="font-display text-3xl font-black text-white">
                {wallet?.balanceFormatted ?? '₦0'}
              </p>
            )}
          </div>
          <button
            onClick={() => {
              loadWallet();
              loadEarnings();
              loadTransactions();
            }}
            className="text-slate-400 hover:text-white transition-colors p-2 rounded-lg hover:bg-white/5"
            title="Refresh"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>
      </div>

      {isAgent && (
        <>
          <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
            {[
              {
                label: 'Total Earnings',
                value: earnings?.totalEarningsFormatted ?? '₦0',
                icon: TrendingUp,
                cls: 'text-emerald-600 bg-emerald-50',
              },
              {
                label: 'Available',
                value: earnings?.availableForWithdrawalFormatted ?? '₦0',
                icon: CheckCircle,
                cls: 'text-veriq-secondary bg-veriq-secondary/10',
              },
              {
                label: 'Pending Clearance',
                value: earnings?.pendingClearanceFormatted ?? '₦0',
                icon: Timer,
                cls: 'text-gold-600 bg-gold-50',
              },
              {
                label: 'Pending Withdrawal',
                value: earnings?.pendingWithdrawalFormatted ?? '₦0',
                icon: Landmark,
                cls: 'text-blue-600 bg-blue-50',
              },
            ].map(({ label, value, icon: Icon, cls }) => (
              <div key={label} className="card p-4">
                <div className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${cls}`}>
                  <Icon className="h-4 w-4" />
                </div>
                <p className="text-xs text-slate-500">{label}</p>
                <p className="mt-1 text-xl font-black text-navy-900">
                  {loadingEarnings ? '…' : value}
                </p>
              </div>
            ))}
          </div>

          <div className="card p-6">
            <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
              <Landmark className="h-4 w-4 text-veriq-secondary" /> Withdraw Earnings
            </h2>
            <div className="mb-4 rounded-xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-600">
              <p>
                Earnings become withdrawable after {earnings?.holdHours ?? 48} hours. Minimum withdrawal is{' '}
                <span className="font-semibold text-navy-900">
                  {earnings?.minWithdrawalAmountFormatted ?? '₦5,000'}
                </span>
                .
              </p>
              {earnings?.nextEligibleAt && (
                <p className="mt-1 text-xs text-slate-500">
                  Next pending earning clears around {formatDate(earnings.nextEligibleAt)}.
                </p>
              )}
            </div>

            <form onSubmit={handleWithdrawal} className="grid grid-cols-1 gap-4 md:grid-cols-[1fr_1fr_auto] md:items-end">
              <div>
                <label className="label">Amount (₦)</label>
                <input
                  type="number"
                  min={earnings?.minWithdrawalAmount ?? 5000}
                  max={earnings?.availableForWithdrawal ?? undefined}
                  step={1}
                  value={withdrawAmount}
                  onChange={(e) => setWithdrawAmount(e.target.value)}
                  placeholder={earnings?.availableForWithdrawalFormatted ?? '₦0 available'}
                  className="input"
                />
              </div>
              <div>
                <label className="label">Note</label>
                <input
                  value={withdrawNote}
                  onChange={(e) => setWithdrawNote(e.target.value)}
                  placeholder="Optional payout note"
                  className="input"
                />
              </div>
              <button
                type="submit"
                disabled={withdrawLoading || !earnings?.isEligible}
                className="btn-primary !text-sm !py-2.5 flex items-center justify-center gap-2 whitespace-nowrap disabled:opacity-50"
              >
                {withdrawLoading && <LoadingSpinner size="sm" />}
                Request Withdrawal
              </button>
            </form>
          </div>
        </>
      )}

      {/* Top up */}
      {!isAgent && (
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-4 flex items-center gap-2">
          <Plus className="h-4 w-4 text-veriq-secondary" /> Top Up Wallet
        </h2>

        <div className="flex flex-wrap gap-2 mb-4">
          {QUICK_AMOUNTS.map((amt) => (
            <button
              key={amt}
              type="button"
              onClick={() => setAmount(String(amt))}
              className={`rounded-lg px-3 py-1.5 text-xs font-semibold border transition-colors ${
                amount === String(amt)
                  ? 'border-veriq-secondary bg-veriq-secondary/10 text-veriq-secondary'
                  : 'border-slate-200 text-slate-500 hover:border-slate-300'
              }`}
            >
              ₦{amt.toLocaleString('en-NG')}
            </button>
          ))}
        </div>

        <form onSubmit={handleTopUp} className="flex items-end gap-3">
          <div className="flex-1">
            <label className="label">Amount (₦)</label>
            <input
              type="number"
              min={100}
              step={1}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="input"
            />
          </div>
          <button type="submit" disabled={topUpLoading} className="btn-primary !text-sm !py-2.5 flex items-center gap-2 whitespace-nowrap">
            {topUpLoading && <LoadingSpinner size="sm" />}
            Top Up
          </button>
        </form>
        <p className="text-[11px] text-slate-400 mt-2">
          You&apos;ll be redirected to Paystack to complete your payment securely. Minimum top-up is ₦100.
        </p>
      </div>
      )}

      {/* Transaction history */}
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-2 flex items-center gap-2">
          <Clock className="h-4 w-4 text-veriq-secondary" /> Transaction History
        </h2>
        {loadingTx ? (
          <div className="py-8 flex justify-center">
            <LoadingSpinner size="md" className="text-veriq-secondary" />
          </div>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-veriq-muted py-6 text-center">No transactions yet.</p>
        ) : (
          <div>
            {transactions.map((tx) => (
              <TransactionRow key={tx.id} tx={tx} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
