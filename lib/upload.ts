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
  const uploaded = body?.data ?? body?.file;
  const successful = body?.success ?? body?.ok;
  if (!res.ok || !successful || !uploaded?.url) {
    throw new Error(body?.message ?? 'File upload failed');
  }

  return uploaded;
}
