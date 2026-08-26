export interface ExternalUploadFile {
  name: string;
  path: string;
  url: string;
  size: number;
  mime: string;
}

export const MAX_ORIGINAL_IMAGE_BYTES = 25 * 1024 * 1024;
export const PROCESSED_IMAGE_MAX_DIMENSION = 2800;
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
const HEIC_MIME_TYPES = new Set(['image/heic', 'image/heif', 'image/heic-sequence', 'image/heif-sequence']);

function fileExtension(fileName: string) {
  return fileName.split('.').pop()?.toLowerCase() ?? '';
}

function isImageFile(file: File) {
  return file.type.startsWith('image/') || ACCEPTED_IMAGE_EXTENSIONS.has(fileExtension(file.name));
}

function isHeicFile(file: File) {
  return HEIC_MIME_TYPES.has(file.type.toLowerCase()) || ['heic', 'heif'].includes(fileExtension(file.name));
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

function replaceExtension(fileName: string, extension: string) {
  const baseName = fileName.replace(/\.[^.]+$/, '') || 'image';
  return `${baseName}.${extension}`;
}

async function convertHeicToJpeg(file: File) {
  const { default: heic2any } = await import('heic2any');
  const converted = await heic2any({
    blob: file,
    toType: 'image/jpeg',
    quality: 0.9,
  });
  const blob = Array.isArray(converted) ? converted[0] : converted;
  if (!blob) throw new Error('This HEIC/HEIF image could not be converted.');
  return new File([blob], replaceExtension(file.name, 'jpg'), {
    type: 'image/jpeg',
    lastModified: file.lastModified,
  });
}

export async function optimizeImageForUpload(original: File): Promise<File> {
  assertAcceptedImage(original);

  let browserCompatibleFile = original;
  if (isHeicFile(original)) {
    try {
      browserCompatibleFile = await convertHeicToJpeg(original);
    } catch (error) {
      throw new Error(error instanceof Error
        ? `Could not process the HEIC/HEIF image: ${error.message}`
        : 'Could not process the HEIC/HEIF image.');
    }
  }

  try {
    const { default: imageCompression } = await import('browser-image-compression');
    const compressed = await imageCompression(browserCompatibleFile, {
      maxSizeMB: PROCESSED_IMAGE_TARGET_BYTES / (1024 * 1024),
      maxWidthOrHeight: PROCESSED_IMAGE_MAX_DIMENSION,
      useWebWorker: true,
      initialQuality: 0.86,
      maxIteration: 12,
      preserveExif: false,
    });

    return compressed;
  } catch (error) {
    throw new Error(error instanceof Error
      ? `Could not optimize the image: ${error.message}`
      : 'Could not optimize the image.');
  }
}

interface ExternalUploadResponse {
  ok: boolean;
  success?: boolean;
  message?: string;
  data?: ExternalUploadFile;
  file?: ExternalUploadFile;
  url?: string;
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
  const rawUrl = file?.url ?? file?.path;
  const url = resolveUploadUrl(rawUrl, fallback);
  if (!url) return null;

  return {
    name: file?.name ?? fallback.name,
    path: file?.path ?? url,
    url,
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
  const uploadFile = isImageFile(file) ? await optimizeImageForUpload(file) : file;
  const formData = new FormData();
  formData.append('file', uploadFile);

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const body = (await res.json().catch(() => null)) as ExternalUploadResponse | null;
  const uploaded = normalizeUploadResponse(body, uploadFile);
  const successful = body?.success ?? body?.ok ?? res.ok;
  if (!res.ok || !successful || !uploaded?.url) {
    throw new Error(body?.message ?? 'File upload failed');
  }

  return uploaded;
}
