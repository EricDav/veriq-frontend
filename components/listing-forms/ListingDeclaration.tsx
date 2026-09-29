'use client';

import { useCallback, useEffect, useState } from 'react';
import { FileSignature } from 'lucide-react';
import { operatorAccountsApi } from '@/lib/api/operator';
import type { ListingDeclaration, SubmitListingInput } from '@/types/operator';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { Button, CheckLine } from '@/components/ui';
import { Notice } from './ui';

export interface ListingDeclarationState {
  declaration: ListingDeclaration | null;
  loading: boolean;
  error: unknown;
  accepted: boolean;
  setAccepted: (accepted: boolean) => void;
  /** True only when the current version is loaded and actively ticked. */
  canSubmit: boolean;
  /** The submit body every listing submission carries. Throws nothing: check `canSubmit` first. */
  payload: SubmitListingInput | null;
  /** Clears the tick so a re-submission after a correction is accepted again, never carried over (§3 step 1). */
  reset: () => void;
  reload: () => Promise<void>;
}

/**
 * Loads the versioned declaration and tracks an active acceptance. The tick always starts clear, so acceptance is
 * a deliberate act on every submission including a re-submission after a correction (Master Blueprint §3 step 1).
 */
export function useListingDeclaration(): ListingDeclarationState {
  const [declaration, setDeclaration] = useState<ListingDeclaration | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<unknown>(null);
  const [accepted, setAccepted] = useState(false);

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await operatorAccountsApi.listingDeclaration();
      setDeclaration(res.data);
    } catch (err) {
      setDeclaration(null);
      setError(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const canSubmit = !!declaration && accepted;
  return {
    declaration,
    loading,
    error,
    accepted,
    setAccepted,
    canSubmit,
    payload: canSubmit ? { declaration: { version: declaration.version, accepted: true } } : null,
    reset: () => setAccepted(false),
    reload,
  };
}

/**
 * The Operator listing declaration, rendered clause for clause exactly as the API supplies it, with an acceptance
 * that starts unticked. An unticked box blocks the submit (Master Blueprint §3): the wording is legal text, so it
 * is never paraphrased, summarised or pre-accepted in the UI.
 */
export function ListingDeclarationPanel({
  state,
  idPrefix = 'listing-declaration',
  disabled = false,
}: {
  state: ListingDeclarationState;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const { declaration, loading, error, accepted, setAccepted } = state;

  if (loading && !declaration) {
    return (
      <div
        role="status"
        aria-live="polite"
        className="flex items-center gap-2 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px] text-ui-md text-muted-foreground"
      >
        <LoadingSpinner size="sm" className="text-primary" /> Loading the Veriq listing declaration…
      </div>
    );
  }

  if (!declaration) {
    return (
      <Notice tone="error" title="The listing declaration could not be loaded">
        <p>You cannot submit without accepting the current declaration. Reload the page and try again.</p>
        <Button variant="secondary" size="small" className="mt-3" onClick={() => void state.reload()}>
          Try again
        </Button>
      </Notice>
    );
  }

  return (
    <section
      className="space-y-4 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]"
      aria-labelledby={`${idPrefix}-heading`}
    >
      <div className="flex items-start gap-2.5">
        <FileSignature aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <h3 id={`${idPrefix}-heading`} className="font-display text-ui-md font-semibold text-foreground">
            Veriq listing declaration
          </h3>
          <p className="text-ui-sm text-muted-foreground">
            Version {declaration.version}. You accept this each time you submit.
          </p>
        </div>
      </div>
      <ol className="ml-4 list-decimal space-y-2 text-ui-md leading-6 text-foreground">
        {declaration.clauses.map((clause) => (
          <li key={clause.id}>{clause.text}</li>
        ))}
      </ol>
      {error ? <Notice tone="warning">The declaration was reloaded. Read it again and accept to submit.</Notice> : null}
      <CheckLine
        id={`${idPrefix}-accept`}
        checked={accepted}
        disabled={disabled}
        onCheckedChange={setAccepted}
      >
        I have read and accept all {declaration.clauses.length} clauses above for this submission.
      </CheckLine>
      {!accepted && (
        <p className="text-ui-sm text-muted-foreground" role="status">
          Accept the declaration to submit. It is not accepted for you and an earlier acceptance does not carry over.
        </p>
      )}
    </section>
  );
}
