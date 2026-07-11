export interface ExternalUploadFile {
  name: string;
  path: string;
  url: string;
  size: number;
  mime: string;
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
  const formData = new FormData();
  formData.append('file', file);

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
