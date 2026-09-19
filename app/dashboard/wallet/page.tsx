'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import {
  ArrowDownCircle, ArrowRight, ArrowUpCircle, CheckCircle, Clock, Info, Landmark, RefreshCw, Search, ShieldCheck, Undo2,
  Wallet as WalletIcon, XCircle,
} from 'lucide-react';
import { walletCreditApi } from '@/lib/api/renter';
import type { VeriqWallet, WalletLedgerTransaction, WalletLedgerType } from '@/types/renter';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { ApiErrorNotice } from '@/components/renter/ApiErrorNotice';
import { formatDateTime, formatNaira } from '@/components/renter/format';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<WalletLedgerType, string> = {
  topup: 'Wallet funding (legacy)',
  debit: 'Unlock payment from wallet credit',
  refund: 'Refund credited',
  earning: 'Earning',
  withdrawal: 'Withdrawal',
  ledger_migration: 'Balance moved to earnings ledger',
};

const CREDIT_TYPES: WalletLedgerType[] = ['topup', 'refund', 'earning'];

const STATUS_STYLES = {
  success: { icon: CheckCircle, cls: 'bg-emerald-50 text-emerald-600' },
  pending: { icon: Clock, cls: 'bg-amber-50 text-amber-600' },
  failed: { icon: XCircle, cls: 'bg-red-50 text-red-600' },
} as const;

function TransactionRow({ tx }: { tx: WalletLedgerTransaction }) {
  const isCredit = CREDIT_TYPES.includes(tx.type);
  const status = STATUS_STYLES[tx.status] ?? STATUS_STYLES.pending;
  const StatusIcon = status.icon;
  return (
    <div className="flex items-center gap-3 border-b border-slate-100 py-3 last:border-0">
      <div className={`flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full ${isCredit ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-100 text-slate-500'}`}>
        {isCredit ? <ArrowDownCircle className="h-4 w-4" /> : <ArrowUpCircle className="h-4 w-4" />}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-navy-900">{tx.description || TYPE_LABELS[tx.type] || 'Wallet transaction'}</p>
        <p className="truncate text-xs text-slate-400">
          {TYPE_LABELS[tx.type] ?? tx.type} · {formatDateTime(tx.createdAt)}
          {tx.paymentReference && <> · <span className="font-mono">{tx.paymentReference}</span></>}
        </p>
      </div>
      <div className="flex-shrink-0 text-right">
        <p className={`text-sm font-bold ${isCredit ? 'text-emerald-600' : 'text-navy-900'}`}>{isCredit ? '+' : '−'}{formatNaira(tx.amount)}</p>
        <span className={`mt-0.5 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold capitalize ${status.cls}`}>
          <StatusIcon className="h-3 w-3" /> {tx.status}
        </span>
      </div>
    </div>
  );
}

/**
 * Veriq Wallet (§14.7, §17.1): read-only refund credit — balance, credit held for a pending checkout, available credit and
 * transaction history. Credit is applied automatically at unlock checkout; there is no top-up or cash withdrawal.
 */
