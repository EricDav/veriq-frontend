'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Plus, TrendingUp, CheckCircle, Clock, AlertCircle, Shield,
  Upload, FileText, Eye, ChevronDown, X, Camera, CreditCard,
  MapPin, Briefcase, User, Lock, ExternalLink, Copy, Check, Share2,
} from 'lucide-react';
import { agentsApi, ApiError, locationsApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import type { Agent, AllowedState } from '@/types';
import { AgentVerificationLevel, AgentTrustTier } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { useToast } from '@/components/ui/Toast';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';

// ─── Constants ────────────────────────────────────────────────────────────

const NIGERIAN_BANKS = [
  'Access Bank', 'Citibank Nigeria', 'Ecobank Nigeria', 'Fidelity Bank',
  'First Bank of Nigeria', 'First City Monument Bank (FCMB)', 'Globus Bank',
  'Guaranty Trust Bank (GTBank)', 'Heritage Bank', 'Jaiz Bank', 'Keystone Bank',
  'Kuda Bank', 'Lotus Bank', 'Opay', 'Palmpay', 'Polaris Bank',
  'Premium Trust Bank', 'Providus Bank', 'Stanbic IBTC Bank',
  'Standard Chartered Bank', 'Sterling Bank', 'Suntrust Bank',
  'Union Bank of Nigeria', 'United Bank for Africa (UBA)',
  'Unity Bank', 'Wema Bank', 'Zenith Bank',
];

const SPECIALIZATION_OPTIONS = [
  'Apartment Rentals',
  'Hostels',
  'Short Stay',
  'Residential Sales',
  'Commercial Properties',
];

const EXPERIENCE_OPTIONS = [
  { value: '0', label: 'Less than 1 year' },
  { value: '2', label: '1 – 3 years' },
  { value: '5', label: '4 – 7 years' },
  { value: '8', label: '8+ years' },
];

const TIER_STYLES: Record<AgentTrustTier, string> = {
  bronze: 'bg-orange-100 text-orange-700',
  silver: 'bg-slate-100 text-slate-700',
  gold: 'bg-amber-100 text-amber-700',
  platinum: 'bg-purple-100 text-purple-700',
};

// ─── Schemas ──────────────────────────────────────────────────────────────

const profileSchema = z.object({
  profilePhotoUrl: z.string().url('Enter a valid photo URL').or(z.literal('')).optional(),
  businessName: z.string().max(200).optional(),
  businessAddress: z.string().optional(),
  bio: z.string().max(500).optional(),
  yearsOfExperience: z.coerce.number().min(0).max(50).optional(),
  stateOfOperation: z.string().optional(),
  bankAccountName: z.string().optional(),
  bankName: z.string().optional(),
  bankAccountNumber: z.string().regex(/^\d{10}$/, 'Account number must be 10 digits').or(z.literal('')).optional(),
  agreementAccepted: z.boolean().optional(),
  allowContactAfterPayment: z.boolean().optional(),
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

// ─── Chip multi-select ────────────────────────────────────────────────────

function ChipSelect({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: string[];
  selected: string[];
  onToggle: (v: string) => void;
}) {
  return (
    <div>
      <label className="label">{label}</label>
      <div className="flex flex-wrap gap-2 mt-1">
        {options.map((opt) => {
          const active = selected.includes(opt);
          return (
            <button
              key={opt}
              type="button"
              onClick={() => onToggle(opt)}
              className={`rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                active
                  ? 'bg-navy-900 text-white border-navy-900'
                  : 'bg-white text-slate-600 border-slate-200 hover:border-navy-400'
              }`}
            >
              {active && <CheckCircle className="inline h-3 w-3 mr-1" />}
              {opt}
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── Location tag input ───────────────────────────────────────────────────

function LocationTagInput({
  locations,
  onChange,
}: {
  locations: string[];
  onChange: (locs: string[]) => void;
}) {
  const [input, setInput] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  const add = () => {
    const val = input.trim();
    if (val && !locations.includes(val)) onChange([...locations, val]);
    setInput('');
  };

  return (
    <div>
      <label className="label">Primary Locations of Operation</label>
      <p className="text-[11px] text-slate-400 mb-2">Type an area name and press Enter or comma</p>
      <div
        className="input flex flex-wrap gap-1.5 min-h-[42px] cursor-text"
        onClick={() => inputRef.current?.focus()}
      >
        {locations.map((loc) => (
          <span
            key={loc}
            className="inline-flex items-center gap-1 rounded-full bg-navy-100 text-navy-800 text-xs font-medium px-2.5 py-1"
          >
            {loc}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onChange(locations.filter((l) => l !== loc)); }}
              className="text-navy-500 hover:text-navy-900"
            >
              <X className="h-2.5 w-2.5" />
            </button>
          </span>
        ))}
        <input
          ref={inputRef}
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ',') { e.preventDefault(); add(); }
            if (e.key === 'Backspace' && !input && locations.length) {
              onChange(locations.slice(0, -1));
            }
          }}
          onBlur={add}
          className="flex-1 min-w-[120px] outline-none bg-transparent text-sm text-navy-900 placeholder:text-slate-400"
          placeholder={locations.length === 0 ? 'e.g. Woji, GRA, Lekki…' : ''}
        />
      </div>
    </div>
  );
}

// ─── Section card ─────────────────────────────────────────────────────────

function SectionCard({
  icon: Icon,
  title,
  subtitle,
  done,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  done?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="card overflow-hidden">
      <div className="flex items-center gap-3 p-6 pb-0">
        <div className={`h-9 w-9 rounded-xl flex items-center justify-center flex-shrink-0 ${done ? 'bg-emerald-100' : 'bg-slate-100'}`}>
          <Icon className={`h-4 w-4 ${done ? 'text-emerald-600' : 'text-slate-500'}`} />
        </div>
        <div className="flex-1">
          <p className="font-semibold text-navy-900 text-sm flex items-center gap-2">
            {title}
            {done && <CheckCircle className="h-3.5 w-3.5 text-emerald-500" />}
          </p>
          <p className="text-xs text-slate-500">{subtitle}</p>
        </div>
      </div>
      <div className="p-6 pt-5">{children}</div>
    </div>
  );
}

function UploadField({
  label,
  value,
  onUploaded,
  accept = 'image/*,.pdf',
  error,
  helper,
}: {
  label: string;
  value?: string;
  onUploaded: (url: string) => void | Promise<void>;
  accept?: string;
  error?: string;
  helper?: string;
}) {
  const [isUploading, setIsUploading] = useState(false);
  const [localError, setLocalError] = useState('');

  const handleChange = async (file: File | undefined) => {
    if (!file) return;
    setIsUploading(true);
    setLocalError('');
    try {
      const uploaded = await uploadToFileService(file);
      await onUploaded(uploaded.url);
    } catch (err) {
      setLocalError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <label className="label">{label}</label>
      {helper && <p className="text-[11px] text-slate-400 mb-2">{helper}</p>}
      <div className="flex flex-wrap items-center gap-3">
        <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-veriq-secondary">
          {isUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
          {isUploading ? 'Uploading...' : value ? 'Replace file' : 'Choose file'}
          <input
            type="file"
            accept={accept}
            className="hidden"
            disabled={isUploading}
            onChange={(e) => handleChange(e.target.files?.[0])}
          />
        </label>
        {value && (
          <a href={value} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
            View uploaded file
          </a>
        )}
      </div>
      {(error || localError) && <p className="text-xs text-red-500 mt-1">{error || localError}</p>}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────

export default function AgentProfilePage() {
  const { user } = useAuth();
  const { success, error: toastError, info } = useToast();

  const [agent, setAgent] = useState<Agent | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [profileExists, setProfileExists] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [activeStates, setActiveStates] = useState<AllowedState[]>([]);

  // Multi-select states
  const [specializations, setSpecializations] = useState<string[]>([]);
  const [operatingLocations, setOperatingLocations] = useState<string[]>([]);

  useEffect(() => {
    async function load() {
      try {
        const res = await agentsApi.getMyProfile();
        const a = res.data;
        setAgent(a);
        setProfileExists(true);
        setSpecializations(a.specializations ?? []);
        setOperatingLocations(a.operatingLocations ?? []);
        resetProfile({
          profilePhotoUrl: a.profilePhotoUrl ?? '',
          businessName: a.businessName ?? '',
          businessAddress: a.businessAddress ?? '',
          bio: a.bio ?? '',
          yearsOfExperience: a.yearsOfExperience ?? undefined,
          stateOfOperation: a.stateOfOperation ?? '',
          bankAccountName: a.bankAccountName ?? '',
          bankName: a.bankName ?? '',
          bankAccountNumber: a.bankAccountNumber ?? '',
          agreementAccepted: a.agreementAccepted ?? false,
          allowContactAfterPayment: a.allowContactAfterPayment ?? true,
        });
      } catch {
        // No profile yet
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  useEffect(() => {
    locationsApi.activeStates()
      .then((res) => setActiveStates(res.data))
      .catch(() => setActiveStates([]));
  }, []);

  // ── Profile form ───────────────────────────────────────────────────────

  const {
    register: regProfile,
    handleSubmit: handleProfileSubmit,
    reset: resetProfile,
    watch: watchProfile,
    setValue: setProfileValue,
    formState: { errors: profileErrors, isSubmitting: profileSubmitting },
  } = useForm<ProfileFormData>({ resolver: zodResolver(profileSchema) });

  const agreementChecked = watchProfile('agreementAccepted');
  const photoUrl = watchProfile('profilePhotoUrl');

  const onProfileSubmit = async (data: ProfileFormData) => {
    const cleanData = Object.fromEntries(
      Object.entries(data).filter(([, v]) => v !== '' && v !== undefined),
    );
    const payload = {
      ...cleanData,
      specializations,
      operatingLocations,
    };

    try {
      if (profileExists) {
        const res = await agentsApi.updateProfile(payload);
        setAgent(res.data);
        success('Profile updated successfully!');
      } else {
        const res = await agentsApi.createProfile(payload);
        setAgent(res.data);
        setProfileExists(true);
        success('Agent profile created!');
      }
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to save profile');
    }
  };

  // ── Level 1 form ───────────────────────────────────────────────────────

  const {
    register: regL1,
    handleSubmit: handleL1Submit,
    setValue: setL1Value,
    watch: watchL1,
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

  // ── Level 2 form ───────────────────────────────────────────────────────

  const {
    register: regL2,
    handleSubmit: handleL2Submit,
    setValue: setL2Value,
    watch: watchL2,
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
  const isVerifiedAgent = agent?.isGovIdVerified && agent?.isPlatformVerified;

  return (
    <div className="max-w-4xl mx-auto space-y-6">

      {/* ── Header ── */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Agent Profile</h1>
          <div className="flex items-center gap-2 mt-1.5 flex-wrap">
            <span className={`badge text-xs ${TIER_STYLES[tier]}`}>
              {tier.charAt(0).toUpperCase() + tier.slice(1)} Tier
            </span>
            {agent?.isPlatformVerified && (
              <span className="badge bg-emerald-100 text-emerald-700 text-xs gap-1">
                <CheckCircle className="h-3 w-3" /> Verified Agent
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

      {/* ── Share public profile ── */}
      {agent?.username && (
        <div className="card p-5">
          <div className="flex items-center gap-2 mb-3">
            <Share2 className="h-4 w-4 text-veriq-secondary" />
            <h2 className="font-display text-sm font-bold text-navy-900">Share Your Public Profile</h2>
          </div>
          <p className="text-xs text-slate-500 mb-3">
            Anyone with this link can view your verified profile and all of your active listings — no login required.
          </p>
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex-1 min-w-[200px] rounded-lg border border-slate-200 bg-veriq-surface px-3 py-2.5 text-sm font-medium text-navy-700 truncate">
              veriqproperty.com/{agent.username}
            </div>
            <button
              type="button"
              onClick={async () => {
                const url = `${window.location.origin}/${agent.username}`;
                try {
                  await navigator.clipboard.writeText(url);
                } catch {
                  // Fallback for environments without Clipboard API
                  const ta = document.createElement('textarea');
                  ta.value = url;
                  document.body.appendChild(ta);
                  ta.select();
                  document.execCommand('copy');
                  document.body.removeChild(ta);
                }
                setLinkCopied(true);
                success('Profile link copied to clipboard');
                setTimeout(() => setLinkCopied(false), 2000);
              }}
              className="btn-secondary !text-sm !py-2.5 flex items-center gap-2"
            >
              {linkCopied ? <Check className="h-4 w-4 text-emerald-500" /> : <Copy className="h-4 w-4" />}
              {linkCopied ? 'Copied' : 'Copy Link'}
            </button>
            <Link
              href={`/${agent.username}`}
              target="_blank"
              className="btn-gold !text-sm !py-2.5 flex items-center gap-2"
            >
              <ExternalLink className="h-4 w-4" /> View Profile
            </Link>
          </div>
        </div>
      )}

      {/* ── Verification progress bar ── */}
      <div className="card p-6">
        <h2 className="font-display text-sm font-bold text-navy-900 mb-4">Verification Progress</h2>
        <div className="flex items-start gap-2">
          {[
            { label: 'Profile', sublabel: 'Basic info', done: profileExists },
            { label: 'Identity', sublabel: 'Gov ID + selfie', done: !!agent?.isGovIdVerified },
            { label: 'Professional', sublabel: 'Business docs', done: !!agent?.isProfessionallyVerified },
            { label: 'Verified', sublabel: 'Platform badge', done: !!agent?.isPlatformVerified },
          ].map(({ label, sublabel, done }, idx, arr) => (
            <React.Fragment key={label}>
              <div className="flex flex-col items-center gap-1 flex-shrink-0">
                <div className={`h-8 w-8 rounded-full flex items-center justify-center text-xs font-bold ${
                  done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-400'
                }`}>
                  {done ? <CheckCircle className="h-4 w-4" /> : idx + 1}
                </div>
                <p className="text-[10px] text-center text-navy-800 font-semibold whitespace-nowrap">{label}</p>
                <p className="text-[9px] text-center text-slate-400 whitespace-nowrap">{sublabel}</p>
              </div>
              {idx < arr.length - 1 && (
                <div className={`flex-1 h-0.5 mt-4 ${done ? 'bg-emerald-300' : 'bg-slate-200'}`} />
              )}
            </React.Fragment>
          ))}
        </div>
        {!profileExists && (
          <div className="mt-4 flex items-start gap-2 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <AlertCircle className="h-4 w-4 text-amber-500 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-amber-700">
              Complete your profile to become eligible for identity verification and start listing properties.
            </p>
          </div>
        )}
      </div>

      {/* ── Performance metrics ── */}
      {agent && (agent.totalConsultations > 0 || agent.isPlatformVerified) && (
        <div className="card p-6">
          <h2 className="font-display text-base font-bold text-navy-900 mb-5">Performance Metrics</h2>
          <div className="grid grid-cols-2 gap-6 sm:grid-cols-4">
            {[
              { label: 'Listing Accuracy', value: Number(agent.listingAccuracyScore), color: 'bg-blue-500' },
              { label: 'Inspection Success', value: Number(agent.inspectionSuccessRate), color: 'bg-emerald-500' },
              { label: 'Satisfaction', value: Number(agent.consultationSatisfactionRating) * 20, color: 'bg-purple-500' },
              { label: 'Availability', value: Number(agent.availabilityReliabilityScore), color: 'bg-amber-500' },
            ].map((metric) => (
              <div key={metric.label}>
                <div className="flex items-center justify-between mb-2">
                  <p className="text-xs text-slate-500">{metric.label}</p>
                  <p className="text-sm font-bold text-navy-900">{metric.value.toFixed(0)}%</p>
                </div>
                <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                  <div className={`h-2 rounded-full ${metric.color}`} style={{ width: `${Math.min(metric.value, 100)}%` }} />
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

      {/* ══════════════════════════════════════════════════════════════
          SECTION 1: PERSONAL INFORMATION & BUSINESS PROFILE
      ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        icon={User}
        title="Personal Information & Business Profile"
        subtitle={profileExists ? 'Profile set up — click to update' : 'Set up your agent profile'}
        done={profileExists}
      >
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-5">

          {/* Profile photo */}
          <div>
            <div className="flex items-start gap-4">
              <div className="h-16 w-16 rounded-full bg-slate-100 overflow-hidden flex-shrink-0 flex items-center justify-center border border-slate-200">
                {photoUrl ? (
                  <Image src={photoUrl} alt="Profile" width={64} height={64} className="object-cover w-full h-full" />
                ) : (
                  <Camera className="h-6 w-6 text-slate-300" />
                )}
              </div>
              <div className="flex-1">
                <input type="hidden" {...regProfile('profilePhotoUrl')} />
                <UploadField
                  label="Profile Photo"
                  value={photoUrl}
                  accept="image/*"
                  helper="Upload a passport-style photo. The file is stored in the configured upload service."
                  onUploaded={async (url) => {
                    setProfileValue('profilePhotoUrl', url, { shouldValidate: true, shouldDirty: true });
                    if (profileExists) {
                      const res = await agentsApi.updateProfile({ profilePhotoUrl: url });
                      setAgent(res.data);
                      success('Profile photo updated successfully!');
                    }
                  }}
                  error={profileErrors.profilePhotoUrl?.message}
                />
              </div>
            </div>
          </div>

          {/* Name (from user account) + business name */}
          <div className="rounded-xl bg-veriq-surface px-4 py-3">
            <p className="text-xs text-slate-500 mb-0.5">Full Name (from your account)</p>
            <p className="text-sm font-semibold text-navy-900">
              {user?.firstName} {user?.lastName}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Business Name</label>
              <input {...regProfile('businessName')} className="input" placeholder="e.g. Emeka Properties Ltd" />
            </div>
            <div>
              <label className="label">Business Address</label>
              <input {...regProfile('businessAddress')} className="input" placeholder="e.g. 15 Adeola Odeku, VI" />
            </div>
          </div>

          {/* Experience dropdown */}
          <div>
            <label className="label">Years of Experience</label>
            <select {...regProfile('yearsOfExperience')} className="input">
              <option value="">Select experience…</option>
              {EXPERIENCE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {/* Specializations (multi-select chips) */}
          <ChipSelect
            label="Specialization"
            options={SPECIALIZATION_OPTIONS}
            selected={specializations}
            onToggle={(v) =>
              setSpecializations((prev) =>
                prev.includes(v) ? prev.filter((x) => x !== v) : [...prev, v],
              )
            }
          />

          {/* State of operation */}
          <div>
            <label className="label">State of Operation</label>
            <select {...regProfile('stateOfOperation')} className="input">
              <option value="">Select state...</option>
              {activeStates.map((state) => (
                <option key={state.id} value={state.name}>{state.name}</option>
              ))}
            </select>
          </div>

          {/* Operating locations tag input */}
          <LocationTagInput
            locations={operatingLocations}
            onChange={setOperatingLocations}
          />

          {/* Bio */}
          <div>
            <label className="label">Bio <span className="text-slate-400 font-normal">(max 500 chars)</span></label>
            <textarea
              {...regProfile('bio')}
              rows={3}
              className="input resize-none"
              placeholder="Tell property seekers about your expertise, areas, and approach…"
            />
            {profileErrors.bio && <p className="text-xs text-red-500 mt-1">{profileErrors.bio.message}</p>}
          </div>

          <label className="flex items-start gap-3 rounded-xl border border-slate-200 bg-veriq-surface px-4 py-3">
            <input
              type="checkbox"
              {...regProfile('allowContactAfterPayment')}
              defaultChecked
              className="mt-1 h-4 w-4 rounded border-slate-300 text-veriq-secondary focus:ring-veriq-secondary"
            />
            <span>
              <span className="block text-sm font-semibold text-navy-900">Allow paid users to contact me</span>
              <span className="block text-xs text-slate-500 mt-0.5">
                When enabled, users who unlock an intelligence report can call you and open chat from the listing.
              </span>
            </span>
          </label>

          <div className="flex justify-end pt-1">
            <button type="submit" disabled={profileSubmitting} className="btn-primary flex items-center gap-2">
              {profileSubmitting && <LoadingSpinner size="sm" />}
              {profileExists ? 'Update Profile' : 'Save Profile'}
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 2: IDENTITY VERIFICATION (Level 1)
      ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        icon={Shield}
        title="Identity Verification"
        subtitle={
          agent?.isGovIdVerified
            ? 'Approved ✓ — Verified Agent badge earned'
            : agent?.govIdUrl
            ? 'Documents submitted — awaiting admin review'
            : 'Submit your government ID and selfie'
        }
        done={!!agent?.isGovIdVerified}
      >
        {agent?.isGovIdVerified ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Identity Verified</p>
              <p className="text-xs text-emerald-600">Your government ID and selfie have been approved by Veriq admin.</p>
            </div>
          </div>
        ) : agent?.govIdUrl ? (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Under Review</p>
              <p className="text-xs text-amber-600">Documents submitted. Admin review typically takes 24–48 hours.</p>
            </div>
          </div>
        ) : (
          <>
            <div className="mb-4 flex items-start gap-2 rounded-xl bg-blue-50 border border-blue-100 px-4 py-3">
              <AlertCircle className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-blue-700">
                Upload your documents directly here. Veriq will use the returned secure file URL for verification review.
                Identity verification is required before you can list properties.
              </p>
            </div>

            <form onSubmit={handleL1Submit(onLevel1Submit)} className="space-y-4">
              <div>
                <label className="label">Government ID Type *</label>
                <select {...regL1('govIdType')} className="input">
                  <option value="">Select document type…</option>
                  <option value="National ID Card">National ID Card</option>
                  <option value="International Passport">International Passport</option>
                  <option value="Drivers License">Driver&apos;s Licence</option>
                  <option value="Voters Card">Voter&apos;s Card</option>
                </select>
                {l1Errors.govIdType && <p className="text-xs text-red-500 mt-1">{l1Errors.govIdType.message}</p>}
              </div>

              <input type="hidden" {...regL1('govIdUrl')} />
              <UploadField
                label="ID Document *"
                value={watchL1('govIdUrl')}
                helper="Upload a clear image or PDF of your selected government ID."
                onUploaded={(url) => setL1Value('govIdUrl', url, { shouldValidate: true, shouldDirty: true })}
                error={l1Errors.govIdUrl?.message}
              />

              <input type="hidden" {...regL1('selfieUrl')} />
              <UploadField
                label="Selfie with ID *"
                value={watchL1('selfieUrl')}
                accept="image/*"
                helper="Take a live photo holding your ID document, then upload it here."
                onUploaded={(url) => setL1Value('selfieUrl', url, { shouldValidate: true, shouldDirty: true })}
                error={l1Errors.selfieUrl?.message}
              />

              <div className="flex justify-end">
                <button type="submit" disabled={l1Submitting} className="btn-primary flex items-center gap-2">
                  {l1Submitting && <LoadingSpinner size="sm" />}
                  <Upload className="h-4 w-4" /> Submit for Verification
                </button>
              </div>
            </form>
          </>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 3: BANK ACCOUNT DETAILS
      ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        icon={CreditCard}
        title="Bank Account Details"
        subtitle="Used for agent payouts and platform transactions"
        done={!!(agent?.bankAccountName && agent?.bankName && agent?.bankAccountNumber)}
      >
        <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
          <div>
            <label className="label">Account Name *</label>
            <input {...regProfile('bankAccountName')} className="input" placeholder="e.g. Emeka John Obi" />
            {profileErrors.bankAccountName && (
              <p className="text-xs text-red-500 mt-1">{profileErrors.bankAccountName.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Bank Name *</label>
              <select {...regProfile('bankName')} className="input">
                <option value="">Select bank…</option>
                {NIGERIAN_BANKS.map((b) => (
                  <option key={b} value={b}>{b}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Account Number *</label>
              <input
                {...regProfile('bankAccountNumber')}
                className="input"
                placeholder="10-digit account number"
                maxLength={10}
              />
              {profileErrors.bankAccountNumber && (
                <p className="text-xs text-red-500 mt-1">{profileErrors.bankAccountNumber.message}</p>
              )}
            </div>
          </div>

          <div className="flex items-start gap-2 rounded-xl bg-slate-50 border border-slate-200 px-4 py-3">
            <Lock className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-slate-500">
              Your bank details are securely stored and never shown to users. They are only used for Veriq platform payouts.
            </p>
          </div>

          <div className="flex justify-end">
            <button type="submit" disabled={profileSubmitting} className="btn-primary flex items-center gap-2">
              {profileSubmitting && <LoadingSpinner size="sm" />}
              Save Bank Details
            </button>
          </div>
        </form>
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 4: AGENT AGREEMENT
      ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        icon={FileText}
        title="Agent Agreement"
        subtitle={agent?.agreementAccepted ? 'Agreement accepted' : 'Review and accept the Veriq Agent Agreement'}
        done={!!agent?.agreementAccepted}
      >
        {agent?.agreementAccepted ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Agreement Accepted</p>
              {agent.agreementAcceptedAt && (
                <p className="text-xs text-emerald-600">
                  Accepted on {new Date(agent.agreementAcceptedAt).toLocaleDateString('en-NG', { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>
              )}
            </div>
          </div>
        ) : (
          <form onSubmit={handleProfileSubmit(onProfileSubmit)} className="space-y-4">
            <div className="rounded-xl bg-veriq-surface border border-slate-200 p-4 space-y-2">
              <p className="text-xs font-semibold text-navy-900 uppercase tracking-wider mb-3">By joining Veriq Property, you agree to:</p>
              {[
                'Provide accurate and truthful property information at all times.',
                'Update the availability of your listings promptly when properties are taken.',
                'Follow Veriq Property listing standards and quality guidelines.',
                'Maintain professional conduct in all interactions with users and platform staff.',
                'Accept Veriq Property moderation decisions, including listing removal or account suspension.',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <CheckCircle className="h-3.5 w-3.5 text-veriq-secondary flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-slate-600">{item}</p>
                </div>
              ))}
            </div>

            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                {...regProfile('agreementAccepted')}
                className="mt-0.5 h-4 w-4 rounded border-slate-300 text-veriq-secondary accent-veriq-secondary"
              />
              <span className="text-sm text-navy-800 group-hover:text-navy-900">
                I have read and agree to the Veriq Property Agent Agreement and commit to upholding platform standards.
              </span>
            </label>

            <div className="flex justify-end">
              <button
                type="submit"
                disabled={profileSubmitting || !agreementChecked}
                className="btn-primary flex items-center gap-2 disabled:opacity-50"
              >
                {profileSubmitting && <LoadingSpinner size="sm" />}
                Accept & Continue
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ══════════════════════════════════════════════════════════════
          SECTION 5: PROFESSIONAL VERIFICATION (Level 2)
      ══════════════════════════════════════════════════════════════ */}

      <SectionCard
        icon={Briefcase}
        title="Professional Verification (Optional)"
        subtitle={
          agent?.isProfessionallyVerified
            ? 'Approved ✓'
            : agent?.cacNumber
            ? 'Submitted — awaiting admin review'
            : 'CAC registration, association membership, or landlord authorization'
        }
        done={!!agent?.isProfessionallyVerified}
      >
        {agent?.isProfessionallyVerified ? (
          <div className="flex items-center gap-3 rounded-xl bg-emerald-50 border border-emerald-200 px-4 py-3">
            <CheckCircle className="h-5 w-5 text-emerald-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-emerald-800">Professional Verification Approved</p>
              <p className="text-xs text-emerald-600">Your business credentials have been verified.</p>
            </div>
          </div>
        ) : !agent?.isGovIdVerified ? (
          <div className="flex items-center gap-2 text-xs text-slate-500 rounded-xl bg-slate-50 px-4 py-3">
            <Clock className="h-4 w-4" />
            Complete Level 1 identity verification first.
          </div>
        ) : agent?.cacNumber ? (
          <div className="flex items-center gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3">
            <Clock className="h-5 w-5 text-amber-500 flex-shrink-0" />
            <div>
              <p className="text-sm font-semibold text-amber-800">Under Review</p>
              <p className="text-xs text-amber-600">Professional documents submitted. Admin review in progress.</p>
            </div>
          </div>
        ) : (
          <form onSubmit={handleL2Submit(onLevel2Submit)} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">CAC Number <span className="text-slate-400 font-normal">(optional)</span></label>
                <input {...regL2('cacNumber')} className="input" placeholder="RC 123456" />
              </div>
              <div>
                <label className="label">Real Estate Association</label>
                <input {...regL2('realEstateAssociation')} className="input" placeholder="REDAN, NIESV…" />
              </div>
            </div>
            <input type="hidden" {...regL2('cacDocumentUrl')} />
            <UploadField
              label="CAC Document (optional)"
              value={watchL2('cacDocumentUrl')}
              helper="Upload CAC registration evidence if available."
              onUploaded={(url) => setL2Value('cacDocumentUrl', url, { shouldValidate: true, shouldDirty: true })}
              error={l2Errors.cacDocumentUrl?.message}
            />
            <input type="hidden" {...regL2('associationMembershipUrl')} />
            <UploadField
              label="Association Membership"
              value={watchL2('associationMembershipUrl')}
              helper="Upload REDAN, NIESV, or other real-estate association proof."
              onUploaded={(url) => setL2Value('associationMembershipUrl', url, { shouldValidate: true, shouldDirty: true })}
              error={l2Errors.associationMembershipUrl?.message}
            />
            <input type="hidden" {...regL2('landlordAuthorizationUrl')} />
            <UploadField
              label="Landlord Authorization (optional)"
              value={watchL2('landlordAuthorizationUrl')}
              helper="Upload any landlord authorization document for your listings."
              onUploaded={(url) => setL2Value('landlordAuthorizationUrl', url, { shouldValidate: true, shouldDirty: true })}
              error={l2Errors.landlordAuthorizationUrl?.message}
            />
            <div className="flex justify-end">
              <button type="submit" disabled={l2Submitting} className="btn-primary flex items-center gap-2">
                {l2Submitting && <LoadingSpinner size="sm" />}
                <Upload className="h-4 w-4" /> Submit Professional Docs
              </button>
            </div>
          </form>
        )}
      </SectionCard>

      {/* ── Quick links ── */}
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
