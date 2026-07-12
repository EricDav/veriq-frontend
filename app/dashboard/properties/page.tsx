'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import {
  Plus, Eye, Clock, RefreshCw, CheckCircle,
  AlertCircle, Home, MoreHorizontal, X, ReceiptText,
} from 'lucide-react';
import { propertiesApi, agentsApi, consultationsApi, ApiError } from '@/lib/api';
import type { Property, Agent, Consultation } from '@/types';
import { AgentVerificationLevel, ListingStatus, FreshnessScore, ConsultationStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { ConfirmDialog, Modal } from '@/components/ui/Modal';
import { useToast } from '@/components/ui/Toast';
import { PropertyCard } from '@/components/properties/PropertyCard';

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

const REFUNDABLE_STATUSES = new Set<ConsultationStatus>([
  ConsultationStatus.PAID,
  ConsultationStatus.UNLOCKED,
  ConsultationStatus.EXPIRED,
]);

const formatMoney = (value: number | string | null | undefined) =>
  `₦${Number(value ?? 0).toLocaleString('en-NG')}`;

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Not provided';

const HOUR_MS = 60 * 60 * 1000;

const getHideTimerMeta = (
  expiresAt: string | null | undefined,
  status: ListingStatus,
  nowMs: number,
) => {
  if (status !== ListingStatus.ACTIVE) {
    const labelByStatus: Partial<Record<ListingStatus, string>> = {
      [ListingStatus.HIDDEN]: 'Hidden',
      [ListingStatus.OCCUPIED]: 'Unavailable',
      [ListingStatus.TAKEN]: 'Unavailable',
      [ListingStatus.EXPIRED]: 'Expired',
      [ListingStatus.PENDING]: 'Pending',
    };

    return {
      label: labelByStatus[status] ?? 'Inactive',
      title: 'Only active listings have a hide countdown.',
      className: 'bg-slate-100 text-slate-600',
    };
  }

  if (!expiresAt) {
    return {
      label: 'No hide timer',
      title: 'This active listing does not have an expiry time set.',
      className: 'bg-slate-100 text-slate-600',
    };
  }

  const expiresAtMs = new Date(expiresAt).getTime();

  if (!Number.isFinite(expiresAtMs)) {
    return {
      label: 'Timer unavailable',
      title: 'The listing expiry time could not be read.',
      className: 'bg-slate-100 text-slate-600',
    };
  }

  const remainingHours = Math.ceil((expiresAtMs - nowMs) / HOUR_MS);

  if (remainingHours <= 0) {
    return {
      label: 'Due to hide',
      title: `This listing was due to hide at ${formatDate(expiresAt)}.`,
      className: 'bg-red-50 text-red-700',
    };
  }

  const days = Math.floor(remainingHours / 24);
  const hours = remainingHours % 24;
  const label = days > 0 ? `${days}d ${hours}h left` : `${remainingHours}h left`;
  const className = remainingHours <= 6
    ? 'bg-red-50 text-red-700'
    : remainingHours <= 24
      ? 'bg-amber-50 text-amber-700'
      : 'bg-emerald-50 text-emerald-700';

  return {
    label,
    title: `This listing will be hidden at ${formatDate(expiresAt)} unless it is refreshed.`,
    className,
  };
};

// ─── User view: consultation history ─────────────────────────────────────

function UserPropertiesView() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    consultationsApi
      .getMyConsultations(1, 100)
      .then((res) => setConsultations(res.data))
      .catch(() => setConsultations([]))
      .finally(() => setIsLoading(false));
  }, []);

  const now = Date.now();
  const activeUnlocked = consultations.filter(
    (item) =>
      item.status === ConsultationStatus.UNLOCKED &&
      item.accessExpiresAt &&
      new Date(item.accessExpiresAt).getTime() > now &&
      item.property,
  );

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

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : activeUnlocked.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {activeUnlocked.map((consultation) => (
            <div key={consultation.id} className="space-y-2">
              <PropertyCard
                property={consultation.property}
                detailHref={`/dashboard/browse/${consultation.propertyId}`}
              />
              <p className="rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                Access valid until {formatDate(consultation.accessExpiresAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-veriq-surface border border-slate-200 p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-slate-400" />
          </div>
          <h3 className="font-display text-base font-bold text-navy-900 mb-2">No active unlocked reports</h3>
          <p className="text-sm text-veriq-muted mb-5 max-w-sm">
            Browse properties and unlock intelligence reports to access full details and contact agents.
          </p>
          <Link href="/properties" className="btn-primary">Browse Properties</Link>
        </div>
      )}
    </div>
  );
}

