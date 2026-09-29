'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { MapPin, RefreshCw, ShieldCheck } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { ApiError, locationsApi } from '@/lib/api';
import type { AllowedState } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

export default function AdminStatesPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [states, setStates] = useState<AllowedState[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = async () => {
    setIsLoading(true);
    try {
      const res = await locationsApi.allStates();
      setStates(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load states');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && user?.role === UserRole.ADMIN) {
      load();
    }
  }, [authLoading, user?.role]); // eslint-disable-line react-hooks/exhaustive-deps

  const activeCount = useMemo(() => states.filter((state) => state.isActive).length, [states]);

  const toggleState = async (state: AllowedState) => {
    setUpdatingId(state.id);
    try {
      const res = await locationsApi.updateState(state.id, !state.isActive);
      setStates((prev) => prev.map((item) => (item.id === state.id ? res.data : item)));
      success(`${res.data.name} ${res.data.isActive ? 'activated' : 'deactivated'}.`);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update state');
    } finally {
      setUpdatingId(null);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">Allowed States</h1>
          <p className="text-sm text-muted-foreground">
            Choose where users can sign up and agents can list properties.
          </p>
        </div>
        <button type="button" onClick={load} disabled={isLoading} className="btn-secondary !py-2.5 !text-sm">
          <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total States</p>
          <p className="mt-2 text-2xl font-black text-foreground">{states.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Active</p>
          <p className="mt-2 text-2xl font-black text-primary">{activeCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Inactive</p>
          <p className="mt-2 text-2xl font-black text-muted-foreground">{states.length - activeCount}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-[#ffffff12] px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-foreground">
            <MapPin className="h-4 w-4 text-primary" />
            Nigerian States
          </h2>
        </div>

        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <div className="grid gap-3 p-5 sm:grid-cols-2 lg:grid-cols-3">
            {states.map((state) => (
              <div
                key={state.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-[#ffffff12] bg-card px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">{state.name}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${state.isActive ? 'text-primary' : 'text-muted-foreground'}`}>
                    <ShieldCheck className="h-3 w-3" />
                    {state.isActive ? 'Allowed' : 'Disabled'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleState(state)}
                  disabled={updatingId === state.id}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    state.isActive ? 'bg-primary' : 'bg-[#ffffff08]'
                  } disabled:opacity-60`}
                  aria-label={`${state.isActive ? 'Disable' : 'Enable'} ${state.name}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-card shadow transition-transform ${
                      state.isActive ? 'translate-x-5' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
