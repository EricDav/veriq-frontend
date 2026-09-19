'use client';

import React, { Suspense, useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  AlertTriangle,
  Banknote,
  Coins,
  Gift,
  Landmark,
  Plus,
  Search,
  Undo2,
  Users,
  Wallet,
} from 'lucide-react';
import { ledgerAdminApi } from '@/lib/api/admin';
import type {
  AgentBalanceRow,
  AgentPayout,
  AgentPayoutStatus,
  EarningBuckets,
  LedgerOverview,
  LedgerTransaction,
  PageMeta,
  RevenueSplitRow,
  UnlockStatus,
  WalletLedgerRow,
  WalletTransactionStatus,
  WalletTransactionType,
} from '@/types/admin';
import {
  PAYOUT_STATUSES,
  UNLOCK_STATUSES,
  WALLET_TRANSACTION_STATUSES,
  WALLET_TRANSACTION_TYPES,
} from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import {
  dateOnly,
  dateTime,
  describeError,
  errorText,
  humanize,
  naira,
  signedNaira,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  LoadingBlock,
  Pagination,
  Panel,
  StatCard,
  StatusBadge,
  TableScroll,
  Tabs,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type TabId = 'overview' | 'transactions' | 'revenue' | 'wallet' | 'balances' | 'withdrawals';

const TARGET_LABELS: Record<string, string> = {
  property: 'Property',
  shared_opportunity: 'Shared opportunity',
  sale_listing: 'Sale listing',
};

const BUCKET_LABELS: Array<{ key: keyof EarningBuckets; label: string }> = [
  { key: 'pending', label: 'Pending' },
  { key: 'refundReviewHold', label: 'Refund review hold' },
  { key: 'withdrawable', label: 'Withdrawable' },
  { key: 'inWithdrawal', label: 'In withdrawal' },
  { key: 'withdrawn', label: 'Withdrawn' },
  { key: 'cancelled', label: 'Cancelled' },
  { key: 'adjustments', label: 'Adjustments' },
];

function defaultRange() {
  const to = new Date();
  const from = new Date(to.getTime() - 30 * 86_400_000);
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) };
}

function AdminLedgerInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const tabParam = searchParams.get('tab');
  const tab: TabId = (['overview', 'transactions', 'revenue', 'wallet', 'balances', 'withdrawals'] as TabId[]).includes(tabParam as TabId)
    ? (tabParam as TabId)
    : 'overview';

  const [range, setRange] = useState(defaultRange);

  const [overview, setOverview] = useState<LedgerOverview | null>(null);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [overviewError, setOverviewError] = useState<DescribedError | null>(null);

  const [txStatus, setTxStatus] = useState<UnlockStatus | ''>((searchParams.get('status') as UnlockStatus | null) ?? '');
  const [txSearch, setTxSearch] = useState('');
  const [txSearchInput, setTxSearchInput] = useState('');
  const [txPage, setTxPage] = useState(1);
  const [transactions, setTransactions] = useState<LedgerTransaction[]>([]);
  const [txMeta, setTxMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 25, pages: 0 });
  const [txLoading, setTxLoading] = useState(false);
  const [txError, setTxError] = useState<DescribedError | null>(null);

  const [revenue, setRevenue] = useState<RevenueSplitRow[]>([]);
  const [revenueLoading, setRevenueLoading] = useState(false);
  const [revenueError, setRevenueError] = useState<DescribedError | null>(null);

  const [walletType, setWalletType] = useState<WalletTransactionType | ''>('');
  const [walletStatus, setWalletStatus] = useState<WalletTransactionStatus | ''>('');
  const [walletUserId, setWalletUserId] = useState(searchParams.get('userId') ?? '');
  const [walletSearch, setWalletSearch] = useState('');
  const [walletSearchInput, setWalletSearchInput] = useState('');
  const [walletPage, setWalletPage] = useState(1);
  const [walletRows, setWalletRows] = useState<WalletLedgerRow[]>([]);
  const [walletMeta, setWalletMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 25, pages: 0 });
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletError, setWalletError] = useState<DescribedError | null>(null);

  const [balances, setBalances] = useState<AgentBalanceRow[]>([]);
  const [balancesLoading, setBalancesLoading] = useState(false);
  const [balancesError, setBalancesError] = useState<DescribedError | null>(null);
  const [adjustAgent, setAdjustAgent] = useState<AgentBalanceRow | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');

  const [payoutStatus, setPayoutStatus] = useState<AgentPayoutStatus | ''>('requested');
  const [payoutPage, setPayoutPage] = useState(1);
  const [payouts, setPayouts] = useState<AgentPayout[]>([]);
  const [payoutMeta, setPayoutMeta] = useState<PageMeta>({ total: 0, page: 1, limit: 20, pages: 0 });
  const [payoutsLoading, setPayoutsLoading] = useState(false);
  const [payoutsError, setPayoutsError] = useState<DescribedError | null>(null);
  const [payoutAction, setPayoutAction] = useState<{ payout: AgentPayout; kind: 'paid' | 'reject' } | null>(null);

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/dashboard/admin/ledger?${params.toString()}`, { scroll: false });
  };

  const loadOverview = useCallback(async () => {
    setOverviewLoading(true);
    try {
      const res = await ledgerAdminApi.overview({ from: range.from || undefined, to: range.to || undefined });
      setOverview(res.data);
      setOverviewError(null);
    } catch (err) {
      setOverviewError(describeError(err, 'Could not load the ledger overview'));
    } finally {
      setOverviewLoading(false);
    }
  }, [range.from, range.to]);

  const loadTransactions = useCallback(async () => {
    setTxLoading(true);
    try {
      const res = await ledgerAdminApi.transactions({
        from: range.from || undefined,
        to: range.to || undefined,
        status: txStatus || undefined,
        search: txSearch || undefined,
        page: txPage,
        limit: 25,
      });
      setTransactions(res.data);
      setTxMeta(res.meta);
      setTxError(null);
    } catch (err) {
      setTxError(describeError(err, 'Could not load unlock transactions'));
    } finally {
      setTxLoading(false);
    }
  }, [range.from, range.to, txStatus, txSearch, txPage]);

  const loadRevenue = useCallback(async () => {
    setRevenueLoading(true);
    try {
      const res = await ledgerAdminApi.revenueSplit({ from: range.from || undefined, to: range.to || undefined });
      setRevenue(res.data);
      setRevenueError(null);
    } catch (err) {
      setRevenueError(describeError(err, 'Could not load the revenue split'));
    } finally {
      setRevenueLoading(false);
    }
  }, [range.from, range.to]);

  const loadWallet = useCallback(async () => {
    setWalletLoading(true);
    try {
      const res = await ledgerAdminApi.wallet({
        type: walletType || undefined,
        walletStatus: walletStatus || undefined,
        userId: walletUserId.trim() || undefined,
        search: walletSearch || undefined,
        page: walletPage,
        limit: 25,
      });
      setWalletRows(res.data);
      setWalletMeta(res.meta);
      setWalletError(null);
    } catch (err) {
      setWalletError(describeError(err, 'Could not load the Veriq Wallet ledger'));
    } finally {
      setWalletLoading(false);
    }
  }, [walletType, walletStatus, walletUserId, walletSearch, walletPage]);

  const loadBalances = useCallback(async () => {
    setBalancesLoading(true);
    try {
      const res = await ledgerAdminApi.agentBalances();
      setBalances(res.data);
      setBalancesError(null);
    } catch (err) {
      setBalancesError(describeError(err, 'Could not load Agent balances'));
    } finally {
      setBalancesLoading(false);
    }
  }, []);

  const loadPayouts = useCallback(async () => {
    setPayoutsLoading(true);
    try {
      const res = await ledgerAdminApi.withdrawals({ status: payoutStatus || undefined, page: payoutPage, limit: 20 });
      setPayouts(res.data);
      setPayoutMeta(res.meta);
      setPayoutsError(null);
    } catch (err) {
      setPayoutsError(describeError(err, 'Could not load withdrawals'));
    } finally {
      setPayoutsLoading(false);
    }
  }, [payoutStatus, payoutPage]);

  useEffect(() => {
    if (!ready) return;
    if (tab === 'overview') void loadOverview();
    if (tab === 'transactions') void loadTransactions();
    if (tab === 'revenue') void loadRevenue();
    if (tab === 'wallet') void loadWallet();
    if (tab === 'balances') void loadBalances();
    if (tab === 'withdrawals') void loadPayouts();
  }, [ready, tab, loadOverview, loadTransactions, loadRevenue, loadWallet, loadBalances, loadPayouts]);

  const refresh = () => {
    if (tab === 'overview') void loadOverview();
    if (tab === 'transactions') void loadTransactions();
    if (tab === 'revenue') void loadRevenue();
    if (tab === 'wallet') void loadWallet();
    if (tab === 'balances') void loadBalances();
    if (tab === 'withdrawals') void loadPayouts();
  };

  const adjustValue = Number(adjustAmount);
  const adjustValid = adjustAmount.trim() !== '' && Number.isInteger(adjustValue) && adjustValue !== 0;

  const confirmAdjustment = async (note: string) => {
    if (!adjustAgent || !adjustValid) return;
    try {
      const res = await ledgerAdminApi.adjust({ agentId: adjustAgent.agentId, amount: adjustValue, note });
      success(res.message);
      setAdjustAgent(null);
      setAdjustAmount('');
      void loadBalances();
    } catch (err) {
      toastError(errorText(err, 'Could not record the adjustment'));
    }
  };

  const confirmPayout = async (note: string) => {
    if (!payoutAction) return;
    try {
      const res =
        payoutAction.kind === 'paid'
          ? await ledgerAdminApi.markPayoutPaid(payoutAction.payout.id, note || undefined)
          : await ledgerAdminApi.rejectPayout(payoutAction.payout.id, note || undefined);
      success(res.message);
      setPayoutAction(null);
      void loadPayouts();
      void loadBalances();
    } catch (err) {
      toastError(errorText(err, 'Could not update the withdrawal'));
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const rangeControls = (
    <div className="card flex flex-col gap-3 p-4 hover:shadow-card sm:flex-row sm:items-end">
      <div>
        <label className="label text-xs" htmlFor="ledger-from">From</label>
        <input id="ledger-from" type="date" className="input" value={range.from} onChange={(event) => setRange((r) => ({ ...r, from: event.target.value }))} />
      </div>
      <div>
        <label className="label text-xs" htmlFor="ledger-to">To</label>
        <input id="ledger-to" type="date" className="input" value={range.to} onChange={(event) => setRange((r) => ({ ...r, to: event.target.value }))} />
      </div>
      <button type="button" onClick={() => { setTxPage(1); refresh(); }} className="btn-outline !py-2.5 !text-sm">Apply range</button>
      <p className="text-xs text-slate-500 sm:ml-auto">Unlock and revenue figures use settlement dates in this range.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={Landmark}
        eyebrow="Finance"
        title="Ledger"
        description="One ledger over separate immutable records: unlock payments, the Veriq Wallet ledger, Agent earnings and payouts. Historical rows are never rewritten; corrections are explicit adjustments."
        onRefresh={refresh}
        refreshing={overviewLoading || txLoading || walletLoading || balancesLoading || payoutsLoading || revenueLoading}
      />

      <Tabs<TabId>
        label="Ledger tabs"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'overview', label: 'Overview' },
          { id: 'transactions', label: 'Unlock Transactions' },
          { id: 'revenue', label: 'Revenue Split' },
          { id: 'wallet', label: 'Veriq Wallet' },
          { id: 'balances', label: 'Agent Balances' },
          { id: 'withdrawals', label: 'Withdrawals' },
        ]}
      />

      {tab === 'overview' && (
        <div className="space-y-4">
          {rangeControls}
          {overviewError && <ErrorPanel error={overviewError} onRetry={() => void loadOverview()} />}
          {overviewLoading && !overview ? (
            <LoadingBlock />
          ) : overview ? (
            <>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <StatCard icon={Coins} label="Gross unlock revenue" value={naira(overview.revenue.gross)} sub={`${overview.unlocks.count.toLocaleString('en-NG')} settled unlocks`} />
                <StatCard icon={Landmark} tone="blue" label="Veriq share" value={naira(overview.revenue.veriqShare)} sub="Recorded on each unlock" />
                <StatCard icon={Users} tone="purple" label="Agent share" value={naira(overview.revenue.agentShare)} sub="Earnings created from unlocks" />
                <StatCard icon={Gift} tone="slate" label="Free unlocks" value={overview.unlocks.freeUnlocks.toLocaleString('en-NG')} sub="₦0 charge · no Agent earning" />
                <StatCard icon={Wallet} tone="green" label="Wallet-funded" value={naira(overview.revenue.walletFunded)} sub="Paid with renter wallet credit" />
                <StatCard icon={Banknote} tone="green" label="Externally funded" value={naira(overview.revenue.externallyFunded)} sub="Collected at checkout" />
                <StatCard icon={Undo2} tone="amber" label="Refunds credited" value={naira(overview.refunds.credited)} sub={`${overview.refunds.approved} approved · ${overview.refunds.open} open`} />
                <StatCard icon={AlertTriangle} tone={overview.paymentExceptions > 0 ? 'red' : 'slate'} label="Payment exceptions" value={overview.paymentExceptions} sub="Duplicate or failed charges to review" />
              </div>

              <Panel title="Agent earnings balances" description="Totals across all Agents, by earning state.">
                <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-4 lg:grid-cols-7">
                  {BUCKET_LABELS.map(({ key, label }) => (
                    <div key={key} className="rounded-xl bg-slate-50 p-3">
                      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                      <p className="mt-1 text-sm font-bold text-navy-900">{naira(overview.agentBalances[key] ?? 0)}</p>
                    </div>
                  ))}
                </div>
              </Panel>

              <div className="flex flex-wrap gap-2">
                <button type="button" onClick={() => setTab('transactions')} className="btn-outline !py-2.5 !text-sm">Review unlock transactions</button>
                <Link href="/dashboard/admin/refunds" className="btn-outline !py-2.5 !text-sm"><Undo2 className="h-4 w-4" /> Refund queue</Link>
                <button type="button" onClick={() => setTab('withdrawals')} className="btn-outline !py-2.5 !text-sm">Pending withdrawals</button>
              </div>
            </>
          ) : null}
        </div>
      )}

      {tab === 'transactions' && (
        <div className="space-y-4">
          {rangeControls}
          <div className="card grid grid-cols-1 gap-3 p-4 hover:shadow-card sm:grid-cols-[1fr_220px]">
            <form
              onSubmit={(event) => { event.preventDefault(); setTxPage(1); setTxSearch(txSearchInput.trim()); }}
              className="relative"
            >
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search unlock transactions" className="input !pl-9" value={txSearchInput} onChange={(event) => setTxSearchInput(event.target.value)} placeholder="Payment reference or renter email — press Enter" />
            </form>
            <select aria-label="Unlock status" className="input" value={txStatus} onChange={(event) => { setTxPage(1); setTxStatus(event.target.value as UnlockStatus | ''); }}>
              <option value="">All statuses</option>
              {UNLOCK_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
          </div>
          {txError && <ErrorPanel error={txError} onRetry={() => void loadTransactions()} />}
          <Panel title="Unlock transactions" description="Every settled, failed and duplicate charge. Amounts are the values recorded at checkout.">
            {txLoading && transactions.length === 0 ? (
              <LoadingBlock />
            ) : transactions.length === 0 ? (
              <EmptyState icon={Coins} title="No unlock transactions in this range" />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[1080px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={th}>Created</th>
                        <th className={th}>Renter</th>
                        <th className={th}>Listing</th>
                        <th className={th}>Status</th>
                        <th className={`${th} text-right`}>Charged</th>
                        <th className={`${th} text-right`}>Veriq / Agent</th>
                        <th className={th}>Reference</th>
                        <th className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {transactions.map((tx) => (
                        <tr key={tx.id} className="hover:bg-slate-50/60">
                          <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(tx.createdAt)}</span></td>
                          <td className={td}>
                            <p className="text-xs font-semibold">{tx.user ? `${tx.user.firstName} ${tx.user.lastName}`.trim() : 'Unknown'}</p>
                            <p className="text-[11px] text-slate-500">{tx.user?.email ?? tx.id}</p>
                          </td>
                          <td className={td}>
                            <p className="text-xs">{TARGET_LABELS[tx.targetType] ?? humanize(tx.targetType)}</p>
                            <p className="break-all font-mono text-[11px] text-slate-400">{tx.propertyId ?? tx.sharedOpportunityId ?? tx.saleListingId ?? '—'}</p>
                          </td>
                          <td className={td}>
                            <StatusBadge status={tx.status} />
                            {tx.failureReason && <p className="mt-1 max-w-[180px] text-[11px] text-red-600">{tx.failureReason}</p>}
                          </td>
                          <td className={`${td} text-right`}>
                            <p className="whitespace-nowrap font-semibold">{naira(tx.feeAmount)}</p>
                            <p className="whitespace-nowrap text-[11px] text-slate-500">{naira(tx.walletAmount)} wallet · {naira(tx.externalAmount)} direct</p>
                            {tx.priceSource && <p className="whitespace-nowrap text-[11px] text-slate-400">{humanize(tx.priceSource)}</p>}
                          </td>
                          <td className={`${td} text-right`}>
                            <p className="whitespace-nowrap text-xs">{naira(tx.platformShareAmount ?? 0)} / {naira(tx.agentShareAmount ?? 0)}</p>
                            {tx.agentSharePercent !== null && <p className="whitespace-nowrap text-[11px] text-slate-500">{Number(tx.agentSharePercent)}% Agent share</p>}
                          </td>
                          <td className={td}>
                            <p className="break-all font-mono text-[11px]">{tx.paymentReference ?? '—'}</p>
                            <p className="text-[11px] text-slate-500">{tx.paymentProvider ? humanize(tx.paymentProvider) : ''}{tx.settledAt ? ` · settled ${dateOnly(tx.settledAt)}` : ''}</p>
                          </td>
                          <td className={`${td} text-right`}>
                            <Link href={`/dashboard/admin/refunds?unlockId=${encodeURIComponent(tx.id)}`} className="whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50">
                              Refund case
                            </Link>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <Pagination page={txMeta.page} pages={txMeta.pages} total={txMeta.total} onChange={setTxPage} noun="transactions" />
              </>
            )}
          </Panel>
        </div>
      )}

      {tab === 'revenue' && (
        <div className="space-y-4">
          {rangeControls}
          {revenueError && <ErrorPanel error={revenueError} onRetry={() => void loadRevenue()} />}
          <Panel title="Revenue split by Veriq Agent" description="Gross is the configured unlock price the Agent share was calculated on. Veriq keeps the remainder. Cancelled earnings come from approved unlock-purchase refunds.">
            {revenueLoading && revenue.length === 0 ? (
              <LoadingBlock />
            ) : revenue.length === 0 ? (
              <EmptyState icon={Users} title="No earnings recorded in this range" />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[760px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Veriq Agent</th>
                      <th className={`${th} text-right`}>Unlocks</th>
                      <th className={`${th} text-right`}>Gross</th>
                      <th className={`${th} text-right`}>Agent share</th>
                      <th className={`${th} text-right`}>Veriq share</th>
                      <th className={`${th} text-right`}>Cancelled</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {revenue.map((row) => (
                      <tr key={row.agentId} className="hover:bg-slate-50/60">
                        <td className={td}>
                          <p className="font-semibold">{row.agentName?.trim() || row.agentId}</p>
                          <p className="font-mono text-[11px] text-slate-400">{row.agentId}</p>
                        </td>
                        <td className={`${td} text-right`}>{row.unlocks.toLocaleString('en-NG')}</td>
                        <td className={`${td} whitespace-nowrap text-right`}>{naira(row.gross)}</td>
                        <td className={`${td} whitespace-nowrap text-right font-semibold`}>{naira(row.agentShare)}</td>
                        <td className={`${td} whitespace-nowrap text-right`}>{naira(Math.max(0, row.gross - row.agentShare))}</td>
                        <td className={`${td} whitespace-nowrap text-right text-slate-500`}>{naira(row.cancelled)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>
      )}

      {tab === 'wallet' && (
        <div className="space-y-4">
          <div className="card grid grid-cols-1 gap-3 p-4 hover:shadow-card sm:grid-cols-2 lg:grid-cols-4">
            <form onSubmit={(event) => { event.preventDefault(); setWalletPage(1); setWalletSearch(walletSearchInput.trim()); }} className="relative lg:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input aria-label="Search the wallet ledger" className="input !pl-9" value={walletSearchInput} onChange={(event) => setWalletSearchInput(event.target.value)} placeholder="Name, email, reference or description — press Enter" />
            </form>
            <select aria-label="Transaction type" className="input" value={walletType} onChange={(event) => { setWalletPage(1); setWalletType(event.target.value as WalletTransactionType | ''); }}>
              <option value="">All types</option>
              {WALLET_TRANSACTION_TYPES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
            <select aria-label="Transaction status" className="input" value={walletStatus} onChange={(event) => { setWalletPage(1); setWalletStatus(event.target.value as WalletTransactionStatus | ''); }}>
              <option value="">All statuses</option>
              {WALLET_TRANSACTION_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
            <div className="lg:col-span-2">
              <label className="label text-xs" htmlFor="wallet-user">Filter by renter user ID</label>
              <div className="flex gap-2">
                <input id="wallet-user" className="input font-mono" value={walletUserId} onChange={(event) => setWalletUserId(event.target.value)} placeholder="Exact user ID" />
                <button type="button" onClick={() => { setWalletPage(1); void loadWallet(); }} className="btn-outline !px-4 !py-2.5 !text-sm">Apply</button>
              </div>
            </div>
          </div>
          {walletError && <ErrorPanel error={walletError} onRetry={() => void loadWallet()} />}
          <Panel title="Veriq Wallet ledger" description="Renter wallet credits and debits. Approved refunds are credited here; renters are never asked to top up.">
            {walletLoading && walletRows.length === 0 ? (
              <LoadingBlock />
            ) : walletRows.length === 0 ? (
              <EmptyState icon={Wallet} title="No wallet transactions match" />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[900px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={th}>When</th>
                        <th className={th}>Account</th>
                        <th className={th}>Type</th>
                        <th className={`${th} text-right`}>Amount</th>
                        <th className={`${th} text-right`}>Balance after</th>
                        <th className={th}>Status</th>
                        <th className={th}>Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {walletRows.map((row) => (
                        <tr key={row.id} className="hover:bg-slate-50/60">
                          <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(row.createdAt)}</span></td>
                          <td className={td}>
                            <p className="text-xs font-semibold">{row.user?.name?.trim() || 'Unknown'}</p>
                            <p className="text-[11px] text-slate-500">{row.user?.email ?? row.userId}</p>
                          </td>
                          <td className={td}><StatusBadge status={row.type} label={humanize(row.type)} tone={row.type === 'refund' ? 'green' : row.type === 'debit' ? 'slate' : 'blue'} /></td>
                          <td className={`${td} whitespace-nowrap text-right font-semibold`}>{naira(row.amount)}</td>
                          <td className={`${td} whitespace-nowrap text-right text-slate-500`}>{row.balanceAfter === null ? '—' : naira(row.balanceAfter)}</td>
                          <td className={td}><StatusBadge status={row.status} /></td>
                          <td className={td}>
                            <p className="max-w-[240px] text-xs text-slate-600">{row.description || '—'}</p>
                            {row.paymentReference && <p className="break-all font-mono text-[11px] text-slate-400">{row.paymentReference}</p>}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <Pagination page={walletMeta.page} pages={walletMeta.pages} total={walletMeta.total} onChange={setWalletPage} noun="wallet entries" />
              </>
            )}
          </Panel>
        </div>
      )}

      {tab === 'balances' && (
        <div className="space-y-4">
          {balancesError && <ErrorPanel error={balancesError} onRetry={() => void loadBalances()} />}
          <Panel title="Agent balances" description="Earning states per Agent. Corrections after withdrawal are explicit adjustments, never silent edits.">
            {balancesLoading && balances.length === 0 ? (
              <LoadingBlock />
            ) : balances.length === 0 ? (
              <EmptyState icon={Users} title="No Agent balances yet" />
            ) : (
              <TableScroll>
                <table className="w-full min-w-[1040px]">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className={th}>Agent</th>
                      {BUCKET_LABELS.map(({ key, label }) => (
                        <th key={key} className={`${th} text-right`}>{label}</th>
                      ))}
                      <th className={th}><span className="sr-only">Actions</span></th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {balances.map((row) => (
                      <tr key={row.agentId} className="hover:bg-slate-50/60">
                        <td className={td}>
                          <p className="font-semibold">{row.agentName?.trim() || row.agentId}</p>
                          <StatusBadge status={row.isActive ? 'active' : 'suspended'} />
                        </td>
                        {BUCKET_LABELS.map(({ key }) => (
                          <td key={key} className={`${td} whitespace-nowrap text-right`}>
                            {key === 'adjustments' ? signedNaira(row.buckets[key]) : naira(row.buckets[key])}
                          </td>
                        ))}
                        <td className={`${td} text-right`}>
                          <button type="button" onClick={() => { setAdjustAmount(''); setAdjustAgent(row); }} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-navy-700 hover:bg-slate-50">
                            <Plus className="h-3.5 w-3.5" /> Adjustment
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableScroll>
            )}
          </Panel>
        </div>
      )}

      {tab === 'withdrawals' && (
        <div className="space-y-4">
          <div className="card flex flex-col gap-3 p-4 hover:shadow-card sm:flex-row sm:items-center">
            <select aria-label="Withdrawal status" className="input sm:!w-56" value={payoutStatus} onChange={(event) => { setPayoutPage(1); setPayoutStatus(event.target.value as AgentPayoutStatus | ''); }}>
              <option value="">All withdrawals</option>
              {PAYOUT_STATUSES.map((value) => <option key={value} value={value}>{humanize(value)}</option>)}
            </select>
            <p className="text-xs text-slate-500">Mark a withdrawal paid only after the bank transfer is complete. Rejecting returns the amount to withdrawable.</p>
          </div>
          {payoutsError && <ErrorPanel error={payoutsError} onRetry={() => void loadPayouts()} />}
          <Panel title="Withdrawals" description="Agent payout requests drawn from withdrawable earnings.">
            {payoutsLoading && payouts.length === 0 ? (
              <LoadingBlock />
            ) : payouts.length === 0 ? (
              <EmptyState icon={Banknote} title="No withdrawals in this view" />
            ) : (
              <>
                <TableScroll>
                  <table className="w-full min-w-[960px]">
                    <thead className="bg-slate-50">
                      <tr>
                        <th className={th}>Requested</th>
                        <th className={th}>Agent</th>
                        <th className={`${th} text-right`}>Amount</th>
                        <th className={th}>Payout details</th>
                        <th className={th}>Status</th>
                        <th className={th}>Decision</th>
                        <th className={th}><span className="sr-only">Actions</span></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {payouts.map((payout) => (
                        <tr key={payout.id} className="hover:bg-slate-50/60">
                          <td className={td}>
                            <p className="whitespace-nowrap text-xs">{dateTime(payout.createdAt)}</p>
                            <p className="break-all font-mono text-[11px] text-slate-400">{payout.reference}</p>
                          </td>
                          <td className={td}>
                            <p className="text-xs font-semibold">{payout.agentName?.trim() || payout.agentId}</p>
                            {payout.note && <p className="max-w-[180px] text-[11px] text-slate-500">{payout.note}</p>}
                          </td>
                          <td className={`${td} whitespace-nowrap text-right font-bold`}>{naira(payout.amount)}</td>
                          <td className={td}>
                            <p className="text-xs">{payout.bankSnapshot?.bankName ?? '—'}</p>
                            <p className="text-[11px] text-slate-500">{payout.bankSnapshot?.bankAccountName ?? ''}</p>
                            <p className="font-mono text-[11px] text-slate-500">{payout.bankSnapshot?.bankAccountNumber ?? ''}</p>
                          </td>
                          <td className={td}><StatusBadge status={payout.status} /></td>
                          <td className={td}>
                            <p className="whitespace-nowrap text-[11px] text-slate-500">{payout.decidedAt ? dateTime(payout.decidedAt) : 'Awaiting decision'}</p>
                            {payout.decisionNote && <p className="max-w-[180px] text-[11px] text-slate-600">{payout.decisionNote}</p>}
                          </td>
                          <td className={`${td} text-right`}>
                            {payout.status === 'requested' && (
                              <div className="flex justify-end gap-1.5">
                                <button type="button" onClick={() => setPayoutAction({ payout, kind: 'reject' })} className="whitespace-nowrap rounded-lg border border-red-200 px-2.5 py-1.5 text-xs font-bold text-red-600 hover:bg-red-50">Reject</button>
                                <button type="button" onClick={() => setPayoutAction({ payout, kind: 'paid' })} className="whitespace-nowrap rounded-lg bg-emerald-600 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-emerald-700">Mark paid</button>
                              </div>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </TableScroll>
                <Pagination page={payoutMeta.page} pages={payoutMeta.pages} total={payoutMeta.total} onChange={setPayoutPage} noun="withdrawals" />
              </>
            )}
          </Panel>
        </div>
      )}

      <ReasonDialog
        isOpen={!!adjustAgent}
        onClose={() => setAdjustAgent(null)}
        onConfirm={confirmAdjustment}
        title="Record an earnings adjustment"
        confirmLabel="Record adjustment"
        reasonLabel="Reason for the adjustment (recorded on the earning and in the audit log)"
        maxLength={300}
        canConfirm={adjustValid}
        acknowledgement="I understand this creates a new, immediately withdrawable adjustment entry and does not edit any existing earning."
        message={
          adjustAgent ? (
            <div className="space-y-2">
              <p><strong className="text-navy-900">{adjustAgent.agentName?.trim() || adjustAgent.agentId}</strong> · withdrawable today {naira(adjustAgent.buckets.withdrawable)}</p>
              <p className="text-xs text-slate-500">Use a negative amount to correct an overpayment and a positive amount to credit an owed sum.</p>
            </div>
          ) : null
        }
      >
        <div>
          <label className="label text-xs" htmlFor="adjust-amount">Amount (₦, whole naira, may be negative)</label>
          <input id="adjust-amount" type="number" step={1} className="input" value={adjustAmount} onChange={(event) => setAdjustAmount(event.target.value)} />
          <p className="mt-1 text-[11px] text-slate-500">{adjustValid ? signedNaira(adjustValue) : 'Enter a non-zero whole number.'}</p>
        </div>
      </ReasonDialog>

      <ReasonDialog
        isOpen={!!payoutAction}
        onClose={() => setPayoutAction(null)}
        onConfirm={confirmPayout}
        title={payoutAction?.kind === 'paid' ? 'Mark withdrawal paid' : 'Reject withdrawal'}
        confirmLabel={payoutAction?.kind === 'paid' ? 'Mark as paid' : 'Reject withdrawal'}
        variant={payoutAction?.kind === 'paid' ? 'primary' : 'danger'}
        reasonRequired={payoutAction?.kind !== 'paid'}
        reasonLabel={payoutAction?.kind === 'paid' ? 'Payment note (optional, e.g. bank transfer reference)' : 'Reason shown to the Agent'}
        maxLength={300}
        acknowledgement={payoutAction?.kind === 'paid' ? 'I confirm the bank transfer has been completed outside Veriq.' : undefined}
        message={
          payoutAction ? (
            <p>
              {naira(payoutAction.payout.amount)} to <strong className="text-navy-900">{payoutAction.payout.agentName?.trim() || payoutAction.payout.agentId}</strong>
              {payoutAction.kind === 'paid'
                ? '. The allocated earnings become Withdrawn.'
                : '. The allocations are voided and the amount stays withdrawable for the Agent.'}
            </p>
          ) : null
        }
      />
    </div>
  );
}

export default function AdminLedgerPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminLedgerInner />
    </Suspense>
  );
}