// ─── Agent view: own listings ─────────────────────────────────────────────

function AgentPropertiesView() {
  const { success, error: toastError } = useToast();
  const [properties, setProperties] = useState<Property[]>([]);
  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [nowMs, setNowMs] = useState(() => Date.now());
  const [statusTarget, setStatusTarget] = useState<{ id: string; action: 'unavailable' | 'reactivate'; title: string } | null>(null);
  const [isStatusChanging, setIsStatusChanging] = useState(false);
  const [reconfirmingId, setReconfirmingId] = useState<string | null>(null);
  const [refundProperty, setRefundProperty] = useState<Property | null>(null);
  const [refundConsultations, setRefundConsultations] = useState<Consultation[]>([]);
  const [isLoadingRefunds, setIsLoadingRefunds] = useState(false);
  const [refundReason, setRefundReason] = useState('');
  const [refundActionId, setRefundActionId] = useState<string | null>(null);

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

  useEffect(() => {
    const intervalId = window.setInterval(() => setNowMs(Date.now()), 60_000);
    return () => window.clearInterval(intervalId);
  }, []);

  const handleStatusChange = async () => {
    if (!statusTarget) return;
    setIsStatusChanging(true);
    try {
      const res = statusTarget.action === 'unavailable'
        ? await propertiesApi.markUnavailable(statusTarget.id)
        : await propertiesApi.reactivate(statusTarget.id);
      setProperties((prev) => prev.map((p) => (p.id === statusTarget.id ? res.data : p)));
      success(statusTarget.action === 'unavailable' ? 'Listing marked as rented/unavailable.' : 'Listing reactivated.');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update listing status');
    } finally {
      setIsStatusChanging(false);
      setStatusTarget(null);
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

  const openRefunds = async (property: Property) => {
    setRefundProperty(property);
    setRefundReason('');
    setIsLoadingRefunds(true);
    try {
      const res = await consultationsApi.getPropertyConsultations(property.id, 1, 50);
      setRefundConsultations(res.data);
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to load paid unlocks');
      setRefundConsultations([]);
    } finally {
      setIsLoadingRefunds(false);
    }
  };

  const requestRefund = async (consultationId: string) => {
    setRefundActionId(consultationId);
    try {
      await consultationsApi.initiateRefund(consultationId, { reason: refundReason.trim() || undefined });
      success('Refund request sent to admin. The agent earning has been removed from available commission.');
      setRefundConsultations((prev) =>
        prev.map((item) =>
          item.id === consultationId
            ? {
                ...item,
                status: ConsultationStatus.REFUND_REQUESTED,
                refundReason: refundReason.trim() || item.refundReason,
                refundRequestedAt: new Date().toISOString(),
              }
            : item,
        ),
      );
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Refund request failed');
    } finally {
      setRefundActionId(null);
    }
  };

  const isApproved = !!agent?.isActive && (agent?.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;

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
              You must complete Level 1 (Basic) verification and receive admin approval before listing properties. {' '}
              <Link href="/dashboard/agent" className="underline font-medium">Get verified →</Link>
            </p>
          </div>
        </div>
      )}

      {/* Stats row */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Active', value: properties.filter((p) => p.status === 'active').length, cls: 'bg-emerald-50 text-emerald-600' },
          { label: 'Unavailable', value: properties.filter((p) => p.status === ListingStatus.OCCUPIED || p.status === ListingStatus.TAKEN).length, cls: 'bg-blue-50 text-blue-600' },
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
                  const hideTimer = getHideTimerMeta(prop.expiresAt, prop.status, nowMs);

                  return (
                    <tr key={prop.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4">
                        <p className="font-semibold text-navy-900 text-xs leading-snug max-w-[200px] truncate">
                          {prop.title}
                        </p>
                        <p className="text-[10px] text-slate-400 capitalize mt-0.5">
                          {prop.propertyType.replace(/_/g, ' ')} · {prop.bedrooms}bd {prop.bathrooms}ba
                        </p>
                        <div
                          className={`mt-2 inline-flex max-w-[200px] items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${hideTimer.className}`}
                          title={hideTimer.title}
                        >
                          <Clock className="h-3 w-3 flex-shrink-0" />
                          <span className="truncate">{hideTimer.label}</span>
                        </div>
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
                          <button
                            onClick={() => openRefunds(prop)}
                            title="View paid unlocks and refunds"
                            className="rounded-lg p-1.5 text-purple-600 hover:bg-purple-50 transition-colors"
                          >
                            <ReceiptText className="h-3.5 w-3.5" />
                          </button>
                          {prop.status === ListingStatus.ACTIVE ? (
                            <button
                              onClick={() => setStatusTarget({ id: prop.id, action: 'unavailable', title: prop.title })}
                              title="Mark rented/unavailable"
                              className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-blue-600 hover:bg-blue-50 transition-colors"
                            >
                              Rented
                            </button>
                          ) : (
                            <button
                              onClick={() => setStatusTarget({ id: prop.id, action: 'reactivate', title: prop.title })}
                              title="Reactivate listing"
                              className="rounded-lg px-2 py-1.5 text-[10px] font-bold text-emerald-600 hover:bg-emerald-50 transition-colors"
                            >
                              Reactivate
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
        </div>
      )}

      {/* Status confirm */}
      <ConfirmDialog
        isOpen={!!statusTarget}
        onClose={() => setStatusTarget(null)}
        onConfirm={handleStatusChange}
        title={statusTarget?.action === 'unavailable' ? 'Mark as Rented/Unavailable' : 'Reactivate Listing'}
        message={
          statusTarget?.action === 'unavailable'
            ? 'This listing will be removed from active search but kept for records, analytics, and future reactivation.'
            : 'This listing will return to active search and its freshness clock will reset.'
        }
        confirmLabel={statusTarget?.action === 'unavailable' ? 'Mark Unavailable' : 'Reactivate'}
        variant={statusTarget?.action === 'unavailable' ? 'danger' : 'primary'}
        isLoading={isStatusChanging}
      />

      <Modal
        isOpen={!!refundProperty}
        onClose={() => setRefundProperty(null)}
        title="Paid Unlocks & Refunds"
        size="lg"
      >
        <div className="space-y-4">
          <div>
            <p className="text-sm font-bold text-navy-900">{refundProperty?.title}</p>
            <p className="text-xs text-veriq-muted">Only users still within their consultation period are shown. Requested refunds stay visible for admin approval.</p>
          </div>

          <div>
            <label className="label text-xs">Reason for refund</label>
            <textarea
              value={refundReason}
              onChange={(event) => setRefundReason(event.target.value)}
              className="input min-h-20 resize-none text-sm"
              maxLength={500}
              placeholder="Example: property is no longer available, user should be credited."
            />
          </div>

          {isLoadingRefunds ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size="md" className="text-veriq-secondary" />
            </div>
          ) : refundConsultations.length === 0 ? (
            <div className="rounded-xl border border-slate-100 bg-slate-50 p-4 text-sm text-slate-500">
              No active consultation-period unlocks are eligible for refund.
            </div>
          ) : (
            <div className="max-h-[50vh] space-y-3 overflow-y-auto pr-1">
              {refundConsultations.map((item) => {
                const userName = item.user
                  ? `${item.user.firstName} ${item.user.lastName}`.trim() || item.user.email
                  : 'User';
                const canRefund = REFUNDABLE_STATUSES.has(item.status);
                return (
                  <div key={item.id} className="rounded-xl border border-slate-100 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-bold text-navy-900">{userName}</p>
                        <p className="text-xs text-slate-500">{item.user?.email ?? item.userId}</p>
                        <p className="mt-1 text-xs text-slate-400">Paid {formatDate(item.paidAt ?? item.createdAt)}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-navy-900">{formatMoney(item.feeAmount)}</p>
                        <span className="badge mt-1 bg-slate-100 text-[10px] text-slate-600">
                          {item.status.replace(/_/g, ' ')}
                        </span>
                      </div>
                    </div>
                    {item.refundReason && (
                      <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">
                        {item.refundReason}
                      </p>
                    )}
                    <div className="mt-4 flex justify-end">
                      {canRefund ? (
                        <button
                          type="button"
                          onClick={() => requestRefund(item.id)}
                          disabled={refundActionId === item.id}
                          className="rounded-lg bg-veriq-secondary px-4 py-2 text-xs font-bold text-white transition-colors hover:bg-navy-700 disabled:opacity-50"
                        >
                          {refundActionId === item.id ? 'Requesting…' : 'Request Refund'}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-slate-500">
                          {item.status === ConsultationStatus.REFUND_REQUESTED ? 'Waiting for admin approval' : 'Closed'}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </Modal>
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
