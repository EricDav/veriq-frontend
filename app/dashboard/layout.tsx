'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Heart, Search, User, LogOut,
  Bell, Menu, X, Home, TrendingUp, Plus,
  Settings, ChevronRight, Users, ShieldCheck, Wallet, Landmark, FileText, MessageCircle, Mail, MapPin, BookOpen, Settings2,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { UserRole, type AppNotification } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { chatApi, notificationsApi } from '@/lib/api';
import { getAccessToken } from '@/lib/auth';
import { canUseNotifications, playChatSound, requestNotificationPermission, showChatNotification } from '@/lib/notify';

// ─── Nav items per role ───────────────────────────────────────────────────

const USER_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Properties', href: '/dashboard/browse', icon: Search },
  { label: 'Community Intelligence', href: '/street-intelligence', icon: MapPin },
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'Saved', href: '/dashboard/saved', icon: Heart },
  { label: 'Chats', href: '/dashboard/chat', icon: MessageCircle },
  { label: 'Wallet', href: '/dashboard/wallet', icon: Wallet },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const AGENT_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Properties', href: '/dashboard/browse', icon: Search },
  { label: 'Community Intelligence', href: '/street-intelligence', icon: MapPin },
  { label: 'Community', href: '/dashboard/community', icon: Users },
  { label: 'My Listings', href: '/dashboard/properties', icon: Home },
  { label: 'Agent Profile', href: '/dashboard/agent', icon: TrendingUp },
  { label: 'Chats', href: '/dashboard/chat', icon: MessageCircle },
  { label: 'Transactions', href: '/dashboard/wallet', icon: Wallet },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const ADMIN_NAV = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/admin/agents', icon: ShieldCheck },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Properties', href: '/dashboard/admin/properties', icon: Home },
  { label: 'Community Intelligence', href: '/street-intelligence', icon: MapPin },
  { label: 'Community', href: '/dashboard/admin/community', icon: Users },
  { label: 'Pricing', href: '/dashboard/admin/pricing', icon: Settings2 },
  { label: 'Allowed States', href: '/dashboard/admin/states', icon: MapPin },
  { label: 'Blogs', href: '/dashboard/admin/blogs', icon: BookOpen },
  { label: 'Contact Forms', href: '/dashboard/admin/contacts', icon: Mail },
  { label: 'Site Content', href: '/dashboard/admin/content', icon: FileText },
  { label: 'Ledger', href: '/dashboard/admin/ledger', icon: Landmark },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

function getNavItems(role?: UserRole) {
  if (role === UserRole.ADMIN) return ADMIN_NAV;
  if (role === UserRole.AGENT) return AGENT_NAV;
  return USER_NAV;
}

function getInitials(firstName?: string, lastName?: string) {
  return `${firstName?.[0] ?? ''}${lastName?.[0] ?? ''}`.toUpperCase() || 'U';
}

