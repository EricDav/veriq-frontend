'use client';

import React, { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Camera, Home, Upload, X, Zap, Search } from 'lucide-react';
import { ApiError, communityApi, locationsApi, mediaApi, propertiesApi } from '@/lib/api';
import { ACCEPTED_IMAGE_INPUT, uploadToFileService } from '@/lib/upload';
import { LISTING_FIELDS, MEDIA_OVERALL_MINIMUM, MEDIA_REQUIREMENTS } from '@/lib/property-listing-spec';
import type { AllowedState, CommunityArea, CommunityLocation, CreatePropertyDto, MediaItem, Property, Street } from '@/types';
import {
  CompoundCulture,
  ElectricitySituation,
  FloodRisk,
  MediaSection,
  NetworkQuality,
  NoiseLevel,
  NoiseSource,
  PropertyCondition,
  PropertyType,
  RoadAccess,
  RoadAccessRain,
  SecurityFeel,
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
  { value: PropertyType.SHARED_APARTMENT, label: 'Shared Apartment' },
  { value: PropertyType.HOSTEL, label: 'Hostel' },
  { value: PropertyType.SHORT_STAY, label: 'Short Let' },
];
const MAX_IMAGES = 5;
const chipOptions = {
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
  const [coverImageUrl, setCoverImageUrl] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
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
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [isMediaLoading, setIsMediaLoading] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const [mediaErrors, setMediaErrors] = useState<Record<string, string>>({});
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const coverImageInputRef = useRef<HTMLInputElement | null>(null);
  const latestCoverImageUrlRef = useRef('');
  const hasEditedCoverImageRef = useRef(false);
  const propertyType = form.propertyType;
  const hasRoomCounts = [PropertyType.FLAT, PropertyType.DUPLEX, PropertyType.BUNGALOW, PropertyType.SHORT_STAY].includes(propertyType as PropertyType);
  const hasFloorLevel = [PropertyType.FLAT, PropertyType.MINI_FLAT, PropertyType.SELF_CONTAIN, PropertyType.ROOM_AND_PARLOUR].includes(propertyType as PropertyType);
  const hasResidentialFurnishing = propertyType !== PropertyType.HOSTEL && propertyType !== PropertyType.SHORT_STAY;
  const listingDetails = (form.listingDetails ?? {}) as Record<string, unknown>;
  const typeFields = propertyType ? LISTING_FIELDS[propertyType] ?? [] : [];
  const mediaCategories = (propertyType ? MEDIA_REQUIREMENTS[propertyType] ?? [] : []).filter((category) => {
    if (propertyType === PropertyType.HOSTEL && category.section === MediaSection.KITCHEN) return listingDetails.cookingAllowed !== 'No';
    if (propertyType === PropertyType.SHORT_STAY && category.section === MediaSection.KITCHEN) return Array.isArray(listingDetails.amenities) && listingDetails.amenities.includes('Kitchen Access');
    if (propertyType === PropertyType.SHORT_STAY && category.section === MediaSection.LIVING_ROOM) return ['Entire Apartment', 'Serviced Apartment'].includes(String(listingDetails.shortLetType ?? ''));
    return true;
  });
  const requiredMediaSections = mediaCategories.filter((category) => category.minimum > 0).map((category) => category.section);

  useEffect(() => {
    let mounted = true;
    propertiesApi.getById(id)
      .then((res) => {
        if (!mounted) return;
        const p = res.data;
        const loadedCoverImageUrl = p.coverImageUrl ?? '';
        if (!hasEditedCoverImageRef.current) {
          latestCoverImageUrlRef.current = loadedCoverImageUrl;
          setCoverImageUrl(loadedCoverImageUrl);
          if (coverImageInputRef.current) {
            coverImageInputRef.current.value = loadedCoverImageUrl;
          }
        }
        setProperty(p);
        if (p.streetId) {
          communityApi.getStreet(p.streetId)
            .then((streetResponse) => setStreetQuery(streetResponse.data.street.streetName))
            .catch(() => setStreetQuery(''));
        }
        setForm({
          title: p.title,
          description: p.description ?? '',
          propertyType: p.propertyType,
          state: p.state,
          city: p.city,
          area: p.area,
          streetId: p.streetId ?? undefined,
          address: p.address ?? '',
          latitude: p.latitude ?? undefined,
          longitude: p.longitude ?? undefined,
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          floorLevel: p.floorLevel ?? '',
          isFurnished: p.isFurnished,
          furnishingStatus: p.furnishingStatus ?? undefined,
          toilets: p.toilets ?? undefined,
          listingDetails: p.listingDetails ?? {},
          rentAmount: Number(p.rentAmount),
          serviceCharge: Number(p.serviceCharge ?? 0),
          agencyFee: Number(p.agencyFee ?? 0),
          legalFee: Number(p.legalFee ?? 0),
          cautionFee: Number(p.cautionFee ?? 0),
          inspectionFee: Number(p.inspectionFee ?? 0),
          coverImageUrl: hasEditedCoverImageRef.current ? latestCoverImageUrlRef.current : loadedCoverImageUrl,
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
    setMasterLocations([]); setMasterAreas([]); setMasterStreets([]);
    if (!form.state) return;
    communityApi.streetLocations({ state: form.state })
      .then((res) => setMasterLocations(res.data.locations))
      .catch(() => setMasterLocations([]));
  }, [form.state]);

  useEffect(() => {
    setMasterAreas([]); setMasterStreets([]);
    if (!form.state || !form.city) return;
    communityApi.streetLocations({ state: form.state, city: form.city })
      .then((res) => setMasterAreas(res.data.areaRecords))
      .catch(() => setMasterAreas([]));
    const location = masterLocations.find((item) => item.name === form.city);
    if (!location) return;
  }, [form.city, form.state, masterLocations]);

  useEffect(() => {
    const timeout = window.setTimeout(() => setDebouncedStreetQuery(streetQuery.trim()), 300);
    return () => window.clearTimeout(timeout);
  }, [streetQuery]);

  useEffect(() => {
    if (!form.state || !form.city || streetNotListed || debouncedStreetQuery.length < 2) {
      setMasterStreets([]);
      return;
    }
    const location = masterLocations.find((item) => item.name === form.city);
    if (!location) return;
    let active = true;
    setIsSearchingStreets(true);
    communityApi.searchStreets({ state: form.state, city: form.city, locationId: location.id, q: debouncedStreetQuery })
      .then((res) => { if (active) setMasterStreets(res.data); })
      .catch(() => { if (active) setMasterStreets([]); })
      .finally(() => { if (active) setIsSearchingStreets(false); });
    return () => { active = false; };
  }, [debouncedStreetQuery, form.city, form.state, masterLocations, streetNotListed]);

  useEffect(() => {
    if (!form.streetId || streetQuery) return;
    const selected = masterStreets.find((item) => item.id === form.streetId);
    if (selected) setStreetQuery(selected.streetName);
  }, [form.streetId, masterStreets, streetQuery]);

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

  const updateListingDetail = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      listingDetails: { ...((prev.listingDetails ?? {}) as Record<string, unknown>), [key]: value },
    }));
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
    const requirement = mediaCategories.find((category) => category.section === item.section);
    if (requiredMediaSections.includes(item.section as MediaSection) && requirement && sectionItems.length <= requirement.minimum) {
      setMediaErrors((prev) => ({
        ...prev,
        [item.section]: `Add a replacement first. ${requirement.label} must keep at least ${requirement.minimum} image${requirement.minimum === 1 ? '' : 's'}.`,
      }));
      toastError('Add a replacement before removing this required image.');
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
      hasEditedCoverImageRef.current = true;
      latestCoverImageUrlRef.current = uploaded.url;
      if (coverImageInputRef.current) {
        coverImageInputRef.current.value = uploaded.url;
      }
      setCoverImageUrl(uploaded.url);
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
    const latestCoverImageUrl = coverImageInputRef.current?.value || latestCoverImageUrlRef.current || coverImageUrl || String(form.coverImageUrl ?? '');
    if (!latestCoverImageUrl) {
      toastError('Please upload a cover image before saving changes.');
      return;
    }
    const missingSections = mediaCategories.filter(({ section, minimum }) => minimum > 0 && media.filter((item) => item.section === section).length < minimum);
    if (missingSections.length > 0) {
      setMediaErrors((prev) => ({
        ...prev,
        ...missingSections.reduce<Record<string, string>>((acc, { section, label, minimum }) => {
          acc[section] = `${label} needs at least ${minimum} image${minimum === 1 ? '' : 's'}.`;
          return acc;
        }, {}),
      }));
      toastError('Complete every required property media category before saving.');
      return;
    }
    const overallMinimum = propertyType ? MEDIA_OVERALL_MINIMUM[propertyType] ?? 0 : 0;
    if (media.length < overallMinimum) {
      toastError(`Upload at least ${overallMinimum} property images before saving.`);
      return;
    }
    setIsSaving(true);
    try {
      let streetId = form.streetId;
      if (streetNotListed) {
        const streetName = missingStreetName.trim();
        const location = masterLocations.find((item) => item.name === form.city);
        const area = masterAreas.find((item) => item.name === form.area);
        if (!streetName || !location || !area || !form.state || !form.city || !form.area) {
          toastError('Select an area and enter the street name.');
          return;
        }
        const response = await communityApi.createStreet({
          state: form.state,
          city: form.city,
          area: form.area,
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
      const payload = Object.fromEntries(
        Object.entries(form).filter(([, value]) => value !== ''),
      ) as Partial<CreatePropertyDto>;
      payload.listingDetails = Object.fromEntries(typeFields.map((field) => [field.key, listingDetails[field.key]]));
      payload.streetId = streetId;
      payload.coverImageUrl = latestCoverImageUrl;
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
          <input ref={coverImageInputRef} type="hidden" name="coverImageUrl" defaultValue={coverImageUrl} />

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
                {isCoverUploading ? 'Uploading...' : coverImageUrl ? 'Replace cover' : 'Upload cover'}
                <input
                  type="file"
                  accept={ACCEPTED_IMAGE_INPUT}
                  className="hidden"
                  disabled={isCoverUploading}
                  onChange={(e) => {
                    uploadCover(e.target.files?.[0]);
                    e.currentTarget.value = '';
                  }}
                />
              </label>
              {coverImageUrl && (
                <a href={normalizeAssetUrl(coverImageUrl)} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
                  View current cover
                </a>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">Property Type *</label>
              <select value={form.propertyType ?? ''} onChange={(e) => setForm((current) => ({ ...current, propertyType: e.target.value as PropertyType, listingDetails: {} }))} className="input" required>
                {PROPERTY_TYPE_OPTIONS.map((type) => (
                  <option key={type.value} value={type.value}>{type.label}</option>
                ))}
              </select>
            </div>
            {hasRoomCounts && <div><label className="label">Bedrooms *</label><input type="number" min={1} value={form.bedrooms ?? ''} onChange={(e) => update('bedrooms', e.target.value ? Number(e.target.value) : undefined)} className="input" required /></div>}
            {hasRoomCounts && <div><label className="label">Bathrooms *</label><input type="number" min={1} value={form.bathrooms ?? ''} onChange={(e) => update('bathrooms', e.target.value ? Number(e.target.value) : undefined)} className="input" required /></div>}
          </div>

          {hasResidentialFurnishing && <div><label className="label">Furnishing Status *</label><select value={form.furnishingStatus ?? ''} onChange={(event) => update('furnishingStatus', event.target.value)} className="input" required><option value="">Select...</option><option value="furnished">Furnished</option><option value="semi_furnished">Semi-furnished</option><option value="unfurnished">Unfurnished</option></select></div>}
        </div>

        <div className="card space-y-4 p-6">
          <div>
            <h2 className="font-display text-base font-bold text-navy-900">Location Directory</h2>
            <p className="mt-1 text-xs text-veriq-muted">Select the approved location and street that link this property to Street Intelligence.</p>
          </div>
          <div className="flex rounded-xl bg-slate-100 p-1">
            <button type="button" onClick={() => { setStreetNotListed(false); setMissingStreetName(''); setMissingStreetLandmark(''); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${!streetNotListed ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>Select street</button>
            <button type="button" onClick={() => { setStreetNotListed(true); setForm((current) => ({ ...current, streetId: undefined, area: '' })); setStreetQuery(''); }} className={`flex-1 rounded-lg px-3 py-2 text-xs font-bold ${streetNotListed ? 'bg-white text-navy-900 shadow-sm' : 'text-slate-500'}`}>I can&apos;t see my street</button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="label">State *</label>
              <select value={form.state ?? ''} onChange={(e) => setForm((current) => ({ ...current, state: e.target.value, city: '', area: '', streetId: undefined }))} className="input" required>
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
              <label className="label">Local Government *</label>
              <select value={form.city ?? ''} onChange={(e) => setForm((current) => ({ ...current, city: e.target.value, area: '', streetId: undefined }))} className="input" required disabled={!form.state}>
                <option value="">Select local government...</option>
                {form.city && !masterLocations.some((item) => item.name === form.city) && <option value={form.city}>{form.city} (legacy)</option>}
                {masterLocations.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
            </div>
          </div>
          {!streetNotListed ? (
            <div className="relative">
              <label className="label">Search street, estate or road *</label>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input aria-label="Street name" value={streetQuery} onChange={(event) => { setStreetQuery(event.target.value); setForm((current) => ({ ...current, streetId: undefined, area: '' })); }} className="input pl-9" placeholder="Start typing a street name" autoComplete="off" disabled={!form.city} />
              </div>
              {form.city && streetQuery.trim().length >= 2 && !form.streetId && (
                <div className="absolute z-20 mt-1 max-h-64 w-full overflow-y-auto rounded-lg border border-slate-200 bg-white p-1 shadow-lg">
                  {masterStreets.map((street) => <button key={street.id} type="button" onClick={() => { setForm((current) => ({ ...current, streetId: street.id, area: street.area })); setStreetQuery(street.streetName); }} className="block w-full rounded-md px-3 py-2 text-left hover:bg-slate-50"><span className="block text-sm font-bold text-navy-900">{street.streetName}</span><span className="block text-xs text-veriq-muted">{street.area}</span></button>)}
                  {!isSearchingStreets && masterStreets.length === 0 && <p className="px-3 py-3 text-xs text-slate-500">No approved street matches this name.</p>}
                </div>
              )}
              {form.streetId && <p className="mt-1 text-xs font-semibold text-emerald-700">Approved street selected.</p>}
              <button type="button" onClick={() => { setStreetNotListed(true); setMissingStreetName(streetQuery); setStreetQuery(''); setForm((current) => ({ ...current, streetId: undefined, area: '' })); }} disabled={!form.city} className="mt-2 text-left text-xs font-bold text-veriq-secondary hover:underline disabled:opacity-50">I can&apos;t see my street in this list</button>
            </div>
          ) : (
            <div>
              <label className="label">Area / Neighbourhood *</label>
              <select value={form.area ?? ''} onChange={(e) => update('area', e.target.value)} className="input" required>
                <option value="">Select area...</option>
                {masterAreas.map((item) => <option key={item.id} value={item.name}>{item.name}</option>)}
              </select>
              <label className="label mt-4">Street Name *</label>
              <input value={missingStreetName} onChange={(event) => setMissingStreetName(event.target.value)} className="input" placeholder="Enter the street name" />
              <label className="label mt-4">Nearby Landmark <span className="font-normal text-slate-400">(optional)</span></label>
              <input value={missingStreetLandmark} onChange={(event) => setMissingStreetLandmark(event.target.value)} className="input" placeholder="e.g. Opposite the health centre" />
              <p className="mt-1 text-xs text-veriq-muted">The street will be sent for admin review. You can save the listing now.</p>
            </div>
          )}
          <div>
            <label className="label">Full Property Address <span className="text-slate-400">(optional - private until unlocked)</span></label>
            <input value={form.address ?? ''} onChange={(e) => update('address', e.target.value)} className="input" placeholder="House number, building or estate, and street" />
            <p className="mt-1 text-xs text-veriq-muted">This is the address users see after they unlock the property.</p>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-navy-900">Details & Pricing</h2>
          {hasFloorLevel && <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">Floor Level</label>
              <input value={form.floorLevel ?? ''} onChange={(e) => update('floorLevel', e.target.value)} className="input" />
            </div>
          </div>}

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {moneyFields.filter(({ key }) => propertyType !== PropertyType.SHORT_STAY || key !== 'rentAmount').map(({ key, label }) => (
              <div key={String(key)}>
                <label className="label">{key === 'rentAmount' ? (propertyType === PropertyType.HOSTEL ? 'Rent Amount' : propertyType === PropertyType.SHARED_APARTMENT ? 'Annual Rent for Available Room' : 'Annual Rent') : label}</label>
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

        {typeFields.length > 0 && (
          <div className="card space-y-4 border-2 border-veriq-secondary/20 p-6">
            <div>
              <h2 className="font-display text-base font-bold text-navy-900">{PROPERTY_TYPE_OPTIONS.find((item) => item.value === propertyType)?.label} Details</h2>
              <p className="mt-1 text-xs text-veriq-muted">Complete the details required for this property type.</p>
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {typeFields.map((field) => {
                if (field.showWhen) {
                  const current = listingDetails[field.showWhen.key];
                  const visible = field.showWhen.values.some((value) => value === current || (typeof current === 'number' && typeof value === 'number' && current >= value));
                  if (!visible) return null;
                }
                if (field.type === 'multi') {
                  const values = Array.isArray(listingDetails[field.key]) ? listingDetails[field.key] as string[] : [];
                  return <div key={field.key} className="sm:col-span-2"><label className="label">{field.label}{field.required ? ' *' : ''}</label><div className="flex flex-wrap gap-2">{field.options?.map((option) => <button key={option} type="button" onClick={() => updateListingDetail(field.key, values.includes(option) ? values.filter((value) => value !== option) : [...values, option])} className={`rounded-full border px-4 py-1.5 text-xs font-semibold ${values.includes(option) ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200 bg-white text-navy-700'}`}>{option}</button>)}</div></div>;
                }
                if (field.type === 'checkbox') return <label key={field.key} className="flex items-center gap-3 text-sm font-medium text-navy-700"><input type="checkbox" checked={Boolean(listingDetails[field.key])} onChange={(event) => updateListingDetail(field.key, event.target.checked)} className="h-4 w-4" />{field.label}</label>;
                if (field.options) return <div key={field.key}><label className="label">{field.label}{field.required ? ' *' : ''}</label><select className="input" required={field.required} value={String(listingDetails[field.key] ?? '')} onChange={(event) => updateListingDetail(field.key, event.target.value)}><option value="">Select...</option>{field.options.map((option) => <option key={option} value={option}>{option}</option>)}</select></div>;
                if (field.type === 'textarea') return <div key={field.key} className="sm:col-span-2"><label className="label">{field.label}{field.required ? ' *' : ''}</label><textarea className="input resize-none" rows={3} maxLength={field.maxLength} required={field.required} value={String(listingDetails[field.key] ?? '')} onChange={(event) => updateListingDetail(field.key, event.target.value)} /></div>;
                return <div key={field.key}><label className="label">{field.label}{field.required ? ' *' : ''}</label><input className="input" type={field.type ?? 'text'} min={field.type === 'number' ? 0 : undefined} required={field.required} value={String(listingDetails[field.key] ?? '')} onChange={(event) => updateListingDetail(field.key, field.type === 'number' ? (event.target.value === '' ? undefined : Number(event.target.value)) : event.target.value)} /></div>;
              })}
            </div>
          </div>
        )}

        <div className="card space-y-5 border-2 border-veriq-secondary/20 p-6">
          <h2 className="font-display flex items-center gap-2 text-base font-bold text-navy-900">
            <Zap className="h-4 w-4 text-veriq-secondary" /> Veriq Quick Intelligence
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {[
              ['floodRisk', 'Flood Risk', FloodRisk],
              ...(propertyType === PropertyType.SHORT_STAY ? [] : [
                ['electricitySituation', 'Electricity Situation', ElectricitySituation],
                ['waterAvailability', 'Water Availability', WaterAvailability],
                ['waterSource', 'Water Source', WaterSource],
              ]),
              ['roadAccess', 'Road Access', RoadAccess],
              ['roadAccessRain', 'Road During Rain', RoadAccessRain],
              ['networkQuality', propertyType === PropertyType.SHORT_STAY ? 'Mobile Network' : 'Network Quality', NetworkQuality],
              ['noiseLevel', propertyType === PropertyType.SHORT_STAY ? 'External Noise' : 'Noise Level', NoiseLevel],
              ['noiseSource', 'Noise Source', NoiseSource],
              ['securityFeel', propertyType === PropertyType.SHORT_STAY ? 'Security Feel of Area' : 'Security Feel', SecurityFeel],
              ['propertyCondition', 'Property Condition', PropertyCondition],
              ...(propertyType === PropertyType.SHORT_STAY ? [] : [['compoundCulture', 'Compound Culture', CompoundCulture]]),
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
            ...(propertyType === PropertyType.SHORT_STAY ? [] : [['electricityInfo', 'Electricity Info', chipOptions.electricityInfo]]),
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
            <label className="label">Best Network *</label>
            <select className="input" required value={Array.isArray(form.bestNetwork) ? form.bestNetwork[0] ?? '' : ''} onChange={(event) => update('bestNetwork', event.target.value ? [event.target.value] : [])}>
              <option value="">Select...</option>
              {chipOptions.bestNetwork.map((value) => <option key={value} value={value}>{value === '9mobile' ? '9mobile' : value.toUpperCase()}</option>)}
            </select>
          </div>

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
              {mediaCategories.map(({ section, label, hint, minimum }) => {
                const items = media.filter((item) => item.section === section);
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
                          items.length < minimum ? 'bg-amber-50 text-amber-700' : 'bg-emerald-50 text-emerald-700'
                        }`}>
                          {items.length}/{MAX_IMAGES} uploaded
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-1 text-[11px] font-bold text-slate-600">
                          min {minimum}
                        </span>
                        {canAdd && (
                          <button type="button" onClick={() => fileInputRefs.current[section]?.click()} className="rounded-full bg-veriq-secondary/10 px-2 py-1 text-[11px] font-bold text-veriq-secondary hover:bg-veriq-secondary/15">
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
                      accept={ACCEPTED_IMAGE_INPUT}
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
