'use client';

import { useCallback } from 'react';
import { useParams } from 'next/navigation';
import { publicAgentsApi } from '@/lib/api/renter';
import { PublicAgentProfile } from '@/components/renter/PublicAgentProfile';

/** Public Veriq Agent profile addressed by unique username — veriqproperty.com/{username}. */
export default function PublicProfilePage() {
  const { username } = useParams<{ username: string }>();
  const load = useCallback(() => publicAgentsApi.byUsername(username), [username]);
  return <PublicAgentProfile load={load} />;
}
