'use client';

import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { dashboardHomeFor } from '@/components/ui/BackToDashboard';
import { Button } from '@/components/ui/Button';
import { chatApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { canUseNotifications, playChatSound, requestNotificationPermission, showChatNotification } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { buildBreadcrumb } from './breadcrumb';
import { allNavItems, navFor } from './nav';
import { WorkspaceHeader } from './WorkspaceHeader';
import { WorkspaceSidebar } from './WorkspaceSidebar';

const DESKTOP = '(min-width: 1024px)';

function initialsOf(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

/**
 * The chrome every authenticated screen wears: the collapsible sidebar, the workspace header with its
 * breadcrumb, and the body the screen renders into. It owns the shell's own concerns — sidebar state,
 * the chat unread count, the browser-notification prompt — so a screen only has to render content.
 *
 * The sidebar is a drawer below 1024px and a fixed column above it; one toggle drives both, choosing
 * which state to flip from the viewport at the moment it is pressed, so neither viewport needs a
 * layout effect and there is no open-then-closed flash on first paint.
 */
export function WorkspaceShell({ children }: { children: ReactNode }) {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [desktopCollapsed, setDesktopCollapsed] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [notificationPermission, setNotificationPermission] =
    useState<'default' | 'denied' | 'granted' | 'unsupported'>('unsupported');

  const nav = useMemo(() => navFor(user?.role), [user?.role]);
  const homeHref = dashboardHomeFor(user?.role);
  const crumbs = useMemo(
    () => buildBreadcrumb(pathname, allNavItems(nav), homeHref),
    [pathname, nav, homeHref],
  );

  const closeDrawer = useCallback(() => setMobileOpen(false), []);

  const toggleSidebar = useCallback(() => {
    if (window.matchMedia(DESKTOP).matches) {
      setDesktopCollapsed((collapsed) => !collapsed);
    } else {
      setMobileOpen((open) => !open);
    }
  }, []);

  /*
   * Which of the two sidebar states the toggle is reporting depends on the viewport, so the shell has
   * to know which one it is on: below `lg` the sidebar is a drawer driven by `mobileOpen`, above it a
   * column driven by `desktopCollapsed`. Without this the button announced `aria-expanded="true"` on a
   * phone, where the drawer starts closed, and never changed as it opened and shut. The visibility
   * itself stays pure CSS, so this only affects what assistive tech is told, never the first paint.
   */
  useEffect(() => {
    const query = window.matchMedia(DESKTOP);
    const sync = () => setIsDesktop(query.matches);
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  // The drawer is an overlay; closing it on Escape is the way out for a keyboard user.
  useEffect(() => {
    if (!mobileOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setMobileOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [mobileOpen]);

  useEffect(() => {
    setNotificationPermission(canUseNotifications() ? Notification.permission : 'unsupported');
    const token = getAccessToken();
    if (!token) return;

    const events = new EventSource(chatApi.eventsUrl(token));
    const onUnread = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as { unread?: number };
        setChatUnread(payload.unread ?? 0);
      } catch {
        setChatUnread(0);
      }
    };
    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          senderId?: string;
          body?: string;
          sender?: { name?: string };
          conversationId?: string;
        };
        if (!payload.senderId || payload.senderId === user?.id) return;
        playChatSound();
        showChatNotification(
          payload.sender?.name ? `New message from ${payload.sender.name}` : 'New chat message',
          payload.body ?? 'Open Veriq to read the message.',
          payload.conversationId ? `/dashboard/chat?conversation=${payload.conversationId}` : '/dashboard/chat',
        );
      } catch {
        // A malformed frame is not worth interrupting the session for.
      }
    };
    events.addEventListener('unread', onUnread);
    events.addEventListener('message', onMessage);

    return () => {
      events.removeEventListener('unread', onUnread);
      events.removeEventListener('message', onMessage);
      events.close();
    };
  }, [user?.id]);

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission as typeof notificationPermission);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <WorkspaceSidebar
        nav={nav}
        pathname={pathname}
        homeHref={homeHref}
        displayName={user ? `${user.firstName} ${user.lastName}` : 'User'}
        email={user?.email}
        initials={initialsOf(user?.firstName, user?.lastName)}
        chatUnread={chatUnread}
        mobileOpen={mobileOpen}
        desktopCollapsed={desktopCollapsed}
        onNavigate={closeDrawer}
        onLogout={logout}
      />

      {mobileOpen && (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={closeDrawer}
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
        />
      )}

      <div className={cn('flex min-h-screen min-w-0 flex-col transition-[margin] duration-200 ease-linear', !desktopCollapsed && 'lg:ml-64')}>
        <WorkspaceHeader
          crumbs={crumbs}
          sidebarVisible={isDesktop ? !desktopCollapsed : mobileOpen}
          onToggleSidebar={toggleSidebar}
          showBackToDashboard={pathname !== homeHref}
          onNavigate={closeDrawer}
        />

        {notificationPermission === 'default' && (
          <div className="flex flex-col gap-2 border-b border-[#fbbf2425] bg-[#fbbf2409] px-5 py-3 text-ui-sm text-[#fcd34d] wide:flex-row wide:items-center wide:justify-between wide:px-[35px]">
            <span>Enable chat notifications to hear about new messages instantly.</span>
            <Button variant="secondary" size="small" onClick={enableNotifications} className="self-start wide:self-auto">
              Enable notifications
            </Button>
          </div>
        )}

        <main className="mx-auto w-full max-w-[1400px] flex-1 px-[18px] py-6 wide:p-[35px]">{children}</main>
      </div>
    </div>
  );
}
