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
          <h1 className="font-display text-2xl font-bold text-navy-900">Allowed States</h1>
          <p className="text-sm text-veriq-muted">
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
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Total States</p>
          <p className="mt-2 text-2xl font-black text-navy-900">{states.length}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-black text-emerald-600">{activeCount}</p>
        </div>
        <div className="card p-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Inactive</p>
          <p className="mt-2 text-2xl font-black text-slate-500">{states.length - activeCount}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="flex items-center gap-2 font-display text-base font-bold text-navy-900">
            <MapPin className="h-4 w-4 text-veriq-secondary" />
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
                className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-navy-900">{state.name}</p>
                  <p className={`mt-0.5 flex items-center gap-1 text-xs ${state.isActive ? 'text-emerald-600' : 'text-slate-400'}`}>
                    <ShieldCheck className="h-3 w-3" />
                    {state.isActive ? 'Allowed' : 'Disabled'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => toggleState(state)}
                  disabled={updatingId === state.id}
                  className={`relative h-7 w-12 rounded-full transition-colors ${
                    state.isActive ? 'bg-emerald-500' : 'bg-slate-300'
                  } disabled:opacity-60`}
                  aria-label={`${state.isActive ? 'Disable' : 'Enable'} ${state.name}`}
                >
                  <span
                    className={`absolute top-1 h-5 w-5 rounded-full bg-white shadow transition-transform ${
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
