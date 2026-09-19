'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { publicAgentsApi } from '@/lib/api/renter';
import { PublicAgentProfile } from '@/components/renter/PublicAgentProfile';

/** Public Veriq Agent profile addressed by name slug (e.g. /agent/jerry-alienyi). */
export default function PublicAgentProfilePage() {
  const { slug } = useParams<{ slug: string }>();
  const load = useCallback(() => publicAgentsApi.bySlug(slug), [slug]);
  return <PublicAgentProfile load={load} />;
}
