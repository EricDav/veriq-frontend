'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Eye, Clock, Trash2, RefreshCw, CheckCircle,
  AlertCircle, Home, MoreHorizontal, X,
} from 'lucide-react';
import { propertiesApi, agentsApi, ApiError } from '@/lib/api';
import type { Property, Agent } from '@/types';
import { AgentVerificationLevel, ListingStatus, FreshnessScore } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';

const FRESHNESS_STYLES: Record<FreshnessScore, string> = {
  freshly_verified: 'bg-emerald-500',
  recently_verified: 'bg-blue-500',
  verification_expiring: 'bg-amber-500',
  unverified: 'bg-slate-300',
};

const STATUS_STYLES: Record<ListingStatus, string> = {
  active: 'bg-emerald-100 text-emerald-700',
  pending: 'bg-amber-100 text-amber-700',
  occupied: 'bg-blue-100 text-blue-700',
  hidden: 'bg-slate-100 text-slate-500',
  taken: 'bg-purple-100 text-purple-700',
  expired: 'bg-red-100 text-red-600',
};

// ─── User view: consultation history ─────────────────────────────────────

function UserPropertiesView() {
  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My Properties</h1>
          <p className="text-sm text-veriq-muted">Properties you&apos;ve unlocked intelligence reports for</p>
        </div>
        <Link href="/properties" className="btn-primary !text-sm !py-2.5">
          <Plus className="h-4 w-4" /> Find Properties
        </Link>
      </div>

      <div className="rounded-2xl bg-veriq-surface border border-slate-200 p-8 flex flex-col items-center text-center">
        <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
          <Home className="h-8 w-8 text-slate-400" />
        </div>
        <h3 className="font-display text-base font-bold text-navy-900 mb-2">No unlocked reports yet</h3>
        <p className="text-sm text-veriq-muted mb-5 max-w-sm">
          Browse properties and unlock intelligence reports to access full details and contact agents.
        </p>
        <Link href="/properties" className="btn-primary">Browse Properties</Link>
      </div>
    </div>
  );
}

// ─── Agent view: own listings ─────────────────────────────────────────────

