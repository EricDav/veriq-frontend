'use client';

import React from 'react';
import type { ListingRevision } from '@/types/agent';
import { humanize } from './format';

type Flat = Record<string, unknown>;

function flatten(value: unknown, prefix = '', out: Flat = {}): Flat {
  if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
    const entries = Object.entries(value as Record<string, unknown>);
    if (entries.length === 0 && prefix) out[prefix] = null;
    entries.forEach(([key, child]) => flatten(child, prefix ? `${prefix}.${key}` : key, out));
  } else if (prefix) {
    out[prefix] = value;
  }
  return out;
}

const display = (value: unknown) => {
  if (value === undefined || value === null || value === '') return '—';
  if (Array.isArray(value)) return value.length ? value.map((item) => humanize(String(item))).join(', ') : '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return value.toLocaleString('en-NG');
  const text = String(value);
  return /^[a-z0-9]+(_[a-z0-9]+)+$/.test(text) ? humanize(text) : text;
};

const same = (a: unknown, b: unknown) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);

const pathLabel = (path: string) =>
  path
    .split('.')
    .filter((segment) => segment !== 'components')
    .map((segment) => humanize(segment))
    .join(' › ');

export interface DiffRow {
  path: string;
  before: unknown;
  after: unknown;
}

/** Changed values between the approved snapshot and the Operator's proposal (§8.4, AC 12). */
export function revisionDiffRows(revision: Pick<ListingRevision, 'kind' | 'proposedChanges' | 'baseSnapshot'>): DiffRow[] {
  const { removedAnswers, ...proposed } = revision.proposedChanges as Record<string, unknown> & { removedAnswers?: unknown };
  void removedAnswers;
  const base = revision.baseSnapshot ?? {};
  if (revision.kind === 'address_correction') {
    const location = (proposed.location ?? {}) as Record<string, unknown>;
    const submitted = (base.submittedAddress ?? {}) as Record<string, unknown>;
    return Object.keys(location)
      .map((key) => ({ path: `address.${key}`, before: submitted[key], after: location[key] }))
      .filter((row) => !same(row.before, row.after));
  }
  const after = flatten(proposed);
  const before = flatten(base);
  const groups = new Set(Object.keys(proposed));
  const paths = new Set<string>([
    ...Object.keys(after),
    ...Object.keys(before).filter((path) => groups.has(path.split('.')[0])),
  ]);
  return Array.from(paths)
    .filter((path) => !(proposed[path.split('.')[0]] === undefined))
    .map((path) => ({ path, before: before[path], after: after[path] }))
    .filter((row) => !same(row.before, row.after))
    .sort((a, b) => a.path.localeCompare(b.path));
}

export function RevisionDiff({ revision }: { revision: ListingRevision }) {
  const rows = revisionDiffRows(revision);
  const removed = Array.isArray((revision.proposedChanges as { removedAnswers?: unknown }).removedAnswers)
    ? ((revision.proposedChanges as { removedAnswers: unknown[] }).removedAnswers as unknown[]).map(String)
    : [];

  return (
    <div className="space-y-2">
      {rows.length === 0 ? (
        <p className="text-xs text-muted-foreground">No value differences against the approved snapshot.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-[#ffffff10]">
          <table className="w-full min-w-[480px] text-xs">
            <thead className="bg-[#070b1444] text-left text-[11px] uppercase tracking-wide text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">Field</th>
                <th className="px-3 py-2 font-medium">Approved (before)</th>
                <th className="px-3 py-2 font-medium">Proposed (after)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#ffffff10]">
              {rows.map((row) => (
                <tr key={row.path} className="align-top">
                  <td className="px-3 py-2 font-medium text-foreground">{pathLabel(row.path)}</td>
                  <td className="px-3 py-2 text-[#fda4af]">
                    <span className="rounded bg-[#fb718510] px-1.5 py-0.5 line-through decoration-[#fb718560]">{display(row.before)}</span>
                  </td>
                  <td className="px-3 py-2 text-[#6ee7b7]">
                    <span className="rounded bg-[#10b98112] px-1.5 py-0.5">{display(row.after)}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {removed.length > 0 && (
        <p className="rounded-lg bg-[#fbbf2410] px-3 py-2 text-[11px] text-[#fcd34d]">
          Answers that no longer apply to the proposed structure and will be removed (kept in audit history): {removed.map(pathLabel).join(', ')}
        </p>
      )}
    </div>
  );
}
