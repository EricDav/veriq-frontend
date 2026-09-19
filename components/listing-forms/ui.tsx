'use client';

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ReadinessBlocker, SchemaIssue } from '@/types/operator';
import { TONE_CLASSES, type Tone } from './labels';

export function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('badge whitespace-nowrap', TONE_CLASSES[tone], className)}>{children}</span>;
}

export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'error' | 'success';
  title?: string;
  children?: ReactNode;
  className?: string;
}) {
  const styles = {
    info: 'border-sky-200 bg-sky-50 text-sky-900',
    warning: 'border-amber-200 bg-amber-50 text-amber-900',
    error: 'border-red-200 bg-red-50 text-red-900',
    success: 'border-emerald-200 bg-emerald-50 text-emerald-900',
  }[tone];
  const Icon = { info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle2 }[tone];
  return (
    <div className={cn('flex gap-3 rounded-xl border px-4 py-3 text-sm', styles, className)} role={tone === 'error' ? 'alert' : undefined}>
      <Icon className="mt-0.5 h-4 w-4 flex-shrink-0" />
      <div className="min-w-0 space-y-1">
        {title && <p className="font-semibold">{title}</p>}
        {children && <div className="leading-relaxed">{children}</div>}
      </div>
    </div>
  );
}

/** Lists structured issues and blockers returned by validate/submit (`ApiError.details`). */
export function IssueList({
  title = 'Please fix the following',
  message,
  issues = [],
  blockers = [],
  className,
}: {
  title?: string;
  message?: string | null;
  issues?: SchemaIssue[];
  blockers?: ReadinessBlocker[];
  className?: string;
}) {
  if (!message && !issues.length && !blockers.length) return null;
  const lines = [
    ...issues.map((issue) => ({ key: `i-${issue.path}-${issue.message}`, text: issue.message })),
    ...blockers.map((blocker) => ({ key: `b-${blocker.code}`, text: blocker.message })),
  ];
  const unique = lines.filter((line, index) => lines.findIndex((other) => other.key === line.key) === index);
  return (
    <Notice tone="error" title={unique.length ? title : undefined} className={className}>
      {message && (!unique.length || unique[0].text !== message) && <p>{message}</p>}
      {unique.length > 0 && (
        <ul className="ml-4 list-disc space-y-0.5">
          {unique.slice(0, 40).map((line) => (
            <li key={line.key}>{line.text}</li>
          ))}
          {unique.length > 40 && <li>…and {unique.length - 40} more</li>}
        </ul>
      )}
    </Notice>
  );
}

export function SectionCard({
  title,
  description,
  actions,
  children,
  className,
  id,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section id={id} className={cn('card space-y-4 p-4 hover:shadow-card sm:p-6', className)}>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-navy-900">{title}</h2>
          {description && <div className="mt-1 text-sm text-slate-500">{description}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-200 px-6 py-10 text-center">
      {icon && <div className="text-slate-300">{icon}</div>}
      <p className="font-semibold text-navy-900">{title}</p>
      {children && <div className="max-w-md text-sm text-slate-500">{children}</div>}
    </div>
  );
}
