'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { notificationsApi } from '@/lib/api';
import type { AppNotification } from '@/types';
import { cn } from '@/lib/utils';

const POLL_MS = 30_000;

/**
 * The workspace header's bell: unread count polled in the background, the ten most recent
 * notifications loaded only when the panel is opened. The panel is a disclosure — it closes on Escape
 * and on a click outside, and the button reports its state through `aria-expanded`.
 */
export function NotificationBell() {
  const router = useRouter();
  const [unread, setUnread] = useState(0);
  const [items, setItems] = useState<AppNotification[]>([]);
  const [open, setOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const refreshCount = useCallback(async () => {
    try {
      const res = await notificationsApi.unreadCount();
      setUnread(res.data.unread ?? 0);
    } catch {
      setUnread(0);
    }
  }, []);

  useEffect(() => {
    refreshCount();
    const timer = window.setInterval(refreshCount, POLL_MS);
    return () => window.clearInterval(timer);
  }, [refreshCount]);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setOpen(false);
    };
    const onPointerDown = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('mousedown', onPointerDown);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('mousedown', onPointerDown);
    };
  }, [open]);

  const toggle = async () => {
    const next = !open;
    setOpen(next);
    if (!next) return;
    setIsLoading(true);
    try {
      const [listRes, countRes] = await Promise.all([notificationsApi.list(1, 10), notificationsApi.unreadCount()]);
      setItems(listRes.data);
      setUnread(countRes.data.unread ?? 0);
    } catch {
      setItems([]);
    } finally {
      setIsLoading(false);
    }
  };

  const openNotification = async (notification: AppNotification) => {
    try {
      if (!notification.readAt) await notificationsApi.markRead(notification.id);
    } finally {
      setOpen(false);
      await refreshCount();
      if (notification.actionUrl) router.push(notification.actionUrl);
    }
  };

  const markAllRead = async () => {
    await notificationsApi.markAllRead();
    setItems((current) => current.map((item) => ({ ...item, readAt: item.readAt ?? new Date().toISOString() })));
    setUnread(0);
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={toggle}
        aria-expanded={open}
        aria-label={unread > 0 ? `Notifications, ${unread} unread` : 'Notifications'}
        className="relative rounded-md p-2 text-foreground transition-colors hover:bg-[#ffffff0d] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
      >
        <Bell aria-hidden="true" className="h-5 w-5" />
        {unread > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-semibold text-primary-foreground">
            {unread > 99 ? '99+' : unread}
          </span>
        )}
      </button>

      {open && (
        <div className="fixed left-3 right-3 top-[4.25rem] z-50 max-h-[calc(100dvh-5rem)] overflow-hidden rounded-panel border border-border bg-card shadow-2xl sm:absolute sm:left-auto sm:right-0 sm:top-11 sm:max-h-none sm:w-[22rem]">
          <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
            <div className="min-w-0">
              <p className="text-sm font-semibold text-foreground">Notifications</p>
              <p className="text-xs text-muted-foreground">{unread} unread</p>
            </div>
            {unread > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="flex-shrink-0 text-xs font-semibold text-primary hover:underline"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-[calc(100dvh-9rem)] overflow-y-auto sm:max-h-96">
            {isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">Loading notifications…</p>
            ) : items.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-muted-foreground">No notifications yet.</p>
            ) : (
              items.map((notification) => (
                <button
                  key={notification.id}
                  type="button"
                  onClick={() => openNotification(notification)}
                  className="block w-full border-b border-border px-4 py-3 text-left transition-colors last:border-b-0 hover:bg-[#ffffff08]"
                >
                  <span className="flex items-start gap-3">
                    <span
                      aria-hidden="true"
                      className={cn(
                        'mt-1.5 h-2 w-2 flex-shrink-0 rounded-full',
                        notification.readAt ? 'bg-[#ffffff24]' : 'bg-primary',
                      )}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block break-words text-sm font-semibold text-foreground">{notification.title}</span>
                      <span className="mt-0.5 block break-words text-xs leading-5 text-muted-foreground">
                        {notification.message}
                      </span>
                      <span className="mt-1 block text-[10px] text-muted-foreground">
                        {new Date(notification.createdAt).toLocaleString()}
                      </span>
                    </span>
                  </span>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
