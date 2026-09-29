'use client';

import { useRef, useState } from 'react';
import { FileText, Paperclip, X } from 'lucide-react';
import { uploadToFileService } from '@/lib/upload';
import { Button } from '@/components/ui';
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
        <Button
          variant="secondary"
          size="small"
          onClick={() => inputRef.current?.click()}
          disabled={disabled || uploading > 0 || remaining <= 0}
        >
          {uploading > 0 ? <LoadingSpinner size="sm" /> : <Paperclip aria-hidden="true" className="h-4 w-4" />}
          {uploading > 0 ? `Uploading ${uploading}…` : 'Attach evidence'}
        </Button>
        <span className="text-ui-sm text-muted-foreground" aria-live="polite">
          {remaining} of {max} slots left · 20 MB each
        </span>
        <input ref={inputRef} type="file" accept={ACCEPT} multiple hidden onChange={(event) => void addFiles(event.target.files)} />
      </div>
      {error && (
        <p role="alert" className="mt-2 text-ui-sm font-medium text-destructive">
          {error}
        </p>
      )}
      {files.length > 0 && (
        <ul className="mt-3 space-y-2">
          {files.map((file) => (
            <li
              key={file.url}
              className="flex items-center justify-between gap-3 rounded-unit border border-[#ffffff18] bg-[#070b1444] px-3 py-2 text-ui-sm"
            >
              <a
                href={file.url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex min-w-0 items-center gap-2 font-medium text-foreground hover:underline"
              >
                <FileText aria-hidden="true" className="h-4 w-4 flex-shrink-0 text-muted-foreground" />{' '}
                <span className="truncate">{file.name}</span>
              </a>
              <button
                type="button"
                onClick={() => onChange(files.filter((item) => item.url !== file.url))}
                disabled={disabled}
                className="rounded p-1 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                aria-label={`Remove ${file.name}`}
              >
                <X aria-hidden="true" className="h-3.5 w-3.5" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
