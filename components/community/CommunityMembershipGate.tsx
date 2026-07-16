'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users } from 'lucide-react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { communityApi } from '@/lib/api';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

export function CommunityMembershipGate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated, isLoading: authLoading } = useAuth();
  const { success, error } = useToast();
  const [checking, setChecking] = useState(true);
  const [isMember, setIsMember] = useState(false);
  const [joining, setJoining] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!isAuthenticated) {
      setChecking(false);
      return;
    }
    communityApi.myStatus()
      .then((response) => setIsMember(Boolean(response.data.joinedAt)))
      .catch(() => setIsMember(false))
      .finally(() => setChecking(false));
  }, [authLoading, isAuthenticated]);

  const join = async () => {
    setJoining(true);
    try {
      await communityApi.join();
      setIsMember(true);
      success('Welcome to the Contributor Community.');
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to join the community.');
    } finally {
      setJoining(false);
    }
  };

  if (authLoading || checking) {
    return <div className="flex min-h-[60vh] items-center justify-center"><LoadingSpinner size="lg" /></div>;
  }
  if (isMember) return <>{children}</>;

  return (
    <div className="min-h-screen bg-veriq-surface pt-24">
      <main className="mx-auto max-w-xl px-4 py-16 text-center sm:px-6">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <Users className="h-7 w-7" />
        </div>
        <h1 className="mt-5 font-display text-2xl font-black text-navy-900">Join the Contributor Community</h1>
        <p className="mt-3 text-sm leading-6 text-veriq-muted">
          Community membership gives you access to street intelligence across Nigeria and eligible Free Unlock properties.
        </p>
        <p className="mt-4 inline-flex items-center gap-2 text-xs font-semibold text-emerald-700">
          <ShieldCheck className="h-4 w-4" /> Membership is free
        </p>
        <div className="mt-7 flex justify-center">
          {isAuthenticated ? (
            <button type="button" onClick={join} disabled={joining} className="btn-primary justify-center">
              {joining ? <LoadingSpinner size="sm" /> : 'Become a member'}
            </button>
          ) : (
            <Link href={`/auth/login?redirect=${encodeURIComponent(pathname)}`} className="btn-primary">Sign in to join</Link>
          )}
        </div>
      </main>
    </div>
  );
}
