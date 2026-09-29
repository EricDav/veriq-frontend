'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { apiErrorLines, apiErrorMessage } from './format';

/**
 * A backend error with any structured `details` (blockers or field issues).
 *
 * `Notice` has no destructive tone, so this carries the prototype's red badge/notice tint directly —
 * `#fb718510` on `#fb718530`, the same pair `Badge tone="red"` uses.
 */
export function ApiErrorNotice({
  error,
  fallback = 'Something went wrong. Please try again.',
  onRetry,
  className,
}: {
  error: unknown;
  fallback?: string;
  onRetry?: () => void;
  className?: string;
}) {
  if (!error) return null;
  const lines = apiErrorLines(error);
  return (
    <div
      role="alert"
      className={cn('rounded-xl border border-[#fb718530] bg-[#fb718510] px-5 py-[18px] text-ui-md', className)}
    >
      <div className="flex items-start gap-3">
        <AlertCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#fda4af]" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-foreground">{apiErrorMessage(error, fallback)}</p>
          {lines.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-ui-sm text-muted-foreground">
              {lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="inline-flex flex-shrink-0 items-center gap-1.5 rounded-btn px-2 py-1 text-ui-sm font-semibold text-[#fda4af] transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          >
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
