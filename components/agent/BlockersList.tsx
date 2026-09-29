'use client';

import React from 'react';
import { AlertTriangle, CheckCircle2 } from 'lucide-react';
import { humanize } from './format';

interface NormalizedItem {
  key: string;
  title: string;
  code?: string;
  lines: string[];
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

function detailLines(details: unknown): string[] {
  if (details === undefined || details === null) return [];
  if (!Array.isArray(details)) return isRecord(details) && typeof details.message === 'string' ? [details.message] : [];
  return details.flatMap((entry): string[] => {
    if (typeof entry === 'string') return [humanize(entry)];
    if (!isRecord(entry)) return [];
    // Schema issue { path, message }
    if (typeof entry.message === 'string') return [entry.message];
    // Media checklist section
    if (typeof entry.label === 'string' && typeof entry.state === 'string') {
      const approved = Number(entry.approved ?? 0);
      const min = Number(entry.min ?? 0);
      return [`${entry.label}: ${humanize(entry.state)} (${approved}/${min} approved)`];
    }
    // Duplicate candidate
    if (typeof entry.targetId === 'string') {
      const reasons = Array.isArray(entry.reasons) ? (entry.reasons as unknown[]).map(String).join(', ') : '';
      return [`Possible duplicate ${entry.targetId}${reasons ? ` — ${reasons}` : ''}`];
    }
    return [];
  });
}

/** Normalizes readiness blockers `{code,message,details}` or schema issues `{path,message}` into display rows. */
export function normalizeBlockers(items: unknown[]): NormalizedItem[] {
  return items.map((item, index) => {
    if (typeof item === 'string') return { key: `s-${index}`, title: item, lines: [] };
    if (!isRecord(item)) return { key: `u-${index}`, title: 'Unrecognised validation detail', lines: [] };
    const title = typeof item.message === 'string' ? item.message : humanize(String(item.code ?? item.path ?? 'Issue'));
    const code = typeof item.code === 'string' ? item.code : typeof item.path === 'string' ? item.path : undefined;
    return { key: `${code ?? 'item'}-${index}`, title, code, lines: detailLines(item.details) };
  });
}

export function BlockersList({
  blockers,
  emptyLabel = 'No blockers — ready to publish.',
  title,
  compact,
}: {
  blockers: unknown[];
  emptyLabel?: string;
  title?: string;
  compact?: boolean;
}) {
  const items = normalizeBlockers(blockers);
  if (items.length === 0) {
    return (
      <p className="flex items-center gap-2 rounded-xl border border-[#10b98135] bg-[#10b98112] px-4 py-3 text-sm font-medium text-[#6ee7b7]">
        <CheckCircle2 className="h-4 w-4 flex-shrink-0" /> {emptyLabel}
      </p>
    );
  }
  return (
    <div className="rounded-xl border border-[#fbbf2425] bg-[#fbbf2409] p-4">
      {title && <p className="mb-2 text-xs font-bold uppercase tracking-wide text-[#fcd34d]">{title}</p>}
      <ul className="space-y-2">
        {items.map((item) => (
          <li key={item.key} className="flex items-start gap-2 text-sm text-[#fcd34d]">
            <AlertTriangle className="mt-0.5 h-4 w-4 flex-shrink-0 text-[#fcd34d]" />
            <div className="min-w-0">
              <p className="font-medium break-words">{item.title}</p>
              {!compact && item.lines.length > 0 && (
                <ul className="mt-1 list-disc space-y-0.5 pl-4 text-xs text-[#fcd34d]">
                  {item.lines.map((line, index) => (
                    <li key={`${item.key}-${index}`} className="break-words">{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
