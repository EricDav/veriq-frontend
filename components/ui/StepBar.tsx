'use client';

import { cn } from '@/lib/utils';

export interface Step {
  /** Stable key, also what `onSelect` receives. */
  id: string;
  label: string;
}

export interface StepBarProps {
  steps: readonly Step[];
  /** The step the user is on. Steps before it read as done, steps after it as still to come. */
  currentId: string;
  /** Lets the user go back to a completed step. Without it the bar is a read-only indicator. */
  onSelect?: (id: string) => void;
  /** Names the flow for screen readers, e.g. "Unlock checkout". */
  label: string;
  className?: string;
}

/**
 * The prototype's `.stepbar`: where the user is in a multi-step flow, drawn as a coloured rule above
 * each step's name. Only completed steps are reachable — a flow never lets someone skip ahead — and
 * the current one carries `aria-current="step"`.
 */
export function StepBar({ steps, currentId, onSelect, label, className }: StepBarProps) {
  const currentIndex = Math.max(
    0,
    steps.findIndex((step) => step.id === currentId),
  );

  return (
    <nav aria-label={label} className={cn('mb-[30px] flex gap-2', className)}>
      {steps.map((step, index) => {
        const isCurrent = index === currentIndex;
        const isDone = index < currentIndex;
        return (
          <button
            key={step.id}
            type="button"
            aria-current={isCurrent ? 'step' : undefined}
            disabled={!onSelect || !isDone}
            onClick={onSelect ? () => onSelect(step.id) : undefined}
            className={cn(
              'flex-1 border-t-[3px] py-[13px] text-left text-xs transition-colors wide:text-ui-sm',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
              'disabled:cursor-default',
              isCurrent && 'border-primary text-[#6ee7b7]',
              isDone && 'border-[#10b98166] text-muted-foreground',
              !isCurrent && !isDone && 'border-[#ffffff20] text-muted-foreground',
            )}
          >
            {step.label}
          </button>
        );
      })}
    </nav>
  );
}
