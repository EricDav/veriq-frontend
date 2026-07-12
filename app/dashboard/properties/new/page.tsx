'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Home, GraduationCap, Camera, X, Upload, Zap, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import { propertiesApi, ApiError, locationsApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import {
  PropertyType, HostelSuitableFor, HostelGender, HostelCampusProximity,
  ShortStayPricingModel,
  FloodRisk, ElectricitySituation, WaterAvailability, WaterSource,
  RoadAccess, RoadAccessRain, NetworkQuality, NoiseLevel, NoiseSource,
  SecurityFeel, PropertyCondition, CompoundCulture,
  ShortStayAC, ShortStayInternet, ShortStayCleanliness, ShortStayFurnishing, ShortStayKitchen,
  MediaSection,
  type AllowedState,
  type CreatePropertyMediaDto,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

// ─── Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  description: z.string().max(1000).optional(),
  propertyType: z.nativeEnum(PropertyType),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0),
  floorLevel: z.string().optional(),
  isFurnished: z.boolean().optional(),
  rentAmount: z.coerce.number().min(1, 'Rent amount is required'),
  serviceCharge: z.coerce.number().min(0).optional(),
  agencyFee: z.coerce.number().min(0).optional(),
  legalFee: z.coerce.number().min(0).optional(),
  cautionFee: z.coerce.number().min(0).optional(),
  inspectionFee: z.coerce.number().min(0).optional(),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  area: z.string().min(2, 'Area is required'),
  address: z.string().optional(),
  // Hostel-specific
  hostelPersonsPerRoom: z.coerce.number().min(1).optional(),
  hostelGender: z.nativeEnum(HostelGender).optional(),
  hostelCampusProximity: z.nativeEnum(HostelCampusProximity).optional(),
  hostelNearestCampus: z.string().max(200).optional(),
  hostelDistanceFromCampus: z.string().max(100).optional(),
  hostelMealsIncluded: z.boolean().optional(),
  hostelRulesNotes: z.string().max(500).optional(),
  // Short Stay-specific
  shortStayPricingModel: z.nativeEnum(ShortStayPricingModel).optional(),
  shortStayDailyRate: z.coerce.number().min(0).optional(),
  shortStayWeeklyRate: z.coerce.number().min(0).optional(),
  shortStayMinNights: z.coerce.number().min(1).optional(),
  shortStayMaxNights: z.coerce.number().min(1).optional(),
  shortStayCheckInTime: z.string().max(20).optional(),
  shortStayCheckOutTime: z.string().max(20).optional(),
  shortStayHouseRules: z.string().max(500).optional(),
  // Quick Intelligence
  floodRisk: z.nativeEnum(FloodRisk).optional(),
  electricitySituation: z.nativeEnum(ElectricitySituation).optional(),
  waterAvailability: z.nativeEnum(WaterAvailability).optional(),
  waterSource: z.nativeEnum(WaterSource).optional(),
  roadAccess: z.nativeEnum(RoadAccess).optional(),
  roadAccessRain: z.nativeEnum(RoadAccessRain).optional(),
  networkQuality: z.nativeEnum(NetworkQuality).optional(),
  noiseLevel: z.nativeEnum(NoiseLevel).optional(),
  noiseSource: z.nativeEnum(NoiseSource).optional(),
  securityFeel: z.nativeEnum(SecurityFeel).optional(),
  propertyCondition: z.nativeEnum(PropertyCondition).optional(),
  compoundCulture: z.nativeEnum(CompoundCulture).optional(),
  agentObservation: z.string().max(200).optional(),
  // Short Stay Intelligence
  shortStayAC: z.nativeEnum(ShortStayAC).optional(),
  shortStayInternet: z.nativeEnum(ShortStayInternet).optional(),
  shortStayCleanliness: z.nativeEnum(ShortStayCleanliness).optional(),
  shortStayFurnishing: z.nativeEnum(ShortStayFurnishing).optional(),
  shortStayKitchen: z.nativeEnum(ShortStayKitchen).optional(),
  shortStayAgentNote: z.string().max(200).optional(),
  coverImageUrl: z.string().url('Enter a valid URL').or(z.literal('')).optional(),
});

type FormData = z.infer<typeof schema>;

// ─── Constants ────────────────────────────────────────────────────────────

const PROPERTY_TYPE_OPTIONS = [
  { value: PropertyType.FLAT, label: 'Apartment / Flat' },
  { value: PropertyType.MINI_FLAT, label: 'Mini Flat' },
  { value: PropertyType.SELF_CONTAIN, label: 'Self Contain' },
  { value: PropertyType.ROOM_AND_PARLOUR, label: 'Room & Parlour' },
  { value: PropertyType.DUPLEX, label: 'Duplex' },
  { value: PropertyType.BUNGALOW, label: 'Bungalow' },
  { value: PropertyType.HOSTEL, label: 'Hostel' },
  { value: PropertyType.SHORT_STAY, label: 'Short Stay' },
];

const SHORT_STAY_AMENITIES = [
  { key: 'wifi', label: 'WiFi' },
  { key: 'ac', label: 'Air Conditioning' },
  { key: 'generator', label: 'Generator / Power Backup' },
  { key: 'kitchen', label: 'Kitchen Access' },
  { key: 'hot_water', label: 'Hot Water' },
  { key: 'parking', label: 'Parking' },
  { key: 'security', label: 'Security / Gate' },
  { key: 'laundry', label: 'Laundry' },
  { key: 'tv', label: 'Smart TV' },
  { key: 'pool', label: 'Swimming Pool' },
];