function AgentPropertiesView() {
  const { success, error: toastError } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [reconfirmingId, setReconfirmingId] = useState<string | null>(null);

  const load = useCallback(async () => {
    setIsLoading(true);
    try {
      const [propsRes] = await Promise.all([
        propertiesApi.getMyListings(1, 50),
      ]);
      setProperties(propsRes.data);

      try {
        const agentRes = await agentsApi.getMyProfile();
        setAgent(agentRes.data);
      } catch {
        // No agent profile yet
      }
    } catch {
      toastError('Failed to load listings');
    } finally {
      setIsLoading(false);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    load();
  }, [load]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      await propertiesApi.delete(deleteTarget);
      success('Listing deleted');
      setProperties((prev) => prev.filter((p) => p.id !== deleteTarget));
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to delete');
    } finally {
      setIsDeleting(false);
      setDeleteTarget(null);
    }
  };

  const handleReconfirm = async (id: string, currentRent: number) => {
    setReconfirmingId(id);
    try {
      const res = await propertiesApi.reconfirm(id, { rentAmount: currentRent, status: ListingStatus.ACTIVE });
      setProperties((prev) => prev.map((p) => (p.id === id ? res.data : p)));
      success('Listing refreshed and marked active!');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Reconfirmation failed');
    } finally {
      setReconfirmingId(null);
    }
  };

  const isApproved = (agent?.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;

  if (isLoading) return <PageLoader />;

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">My Listings</h1>
          <p className="text-sm text-veriq-muted">{properties.length} listing{properties.length !== 1 ? 's' : ''}</p>
        </div>
        {isApproved ? (
          <Link href="/dashboard/properties/new" className="btn-gold !text-sm !py-2.5">
            <Plus className="h-4 w-4" /> Add Listing
          </Link>
        ) : (
          <Link href="/dashboard/agent" className="btn-primary !text-sm !py-2.5">
            Complete Verification First
          </Link>
        )}
      </div>

      {/* Not verified warning */}
      {!isApproved && (
        <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
          <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-800">Verification Required</p>
            <p className="text-xs text-amber-700 mt-0.5">
              You must complete Level 1 (Basic) verification before listing properties. {' '}
              <Link href="/dashboard/agent" className="underline font-medium">Get verified →</Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: properties.filter((p) => p.status === 'active').length, cls: 'bg-emerald-50 text-emerald-600' },
          { label: 'Hidden', value: properties.filter((p) => p.status === 'hidden').length, cls: 'bg-slate-50 text-slate-500' },
          { label: 'Total', value: properties.length, cls: 'bg-blue-50 text-blue-600' },
        ].map((s) => (
          <div key={s.label} className="card p-4 text-center">
            <p className={`text-2xl font-black ${s.cls.split(' ')[1]}`}>{s.value}</p>
            <p className="text-xs text-slate-500 mt-0.5">{s.label}</p>
          </div>
        ))}
      </div>

      {/* Listings */}
      {properties.length === 0 ? (
        <div className="card p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-base font-bold text-navy-900 mb-2">No listings yet</h3>
          <p className="text-sm text-veriq-muted mb-5">Add your first property listing to start getting consultations.</p>
          {isApproved && (
            <Link href="/dashboard/properties/new" className="btn-primary">Add First Listing</Link>
          )}
        </div>
      ) : (
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-veriq-surface">
                <tr className="text-left text-xs text-slate-400 border-b border-slate-100">
                  <th className="px-6 py-4 font-medium">Property</th>
                  <th className="px-4 py-4 font-medium">Rent</th>
                  <th className="px-4 py-4 font-medium">Location</th>
                  <th className="px-4 py-4 font-medium">Freshness</th>
                  <th className="px-4 py-4 font-medium">Status</th>
                  <th className="px-4 py-4 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {properties.map((prop) => {
                  const freshnessWidth: Record<FreshnessScore, string> = {
                    freshly_verified: '100%',
                    recently_verified: '75%',
                    verification_expiring: '40%',
                    unverified: '10%',
                  };
                  return (
                    <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-navy-900 text-xs leading-snug max-w-[200px] truncate">
                          {prop.title}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {prop.propertyType.replace(/_/g, ' ')} · {prop.bedrooms}bd {prop.bathrooms}ba
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="font-semibold text-navy-900 text-xs">
                          ₦{Number(prop.rentAmount).toLocaleString()}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <p className="text-xs text-slate-600 max-w-[100px] truncate">
                          {prop.area}, {prop.state}
                        </p>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-2">
                          <div className="h-1.5 w-14 rounded-full bg-slate-100">
                            <div
                              className={`h-1.5 rounded-full ${FRESHNESS_STYLES[prop.freshnessScore]}`}
                              style={{ width: freshnessWidth[prop.freshnessScore] }}
                            />
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4">
                        <span className={`badge text-[10px] ${STATUS_STYLES[prop.status]}`}>
                          {prop.status}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center justify-end gap-2">
                          {/* Refresh / mark active */}
                          <button
                            onClick={() => handleReconfirm(prop.id, Number(prop.rentAmount))}
                            disabled={reconfirmingId === prop.id}
                            title={prop.status === 'active' ? 'Refresh active listing' : 'Refresh and mark active'}
                            className={`rounded-lg p-1.5 transition-colors disabled:opacity-50 ${
                              prop.status === 'active'
                                ? 'text-emerald-600 hover:bg-emerald-50'
                                : 'text-amber-600 hover:bg-amber-50'
                            }`}
                          >
                            {reconfirmingId === prop.id ? (
                              <LoadingSpinner size="sm" className={prop.status === 'active' ? 'text-emerald-600' : 'text-amber-600'} />
                            ) : (
                              <RefreshCw className="h-3.5 w-3.5" />
                            )}
                          </button>
                          {/* View */}
                          <Link
                            href={`/properties/${prop.id}`}
                            title="View listing"
                            className="rounded-lg p-1.5 text-blue-600 hover:bg-blue-50 transition-colors"
                          >
                            <Eye className="h-3.5 w-3.5" />
                          </Link>
                          {/* Edit */}
                          <Link
                            href={`/dashboard/properties/${prop.id}/edit`}
                            title="Edit listing"
                            className="rounded-lg p-1.5 text-slate-600 hover:bg-slate-100 transition-colors"
                          >
                            <MoreHorizontal className="h-3.5 w-3.5" />
                          </Link>
                          {/* Delete */}
                          <button
                            onClick={() => setDeleteTarget(prop.id)}
                            title="Delete listing"
                            className="rounded-lg p-1.5 text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Delete Listing"
        message="Are you sure you want to delete this listing? This action cannot be undone."
        confirmLabel="Delete"
        variant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────

export default function MyPropertiesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  if (user?.role === UserRole.AGENT) {
    return <AgentPropertiesView />;
  }

  return <UserPropertiesView />;
}
