export interface ExternalUploadFile {
  name: string;
  path: string;
  url: string;
  display_url?: string;
  optimized_url?: string;
  size: number;
  mime: string;
}

export const MAX_ORIGINAL_IMAGE_BYTES = 25 * 1024 * 1024;
export const PROCESSED_IMAGE_MAX_DIMENSION = 2560;
export const PROCESSED_IMAGE_TARGET_BYTES = 1.5 * 1024 * 1024;
export const ACCEPTED_IMAGE_INPUT = '.jpg,.jpeg,.png,.webp,.heic,.heif,image/jpeg,image/png,image/webp,image/heic,image/heif,image/heic-sequence,image/heif-sequence';

const ACCEPTED_IMAGE_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/heic',
  'image/heif',
  'image/heic-sequence',
  'image/heif-sequence',
]);

const ACCEPTED_IMAGE_EXTENSIONS = new Set(['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif']);

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || ACCEPTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

function assertAcceptedImage(file: File) {
  const mime = file.type.toLowerCase();
  const extension = fileExtension(file.name);
  if (!ACCEPTED_IMAGE_MIME_TYPES.has(mime) && !ACCEPTED_IMAGE_EXTENSIONS.has(extension)) {
    throw new Error('Use a JPG, JPEG, PNG, WebP, HEIC, or HEIF image.');
  }
  if (file.size > MAX_ORIGINAL_IMAGE_BYTES) {
    throw new Error('Image must not exceed 25 MB. Choose another photo and try again.');
  }
}

export async function optimizeImageForUpload(original: File): Promise<File> {
  assertAcceptedImage(original);

  return original;
}

interface ExternalUploadResponse {
  ok: boolean;
  success?: boolean;
  message?: string;
  data?: ExternalUploadFile;
  file?: ExternalUploadFile;
  url?: string;
  display_url?: string;
  optimized_url?: string;
  name?: string;
  path?: string;
  size?: number;
  mime?: string;
  mimetype?: string;
}

export const UPLOAD_URL =
  process.env.NEXT_PUBLIC_UPLOAD_URL ?? 'https://upload.logistecx.online/upload';

function resolveUploadUrl(value: string | undefined, fallback: File) {
  if (!value) return '';
  if (value.startsWith('http://') || value.startsWith('https://')) return value;

  try {
    const uploadOrigin = new URL(UPLOAD_URL).origin;
    return `${uploadOrigin}${value.startsWith('/') ? value : `/${value}`}`;
  } catch {
    return value || fallback.name;
  }
}

function normalizeUploadFile(file: Partial<ExternalUploadFile> | null | undefined, fallback: File): ExternalUploadFile | null {
  const rawUrl = file?.display_url ?? file?.optimized_url ?? file?.url ?? file?.path;
  const url = resolveUploadUrl(rawUrl, fallback);
  if (!url) return null;

  return {
    name: file?.name ?? fallback.name,
    path: file?.path ?? url,
    url,
    display_url: file?.display_url,
    optimized_url: file?.optimized_url,
    size: file?.size ?? fallback.size,
    mime: file?.mime ?? fallback.type,
  };
}

function normalizeUploadResponse(body: ExternalUploadResponse | null, fallback: File): ExternalUploadFile | null {
  return (
    normalizeUploadFile(body?.data, fallback) ??
    normalizeUploadFile(body?.file, fallback) ??
    normalizeUploadFile(
      body
        ? {
            url: body.url,
            display_url: body.display_url,
            optimized_url: body.optimized_url,
            name: body.name,
            path: body.path,
            size: body.size,
            mime: body.mime ?? body.mimetype,
          }
        : null,
      fallback,
    )
  );
}

export async function uploadToFileService(file: File): Promise<ExternalUploadFile> {
  if (isImageFile(file)) {
    await optimizeImageForUpload(file);
  }

  const formData = new FormData();
  formData.append('file', file, file.name || 'upload');

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const body = (await res.json().catch(() => null)) as ExternalUploadResponse | null;
  const uploaded = normalizeUploadResponse(body, file);
  const successful = body?.success ?? body?.ok ?? res.ok;
  if (!res.ok || !successful || !uploaded?.url) {
    throw new Error(body?.message ?? 'File upload failed');
  }

  return uploaded;
}
