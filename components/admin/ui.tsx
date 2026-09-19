'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import type { DescribedError } from './format';

/** Redirects non-admins; returns true once the viewer is a confirmed Admin. */
export function useAdminGuard(): { ready: boolean; loading: boolean } {
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const isAdmin = user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;

  useEffect(() => {
    if (!isLoading && !isAdmin) router.push('/dashboard');
  }, [isLoading, isAdmin, router]);

  return { ready: !isLoading && isAdmin, loading: isLoading };
}

export function AdminPageHeader({
  icon: Icon,
  eyebrow,
  title,
  description,
  onRefresh,
  refreshing,
  actions,
}: {
  icon: React.ElementType;
  eyebrow?: string;
  title: string;
  description: string;
  onRefresh?: () => void;
  refreshing?: boolean;
  actions?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0">
        {eyebrow && (
          <p className="mb-2 inline-flex items-center gap-2 rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold uppercase tracking-wide text-veriq-secondary">
            <Icon className="h-3.5 w-3.5" />
            {eyebrow}
          </p>
        )}
        <h1 className="font-display text-2xl font-bold text-navy-900">{title}</h1>
        <p className="mt-1 max-w-3xl text-sm text-slate-500">{description}</p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {actions}
        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={refreshing}
            className="btn-outline !px-4 !py-2.5 !text-sm"
          >
            <RefreshCw className={cn('h-4 w-4', refreshing && 'animate-spin')} />
            Refresh
          </button>
        )}
      </div>
    </div>
  );
}

export function ErrorPanel({ error, onRetry }: { error: DescribedError; onRetry?: () => void }) {
  return (
    <div role="alert" className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-800">
      <div className="flex items-start gap-3">
        <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{error.message}</p>
          {error.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-xs">
              {error.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-bold text-red-700 hover:bg-red-100"
          >
            Retry
          </button>
        )}
      </div>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 py-12 text-slate-400">
      <LoadingSpinner size="md" className="text-veriq-secondary" />
      <p className="text-xs">{label}</p>
    </div>
  );
}

export function EmptyState({
  title,
  description,
  icon: Icon = Inbox,
}: {
  title: string;
  description?: string;
  icon?: React.ElementType;
}) {
  return (
    <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
      <Icon className="mb-2 h-7 w-7 text-slate-300" />
      <p className="text-sm font-semibold text-navy-900">{title}</p>
      {description && <p className="mt-1 max-w-md text-xs text-slate-500">{description}</p>}
    </div>
  );
}

type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple';

const TONES: Record<Tone, string> = {
  green: 'bg-emerald-50 text-emerald-700',
  amber: 'bg-amber-50 text-amber-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-blue-50 text-blue-700',
  slate: 'bg-slate-100 text-slate-600',
  purple: 'bg-purple-50 text-purple-700',
};

const STATUS_TONES: Record<string, Tone> = {
  active: 'green',
  published: 'green',
  approved: 'green',
  verified: 'green',
  identity_verified: 'green',
  paid: 'green',
  success: 'green',
  unlocked: 'green',
  withdrawable: 'green',
  available: 'green',
  passed: 'green',
  enabled: 'green',
  ready_to_publish: 'blue',
  scheduled: 'blue',
  in_progress: 'blue',
  under_review: 'blue',
  verification_in_progress: 'blue',
  requested: 'amber',
  pending: 'amber',
  submitted: 'amber',
  pending_payment: 'amber',
  needs_correction: 'amber',
  identity_pending: 'amber',
  refund_review_hold: 'amber',
  refund_requested: 'amber',
  minor_issues: 'amber',
  duplicate_payment: 'purple',
  suspended: 'red',
  rejected: 'red',
  failed: 'red',
  payment_failed: 'red',
  identity_rejected: 'red',
  major_issues: 'red',
  disabled: 'slate',
  expired: 'slate',
  archived: 'slate',
  closed: 'slate',
  cancelled: 'slate',
  refunded: 'purple',
  withdrawn: 'slate',
  draft: 'slate',
  unavailable: 'slate',
  account_submitted: 'slate',
  not_started: 'slate',
};

