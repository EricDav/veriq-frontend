'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { veriqAgentsAdminApi } from '@/lib/api/admin';
import type { VeriqAgentListItem } from '@/types/admin';
import { errorText } from './format';

/** Loads every Veriq Agent (all pages) so views can show names for Agent IDs in history rows. */
export function useAgentDirectory() {
  const [agents, setAgents] = useState<VeriqAgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const first = await veriqAgentsAdminApi.list({ page: 1, limit: 100 });
      const rest = await Promise.all(
        Array.from({ length: Math.max(0, first.meta.pages - 1) }, (_, index) =>
          veriqAgentsAdminApi.list({ page: index + 2, limit: 100 }),
        ),
      );
      setAgents([...first.data, ...rest.flatMap((page) => page.data)]);
      setError(null);
    } catch (err) {
      setError(errorText(err, 'Could not load Veriq Agents'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const byId = useMemo(() => new Map(agents.map((agent) => [agent.id, agent])), [agents]);

  const nameOf = useCallback(
    (agentId: string | null | undefined) => {
      if (!agentId) return 'Unassigned';
      const agent = byId.get(agentId);
      return agent ? agent.name || agent.email || agentId : agentId;
    },
    [byId],
  );

  return { agents, byId, nameOf, loading, error, reload: load };
}