const SUITABLE_FOR_OPTIONS = [
  { value: HostelSuitableFor.STUDENTS, label: 'Students' },
  { value: HostelSuitableFor.CORP_MEMBERS, label: 'Corp Members (NYSC)' },
  { value: HostelSuitableFor.WORKING_CLASS, label: 'Working Class' },
  { value: HostelSuitableFor.TEMPORARY_STAY, label: 'Temporary Stay' },
  { value: HostelSuitableFor.MIXED, label: 'Mixed / Any' },
];

// Media categories shown in upload section
const MEDIA_CATEGORIES: { section: MediaSection; label: string; hint: string }[] = [
  { section: MediaSection.ROAD_ACCESS,  label: 'Road Access',   hint: 'Photos of the road leading to the property' },
  { section: MediaSection.ENVIRONMENT, label: 'Surroundings',  hint: 'Neighbourhood, nearby landmarks' },
  { section: MediaSection.LIVING_ROOM, label: 'Living Room',   hint: 'Main sitting area' },
  { section: MediaSection.KITCHEN,     label: 'Kitchen',       hint: 'Kitchen / cooking area' },
  { section: MediaSection.BEDROOM,     label: 'Bedroom',       hint: 'Bedroom(s)' },
  { section: MediaSection.BATHROOM,    label: 'Bathroom',      hint: 'Bathroom / toilet' },
  { section: MediaSection.COMPOUND,    label: 'Compound',      hint: 'Compound / exterior' },
];

const ELECTRICITY_INFO_OPTIONS = [
  { key: 'public_power_mostly', label: 'Public Power Mostly Available' },
  { key: 'frequent_outages', label: 'Frequent Outages' },
  { key: 'generator_common', label: 'Generator Commonly Used' },
  { key: 'solar_backup', label: 'Solar Backup Available' },
];

const BEST_NETWORK_OPTIONS = [
  { key: 'mtn', label: 'MTN' },
  { key: 'airtel', label: 'Airtel' },
  { key: 'glo', label: 'Glo' },
  { key: '9mobile', label: '9mobile' },
];

const SECURITY_FEATURES_OPTIONS = [
  { key: 'gated_compound', label: 'Gated Compound' },
  { key: 'security_personnel', label: 'Security Personnel' },
  { key: 'estate_environment', label: 'Estate Environment' },
  { key: 'busy_area', label: 'Busy Area' },
  { key: 'isolated_area', label: 'Isolated Area' },
];

