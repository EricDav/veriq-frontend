'use client';

import type { ReactNode } from 'react';
import Link from 'next/link';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { Button, ChipIcon, Panel } from '@/components/ui';
import { UserRole } from '@/types';

/** Operator pages render only for Property Operator accounts; the API enforces the same rule server-side. */
export function OperatorGuard({ children }: { children: ReactNode }) {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  if (!user || user.role !== UserRole.PROPERTY_OPERATOR) {
    return (
      <div className="mx-auto max-w-lg">
        <Panel className="flex flex-col items-center gap-3 text-center">
          <ChipIcon>
            <ShieldAlert aria-hidden="true" className="h-5 w-5" />
          </ChipIcon>
          <h1 className="font-display text-xl font-semibold text-foreground">Property Operator account required</h1>
          <p className="text-ui-md text-muted-foreground">
            These pages are for Property Operators managing their own properties and Shared Property opportunities.
          </p>
          <Button asChild className="mt-1">
            <Link href="/dashboard">Go to your dashboard</Link>
          </Button>
        </Panel>
      </div>
    );
  }
  return <>{children}</>;
}
