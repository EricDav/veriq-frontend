'use client';

import React, { useState, useEffect, useCallback, Suspense } from 'react';
import {
  Home, EyeOff, Eye, Search, RefreshCw,
  ChevronLeft, ChevronRight, CheckCircle, MapPin, X, User,
} from 'lucide-react';
import { propertiesApi, ApiError } from '@/lib/api';
import type { Property } from '@/types';
import { ListingStatus, UserRole } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

const STATUS_STYLES: Record<ListingStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  occupied: 'bg-blue-100 text-blue-700',
  hidden: 'bg-slate-100 text-slate-500',
  taken: 'bg-purple-100 text-purple-700',
  expired: 'bg-red-100 text-red-600',
};

type ActionType = 'hide' | 'unhide';

interface PendingAction {
  propertyId: string;
  type: ActionType;
  title: string;
}

function AdminPropertiesPageInner() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { success, error: toastError } = useToast();

  const agentId = searchParams.get('agentId') ?? undefined;
  const agentName = searchParams.get('agentName') ?? undefined;

  const [properties, setProperties] = useState<Property[]>([]);
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

  // Reset to page 1 whenever the agent filter changes
  useEffect(() => {
    setPage(1);
  }, [agentId]);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      // Admin endpoint returns properties of every status (active, hidden, expired…)
      const res = await propertiesApi.listAdmin({ page, limit: 20, agentId });
      setProperties(res.data);
      setTotal(res.meta.total);
      setTotalPages(res.meta.pages);
    } catch {
      toastError('Failed to load properties');
    } finally {
      setIsLoading(false);
    }
  }, [page, agentId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const executeAction = async () => {
    if (!pendingAction) return;
    setIsActioning(true);
    try {
      const { propertyId, type } = pendingAction;
      if (type === 'hide') {
        const res = await propertiesApi.hide(propertyId);
        setProperties((prev) => prev.map((p) => (p.id === propertyId ? res.data : p)));
        success('Property hidden.');
      } else {
        const res = await propertiesApi.unhide(propertyId);
        setProperties((prev) => prev.map((p) => (p.id === propertyId ? res.data : p)));
        success('Property restored.');
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

  const filteredProps = search.trim()
    ? properties.filter((p) => {
        const q = search.toLowerCase();
        return (
          p.title.toLowerCase().includes(q) ||
          p.area?.toLowerCase().includes(q) ||
          p.city?.toLowerCase().includes(q)
        );
      })
    : properties;

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Property Management</h1>
          <p className="text-sm text-veriq-muted">
            {agentId
              ? `${total} listing${total !== 1 ? 's' : ''}${agentName ? ` by ${agentName}` : ''}`
              : `${total} listings in the platform`}
          </p>
        </div>
        <button onClick={load} className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      {/* Agent filter banner */}
      {agentId && (
        <div className="flex items-center justify-between gap-3 rounded-xl border border-veriq-secondary/30 bg-veriq-secondary/5 px-4 py-3">
          <div className="flex items-center gap-2 text-sm text-navy-800">
            <User className="h-4 w-4 text-veriq-secondary flex-shrink-0" />
            Showing listings for <span className="font-semibold">{agentName || 'this agent'}</span>
          </div>
          <Link
            href="/dashboard/admin/properties"
            className="flex items-center gap-1 text-xs font-medium text-veriq-secondary hover:underline"
          >
            <X className="h-3 w-3" /> Clear filter
          </Link>
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {[
          { label: 'Total', value: total, cls: 'text-navy-900' },
          { label: 'Active', value: properties.filter((p) => p.status === 'active').length, cls: 'text-emerald-600' },
          { label: 'Hidden', value: properties.filter((p) => p.status === 'hidden').length, cls: 'text-slate-500' },
          { label: 'Expired', value: properties.filter((p) => p.status === 'expired').length, cls: 'text-red-500' },
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
          placeholder="Search by title, area, or city…"
          className="flex-1 text-sm text-navy-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <LoadingSpinner size="lg" className="text-veriq-secondary" />
          </div>
        ) : filteredProps.length === 0 ? (
          <div className="flex flex-col items-center py-16 text-center">
            <Home className="h-10 w-10 text-slate-300 mb-3" />
            <p className="text-sm font-medium text-navy-900">No properties found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-veriq-surface">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Property</th>
                  <th className="px-4 py-4 font-medium">Agent</th>
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium">Rent</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium">Freshness</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredProps.map((prop) => {
                  const agentName = prop.agent?.user
                    ? `${prop.agent.user.firstName} ${prop.agent.user.lastName}`
                    : 'Unknown';
                  const isHidden = prop.status === ListingStatus.HIDDEN;

                  return (
                    <tr key={prop.id} className={`hover:bg-slate-50 transition-colors ${isHidden ? 'opacity-60' : ''}`}>
                      <td className="px-6 py-4">
                        <p className="font-semibold text-navy-900 text-xs max-w-[180px] truncate">{prop.title}</p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {prop.propertyType.replace(/_/g, ' ')} · {prop.bedrooms}bd {prop.bathrooms}ba
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-navy-700 truncate max-w-[100px]">{agentName}</p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-1 text-xs text-slate-600">
                          <MapPin className="h-3 w-3 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-[90px]">{prop.area}, {prop.state}</span>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs font-semibold text-navy-900">
                          ₦{Number(prop.rentAmount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] ${STATUS_STYLES[prop.status]}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] capitalize ${
                          prop.freshnessScore === 'freshly_verified' ? 'bg-emerald-50 text-emerald-600' :
                          prop.freshnessScore === 'recently_verified' ? 'bg-blue-50 text-blue-600' :
                          'bg-amber-50 text-amber-600'
                        }`}>
                          {prop.freshnessScore.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          <Link
                            href={`/properties/${prop.id}`}
                            target="_blank"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                            title="View public listing"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {isHidden ? (
                            <button
                              onClick={() => setPendingAction({ propertyId: prop.id, type: 'unhide', title: prop.title })}
                              className="flex items-center gap-1.5 rounded-lg border border-emerald-200 text-emerald-600 px-3 py-1.5 text-[10px] font-bold hover:bg-emerald-50"
                            >
                              <CheckCircle className="h-3 w-3" /> Restore
                            </button>
                          ) : (
                            <button
                              onClick={() => setPendingAction({ propertyId: prop.id, type: 'hide', title: prop.title })}
                              className="flex items-center gap-1.5 rounded-lg border border-red-200 text-red-600 px-3 py-1.5 text-[10px] font-bold hover:bg-red-50"
                            >
                              <EyeOff className="h-3 w-3" /> Hide
                            </button>
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
        title={pendingAction?.type === 'hide' ? 'Hide Listing' : 'Restore Listing'}
        message={
          pendingAction?.type === 'hide'
            ? `Force-hide "${pendingAction?.title}"? It will no longer appear in public listings.`
            : `Restore "${pendingAction?.title}"? It will be visible to the public again.`
        }
        confirmLabel={pendingAction?.type === 'hide' ? 'Hide' : 'Restore'}
        variant={pendingAction?.type === 'hide' ? 'danger' : 'primary'}
        isLoading={isActioning}
      />
    </div>
  );
}

export default function AdminPropertiesPage() {
  return (
    <Suspense fallback={<PageLoader />}>
      <AdminPropertiesPageInner />
    </Suspense>
  );
}
