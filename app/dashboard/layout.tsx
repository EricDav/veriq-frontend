'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  LayoutDashboard, Heart, Search, User, LogOut,
  Bell, Menu, X, Home, TrendingUp, Plus,
  Settings, ChevronRight, Users, ShieldCheck,
} from 'lucide-react';
import Image from 'next/image';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';

// ─── Nav items per role ───────────────────────────────────────────────────

const USER_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Properties', href: '/dashboard/browse', icon: Search },
  { label: 'Saved', href: '/dashboard/saved', icon: Heart },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const AGENT_NAV = [
  { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Browse Properties', href: '/dashboard/browse', icon: Search },
  { label: 'My Listings', href: '/dashboard/properties', icon: Home },
  { label: 'Agent Profile', href: '/dashboard/agent', icon: TrendingUp },
  { label: 'Profile', href: '/dashboard/profile', icon: User },
];

const ADMIN_NAV = [
  { label: 'Overview', href: '/dashboard', icon: LayoutDashboard },
  { label: 'Agents', href: '/dashboard/admin/agents', icon: ShieldCheck },
  { label: 'Users', href: '/dashboard/admin/users', icon: Users },
  { label: 'Properties', href: '/dashboard/admin/properties', icon: Home },
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

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      router.push(`/auth/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isAuthenticated, router, pathname]);

  if (isLoading) return <PageLoader />;
  if (!isAuthenticated) return <PageLoader />;

  const navItems = getNavItems(user?.role);
  const initials = getInitials(user?.firstName, user?.lastName);
  const displayName = user ? `${user.firstName} ${user.lastName}` : 'User';

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
        className={`fixed inset-y-0 left-0 z-50 flex w-64 flex-col bg-navy-900 transition-transform duration-300 lg:relative lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center gap-3 px-6 py-5 border-b border-white/5">
          <Link href="/" className="flex items-center gap-3 flex-1 min-w-0">
            <Image src="/images/Logo.png" alt="Veriq Logo" width={36} height={36} className="rounded-xl flex-shrink-0" />
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
      <div className="flex-1 flex flex-col min-w-0">
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
            <button className="relative rounded-lg p-2 text-slate-600 hover:bg-slate-100">
              <Bell className="h-5 w-5" />
            </button>
            <div className="h-8 w-8 rounded-full bg-veriq-secondary flex items-center justify-center text-white text-xs font-bold">
              {initials}
            </div>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
