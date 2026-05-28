'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, TrendingUp, CheckCircle, Clock, AlertCircle, Shield,
  Upload, FileText, RefreshCw, ChevronDown, ChevronUp, Eye,
} from 'lucide-react';
import { agentsApi, ApiError } from '@/lib/api';
import type { Agent } from '@/types';
import { AgentVerificationLevel, AgentTrustTier } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';

// ─── Profile form schema ───────────────────────────────────────────────────

const profileSchema = z.object({
  businessName: z.string().max(200).optional(),
  businessAddress: z.string().optional(),
  bio: z.string().max(500).optional(),
  yearsOfExperience: z.coerce.number().min(0).max(50).optional(),
  specialization: z.string().optional(),
});

type ProfileFormData = z.infer<typeof profileSchema>;

const level1Schema = z.object({
  govIdType: z.string().min(1, 'Select ID type'),
  govIdUrl: z.string().url('Must be a valid URL to your uploaded ID'),
  selfieUrl: z.string().url('Must be a valid URL to your selfie'),
});
type Level1FormData = z.infer<typeof level1Schema>;

const level2Schema = z.object({
  cacNumber: z.string().optional(),
  cacDocumentUrl: z.string().url().optional().or(z.literal('')),
  realEstateAssociation: z.string().optional(),
  associationMembershipUrl: z.string().url().optional().or(z.literal('')),
  landlordAuthorizationUrl: z.string().url().optional().or(z.literal('')),
});
type Level2FormData = z.infer<typeof level2Schema>;

// ─── Trust tier info ──────────────────────────────────────────────────────

const TIER_STYLES: Record<AgentTrustTier, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-gold-100 text-gold-700',
  platinum: 'bg-purple-100 text-purple-700',
};

