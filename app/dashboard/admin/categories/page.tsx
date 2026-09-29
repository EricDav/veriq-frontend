'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { Building2, Power, PowerOff, Settings2 } from 'lucide-react';
import { categoriesAdminApi } from '@/lib/api/admin';
import type { CategoryConfiguration } from '@/types/admin';
import { PROPERTY_CATEGORIES } from '@/types/admin';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { categoryLabel, dateTime, describeError, errorText, type DescribedError } from '@/components/admin/format';
import { AdminPageHeader, EmptyState, ErrorPanel, LoadingBlock, StatusBadge, useAdminGuard } from '@/components/admin/ui';

const DESCRIPTIONS: Record<string, string> = {
  residential: 'Long-term rentals: one Property with documented Units.',
  short_let: 'Short stays with per-Unit booking details.',
  hostel: 'Hostels with materially distinct accommodation Units.',
  shared_property: 'Resident-listed Shared Property opportunities.',
  for_sale: 'Agent-created Built Property and Land sale listings.',
};

export default function AdminCategoriesPage() {
  const { ready, loading: authLoading } = useAdminGuard();
  const { success, error: toastError } = useToast();
  const [categories, setCategories] = useState<CategoryConfiguration[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<DescribedError | null>(null);
  const [pending, setPending] = useState<CategoryConfiguration | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await categoriesAdminApi.list();
      const order = (category: string) => PROPERTY_CATEGORIES.indexOf(category as (typeof PROPERTY_CATEGORIES)[number]);
      setCategories([...res.data].sort((a, b) => order(a.category) - order(b.category)));
      setLoadError(null);
    } catch (err) {
      setLoadError(describeError(err, 'Could not load category configuration'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (ready) void load();
  }, [ready, load]);

  const confirmToggle = async () => {
    if (!pending) return;
    setSaving(true);
    try {
      const res = await categoriesAdminApi.setEnabled(pending.category, !pending.isEnabled);
      success(`${categoryLabel(pending.category)} ${res.data.isEnabled ? 'enabled' : 'disabled'}`);
      setCategories((current) => current.map((item) => (item.category === res.data.category ? { ...item, ...res.data } : item)));
      setPending(null);
    } catch (err) {
      toastError(errorText(err, 'Could not update the category'));
    } finally {
      setSaving(false);
    }
  };

  if (authLoading) return <PageLoader />;
  if (!ready) return null;

  const missing = PROPERTY_CATEGORIES.filter((category) => !categories.some((item) => item.category === category));

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <AdminPageHeader
        icon={Building2}
        eyebrow="Configuration"
        title="Category Configuration"
        description="Enable or disable each property category (§6.6). Disabling removes the category from public discovery and new submission and publication flows. Schemas, records and history are kept, and active unlocks continue until their recorded expiry."
        onRefresh={() => void load()}
        refreshing={loading}
        actions={
          <Link href="/dashboard/admin/business-rules#rule-unlock_price_naira" className="btn-outline !px-4 !py-2.5 !text-sm">
            <Settings2 className="h-4 w-4" /> Category prices &amp; timings
          </Link>
        }
      />

      {loadError && <ErrorPanel error={loadError} onRetry={() => void load()} />}

      {loading && categories.length === 0 ? (
        <LoadingBlock />
      ) : categories.length === 0 && !loadError ? (
        <div className="card"><EmptyState icon={Building2} title="No category configuration found" description="The backend has not seeded category configuration rows." /></div>
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {categories.map((item) => (
            <section key={item.id} className="card flex flex-col gap-4 p-5 hover:shadow-card">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-base font-bold text-foreground">{categoryLabel(item.category)}</h2>
                  <p className="mt-1 text-xs text-muted-foreground">{DESCRIPTIONS[item.category] ?? item.category}</p>
                </div>
                <StatusBadge status={item.isEnabled ? 'enabled' : 'disabled'} />
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-[#ffffff08] p-2"><p className="text-muted-foreground">Schema version</p><p className="font-semibold text-foreground">v{item.schemaVersion}</p></div>
                <div className="rounded-lg bg-[#ffffff08] p-2"><p className="text-muted-foreground">Last updated</p><p className="font-semibold text-foreground">{dateTime(item.updatedAt)}</p></div>
              </div>
              <button
                type="button"
                onClick={() => setPending(item)}
                className={
                  item.isEnabled
                    ? 'inline-flex items-center justify-center gap-2 rounded-lg border border-[#fb718530] px-4 py-2.5 text-sm font-bold text-destructive hover:bg-[#fb718510]'
                    : 'inline-flex items-center justify-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-sm font-bold text-foreground hover:bg-[#34d399]'
                }
              >
                {item.isEnabled ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
                {item.isEnabled ? 'Disable category' : 'Enable category'}
              </button>
            </section>
          ))}
        </div>
      )}

      {!loading && categories.length > 0 && missing.length > 0 && (
        <ErrorPanel error={{ message: 'Some supported categories have no configuration row.', details: missing.map(categoryLabel) }} />
      )}

      <ConfirmDialog
        isOpen={!!pending}
        onClose={() => !saving && setPending(null)}
        onConfirm={confirmToggle}
        isLoading={saving}
        variant={pending?.isEnabled ? 'danger' : 'primary'}
        title={pending?.isEnabled ? 'Disable category' : 'Enable category'}
        confirmLabel={pending?.isEnabled ? 'Disable' : 'Enable'}
        message={
          pending
            ? pending.isEnabled
              ? `Disable ${categoryLabel(pending.category)}? Its listings leave public discovery and new submissions and publication stop. Data, schemas and history are kept, and active unlocks continue until they expire. The change is recorded in the audit log.`
              : `Enable ${categoryLabel(pending.category)}? Published listings return to discovery and submissions reopen. The change is recorded in the audit log.`
            : ''
        }
      />
    </div>
  );
}
