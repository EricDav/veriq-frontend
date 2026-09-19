'use client';

import React from 'react';
import { FileText, Lock } from 'lucide-react';
import type { VerificationEvidence } from '@/types/agent';
import { formatDateTime, humanize } from './format';

/** Private verification evidence (§25.3, §32.5): visible to the uploader, the assigned Agent and Admin only. */
export function EvidenceList({ items, emptyLabel = 'No evidence uploaded yet.' }: { items: Array<Pick<VerificationEvidence, 'id' | 'kind' | 'url' | 'fileName' | 'createdAt'> & { notes?: string | null }>; emptyLabel?: string }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] text-slate-500">
        <Lock className="h-3 w-3" /> Private evidence — never shown publicly or in unlocked packages.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-slate-500">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-100">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-navy-900">{humanize(item.kind)}</p>
                  <p className="truncate text-[11px] text-slate-500">
                    {item.fileName ?? 'File'} · {formatDateTime(item.createdAt)}
                  </p>
                  {item.notes && <p className="text-xs text-slate-600">{item.notes}</p>}
                </div>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
