'use client';

import React, { Suspense, useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ArrowRight, Gift, KeyRound, Pencil, Power, RotateCcw, Save, Tag } from 'lucide-react';
import { assignmentsAdminApi, businessRulesAdminApi, pricingAdminApi } from '@/lib/api/admin';
import type {
  BusinessRuleOverview,
  FreeUnlockRule,
  FreeUnlockRuleStatus,
  ListingPricingView,
  SelectorListing,
} from '@/types/admin';
import { FREE_UNLOCK_STATUSES, PROPERTY_CATEGORIES, VERIQ_MANAGED_OPERATOR_ID } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { OperatorListingSelector } from '@/components/admin/OperatorListingSelector';
import { ReasonDialog } from '@/components/admin/ReasonDialog';
import { useAgentDirectory } from '@/components/admin/useAgentDirectory';
import {
  categoryLabel,
  dateTime,
  describeError,
  errorText,
  fromLocalInput,
  humanize,
  naira,
  toLocalInput,
  type DescribedError,
} from '@/components/admin/format';
import {
  AdminPageHeader,
  EmptyState,
  ErrorPanel,
  KeyValue,
  LoadingBlock,
  Panel,
  StatusBadge,
  TableScroll,
  Tabs,
  td,
  th,
  useAdminGuard,
} from '@/components/admin/ui';

type TabId = 'pricing' | 'free-unlock';

const PRICE_SOURCE_LABELS: Record<string, string> = {
  listing_override: 'Listing override',
  category: 'Category price',
  global: 'Global price',
  default: 'Launch default',
};

const TARGET_LABELS: Record<string, string> = {
  property: 'Property',
  shared_opportunity: 'Shared opportunity',
  sale_listing: 'Sale listing',
};

// ─── Property Pricing ─────────────────────────────────────────────────────

