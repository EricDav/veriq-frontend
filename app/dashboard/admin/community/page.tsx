'use client';

import React, { useEffect, useState } from 'react';
import { BarChart3, CheckCircle, Flag, Gift, MapPin, Plus, RefreshCw, XCircle } from 'lucide-react';
import { communityApi } from '@/lib/api';
import {
  ContributionStatus,
  FreeUnlockAgreementType,
  StreetStatus,
  type FreeUnlockCampaign,
  type Street,
  type StreetContribution,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

export default function AdminCommunityPage() {
  const { success, error } = useToast();
  const [analytics, setAnalytics] = useState<Record<string, unknown> | null>(null);
  const [campaigns, setCampaigns] = useState<FreeUnlockCampaign[]>([]);
  const [streets, setStreets] = useState<Street[]>([]);
  const [contributions, setContributions] = useState<StreetContribution[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [reviewingId, setReviewingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    propertyId: '',
    startDate: '',
    endDate: '',
    maximumUnlocks: '25',
    maximumUnlocksPerUser: '1',
    agreementType: FreeUnlockAgreementType.VERIQ_PROMOTIONAL_CAMPAIGN,
    amountPaid: '',
    paymentStatus: '',
    internalNote: '',
  });

  const load = async () => {
    setLoading(true);
    try {
      const [analyticsRes, campaignsRes] = await Promise.all([
        communityApi.adminAnalytics(),
        communityApi.adminCampaigns(),
      ]);
      const [streetsRes, contributionsRes] = await Promise.all([
        communityApi.adminStreets(),
        communityApi.adminContributions(),
      ]);
      setAnalytics(analyticsRes.data as Record<string, unknown>);
      setCampaigns(campaignsRes.data);
      setStreets(streetsRes.data);
      setContributions(contributionsRes.data);
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to load community admin tools');
    } finally {
      setLoading(false);
    }
  };

  const reviewStreet = async (street: Street, status: StreetStatus) => {
    setReviewingId(street.id);
    try {
      await communityApi.reviewStreet(street.id, {
        status,
        isPopular: status === StreetStatus.APPROVED ? street.isPopular : false,
        popularRank: street.popularRank,
      });
      success(`Street ${status.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to review street');
    } finally {
      setReviewingId(null);
    }
  };

  const reviewContribution = async (contribution: StreetContribution, status: ContributionStatus) => {
    setReviewingId(contribution.id);
    try {
      await communityApi.reviewContribution(contribution.id, { status });
      success(`Contribution ${status.replace(/_/g, ' ')}.`);
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to review contribution');
    } finally {
      setReviewingId(null);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    try {
      await communityApi.createCampaign({
        propertyId: form.propertyId,
        startDate: new Date(form.startDate).toISOString(),
        endDate: new Date(form.endDate).toISOString(),
        maximumUnlocks: form.maximumUnlocks ? Number(form.maximumUnlocks) : undefined,
        maximumUnlocksPerUser: form.maximumUnlocksPerUser ? Number(form.maximumUnlocksPerUser) : undefined,
        agreementType: form.agreementType,
        amountPaid: form.amountPaid ? Number(form.amountPaid) : undefined,
        paymentStatus: form.paymentStatus || undefined,
        internalNote: form.internalNote || undefined,
        autoReturnToPaid: true,
      });
      success('Free Unlock campaign created.');
      setForm((state) => ({ ...state, propertyId: '', internalNote: '' }));
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : 'Unable to create campaign');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-20"><LoadingSpinner size="lg" /></div>;

  return (
    <div className="mx-auto max-w-6xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-black text-navy-900">Community & Free Unlocks</h1>
          <p className="mt-1 text-sm text-veriq-muted">Manage Street Intelligence health and admin-controlled Free Unlock campaigns.</p>
        </div>
        <button onClick={load} className="btn-outline !py-2.5 !text-sm">
          <RefreshCw className="h-4 w-4" /> Refresh
        </button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Object.entries(analytics ?? {}).map(([key, value]) => (
          <div key={key} className="card p-5">
            <BarChart3 className="mb-3 h-5 w-5 text-veriq-secondary" />
            <p className="text-2xl font-black text-navy-900">{String(value)}</p>
            <p className="mt-1 text-xs capitalize text-slate-500">{key.replace(/([A-Z])/g, ' $1')}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-[420px_1fr]">
        <form onSubmit={submit} className="card space-y-4 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Gift className="h-4 w-4 text-gold-500" /> Create Free Unlock Campaign
          </h2>
          <input className="input" required placeholder="Property ID" value={form.propertyId} onChange={(e) => setForm((s) => ({ ...s, propertyId: e.target.value }))} />
          <div className="grid grid-cols-2 gap-3">
            <input className="input" required type="datetime-local" value={form.startDate} onChange={(e) => setForm((s) => ({ ...s, startDate: e.target.value }))} />
            <input className="input" required type="datetime-local" value={form.endDate} onChange={(e) => setForm((s) => ({ ...s, endDate: e.target.value }))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" min="1" placeholder="Max unlocks" value={form.maximumUnlocks} onChange={(e) => setForm((s) => ({ ...s, maximumUnlocks: e.target.value }))} />
            <input className="input" type="number" min="1" placeholder="Max per user" value={form.maximumUnlocksPerUser} onChange={(e) => setForm((s) => ({ ...s, maximumUnlocksPerUser: e.target.value }))} />
          </div>
          <select className="input" value={form.agreementType} onChange={(e) => setForm((s) => ({ ...s, agreementType: e.target.value as FreeUnlockAgreementType }))}>
            {Object.values(FreeUnlockAgreementType).map((value) => (
              <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
            ))}
          </select>
          <div className="grid grid-cols-2 gap-3">
            <input className="input" type="number" min="0" placeholder="Amount paid" value={form.amountPaid} onChange={(e) => setForm((s) => ({ ...s, amountPaid: e.target.value }))} />
            <input className="input" placeholder="Payment status" value={form.paymentStatus} onChange={(e) => setForm((s) => ({ ...s, paymentStatus: e.target.value }))} />
          </div>
          <textarea className="input min-h-24 resize-none" placeholder="Internal agreement notes" value={form.internalNote} onChange={(e) => setForm((s) => ({ ...s, internalNote: e.target.value }))} />
          <button type="submit" className="btn-primary w-full justify-center" disabled={saving}>
            {saving ? <LoadingSpinner size="sm" /> : <><Plus className="h-4 w-4" /> Create Campaign</>}
          </button>
        </form>

        <div className="card overflow-hidden">
          <div className="border-b border-slate-100 p-5">
            <h2 className="font-display text-base font-bold text-navy-900">Free Unlock Campaigns</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs text-slate-500">
                <tr>
                  <th className="px-4 py-3">Property</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Unlocks</th>
                  <th className="px-4 py-3">Ends</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {campaigns.map((campaign) => (
                  <tr key={campaign.id}>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-navy-900">{campaign.property?.title ?? campaign.propertyId}</p>
                      <p className="text-xs text-slate-400 capitalize">{campaign.agreementType.replace(/_/g, ' ')}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{campaign.status}</span>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600">{campaign.unlockCount} / {campaign.maximumUnlocks ?? '∞'}</td>
                    <td className="px-4 py-3 text-xs text-slate-600">{new Date(campaign.endDate).toLocaleDateString()}</td>
                  </tr>
                ))}
                {campaigns.length === 0 && (
                  <tr>
                    <td className="px-4 py-8 text-center text-sm text-slate-500" colSpan={4}>No Free Unlock campaigns yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2">
        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">Street Moderation</h2>
              <p className="mt-1 text-xs text-veriq-muted">Approve proposed streets before they appear in public Street Intelligence.</p>
            </div>
            <MapPin className="h-5 w-5 text-veriq-secondary" />
          </div>
          <div className="divide-y divide-slate-100">
            {streets.map((street) => (
              <div key={street.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{street.streetName}</p>
                    <p className="mt-1 text-xs text-veriq-muted">{street.area}, {street.city}, {street.state}</p>
                    {street.landmark && <p className="mt-1 text-xs text-slate-400">Landmark: {street.landmark}</p>}
                  </div>
                  <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{street.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.APPROVED)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>
                  <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.REJECTED)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>
                  <button type="button" disabled={reviewingId === street.id} onClick={() => reviewStreet(street, StreetStatus.DISABLED)} className="rounded-lg bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">
                    Disable
                  </button>
                </div>
              </div>
            ))}
            {streets.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No streets awaiting moderation.</p>}
          </div>
        </div>

        <div className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-5">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">Contribution Moderation</h2>
              <p className="mt-1 text-xs text-veriq-muted">Review contributor reports before they affect public intelligence.</p>
            </div>
            <Flag className="h-5 w-5 text-amber-500" />
          </div>
          <div className="divide-y divide-slate-100">
            {contributions.map((contribution) => (
              <div key={contribution.id} className="p-5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-bold text-navy-900">{contribution.street?.streetName ?? contribution.streetId}</p>
                    <p className="mt-1 text-xs text-veriq-muted capitalize">{contribution.relationshipType.replace(/_/g, ' ')} · {contribution.relationshipRecency.replace(/_/g, ' ')}</p>
                    <p className="mt-1 text-xs text-slate-400">{contribution.answers?.length ?? 0} category answers</p>
                  </div>
                  <span className="badge bg-slate-100 text-[10px] capitalize text-slate-600">{contribution.status}</span>
                </div>
                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.APPROVED)} className="rounded-lg bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700">
                    <CheckCircle className="mr-1 inline h-3.5 w-3.5" /> Approve
                  </button>
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.REJECTED)} className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700">
                    <XCircle className="mr-1 inline h-3.5 w-3.5" /> Reject
                  </button>
                  <button type="button" disabled={reviewingId === contribution.id} onClick={() => reviewContribution(contribution, ContributionStatus.FLAGGED)} className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-bold text-amber-700">
                    <Flag className="mr-1 inline h-3.5 w-3.5" /> Flag
                  </button>
                </div>
              </div>
            ))}
            {contributions.length === 0 && <p className="p-8 text-center text-sm text-slate-500">No contributions awaiting moderation.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
