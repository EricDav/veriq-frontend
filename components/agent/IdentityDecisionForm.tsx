'use client';

import React, { useState } from 'react';
import { UserCheck } from 'lucide-react';
import type { OperatorIdentityStatus } from '@/types/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Field, smallPrimaryButton } from './ui';

/** Assigned-Agent identity decision for a Property Operator / resident (§7.1, §7.6). */
export function IdentityDecisionForm({ onDecide }: { onDecide: (status: OperatorIdentityStatus, note: string) => Promise<boolean> }) {
  const [status, setStatus] = useState<OperatorIdentityStatus | ''>('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-[220px_1fr_auto] sm:items-end">
        <Field label="Identity decision">
          <select className="input !py-2 text-sm" value={status} onChange={(event) => setStatus(event.target.value as OperatorIdentityStatus | '')}>
            <option value="">Select…</option>
            <option value="identity_verified">Verify identity</option>
            <option value="identity_pending">Keep pending (more information)</option>
            <option value="identity_rejected">Reject identity</option>
          </select>
        </Field>
        <Field label={status === 'identity_rejected' ? 'Reason (required)' : 'Note (optional)'}>
          <input className="input !py-2 text-sm" maxLength={500} value={note} onChange={(event) => setNote(event.target.value)} />
        </Field>
        <button
          type="button"
          className={smallPrimaryButton}
          disabled={busy || !status || (status === 'identity_rejected' && !note.trim())}
          onClick={async () => {
            if (!status) return;
            setBusy(true);
            if (await onDecide(status, note)) {
              setStatus('');
              setNote('');
            }
            setBusy(false);
          }}
        >
          {busy ? <LoadingSpinner size="sm" /> : <UserCheck className="h-3.5 w-3.5" />} Record decision
        </button>
      </div>
      <p className="text-[11px] text-muted-foreground">Identity verification is separate from listing verification (§7.6) and applies to all of this Operator&apos;s listings.</p>
    </div>
  );
}
