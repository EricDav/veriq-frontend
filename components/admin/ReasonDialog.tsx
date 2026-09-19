'use client';

import React, { useEffect, useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { cn } from '@/lib/utils';

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
      <form onSubmit={submit} className="space-y-4">
        <div className="text-sm leading-relaxed text-slate-600">{message}</div>
        {children}
        <div>
          <label className="label text-xs" htmlFor="reason-dialog-reason">
            {reasonLabel}
            {!reasonRequired && <span className="font-normal text-slate-400"> (optional)</span>}
          </label>
          <textarea
            id="reason-dialog-reason"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            className="input min-h-24 resize-y"
            maxLength={maxLength}
            placeholder={reasonPlaceholder}
            required={reasonRequired}
          />
          <p className="mt-1 text-[11px] text-slate-400">
            {reasonRequired && trimmed.length < minLength
              ? `At least ${minLength} characters.`
              : `${trimmed.length}/${maxLength}`}
          </p>
        </div>
        {acknowledgement && (
          <label className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs text-amber-900">
            <input
              type="checkbox"
              checked={acknowledged}
              onChange={(event) => setAcknowledged(event.target.checked)}
              className="mt-0.5 h-4 w-4 accent-amber-600"
            />
            <span>{acknowledgement}</span>
          </label>
        )}
        <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-medium text-navy-700 hover:bg-slate-50 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!ready}
            className={cn(
              'inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-colors disabled:opacity-50',
              variant === 'danger' ? 'bg-red-600 hover:bg-red-700' : 'bg-emerald-600 hover:bg-emerald-700',
            )}
          >
            {submitting && <LoadingSpinner size="sm" />}
            {confirmLabel}
          </button>
        </div>
      </form>
    </Modal>
  );
}
