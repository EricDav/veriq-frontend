'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Users, CheckCircle, XCircle, Search, RefreshCw,
  ChevronLeft, ChevronRight, ShieldCheck,
} from 'lucide-react';
import { usersApi, ApiError } from '@/lib/api';
import type { User } from '@/types';
import { UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter } from 'next/navigation';

const ROLE_BADGE: Record<UserRole, string> = {
  user: 'bg-slate-100 text-slate-600',
  agent: 'bg-gold-100 text-gold-700',
  admin: 'bg-red-100 text-red-600',
};

type ActionType = 'deactivate' | 'activate';

interface PendingAction {
  userId: string;
  type: ActionType;
  name: string;
}

export default function AdminUsersPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState('');
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null);
  const [isActioning, setIsActioning] = useState(false);

  useEffect(() => {
    if (!authLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [authLoading, user, router]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await usersApi.list(page, 20);
      setUsers(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      toastError('Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, [page]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const executeAction = async () => {
    if (!pendingAction) return;
    setIsActioning(true);
    try {
      if (pendingAction.type === 'deactivate') {
        await usersApi.deactivate(pendingAction.userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === pendingAction.userId ? { ...u, isActive: false } : u)),
        );
        success(`${pendingAction.name} deactivated.`);
      } else {
        const res = await usersApi.activate(pendingAction.userId);
        setUsers((prev) =>
          prev.map((u) => (u.id === pendingAction.userId ? { ...u, isActive: true } : u)),
        );
        success(`${pendingAction.name} reactivated.`);
      }
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Action failed');
    } finally {
      setIsActioning(false);
      setPendingAction(null);
    }
  };

  if (authLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  const filteredUsers = search.trim()
    ? users.filter((u) => {
        const name = `${u.firstName} ${u.lastName}`.toLowerCase();
        const email = u.email.toLowerCase();
        const q = search.toLowerCase();
        return name.includes(q) || email.includes(q);
      })
    : users;

  const counts = {
    total,
    active: users.filter((u) => u.isActive).length,
    agents: users.filter((u) => u.role === UserRole.AGENT).length,
    admins: users.filter((u) => u.role === UserRole.ADMIN).length,
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">User Management</h1>
          <p className="text-sm text-veriq-muted">{total} registered users</p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total Users', value: counts.total, cls: 'text-blue-600' },
          { label: 'Active', value: counts.active, cls: 'text-emerald-600' },
          { label: 'Agents', value: counts.agents, cls: 'text-gold-600' },
          { label: 'Admins', value: counts.admins, cls: 'text-red-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4">
            <p className={`text-2xl font-black ${s.cls}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Search */}
      <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 max-w-md">
        <Search className="h-4 w-4 text-slate-400 flex-shrink-0" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or email…"
          className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" className="text-veriq-secondary" />
          </div>
        ) : filteredUsers.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Users className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-navy-900">No users found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-veriq-surface">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">User</th>
                  <th className="px-4 py-4 font-medium">Role</th>
                  <th className="px-4 py-4 font-medium">Phone</th>
                  <th className="px-4 py-4 font-medium">Verified</th>
                  <th className="px-4 py-4 font-medium">Joined</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredUsers.map((u) => {
                  const initial = `${u.firstName[0] ?? ''}`.toUpperCase();
                  const joined = new Date(u.createdAt).toLocaleDateString('en-NG', {
                    day: 'numeric', month: 'short', year: 'numeric',
                  });
                  const isSelf = u.id === user?.id;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="h-8 w-8 rounded-full bg-veriq-secondary flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {initial}
                          </div>
                          <div className="min-w-0">
                            <p className="font-semibold text-navy-900 text-xs truncate">
                              {u.firstName} {u.lastName}
                              {isSelf && <span className="ml-1 text-[10px] text-veriq-secondary">(you)</span>}
                            </p>
                            <p className="text-[10px] text-slate-400 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] ${ROLE_BADGE[u.role]}`}>
                          {u.role === UserRole.ADMIN && <ShieldCheck className="h-2.5 w-2.5" />}
                          {u.role}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-600">{u.phone}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex gap-2">
                          {u.isEmailVerified ? (
                            <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">Email</span>
                          ) : (
                            <span className="badge bg-slate-100 text-slate-400 text-[10px]">Email ✗</span>
                          )}
                          {u.isPhoneVerified && (
                            <span className="badge bg-emerald-50 text-emerald-600 text-[10px]">Phone</span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-[10px] text-slate-500">{joined}</p>
                      </td>
                      <td className="px-4 py-4">
                        {u.isActive ? (
                          <span className="badge bg-emerald-100 text-emerald-700 text-[10px]">
                            <CheckCircle className="h-2.5 w-2.5" /> Active
                          </span>
                        ) : (
                          <span className="badge bg-red-100 text-red-600 text-[10px]">
                            <XCircle className="h-2.5 w-2.5" /> Inactive
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex justify-end">
                          {!isSelf && (
                            u.isActive ? (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    userId: u.id,
                                    type: 'deactivate',
                                    name: `${u.firstName} ${u.lastName}`,
                                  })
                                }
                                className="rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-[10px] font-bold hover:bg-red-50 transition-colors"
                              >
                                Deactivate
                              </button>
                            ) : (
                              <button
                                onClick={() =>
                                  setPendingAction({
                                    userId: u.id,
                                    type: 'activate',
                                    name: `${u.firstName} ${u.lastName}`,
                                  })
                                }
                                className="rounded-lg border border-emerald-200 text-emerald-600 px-3 py-1.5 text-[10px] font-bold hover:bg-emerald-50 transition-colors"
                              >
                                Activate
                              </button>
                            )
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {!isLoading && totalPages > 1 && (
        <div className="flex items-center justify-center gap-2">
          <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronLeft className="h-4 w-4" />
          </button>
          <span className="text-sm text-slate-600">Page {page} of {totalPages}</span>
          <button disabled={page === totalPages} onClick={() => setPage((p) => p + 1)} className="h-9 w-9 flex items-center justify-center rounded-lg border border-slate-200 disabled:opacity-40">
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      )}

      {/* Confirm */}
      <ConfirmDialog
        isOpen={!!pendingAction}
        onClose={() => setPendingAction(null)}
        onConfirm={executeAction}
        title={pendingAction?.type === 'deactivate' ? 'Deactivate User' : 'Activate User'}
        message={
          pendingAction?.type === 'deactivate'
            ? `Deactivate ${pendingAction.name}? They will lose access to the platform.`
            : `Activate ${pendingAction?.name ?? 'this user'}?`
        }
        confirmLabel={pendingAction?.type === 'deactivate' ? 'Deactivate' : 'Activate'}
        variant={pendingAction?.type === 'deactivate' ? 'danger' : 'primary'}
        isLoading={isActioning}
      />
    </div>
  );
}
