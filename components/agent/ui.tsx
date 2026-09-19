'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, ArrowLeft, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { humanize } from './format';

export function StatusPill({ value, styles, label }: { value: string; styles: Record<string, string>; label?: string }) {
  return (
    <span className={cn('badge whitespace-nowrap !px-2.5 !py-0.5 text-[11px]', styles[value] ?? 'bg-slate-100 text-slate-600')}>
      {label ?? humanize(value)}
    </span>
  );
}

export function PanelCard({
  title,
  subtitle,
  icon: Icon,
  actions,
  children,
  className,
  id,
}: {
  title: string;
  subtitle?: React.ReactNode;
  icon?: React.ElementType;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('card !shadow-sm hover:!shadow-sm p-4 sm:p-5', className)}>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <span className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-slate-100 text-navy-700">
              <Icon className="h-4 w-4" />
            </span>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-base font-bold text-navy-900">{title}</h2>
            {subtitle && <div className="mt-0.5 text-xs text-slate-500">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-3 py-10 text-sm text-slate-500">
      <LoadingSpinner size="md" className="text-veriq-secondary" /> {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-xl border border-red-100 bg-red-50 p-4 sm:flex-row sm:items-center sm:justify-between">
      <p className="flex items-start gap-2 text-sm text-red-700">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" /> {message}
      </p>
      {onRetry && (
        <button type="button" onClick={onRetry} className="btn-ghost !py-1.5 text-xs text-red-700 hover:!bg-red-100">
          <RefreshCw className="h-3.5 w-3.5" /> Retry
        </button>
      )}
    </div>
  );
}

export function EmptyBlock({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-xl border border-dashed border-slate-200 bg-white px-6 py-10 text-center">
      <span className="mb-3 grid h-12 w-12 place-items-center rounded-2xl bg-slate-100 text-slate-400">
        <Inbox className="h-6 w-6" />
      </span>
      <p className="font-display text-sm font-bold text-navy-900">{title}</p>
      {message && <p className="mt-1 max-w-md text-xs text-slate-500">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  badges,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
}) {
  return (
    <div className="space-y-2">
      {backHref && (
        <Link href={backHref} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-navy-900">
          <ArrowLeft className="h-3.5 w-3.5" /> {backLabel ?? 'Back'}
        </Link>
      )}
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <h1 className="break-words font-display text-xl font-bold text-navy-900 sm:text-2xl">{title}</h1>
          {subtitle && <div className="mt-1 text-sm text-veriq-muted">{subtitle}</div>}
          {badges && <div className="mt-2 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    </div>
  );
}

export function InlineNotice({
  tone = 'info',
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  children: React.ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-blue-100 bg-blue-50 text-blue-800',
    warning: 'border-amber-100 bg-amber-50 text-amber-800',
    danger: 'border-red-100 bg-red-50 text-red-800',
    success: 'border-emerald-100 bg-emerald-50 text-emerald-800',
  }[tone];
  return <div className={cn('rounded-xl border px-4 py-3 text-xs leading-relaxed', styles, className)}>{children}</div>;
}

export function Field({ label, hint, children, className }: { label: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <label className={cn('block', className)}>
      <span className="label !mb-1 !text-xs">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-slate-400">{label}</dt>
      <dd className="mt-0.5 break-words text-sm text-navy-900">{value}</dd>
    </div>
  );
}

export const smallButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-navy-800 transition-colors hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50';
export const smallPrimaryButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg bg-veriq-secondary px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-emerald-600 disabled:cursor-not-allowed disabled:opacity-50';
export const smallDangerButton =
  'inline-flex items-center justify-center gap-1.5 rounded-lg border border-red-200 bg-white px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50';
