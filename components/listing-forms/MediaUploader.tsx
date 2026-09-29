'use client';

import { useId, useState } from 'react';
import { RefreshCw, Upload } from 'lucide-react';
import { listingMediaApi } from '@/lib/api/operator';
import { ACCEPTED_IMAGE_INPUT } from '@/lib/upload';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { buttonClass } from '@/components/ui';
import { useToast } from '@/components/ui/Toast';
import { cn } from '@/lib/utils';
import type { MediaOwnerType } from '@/types/operator';
import { errorMessage } from './issues';

const ACCEPTED_EXTENSIONS = ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'];

function isAcceptedImage(file: File) {
  const extension = file.name.split('.').pop()?.toLowerCase() ?? '';
  return ACCEPTED_EXTENSIONS.includes(extension) || /^image\/(jpeg|png|webp|heic|heif)/.test(file.type);
}

export interface MediaUploaderProps {
  ownerType: MediaOwnerType;
  ownerId: string;
  mediaCategory: string;
  componentKey?: string | null;
  /** Upload a replacement for an approved image; it stays pending until the Agent approves (§9.3). */
  replacesMediaId?: string;
  /** Remaining capacity in this category (max 5 per category, H.13–H.14). */
  remaining: number;
  label?: string;
  disabled?: boolean;
  onUploaded: () => void;
  className?: string;
}

/** Uploads JPG/PNG/WebP/HEIC images into one media category/component for Veriq Agent review. */
export function MediaUploader({
  ownerType,
  ownerId,
  mediaCategory,
  componentKey,
  replacesMediaId,
  remaining,
  label,
  disabled = false,
  onUploaded,
  className,
}: MediaUploaderProps) {
  const inputId = useId();
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null);
  const { success, error, warning } = useToast();
  const replacing = !!replacesMediaId;
  const blocked = disabled || progress !== null || (!replacing && remaining <= 0);

  const handleFiles = async (list: FileList | null) => {
    if (!list?.length) return;
    const files = Array.from(list);
    const unsupported = files.filter((file) => !isAcceptedImage(file));
    if (unsupported.length) {
      error(`Unsupported file type: ${unsupported.map((file) => file.name).join(', ')}. Upload JPG, PNG, WebP or HEIC images.`);
      return;
    }
    const allowed = replacing ? files.slice(0, 1) : files.slice(0, Math.max(remaining, 0));
    if (!replacing && files.length > allowed.length) {
      warning(`Only ${allowed.length} more image${allowed.length === 1 ? '' : 's'} can be added to this category (maximum 5).`);
    }
    if (!allowed.length) return;
    setProgress({ done: 0, total: allowed.length });
    let uploaded = 0;
    let lastMessage = '';
    for (const file of allowed) {
      try {
        const response = await listingMediaApi.upload(ownerType, ownerId, {
          file,
          mediaCategory,
          componentKey: componentKey ?? null,
          replacesMediaId: replacesMediaId ?? null,
        });
        uploaded += 1;
        lastMessage = response.message;
        setProgress({ done: uploaded, total: allowed.length });
      } catch (caught) {
        error(`${file.name}: ${errorMessage(caught, 'Upload failed')}`);
        break;
      }
    }
    setProgress(null);
    if (uploaded > 0) {
      success(
        uploaded === 1
          ? lastMessage || 'Image submitted for Veriq Agent review'
          : `${uploaded} images submitted for Veriq Agent review. Current verified media stays live until approval.`,
      );
      onUploaded();
    }
  };

  return (
    <label
      htmlFor={inputId}
      className={cn(
        buttonClass('secondary', 'small'),
        'cursor-pointer focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 focus-within:ring-offset-background',
        blocked && 'cursor-not-allowed opacity-60 hover:bg-[#ffffff06]',
        className,
      )}
    >
      {progress ? (
        <span role="status" aria-live="polite" className="inline-flex items-center gap-[9px]">
          <LoadingSpinner size="sm" /> Uploading {progress.done + 1 > progress.total ? progress.total : progress.done + 1}/{progress.total}
        </span>
      ) : (
        <>
          {replacing ? (
            <RefreshCw aria-hidden="true" className="h-3.5 w-3.5" />
          ) : (
            <Upload aria-hidden="true" className="h-3.5 w-3.5" />
          )}
          {label ?? (replacing ? 'Replace' : 'Add images')}
        </>
      )}
      <input
        id={inputId}
        type="file"
        className="sr-only"
        accept={ACCEPTED_IMAGE_INPUT}
        multiple={!replacing}
        disabled={blocked}
        onChange={(event) => {
          const files = event.target.files;
          void handleFiles(files).finally(() => {
            event.target.value = '';
          });
        }}
      />
    </label>
  );
}
