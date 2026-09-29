'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, CheckLine } from '@/components/ui';

export interface ReasonDialogProps {
  isOpen: boolean;
  onClose: () => void;
  /** Receives the trimmed reason; the caller closes the dialog once the action succeeds. */
  onConfirm: (reason: string) => Promise<void> | void;
  title: string;
  message: React.ReactNode;
  confirmLabel: string;
  variant?: 'danger' | 'primary';
  reasonLabel?: string;
  reasonPlaceholder?: string;
  /** When false the reason is optional (e.g. payout decision notes). */
  reasonRequired?: boolean;
  minLength?: number;
  maxLength?: number;
  /** Extra acknowledgement for financial or irreversible actions. */
  acknowledgement?: string;
  children?: React.ReactNode;
  /** Blocks confirmation while extra fields in `children` are invalid. */
  canConfirm?: boolean;
}

/** Confirmation dialog that captures the reason the backend records in the audit log. */
export function ReasonDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  confirmLabel,
  variant = 'primary',
  reasonLabel = 'Reason (recorded in the audit log)',
  reasonPlaceholder = 'Explain why this action is being taken',
  reasonRequired = true,
  minLength = 3,
  maxLength = 500,
  acknowledgement,
  children,
  canConfirm = true,
}: ReasonDialogProps) {
  const [reason, setReason] = useState('');
  const [acknowledged, setAcknowledged] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setReason('');
      setAcknowledged(false);
      setSubmitting(false);
    }
  }, [isOpen]);

  const trimmed = reason.trim();
  const reasonValid = !reasonRequired || trimmed.length >= minLength;
  const ready = reasonValid && canConfirm && (!acknowledgement || acknowledged) && !submitting;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready) return;
    setSubmitting(true);
    try {
      await onConfirm(trimmed);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={submitting ? () => undefined : onClose}
      title={title}
      size="md"
      className="max-h-[92vh] overflow-y-auto"
    >
      <form onSubmit={submit} className="space-y-5">
        <div className="text-ui-md leading-relaxed text-muted-foreground">{message}</div>
        {children}
        <div>
          <label className="label" htmlFor="reason-dialog-reason">
            {reasonLabel}
            {!reasonRequired && <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>}
          </label>
          <textarea
            id="reason-dialog-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="input min-h-24 resize-y"
            maxLength={maxLength}
            placeholder={reasonPlaceholder}
            required={reasonRequired}
            aria-describedby="reason-dialog-reason-count"
          />
          <p id="reason-dialog-reason-count" className="mt-1 text-xs text-muted-foreground">
            {reasonRequired && trimmed.length < minLength
              ? `At least ${minLength} characters.`
              : `${trimmed.length}/${maxLength}`}
          </p>
        </div>
        {acknowledgement && (
          <div className="rounded-review border border-[#fbbf2425] bg-[#fbbf2409] p-3.5">
            <CheckLine
              id="reason-dialog-acknowledgement"
              checked={acknowledged}
              onCheckedChange={setAcknowledged}
              className="text-ui-sm"
            >
              {acknowledgement}
            </CheckLine>
          </div>
        )}
        <div className="flex flex-col-reverse gap-3 wide:flex-row wide:justify-end">
          <Button variant="secondary" onClick={onClose} disabled={submitting}>
            Cancel
          </Button>
          <Button
            type="submit"
            variant={variant === 'danger' ? 'secondary' : 'primary'}
            disabled={!ready}
            className={variant === 'danger' ? 'border-[#fb718530] bg-[#fb718512] text-[#fda4af] hover:bg-[#fb718520]' : undefined}
          >
            {submitting && <LoadingSpinner size="sm" />}
            {confirmLabel}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
