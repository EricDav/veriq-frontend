'use client';

import React, { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Home, Camera, X, Upload, Zap, ShieldCheck, Search } from 'lucide-react';
import Link from 'next/link';
import { propertiesApi, ApiError, communityApi, locationsApi } from '@/lib/api';
import { ACCEPTED_IMAGE_INPUT, MAX_ORIGINAL_IMAGE_BYTES, uploadToFileService } from '@/lib/upload';
import {
  PropertyType,
  FloodRisk, ElectricitySituation, WaterAvailability, WaterSource,
  RoadAccess, RoadAccessRain, NetworkQuality, NoiseLevel, NoiseSource,
  SecurityFeel, PropertyCondition, CompoundCulture,
  MediaSection,
  type AllowedState,
  type CommunityArea,
  type CommunityLocation,
  type Street,
  type CreatePropertyMediaDto,
} from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { LISTING_FIELDS, MEDIA_OVERALL_MINIMUM, MEDIA_REQUIREMENTS } from '@/lib/property-listing-spec';

// ─── Schema ───────────────────────────────────────────────────────────────

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  description: z.string().max(1000).optional(),
  propertyType: z.nativeEnum(PropertyType),
  bedrooms: z.coerce.number().min(0).optional(),
  bathrooms: z.coerce.number().min(0).optional(),
  toilets: z.coerce.number().min(0).optional(),
  furnishingStatus: z.string().optional(),
  floorLevel: z.string().optional(),
  rentAmount: z.coerce.number().min(0),
  serviceCharge: z.coerce.number().min(0).optional(),
  agencyFee: z.coerce.number().min(0).optional(),
  legalFee: z.coerce.number().min(0).optional(),
  cautionFee: z.coerce.number().min(0).optional(),
  inspectionFee: z.coerce.number().min(0).optional(),
  state: z.string().min(2, 'State is required'),
  city: z.string().min(2, 'City is required'),
  area: z.string().min(2, 'Area is required'),
  streetId: z.string().optional(),
  address: z.string().optional(),
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
  { value: PropertyType.SHARED_APARTMENT, label: 'Shared Apartment' },
  { value: PropertyType.HOSTEL, label: 'Hostel' },
  { value: PropertyType.SHORT_STAY, label: 'Short Let' },
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
  { key: 'roof_leakage', label: 'Roof Leakage' },
  { key: 'cracks', label: 'Cracks' },
  { key: 'poor_finishing', label: 'Poor Finishing' },
  { key: 'faulty_electrical_fittings', label: 'Faulty Electrical Fittings' },
  { key: 'poor_water_pressure', label: 'Poor Water Pressure' },
  { key: 'faulty_doors_windows', label: 'Faulty Doors / Windows' },
  { key: 'pest_issue', label: 'Pest Issue' },
  { key: 'drainage_issue', label: 'Drainage Issue' },
  { key: 'none_observed', label: 'None Observed' },
];