export function StatusBadge({ status, label, tone }: { status: string; label?: string; tone?: Tone }) {
  const resolved = tone ?? STATUS_TONES[status] ?? 'slate';
  const text = label ?? status.replace(/_/g, ' ');
  return (
    <span
      className={cn(
        'inline-flex items-center whitespace-nowrap rounded-full px-2 py-0.5 text-[11px] font-semibold capitalize',
        TONES[resolved],
      )}
    >
      {text}
    </span>
  );
}

export function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  tone = 'green',
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  icon?: React.ElementType;
  tone?: Tone;
}) {
  return (
    <div className="card p-4">
      {Icon && (
        <div className={cn('mb-3 flex h-9 w-9 items-center justify-center rounded-xl', TONES[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      )}
      <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">{label}</p>
      <p className="mt-1 break-words font-display text-xl font-black text-navy-900">{value}</p>
      {sub && <p className="mt-1 text-[11px] text-slate-500">{sub}</p>}
    </div>
  );
}

export function Tabs<T extends string>({
  tabs,
  active,
  onChange,
  label,
}: {
  tabs: Array<{ id: T; label: string; count?: number }>;
  active: T;
  onChange: (id: T) => void;
  label: string;
}) {
  return (
    <div className="-mx-4 overflow-x-auto px-4 sm:mx-0 sm:px-0">
      <div role="tablist" aria-label={label} className="inline-flex min-w-full gap-1 rounded-xl border border-slate-200 bg-slate-50 p-1 sm:min-w-0">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={active === tab.id}
            onClick={() => onChange(tab.id)}
            className={cn(
              'whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition-colors sm:px-4',
              active === tab.id ? 'bg-navy-900 text-white shadow-sm' : 'text-slate-600 hover:bg-white',
            )}
          >
            {tab.label}
            {tab.count !== undefined && (
              <span
                className={cn(
                  'ml-2 rounded-full px-1.5 py-0.5 text-[10px]',
                  active === tab.id ? 'bg-white/20 text-white' : 'bg-slate-200 text-slate-600',
                )}
              >
                {tab.count}
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

export function Pagination({
  page,
  pages,
  total,
  onChange,
  noun = 'records',
}: {
  page: number;
  pages: number;
  total: number;
  onChange: (page: number) => void;
  noun?: string;
}) {
  if (pages <= 1) {
    return total > 0 ? (
      <div className="border-t border-slate-100 px-4 py-3 text-xs text-slate-500">
        {total.toLocaleString('en-NG')} {noun}
      </div>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t border-slate-100 px-4 py-3">
      <p className="text-xs text-slate-500">
        Page {page} of {pages} · {total.toLocaleString('en-NG')} {noun}
      </p>
      <div className="flex items-center gap-2">
        <button
          type="button"
          aria-label="Previous page"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 disabled:opacity-40"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
        <button
          type="button"
          aria-label="Next page"
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
          className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:border-slate-300 disabled:opacity-40"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}

/** Card with a titled header; body scrolls horizontally for wide tables on phones. */
export function Panel({
  title,
  description,
  actions,
  children,
  className,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn('card overflow-hidden hover:shadow-card', className)}>
      <div className="flex flex-col gap-3 border-b border-slate-100 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="min-w-0">
          <h2 className="font-display text-base font-bold text-navy-900">{title}</h2>
          {description && <p className="mt-1 text-xs text-slate-500">{description}</p>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function TableScroll({ children }: { children: React.ReactNode }) {
  return <div className="overflow-x-auto">{children}</div>;
}

export const th = 'px-4 py-3 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-400 whitespace-nowrap';
export const td = 'px-4 py-3 align-top text-sm text-navy-900';

export function KeyValue({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2">
      <p className="text-[10px] font-semibold uppercase tracking-wide text-slate-400">{label}</p>
      <div className={cn('mt-1 break-words text-xs font-medium text-navy-900', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