// ─── Component ────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [activeSection, setActiveSection] = useState<'profile' | 'level1' | 'level2'>('profile');

  // ── Load existing profile ────────────────────────────────────────────

  useEffect(() => {
    async function load() {
      try {
        const res = await agentsApi.getMyProfile();
        setAgent(res.data);
        setProfileExists(true);
        resetProfile({
          businessName: res.data.businessName ?? '',
          businessAddress: res.data.businessAddress ?? '',
          bio: res.data.bio ?? '',
          yearsOfExperience: res.data.yearsOfExperience ?? undefined,
          specialization: res.data.specialization ?? '',
        });
      } catch {
        // No profile yet
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // ── Profile form ─────────────────────────────────────────────────────

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

  const onProfileSubmit = async (data: ProfileFormData) => {
    try {
      if (profileExists) {
        const res = await agentsApi.updateProfile(data);
        setAgent(res.data);
        success('Profile updated successfully!');
      } else {
        const res = await agentsApi.createProfile(data);
        setAgent(res.data);
        setProfileExists(true);
        success('Agent profile created!');
      }
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to save profile');
    }
  };

  // ── Level 1 form ─────────────────────────────────────────────────────

  const {
    register: regL1,
    handleSubmit: handleL1Submit,
    formState: { errors: l1Errors, isSubmitting: l1Submitting },
  } = useForm<Level1FormData>({ resolver: zodResolver(level1Schema) });

  const onLevel1Submit = async (data: Level1FormData) => {
    try {
      const res = await agentsApi.submitLevel1(data);
      setAgent(res.data);
      success('Level 1 documents submitted! Awaiting admin review.');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to submit');
    }
  };

  // ── Level 2 form ─────────────────────────────────────────────────────

  const {
    register: regL2,
    handleSubmit: handleL2Submit,
    formState: { errors: l2Errors, isSubmitting: l2Submitting },
  } = useForm<Level2FormData>({ resolver: zodResolver(level2Schema) });

  const onLevel2Submit = async (data: Level2FormData) => {
    try {
      const cleanData = Object.fromEntries(
        Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
      );
      const res = await agentsApi.submitLevel2(cleanData);
      setAgent(res.data);
      success('Level 2 documents submitted! Awaiting admin review.');
    } catch (err) {
      if (err instanceof ApiError && err.statusCode === 400) {
        info('Complete Level 1 verification before submitting Level 2.');
      } else {
        toastError(err instanceof ApiError ? err.message : 'Failed to submit');
      }
    }
  };

  if (isLoading) return <PageLoader />;

  const verLevel = agent?.verificationLevel ?? AgentVerificationLevel.NONE;
  const tier = agent?.trustTier ?? AgentTrustTier.BRONZE;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Agent Profile</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`badge text-xs ${TIER_STYLES[tier]}`}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
            </span>
            {agent?.isPlatformVerified && (
              <span className="badge bg-emerald-100 text-emerald-700 text-xs">
                <CheckCircle className="h-3 w-3" /> Platform Verified
              </span>
            )}
            <span className="badge bg-slate-100 text-slate-600 text-xs">
              Level {verLevel} Verification
            </span>
          </div>
        </div>
        <Link href="/dashboard/properties/new" className="btn-gold !text-sm !py-2.5">
          <Plus className="h-4 w-4" /> Add New Listing
        </Link>
      </div>

      {/* Performance metrics (if profile exists) */}
      {agent && (
        <div className="card p-6">
          <h2 className="font-display text-base font-bold text-navy-900 mb-5">Trust Performance Metrics</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'Listing Accuracy', value: Number(agent.listingAccuracyScore), color: 'bg-blue-500' },
              { label: 'Inspection Success', value: Number(agent.inspectionSuccessRate), color: 'bg-emerald-500' },
              { label: 'Satisfaction', value: Number(agent.consultationSatisfactionRating) * 20, color: 'bg-purple-500' },
              { label: 'Availability', value: Number(agent.availabilityReliabilityScore), color: 'bg-gold-500' },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className="text-sm font-bold text-navy-900">{metric.value.toFixed(0)}%</p>
                </div>
                <div className="h-2 rounded-full bg-slate-100">
                  <div
                    className={`h-2 rounded-full ${metric.color} transition-all`}
                    style={{ width: `${Math.min(metric.value, 100)}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 grid grid-cols-3 gap-4 text-center border-t border-slate-100 pt-4">
            <div>
              <p className="text-lg font-black text-navy-900">{agent.totalConsultations}</p>
              <p className="text-xs text-slate-500">Total Consultations</p>
            </div>
            <div>
              <p className="text-lg font-black text-navy-900">{agent.successfulInspections}</p>
              <p className="text-xs text-slate-500">Successful Inspections</p>
            </div>
            <div>
              <p className="text-lg font-black text-navy-900">{Number(agent.avgResponseHours).toFixed(1)}h</p>
              <p className="text-xs text-slate-500">Avg Response Time</p>
            </div>
          </div>
        </div>
      )}

      {/* Verification progress */}
      <div className="card p-6">
        <h2 className="font-display text-base font-bold text-navy-900 mb-4">Verification Progress</h2>
        <div className="flex gap-4 mb-4">
          {[
            { step: 0, label: 'Profile', done: profileExists },
            { step: 1, label: 'Level 1\nBasic', done: agent?.isGovIdVerified },
            { step: 2, label: 'Level 2\nProfessional', done: agent?.isProfessionallyVerified },
            { step: 3, label: 'Level 3\nPerformance', done: verLevel >= AgentVerificationLevel.PERFORMANCE },
          ].map(({ step, label, done }, idx, arr) => (
            <React.Fragment key={step}>
              <div className="flex flex-col items-center gap-1">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  done
                    ? 'bg-emerald-500 text-white'
                    : verLevel >= step
                    ? 'bg-veriq-secondary text-white'
                    : 'bg-slate-100 text-slate-400'
                }`}>
                  {done ? <CheckCircle className="h-4 w-4" /> : step + 1}
                </div>
                <p className="text-[10px] text-center text-slate-500 whitespace-pre-line leading-tight">{label}</p>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-0.5 self-start mt-4 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Accordion sections */}
      {/* ── Profile ── */}
      <div className="card overflow-hidden">
        <button
          onClick={() => setActiveSection(activeSection === 'profile' ? 'profile' : 'profile')}
          className="w-full flex items-center justify-between p-6 text-left"
        >
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${profileExists ? 'bg-emerald-100' : 'bg-slate-100'}`}>
              <FileText className={`h-4 w-4 ${profileExists ? 'text-emerald-600' : 'text-slate-400'}`} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">Business Profile</p>
              <p className="text-xs text-slate-500">{profileExists ? 'Profile set up' : 'Set up your agent profile'}</p>
            </div>
          </div>
        </button>

        <div className="px-6 pb-6 border-t border-slate-100">
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Business Name</label>
                <input {...regProfile('businessName')} className="input" placeholder="Emeka Properties Ltd" />
              </div>
              <div>
                <label className="label">Years of Experience</label>
                <input {...regProfile('yearsOfExperience')} type="number" className="input" placeholder="e.g. 8" />
              </div>
            </div>
            <div>
              <label className="label">Business Address</label>
              <input {...regProfile('businessAddress')} className="input" placeholder="15 Adeola Odeku, VI, Lagos" />
            </div>
            <div>
              <label className="label">Specialization</label>
              <input {...regProfile('specialization')} className="input" placeholder="Residential Rentals, Luxury Properties" />
            </div>
            <div>
              <label className="label">Bio <span className="text-slate-400">(max 500 chars)</span></label>
              <textarea
                {...regProfile('bio')}
                rows={3}
                className="input resize-none"
                placeholder="Tell property seekers about your expertise…"
              />
              {profileErrors.bio && <p className="text-xs text-red-500 mt-1">{profileErrors.bio.message}</p>}
            </div>
            <div className="flex justify-end">
              <button type="submit" disabled={profileSubmitting} className="btn-primary flex items-center gap-2">
                {profileSubmitting && <LoadingSpinner size="sm" />}
                {profileExists ? 'Update Profile' : 'Create Profile'}
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* ── Level 1 ── */}
      <div className="card overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${agent?.isGovIdVerified ? 'bg-emerald-100' : 'bg-amber-100'}`}>
              <Shield className={`h-4 w-4 ${agent?.isGovIdVerified ? 'text-emerald-600' : 'text-amber-600'}`} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">Level 1 — Basic Verification</p>
              <p className="text-xs text-slate-500">
                {agent?.isGovIdVerified
                  ? 'Approved ✓'
                  : agent?.govIdUrl
                  ? 'Submitted — awaiting admin review'
                  : 'Submit government ID and selfie'}
              </p>
            </div>
          </div>
          {agent?.isGovIdVerified && <CheckCircle className="h-5 w-5 text-emerald-500" />}
        </div>

        {!agent?.isGovIdVerified && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <div className="mt-4 mb-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                Upload your documents to a file hosting service (e.g. Google Drive, Cloudinary) and paste the public URL below. Basic verification allows you to list properties.
              </p>
            </div>

            {agent?.govIdUrl ? (
              <div className="flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-amber-500" />
                Documents submitted — pending admin review.
              </div>
            ) : (
              <form onSubmit={handleL1Submit(onLevel1Submit)} className="space-y-4">
                <div>
                  <label className="label">Government ID Type</label>
                  <select {...regL1('govIdType')} className="input">
                    <option value="">Select type…</option>
                    <option value="NIN">National ID (NIN)</option>
                    <option value="Drivers License">Driver&apos;s License</option>
                    <option value="Voters Card">Voter&apos;s Card</option>
                    <option value="International Passport">International Passport</option>
                  </select>
                  {l1Errors.govIdType && <p className="text-xs text-red-500 mt-1">{l1Errors.govIdType.message}</p>}
                </div>
                <div>
                  <label className="label">ID Document URL</label>
                  <input {...regL1('govIdUrl')} className="input" placeholder="https://drive.google.com/file/..." />
                  {l1Errors.govIdUrl && <p className="text-xs text-red-500 mt-1">{l1Errors.govIdUrl.message}</p>}
                </div>
                <div>
                  <label className="label">Selfie with ID URL</label>
                  <input {...regL1('selfieUrl')} className="input" placeholder="https://drive.google.com/file/..." />
                  {l1Errors.selfieUrl && <p className="text-xs text-red-500 mt-1">{l1Errors.selfieUrl.message}</p>}
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={l1Submitting} className="btn-primary flex items-center gap-2">
                    {l1Submitting && <LoadingSpinner size="sm" />}
                    <Upload className="h-4 w-4" /> Submit Level 1
                  </button>
                </div>
              </form>
            )}
          </div>
        )}
      </div>

      {/* ── Level 2 ── */}
      <div className="card overflow-hidden">
        <div className="p-6 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`h-8 w-8 rounded-lg flex items-center justify-center ${agent?.isProfessionallyVerified ? 'bg-emerald-100' : 'bg-blue-50'}`}>
              <TrendingUp className={`h-4 w-4 ${agent?.isProfessionallyVerified ? 'text-emerald-600' : 'text-blue-500'}`} />
            </div>
            <div>
              <p className="font-semibold text-navy-900 text-sm">Level 2 — Professional Verification</p>
              <p className="text-xs text-slate-500">
                {agent?.isProfessionallyVerified
                  ? 'Approved ✓'
                  : agent?.cacNumber
                  ? 'Submitted — awaiting admin review'
                  : 'CAC documents & association membership'}
              </p>
            </div>
          </div>
          {agent?.isProfessionallyVerified && <CheckCircle className="h-5 w-5 text-emerald-500" />}
        </div>

        {!agent?.isProfessionallyVerified && agent?.isGovIdVerified && (
          <div className="px-6 pb-6 border-t border-slate-100">
            {agent?.cacNumber ? (
              <div className="mt-4 flex items-center gap-2 text-sm text-slate-600">
                <Clock className="h-4 w-4 text-amber-500" />
                Documents submitted — pending admin review.
              </div>
            ) : (
              <form onSubmit={handleL2Submit(onLevel2Submit)} className="space-y-4 mt-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="label">CAC Number <span className="text-slate-400">(optional)</span></label>
                    <input {...regL2('cacNumber')} className="input" placeholder="RC 123456" />
                  </div>
                  <div>
                    <label className="label">Real Estate Association</label>
                    <input {...regL2('realEstateAssociation')} className="input" placeholder="REDAN, NIESV…" />
                  </div>
                </div>
                <div>
                  <label className="label">CAC Document URL <span className="text-slate-400">(optional)</span></label>
                  <input {...regL2('cacDocumentUrl')} className="input" placeholder="https://..." />
                  {l2Errors.cacDocumentUrl && <p className="text-xs text-red-500 mt-1">{l2Errors.cacDocumentUrl.message}</p>}
                </div>
                <div>
                  <label className="label">Association Membership URL</label>
                  <input {...regL2('associationMembershipUrl')} className="input" placeholder="https://..." />
                  {l2Errors.associationMembershipUrl && <p className="text-xs text-red-500 mt-1">{l2Errors.associationMembershipUrl.message}</p>}
                </div>
                <div>
                  <label className="label">Landlord Authorization URL <span className="text-slate-400">(optional)</span></label>
                  <input {...regL2('landlordAuthorizationUrl')} className="input" placeholder="https://..." />
                </div>
                <div className="flex justify-end">
                  <button type="submit" disabled={l2Submitting} className="btn-primary flex items-center gap-2">
                    {l2Submitting && <LoadingSpinner size="sm" />}
                    <Upload className="h-4 w-4" /> Submit Level 2
                  </button>
                </div>
              </form>
            )}
          </div>
        )}

        {!agent?.isGovIdVerified && (
          <div className="px-6 pb-6 border-t border-slate-100">
            <p className="mt-4 text-xs text-slate-500 flex items-center gap-2">
              <Clock className="h-4 w-4" /> Complete Level 1 verification first.
            </p>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="flex flex-wrap gap-3">
        <Link href="/dashboard/properties" className="btn-primary !text-sm !py-2.5 flex items-center gap-2">
          <Eye className="h-4 w-4" /> View My Listings
        </Link>
        <Link href="/dashboard/properties/new" className="btn-gold !text-sm !py-2.5 flex items-center gap-2">
          <Plus className="h-4 w-4" /> Add New Listing
        </Link>
      </div>
    </div>
  );
}
