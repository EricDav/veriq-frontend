'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { FileText, Lock, Upload } from 'lucide-react';
import { ownerSaleListingsApi, propertySubmissionsApi, sharedPropertiesApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Select } from '@/components/ui/Select';
import { useToast } from '@/components/ui/Toast';
import type { EvidenceKind, EvidenceRecord } from '@/types/operator';
import { errorMessage } from './issues';
import { EVIDENCE_KIND_LABELS, formatDateTime } from './labels';
import { Notice, StatusBadge } from './ui';

const EVIDENCE_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
const EVIDENCE_EXTENSIONS = ['pdf', 'jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];
const EVIDENCE_MAX_BYTES = 10 * 1024 * 1024;

export interface EvidenceKindOption {
  kind: EvidenceKind;
  help?: string;
  required?: boolean;
}

export interface EvidenceUploaderProps {
  ownerType: 'property' | 'shared_opportunity' | 'sale_listing';
  ownerId: string;
  kinds: EvidenceKindOption[];
  disabled?: boolean;
  /**
   * Records to list, for an owner type whose uploads arrive inside a larger payload rather than from an evidence
   * endpoint of its own (a sale listing). When given, this component lists these instead of fetching.
   */
  records?: EvidenceRecord[];
  onChanged?: (records: EvidenceRecord[]) => void;
}

/** Private verification evidence (§7.2–7.4, §25.3): visible only to you, your assigned Veriq Agent and Admin. */
export function EvidenceUploader({
  ownerType,
  ownerId,
  kinds,
  disabled = false,
  records: suppliedRecords,
  onChanged,
}: EvidenceUploaderProps) {
  const inputId = useId();
  const [fetched, setFetched] = useState<EvidenceRecord[]>([]);
  const [loading, setLoading] = useState(!suppliedRecords);
  const [loadError, setLoadError] = useState<string | null>(null);
  // §7 Forms: the evidence type starts blank on a Select placeholder rather than preselecting the first kind.
  const [kind, setKind] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const { success, error } = useToast();

  const records = suppliedRecords ?? fetched;

  const load = useCallback(async () => {
    if (suppliedRecords) {
      onChanged?.(suppliedRecords);
      setLoading(false);
      return;
    }
    setLoadError(null);
    try {
      const response =
        ownerType === 'property'
          ? await propertySubmissionsApi.evidence(ownerId)
          : await sharedPropertiesApi.evidence(ownerId);
      setFetched(response.data);
      onChanged?.(response.data);
    } catch (caught) {
      setLoadError(errorMessage(caught, 'Unable to load verification evidence'));
    } finally {
      setLoading(false);
    }
    // onChanged is intentionally excluded so parents can pass inline callbacks without reload loops.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerType, ownerId, suppliedRecords]);

  useEffect(() => {
    if (!suppliedRecords) setLoading(true);
    void load();
  }, [load, suppliedRecords]);

  const upload = async () => {
    if (!kind) {
      error('Choose which kind of evidence this is.');
      return;
    }
    if (!file) {
      error('Choose the evidence file to upload.');
      return;
    }
    const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
    if (!EVIDENCE_TYPES.includes(file.type) && !EVIDENCE_EXTENSIONS.includes(extension)) {
      error('Upload a PDF or photo (JPG, PNG, WebP, HEIC).');
      return;
    }
    if (file.size > EVIDENCE_MAX_BYTES) {
      error('Evidence files must be 10 MB or smaller.');
      return;
    }
    setUploading(true);
    try {
      const selected = kind as EvidenceKind;
      const response =
        ownerType === 'property'
          ? await propertySubmissionsApi.addEvidence(ownerId, selected, file, notes)
          : ownerType === 'sale_listing'
            ? await ownerSaleListingsApi.addEvidence(ownerId, selected, file, notes)
            : await sharedPropertiesApi.addEvidence(ownerId, selected, file, notes);
      success(response.message || 'Evidence saved privately for verification');
      setFile(null);
      setNotes('');
      setKind('');
      await load();
    } catch (caught) {
      error(errorMessage(caught, 'Unable to upload evidence'));
    } finally {
      setUploading(false);
    }
  };

  const missingRequired = kinds.filter((option) => option.required && !records.some((record) => record.kind === option.kind));
  const selectedHelp = kinds.find((option) => option.kind === kind)?.help;

  return (
    <div className="space-y-4">
      <p className="flex items-center gap-2 text-xs text-slate-500">
        <Lock className="h-3.5 w-3.5" /> Evidence is private. It is never shown to renters and is only visible to you, your assigned Veriq Agent and Veriq Admin.
      </p>

      {missingRequired.length > 0 && !loading && (
        <Notice tone="warning" title="Required before submission">
          {missingRequired.map((option) => EVIDENCE_KIND_LABELS[option.kind]).join(', ')}
        </Notice>
      )}

      {!disabled && (
        <div className="grid gap-3 rounded-xl border border-slate-200 p-4 sm:grid-cols-2">
          <Select
            id={`${inputId}-kind`}
            label="Evidence type"
            options={kinds.map((option) => ({
              value: option.kind,
              label: `${EVIDENCE_KIND_LABELS[option.kind]}${option.required ? ' (required)' : ' (optional)'}`,
            }))}
            value={kind}
            onValueChange={setKind}
            hint={selectedHelp}
            required
          />
          <div>
            <span className="label">File (PDF or photo, max 10 MB) <span className="text-red-500">*</span></span>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-4 py-3 text-sm text-slate-600 hover:bg-slate-50"
            >
              <Upload className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{file ? file.name : 'Choose file'}</span>
            </label>
            <input
              id={inputId}
              type="file"
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <label className="block sm:col-span-2">
            <span className="label">Notes for your Veriq Agent <span className="text-xs font-normal text-slate-400">Optional</span></span>
            <input className="input" maxLength={1000} value={notes} onChange={(event) => setNotes(event.target.value)} />
          </label>
          <div className="sm:col-span-2">
            <button type="button" className="btn-primary w-full !py-2.5 sm:w-auto" disabled={uploading || !file || !kind} onClick={() => void upload()}>
              {uploading && <LoadingSpinner size="sm" />} Upload evidence
            </button>
          </div>
        </div>
      )}

      {loading ? (
        <p className="flex items-center gap-2 text-sm text-slate-500"><LoadingSpinner size="sm" /> Loading evidence…</p>
      ) : loadError ? (
        <Notice tone="error">
          {loadError}{' '}
          <button type="button" className="font-semibold underline" onClick={() => { setLoading(true); void load(); }}>Retry</button>
        </Notice>
      ) : records.length === 0 ? (
        <p className="text-sm text-slate-500">No evidence uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-slate-100 rounded-xl border border-slate-200">
          {records.map((record) => (
            <li key={record.id} className="flex flex-col gap-1 p-3 text-sm sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-navy-900">{record.fileName ?? 'Evidence file'}</p>
                  <p className="text-xs text-slate-500">
                    {formatDateTime(record.createdAt)}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone="blue">{EVIDENCE_KIND_LABELS[record.kind] ?? record.kind}</StatusBadge>
                {record.url && (
                  <a href={record.url} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary">
                    View
                  </a>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