const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp'];
const MAX_FILE_SIZE = MAX_ORIGINAL_IMAGE_BYTES;
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
  const [masterLocations, setMasterLocations] = useState<CommunityLocation[]>([]);
  const [masterAreas, setMasterAreas] = useState<CommunityArea[]>([]);
  const [masterStreets, setMasterStreets] = useState<Street[]>([]);
  const [streetNotListed, setStreetNotListed] = useState(false);
  const [streetQuery, setStreetQuery] = useState('');
  const [debouncedStreetQuery, setDebouncedStreetQuery] = useState('');
  const [isSearchingStreets, setIsSearchingStreets] = useState(false);
  const [missingStreetName, setMissingStreetName] = useState('');
  const [missingStreetLandmark, setMissingStreetLandmark] = useState('');
  const [listingDetails, setListingDetails] = useState<Record<string, unknown>>({});
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
    defaultValues: { bedrooms: 1, bathrooms: 1, rentAmount: 0, propertyType: PropertyType.FLAT },
  });

  const propertyType = watch('propertyType');
  const selectedState = watch('state');
  const selectedCity = watch('city');
  const coverImageUrl = watch('coverImageUrl');
  const isHostel = propertyType === PropertyType.HOSTEL;
  const isShortStay = propertyType === PropertyType.SHORT_STAY;
  const isStandard = !isHostel && !isShortStay;
  const showBedrooms = [PropertyType.FLAT, PropertyType.DUPLEX, PropertyType.BUNGALOW, PropertyType.SHORT_STAY].includes(propertyType);
  const showBathrooms = [PropertyType.FLAT, PropertyType.DUPLEX, PropertyType.BUNGALOW, PropertyType.SHORT_STAY].includes(propertyType);
  const showVisitorToilet = [PropertyType.FLAT, PropertyType.DUPLEX, PropertyType.BUNGALOW].includes(propertyType);
  const showFloorLevel = [PropertyType.FLAT, PropertyType.MINI_FLAT, PropertyType.SELF_CONTAIN, PropertyType.ROOM_AND_PARLOUR].includes(propertyType);
  const typeFields = LISTING_FIELDS[propertyType] ?? [];
  const mediaCategories = (MEDIA_REQUIREMENTS[propertyType] ?? []).filter((category) => {
    if (propertyType === PropertyType.HOSTEL && category.section === MediaSection.KITCHEN) return listingDetails.cookingAllowed !== 'No';
    if (propertyType === PropertyType.SHORT_STAY && category.section === MediaSection.KITCHEN) return Array.isArray(listingDetails.amenities) && listingDetails.amenities.includes('Kitchen Access');
    if (propertyType === PropertyType.SHORT_STAY && category.section === MediaSection.LIVING_ROOM) return ['Entire Apartment', 'Serviced Apartment'].includes(String(listingDetails.shortLetType ?? ''));
    return true;
  });
  const minimumImagesPerCategory = 1;
  const minimumOverallImages = MEDIA_OVERALL_MINIMUM[propertyType] ?? 0;

  useEffect(() => {
    setListingDetails({});
    setMediaUploads({});
    setMediaErrors({});
  }, [propertyType]);
  const allMediaUploads = Object.values(mediaUploads).flat();
  const hasPendingMediaUploads = allMediaUploads.some((item) => item.status === 'uploading');
  const hasFailedMediaUploads = allMediaUploads.some((item) => item.status === 'failed');

  useEffect(() => {
    locationsApi.activeStates()
      .then((res) => setActiveStates(res.data))
      .catch(() => setActiveStates([]));
  }, []);

  useEffect(() => {
    setMasterLocations([]);
    setMasterAreas([]);
    setMasterStreets([]);
    setValue('city', '');
    setValue('area', '');
    setValue('streetId', '');
    setStreetQuery('');
    setDebouncedStreetQuery('');
    if (!selectedState) return;
    communityApi.streetLocations({ state: selectedState })
      .then((response) => setMasterLocations(response.data.locations))
      .catch(() => setMasterLocations([]));
  }, [selectedState, setValue]);

  useEffect(() => {
    setMasterAreas([]);
    setMasterStreets([]);
    setValue('area', '');
    setValue('streetId', '');
    setStreetQuery('');
    setDebouncedStreetQuery('');
    if (!selectedState || !selectedCity) return;
    communityApi.streetLocations({ state: selectedState, city: selectedCity })
      .then((response) => setMasterAreas(response.data.areaRecords))
      .catch(() => setMasterAreas([]));
    const locationId = masterLocations.find((item) => item.name === selectedCity)?.id;
    if (!locationId) return;
  }, [masterLocations, selectedCity, selectedState, setValue]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedStreetQuery(streetQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [streetQuery]);

  useEffect(() => {
    if (!selectedState || !selectedCity || streetNotListed || debouncedStreetQuery.length < 2) {
      setMasterStreets([]);
      return;
    }
    const locationId = masterLocations.find((item) => item.name === selectedCity)?.id;
    if (!locationId) return;
    let active = true;
    setIsSearchingStreets(true);
    communityApi.searchStreets({ state: selectedState, city: selectedCity, locationId, q: debouncedStreetQuery })
      .then((response) => { if (active) setMasterStreets(response.data); })
      .catch(() => { if (active) setMasterStreets([]); })
      .finally(() => { if (active) setIsSearchingStreets(false); });
    return () => { active = false; };
  }, [debouncedStreetQuery, masterLocations, selectedCity, selectedState, streetNotListed]);

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
      const label = mediaCategories.find((category) => category.section === section)?.label ?? 'This category';
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
        rejected.push(createMediaItem(file, 'failed', 'Max original image size is 25MB'));
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
      let streetId = data.streetId;
      if (streetNotListed) {
        const streetName = missingStreetName.trim();
        const location = masterLocations.find((item) => item.name === data.city);
        const area = masterAreas.find((item) => item.name === data.area);
        if (!streetName || !location || !area) {
          toastError('Select an area and enter the street name.');
          return;
        }
        const response = await communityApi.createStreet({
          state: data.state,
          city: data.city,
          area: data.area,
          streetName,
          locationId: location.id,
          areaId: area.id,
          landmark: missingStreetLandmark.trim() || undefined,
        });
        streetId = response.data.id;
      }
      if (!streetId) {
        toastError('Select a street or choose “I can’t see my street”.');
        return;
      }
      const missingSections = mediaCategories.filter(({ section, minimum }) => (
        (mediaUploads[section] ?? []).filter((item) => item.status === 'uploaded').length < minimum
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
        const nextErrors = mediaCategories.reduce<Record<string, string>>((acc, { section, label }) => {
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
          acc[section] = `${label} needs at least ${minimumImagesPerCategory} image${minimumImagesPerCategory === 1 ? '' : 's'}.`;
          return acc;
        }, {});
        setMediaErrors((prev) => ({ ...prev, ...nextErrors }));
        toastError(`Add at least ${minimumImagesPerCategory} image${minimumImagesPerCategory === 1 ? '' : 's'} to every applicable category.`);
        return;
      }
      const uploadedMediaCount = allMediaUploads.filter((item) => item.status === 'uploaded').length;
      if (uploadedMediaCount < minimumOverallImages) {
        toastError(`Add at least ${minimumOverallImages} property-media images for this property type.`);
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
        bedrooms: showBedrooms ? data.bedrooms : undefined,
        bathrooms: showBathrooms ? data.bathrooms : undefined,
        toilets: showVisitorToilet ? data.toilets : undefined,
        floorLevel: showFloorLevel ? data.floorLevel : undefined,
        furnishingStatus: isStandard ? data.furnishingStatus : undefined,
        electricitySituation: isShortStay ? undefined : data.electricitySituation,
        waterAvailability: isShortStay ? undefined : data.waterAvailability,
        waterSource: isShortStay ? undefined : data.waterSource,
        compoundCulture: isShortStay ? undefined : data.compoundCulture,
        streetId,
        electricityInfo: isShortStay ? undefined : electricityInfo,
        bestNetwork,
        securityFeatures,
        knownIssues,
        listingDetails,
        rentAmount: isShortStay
          ? Math.max(Number(listingDetails.dailyRate ?? 0), Number(listingDetails.weeklyRate ?? 0))
          : data.rentAmount,
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
        <div className={isShortStay ? 'hidden' : 'card p-6 space-y-4'}>
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
                  accept={ACCEPTED_IMAGE_INPUT}
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

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Property Type *</label>
              <select {...register('propertyType')} className="input">
                {PROPERTY_TYPE_OPTIONS.map((t) => (
                  <option key={t.value} value={t.value}>{t.label}</option>
                ))}
              </select>
              {errors.propertyType && <p className="error">{errors.propertyType.message}</p>}
            </div>

            {showBedrooms && (
              <div>
                <label className="label">Bedrooms *</label>
                <input {...register('bedrooms')} type="number" min={isShortStay ? 0 : 1} className="input" required />
              </div>
            )}

            {showBathrooms && <div>
              <label className="label">Bathrooms *</label>
              <input {...register('bathrooms')} type="number" min={1} className="input" required />
            </div>}
            {showVisitorToilet && (
              <div>
                <label className="label">Separate / Visitor Toilet</label>
                <input {...register('toilets')} type="number" min={0} className="input" />
              </div>
            )}
          </div>

          {isStandard && (
            <div className="grid grid-cols-2 gap-4">
              {showFloorLevel && <div>
                <label className="label">Floor Level</label>
                <select {...register('floorLevel')} className="input"><option value="">Select…</option><option>Ground Floor</option><option>First Floor</option><option>Second Floor</option><option>Third Floor</option><option>Fourth Floor+</option><option>Other</option></select>
              </div>}
              <div>
                <label className="label">Furnishing Status *</label>
                <select {...register('furnishingStatus')} className="input" required>
                  <option value="">Select…</option>
                  <option value="furnished">Furnished</option>
                  <option value="partially_furnished">Partially Furnished</option>
                  <option value="unfurnished">Unfurnished</option>
                </select>
              </div>
            </div>
          )}
        </div>

        <div className="card p-6 space-y-5">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900">{PROPERTY_TYPE_OPTIONS.find((item) => item.value === propertyType)?.label} Intelligence</h2>
            <p className="mt-1 text-sm text-slate-500">Complete only the structured details that apply to this property type.</p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {typeFields.filter((field) => {
              if (!field.showWhen) return true;
              const current = listingDetails[field.showWhen.key];
              if (field.key === 'otherMandatoryFeeDescription') return Number(current) > 0;
              return field.showWhen.values.includes(current as never);
            }).map((field) => (
              <div key={field.key}>
                <label className="label">{field.label}{field.required ? ' *' : ''}</label>
                {field.type === 'multi' ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {(field.options ?? []).map((option) => {
                      const values = Array.isArray(listingDetails[field.key]) ? listingDetails[field.key] as string[] : [];
                      return <Chip key={option} label={option} active={values.includes(option)} onClick={() => setListingDetails((current) => ({ ...current, [field.key]: values.includes(option) ? values.filter((item) => item !== option) : [...values, option] }))} />;
                    })}
                  </div>
                ) : field.type === 'checkbox' ? (
                  <label className="flex items-center gap-3 rounded-md border border-slate-200 px-4 py-3 text-sm font-medium text-navy-700">
                    <input type="checkbox" checked={Boolean(listingDetails[field.key])} onChange={(event) => setListingDetails((current) => ({ ...current, [field.key]: event.target.checked }))} /> Yes
                  </label>
                ) : field.options && field.options.length > 0 ? (
                  <select
                    className="input"
                    required={field.required}
                    value={String(listingDetails[field.key] ?? '')}
                    onChange={(event) => setListingDetails((current) => ({ ...current, [field.key]: event.target.value }))}
                  >
                    <option value="">Select…</option>
                    {field.options.map((option) => <option key={option} value={option}>{option}</option>)}
                  </select>
                ) : field.type === 'textarea' ? (
                  <textarea className="input resize-none" rows={3} maxLength={field.maxLength} required={field.required} value={String(listingDetails[field.key] ?? '')} onChange={(event) => setListingDetails((current) => ({ ...current, [field.key]: event.target.value }))} />
                ) : (
                  <input
                    className="input"
                    type={field.type === 'time' ? 'time' : field.type ?? 'text'}
                    min={field.type === 'number' ? 0 : undefined}
                    required={field.required}
                    value={String(listingDetails[field.key] ?? '')}
                    onChange={(event) => setListingDetails((current) => ({ ...current, [field.key]: field.type === 'number' ? Number(event.target.value) : event.target.value }))}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* ── Pricing ── */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900">
            {isShortStay ? 'Short Stay Pricing & Fees' : isHostel ? 'Hostel Pricing & Fees' : 'Pricing & Fees (₦)'}
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {!isShortStay && <div>
              <label className="label">{isHostel ? 'Rent Amount *' : propertyType === PropertyType.SHARED_APARTMENT ? 'Annual Rent for Available Room *' : 'Annual Rent *'}</label>
              <input {...register('rentAmount')} type="number" min={1} className="input" placeholder="e.g. 150000" required />
              {errors.rentAmount && <p className="error">{errors.rentAmount.message}</p>}
            </div>}
            {!isShortStay && <div>
              <label className="label">Agency Fee</label>
              <input {...register('agencyFee')} type="number" min={0} className="input" placeholder="0" />
            </div>}
            {!isShortStay && <div>
              <label className="label">Service Charge</label>
              <input {...register('serviceCharge')} type="number" min={0} className="input" placeholder="0" />
            </div>}
            {!isShortStay && !isHostel && <div>
              <label className="label">Legal Fee</label>
              <input {...register('legalFee')} type="number" min={0} className="input" placeholder="0" />
            </div>}
            {!isShortStay && <div>
              <label className="label">Caution Fee</label>
              <input {...register('cautionFee')} type="number" min={0} className="input" placeholder="0" />
            </div>}
            {!isShortStay && <div>
              <label className="label">Inspection Fee</label>
              <input {...register('inspectionFee')} type="number" min={0} className="input" placeholder="0" />
            </div>}
          </div>
        </div>

        {/* ── Directory location and private address ── */}
        <div className="card p-6 space-y-4">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900">Location Directory</h2>
            <p className="mt-1 text-xs text-veriq-muted">
              Select the approved location and street that link this property to Street Intelligence.
            </p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setStreetNotListed(false); setMissingStreetName(''); setMissingStreetLandmark(''); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${!streetNotListed ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>Select street</button>
            <button type="button" onClick={() => { setStreetNotListed(true); setValue('streetId', ''); setValue('area', ''); setStreetQuery(''); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetNotListed ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>I can&apos;t see my street</button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
              <label className="label">Local Government *</label>
              <select {...register('city')} className="input" disabled={!selectedState}>
                <option value="">Select local government...</option>
                {masterLocations.map((location) => <option key={location.id} value={location.name}>{location.name}</option>)}
              </select>
              {errors.city && <p className="error">{errors.city.message}</p>}
            </div>
          </div>
          {!streetNotListed ? (
            <div className="relative">
              <label className="label">Search street, estate or road *</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input aria-label="Street name" value={streetQuery} onChange={(event) => { setStreetQuery(event.target.value); setValue('streetId', ''); setValue('area', ''); }} className="input pl-9" placeholder="Start typing a street name" autoComplete="off" disabled={!selectedCity} />
              </div>
              {selectedCity && streetQuery.trim().length >= 2 && !watch('streetId') && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {masterStreets.map((street) => <button key={street.id} type="button" onClick={() => { setValue('streetId', street.id, { shouldValidate: true }); setValue('area', street.area, { shouldValidate: true }); setStreetQuery(street.streetName); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50"><span className="block text-sm font-bold text-navy-900">{street.streetName}</span><span className="block text-xs text-veriq-muted">{street.area}</span></button>)}
                  {!isSearchingStreets && masterStreets.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No approved street matches this name.</p>}
                </div>
              )}
              {watch('streetId') && <p className="mt-1 text-xs font-semibold text-emerald-700">Approved street selected.</p>}
              <button type="button" onClick={() => { setStreetNotListed(true); setMissingStreetName(streetQuery); setStreetQuery(''); setValue('streetId', ''); setValue('area', ''); }} disabled={!selectedCity} className="mt-2 text-left text-xs font-bold text-veriq-secondary hover:underline disabled:opacity-50">I can&apos;t see my street in this list</button>
            </div>
          ) : (
            <div>
              <label className="label">Area / Neighbourhood *</label>
              <select {...register('area')} className="input">
                <option value="">Select area...</option>
                {masterAreas.map((area) => <option key={area.id} value={area.name}>{area.name}</option>)}
              </select>
              {errors.area && <p className="error">{errors.area.message}</p>}
              <label className="label mt-4">Street Name *</label>
              <input value={missingStreetName} onChange={(event) => setMissingStreetName(event.target.value)} className="input" placeholder="Enter the street name" />
              <label className="label mt-4">Nearby Landmark <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={missingStreetLandmark} onChange={(event) => setMissingStreetLandmark(event.target.value)} className="input" placeholder="e.g. Opposite the health centre" />
              <p className="mt-1 text-xs text-veriq-muted">The street will be sent for admin review. You can continue listing the property now.</p>
            </div>
          )}
          <div>
            <label className="label">Full Property Address <span className="text-slate-400">(optional - private until unlocked)</span></label>
            <input {...register('address')} className="input" placeholder="House number, building or estate, and street" />
            <p className="mt-1 text-xs text-veriq-muted">This is the address users see after they unlock the property.</p>
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
              Upload {minimumImagesPerCategory}–{MAX_IMAGES} photos per applicable category{minimumOverallImages ? ` and at least ${minimumOverallImages} overall` : ''}. JPG, PNG, WebP, HEIC or HEIF · Max 25MB each. Photos are optimized automatically.
              Clear, well-lit, recent photos only.
            </p>
          </div>

          <div className="space-y-5">
            {mediaCategories.map(({ section, label, hint, minimum }) => {
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
                        uploadedCount < minimum ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                      }`}>
                        {uploadedCount}/{MAX_IMAGES} uploaded
                      </span>
                      <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                        {minimum > 0 ? `min ${minimum}` : 'optional'}
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
                      accept={ACCEPTED_IMAGE_INPUT}
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
              Help users understand what to expect from the property and its surroundings. Answer as accurately as possible.
            </p>
          </div>

          {/* ── Flood Risk ── */}
          <div>
            <label className="label">Flood Risk *</label>
            <select {...register('floodRisk')} className="input" required>
              <option value="">Select…</option>
              <option value={FloodRisk.NO_KNOWN_FLOODING}>No Known Flooding</option>
              <option value={FloodRisk.MINOR_OCCASIONALLY}>Minor Flooding Occasionally</option>
              <option value={FloodRisk.FLOODS_HEAVY_RAIN}>Flooding During Heavy Rain</option>
            </select>
          </div>

          {/* ── Electricity (residential only) ── */}
          {!isShortStay && <div className="space-y-3">
            <div>
              <label className="label">Electricity Situation *</label>
              <select {...register('electricitySituation')} className="input" required>
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
          </div>}

          {/* ── Water (residential only) ── */}
          {!isShortStay && <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Water Availability *</label>
              <select {...register('waterAvailability')} className="input" required>
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
          </div>}

          {/* ── Road Access ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Road Access *</label>
              <select {...register('roadAccess')} className="input" required>
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
              <label className="label">{isShortStay ? 'Mobile Network Quality' : 'Network Quality'} *</label>
              <select {...register('networkQuality')} className="input" required>
                <option value="">Select…</option>
                <option value={NetworkQuality.EXCELLENT}>Excellent</option>
                <option value={NetworkQuality.GOOD}>Good</option>
                <option value={NetworkQuality.FAIR}>Fair</option>
                <option value={NetworkQuality.POOR}>Poor</option>
              </select>
            </div>
            <div>
              <label className="label text-xs font-medium text-slate-500">{isShortStay ? 'Best Mobile Network' : 'Best Network'}</label>
              <select className="input" value={bestNetwork[0] ?? ''} onChange={(event) => setBestNetwork(event.target.value ? [event.target.value] : [])}>
                <option value="">Select…</option>
                {BEST_NETWORK_OPTIONS.map((opt) => <option key={opt.key} value={opt.key}>{opt.label}</option>)}
              </select>
            </div>
          </div>

          {/* ── Noise ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">{isShortStay ? 'External Noise Level' : 'Noise Level'} *</label>
              <select {...register('noiseLevel')} className="input" required>
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
              <label className="label">{isShortStay ? 'Security Feel of Area' : 'Security Feel'} *</label>
              <select {...register('securityFeel')} className="input" required>
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
              <select {...register('propertyCondition')} className="input" required>
                <option value="">Select…</option>
                <option value={PropertyCondition.EXCELLENT}>Excellent</option>
                <option value={PropertyCondition.GOOD}>Good</option>
                <option value={PropertyCondition.FAIR}>Fair</option>
                <option value={PropertyCondition.POOR}>Poor</option>
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
                    onClick={() => setKnownIssues((current) => opt.key === 'none_observed'
                      ? (current.includes(opt.key) ? [] : ['none_observed'])
                      : (current.includes(opt.key) ? current.filter((item) => item !== opt.key) : [...current.filter((item) => item !== 'none_observed'), opt.key]))}
                  />
                ))}
              </div>
            </div>
          </div>

          {/* ── Compound Culture (residential only) ── */}
          {!isShortStay && <div>
            <label className="label">Compound Culture *</label>
            <select {...register('compoundCulture')} className="input" required>
              <option value="">Select…</option>
              <option value={CompoundCulture.FAMILY_FRIENDLY}>Family Friendly</option>
              <option value={CompoundCulture.MOSTLY_FAMILIES}>Mostly Families</option>
              <option value={CompoundCulture.MOSTLY_SINGLES}>Mostly Singles</option>
              <option value={CompoundCulture.MIXED_OCCUPANTS}>Mixed Occupants</option>
              <option value={CompoundCulture.QUIET_COMPOUND}>Quiet Compound</option>
              <option value={CompoundCulture.SOCIAL_COMPOUND}>Social Compound</option>
            </select>
          </div>}

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
