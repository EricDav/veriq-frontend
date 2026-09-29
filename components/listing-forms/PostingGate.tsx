'use client';

import { useCallback, useEffect, useState, type ReactNode } from 'react';
import Link from 'next/link';
import { BadgeCheck, CircleDashed, Contact, Lock, ShieldCheck, SmartphoneNfc } from 'lucide-react';
import { operatorAccountsApi } from '@/lib/api/operator';
import type { PostingReadiness, PostingRequirementKey } from '@/types/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, ChipIcon, Panel } from '@/components/ui';
import { errorMessage } from './issues';
import { Notice } from './ui';

const REQUIREMENT_ICONS: Record<PostingRequirementKey, typeof SmartphoneNfc> = {
  phone_otp: SmartphoneNfc,
  government_id: Contact,
  selfie_with_id: BadgeCheck,
};

/** Where an Operator goes to satisfy each requirement. */
const REQUIREMENT_ACTIONS: Record<PostingRequirementKey, { href: string; label: string }> = {
  phone_otp: { href: '/auth/verify-phone', label: 'Verify my phone' },
  government_id: { href: '/dashboard/operator/verification', label: 'Upload my government ID' },
  selfie_with_id: { href: '/dashboard/operator/verification', label: 'Upload my selfie with ID' },
};

export interface PostingReadinessState {
  readiness: PostingReadiness | null;
  loading: boolean;
  error: unknown;
  reload: () => Promise<void>;
}

/** Reads the pre-posting gate. The server enforces the same rule, so this only shapes what the Operator sees. */
export function usePostingReadiness(): PostingReadinessState {
  const [readiness, setReadiness] = useState<PostingReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorAccountsApi.postingReadiness();
      setReadiness(res.data);
    } catch (err) {
      setReadiness(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { readiness, loading, error, reload };
}

/**
 * The pre-posting requirements as a checklist (Master Blueprint §3): phone OTP, a valid government ID and a selfie
 * holding that ID, plus any further evidence Veriq has asked for. Each unmet step links to where it is done.
 */
export function PostingRequirementList({
  readiness,
  showSatisfied = true,
}: {
  readiness: PostingReadiness;
  showSatisfied?: boolean;
}) {
  const items = showSatisfied ? readiness.requirements : readiness.requirements.filter((item) => !item.satisfied);
  if (!items.length) return null;
  return (
    <ul className="space-y-2">
      {items.map((item) => {
        const Icon = REQUIREMENT_ICONS[item.requirement];
        const action = REQUIREMENT_ACTIONS[item.requirement];
        return (
          <li
            key={item.requirement}
            className={`flex flex-col gap-2 rounded-unit border p-[17px] wide:flex-row wide:items-center wide:justify-between ${
              item.satisfied ? 'border-[#10b98135] bg-[#10b98112]' : 'border-[#ffffff18] bg-[#070b1444]'
            }`}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {item.satisfied ? (
                <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              ) : (
                <CircleDashed aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className={`text-ui-md font-semibold ${item.satisfied ? 'text-[#6ee7b7]' : 'text-foreground'}`}>
                  <Icon aria-hidden="true" className="mr-1.5 inline h-3.5 w-3.5 align-[-2px]" />
                  {item.label}
                </p>
                <p className="text-ui-sm text-muted-foreground">{item.satisfied ? 'Done' : item.message}</p>
              </div>
            </div>
            {!item.satisfied && (
              <Button asChild variant="secondary" size="small" className="flex-shrink-0">
                <Link href={action.href}>{action.label}</Link>
              </Button>
            )}
          </li>
        );
      })}
    </ul>
  );
}

/**
 * Blocks an "add listing" entry point until the Operator may post, explaining exactly what is missing rather than
 * letting the submit fail at the server (Master Blueprint §3, §8 Permissions).
 */
export function PostingGate({
  state,
  children,
  title = 'Finish Operator verification before you post',
}: {
  state: PostingReadinessState;
  children: ReactNode;
  title?: string;
}) {
  const { readiness, loading, error, reload } = state;

  if (loading && !readiness) {
    return (
      <div role="status" aria-live="polite" className="flex items-center justify-center gap-2 py-16 text-ui-md text-muted-foreground">
        <LoadingSpinner size="lg" className="text-primary" /> Checking your Operator verification…
      </div>
    );
  }

  if (!readiness) {
    return (
      <Notice tone="error" title="We could not check your Operator verification">
        <p>{errorMessage(error, 'Veriq needs to confirm your identity before you post a listing.')}</p>
        <Button variant="secondary" size="small" className="mt-3" onClick={() => void reload()}>
          Try again
        </Button>
      </Notice>
    );
  }

  if (readiness.canPost) return <>{children}</>;

  return (
    <Panel as="section" className="space-y-4" aria-labelledby="posting-gate-heading">
      <div className="flex items-start gap-3">
        <ChipIcon>
          <Lock aria-hidden="true" className="h-5 w-5" />
        </ChipIcon>
        <div className="min-w-0">
          <h2 id="posting-gate-heading" className="font-display text-base font-semibold text-foreground">
            {title}
          </h2>
          <p className="mt-1 text-ui-md leading-6 text-muted-foreground">
            Verifying your account confirms who you are. It does not confirm that you own a particular property —
            each listing is verified on its own.
          </p>
        </div>
      </div>
      <PostingRequirementList readiness={readiness} />
      {readiness.furtherEvidenceRequested && (
        <Notice tone="warning" title="Veriq asked for a little more">
          <p>{readiness.furtherEvidenceNote ?? 'Veriq needs limited further evidence to clarify your identity, role or authority.'}</p>
        </Notice>
      )}
      <div className="flex flex-wrap gap-3">
        <Button asChild>
          <Link href="/dashboard/operator/verification">Open my verification checklist</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href="/dashboard/operator">Back to my dashboard</Link>
        </Button>
      </div>
    </Panel>
  );
}
