'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { UserRole } from '@/types';

/** Operator pages render only for Property Operator accounts; the API enforces the same rule server-side. */
export function OperatorGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user || user.role !== UserRole.PROPERTY_OPERATOR) {
    return (
      <div className="mx-auto max-w-lg">
        <div className="card flex flex-col items-center gap-3 p-8 text-center hover:shadow-card">
          <ShieldAlert className="h-10 w-10 text-amber-500" />
          <h1 className="font-display text-xl font-bold text-navy-900">Property Operator account required</h1>
          <p className="text-sm text-slate-500">
            These pages are for Property Operators managing their own properties and Shared Property opportunities.
          </p>
          <Link href="/dashboard" className="btn-primary !py-2.5">Go to your dashboard</Link>
        </div>
      </div>
    );
  }
  return <>{children}</>;
}
