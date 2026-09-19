'use client';

import { useCallback, useEffect, useState } from 'react';
import { ApiError } from '@/lib/api';
import type { ApiResponse } from '@/types';

export interface ListingViewerState<P, U> {
  publicData: P | null;
  unlocked: U | null;
  loading: boolean;
  notFound: boolean;
  error: unknown;
  reload: () => Promise<void>;
}

/**
 * Loads a listing's public projection and, for signed-in viewers, the server-authorised unlocked package.
 * 401/403/404 on the unlocked endpoint simply mean "locked for this viewer"; protected data never comes from the public call.
 */
export function useListingViewer<P, U>(
  id: string | undefined,
  isAuthenticated: boolean,
  authReady: boolean,
  loadPublic: (id: string) => Promise<ApiResponse<P>>,
  loadUnlocked: (id: string) => Promise<ApiResponse<U>>,
): ListingViewerState<P, U> {
  const [publicData, setPublicData] = useState<P | null>(null);
  const [unlocked, setUnlocked] = useState<U | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [error, setError] = useState<unknown>(null);

  const reload = useCallback(async () => {
    if (!id) return;
    setLoading(true);
    setError(null);
    setNotFound(false);
    try {
      const [publicResult, unlockedResult] = await Promise.all([
        loadPublic(id)
          .then((res) => res.data)
          .catch((err: unknown) => {
            if (err instanceof ApiError && err.statusCode === 404) return null;
            throw err;
          }),
        isAuthenticated
          ? loadUnlocked(id)
              .then((res) => res.data)
              .catch((err: unknown) => {
                if (err instanceof ApiError && [401, 403, 404].includes(err.statusCode)) return null;
                throw err;
              })
          : Promise.resolve(null),
      ]);
      setPublicData(publicResult);
      setUnlocked(unlockedResult);
      setNotFound(!publicResult && !unlockedResult);
    } catch (err) {
      setError(err);
    } finally {
      setLoading(false);
    }
  }, [id, isAuthenticated, loadPublic, loadUnlocked]);

  useEffect(() => {
    if (authReady) void reload();
  }, [authReady, reload]);

  return { publicData, unlocked, loading, notFound, error, reload };
}
