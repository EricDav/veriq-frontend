'use client';

import React, { useState } from 'react';
import { AlertTriangle, FileCheck2, Plus, Save, Scale } from 'lucide-react';
import type {
  DocumentCheckInput,
  LegalSearchStatus,
  SaleDocumentAvailability,
  SaleDocumentCheck,
  SaleDocumentType,
} from '@/types/agent';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { cn } from '@/lib/utils';
import { formatDateTime } from './format';
import { Field, InlineNotice, smallButton, smallPrimaryButton } from './ui';

export const DOCUMENT_AVAILABILITY_LABELS: Record<SaleDocumentAvailability, string> = {
  available: 'Available',
  not_available: 'Not Available',
  not_presented: 'Not Presented',
  sighted: 'Sighted by Veriq Agent',
  requires_further_verification: 'Requires further verification',
};

export const LEGAL_SEARCH_LABELS: Record<LegalSearchStatus, string> = {
  not_performed: 'No independent legal search performed',
  requested: 'Independent legal search requested',
  completed_no_issues: 'Independent legal search completed — no issues reported',
  completed_issues_found: 'Independent legal search completed — issues reported',
};

const AVAILABILITY_STYLES: Record<SaleDocumentAvailability, string> = {
  available: 'bg-[#10b98112] text-[#6ee7b7]',
  sighted: 'bg-teal-50 text-teal-700',
  not_available: 'bg-[#ffffff0f] text-muted-foreground',
  not_presented: 'bg-[#ffffff0f] text-muted-foreground',
  requires_further_verification: 'bg-[#fbbf2410] text-[#fcd34d]',
};

