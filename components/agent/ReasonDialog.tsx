'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';
import { Field, smallButton, smallDangerButton, smallPrimaryButton } from './ui';

/** Modal that collects a required note/reason with the backend's length rules before running an action. */
export function ReasonDialog({
  isOpen,
  title,
  description,
  label,
  confirmLabel,
  minLength = 3,
  maxLength = 1000,
  optional = false,
  tone = 'primary',
  onClose,
  onConfirm,
}: {
  isOpen: boolean;
  title: string;
  description?: React.ReactNode;
  label: string;
  confirmLabel: string;
  minLength?: number;
  maxLength?: number;
  optional?: boolean;
  tone?: 'primary' | 'danger';
  onClose: () => void;
  onConfirm: (text: string) => Promise<boolean>;
}) {
  const [text, setText] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (isOpen) setText('');
  }, [isOpen]);

  const valid = optional ? text.trim().length === 0 || text.trim().length >= minLength : text.trim().length >= minLength;

  return (
    <Modal isOpen={isOpen} onClose={() => !busy && onClose()} title={title} size="md">
      <div className="space-y-4">
        {description && <div className="text-sm text-muted-foreground">{description}</div>}
        <Field label={label} hint={optional ? 'Optional' : `At least ${minLength} characters`}>
          <textarea
            className="input resize-y !py-2 text-sm"
            rows={4}
            maxLength={maxLength}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
        </Field>
        <div className="flex justify-end gap-2">
          <button type="button" className={smallButton} onClick={onClose} disabled={busy}>
            Cancel
          </button>
          <button
            type="button"
            className={cn(tone === 'danger' ? smallDangerButton : smallPrimaryButton)}
            disabled={busy || !valid}
            onClick={async () => {
              setBusy(true);
              const done = await onConfirm(text.trim());
              setBusy(false);
              if (done) onClose();
            }}
          >
            {busy && <LoadingSpinner size="sm" />} {confirmLabel}
          </button>
        </div>
      </div>
    </Modal>
  );
}
