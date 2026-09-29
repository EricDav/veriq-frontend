import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';
import { Eyebrow, Panel } from '@/components/ui';

export interface WorkspaceIntroProps {
  /** The role's own label, rendered uppercase in emerald: "Renter workspace". */
  workspace: string;
  /** "Welcome back." or "Welcome, Amaka Johnson." — the full sentence, stop included. */
  title: string;
  /** One line on what this screen is for. Defaults to the prototype's own. */
  lead?: string;
  /** Actions that belong beside the title rather than in the panel below it. */
  actions?: ReactNode;
}

/**
 * The head of every workspace overview, as the prototype has it: a small emerald eyebrow, the
 * welcome in Sora, then a single quiet line. Each role's screen supplies its own words; the shape
 * stays the same so the four workspaces read as one product.
 *
 * Metrics are the prototype's `.page-head`: 28px below, 8px either side of the `h1`, and 2rem
 * dropping to 1.7rem at the 760px cut-over.
 */
export function WorkspaceIntro({
  workspace,
  title,
  lead = 'Your next step, with everything in view.',
  actions,
}: WorkspaceIntroProps) {
  return (
    <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
      <div className="min-w-0">
        <Eyebrow>{workspace}</Eyebrow>
        <h1 className="my-2 font-display text-[1.7rem] font-semibold leading-tight tracking-[-0.035em] text-foreground wide:text-[2rem]">
          {title}
        </h1>
        <p className="text-muted-foreground">{lead}</p>
      </div>
      {actions && <div className="flex flex-wrap items-center gap-3">{actions}</div>}
    </div>
  );
}

/** The Sora section title the prototype uses inside and above a workspace panel. */
const SECTION_TITLE =
  'font-display text-[1.12rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground';

export interface WorkspaceStatGridProps {
  /** Three {@link StatCard}s. The prototype's overviews never show a fourth. */
  children: ReactNode;
  /** True while the figures are still being fetched, so the row is announced once they land. */
  busy?: boolean;
  className?: string;
}

/**
 * The prototype's `.grid.three` directly under the intro: three figures across, dropping to two at
 * 1050px and one at 760px, which is what keeps the row readable on a phone.
 *
 * The row is a live region because every figure starts as a placeholder and is replaced when its
 * request settles — without it a screen reader is told nothing when the numbers arrive.
 */
export function WorkspaceStatGrid({ children, busy, className }: WorkspaceStatGridProps) {
  return (
    <div
      aria-live="polite"
      aria-busy={busy || undefined}
      className={cn('grid gap-6 wide:grid-cols-2 min-[1051px]:grid-cols-3', className)}
    >
      {children}
    </div>
  );
}

export interface WorkspaceActionPanelProps {
  /** "Find your next possibility", "Keep your workflow moving". */
  title: string;
  /** The one sentence under it, saying what the buttons will do. */
  children: ReactNode;
  /** One or two buttons. More than two belongs in the sidebar, not here. */
  actions: ReactNode;
  className?: string;
}

/**
 * The prototype's `.panel.stack` below the figures: what this role should do next, in a heading, a
 * sentence and at most two buttons.
 */
export function WorkspaceActionPanel({ title, children, actions, className }: WorkspaceActionPanelProps) {
  return (
    <Panel as="section" className={cn('mt-6 flex flex-col gap-[22px]', className)}>
      <h2 className={SECTION_TITLE}>{title}</h2>
      <p className="text-muted-foreground">{children}</p>
      <div className="flex flex-wrap items-center gap-3">{actions}</div>
    </Panel>
  );
}

export interface WorkspaceActivityProps {
  /** Defaults to the prototype's own "Recent activity". */
  title?: string;
  /** {@link AuditRow}s, or a single line saying there is nothing yet. */
  children: ReactNode;
  busy?: boolean;
  className?: string;
}

/**
 * The block every overview closes on: a heading over a panel of what has happened lately. Like the
 * figures above it, the panel is a live region because its contents arrive after the first paint.
 */
export function WorkspaceActivity({ title = 'Recent activity', children, busy, className }: WorkspaceActivityProps) {
  return (
    <section className={cn('mt-[30px]', className)}>
      <h2 className={cn(SECTION_TITLE, 'mb-3')}>{title}</h2>
      <Panel aria-live="polite" aria-busy={busy || undefined}>
        {children}
      </Panel>
    </section>
  );
}