function PropertyPricingTab({
  initialOperatorId,
  initialQuery,
  agentName,
}: {
  initialOperatorId: string | null;
  initialQuery: string;
  agentName: (id: string | null) => string;
}) {
  const { success, error: toastError } = useToast();
  const [priceRule, setPriceRule] = useState<BusinessRuleOverview | null>(null);
  const [ruleError, setRuleError] = useState<DescribedError | null>(null);
  const [ruleLoading, setRuleLoading] = useState(true);

  const [selected, setSelected] = useState<SelectorListing | null>(null);
  const [pricing, setPricing] = useState<ListingPricingView | null>(null);
  const [pricingLoading, setPricingLoading] = useState(false);
  const [pricingError, setPricingError] = useState<DescribedError | null>(null);
  const [priceInput, setPriceInput] = useState('');
  const [pendingAction, setPendingAction] = useState<'save' | 'default' | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);

  const loadRule = useCallback(async () => {
    setRuleLoading(true);
    try {
      const res = await businessRulesAdminApi.overview();
      setPriceRule(res.data.rules.find((rule) => rule.key === 'unlock_price_naira') ?? null);
      setRuleError(null);
    } catch (err) {
      setRuleError(describeError(err, 'Could not load category default prices'));
    } finally {
      setRuleLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadRule();
  }, [loadRule]);

  const loadPricing = useCallback(async (listing: SelectorListing) => {
    setPricingLoading(true);
    try {
      const res = await pricingAdminApi.listingPricing(listing.targetType, listing.targetId);
      setPricing(res.data);
      setPriceInput(res.data.overridePrice === null ? '' : String(res.data.overridePrice));
      setPricingError(null);
    } catch (err) {
      setPricingError(describeError(err, 'Could not load listing pricing'));
    } finally {
      setPricingLoading(false);
    }
  }, []);

  const selectListing = (listing: SelectorListing) => {
    setSelected(listing);
    setPricing(null);
    void loadPricing(listing);
  };

  const onOperatorChange = useCallback(() => {
    setSelected(null);
    setPricing(null);
  }, []);

  const min = priceRule?.min ?? 0;
  const max = priceRule?.max ?? 1_000_000;
  const priceValue = Number(priceInput);
  const priceValid = priceInput.trim() !== '' && Number.isInteger(priceValue) && priceValue >= min && priceValue <= max;

  const confirm = async (reason: string) => {
    if (!selected || !pendingAction) return;
    try {
      const res = await pricingAdminApi.setListingPrice({
        targetType: selected.targetType,
        targetId: selected.targetId,
        priceNaira: pendingAction === 'default' ? null : priceValue,
        reason,
      });
      success(res.message);
      setPendingAction(null);
      setRefreshKey((key) => key + 1);
      void loadPricing(selected);
    } catch (err) {
      toastError(errorText(err, 'Could not save the listing price'));
    }
  };

  return (
    <div className="space-y-6">
      <Panel
        title="Category default prices"
        description="Default unlock prices are Business Rules: a global price with optional category overrides, effective-dated and never retroactive."
        actions={
          <Link href="/dashboard/admin/business-rules#rule-unlock_price_naira" className="btn-outline !px-3 !py-2 !text-xs">
            Edit in Business Rules <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        }
      >
        {ruleError ? (
          <div className="p-4"><ErrorPanel error={ruleError} onRetry={() => void loadRule()} /></div>
        ) : ruleLoading ? (
          <LoadingBlock />
        ) : priceRule ? (
          <div className="grid grid-cols-2 gap-2 p-4 sm:grid-cols-3 lg:grid-cols-6">
            <KeyValue label="Global price" value={<span className="text-sm font-bold">{naira(priceRule.currentValue)}</span>} />
            {PROPERTY_CATEGORIES.map((category) => {
              const override = priceRule.categoryValues?.[category] ?? null;
              return (
                <KeyValue
                  key={category}
                  label={categoryLabel(category)}
                  value={
                    <span>
                      <span className="text-sm font-bold">{naira(override ?? priceRule.currentValue)}</span>
                      <span className="block text-[10px] text-muted-foreground">{override === null ? 'Uses global' : 'Category override'}</span>
                    </span>
                  }
                />
              );
            })}
            {priceRule.scheduled.length > 0 && (
              <p className="col-span-full text-xs text-muted-foreground">{priceRule.scheduled.length} scheduled price change{priceRule.scheduled.length === 1 ? '' : 's'} pending — see Business Rules.</p>
            )}
          </div>
        ) : (
          <EmptyState title="Unlock price rule not found" />
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <OperatorListingSelector
          listingPrompt="Select a listing to price"
          selectedTargetId={selected?.targetId}
          onSelectListing={selectListing}
          onOperatorChange={onOperatorChange}
          refreshKey={refreshKey}
          initialOperatorId={initialOperatorId}
          initialQuery={initialQuery}
          agentName={agentName}
        />

        <div className="xl:sticky xl:top-24 xl:self-start">
          {!selected ? (
            <div className="card p-6 hover:shadow-card">
              <EmptyState icon={Tag} title="No listing selected" description="Choose a Property Operator, then a listing, to see its effective price and set a listing-level price." />
            </div>
          ) : (
            <Panel title="Listing price" description={selected.title}>
              {pricingError ? (
                <div className="p-4"><ErrorPanel error={pricingError} onRetry={() => void loadPricing(selected)} /></div>
              ) : pricingLoading && !pricing ? (
                <LoadingBlock />
              ) : pricing ? (
                <div className="space-y-4 p-4">
                  <div className="grid grid-cols-2 gap-2">
                    <KeyValue label="Effective price" value={<span className="text-base font-black">{naira(pricing.effectivePrice)}</span>} />
                    <KeyValue label="Source" value={PRICE_SOURCE_LABELS[pricing.effectiveSource] ?? humanize(pricing.effectiveSource)} />
                    <KeyValue label={`Default (${categoryLabel(pricing.listing.category)})`} value={naira(pricing.defaultPrice)} />
                    <KeyValue label="Listing override" value={pricing.overridePrice === null ? 'None' : naira(pricing.overridePrice)} />
                  </div>
                  {pricing.freeUnlockActive && (
                    <p className="rounded-lg bg-[#fbbf2410] p-3 text-xs text-[#fcd34d]">
                      A Free Unlock is active, so renters currently pay ₦0. Changing the price here does not change the Free Unlock rule, and the stored price applies once the Free Unlock ends.
                    </p>
                  )}
                  <div>
                    <label className="label text-xs" htmlFor="listing-price">Property price (₦)</label>
                    <input id="listing-price" type="number" min={min} max={max} step={1} className="input" value={priceInput} onChange={(event) => setPriceInput(event.target.value)} placeholder={`Default ${naira(pricing.defaultPrice)}`} />
                    <p className="mt-1 text-[11px] text-muted-foreground">
                      {priceInput.trim() !== '' && !priceValid ? `Whole naira between ${naira(min)} and ${naira(max)}.` : priceInput.trim() !== '' ? naira(priceValue) : 'Enter a price to override the default.'}
                    </p>
                  </div>
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <button type="button" disabled={!priceValid || priceValue === pricing.overridePrice} onClick={() => setPendingAction('save')} className="btn-primary flex-1 !py-2.5 !text-sm">
                      <Save className="h-4 w-4" /> Save Property Price
                    </button>
                    <button type="button" disabled={pricing.overridePrice === null} onClick={() => setPendingAction('default')} className="btn-outline flex-1 !py-2.5 !text-sm">
                      <RotateCcw className="h-4 w-4" /> Use Default Price
                    </button>
                  </div>
                  <p className="text-[11px] text-muted-foreground">Price changes apply to new unlocks from now. Existing unlocks keep the price recorded at checkout.</p>

                  <div>
                    <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-muted-foreground">Price history</h3>
                    {pricing.history.length === 0 ? (
                      <p className="text-xs text-muted-foreground">No listing-level price changes recorded.</p>
                    ) : (
                      <ul className="divide-y divide-[#ffffff12] rounded-lg border border-[#ffffff12]">
                        {pricing.history.map((row) => (
                          <li key={row.id} className="px-3 py-2 text-xs">
                            <div className="flex items-center justify-between gap-2">
                              <span className="font-semibold text-foreground">{row.priceNaira === null ? 'Reset to default' : naira(row.priceNaira)}</span>
                              <span className="whitespace-nowrap text-muted-foreground">{dateTime(row.effectiveFrom)}</span>
                            </div>
                            {row.reason && <p className="mt-0.5 text-muted-foreground">{row.reason}</p>}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              ) : null}
            </Panel>
          )}
        </div>
      </div>

      <ReasonDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={confirm}
        title={pendingAction === 'default' ? 'Use default price' : 'Save property price'}
        confirmLabel={pendingAction === 'default' ? 'Use default price' : 'Save price'}
        acknowledgement="I understand this applies to new unlocks only; completed unlocks, refunds and earnings keep their recorded price."
        message={
          selected && pricing ? (
            pendingAction === 'default' ? (
              <p><strong className="text-foreground">{selected.title}</strong> returns to the default price of {naira(pricing.defaultPrice)} for new unlocks.</p>
            ) : (
              <p><strong className="text-foreground">{selected.title}</strong> will cost <strong className="text-foreground">{naira(priceValue)}</strong> to unlock (currently {naira(pricing.effectivePrice)}).</p>
            )
          ) : null
        }
      />
    </div>
  );
}

// ─── Free Unlock Management ───────────────────────────────────────────────

function FreeUnlockTab({
  initialOperatorId,
  initialQuery,
  agentName,
}: {
  initialOperatorId: string | null;
  initialQuery: string;
  agentName: (id: string | null) => string;
}) {
  const { success, error: toastError } = useToast();
  const [statusFilter, setStatusFilter] = useState<FreeUnlockRuleStatus | 'open' | ''>('open');
  const [rules, setRules] = useState<FreeUnlockRule[]>([]);
  const [rulesLoading, setRulesLoading] = useState(true);
  const [rulesError, setRulesError] = useState<DescribedError | null>(null);

  const [selected, setSelected] = useState<SelectorListing | null>(null);
  const [listingRules, setListingRules] = useState<FreeUnlockRule[]>([]);
  const [startMode, setStartMode] = useState<'now' | 'scheduled'>('now');
  const [startsAt, setStartsAt] = useState('');
  const [endsAt, setEndsAt] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  const [editRule, setEditRule] = useState<FreeUnlockRule | null>(null);
  const [editStartsAt, setEditStartsAt] = useState('');
  const [editEndsAt, setEditEndsAt] = useState('');
  const [disableRule, setDisableRule] = useState<FreeUnlockRule | null>(null);

  const loadRules = useCallback(async () => {
    setRulesLoading(true);
    try {
      const res = await pricingAdminApi.freeUnlockRules(
        statusFilter && statusFilter !== 'open' ? { status: statusFilter } : {},
      );
      setRules(statusFilter === 'open' ? res.data.filter((rule) => rule.status === 'active' || rule.status === 'scheduled') : res.data);
      setRulesError(null);
    } catch (err) {
      setRulesError(describeError(err, 'Could not load Free Unlock rules'));
    } finally {
      setRulesLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    void loadRules();
  }, [loadRules]);

  const loadListingRules = useCallback(async (listing: SelectorListing) => {
    try {
      const res = await pricingAdminApi.freeUnlockRules({ targetType: listing.targetType, targetId: listing.targetId });
      setListingRules(res.data);
    } catch (err) {
      setListingRules([]);
      toastError(errorText(err, 'Could not load this listing’s Free Unlock rules'));
    }
  }, [toastError]);

  const selectListing = (listing: SelectorListing) => {
    setSelected(listing);
    setStartMode('now');
    setStartsAt('');
    setEndsAt('');
    void loadListingRules(listing);
  };

  const onOperatorChange = useCallback(() => {
    setSelected(null);
    setListingRules([]);
  }, []);

  const refreshAll = () => {
    void loadRules();
    setRefreshKey((key) => key + 1);
    if (selected) void loadListingRules(selected);
  };

  const scheduleError = useMemo(() => {
    const now = Date.now();
    const start = startMode === 'scheduled' && startsAt ? new Date(startsAt).getTime() : now;
    if (startMode === 'scheduled' && !startsAt) return 'Choose a start date and time.';
    if (endsAt) {
      const end = new Date(endsAt).getTime();
      if (end <= now) return 'The end must be in the future.';
      if (end <= start) return 'The end must be after the start.';
    }
    return null;
  }, [startMode, startsAt, endsAt]);

  const confirmCreate = async (reason: string) => {
    if (!selected) return;
    try {
      const res = await pricingAdminApi.createFreeUnlock({
        targetType: selected.targetType,
        targetId: selected.targetId,
        startsAt: startMode === 'scheduled' ? fromLocalInput(startsAt) : undefined,
        endsAt: fromLocalInput(endsAt) ?? null,
        reason,
      });
      success(res.message);
      setCreateOpen(false);
      setStartMode('now');
      setStartsAt('');
      setEndsAt('');
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not save the Free Unlock rule'));
    }
  };

  const openEdit = (rule: FreeUnlockRule) => {
    setEditRule(rule);
    setEditStartsAt(toLocalInput(rule.startsAt));
    setEditEndsAt(toLocalInput(rule.endsAt));
  };

  const editError = useMemo(() => {
    if (!editRule) return null;
    const start = editRule.status === 'scheduled' ? new Date(editStartsAt).getTime() : new Date(editRule.startsAt).getTime();
    if (editRule.status === 'scheduled' && !editStartsAt) return 'Choose a start date and time.';
    if (editEndsAt && new Date(editEndsAt).getTime() <= start) return 'The end must be after the start.';
    return null;
  }, [editRule, editStartsAt, editEndsAt]);

  const confirmEdit = async (reason: string) => {
    if (!editRule) return;
    try {
      const res = await pricingAdminApi.updateFreeUnlock(editRule.id, {
        startsAt: editRule.status === 'scheduled' ? fromLocalInput(editStartsAt) : undefined,
        endsAt: fromLocalInput(editEndsAt) ?? null,
        reason,
      });
      success(res.message);
      setEditRule(null);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not update the Free Unlock rule'));
    }
  };

  const confirmDisable = async (reason: string) => {
    if (!disableRule) return;
    try {
      const res = await pricingAdminApi.disableFreeUnlock(disableRule.id, reason);
      success(res.message);
      setDisableRule(null);
      refreshAll();
    } catch (err) {
      toastError(errorText(err, 'Could not disable the Free Unlock rule'));
    }
  };

  const openListingRule = listingRules.find((rule) => rule.status === 'active' || rule.status === 'scheduled') ?? null;
  const notPublished = selected ? selected.publicationStatus !== 'published' : false;

  return (
    <div className="space-y-6">
      <Panel
        title="Free listings"
        description="Every Free Unlock rule. Renters still perform a normal Unlock with the configured access period at ₦0; no Agent earning is created. Rules stay attached to the listing through Agent reassignment."
        actions={
          <select aria-label="Rule status" className="input !w-auto !py-2 !text-xs" value={statusFilter} onChange={(event) => setStatusFilter(event.target.value as FreeUnlockRuleStatus | 'open' | '')}>
            <option value="open">Active &amp; scheduled</option>
            {FREE_UNLOCK_STATUSES.map((status) => (
              <option key={status} value={status}>{humanize(status)}</option>
            ))}
            <option value="">All rules</option>
          </select>
        }
      >
        {rulesError ? (
          <div className="p-4"><ErrorPanel error={rulesError} onRetry={() => void loadRules()} /></div>
        ) : rulesLoading && rules.length === 0 ? (
          <LoadingBlock />
        ) : rules.length === 0 ? (
          <EmptyState icon={Gift} title="No Free Unlock rules in this view" description="Select an Operator and listing below to enable one." />
        ) : (
          <TableScroll>
            <table className="w-full min-w-[980px]">
              <thead className="bg-[#ffffff08]">
                <tr>
                  <th className={th}>Listing</th>
                  <th className={th}>Current Agent</th>
                  <th className={th}>Status</th>
                  <th className={th}>Starts</th>
                  <th className={th}>Ends</th>
                  <th className={th}>Internal reason</th>
                  <th className={th}><span className="sr-only">Actions</span></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#ffffff12]">
                {rules.map((rule) => (
                  <tr key={rule.id} className="hover:bg-[#ffffff08]">
                    <td className={td}>
                      <p className="max-w-[220px] truncate font-semibold">{rule.listing?.title ?? 'Listing not found'}</p>
                      <p className="text-[11px] text-muted-foreground">{TARGET_LABELS[rule.targetType]}{rule.listing ? ` · ${categoryLabel(rule.listing.category)}` : ''}</p>
                      <p className="font-mono text-[11px] text-muted-foreground">{rule.targetId}</p>
                    </td>
                    <td className={td}><span className="text-xs">{agentName(rule.listing?.agentId ?? null)}</span></td>
                    <td className={td}><StatusBadge status={rule.status} /></td>
                    <td className={td}><span className="whitespace-nowrap text-xs">{dateTime(rule.startsAt)}</span></td>
                    <td className={td}><span className="whitespace-nowrap text-xs">{rule.disabledAt ? `Disabled ${dateTime(rule.disabledAt)}` : rule.endsAt ? dateTime(rule.endsAt) : 'No end date'}</span></td>
                    <td className={td}><p className="max-w-[240px] text-xs text-muted-foreground">{rule.reason}</p></td>
                    <td className={`${td} text-right`}>
                      {rule.status !== 'disabled' && (
                        <div className="flex justify-end gap-1.5">
                          <button type="button" onClick={() => openEdit(rule)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#ffffff12] px-2.5 py-1.5 text-xs font-bold text-foreground hover:bg-[#ffffff08]">
                            <Pencil className="h-3.5 w-3.5" /> {rule.status === 'expired' ? 'Extend' : 'Edit'}
                          </button>
                          <button type="button" onClick={() => setDisableRule(rule)} className="inline-flex items-center gap-1 whitespace-nowrap rounded-lg border border-[#fb718530] px-2.5 py-1.5 text-xs font-bold text-destructive hover:bg-[#fb718510]">
                            <Power className="h-3.5 w-3.5" /> Disable
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableScroll>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <OperatorListingSelector
          listingPrompt="Select a published listing to make free"
          selectedTargetId={selected?.targetId}
          onSelectListing={selectListing}
          onOperatorChange={onOperatorChange}
          refreshKey={refreshKey}
          initialOperatorId={initialOperatorId}
          initialQuery={initialQuery}
          agentName={agentName}
        />

        <div className="xl:sticky xl:top-24 xl:self-start">
          {!selected ? (
            <div className="card p-6 hover:shadow-card">
              <EmptyState icon={Gift} title="No listing selected" description="Choose a Property Operator, then one of its published listings, to enable an immediate or scheduled Free Unlock." />
            </div>
          ) : (
            <Panel title="Enable Free Unlock" description={selected.title}>
              <div className="space-y-4 p-4">
                <div className="grid grid-cols-2 gap-2">
                  <KeyValue label="Standard price" value={naira(selected.standardPrice)} />
                  <KeyValue label="Current Agent" value={selected.currentAgent?.name || agentName(selected.agentId)} />
                  <KeyValue label="Publication" value={<StatusBadge status={selected.publicationStatus} />} />
                  <KeyValue label="Unlock now" value={selected.freeUnlock ? <StatusBadge status="active" label="Free" /> : <StatusBadge status="draft" label="Paid" />} />
                </div>
                {notPublished && (
                  <p className="rounded-lg bg-[#fb718510] p-3 text-xs text-destructive">Free Unlock can only be attached to a published listing.</p>
                )}
                {openListingRule && (
                  <p className="rounded-lg bg-[#fbbf2410] p-3 text-xs text-[#fcd34d]">
                    This listing already has a {openListingRule.status} Free Unlock ({dateTime(openListingRule.startsAt)} – {openListingRule.endsAt ? dateTime(openListingRule.endsAt) : 'no end'}). Edit or disable it in the table above; periods cannot overlap.
                  </p>
                )}
                <fieldset className="space-y-2">
                  <legend className="label text-xs">Start</legend>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="free-start" checked={startMode === 'now'} onChange={() => setStartMode('now')} className="accent-[#10b981]" /> Immediately
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="radio" name="free-start" checked={startMode === 'scheduled'} onChange={() => setStartMode('scheduled')} className="accent-[#10b981]" /> Scheduled
                  </label>
                  {startMode === 'scheduled' && (
                    <input aria-label="Start date and time" type="datetime-local" className="input" value={startsAt} onChange={(event) => setStartsAt(event.target.value)} />
                  )}
                </fieldset>
                <div>
                  <label className="label text-xs" htmlFor="free-end">End <span className="font-normal text-muted-foreground">(optional)</span></label>
                  <input id="free-end" type="datetime-local" className="input" value={endsAt} onChange={(event) => setEndsAt(event.target.value)} />
                </div>
                {scheduleError && (startMode === 'scheduled' || endsAt) && <p className="text-xs font-semibold text-destructive">{scheduleError}</p>}
                <button type="button" disabled={!!scheduleError || notPublished} onClick={() => setCreateOpen(true)} className="btn-primary w-full !py-2.5 !text-sm">
                  <Gift className="h-4 w-4" /> {startMode === 'scheduled' ? 'Schedule Free Unlock' : 'Enable Free Unlock'}
                </button>
                <p className="text-[11px] text-muted-foreground">Free Unlock is separate from Property Pricing: it never changes the stored listing price.</p>
              </div>
            </Panel>
          )}
        </div>
      </div>

      <ReasonDialog
        isOpen={createOpen}
        onClose={() => setCreateOpen(false)}
        onConfirm={confirmCreate}
        title={startMode === 'scheduled' ? 'Schedule Free Unlock' : 'Enable Free Unlock'}
        confirmLabel={startMode === 'scheduled' ? 'Schedule' : 'Enable now'}
        reasonLabel="Internal reason / note (never shown publicly)"
        maxLength={1000}
        message={
          selected ? (
            <p>
              <strong className="text-foreground">{selected.title}</strong> will unlock for ₦0 from{' '}
              {startMode === 'scheduled' && startsAt ? dateTime(new Date(startsAt)) : 'now'}
              {endsAt ? ` until ${dateTime(new Date(endsAt))}` : ' with no end date'}. No Agent earning is created from free unlocks.
            </p>
          ) : null
        }
      />

      <ReasonDialog
        isOpen={!!editRule}
        onClose={() => setEditRule(null)}
        onConfirm={confirmEdit}
        title="Edit Free Unlock schedule"
        confirmLabel="Save schedule"
        reasonLabel="Internal note (replaces the rule note; the previous note stays in the audit log)"
        maxLength={1000}
        canConfirm={!editError}
        message={editRule ? <p><strong className="text-foreground">{editRule.listing?.title ?? editRule.targetId}</strong> · <span className="capitalize">{editRule.status}</span></p> : null}
      >
        {editRule && (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <label className="label text-xs" htmlFor="edit-start">Start</label>
              <input id="edit-start" type="datetime-local" className="input" value={editStartsAt} disabled={editRule.status !== 'scheduled'} onChange={(event) => setEditStartsAt(event.target.value)} />
              {editRule.status !== 'scheduled' && <p className="mt-1 text-[11px] text-muted-foreground">The start of an active or expired rule cannot move.</p>}
            </div>
            <div>
              <label className="label text-xs" htmlFor="edit-end">End <span className="font-normal text-muted-foreground">(blank = no end)</span></label>
              <input id="edit-end" type="datetime-local" className="input" value={editEndsAt} onChange={(event) => setEditEndsAt(event.target.value)} />
            </div>
            {editError && <p className="text-xs font-semibold text-destructive sm:col-span-2">{editError}</p>}
          </div>
        )}
      </ReasonDialog>

      <ReasonDialog
        isOpen={!!disableRule}
        onClose={() => setDisableRule(null)}
        onConfirm={confirmDisable}
        title="Disable Free Unlock"
        confirmLabel="Disable"
        variant="danger"
        maxLength={1000}
        message={
          disableRule ? (
            <p>
              <strong className="text-foreground">{disableRule.listing?.title ?? disableRule.targetId}</strong> returns to its normal price for new unlocks immediately. Disabled rules cannot be re-enabled; create a new rule instead. Unlocks already granted keep their access period.
            </p>
          ) : null
        }
      />
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────

function AdminPricingInner() {
  const { ready, loading: authLoading } = useAdminGuard();
  const searchParams = useSearchParams();
  const router = useRouter();
  const directory = useAgentDirectory();

  const tabParam = searchParams.get('tab');
  const tab: TabId = tabParam === 'free-unlock' ? 'free-unlock' : 'pricing';
  const propertyId = searchParams.get('propertyId');
  const operatorParam = searchParams.get('operatorId');
  const [initialOperatorId, setInitialOperatorId] = useState<string | null>(operatorParam);
  const [deepLinkError, setDeepLinkError] = useState<DescribedError | null>(null);

  useEffect(() => {
    if (!ready || !propertyId || operatorParam) return;
    let cancelled = false;
    assignmentsAdminApi
      .property(propertyId)
      .then((res) => {
        if (!cancelled) setInitialOperatorId(res.data.operatorId ?? VERIQ_MANAGED_OPERATOR_ID);
      })
      .catch((err: unknown) => {
        if (!cancelled) setDeepLinkError(describeError(err, 'Could not find the requested property'));
      });
    return () => {
      cancelled = true;
    };
  }, [ready, propertyId, operatorParam]);

  const setTab = (next: TabId) => {
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', next);
    router.replace(`/dashboard/admin/pricing?${params.toString()}`, { scroll: false });
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <AdminPageHeader
        icon={KeyRound}
        eyebrow="Revenue controls"
        title="Pricing & Free Unlock"
        description="Two independent panels. Property Pricing sets a listing-level unlock price; Free Unlock Management makes a listing free for a period. Changing one never changes the other."
        onRefresh={() => void directory.reload()}
        refreshing={directory.loading}
      />

      {deepLinkError && <ErrorPanel error={deepLinkError} />}
      {directory.error && <ErrorPanel error={{ message: directory.error, details: [] }} onRetry={() => void directory.reload()} />}

      <Tabs<TabId>
        label="Pricing panels"
        active={tab}
        onChange={setTab}
        tabs={[
          { id: 'pricing', label: 'Property Pricing' },
          { id: 'free-unlock', label: 'Free Unlock Management' },
        ]}
      />

      {tab === 'pricing' ? (
        <PropertyPricingTab key="pricing" initialOperatorId={initialOperatorId} initialQuery={propertyId ?? ''} agentName={directory.nameOf} />
      ) : (
        <FreeUnlockTab key="free-unlock" initialOperatorId={initialOperatorId} initialQuery={propertyId ?? ''} agentName={directory.nameOf} />
      )}
    </div>
  );
}

export default function AdminPricingPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminPricingInner />
    </Suspense>
  );
}