// ─── Layout ───────────────────────────────────────────────────────────────

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoading, isAuthenticated, logout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatUnread, setChatUnread] = useState(0);
  const [notificationUnread, setNotificationUnread] = useState(0);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [isLoadingNotifications, setIsLoadingNotifications] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState<'default' | 'denied' | 'granted' | 'unsupported'>('unsupported');

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  useEffect(() => {
    if (!isAuthenticated) return;
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
    events.addEventListener('unread', onUnread);
    const onMessage = (event: MessageEvent) => {
      try {
        const payload = JSON.parse(event.data) as {
          senderId?: string;
          body?: string;
          sender?: { name?: string };
          conversationId?: string;
        };
        if (payload.senderId && payload.senderId !== user?.id) {
          playChatSound();
          showChatNotification(
            payload.sender?.name ? `New message from ${payload.sender.name}` : 'New chat message',
            payload.body ?? 'Open Veriq to read the message.',
            payload.conversationId ? `/dashboard/chat?conversation=${payload.conversationId}` : '/dashboard/chat',
          );
        }
      } catch {}
    };
    events.addEventListener('message', onMessage);

    return () => {
      events.removeEventListener('unread', onUnread);
      events.removeEventListener('message', onMessage);
      events.close();
    };
  }, [isAuthenticated, user?.id]);

  const refreshNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    try {
      const res = await notificationsApi.unreadCount();
      setNotificationUnread(res.data.unread ?? 0);
    } catch {
      setNotificationUnread(0);
    }
  }, [isAuthenticated]);

  const loadNotifications = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingNotifications(true);
    try {
      const [listRes, countRes] = await Promise.all([
        notificationsApi.list(1, 10),
        notificationsApi.unreadCount(),
      ]);
      setNotifications(listRes.data);
      setNotificationUnread(countRes.data.unread ?? 0);
    } catch {
      setNotifications([]);
    } finally {
      setIsLoadingNotifications(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!isAuthenticated) return;
    refreshNotifications();
    const timer = window.setInterval(refreshNotifications, 30000);
    return () => window.clearInterval(timer);
  }, [isAuthenticated, refreshNotifications]);

  const openNotifications = async () => {
    const nextOpen = !notificationsOpen;
    setNotificationsOpen(nextOpen);
    if (nextOpen) await loadNotifications();
  };

  const handleNotificationClick = async (notification: AppNotification) => {
    try {
      if (!notification.readAt) {
        await notificationsApi.markRead(notification.id);
      }
    } finally {
      setNotificationsOpen(false);
      await refreshNotifications();
      if (notification.actionUrl) router.push(notification.actionUrl);
    }
  };

  const markAllNotificationsRead = async () => {
    await notificationsApi.markAllRead();
    setNotifications((items) =>
      items.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })),
    );
    setNotificationUnread(0);
  };

  const enableNotifications = async () => {
    const permission = await requestNotificationPermission();
    setNotificationPermission(permission as typeof notificationPermission);
  };

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <PageLoader />;

  const navItems = getNavItems(user?.role);
  const initials = getInitials(user?.firstName, user?.lastName);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';
  const bellUnread = notificationUnread + chatUnread;

  const roleBadgeClass =
    user?.role === UserRole.ADMIN
      ? 'bg-red-500/20 text-red-300'
      : user?.role === UserRole.AGENT
      ? 'bg-gold-400/20 text-gold-400'
      : 'bg-white/10 text-white/60';

  return (
    <div className="min-h-screen bg-veriq-surface flex">
      {/* Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 transition-transform duration-300 lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 flex-1 min-w-0">
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-navy-950 p-1.5 ring-1 ring-white/10">
              <Image src="/images/Logo.png" alt="Veriq Logo" width={36} height={36} className="rounded-lg" />
            </span>
            <div className="flex flex-col leading-none">
              <span className="font-display text-base font-bold text-white">Veriq</span>
              <span className="text-[9px] font-semibold tracking-widest uppercase text-gold-400">Property</span>
            </div>
          </Link>
          <button className="ml-auto lg:hidden text-white/40 hover:text-white" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Agent: list property CTA */}
        {user?.role === UserRole.AGENT && (
          <div className="px-4 py-4">
            <Link
              href="/dashboard/properties/new"
              onClick={() => setSidebarOpen(false)}
              className="w-full flex items-center justify-center gap-2 rounded-xl bg-gold-gradient py-2.5 text-xs font-bold text-navy-900 hover:shadow-gold-glow transition-all"
            >
              <Plus className="h-4 w-4" /> List a Property
            </Link>
          </div>
        )}

        {/* Role badge */}
        <div className="px-4 pb-3">
          <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-wider ${roleBadgeClass}`}>
            <ShieldCheck className="h-3 w-3" />
            {user?.role}
          </span>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 overflow-y-auto">
          <p className="px-3 mb-2 text-[10px] font-semibold text-slate-600 uppercase tracking-wider">Menu</p>
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              pathname === item.href ||
              (item.href !== '/dashboard' && pathname.startsWith(item.href));
            return (
              <Link
                key={`${item.href}-${item.label}`}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={`flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium mb-1 transition-all duration-150 ${
                  isActive
                    ? 'bg-white/10 text-white'
                    : 'text-slate-400 hover:bg-white/5 hover:text-white'
                }`}
              >
                <Icon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-gold-400' : ''}`} />
                {item.label}
                {item.href === '/dashboard/chat' && chatUnread > 0 && (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-veriq-secondary px-1.5 text-[10px] font-bold text-white">
                    {chatUnread > 99 ? '99+' : chatUnread}
                  </span>
                )}
                {isActive && <ChevronRight className="h-3.5 w-3.5 ml-auto text-gold-400" />}
              </Link>
            );
          })}
        </nav>

        {/* User panel */}
        <div className="px-4 py-4 border-t border-white/5">
          <div className="flex items-center gap-3 rounded-xl px-3 py-3 mb-2 bg-white/5">
            <div className="h-8 w-8 rounded-full bg-veriq-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
              {initials}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-white text-xs font-semibold truncate">{displayName}</p>
              <p className="text-slate-500 text-[10px] truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Link
              href="/dashboard/profile"
              onClick={() => setSidebarOpen(false)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Settings className="h-3.5 w-3.5" /> Settings
            </Link>
            <button
              onClick={logout}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg py-2 text-xs text-slate-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
            >
              <LogOut className="h-3.5 w-3.5" /> Logout
            </button>
          </div>
        </div>
      </aside>

      {/* Overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0 lg:ml-64">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between bg-white border-b border-slate-200 px-4 sm:px-6 shadow-nav">
          <div className="flex items-center gap-3">
            <button
              className="lg:hidden text-navy-700 hover:text-navy-900 rounded-lg p-1.5 hover:bg-slate-100"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <p className="text-sm font-semibold text-navy-900">
                Welcome back, {user?.firstName ?? 'there'}
              </p>
              <p className="text-[11px] text-slate-400 capitalize">{user?.role}</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                type="button"
                onClick={openNotifications}
                className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100"
              >
                <Bell className="h-5 w-5" />
                {bellUnread > 0 && (
                  <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-veriq-secondary px-1 text-[10px] font-bold text-white">
                    {bellUnread > 99 ? '99+' : bellUnread}
                  </span>
                )}
              </button>

              {notificationsOpen && (
                <div className="fixed left-3 right-3 top-[4.25rem] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-card-hover sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:w-[22rem] sm:max-h-none">
                  <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-4 py-3">
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-navy-900">Notifications</p>
                      <p className="text-[11px] text-slate-400">
                        {notificationUnread} unread
                      </p>
                    </div>
                    {notificationUnread > 0 && (
                      <button
                        type="button"
                        onClick={markAllNotificationsRead}
                        className="flex-shrink-0 text-xs font-semibold text-veriq-secondary hover:underline"
                      >
                        Mark all read
                      </button>
                    )}
                  </div>
                  <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto sm:max-h-96">
                    {isLoadingNotifications ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">Loading notifications...</div>
                    ) : notifications.length === 0 ? (
                      <div className="px-4 py-8 text-center text-sm text-slate-500">No notifications yet.</div>
                    ) : (
                      notifications.map((notification) => (
                        <button
                          key={notification.id}
                          type="button"
                          onClick={() => handleNotificationClick(notification)}
                          className="block w-full border-b border-slate-50 px-4 py-3 text-left transition-colors hover:bg-slate-50"
                        >
                          <div className="flex items-start gap-3">
                            <span className={`mt-1 h-2 w-2 flex-shrink-0 rounded-full ${
                              notification.readAt ? 'bg-slate-200' : 'bg-veriq-secondary'
                            }`} />
                            <div className="min-w-0 flex-1">
                              <p className="break-words text-sm font-bold text-navy-900">{notification.title}</p>
                              <p className="mt-0.5 break-words text-xs leading-5 text-slate-500 sm:line-clamp-2">{notification.message}</p>
                              <p className="mt-1 text-[10px] text-slate-400">
                                {new Date(notification.createdAt).toLocaleString()}
                              </p>
                            </div>
                          </div>
                        </button>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="h-8 w-8 rounded-full bg-veriq-secondary flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        {notificationPermission === 'default' && (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2 text-xs text-amber-800 sm:px-6">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <span>Enable chat notifications to hear about new messages instantly.</span>
              <button type="button" onClick={enableNotifications} className="self-start rounded-lg bg-amber-600 px-3 py-1.5 font-semibold text-white sm:self-auto">
                Enable notifications
              </button>
            </div>
          </div>
        )}

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