export default function WalletPage() {
  const { user, isLoading: authLoading } = useAuth();
  const isAgent = user?.role === UserRole.AGENT;

  const [wallet, setWallet] = useState<VeriqWallet | null>(null);
  const [walletError, setWalletError] = useState<unknown>(null);
  const [transactions, setTransactions] = useState<WalletLedgerTransaction[]>([]);
  const [txError, setTxError] = useState<unknown>(null);
  const [page, setPage] = useState(1);
  const [pages, setPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setWalletError(null);
    setTxError(null);
    const [walletRes, txRes] = await Promise.allSettled([walletCreditApi.get(), walletCreditApi.transactions(1, PAGE_SIZE)]);
    if (walletRes.status === 'fulfilled') setWallet(walletRes.value.data);
    else setWalletError(walletRes.reason);
    if (txRes.status === 'fulfilled') {
      setTransactions(txRes.value.data);
      setPage(1);
      setPages(txRes.value.meta?.pages ?? 1);
    } else {
      setTxError(txRes.reason);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (!authLoading) void load();
  }, [authLoading, load]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      const res = await walletCreditApi.transactions(page + 1, PAGE_SIZE);
      setTransactions((prev) => [...prev, ...res.data]);
      setPage(page + 1);
      setPages(res.meta?.pages ?? pages);
    } catch (err) {
      setTxError(err);
    } finally {
      setLoadingMore(false);
    }
  };

  if (authLoading || loading) return <PageLoader />;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Veriq Wallet</h1>
          <p className="text-sm text-veriq-muted">Refund credit you can put toward future unlocks. It does not expire.</p>
        </div>
        <button type="button" onClick={() => void load()} className="btn-outline self-start !px-4 !py-2 !text-sm"><RefreshCw className="h-4 w-4" /> Refresh</button>
      </div>

      {isAgent && (
        <div className="flex flex-col gap-3 rounded-2xl border border-blue-100 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <Landmark className="mt-0.5 h-5 w-5 flex-shrink-0 text-blue-700" />
            <div>
              <p className="text-sm font-bold text-navy-900">Looking for your Veriq Agent earnings?</p>
              <p className="text-xs leading-5 text-blue-900">Unlock earnings, clearance holds and withdrawals are managed in the Agent earnings ledger, separate from this wallet.</p>
            </div>
          </div>
          <Link href="/dashboard/agent/earnings" className="btn-primary !px-4 !py-2 !text-sm">Open Earnings <ArrowRight className="h-4 w-4" /></Link>
        </div>
      )}

      {walletError ? (
        <ApiErrorNotice error={walletError} fallback="Your wallet balance could not be loaded." onRetry={() => void load()} />
      ) : wallet ? (
        <div className="card border-none bg-navy-900 p-6">
          <p className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-400"><WalletIcon className="h-3.5 w-3.5" /> Available credit</p>
          <p className="font-display text-4xl font-black text-white">{wallet.availableFormatted}</p>
          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] text-slate-400">Balance</p>
              <p className="text-lg font-bold text-white">{wallet.balanceFormatted}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] text-slate-400">Held for a pending checkout</p>
              <p className="text-lg font-bold text-white">{formatNaira(wallet.heldForPendingCheckout)}</p>
            </div>
            <div className="rounded-xl bg-white/5 p-3">
              <p className="text-[11px] text-slate-400">Expiry</p>
              <p className="text-lg font-bold text-white">{wallet.expires ? 'Expires' : 'Never expires'}</p>
            </div>
          </div>
          {wallet.heldForPendingCheckout > 0 && (
            <p className="mt-3 text-xs text-slate-400">Held credit is reserved for an unlock awaiting payment and is released automatically if that checkout is cancelled or expires.</p>
          )}
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-3">
        <div className="card p-5">
          <ShieldCheck className="mb-2 h-5 w-5 text-veriq-secondary" />
          <p className="text-sm font-bold text-navy-900">Applied automatically</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">When you unlock a listing, available credit is used first. If it covers the fee, no payment page is needed; otherwise you pay only the difference.</p>
        </div>
        <div className="card p-5">
          <Undo2 className="mb-2 h-5 w-5 text-purple-600" />
          <p className="text-sm font-bold text-navy-900">Where refunds go</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">Approved refunds for qualifying problems are credited here, never paid out as cash. Free Unlocks have no refundable value.</p>
        </div>
        <div className="card p-5">
          <Info className="mb-2 h-5 w-5 text-slate-500" />
          <p className="text-sm font-bold text-navy-900">No top-ups needed</p>
          <p className="mt-1 text-xs leading-5 text-slate-600">You never need to fund this wallet before unlocking. Checkout collects any remaining amount directly and securely.</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Link href="/dashboard/browse" className="btn-primary !px-4 !py-2 !text-sm"><Search className="h-4 w-4" /> Browse properties</Link>
        <Link href="/dashboard/refunds" className="btn-outline !px-4 !py-2 !text-sm"><Undo2 className="h-4 w-4" /> Refunds</Link>
        <Link href="/refund-policy" className="btn-ghost !px-4 !py-2 !text-sm">Refund Policy</Link>
      </div>

      <div className="card p-6">
        <h2 className="mb-2 flex items-center gap-2 font-display text-base font-bold text-navy-900"><Clock className="h-4 w-4 text-veriq-secondary" /> Transaction history</h2>
        {txError ? <ApiErrorNotice error={txError} fallback="Wallet transactions could not be loaded." onRetry={() => void load()} /> : null}
        {!txError && transactions.length === 0 ? (
          <p className="py-6 text-center text-sm text-veriq-muted">No wallet activity yet. Refund credits and unlocks paid with credit will appear here with their references.</p>
        ) : (
          <div>{transactions.map((tx) => <TransactionRow key={tx.id} tx={tx} />)}</div>
        )}
        {page < pages && (
          <div className="mt-4 flex justify-center">
            <button type="button" onClick={() => void loadMore()} disabled={loadingMore} className="btn-outline !py-2.5">
              {loadingMore && <LoadingSpinner size="sm" />} Load older transactions
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
