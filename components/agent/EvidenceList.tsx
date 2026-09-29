'use client';

import React from 'react';
import { FileText, Lock } from 'lucide-react';
import type { VerificationEvidence } from '@/types/agent';
import { formatDateTime, humanize } from './format';

/** Private verification evidence (§25.3, §32.5): visible to the uploader, the assigned Agent and Admin only. */
export function EvidenceList({ items, emptyLabel = 'No evidence uploaded yet.' }: { items: Array<Pick<VerificationEvidence, 'id' | 'kind' | 'url' | 'fileName' | 'createdAt'> & { notes?: string | null }>; emptyLabel?: string }) {
  return (
    <div className="space-y-2">
      <p className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
        <Lock className="h-3 w-3" /> Private evidence — never shown publicly or in unlocked packages.
      </p>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyLabel}</p>
      ) : (
        <ul className="divide-y divide-[#ffffff10] rounded-xl border border-[#ffffff10]">
          {items.map((item) => (
            <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
              <div className="flex min-w-0 items-start gap-2">
                <FileText className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">{humanize(item.kind)}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {item.fileName ?? 'File'} · {formatDateTime(item.createdAt)}
                  </p>
                  {item.notes && <p className="text-xs text-muted-foreground">{item.notes}</p>}
                </div>
              </div>
              <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-primary hover:underline">
                Open
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
