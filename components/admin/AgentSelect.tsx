'use client';

import React, { useEffect, useState } from 'react';
import { veriqAgentsAdminApi } from '@/lib/api/admin';
import type { VeriqAgentListItem } from '@/types/admin';
import { errorText } from './format';

/**
 * Picker over Veriq Agent accounts. Suspended Agents cannot receive assignments (§3.4), so they are
 * listed only when `includeSuspended` is set (e.g. for reporting filters).
 */
export function AgentSelect({
  id,
  value,
  onChange,
  includeSuspended = false,
  excludeAgentId,
  placeholder = 'Select a Veriq Agent',
  required,
  disabled,
}: {
  id?: string;
  value: string;
  onChange: (agentId: string, agent: VeriqAgentListItem | null) => void;
  includeSuspended?: boolean;
  excludeAgentId?: string | null;
  placeholder?: string;
  required?: boolean;
  disabled?: boolean;
}) {
  const [agents, setAgents] = useState<VeriqAgentListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    veriqAgentsAdminApi
      .list({ status: includeSuspended ? undefined : 'active', limit: 100 })
      .then((res) => {
        if (!cancelled) {
          setAgents(res.data);
          setError(null);
        }
      })
      .catch((err: unknown) => {
        if (!cancelled) setError(errorText(err, 'Could not load Veriq Agents'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [includeSuspended]);

  const options = agents.filter((agent) => agent.id !== excludeAgentId);

  return (
    <div>
      <select
        id={id}
        className="input"
        value={value}
        required={required}
        disabled={disabled || loading}
        onChange={(event) =>
          onChange(event.target.value, agents.find((agent) => agent.id === event.target.value) ?? null)
        }
      >
        <option value="">{loading ? 'Loading Veriq Agents…' : options.length ? placeholder : 'No eligible Veriq Agents'}</option>
        {options.map((agent) => (
          <option key={agent.id} value={agent.id}>
            {agent.name || agent.email || agent.id}
            {agent.referralCode ? ` · ${agent.referralCode}` : ''}
            {!agent.isActive ? ' (suspended)' : ''}
            {` · ${agent.operators} operator${agent.operators === 1 ? '' : 's'}`}
          </option>
        ))}
      </select>
      {error && (
        <p role="alert" className="mt-1 text-xs font-medium text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
