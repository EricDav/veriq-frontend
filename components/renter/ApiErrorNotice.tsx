'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { apiErrorLines, apiErrorMessage } from './format';

/** Shows a backend error message with any structured `details` (blockers or field issues). */
export function ApiErrorNotice({
  error,
  fallback = 'Something went wrong. Please try again.',
  onRetry,
  tone = 'light',
  className = '',
}: {
  error: unknown;
  fallback?: string;
  onRetry?: () => void;
  tone?: 'light' | 'dark';
  className?: string;
}) {
  if (!error) return null;
  const lines = apiErrorLines(error);
  const palette = tone === 'dark'
    ? 'border-red-300/40 bg-red-500/10 text-red-100'
    : 'border-red-200 bg-red-50 text-red-700';
  return (
    <div role="alert" className={`rounded-xl border px-4 py-3 text-sm ${palette} ${className}`}>
      <div className="flex items-start gap-2">
        <AlertCircle className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <div className="min-w-0 flex-1">
          <p className="font-semibold">{apiErrorMessage(error, fallback)}</p>
          {lines.length > 0 && (
            <ul className="mt-1.5 list-disc space-y-0.5 pl-4 text-xs">
              {lines.map((line) => <li key={line}>{line}</li>)}
            </ul>
          )}
        </div>
        {onRetry && (
          <button type="button" onClick={onRetry} className="inline-flex flex-shrink-0 items-center gap-1 rounded-lg px-2 py-1 text-xs font-semibold underline-offset-2 hover:underline">
            <RefreshCw className="h-3.5 w-3.5" /> Retry
          </button>
        )}
      </div>
    </div>
  );
}
