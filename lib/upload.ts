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

export async function uploadToFileService(file: File): Promise<ExternalUploadFile> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(UPLOAD_URL, {
    method: 'POST',
    body: formData,
  });

  const body = (await res.json().catch(() => null)) as ExternalUploadResponse | null;
  const uploaded =
    body?.data ??
    body?.file ??
    (body?.url
      ? {
          url: body.url,
          name: body.name ?? file.name,
          path: body.path ?? body.url,
          size: body.size ?? file.size,
          mime: body.mime ?? body.mimetype ?? file.type,
        }
      : null);
  const successful = body?.success ?? body?.ok ?? res.ok;
  if (!res.ok || !successful || !uploaded?.url) {
    throw new Error(body?.message ?? 'File upload failed');
  }

  return uploaded;
}
