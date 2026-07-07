import { getAccessToken } from './auth';

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

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

function normalizeUploadResponse(body: ExternalUploadResponse | null, fallback: File): ExternalUploadFile | null {
  return (
    body?.data ??
    body?.file ??
    (body?.url
      ? {
          url: body.url,
          name: body.name ?? fallback.name,
          path: body.path ?? body.url,
          size: body.size ?? fallback.size,
          mime: body.mime ?? body.mimetype ?? fallback.type,
        }
      : null)
  );
}

export async function uploadToFileService(file: File): Promise<ExternalUploadFile> {
  const formData = new FormData();
  formData.append('file', file);

  const accessToken = getAccessToken();
  const useBackendProxy = process.env.NEXT_PUBLIC_UPLOAD_DIRECT !== 'true' && !!accessToken;
  const uploadUrl = useBackendProxy ? `${API_BASE_URL}/uploads/file` : UPLOAD_URL;
  const headers = useBackendProxy ? { Authorization: `Bearer ${accessToken}` } : undefined;

  const res = await fetch(uploadUrl, {
    method: 'POST',
    headers,
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
