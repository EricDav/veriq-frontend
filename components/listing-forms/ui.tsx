'use client';

import type { ReactNode } from 'react';
import { AlertCircle, AlertTriangle, CheckCircle2, Inbox, Info } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ChipIcon, Notice as ProtoNotice, Panel } from '@/components/ui';
import type { ReadinessBlocker, SchemaIssue } from '@/types/operator';
import { TONE_CLASSES, type Tone } from './labels';

export function StatusBadge({ tone, children, className }: { tone: Tone; children: ReactNode; className?: string }) {
  return <span className={cn('badge whitespace-nowrap', TONE_CLASSES[tone], className)}>{children}</span>;
}

/**
 * A standing explanation on a form. The prototype has two notice skins — emerald and amber — so
 * `info`/`success` take the emerald one and `warning`/`error` the amber one, with the icon and the
 * `alert` role carrying the difference in severity.
 */
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
  const Icon = { info: Info, warning: AlertTriangle, error: AlertCircle, success: CheckCircle2 }[tone];
  return (
    <ProtoNotice
      tone={tone === 'warning' || tone === 'error' ? 'amber' : 'neutral'}
      icon={<Icon className="h-4 w-4" />}
      title={title}
      className={cn(tone === 'error' && 'border-[#fb718530] bg-[#fb718510]', className)}
    >
      {children}
    </ProtoNotice>
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
    <div role="alert" aria-live="polite" className={className}>
      <Notice tone="error" title={unique.length ? title : undefined}>
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
    </div>
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
    <Panel as="section" id={id} className={cn('space-y-5', className)}>
      <div className="flex flex-col gap-3 wide:flex-row wide:items-start wide:justify-between">
        <div className="min-w-0">
          <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
          {description && <div className="mt-1 text-ui-md text-muted-foreground">{description}</div>}
        </div>
        {actions && <div className="flex flex-shrink-0 flex-wrap gap-2">{actions}</div>}
      </div>
      {children}
    </Panel>
  );
}

export function EmptyState({ icon, title, children }: { icon?: ReactNode; title: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-searchbar border border-dashed border-[#ffffff25] bg-gradient-to-br from-card to-[#0b141d] px-6 py-12 text-center">
      <ChipIcon>{icon ?? <Inbox className="h-5 w-5" />}</ChipIcon>
      <p className="font-display font-semibold text-foreground">{title}</p>
      {children && <div className="max-w-md text-ui-md text-muted-foreground">{children}</div>}
    </div>
  );
}
