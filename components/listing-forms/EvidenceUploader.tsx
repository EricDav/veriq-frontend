'use client';

import { useCallback, useEffect, useId, useState } from 'react';
import { FileText, Lock, Upload } from 'lucide-react';
import { ownerSaleListingsApi, propertySubmissionsApi, sharedPropertiesApi } from '@/lib/api/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button } from '@/components/ui';
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
      <p className="flex items-center gap-2 text-xs text-muted-foreground">
        <Lock aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" /> Evidence is private. It is never shown to renters and is only visible to you, your assigned Veriq Agent and Veriq Admin.
      </p>

      {missingRequired.length > 0 && !loading && (
        <Notice tone="warning" title="Required before submission">
          {missingRequired.map((option) => EVIDENCE_KIND_LABELS[option.kind]).join(', ')}
        </Notice>
      )}

      {!disabled && (
        <div className="grid gap-4 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] sm:grid-cols-2">
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
            <label htmlFor={inputId} className="label">
              File (PDF or photo, max 10 MB) <span className="text-destructive">*</span>
            </label>
            <label
              htmlFor={inputId}
              className="flex cursor-pointer items-center gap-2 rounded-unit border border-dashed border-[#ffffff25] px-4 py-3 text-ui-md text-muted-foreground transition-colors hover:border-[#10b98170] hover:text-foreground focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background"
            >
              <Upload aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
              <span className="truncate">{file ? file.name : 'Choose file'}</span>
            </label>
            <input
              id={inputId}
              type="file"
              required
              className="sr-only"
              accept=".pdf,.jpg,.jpeg,.png,.webp,.heic,.heif,application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor={`${inputId}-notes`} className="label">
              Notes for your Veriq Agent
              <span className="ml-1.5 text-xs font-normal text-muted-foreground">Optional</span>
            </label>
            <input
              id={`${inputId}-notes`}
              className="input"
              maxLength={1000}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </div>
          <div className="sm:col-span-2">
            <Button className="w-full sm:w-auto" disabled={uploading || !file || !kind} onClick={() => void upload()}>
              {uploading && <LoadingSpinner size="sm" />} Upload evidence
            </Button>
          </div>
        </div>
      )}

      {loading ? (
        <p role="status" aria-live="polite" className="flex items-center gap-2 text-ui-md text-muted-foreground">
          <LoadingSpinner size="sm" className="text-primary" /> Loading evidence…
        </p>
      ) : loadError ? (
        <Notice tone="error">
          {loadError}{' '}
          <Button variant="secondary" size="small" className="mt-3" onClick={() => { setLoading(true); void load(); }}>
            Retry
          </Button>
        </Notice>
      ) : records.length === 0 ? (
        <p className="text-ui-md text-muted-foreground">No evidence uploaded yet.</p>
      ) : (
        <ul className="divide-y divide-[#ffffff10] rounded-review border border-[#ffffff18]">
          {records.map((record) => (
            <li key={record.id} className="flex flex-col gap-1 p-3 text-ui-md sm:flex-row sm:items-center sm:justify-between">
              <div className="flex min-w-0 items-center gap-2">
                <FileText aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="min-w-0">
                  <p className="truncate font-medium text-foreground">{record.fileName ?? 'Evidence file'}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(record.createdAt)}
                    {record.notes ? ` · ${record.notes}` : ''}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <StatusBadge tone="blue">{EVIDENCE_KIND_LABELS[record.kind] ?? record.kind}</StatusBadge>
                {record.url && (
                  <Button asChild variant="ghost" size="small">
                    <a href={record.url} target="_blank" rel="noopener noreferrer">
                      View<span className="sr-only"> {record.fileName ?? 'evidence file'} (opens in a new tab)</span>
                    </a>
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
