'use client';

import React from 'react';
import Link from 'next/link';
import { AlertCircle, Inbox, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  Badge,
  BackLink,
  Button,
  ChipIcon,
  Eyebrow,
  Notice,
  Panel,
  buttonClass,
  type BadgeTone,
} from '@/components/ui';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { humanize } from './format';

/**
 * A status from one of the tone maps in `./format`, rendered as the prototype's `.badge`. The tone
 * comes from the map rather than the call site so the same status always reads the same colour.
 */
export function StatusPill({
  value,
  tones,
  label,
  className,
}: {
  value: string;
  tones: Record<string, BadgeTone>;
  label?: string;
  className?: string;
}) {
  return (
    <Badge tone={tones[value] ?? 'neutral'} className={className}>
      {label ?? humanize(value)}
    </Badge>
  );
}

/** One block of an Agent screen: the prototype's `.panel` with a title row and optional chip icon. */
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
    <Panel as="section" id={id} className={className}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          {Icon && (
            <ChipIcon>
              <Icon className="h-5 w-5" />
            </ChipIcon>
          )}
          <div className="min-w-0">
            <h2 className="font-display text-base font-semibold text-foreground">{title}</h2>
            {subtitle && <div className="mt-1 text-sm text-muted-foreground">{subtitle}</div>}
          </div>
        </div>
        {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
      {children}
    </Panel>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div role="status" aria-live="polite" className="flex items-center justify-center gap-3 py-10 text-ui-md text-muted-foreground">
      <LoadingSpinner size="md" className="text-primary" /> {label}
    </div>
  );
}

export function ErrorBlock({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-start gap-3 rounded-review border border-[#fb718530] bg-[#fb718510] p-5 wide:flex-row wide:items-center wide:justify-between"
    >
      <p className="flex items-start gap-2 text-ui-md text-[#fda4af]">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" /> {message}
      </p>
      {onRetry && (
        <Button variant="secondary" size="small" onClick={onRetry}>
          <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
        </Button>
      )}
    </div>
  );
}

/** The prototype's `.locked` treatment reused for "nothing here yet": dashed border on the card gradient. */
export function EmptyBlock({ title, message, action }: { title: string; message?: string; action?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center rounded-searchbar border border-dashed border-[#ffffff25] bg-gradient-to-br from-card to-[#0b141d] px-6 py-12 text-center">
      <ChipIcon className="mb-4">
        <Inbox aria-hidden="true" className="h-5 w-5" />
      </ChipIcon>
      <p className="font-display text-base font-semibold text-foreground">{title}</p>
      {message && <p className="mt-2 max-w-md text-ui-md text-muted-foreground">{message}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  );
}

/**
 * A section header inside a screen the shell has already given a `PageHead` — a sub-screen such as one
 * verification case. `backHref` renders the prototype's `.back` link above it.
 */
export function PageHeader({
  title,
  subtitle,
  backHref,
  backLabel,
  actions,
  badges,
  eyebrow,
}: {
  title: string;
  subtitle?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  actions?: React.ReactNode;
  badges?: React.ReactNode;
  eyebrow?: React.ReactNode;
}) {
  return (
    <div>
      {backHref && <BackLink href={backHref}>{backLabel ?? 'Back'}</BackLink>}
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          {eyebrow && <Eyebrow>{eyebrow}</Eyebrow>}
          <h1 className="my-2 break-words font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-foreground wide:text-[2rem]">
            {title}
          </h1>
          {subtitle && <div className="text-muted-foreground">{subtitle}</div>}
          {badges && <div className="mt-3 flex flex-wrap items-center gap-2">{badges}</div>}
        </div>
        {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
      </div>
    </div>
  );
}

/**
 * A short standing explanation. The palette has no info or success notice, so `info` and `success`
 * both land on the prototype's emerald notice and `warning`/`danger` on its amber one.
 */
export function InlineNotice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warning' | 'danger' | 'success';
  title?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <Notice tone={tone === 'warning' || tone === 'danger' ? 'amber' : 'neutral'} title={title} className={className}>
      {children}
    </Notice>
  );
}

/** Label plus control. Pass `htmlFor`/`id` so the label is tied to the input it names. */
export function Field({
  label,
  hint,
  htmlFor,
  children,
  className,
}: {
  label: string;
  hint?: string;
  htmlFor?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('min-w-0', className)}>
      <label htmlFor={htmlFor} className="label">
        {label}
      </label>
      {children}
      {hint && (
        <p id={htmlFor ? `${htmlFor}-hint` : undefined} className="mt-1 text-xs text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}

export function KeyValue({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="min-w-0">
      <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">{label}</dt>
      <dd className="mt-1 break-words text-ui-md text-foreground">{value}</dd>
    </div>
  );
}

/**
 * A link styled as the prototype's secondary button. `Button asChild` covers most cases; this exists
 * for the `<a>`/`<Link>` call sites that already pass a class string.
 */
export function SmallLink({ href, children, className }: { href: string; children: React.ReactNode; className?: string }) {
  return (
    <Link href={href} className={buttonClass('secondary', 'small', className)}>
      {children}
    </Link>
  );
}

export const smallButton = buttonClass('secondary', 'small');
export const smallPrimaryButton = buttonClass('primary', 'small');
/** The palette has no destructive button, so a reject action is a secondary button tinted red. */
export const smallDangerButton = buttonClass(
  'secondary',
  'small',
  'border-[#fb718540] bg-[#fb718510] text-[#fda4af] hover:bg-[#fb718520]',
);
