'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Home, Upload, X, Zap } from 'lucide-react';
import { ApiError, locationsApi, mediaApi, propertiesApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import type { AllowedState, CreatePropertyDto, MediaItem, Property } from '@/types';
import {
  CompoundCulture,
  ElectricitySituation,
  FloodRisk,
  HostelCampusProximity,
  HostelGender,
  HostelSuitableFor,
  MediaSection,
  NetworkQuality,
  NoiseLevel,
  NoiseSource,
  PropertyCondition,
  PropertyType,
  RoadAccess,
  RoadAccessRain,
  SecurityFeel,
  ShortStayAC,
  ShortStayCleanliness,
  ShortStayFurnishing,
  ShortStayInternet,
  ShortStayKitchen,
  ShortStayPricingModel,
  WaterAvailability,
  WaterSource,
} from '@/types';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

type EditForm = Partial<CreatePropertyDto>;

const moneyFields: Array<{ key: keyof CreatePropertyDto; label: string }> = [
  { key: 'rentAmount', label: 'Rent Amount' },
  { key: 'serviceCharge', label: 'Service Charge' },
  { key: 'agencyFee', label: 'Agency Fee' },
  { key: 'legalFee', label: 'Legal Fee' },
  { key: 'cautionFee', label: 'Caution Fee' },
  { key: 'inspectionFee', label: 'Inspection Fee' },
];

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

const normalizeAssetUrl = (url: string) => {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:')) return url;
  return `${API_BASE}${url.startsWith('/') ? url : `/${url}`}`;
};

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

const MEDIA_CATEGORIES: { section: MediaSection; label: string; hint: string }[] = [
  { section: MediaSection.ROAD_ACCESS, label: 'Road Access', hint: 'Photos of the road leading to the property' },
  { section: MediaSection.ENVIRONMENT, label: 'Surroundings', hint: 'Neighbourhood, nearby landmarks' },
  { section: MediaSection.LIVING_ROOM, label: 'Living Room', hint: 'Main sitting area' },
  { section: MediaSection.KITCHEN, label: 'Kitchen', hint: 'Kitchen / cooking area' },
  { section: MediaSection.BEDROOM, label: 'Bedroom', hint: 'Bedroom(s)' },
  { section: MediaSection.BATHROOM, label: 'Bathroom', hint: 'Bathroom / toilet' },
  { section: MediaSection.COMPOUND, label: 'Compound', hint: 'Compound / exterior' },
];

const MIN_IMAGES = 2;
const MAX_IMAGES = 5;
const REQUIRED_MEDIA_SECTIONS = MEDIA_CATEGORIES.map((category) => category.section);

const chipOptions = {
  hostelSuitableFor: [
    [HostelSuitableFor.STUDENTS, 'Students'],
    [HostelSuitableFor.CORP_MEMBERS, 'Corp Members'],
    [HostelSuitableFor.WORKING_CLASS, 'Working Class'],
    [HostelSuitableFor.TEMPORARY_STAY, 'Temporary Stay'],
    [HostelSuitableFor.MIXED, 'Mixed / Any'],
  ] as Array<[HostelSuitableFor, string]>,
  shortStayAmenities: ['wifi', 'ac', 'generator', 'kitchen', 'hot_water', 'parking', 'security', 'laundry', 'tv', 'pool'],
  electricityInfo: ['public_power_mostly', 'frequent_outages', 'generator_common', 'solar_backup'],
  bestNetwork: ['mtn', 'airtel', 'glo', '9mobile'],
  securityFeatures: ['gated_compound', 'security_personnel', 'estate_environment', 'busy_area', 'isolated_area'],
  knownIssues: ['damp_wall', 'plumbing_issue', 'ceiling_damage', 'cracks', 'poor_finishing', 'none_observed'],
};

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<EditForm>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);
  const [activeStates, setActiveStates] = useState<AllowedState[]>([]);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  useEffect(() => {
    let mounted = true;
    propertiesApi.getById(id)
      .then((res) => {
        if (!mounted) return;
        const p = res.data;
        setProperty(p);
        setForm({
          title: p.title,
          description: p.description ?? '',
          propertyType: p.propertyType,
          state: p.state,
          city: p.city,
          area: p.area,
          address: p.address ?? '',
          latitude: p.latitude ?? undefined,
          longitude: p.longitude ?? undefined,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          floorLevel: p.floorLevel ?? '',
          isFurnished: p.isFurnished,
          rentAmount: Number(p.rentAmount),
          serviceCharge: Number(p.serviceCharge ?? 0),
          agencyFee: Number(p.agencyFee ?? 0),
          legalFee: Number(p.legalFee ?? 0),
          cautionFee: Number(p.cautionFee ?? 0),
          inspectionFee: Number(p.inspectionFee ?? 0),
          coverImageUrl: p.coverImageUrl ?? '',
          hostelSuitableFor: p.hostelSuitableFor ?? [],
          hostelPersonsPerRoom: p.hostelPersonsPerRoom ?? undefined,
          hostelGender: p.hostelGender ?? undefined,
          hostelCampusProximity: p.hostelCampusProximity ?? undefined,
          hostelNearestCampus: p.hostelNearestCampus ?? '',
          hostelDistanceFromCampus: p.hostelDistanceFromCampus ?? '',
          hostelMealsIncluded: p.hostelMealsIncluded,
          hostelRulesNotes: p.hostelRulesNotes ?? '',
          shortStayPricingModel: p.shortStayPricingModel ?? undefined,
          shortStayDailyRate: p.shortStayDailyRate ?? undefined,
          shortStayWeeklyRate: p.shortStayWeeklyRate ?? undefined,
          shortStayMinNights: p.shortStayMinNights ?? undefined,
          shortStayMaxNights: p.shortStayMaxNights ?? undefined,
          shortStayCheckInTime: p.shortStayCheckInTime ?? '',
          shortStayCheckOutTime: p.shortStayCheckOutTime ?? '',
          shortStayAmenities: p.shortStayAmenities ?? [],
          shortStayHouseRules: p.shortStayHouseRules ?? '',
          floodRisk: p.floodRisk ?? undefined,
          electricitySituation: p.electricitySituation ?? undefined,
          electricityInfo: p.electricityInfo ?? [],
          waterAvailability: p.waterAvailability ?? undefined,
          waterSource: p.waterSource ?? undefined,
          roadAccess: p.roadAccess ?? undefined,
          roadAccessRain: p.roadAccessRain ?? undefined,
          networkQuality: p.networkQuality ?? undefined,
          bestNetwork: p.bestNetwork ?? [],
          noiseLevel: p.noiseLevel ?? undefined,
          noiseSource: p.noiseSource ?? undefined,
          securityFeel: p.securityFeel ?? undefined,
          securityFeatures: p.securityFeatures ?? [],
          propertyCondition: p.propertyCondition ?? undefined,
          knownIssues: p.knownIssues ?? [],
          compoundCulture: p.compoundCulture ?? undefined,
          agentObservation: p.agentObservation ?? '',
          shortStayAC: p.shortStayAC ?? undefined,
          shortStayInternet: p.shortStayInternet ?? undefined,
          shortStayCleanliness: p.shortStayCleanliness ?? undefined,
          shortStayFurnishing: p.shortStayFurnishing ?? undefined,
          shortStayKitchen: p.shortStayKitchen ?? undefined,
          shortStayAgentNote: p.shortStayAgentNote ?? '',
        });
      })
      .catch((err) => {
        toastError(err instanceof ApiError ? err.message : 'Failed to load listing');
      })
      .finally(() => {
        if (mounted) setIsLoading(false);
      });
    return () => { mounted = false; };
  }, [id, toastError]);

  useEffect(() => {
    locationsApi.activeStates()
      .then((res) => setActiveStates(res.data))
      .catch(() => setActiveStates([]));
  }, []);

  useEffect(() => {
    if (!id) return;
    setIsMediaLoading(true);
    mediaApi.getAll(id)
      .then((res) => setMedia(res.data ?? []))
      .catch(() => setMedia([]))
      .finally(() => setIsMediaLoading(false));
  }, [id]);

  const update = (key: keyof CreatePropertyDto, value: unknown) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const toggleArray = <T,>(key: keyof CreatePropertyDto, value: T) => {
    setForm((prev) => {
      const current = Array.isArray(prev[key]) ? prev[key] as T[] : [];
      return {
        ...prev,
        [key]: current.includes(value) ? current.filter((item) => item !== value) : [...current, value],
      };
    });
  };

  const uploadMedia = async (section: string, files?: FileList | null) => {
    if (!files?.length) return;
    const existingCount = media.filter((item) => item.section === section).length;
    const selectedFiles = Array.from(files).slice(0, Math.max(0, MAX_IMAGES - existingCount));
    if (selectedFiles.length === 0) {
      setMediaErrors((prev) => ({ ...prev, [section]: `Max ${MAX_IMAGES} images per category.` }));
      return;
    }
    setUploadingSection(section);
    try {
      const uploaded = await Promise.all(selectedFiles.map((file) => mediaApi.upload(id, section, file)));
      setMedia((prev) => [...prev, ...uploaded.map((res) => res.data as MediaItem)]);
      setMediaErrors((prev) => {
        const next = { ...prev };
        delete next[section];
        return next;
      });
      success(selectedFiles.length === 1 ? 'Image uploaded' : 'Images uploaded');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to upload image');
    } finally {
      setUploadingSection(null);
      const input = fileInputRefs.current[section];
      if (input) input.value = '';
    }
  };

  const deleteMedia = async (item: MediaItem) => {
    const sectionItems = media.filter((m) => m.section === item.section);
    if (REQUIRED_MEDIA_SECTIONS.includes(item.section as MediaSection) && sectionItems.length <= MIN_IMAGES) {
      setMediaErrors((prev) => ({
        ...prev,
        [item.section]: `Add a replacement first. ${MEDIA_CATEGORIES.find((category) => category.section === item.section)?.label ?? 'This category'} must keep at least ${MIN_IMAGES} images.`,
      }));
      toastError(`Add a replacement first. Each category needs at least ${MIN_IMAGES} images.`);
      return;
    }
    try {
      await mediaApi.delete(id, item.id);
      setMedia((prev) => prev.filter((m) => m.id !== item.id));
      success('Image removed');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to remove image');
    }
  };

  const uploadCover = async (file?: File) => {
    if (!file) return;
    setIsCoverUploading(true);
    try {
      const uploaded = await uploadToFileService(file);
      update('coverImageUrl', uploaded.url);
      success('Cover image uploaded');
    } catch {
      toastError('Failed to upload cover image');
    } finally {
      setIsCoverUploading(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.coverImageUrl) {
      toastError('Please upload a cover image before saving changes.');
      return;
    }
    const missingSections = MEDIA_CATEGORIES.filter(({ section }) => media.filter((item) => item.section === section).length < MIN_IMAGES);
    if (missingSections.length > 0) {
      setMediaErrors((prev) => ({
        ...prev,
        ...missingSections.reduce<Record<string, string>>((acc, { section, label }) => {
          acc[section] = `${label} needs at least ${MIN_IMAGES} images.`;
          return acc;
        }, {}),
      }));
      toastError(`Add at least ${MIN_IMAGES} images to every property media category before saving.`);
      return;
    }
    setIsSaving(true);
    try {
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== ''),
      ) as Partial<CreatePropertyDto>;
      await propertiesApi.update(id, payload);
      success('Listing updated successfully');
      router.push('/dashboard/properties');
    } catch (err) {
      toastError(err instanceof ApiError ? err.message : 'Failed to update listing');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <PageLoader />;

  if (!property) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-center">
        <h1 className="font-display text-2xl font-bold text-navy-900 mb-2">Listing Not Found</h1>
        <p className="text-veriq-muted mb-6">This listing may have been removed or is unavailable.</p>
        <Link href="/dashboard/properties" className="btn-primary">Back to Listings</Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6">
        <Link href="/dashboard/properties" className="mb-4 inline-flex items-center gap-2 text-sm text-veriq-muted transition-colors hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Listings
        </Link>
        <h1 className="font-display text-2xl font-bold text-navy-900">Edit Listing</h1>
        <p className="text-sm text-veriq-muted">{property.title}</p>
      </div>

      <form onSubmit={save} className="space-y-6">
        <div className="card space-y-4 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Home className="h-4 w-4 text-veriq-secondary" /> Basic Information
          </h2>

          <div>
            <label className="label">Property Title *</label>
            <input value={form.title ?? ''} onChange={(e) => update('title', e.target.value)} className="input" required />
          </div>

          <div>
            <label className="label">Description</label>
            <textarea value={form.description ?? ''} onChange={(e) => update('description', e.target.value)} rows={3} className="input resize-none" />
          </div>

          <div>
            <label className="label">Cover Image</label>
            <div className="flex flex-wrap items-center gap-3">
              <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-navy-700 hover:border-veriq-secondary">
                {isCoverUploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />}
                {isCoverUploading ? 'Uploading...' : form.coverImageUrl ? 'Replace cover' : 'Upload cover'}
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  disabled={isCoverUploading}
                  onChange={(e) => {
                    uploadCover(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              {form.coverImageUrl && (
                <a href={normalizeAssetUrl(String(form.coverImageUrl))} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
                  View current cover
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Property Type *</label>
              <select value={form.propertyType ?? ''} onChange={(e) => update('propertyType', e.target.value)} className="input" required>
                {PROPERTY_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">Bedrooms</label>
              <input type="number" min={0} value={Number(form.bedrooms ?? 0)} onChange={(e) => update('bedrooms', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input type="number" min={0} value={Number(form.bathrooms ?? 0)} onChange={(e) => update('bathrooms', Number(e.target.value))} className="input" />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <input
              type="checkbox"
              checked={!!form.isFurnished}
              onChange={(e) => update('isFurnished', e.target.checked)}
              id="isFurnished"
              className="h-4 w-4"
            />
            <label htmlFor="isFurnished" className="text-sm font-medium text-navy-700">Furnished</label>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-navy-900">Location</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">State *</label>
              <select value={form.state ?? ''} onChange={(e) => update('state', e.target.value)} className="input" required>
                <option value="">Select state...</option>
                {form.state && !activeStates.some((state) => state.name === form.state) && (
                  <option value={form.state}>{form.state} (currently inactive)</option>
                )}
                {activeStates.map((state) => (
                  <option key={state.id} value={state.name}>{state.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">City *</label>
              <input value={form.city ?? ''} onChange={(e) => update('city', e.target.value)} className="input" required />
            </div>
            <div>
              <label className="label">Area *</label>
              <input value={form.area ?? ''} onChange={(e) => update('area', e.target.value)} className="input" required />
            </div>
          </div>
          <div>
            <label className="label">Address</label>
            <input value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} className="input" />
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-navy-900">Details & Pricing</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Floor Level</label>
              <input value={form.floorLevel ?? ''} onChange={(e) => update('floorLevel', e.target.value)} className="input" />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {moneyFields.map(({ key, label }) => (
              <div key={String(key)}>
                <label className="label">{label}</label>
                <input
                  type="number"
                  min={0}
                  value={Number(form[key] ?? 0)}
                  onChange={(e) => update(key, Number(e.target.value))}
                  className="input"
                />
              </div>
            ))}
          </div>
        </div>

        {form.propertyType === PropertyType.HOSTEL && (
          <div className="card space-y-4 border-2 border-veriq-secondary/20 p-6">
            <h2 className="font-display text-base font-bold text-navy-900">Hostel Details</h2>
            <div>
              <label className="label">Suitable For</label>
              <div className="flex flex-wrap gap-2">
                {chipOptions.hostelSuitableFor.map(([value, label]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => toggleArray('hostelSuitableFor', value)}
                    className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${form.hostelSuitableFor?.includes(value) ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200 bg-white text-navy-700'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Gender</label>
                <select value={form.hostelGender ?? ''} onChange={(e) => update('hostelGender', e.target.value || undefined)} className="input">
                  <option value="">Select...</option>
                  <option value={HostelGender.MALE}>Male Only</option>
                  <option value={HostelGender.FEMALE}>Female Only</option>
                  <option value={HostelGender.MIXED}>Mixed</option>
                </select>
              </div>
              <div>
                <label className="label">Campus Location</label>
                <select value={form.hostelCampusProximity ?? ''} onChange={(e) => update('hostelCampusProximity', e.target.value || undefined)} className="input">
                  <option value="">Select...</option>
                  <option value={HostelCampusProximity.ON_CAMPUS}>On Campus</option>
                  <option value={HostelCampusProximity.OFF_CAMPUS}>Off Campus</option>
                </select>
              </div>
              <div>
                <label className="label">Persons Per Room</label>
                <input type="number" min={1} value={form.hostelPersonsPerRoom ?? ''} onChange={(e) => update('hostelPersonsPerRoom', e.target.value ? Number(e.target.value) : undefined)} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <label className="label">Nearest Institution</label>
                <input value={form.hostelNearestCampus ?? ''} onChange={(e) => update('hostelNearestCampus', e.target.value)} className="input" />
              </div>
              <div>
                <label className="label">Distance from Campus</label>
                <input value={form.hostelDistanceFromCampus ?? ''} onChange={(e) => update('hostelDistanceFromCampus', e.target.value)} className="input" />
              </div>
            </div>
            <label className="flex items-center gap-3 text-sm font-medium text-navy-700">
              <input type="checkbox" checked={!!form.hostelMealsIncluded} onChange={(e) => update('hostelMealsIncluded', e.target.checked)} className="h-4 w-4" />
              Meals included in rent
            </label>
            <div>
              <label className="label">House Rules / Notes</label>
              <textarea value={form.hostelRulesNotes ?? ''} onChange={(e) => update('hostelRulesNotes', e.target.value)} rows={3} className="input resize-none" />
            </div>
          </div>
        )}

        {form.propertyType === PropertyType.SHORT_STAY && (
          <div className="card space-y-4 border-2 border-veriq-secondary/20 p-6">
            <h2 className="font-display text-base font-bold text-navy-900">Short Stay Details</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <div>
                <label className="label">Pricing Model</label>
                <select value={form.shortStayPricingModel ?? ''} onChange={(e) => update('shortStayPricingModel', e.target.value || undefined)} className="input">
                  <option value="">Select...</option>
                  <option value={ShortStayPricingModel.DAILY}>Daily</option>
                  <option value={ShortStayPricingModel.WEEKLY}>Weekly</option>
                  <option value={ShortStayPricingModel.BOTH}>Daily & Weekly</option>
                </select>
              </div>
              <div>
                <label className="label">Daily Rate</label>
                <input type="number" min={0} value={form.shortStayDailyRate ?? ''} onChange={(e) => update('shortStayDailyRate', e.target.value ? Number(e.target.value) : undefined)} className="input" />
              </div>
              <div>
                <label className="label">Weekly Rate</label>
                <input type="number" min={0} value={form.shortStayWeeklyRate ?? ''} onChange={(e) => update('shortStayWeeklyRate', e.target.value ? Number(e.target.value) : undefined)} className="input" />
              </div>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
              <input aria-label="Minimum nights" type="number" min={1} value={form.shortStayMinNights ?? ''} onChange={(e) => update('shortStayMinNights', e.target.value ? Number(e.target.value) : undefined)} className="input" placeholder="Min nights" />
              <input aria-label="Maximum nights" type="number" min={1} value={form.shortStayMaxNights ?? ''} onChange={(e) => update('shortStayMaxNights', e.target.value ? Number(e.target.value) : undefined)} className="input" placeholder="Max nights" />
              <input aria-label="Check-in time" value={form.shortStayCheckInTime ?? ''} onChange={(e) => update('shortStayCheckInTime', e.target.value)} className="input" placeholder="Check-in" />
              <input aria-label="Check-out time" value={form.shortStayCheckOutTime ?? ''} onChange={(e) => update('shortStayCheckOutTime', e.target.value)} className="input" placeholder="Check-out" />
            </div>
            <div>
              <label className="label">Amenities</label>
              <div className="flex flex-wrap gap-2">
                {chipOptions.shortStayAmenities.map((value) => (
                  <button key={value} type="button" onClick={() => toggleArray('shortStayAmenities', value)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize ${form.shortStayAmenities?.includes(value) ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200 bg-white text-navy-700'}`}>
                    {value.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
            <textarea aria-label="Short stay house rules" value={form.shortStayHouseRules ?? ''} onChange={(e) => update('shortStayHouseRules', e.target.value)} rows={3} className="input resize-none" placeholder="House rules" />
          </div>
        )}

        {form.propertyType === PropertyType.SHORT_STAY && (
          <div className="card space-y-4 border-2 border-veriq-secondary/20 p-6">
            <h2 className="font-display text-base font-bold text-navy-900">Short Stay Intelligence</h2>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {[
                ['shortStayAC', 'Air Conditioning', ShortStayAC],
                ['shortStayInternet', 'Internet', ShortStayInternet],
                ['shortStayCleanliness', 'Cleanliness', ShortStayCleanliness],
                ['shortStayFurnishing', 'Furnishing', ShortStayFurnishing],
                ['shortStayKitchen', 'Kitchen Access', ShortStayKitchen],
              ].map(([key, label, enumObj]) => (
                <div key={key as string}>
                  <label className="label">{label as string}</label>
                  <select value={String(form[key as keyof CreatePropertyDto] ?? '')} onChange={(e) => update(key as keyof CreatePropertyDto, e.target.value || undefined)} className="input">
                    <option value="">Select...</option>
                    {Object.values(enumObj as Record<string, string>).map((value) => (
                      <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
            <textarea aria-label="Short stay agent note" value={form.shortStayAgentNote ?? ''} onChange={(e) => update('shortStayAgentNote', e.target.value)} rows={2} className="input resize-none" placeholder="Agent note" />
          </div>
        )}

        <div className="card space-y-5 border-2 border-veriq-secondary/20 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Zap className="h-4 w-4 text-veriq-secondary" /> Veriq Quick Intelligence
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['floodRisk', 'Flood Risk', FloodRisk],
              ['electricitySituation', 'Electricity Situation', ElectricitySituation],
              ['waterAvailability', 'Water Availability', WaterAvailability],
              ['waterSource', 'Water Source', WaterSource],
              ['roadAccess', 'Road Access', RoadAccess],
              ['roadAccessRain', 'Road During Rain', RoadAccessRain],
              ['networkQuality', 'Network Quality', NetworkQuality],
              ['noiseLevel', 'Noise Level', NoiseLevel],
              ['noiseSource', 'Noise Source', NoiseSource],
              ['securityFeel', 'Security Feel', SecurityFeel],
              ['propertyCondition', 'Property Condition', PropertyCondition],
              ['compoundCulture', 'Compound Culture', CompoundCulture],
            ].map(([key, label, enumObj]) => (
              <div key={key as string}>
                <label className="label">{label as string}</label>
                <select value={String(form[key as keyof CreatePropertyDto] ?? '')} onChange={(e) => update(key as keyof CreatePropertyDto, e.target.value || undefined)} className="input">
                  <option value="">Select...</option>
                  {Object.values(enumObj as Record<string, string>).map((value) => (
                    <option key={value} value={value}>{value.replace(/_/g, ' ')}</option>
                  ))}
                </select>
              </div>
            ))}
          </div>

          {[
            ['electricityInfo', 'Electricity Info', chipOptions.electricityInfo],
            ['bestNetwork', 'Best Networks', chipOptions.bestNetwork],
            ['securityFeatures', 'Security Features', chipOptions.securityFeatures],
            ['knownIssues', 'Known Issues', chipOptions.knownIssues],
          ].map(([key, label, values]) => (
            <div key={key as string}>
              <label className="label">{label as string}</label>
              <div className="flex flex-wrap gap-2">
                {(values as string[]).map((value) => (
                  <button key={value} type="button" onClick={() => toggleArray(key as keyof CreatePropertyDto, value)} className={`rounded-full border px-4 py-1.5 text-xs font-semibold capitalize ${(form[key as keyof CreatePropertyDto] as string[] | undefined)?.includes(value) ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200 bg-white text-navy-700'}`}>
                    {value.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
            </div>
          ))}

          <div>
            <label className="label">Agent Observation</label>
            <textarea value={form.agentObservation ?? ''} onChange={(e) => update('agentObservation', e.target.value)} rows={2} className="input resize-none" />
          </div>
        </div>

        <div className="card space-y-5 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Camera className="h-4 w-4 text-veriq-secondary" /> Property Images
          </h2>
          {isMediaLoading ? (
            <div className="flex justify-center py-8"><LoadingSpinner size="md" /></div>
          ) : (
            <div className="space-y-5">
              {MEDIA_CATEGORIES.map(({ section, label, hint }) => {
                const items = media.filter((item) => item.section === section);
                const err = mediaErrors[section];
                const canAdd = items.length < MAX_IMAGES;
                return (
                  <div key={section}>
                    <div className="mb-2 flex items-center justify-between">
                      <div>
                        <p className="text-sm font-semibold text-navy-800">{label}</p>
                        <p className="text-xs text-slate-400">{hint}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <span className={`text-xs ${items.length < MIN_IMAGES ? 'text-amber-500' : 'text-slate-400'}`}>
                          {items.length}/{MAX_IMAGES}
                          {items.length < MIN_IMAGES && <span className="ml-1">(min {MIN_IMAGES})</span>}
                        </span>
                        {canAdd && (
                          <button type="button" onClick={() => fileInputRefs.current[section]?.click()} className="text-xs font-bold text-veriq-secondary hover:underline">
                            Add image
                          </button>
                        )}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      {items.map((item) => (
                        <div key={item.id} className="group relative h-24 w-24 overflow-hidden rounded-xl border border-slate-200">
                          <a href={normalizeAssetUrl(item.url)} target="_blank" rel="noopener noreferrer">
                            <img src={normalizeAssetUrl(item.url)} alt={item.caption ?? label} className="h-full w-full object-cover" />
                          </a>
                          <button type="button" onClick={() => deleteMedia(item)} className="absolute right-1 top-1 rounded-full bg-black/70 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100">
                            <X className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                      {items.length === 0 && <p className="text-xs text-slate-400">No images in this category yet.</p>}
                    </div>
                    {err && <p className="mt-1 text-xs text-red-500">{err}</p>}
                    <input
                      ref={(el) => { fileInputRefs.current[section] = el; }}
                      type="file"
                      multiple
                      accept="image/*"
                      className="hidden"
                      disabled={uploadingSection === section}
                      onChange={(e) => uploadMedia(section, e.target.files)}
                    />
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="flex justify-end gap-3 pb-8">
          <Link href="/dashboard/properties" className="btn-outline !py-2.5 !text-sm">Cancel</Link>
          <button type="submit" disabled={isSaving} className="btn-primary !py-2.5 !text-sm flex items-center gap-2">
            {isSaving && <LoadingSpinner size="sm" />}
            Save Changes
          </button>
        </div>
      </form>
    </div>
  );
}
