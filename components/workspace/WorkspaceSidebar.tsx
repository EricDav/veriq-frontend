'use client';

import Image from 'next/image';
import Link from 'next/link';
import { LogOut } from 'lucide-react';
import { ChipIcon } from '@/components/ui/ChipIcon';
import { cn } from '@/lib/utils';
import { isNavItemActive, type NavItem, type WorkspaceNav } from './nav';

export interface WorkspaceSidebarProps {
  nav: WorkspaceNav;
  pathname: string;
  /** Where the brand block leads — the role's own dashboard home. */
  homeHref: string;
  displayName: string;
  email?: string;
  initials: string;
  /** Unread chats, shown against the Chats item. */
  chatUnread: number;
  /** True while the drawer is over the page on narrow viewports. */
  mobileOpen: boolean;
  /** True when the user has collapsed the sidebar on a wide viewport. */
  desktopCollapsed: boolean;
  onNavigate: () => void;
  onLogout: () => void;
}

function NavLink({
  item,
  pathname,
  badge,
  onNavigate,
}: {
  item: NavItem;
  pathname: string;
  badge?: number;
  onNavigate: () => void;
}) {
  const Icon = item.icon;
  const active = isNavItemActive(item.href, pathname);
  return (
    <li>
      <Link
        href={item.href}
        onClick={onNavigate}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'flex h-[46px] items-center gap-2 rounded-md px-2 text-sm transition-colors',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar',
          active
            ? 'bg-sidebar-accent font-medium text-sidebar-accent-foreground'
            : 'text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground',
        )}
      >
        <Icon aria-hidden="true" className="h-[19px] w-[19px] flex-shrink-0" />
        <span className="truncate">{item.label}</span>
        {badge !== undefined && badge > 0 && (
          <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-semibold text-primary-foreground">
            {badge > 99 ? '99+' : badge}
          </span>
        )}
      </Link>
    </li>
  );
}

/**
 * The workspace sidebar: brand, the role's own section under its label, a divider, then the items
 * every role shares, with the account block pinned to the bottom. It is a drawer below `lg` and a
 * fixed column above it; both states are driven from the header's one toggle.
 */
export function WorkspaceSidebar({
  nav,
  pathname,
  homeHref,
  displayName,
  email,
  initials,
  chatUnread,
  mobileOpen,
  desktopCollapsed,
  onNavigate,
  onLogout,
}: WorkspaceSidebarProps) {
  return (
    <aside
      id="workspace-sidebar"
      aria-label="Workspace"
      className={cn(
        'fixed inset-y-0 left-0 z-50 flex w-64 flex-col border-r border-sidebar-border bg-sidebar',
        'transition-[transform,visibility] duration-200 ease-linear',
        // `invisible` rather than only a transform: an off-screen sidebar must also leave the tab
        // order, or a keyboard user falls into links they cannot see.
        mobileOpen ? 'visible translate-x-0' : 'invisible -translate-x-full',
        desktopCollapsed ? 'lg:invisible lg:-translate-x-full' : 'lg:visible lg:translate-x-0',
      )}
    >
      <div className="px-5 py-[26px]">
        <Link
          href={homeHref}
          onClick={onNavigate}
          className="flex items-center gap-2.5 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <Image src="/images/Logo.png" alt="" aria-hidden="true" width={38} height={38} className="h-[38px] w-[38px] object-contain" />
          <span className="min-w-0 font-display text-[1.6rem] font-semibold leading-8 tracking-[-0.07em] text-sidebar-foreground">
            veriq<span className="text-sidebar-primary">.</span>
            <small className="mt-[3px] block font-sans text-[0.55rem] tracking-[0.18em] text-sidebar-foreground">
              PROPERTY INTELLIGENCE
            </small>
          </span>
        </Link>
      </div>

      <p id="workspace-role-label" className="px-[22px] py-3 text-xs uppercase tracking-[0.14em] text-sidebar-foreground">
        {nav.roleLabel}
      </p>

      <div className="sidebar-scroll min-h-0 flex-1 overflow-y-auto px-3 py-[5px]">
        <ul aria-labelledby="workspace-role-label" className="flex flex-col gap-1">
          {nav.roleItems.map((item) => (
            <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
          ))}
        </ul>

        {nav.moreItems && nav.moreItems.length > 0 && (
          <>
            <p
              id="workspace-more-label"
              className="px-[10px] pb-2 pt-6 text-xs uppercase tracking-[0.14em] text-sidebar-foreground"
            >
              {nav.moreLabel ?? 'More'}
            </p>
            <ul aria-labelledby="workspace-more-label" className="flex flex-col gap-1">
              {nav.moreItems.map((item) => (
                <NavLink key={item.href} item={item} pathname={pathname} onNavigate={onNavigate} />
              ))}
            </ul>
          </>
        )}

        <hr className="my-6 border-t border-[#ffffff14]" />

        <ul aria-label="Everywhere else" className="flex flex-col gap-1">
          {nav.commonItems.map((item) => (
            <NavLink
              key={item.href}
              item={item}
              pathname={pathname}
              badge={item.href === '/dashboard/chat' ? chatUnread : undefined}
              onNavigate={onNavigate}
            />
          ))}
        </ul>
      </div>

      <div className="flex flex-col gap-2 p-[22px]">
        <Link
          href="/dashboard/profile"
          onClick={onNavigate}
          className="flex items-center gap-3 rounded-md text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <ChipIcon className="text-sm font-semibold">{initials}</ChipIcon>
          <span className="min-w-0">
            <strong className="block truncate text-sm font-bold text-sidebar-accent-foreground">{displayName}</strong>
            {email && <small className="block truncate text-xs text-sidebar-foreground">{email}</small>}
          </span>
        </Link>
        <button
          type="button"
          onClick={onLogout}
          className="flex items-center gap-2 rounded-md px-2 py-2 text-sm text-sidebar-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring focus-visible:ring-offset-2 focus-visible:ring-offset-sidebar"
        >
          <LogOut aria-hidden="true" className="h-4 w-4 flex-shrink-0" />
          Log out
        </button>
      </div>
    </aside>
  );
}
