'use client';

import { useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { uploadToFileService } from '@/lib/upload';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

export const MAX_EVIDENCE_FILES = 10;
const MAX_EVIDENCE_BYTES = 20 * 1024 * 1024;
const ACCEPT = '.jpg,.jpeg,.png,.webp,.heic,.heif,.pdf,image/*,application/pdf';

export interface UploadedEvidence {
  url: string;
  name: string;
}

/** Uploads refund evidence (photos, screenshots, PDFs) to the media upload service and returns their URLs. */
export function EvidenceUploader({
  files,
  onChange,
  max = MAX_EVIDENCE_FILES,
  disabled = false,
}: {
  files: UploadedEvidence[];
  onChange: (files: UploadedEvidence[]) => void;
  max?: number;
  disabled?: boolean;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const addFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    setError(null);
    const selected = Array.from(list).slice(0, Math.max(0, max - files.length));
    if (selected.length < list.length) setError(`You can attach up to ${max} files.`);
    const tooLarge = selected.filter((file) => file.size > MAX_EVIDENCE_BYTES);
    if (tooLarge.length) {
      setError(`${tooLarge.map((file) => file.name).join(', ')} ${tooLarge.length === 1 ? 'is' : 'are'} larger than 20 MB.`);
    }
    const accepted = selected.filter((file) => file.size <= MAX_EVIDENCE_BYTES);
    let next = [...files];
    for (const file of accepted) {
      setUploading((count) => count + 1);
      try {
        const uploaded = await uploadToFileService(file);
        next = [...next, { url: uploaded.url, name: file.name }];
        onChange(next);
      } catch (err) {
        setError(err instanceof Error ? `${file.name}: ${err.message}` : `${file.name} could not be uploaded.`);
      } finally {
        setUploading((count) => count - 1);
      }
    }
    if (inputRef.current) inputRef.current.value = '';
  };

  const remaining = max - files.length;

  return (
    <div>
      <div className="flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading > 0 || remaining <= 0}
          className="btn-outline !px-4 !py-2 !text-sm"
        >
          {uploading > 0 ? <LoadingSpinner size="sm" /> : <Paperclip className="h-4 w-4" />}
          {uploading > 0 ? `Uploading ${uploading}…` : 'Attach evidence'}
        </button>
        <span className="text-xs text-slate-500">Photos, screenshots or PDFs · up to {max} files, 20 MB each</span>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(event) => void addFiles(event.target.files)} />
      </div>
      {error && <p role="alert" className="mt-2 text-xs text-red-600">{error}</p>}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li key={file.url} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs">
              <a href={file.url} target="_blank" rel="noopener noreferrer" className="flex min-w-0 items-center gap-2 font-medium text-navy-800 hover:underline">
                <FileText className="h-4 w-4 flex-shrink-0 text-slate-400" /> <span className="truncate">{file.name}</span>
              </a>
              <button type="button" onClick={() => onChange(files.filter((item) => item.url !== file.url))} disabled={disabled} className="rounded p-1 text-slate-400 hover:bg-slate-200 hover:text-slate-700" aria-label={`Remove ${file.name}`}>
                <X className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
