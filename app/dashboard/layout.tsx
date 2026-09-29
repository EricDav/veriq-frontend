'use client';

import React, { useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { WorkspaceShell } from '@/components/workspace/WorkspaceShell';

/**
 * Guards the authenticated area and hands every screen under it the workspace chrome. The shell owns
 * the sidebar, header and breadcrumb (see components/workspace/); this file only decides whether the
 * viewer may be here at all.
 */
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isLoading, isAuthenticated } = useAuth();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading || !isAuthenticated) return <PageLoader />;

  return <WorkspaceShell>{children}</WorkspaceShell>;
}