function DocumentForm({
  type,
  existing,
  otherLabelEditable,
  onSave,
  availabilityLabels,
  legalLabels,
}: {
  type: SaleDocumentType;
  existing: SaleDocumentCheck | null;
  otherLabelEditable: boolean;
  onSave: (input: DocumentCheckInput) => Promise<boolean>;
  availabilityLabels: Record<SaleDocumentAvailability, string>;
  legalLabels: Record<LegalSearchStatus, string>;
}) {
  const [availability, setAvailability] = useState<SaleDocumentAvailability | ''>(existing?.availability ?? '');
  const [legalSearchStatus, setLegalSearchStatus] = useState<LegalSearchStatus | ''>(existing?.legalSearchStatus ?? '');
  const [legalSearchReference, setLegalSearchReference] = useState(existing?.legalSearchReference ?? '');
  const [source, setSource] = useState(existing?.source ?? '');
  const [notes, setNotes] = useState(existing?.notes ?? '');
  const [otherLabel, setOtherLabel] = useState(existing && existing.documentType === 'other' ? existing.label : '');
  const [discrepancyFound, setDiscrepancyFound] = useState(existing?.discrepancyFound ?? false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState('');

  const escalates = discrepancyFound || legalSearchStatus === 'completed_issues_found';

  const submit = async () => {
    if (!availability) return setLocalError('Select the document status.');
    if (!legalSearchStatus) return setLocalError('State the independent legal search position.');
    if (type.key === 'other' && !otherLabel.trim()) return setLocalError('Name the other document.');
    setLocalError('');
    setSaving(true);
    await onSave({
      documentType: type.key,
      ...(type.key === 'other' ? { otherLabel: otherLabel.trim() } : {}),
      availability,
      legalSearchStatus,
      ...(legalSearchReference.trim() ? { legalSearchReference: legalSearchReference.trim() } : {}),
      ...(source.trim() ? { source: source.trim() } : {}),
      ...(notes.trim() ? { notes: notes.trim() } : {}),
      discrepancyFound,
    });
    setSaving(false);
  };

  return (
    <div className="space-y-3">
      {type.key === 'other' && (
        <Field label="Document name">
          <input
            className="input !py-2 text-sm"
            maxLength={160}
            value={otherLabel}
            disabled={!otherLabelEditable}
            onChange={(event) => setOtherLabel(event.target.value)}
          />
        </Field>
      )}
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        <Select
          id={`document-availability-${type.key}`}
          label="Document status (availability / sighting)"
          labelClassName="!mb-1 !text-xs"
          className="!py-2 text-sm"
          options={(Object.keys(availabilityLabels) as SaleDocumentAvailability[]).map((key) => ({ value: key, label: availabilityLabels[key] }))}
          value={availability}
          onValueChange={(value) => setAvailability(value as SaleDocumentAvailability | '')}
          required
        />
        <Select
          id={`document-legal-search-${type.key}`}
          label="Independent legal search (separate state)"
          labelClassName="!mb-1 !text-xs"
          className="!py-2 text-sm"
          options={(Object.keys(legalLabels) as LegalSearchStatus[]).map((key) => ({ value: key, label: legalLabels[key] }))}
          value={legalSearchStatus}
          onValueChange={(value) => setLegalSearchStatus(value as LegalSearchStatus | '')}
          required
        />
        <Field label="Legal search reference" hint="Optional">
          <input className="input !py-2 text-sm" maxLength={200} value={legalSearchReference} onChange={(event) => setLegalSearchReference(event.target.value)} />
        </Field>
        <Field label="Source" hint="Optional — e.g. original sighted at the owner's home, certified copy">
          <input className="input !py-2 text-sm" maxLength={200} value={source} onChange={(event) => setSource(event.target.value)} />
        </Field>
      </div>
      <Field label="Agent notes" hint="Optional — kept internal">
        <textarea className="input resize-y !py-2 text-sm" rows={2} maxLength={2000} value={notes} onChange={(event) => setNotes(event.target.value)} />
      </Field>
      <label className="flex items-start gap-2 rounded-xl border border-[#fb718530] bg-[#fb718510] px-3 py-2">
        <input type="checkbox" className="mt-0.5 h-4 w-4" checked={discrepancyFound} onChange={(event) => setDiscrepancyFound(event.target.checked)} />
        <span className="text-xs text-[#fda4af]">
          <strong>Material discrepancy found</strong> between owner identity, property identity, survey or location information and the documents presented.
        </span>
      </label>
      {escalates && (
        <InlineNotice tone="danger">
          Saving escalates this sale listing to Admin. Publication is blocked until Admin clears the escalation.
        </InlineNotice>
      )}
      {localError && <p className="text-xs text-destructive">{localError}</p>}
      <div className="flex justify-end">
        <button type="button" className={smallPrimaryButton} onClick={submit} disabled={saving}>
          {saving ? <LoadingSpinner size="sm" /> : <Save className="h-3.5 w-3.5" />} Record document status
        </button>
      </div>
    </div>
  );
}

/**
 * Sale document-status checklist (§6.5, §7.5). Availability/sighting and the independent legal search are separate
 * states; sighting a document is never presented as a legal title guarantee.
 */
export function DocumentChecklist({
  types,
  documents,
  availabilityLabels = DOCUMENT_AVAILABILITY_LABELS,
  legalLabels = LEGAL_SEARCH_LABELS,
  onSave,
  readOnly,
}: {
  types: SaleDocumentType[];
  documents: SaleDocumentCheck[];
  availabilityLabels?: Record<SaleDocumentAvailability, string>;
  legalLabels?: Record<LegalSearchStatus, string>;
  onSave: (input: DocumentCheckInput) => Promise<boolean>;
  readOnly?: boolean;
}) {
  const [open, setOpen] = useState<string | null>(null);
  const [addingOther, setAddingOther] = useState(false);

  const saveAndClose = async (input: DocumentCheckInput) => {
    const ok = await onSave(input);
    if (ok) {
      setOpen(null);
      setAddingOther(false);
    }
    return ok;
  };

  const rows: Array<{ id: string; type: SaleDocumentType; record: SaleDocumentCheck | null }> = types.flatMap((type) => {
    if (type.key !== 'other') {
      return [{ id: type.key, type, record: documents.find((doc) => doc.documentType === type.key) ?? null }];
    }
    return documents.filter((doc) => doc.documentType === 'other').map((doc) => ({ id: `other-${doc.label}`, type, record: doc }));
  });
  const otherType = types.find((type) => type.key === 'other');

  return (
    <div className="space-y-3">
      <InlineNotice tone="info">
        <span className="flex items-start gap-2">
          <Scale className="mt-0.5 h-4 w-4 flex-shrink-0" />
          <span>
            Document statuses record availability and sighting only. <strong>Sighted ≠ legal search.</strong> Record an independent qualified legal
            search separately, and only when one has actually been performed.
          </span>
        </span>
      </InlineNotice>
      <ul className="space-y-2">
        {rows.map(({ id, type, record }) => (
          <li key={id} className={cn('rounded-xl border p-3', record?.discrepancyFound ? 'border-[#fb718530]' : 'border-[#ffffff10]')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-foreground">{record && record.documentType === 'other' ? `Other: ${record.label}` : type.label}</p>
                {record ? (
                  <div className="mt-1 space-y-1">
                    <div className="flex flex-wrap gap-1.5">
                      <span className={cn('badge !px-2 !py-0.5 text-[11px]', AVAILABILITY_STYLES[record.availability])}>
                        {availabilityLabels[record.availability] ?? record.availability}
                      </span>
                      <span className="badge bg-[#070b1444] !px-2 !py-0.5 text-[11px] text-muted-foreground border-[#ffffff20]">{legalLabels[record.legalSearchStatus] ?? record.legalSearchStatus}</span>
                      {record.discrepancyFound && (
                        <span className="badge bg-[#fb718510] !px-2 !py-0.5 text-[11px] text-[#fda4af] border-[#fb718530]">
                          <AlertTriangle className="h-3 w-3" /> Discrepancy
                        </span>
                      )}
                    </div>
                    {record.legalSearchReference && <p className="text-[11px] text-muted-foreground">Legal search ref: {record.legalSearchReference}</p>}
                    {record.source && <p className="text-[11px] text-muted-foreground">Source: {record.source}</p>}
                    {record.notes && <p className="text-xs text-muted-foreground">{record.notes}</p>}
                    <p className="text-[11px] text-muted-foreground">Last checked {formatDateTime(record.checkedAt)}</p>
                  </div>
                ) : (
                  <p className="text-[11px] text-muted-foreground">Not yet recorded</p>
                )}
              </div>
              {!readOnly && (
                <button type="button" className={smallButton} onClick={() => setOpen(open === id ? null : id)}>
                  <FileCheck2 className="h-3.5 w-3.5" /> {open === id ? 'Close' : record ? 'Update' : 'Record'}
                </button>
              )}
            </div>
            {open === id && (
              <div className="mt-3 border-t border-[#ffffff10] pt-3">
                <DocumentForm
                  type={type}
                  existing={record}
                  otherLabelEditable={false}
                  onSave={saveAndClose}
                  availabilityLabels={availabilityLabels}
                  legalLabels={legalLabels}
                />
              </div>
            )}
          </li>
        ))}
      </ul>
      {otherType && !readOnly && (
        <div className="rounded-xl border border-dashed border-[#ffffff18] p-3">
          {addingOther ? (
            <DocumentForm type={otherType} existing={null} otherLabelEditable onSave={saveAndClose} availabilityLabels={availabilityLabels} legalLabels={legalLabels} />
          ) : (
            <button type="button" className={smallButton} onClick={() => setAddingOther(true)}>
              <Plus className="h-3.5 w-3.5" /> Add other document
            </button>
          )}
        </div>
      )}
    </div>
  );
}
