'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ChevronLeft, ChevronRight, Inbox, RefreshCw } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { cn } from '@/lib/utils';
import { Badge, type BadgeTone, Button, ChipIcon, PageHead, panelClass } from '@/components/ui';
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

/**
 * Every Admin screen's `.page-head`. It is the shared {@link PageHead} with a Refresh action folded
 * in, so an Admin screen never grows its own heading block and the workspace shell keeps supplying
 * the rest of the chrome.
 */
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
    <PageHead
      eyebrow={
        eyebrow ? (
          <span className="inline-flex items-center gap-2">
            <Icon aria-hidden="true" className="h-3.5 w-3.5" />
            {eyebrow}
          </span>
        ) : undefined
      }
      title={title}
      lead={description}
      actions={
        <>
          {actions}
          {onRefresh && (
            <Button variant="secondary" onClick={onRefresh} disabled={refreshing}>
              <RefreshCw aria-hidden="true" className={cn('h-4 w-4', refreshing && 'animate-spin')} />
              Refresh
            </Button>
          )}
        </>
      }
    />
  );
}

export function ErrorPanel({ error, onRetry }: { error: DescribedError; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="rounded-review border border-[#fb718530] bg-[#fb718510] px-5 py-[18px] text-ui-md text-[#fda4af]"
    >
      <div className="flex flex-col gap-3 wide:flex-row wide:items-start">
        <AlertTriangle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{error.message}</p>
          {error.details.length > 0 && (
            <ul className="mt-2 list-disc space-y-1 pl-4 text-ui-sm">
              {error.details.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        {onRetry && (
          <Button variant="secondary" size="small" onClick={onRetry} className="self-start border-[#fb718530] text-[#fda4af]">
            Retry
          </Button>
        )}
      </div>
    </div>
  );
}

export function LoadingBlock({ label = 'Loading…' }: { label?: string }) {
  return (
    <div aria-live="polite" className="flex flex-col items-center justify-center gap-2 py-12 text-muted-foreground">
      <LoadingSpinner size="md" className="text-primary" />
      <p className="text-ui-sm">{label}</p>
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
      <Icon aria-hidden="true" className="mb-3 h-7 w-7 text-muted-foreground" />
      <p className="text-ui-md font-semibold text-foreground">{title}</p>
      {description && <p className="mt-1 max-w-md text-ui-sm text-muted-foreground">{description}</p>}
    </div>
  );
}

/**
 * The tone names the Admin screens already speak. The prototype's palette has exactly four badge
 * tones, so the wider set folds onto them: there is no blue or purple anywhere in the design system,
 * and inventing one would be the single loudest wrong colour on the page.
 */
export type Tone = 'green' | 'amber' | 'red' | 'blue' | 'slate' | 'purple';

const BADGE_TONES: Record<Tone, BadgeTone> = {
  green: 'success',
  amber: 'amber',
  red: 'red',
  blue: 'neutral',
  slate: 'neutral',
  purple: 'amber',
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
    <Badge tone={BADGE_TONES[resolved]} className="whitespace-nowrap capitalize">
      {text}
    </Badge>
  );
}

/** Tints the figure when the number itself carries a judgement — money owed, cases overdue. */
export type StatTone = 'default' | 'green' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';

const STAT_TONES: Record<StatTone, string> = {
  default: 'text-foreground',
  green: 'text-[#34d399]',
  amber: 'text-[#fcd34d]',
  red: 'text-[#fda4af]',
  blue: 'text-[#93c5fd]',
  purple: 'text-[#c4b5fd]',
  slate: 'text-muted-foreground',
};

export function StatCard({
  label,
  value,
  sub,
  tone = 'default',
  icon: Icon,
}: {
  label: string;
  value: React.ReactNode;
  sub?: string;
  tone?: StatTone;
  icon?: React.ElementType;
}) {
  return (
    <div className={panelClass}>
      {Icon && (
        <ChipIcon className="mb-4">
          <Icon aria-hidden="true" className="h-5 w-5" />
        </ChipIcon>
      )}
      <small className="text-ui-sm text-muted-foreground">{label}</small>
      <p className={`mb-[3px] mt-3 break-words font-display text-[2rem] leading-none ${STAT_TONES[tone]}`}>{value}</p>
      {sub && <p className="text-ui-sm text-muted-foreground">{sub}</p>}
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
    <div
      role="tablist"
      aria-label={label}
      className="flex max-w-full flex-wrap gap-1.5 rounded-review border border-[#ffffff18] bg-card p-1.5"
    >
      {tabs.map((tab) => (
        <button
          key={tab.id}
          type="button"
          role="tab"
          aria-selected={active === tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            'whitespace-nowrap rounded-btn px-4 py-2.5 text-ui-md font-semibold transition-colors',
            'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card',
            active === tab.id ? 'bg-[#10b9811a] text-[#6ee7b7]' : 'text-muted-foreground hover:text-foreground',
          )}
        >
          {tab.label}
          {tab.count !== undefined && (
            <span
              className={cn(
                'ml-2 rounded-full px-1.5 py-0.5 text-ui-xs',
                active === tab.id ? 'bg-[#10b98126] text-[#6ee7b7]' : 'bg-[#ffffff0f] text-muted-foreground',
              )}
            >
              {tab.count}
            </span>
          )}
        </button>
      ))}
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
      <div className="border-t border-[#ffffff12] px-[21px] py-3.5 text-ui-sm text-muted-foreground wide:px-7">
        {total.toLocaleString('en-NG')} {noun}
      </div>
    ) : null;
  }
  return (
    <div className="flex items-center justify-between gap-3 border-t border-[#ffffff12] px-[21px] py-3.5 wide:px-7">
      <p className="text-ui-sm text-muted-foreground">
        Page {page} of {pages} · {total.toLocaleString('en-NG')} {noun}
      </p>
      <div className="flex items-center gap-2">
        <Button
          variant="secondary"
          size="small"
          aria-label="Previous page"
          onClick={() => onChange(Math.max(1, page - 1))}
          disabled={page <= 1}
        >
          <ChevronLeft aria-hidden="true" className="h-4 w-4" />
        </Button>
        <Button
          variant="secondary"
          size="small"
          aria-label="Next page"
          onClick={() => onChange(Math.min(pages, page + 1))}
          disabled={page >= pages}
        >
          <ChevronRight aria-hidden="true" className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

/**
 * The prototype's `.panel` with a titled header. The body is left unpadded so a wide table can run to
 * the panel's edge and scroll sideways inside it rather than widening the page.
 */
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
    <section className={cn('overflow-hidden rounded-panel border border-[#ffffff12] bg-card', className)}>
      <div className="flex flex-col gap-3 border-b border-[#ffffff12] px-[21px] py-[18px] wide:flex-row wide:items-center wide:justify-between wide:px-7">
        <div className="min-w-0">
          <h2 className="font-display text-[1.12rem] font-semibold tracking-[-0.035em] text-foreground">{title}</h2>
          {description && <p className="mt-1 text-ui-sm text-muted-foreground">{description}</p>}
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

export const th = 'px-3 py-[15px] text-left text-[0.8rem] font-medium text-muted-foreground whitespace-nowrap';
export const td = 'px-3 py-[17px] align-top text-ui-md text-foreground border-t border-[#ffffff12]';

/** The prototype's `.unit` tint, used here for one labelled fact in a grid of them. */
export function KeyValue({ label, value, mono }: { label: string; value: React.ReactNode; mono?: boolean }) {
  return (
    <div className="rounded-unit border border-[#ffffff18] bg-[#070b1444] px-3 py-2.5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
      <div className={cn('mt-1 break-words text-ui-sm font-medium text-foreground', mono && 'font-mono')}>{value}</div>
    </div>
  );
}