const KNOWN_ISSUES_OPTIONS = [
  { key: 'damp_wall', label: 'Damp Wall' },
  { key: 'plumbing_issue', label: 'Plumbing Issue' },
  { key: 'ceiling_damage', label: 'Ceiling Damage' },
  { key: 'cracks', label: 'Cracks' },
  { key: 'poor_finishing', label: 'Poor Finishing' },
  { key: 'none_observed', label: 'None Observed' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const MIN_IMAGES = 2;
const MAX_IMAGES = 5;
const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

type MediaUploadStatus = 'uploading' | 'uploaded' | 'failed';

interface MediaUploadItem {
  id: string;
  fileName: string;
  fileSize: number;
  fileType: string;
  previewUrl: string;
  status: MediaUploadStatus;
  url?: string;
  uploadedName?: string;
  uploadedMime?: string;
  uploadedSize?: number;
  error?: string;
}

// ─── Helpers ──────────────────────────────────────────────────────────────

function Chip({
  label, active, onClick,
}: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full px-4 py-1.5 text-xs font-semibold border transition-all ${
        active
          ? 'bg-veriq-secondary text-white border-veriq-secondary'
          : 'bg-white text-navy-700 border-slate-200 hover:border-veriq-secondary'
      }`}
    >
      {label}
    </button>
  );
}

function normalizeAssetUrl(url: string) {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
}

// ─── Component ────────────────────────────────────────────────────────────

export default function NewPropertyPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  // ── Hostel / Short Stay multi-select state ─────────────────────────────
  const [selectedSuitableFor, setSelectedSuitableFor] = useState<HostelSuitableFor[]>([]);
  const [selectedAmenities, setSelectedAmenities] = useState<string[]>([]);

  // ── Quick Intelligence multi-select state ─────────────────────────────
  const [electricityInfo, setElectricityInfo] = useState<string[]>([]);
  const [bestNetwork, setBestNetwork] = useState<string[]>([]);
  const [securityFeatures, setSecurityFeatures] = useState<string[]>([]);
  const [knownIssues, setKnownIssues] = useState<string[]>([]);

  // ── Media state: files upload immediately and submit only sends uploaded URLs.
  const [mediaUploads, setMediaUploads] = useState<Record<string, MediaUploadItem[]>>({});
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const [coverUploadError, setCoverUploadError] = useState('');
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [activeStates, setActiveStates] = useState<AllowedState[]>([]);
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const clientRequestIdRef = useRef(
    typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
  );

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bedrooms: 1, bathrooms: 1, propertyType: PropertyType.FLAT },
  });

  const propertyType = watch('propertyType');
  const coverImageUrl = watch('coverImageUrl');
  const isHostel = propertyType === PropertyType.HOSTEL;
  const isShortStay = propertyType === PropertyType.SHORT_STAY;
  const isStandard = !isHostel && !isShortStay;
  const allMediaUploads = Object.values(mediaUploads).flat();
  const hasPendingMediaUploads = allMediaUploads.some((item) => item.status === 'uploading');
  const hasFailedMediaUploads = allMediaUploads.some((item) => item.status === 'failed');

  useEffect(() => {
    locationsApi.activeStates()
      .then((res) => setActiveStates(res.data))
      .catch(() => setActiveStates([]));
  }, []);

  // ── Toggle helpers ────────────────────────────────────────────────────
  const toggle = <T,>(
    val: T,
    arr: T[],
    setter: React.Dispatch<React.SetStateAction<T[]>>,
  ) => setter((prev) => prev.includes(val) ? prev.filter((v) => v !== val) : [...prev, val]);

  // ── Media handlers ────────────────────────────────────────────────────
  const updateMediaUpload = (section: string, itemId: string, patch: Partial<MediaUploadItem>) => {
    setMediaUploads((prev) => ({
      ...prev,
      [section]: (prev[section] ?? []).map((item) => (
        item.id === itemId ? { ...item, ...patch } : item
      )),
    }));
  };

  const uploadMediaItem = async (section: string, itemId: string, file: File) => {
    try {
      const uploaded = await uploadToFileService(file);
      updateMediaUpload(section, itemId, {
        status: 'uploaded',
        url: uploaded.url,
        uploadedName: uploaded.name,
        uploadedMime: uploaded.mime,
        uploadedSize: uploaded.size,
        error: undefined,
      });
    } catch (err) {
      updateMediaUpload(section, itemId, {
        status: 'failed',
        error: err instanceof Error ? err.message : 'Upload failed',
      });
      const label = MEDIA_CATEGORIES.find((category) => category.section === section)?.label ?? 'This category';
      setMediaErrors((prev) => ({
        ...prev,
        [section]: `${label}: ${file.name} failed to upload.`,
      }));
    }
  };

  const createMediaItem = (file: File, status: MediaUploadStatus, error?: string): MediaUploadItem => ({
    id: typeof crypto !== 'undefined' && 'randomUUID' in crypto
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(16).slice(2)}`,
    fileName: file.name,
    fileSize: file.size,
    fileType: file.type,
    previewUrl: file.type.startsWith('image/') ? URL.createObjectURL(file) : '',
    status,
    error,
  });

  const handleFileAdd = (section: string, files: FileList | null) => {
    if (!files) return;
    const existing = mediaUploads[section] ?? [];
    const accepted: Array<{ item: MediaUploadItem; file: File }> = [];
    const rejected: MediaUploadItem[] = [];

    Array.from(files).forEach((file) => {
      if (existing.length + accepted.length + rejected.length >= MAX_IMAGES) {
        rejected.push(createMediaItem(file, 'failed', `Max ${MAX_IMAGES} images per category`));
        return;
      }
      if (!ALLOWED_TYPES.includes(file.type)) {
        rejected.push(createMediaItem(file, 'failed', 'Only JPG, PNG, WEBP allowed'));
        return;
      }
      if (file.size > MAX_FILE_SIZE) {
        rejected.push(createMediaItem(file, 'failed', 'Max file size is 10MB'));
        return;
      }
      accepted.push({ item: createMediaItem(file, 'uploading'), file });
    });

    if (accepted.length === 0 && rejected.length === 0) return;

    setMediaUploads((prev) => ({
      ...prev,
      [section]: [...(prev[section] ?? []), ...accepted.map(({ item }) => item), ...rejected],
    }));

    if (rejected.length > 0) {
      setMediaErrors((prev) => ({
        ...prev,
        [section]: rejected.map((item) => `${item.fileName}: ${item.error}`).join(' '),
      }));
    } else {
      setMediaErrors((prev) => { const next = { ...prev }; delete next[section]; return next; });
    }

    accepted.forEach(({ item, file }) => {
      uploadMediaItem(section, item.id, file);
    });
  };

  const handleFileRemove = (section: string, itemId: string) => {
    const currentItems = mediaUploads[section] ?? [];
    const removed = currentItems.find((item) => item.id === itemId);
    if (removed?.previewUrl) URL.revokeObjectURL(removed.previewUrl);
    const remaining = currentItems.filter((item) => item.id !== itemId);

    setMediaUploads((prev) => {
      return {
        ...prev,
        [section]: remaining,
      };
    });
    setMediaErrors((current) => {
      const failed = remaining.filter((item) => item.status === 'failed');
      if (failed.length === 0) {
        const next = { ...current };
        delete next[section];
        return next;
      }
      return {
        ...current,
        [section]: failed.map((item) => `${item.fileName}: ${item.error ?? 'Upload failed'}`).join(' '),
      };
    });
  };

  const handleCoverUpload = async (file: File | undefined) => {
    if (!file) return;
    setIsCoverUploading(true);
    setCoverUploadError('');
    try {
      const uploaded = await uploadToFileService(file);
      setValue('coverImageUrl', uploaded.url, { shouldValidate: true, shouldDirty: true });
    } catch (err) {
      setCoverUploadError(err instanceof Error ? err.message : 'Cover upload failed');
    } finally {
      setIsCoverUploading(false);
    }
  };

  // ── Submit ────────────────────────────────────────────────────────────
  const onSubmit = async (data: FormData) => {
    try {
      const missingSections = MEDIA_CATEGORIES.filter(({ section }) => (
        (mediaUploads[section] ?? []).filter((item) => item.status === 'uploaded').length < MIN_IMAGES
      ));
      if (!coverImageUrl) {
        toastError('Please upload a cover image before creating the listing.');
        return;
      }
      if (hasPendingMediaUploads) {
        toastError('Some property images are still uploading. Please wait for them to finish.');
        return;
      }
      if (hasFailedMediaUploads) {
        const nextErrors = MEDIA_CATEGORIES.reduce<Record<string, string>>((acc, { section, label }) => {
          const failed = (mediaUploads[section] ?? []).filter((item) => item.status === 'failed');
          if (failed.length > 0) {
            acc[section] = `${label}: ${failed.map((item) => `${item.fileName} (${item.error ?? 'Upload failed'})`).join(', ')}`;
          }
          return acc;
        }, {});
        setMediaErrors((prev) => ({ ...prev, ...nextErrors }));
        toastError('Fix or remove failed property image uploads before creating the listing.');
        return;
      }
      if (missingSections.length > 0) {
        const nextErrors = missingSections.reduce<Record<string, string>>((acc, { section, label }) => {
          acc[section] = `${label} needs at least ${MIN_IMAGES} images.`;
          return acc;
        }, {});
        setMediaErrors((prev) => ({ ...prev, ...nextErrors }));
        toastError(`Add at least ${MIN_IMAGES} images to every property media category.`);
        return;
      }

      const propertyMedia: CreatePropertyMediaDto[] = Object.entries(mediaUploads).flatMap(([section, items]) =>
        items
          .filter((item) => item.status === 'uploaded' && item.url)
          .map((item) => ({
            section: section as MediaSection,
            url: item.url!,
            filename: item.uploadedName ?? item.fileName,
            originalName: item.fileName,
            mimeType: item.uploadedMime ?? item.fileType,
            sizeBytes: item.uploadedSize ?? item.fileSize,
          })),
      );

      const payload = {
        clientRequestId: clientRequestIdRef.current,
        ...data,
        ...(isHostel ? { hostelSuitableFor: selectedSuitableFor } : {}),
        ...(isShortStay ? { shortStayAmenities: selectedAmenities } : {}),
        electricityInfo,
        bestNetwork,
        securityFeatures,
        knownIssues,
        propertyMedia,
      };

      await propertiesApi.create(payload);

      success('Listing created successfully!');
      router.push('/dashboard/properties');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 403) {
          toastError('Admin approval is required before listing properties.');
        } else {
          toastError(err.message);
        }
      } else {
        toastError('Failed to create listing. Please try again.');
      }
    }
  };

  return (
    <div className="max-w-3xl mx-auto">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900 mb-4 transition-colors">
          <ArrowLeft className="h-4 w-4" /> Back to Listings
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy-900">Add New Listing</h1>
        <p className="text-sm text-veriq-muted">List a property for rent on the Veriq platform</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">

        {/* ── SECTION 1: Basic Info ── */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
            <Home className="h-4 w-4 text-veriq-secondary" /> Basic Information
          </h2>

          <div>
            <label className="label">Property Title *</label>
            <input {...register('title')} className="input" placeholder="e.g. Cozy hostel room near UNIPORT" />
            {errors.title && <p className="error">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Describe the property…" />
          </div>

          <div>
            <label className="label">Cover Image</label>
            <input type="hidden" {...register('coverImageUrl')} />
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-veriq-secondary">
                {isCoverUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                {isCoverUploading ? 'Uploading...' : coverImageUrl ? 'Replace cover' : 'Upload cover'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isCoverUploading}
                  onChange={(e) => handleCoverUpload(e.target.files?.[0])}
                />
              </label>
              {coverImageUrl && (
                <a href={normalizeAssetUrl(coverImageUrl)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
                  View cover
                </a>
              )}
            </div>
            {errors.coverImageUrl && <p className="error">{errors.coverImageUrl.message}</p>}
            {coverUploadError && <p className="error">{coverUploadError}</p>}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Property Type *</label>
              <select {...register('propertyType')} className="input">
                {PROPERTY_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.propertyType && <p className="error">{errors.propertyType.message}</p>}
            </div>

            {isStandard && (
              <div>
                <label className="label">Bedrooms *</label>
                <input {...register('bedrooms')} type="number" min={0} className="input" />
              </div>
            )}

            <div>
              <label className="label">Bathrooms *</label>
              <input {...register('bathrooms')} type="number" min={0} className="input" />
            </div>
          </div>

          {isStandard && (
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="label">Floor Level</label>
                <input {...register('floorLevel')} className="input" placeholder="e.g. Ground floor, 2nd floor" />
              </div>
              <div className="flex items-center gap-3 mt-6">
                <input type="checkbox" {...register('isFurnished')} id="furnished" className="h-4 w-4" />
                <label htmlFor="furnished" className="text-sm font-medium text-navy-700">Furnished</label>
              </div>
            </div>
          )}
        </div>

        {/* ── Hostel Section ── */}
        {isHostel && (
          <div className="card p-6 space-y-5 border-2 border-veriq-secondary/20">
            <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <GraduationCap className="h-4 w-4 text-veriq-secondary" /> Hostel Details
            </h2>

            <div>
              <label className="label">Suitable For <span className="text-slate-400 font-normal">(select all that apply)</span></label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SUITABLE_FOR_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.value}
                    label={opt.label}
                    active={selectedSuitableFor.includes(opt.value)}
                    onClick={() => toggle(opt.value, selectedSuitableFor, setSelectedSuitableFor)}
                  />
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Gender</label>
                <select {...register('hostelGender')} className="input">
                  <option value="">Select…</option>
                  <option value={HostelGender.MALE}>Male Only</option>
                  <option value={HostelGender.FEMALE}>Female Only</option>
                  <option value={HostelGender.MIXED}>Mixed</option>
                </select>
              </div>
              <div>
                <label className="label">Campus Location</label>
                <select {...register('hostelCampusProximity')} className="input">
                  <option value="">Select…</option>
                  <option value={HostelCampusProximity.ON_CAMPUS}>On Campus</option>
                  <option value={HostelCampusProximity.OFF_CAMPUS}>Off Campus</option>
                </select>
              </div>
              <div>
                <label className="label">Persons Per Room</label>
                <input {...register('hostelPersonsPerRoom')} type="number" min={1} className="input" placeholder="e.g. 4" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Nearest Institution</label>
                <input {...register('hostelNearestCampus')} className="input" placeholder="e.g. University of Port Harcourt" />
              </div>
              <div>
                <label className="label">Distance from Campus</label>
                <input {...register('hostelDistanceFromCampus')} className="input" placeholder="e.g. 5 min walk, 2km" />
              </div>
            </div>

            <div className="flex items-center gap-3">
              <input type="checkbox" {...register('hostelMealsIncluded')} id="meals" className="h-4 w-4" />
              <label htmlFor="meals" className="text-sm font-medium text-navy-700">Meals included in rent</label>
            </div>

            <div>
              <label className="label">House Rules / Landlord Preferences</label>
              <textarea {...register('hostelRulesNotes')} rows={3} className="input resize-none"
                placeholder="e.g. No visitors after 10pm. Female only. No cooking in room…" />
              <p className="text-xs text-slate-400 mt-1">Max 500 characters</p>
            </div>
          </div>
        )}

        {/* ── Short Stay Section ── */}
        {isShortStay && (
          <div className="card p-6 space-y-5 border-2 border-veriq-secondary/20">
            <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <span className="text-veriq-secondary text-lg">🏨</span> Short Stay Details
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="label">Pricing Model *</label>
                <select {...register('shortStayPricingModel')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayPricingModel.DAILY}>Daily Rate Only</option>
                  <option value={ShortStayPricingModel.WEEKLY}>Weekly Rate Only</option>
                  <option value={ShortStayPricingModel.BOTH}>Daily &amp; Weekly</option>
                </select>
              </div>
              <div>
                <label className="label">Daily Rate (₦/night)</label>
                <input {...register('shortStayDailyRate')} type="number" min={0} className="input" placeholder="e.g. 15,000" />
              </div>
              <div>
                <label className="label">Weekly Rate (₦/week)</label>
                <input {...register('shortStayWeeklyRate')} type="number" min={0} className="input" placeholder="e.g. 80,000" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Minimum Nights</label>
                <input {...register('shortStayMinNights')} type="number" min={1} className="input" placeholder="e.g. 1" />
              </div>
              <div>
                <label className="label">Maximum Nights <span className="text-slate-400 font-normal">(leave blank for no limit)</span></label>
                <input {...register('shortStayMaxNights')} type="number" min={1} className="input" placeholder="e.g. 30" />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Check-in Time</label>
                <input {...register('shortStayCheckInTime')} className="input" placeholder="e.g. 2:00 PM" />
              </div>
              <div>
                <label className="label">Check-out Time</label>
                <input {...register('shortStayCheckOutTime')} className="input" placeholder="e.g. 11:00 AM" />
              </div>
            </div>

            <div>
              <label className="label">Amenities <span className="text-slate-400 font-normal">(select all available)</span></label>
              <div className="flex flex-wrap gap-2 mt-2">
                {SHORT_STAY_AMENITIES.map((a) => (
                  <Chip
                    key={a.key}
                    label={a.label}
                    active={selectedAmenities.includes(a.key)}
                    onClick={() => toggle(a.key, selectedAmenities, setSelectedAmenities)}
                  />
                ))}
              </div>
            </div>

            <div>
              <label className="label">House Rules</label>
              <textarea {...register('shortStayHouseRules')} rows={3} className="input resize-none"
                placeholder="e.g. No parties. No smoking inside. Guests must vacate by check-out time…" />
              <p className="text-xs text-slate-400 mt-1">Max 500 characters</p>
            </div>
          </div>
        )}

        {/* ── Short Stay Intelligence ── */}
        {isShortStay && (
          <div className="card p-6 space-y-5 border-2 border-veriq-secondary/20">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
                <Zap className="h-4 w-4 text-veriq-secondary" /> Short Stay Intelligence
              </h2>
              <p className="text-xs text-veriq-muted mt-1">
                Help guests understand the comfort and convenience of this space.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="label">Air Conditioning *</label>
                <select {...register('shortStayAC')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayAC.AVAILABLE_ALL_ROOMS}>Available In All Rooms</option>
                  <option value={ShortStayAC.AVAILABLE_SOME_ROOMS}>Available In Some Rooms</option>
                  <option value={ShortStayAC.NOT_AVAILABLE}>Not Available</option>
                </select>
              </div>
              <div>
                <label className="label">Internet Availability *</label>
                <select {...register('shortStayInternet')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayInternet.HIGH_SPEED}>High-Speed Internet</option>
                  <option value={ShortStayInternet.STANDARD}>Standard Internet</option>
                  <option value={ShortStayInternet.LIMITED}>Limited Internet</option>
                  <option value={ShortStayInternet.NOT_AVAILABLE}>Not Available</option>
                </select>
              </div>
              <div>
                <label className="label">Cleanliness *</label>
                <select {...register('shortStayCleanliness')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayCleanliness.EXCELLENT}>Excellent</option>
                  <option value={ShortStayCleanliness.GOOD}>Good</option>
                  <option value={ShortStayCleanliness.FAIR}>Fair</option>
                  <option value={ShortStayCleanliness.POOR}>Poor</option>
                </select>
              </div>
              <div>
                <label className="label">Furnishing Level *</label>
                <select {...register('shortStayFurnishing')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayFurnishing.FULLY_FURNISHED}>Fully Furnished</option>
                  <option value={ShortStayFurnishing.PARTIALLY_FURNISHED}>Partially Furnished</option>
                  <option value={ShortStayFurnishing.BASIC_FURNISHING}>Basic Furnishing</option>
                </select>
              </div>
              <div className="sm:col-span-2">
                <label className="label">Kitchen Access *</label>
                <select {...register('shortStayKitchen')} className="input">
                  <option value="">Select…</option>
                  <option value={ShortStayKitchen.FULL_KITCHEN}>Full Kitchen</option>
                  <option value={ShortStayKitchen.KITCHENETTE}>Kitchenette</option>
                  <option value={ShortStayKitchen.NOT_AVAILABLE}>Not Available</option>
                </select>
              </div>
            </div>

            <div>
              <label className="label flex items-center gap-2">
                <ShieldCheck className="h-3.5 w-3.5 text-veriq-secondary" />
                Agent Observation
                <span className="text-slate-400 font-normal text-xs">(optional)</span>
              </label>
              <textarea
                {...register('shortStayAgentNote')}
                rows={2}
                className="input resize-none"
                placeholder="e.g. Fully furnished short-stay apartment with reliable internet, functional air conditioning, and a well-equipped kitchen."
              />
              <p className="text-xs text-slate-400 mt-1">Max 200 characters</p>
            </div>
          </div>
        )}

        {/* ── Pricing ── */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900">
            {isShortStay ? 'Additional Fees (₦)' : isHostel ? 'Pricing (₦) — per year per person' : 'Pricing (₦)'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Annual Rent *</label>
              <input {...register('rentAmount')} type="number" min={0} className="input" placeholder="e.g. 150000" />
              {errors.rentAmount && <p className="error">{errors.rentAmount.message}</p>}
            </div>
            <div>
              <label className="label">Agency Fee</label>
              <input {...register('agencyFee')} type="number" min={0} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Service Charge</label>
              <input {...register('serviceCharge')} type="number" min={0} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Legal Fee</label>
              <input {...register('legalFee')} type="number" min={0} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Caution Fee</label>
              <input {...register('cautionFee')} type="number" min={0} className="input" placeholder="0" />
            </div>
            <div>
              <label className="label">Inspection Fee</label>
              <input {...register('inspectionFee')} type="number" min={0} className="input" placeholder="0" />
            </div>
          </div>
        </div>

        {/* ── Location ── */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">State *</label>
              <select {...register('state')} className="input">
                <option value="">Select state...</option>
                {activeStates.map((state) => (
                  <option key={state.id} value={state.name}>{state.name}</option>
                ))}
              </select>
              {errors.state && <p className="error">{errors.state.message}</p>}
            </div>
            <div>
              <label className="label">City *</label>
              <input {...register('city')} className="input" placeholder="e.g. Port Harcourt" />
              {errors.city && <p className="error">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">Area *</label>
              <input {...register('area')} className="input" placeholder="e.g. Choba" />
              {errors.area && <p className="error">{errors.area.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Full Address <span className="text-slate-400">(optional — shown only after unlock)</span></label>
            <input {...register('address')} className="input" placeholder="e.g. 12 Varsity Road, Choba" />
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            SECTION 2: PROPERTY MEDIA
        ──────────────────────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <Camera className="h-4 w-4 text-veriq-secondary" /> Property Media
            </h2>
            <p className="text-xs text-veriq-muted mt-1">
              Upload {MIN_IMAGES}–{MAX_IMAGES} photos per category. JPG, PNG, WEBP · Max 10MB each.
              Clear, well-lit, recent photos only.
            </p>
          </div>

          <div className="space-y-5">
            {MEDIA_CATEGORIES.map(({ section, label, hint }) => {
              const items = mediaUploads[section] ?? [];
              const uploadedCount = items.filter((item) => item.status === 'uploaded').length;
              const uploadingCount = items.filter((item) => item.status === 'uploading').length;
              const failedCount = items.filter((item) => item.status === 'failed').length;
              const err = mediaErrors[section];
              const canAdd = items.length < MAX_IMAGES;

              return (
                <div key={section}>
                  <div className="mb-2 flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-navy-800">{label}</p>
                      <p className="text-xs text-slate-400">{hint}</p>
                    </div>
                    <div className="flex flex-wrap items-center gap-1.5 sm:justify-end">
                      <span className={`rounded-full px-2 py-1 text-[11px] font-bold ${
                        uploadedCount < MIN_IMAGES ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {uploadedCount}/{MAX_IMAGES} uploaded
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                        min {MIN_IMAGES}
                      </span>
                      {uploadingCount > 0 && (
                        <span className="rounded-full bg-blue-50 px-2 py-1 text-[11px] font-bold text-blue-700">
                          {uploadingCount} uploading
                        </span>
                      )}
                      {failedCount > 0 && (
                        <span className="rounded-full bg-red-50 px-2 py-1 text-[11px] font-bold text-red-700">
                          {failedCount} failed
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-wrap gap-3">
                    {/* Previews */}
                    {items.map((item) => (
                      <div
                        key={item.id}
                        title={item.status === 'failed' ? `${item.fileName}: ${item.error ?? 'Upload failed'}` : item.fileName}
                        className={`group relative h-24 w-24 overflow-hidden rounded-xl border ${
                          item.status === 'failed'
                            ? 'border-red-300 bg-red-50'
                            : item.status === 'uploading'
                              ? 'border-blue-200 bg-blue-50'
                              : 'border-emerald-200 bg-white'
                        }`}
                      >
                        {item.previewUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={item.previewUrl} alt={item.fileName} className="h-full w-full object-cover" />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center px-2 text-center text-[10px] font-semibold text-slate-500">
                            {item.fileName}
                          </div>
                        )}
                        <div className={`absolute inset-x-0 bottom-0 px-1.5 py-1 text-[10px] font-bold text-white ${
                          item.status === 'failed'
                            ? 'bg-red-600'
                            : item.status === 'uploading'
                              ? 'bg-blue-600'
                              : 'bg-emerald-600'
                        }`}>
                          {item.status === 'uploading' && 'Uploading'}
                          {item.status === 'uploaded' && 'Uploaded'}
                          {item.status === 'failed' && 'Failed'}
                        </div>
                        {item.status === 'uploading' && (
                          <div className="absolute inset-0 flex items-center justify-center bg-white/55">
                            <LoadingSpinner size="sm" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleFileRemove(section, item.id)}
                          aria-label={`Remove ${item.fileName}`}
                          className="absolute right-1 top-1 rounded-full bg-black/70 p-0.5 text-white opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </div>
                    ))}

                    {/* Add button */}
                    {canAdd && (
                      <button
                        type="button"
                        onClick={() => fileInputRefs.current[section]?.click()}
                        className="w-20 h-20 rounded-xl border-2 border-dashed border-slate-300 hover:border-veriq-secondary flex flex-col items-center justify-center gap-1 transition-colors text-slate-400 hover:text-veriq-secondary"
                      >
                        <Upload className="h-4 w-4" />
                        <span className="text-[10px] font-medium">Add</span>
                      </button>
                    )}

                    <input
                      ref={(el) => { fileInputRefs.current[section] = el; }}
                      type="file"
                      multiple
                      accept=".jpg,.jpeg,.png,.webp"
                      className="hidden"
                      onChange={(e) => handleFileAdd(section, e.target.files)}
                    />
                  </div>

                  {err && <p className="text-xs text-red-500 mt-1">{err}</p>}
                  {items.some((item) => item.status === 'failed') && (
                    <div className="mt-2 space-y-1">
                      {items.filter((item) => item.status === 'failed').map((item) => (
                        <p key={item.id} className="text-xs font-medium text-red-600">
                          {item.fileName}: {item.error ?? 'Upload failed'}
                        </p>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* ────────────────────────────────────────────────────────────────────
            SECTION 3: VERIQ QUICK INTELLIGENCE
        ──────────────────────────────────────────────────────────────────── */}
        <div className="card p-6 space-y-6 border-2 border-veriq-secondary/20">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
              <Zap className="h-4 w-4 text-veriq-secondary" /> Veriq Quick Intelligence
            </h2>
            <p className="text-xs text-veriq-muted mt-1">
              Help users know what to expect after moving in. Answer as accurately as possible.
            </p>
          </div>

          {/* ── Flood Risk ── */}
          <div>
            <label className="label">Flood Risk *</label>
            <select {...register('floodRisk')} className="input">
              <option value="">Select…</option>
              <option value={FloodRisk.NO_KNOWN_FLOODING}>No Known Flooding</option>
              <option value={FloodRisk.MINOR_OCCASIONALLY}>Minor Flooding Occasionally</option>
              <option value={FloodRisk.FLOODS_HEAVY_RAIN}>Flooding During Heavy Rain</option>
            </select>
          </div>

          {/* ── Electricity ── */}
          <div className="space-y-3">
            <div>
              <label className="label">Electricity Situation *</label>
              <select {...register('electricitySituation')} className="input">
                <option value="">Select…</option>
                <option value={ElectricitySituation.EXCELLENT}>Excellent</option>
                <option value={ElectricitySituation.GOOD}>Good</option>
                <option value={ElectricitySituation.FAIR}>Fair</option>
                <option value={ElectricitySituation.POOR}>Poor</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-medium text-slate-500">Additional Information</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {ELECTRICITY_INFO_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    active={electricityInfo.includes(opt.key)}
                    onClick={() => toggle(opt.key, electricityInfo, setElectricityInfo)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Water ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Water Availability *</label>
              <select {...register('waterAvailability')} className="input">
                <option value="">Select…</option>
                <option value={WaterAvailability.CONSTANT}>Constant</option>
                <option value={WaterAvailability.MOSTLY_AVAILABLE}>Mostly Available</option>
                <option value={WaterAvailability.OCCASIONAL_SHORTAGE}>Occasional Shortage</option>
                <option value={WaterAvailability.FREQUENT_SHORTAGE}>Frequent Shortage</option>
              </select>
            </div>
            <div>
              <label className="label">Water Source</label>
              <select {...register('waterSource')} className="input">
                <option value="">Select…</option>
                <option value={WaterSource.BOREHOLE}>Borehole</option>
                <option value={WaterSource.WATER_CORPORATION}>Water Corporation</option>
                <option value={WaterSource.WELL}>Well</option>
                <option value={WaterSource.MIXED_SOURCE}>Mixed Source</option>
              </select>
            </div>
          </div>

          {/* ── Road Access ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Road Access *</label>
              <select {...register('roadAccess')} className="input">
                <option value="">Select…</option>
                <option value={RoadAccess.EXCELLENT}>Excellent</option>
                <option value={RoadAccess.GOOD}>Good</option>
                <option value={RoadAccess.FAIR}>Fair</option>
                <option value={RoadAccess.POOR}>Poor</option>
              </select>
            </div>
            <div>
              <label className="label">During Heavy Rain</label>
              <select {...register('roadAccessRain')} className="input">
                <option value="">Select…</option>
                <option value={RoadAccessRain.FULLY_ACCESSIBLE}>Fully Accessible</option>
                <option value={RoadAccessRain.SLIGHTLY_DIFFICULT}>Slightly Difficult</option>
                <option value={RoadAccessRain.DIFFICULT}>Difficult</option>
                <option value={RoadAccessRain.SOMETIMES_CUT_OFF}>Sometimes Cut Off</option>
              </select>
            </div>
          </div>

          {/* ── Network ── */}
          <div className="space-y-3">
            <div>
              <label className="label">Network Quality *</label>
              <select {...register('networkQuality')} className="input">
                <option value="">Select…</option>
                <option value={NetworkQuality.EXCELLENT}>Excellent</option>
                <option value={NetworkQuality.GOOD}>Good</option>
                <option value={NetworkQuality.FAIR}>Fair</option>
                <option value={NetworkQuality.POOR}>Poor</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-medium text-slate-500">Best Network</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {BEST_NETWORK_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    active={bestNetwork.includes(opt.key)}
                    onClick={() => toggle(opt.key, bestNetwork, setBestNetwork)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Noise ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Noise Level *</label>
              <select {...register('noiseLevel')} className="input">
                <option value="">Select…</option>
                <option value={NoiseLevel.QUIET}>Quiet</option>
                <option value={NoiseLevel.MODERATE}>Moderate</option>
                <option value={NoiseLevel.NOISY}>Noisy</option>
              </select>
            </div>
            <div>
              <label className="label">Main Noise Source</label>
              <select {...register('noiseSource')} className="input">
                <option value="">Select…</option>
                <option value={NoiseSource.CHURCH}>Church</option>
                <option value={NoiseSource.MARKET}>Market</option>
                <option value={NoiseSource.NIGHTLIFE}>Nightlife</option>
                <option value={NoiseSource.SCHOOL}>School</option>
                <option value={NoiseSource.TRAFFIC}>Traffic</option>
                <option value={NoiseSource.GENERATOR_NOISE}>Generator Noise</option>
                <option value={NoiseSource.NONE}>None</option>
              </select>
            </div>
          </div>

          {/* ── Security ── */}
          <div className="space-y-3">
            <div>
              <label className="label">Security Feel *</label>
              <select {...register('securityFeel')} className="input">
                <option value="">Select…</option>
                <option value={SecurityFeel.GOOD}>Good</option>
                <option value={SecurityFeel.FAIR}>Fair</option>
                <option value={SecurityFeel.POOR}>Poor</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-medium text-slate-500">Additional Information</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {SECURITY_FEATURES_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    active={securityFeatures.includes(opt.key)}
                    onClick={() => toggle(opt.key, securityFeatures, setSecurityFeatures)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Property Condition ── */}
          <div className="space-y-3">
            <div>
              <label className="label">Property Condition *</label>
              <select {...register('propertyCondition')} className="input">
                <option value="">Select…</option>
                <option value={PropertyCondition.NEWLY_BUILT}>Newly Built</option>
                <option value={PropertyCondition.NEWLY_RENOVATED}>Newly Renovated</option>
                <option value={PropertyCondition.GOOD_CONDITION}>Good Condition</option>
                <option value={PropertyCondition.FAIR_CONDITION}>Fair Condition</option>
                <option value={PropertyCondition.NEEDS_REPAIRS}>Needs Repairs</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-medium text-slate-500">Known Issues</label>
              <div className="flex flex-wrap gap-2 mt-1">
                {KNOWN_ISSUES_OPTIONS.map((opt) => (
                  <Chip
                    key={opt.key}
                    label={opt.label}
                    active={knownIssues.includes(opt.key)}
                    onClick={() => toggle(opt.key, knownIssues, setKnownIssues)}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Compound Culture ── */}
          <div>
            <label className="label">Compound Culture *</label>
            <select {...register('compoundCulture')} className="input">
              <option value="">Select…</option>
              <option value={CompoundCulture.FAMILY_FRIENDLY}>Family Friendly</option>
              <option value={CompoundCulture.MOSTLY_FAMILIES}>Mostly Families</option>
              <option value={CompoundCulture.MOSTLY_SINGLES}>Mostly Singles</option>
              <option value={CompoundCulture.MIXED_OCCUPANTS}>Mixed Occupants</option>
              <option value={CompoundCulture.QUIET_COMPOUND}>Quiet Compound</option>
              <option value={CompoundCulture.SOCIAL_COMPOUND}>Social Compound</option>
            </select>
          </div>

          {/* ── Agent Observation ── */}
          <div>
            <label className="label flex items-center gap-2">
              <ShieldCheck className="h-3.5 w-3.5 text-veriq-secondary" />
              Agent Observation
              <span className="text-slate-400 font-normal text-xs">(optional)</span>
            </label>
            <textarea
              {...register('agentObservation')}
              rows={2}
              className="input resize-none"
              placeholder="e.g. Quiet compound with good access road and stable water supply."
            />
            <p className="text-xs text-slate-400 mt-1">Max 200 characters</p>
          </div>
        </div>

        {/* ── Submit ── */}
        <div className="flex gap-3 justify-end pb-8">
          <Link href="/dashboard/properties" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-navy-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting || isCoverUploading || hasPendingMediaUploads}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {hasPendingMediaUploads ? 'Uploading images...' : isSubmitting ? 'Creating...' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
