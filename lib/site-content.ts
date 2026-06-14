import type { SiteContent } from '@/types';

const BASE_URL =
  process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

export async function getPublicPageContent(page: string) {
  try {
    const res = await fetch(`${BASE_URL}/site-content/page/${page}`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return {};
    const body = (await res.json()) as { data?: SiteContent[] };
    return Object.fromEntries(
      (body.data ?? []).map((item) => [item.section, item]),
    ) as Record<string, SiteContent>;
  } catch {
    return {};
  }
}
