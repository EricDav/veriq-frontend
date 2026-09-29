'use client';

import Link from 'next/link';
import { PanelLeft } from 'lucide-react';
import { BackToDashboard } from '@/components/ui/BackToDashboard';
import type { Crumb } from './breadcrumb';
import { NotificationBell } from './NotificationBell';

export interface WorkspaceHeaderProps {
  crumbs: readonly Crumb[];
  /** True when the sidebar is showing, in whichever way this viewport shows it. */
  sidebarVisible: boolean;
  onToggleSidebar: () => void;
  /** The route back to the dashboard, hidden on the dashboard itself. */
  showBackToDashboard: boolean;
  onNavigate: () => void;
}

/**
 * The 80px workspace header (65px below 760px): the sidebar toggle, the breadcrumb trail and the
 * notification bell. The toggle is a real button with `aria-controls`/`aria-expanded`, so the sidebar
 * can be opened and closed from the keyboard.
 */
export function WorkspaceHeader({
  crumbs,
  sidebarVisible,
  onToggleSidebar,
  showBackToDashboard,
  onNavigate,
}: WorkspaceHeaderProps) {
  return (
    <header className="sticky top-0 z-30 flex h-[65px] items-center gap-4 border-b border-[#ffffff14] bg-background px-5 wide:h-20 wide:px-[35px]">
      <button
        type="button"
        onClick={onToggleSidebar}
        aria-controls="workspace-sidebar"
        aria-expanded={sidebarVisible}
        className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-md text-foreground transition-colors hover:bg-[#ffffff0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <PanelLeft aria-hidden="true" className="h-4 w-4" />
        <span className="sr-only">{sidebarVisible ? 'Hide navigation' : 'Show navigation'}</span>
      </button>

      <nav aria-label="Breadcrumb" className="min-w-0 flex-1">
        <ol className="flex min-w-0 items-center gap-2 text-sm">
          {crumbs.map((crumb, index) => (
            <li key={`${crumb.label}-${index}`} className="flex min-w-0 items-center gap-2">
              {index > 0 && (
                <span aria-hidden="true" className="text-muted-foreground">
                  /
                </span>
              )}
              {crumb.href ? (
                <Link
                  href={crumb.href}
                  onClick={onNavigate}
                  className="truncate text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
                >
                  {crumb.label}
                </Link>
              ) : (
                <span aria-current="page" className="truncate text-foreground">
                  {crumb.label}
                </span>
              )}
            </li>
          ))}
        </ol>
      </nav>

      <div className="ml-auto flex flex-shrink-0 items-center gap-2">
        {showBackToDashboard && (
          <BackToDashboard variant="link" labelClassName="hidden sm:inline" onNavigate={onNavigate} />
        )}
        <NotificationBell />
      </div>
    </header>
  );
}
