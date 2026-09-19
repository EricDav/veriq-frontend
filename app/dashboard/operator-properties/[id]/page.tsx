'use client';

import { useEffect, useMemo, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, Camera, Trash2, Upload } from 'lucide-react';
import { mediaApi, shortLetOperatorsApi } from '@/lib/api';
import { ACCEPTED_IMAGE_INPUT, uploadToFileService } from '@/lib/upload';
import { MEDIA_REQUIREMENTS } from '@/lib/property-listing-spec';
import { MediaItem, MediaSection, Property, PropertyType, UserRole } from '@/types';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const AMENITIES = ['Wi-Fi', 'Air Conditioning', 'Generator / Power Backup', 'Kitchen', 'Hot Water', 'Parking', 'Security / Gate', 'Laundry', 'Smart TV', 'Swimming Pool', 'Refrigerator', 'Microwave', 'Balcony', 'Gym'];
const DETAIL_FIELDS = [
  ['monthlyRate', 'Monthly Rate', 'number'],
  ['minimumNights', 'Minimum Nights', 'number'],
  ['checkInTime', 'Check-in Time', 'time'],
  ['checkOutTime', 'Check-out Time', 'time'],
  ['cleaningFee', 'Cleaning Fee', 'number'],
  ['securityDeposit', 'Caution / Security Deposit', 'number'],
  ['otherMandatoryFee', 'Other Mandatory Fee', 'number'],
] as const;

export default function OperatorPropertyPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const isPropertyOperator = user?.role === UserRole.PROPERTY_OPERATOR;
  const [property, setProperty] = useState<Property | null>(null);
  const [media, setMedia] = useState<MediaItem[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploadingSection, setUploadingSection] = useState<string | null>(null);
  const { success, error } = useToast();

  const load = async () => {
    try {
      const [listingsResponse, mediaResponse] = await Promise.all([
        shortLetOperatorsApi.portalListings(),
        mediaApi.getAll(id),
      ]);
      setProperty(listingsResponse.data.find((item) => item.id === id) || null);
      setMedia(mediaResponse.data);
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Unable to load this associated property');
    }
  };

  // Property Operators manage this Property in the Operator portal, where Units, revisions and evidence live (§30.2).
  useEffect(() => { if (isPropertyOperator) router.replace(`/dashboard/operator/properties/${id}`); }, [isPropertyOperator, id, router]);

  useEffect(() => { if (!authLoading && !isPropertyOperator) void load(); }, [id, authLoading, isPropertyOperator]);

  const details = property?.listingDetails || {};
  const mediaCategories = useMemo(() => (MEDIA_REQUIREMENTS[PropertyType.SHORT_STAY] ?? []).filter((category) => {
    if (category.section === MediaSection.MAIN_ROOM) return details.shortLetType === 'Studio Apartment';
    if (category.section === MediaSection.BEDROOM) return details.shortLetType !== 'Studio Apartment';
    if (category.section === MediaSection.KITCHEN) return (details.amenities as string[] | undefined)?.includes('Kitchen');
    if (category.section === MediaSection.LIVING_ROOM) return ['Serviced Apartment', 'Duplex / House'].includes(String(details.shortLetType ?? ''));
    if (category.section === MediaSection.COMPOUND) return (details.amenities as string[] | undefined)?.includes('Parking');
    return true;
  }), [details]);

  if (authLoading || isPropertyOperator) return <PageLoader />;

  if (!property) return <div className="p-8 text-center text-sm text-slate-500">Loading associated property...</div>;

  const setDetail = (key: string, value: unknown) => setProperty((current) => current ? ({ ...current, listingDetails: { ...(current.listingDetails || {}), [key]: value } }) : current);
  const toggleAmenity = (amenity: string) => {
    const current = Array.isArray(details.amenities) ? details.amenities as string[] : [];
    setDetail('amenities', current.includes(amenity) ? current.filter((item) => item !== amenity) : [...current, amenity]);
  };
  const save = async () => {
    setSaving(true);
    try {
      await shortLetOperatorsApi.portalUpdate(id, {
        title: property.title,
        description: property.description,
        coverImageUrl: property.coverImageUrl,
        bookingLink: property.bookingLink || undefined,
        listingDetails: property.listingDetails,
      });
      success('Short Let property updated');
      await load();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Unable to save changes');
    } finally {
      setSaving(false);
    }
  };
  const replaceCover = async (file?: File) => {
    if (!file) return;
    try {
      const uploaded = await uploadToFileService(file);
      setProperty({ ...property, coverImageUrl: uploaded.url });
      success('Cover uploaded. Save changes to publish it.');
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Cover upload failed');
    }
  };
  const addMedia = async (section: MediaSection, files: FileList | null) => {
    if (!files?.length) return;
    setUploadingSection(section);
    try {
      for (const file of Array.from(files)) await mediaApi.upload(id, section, file);
      success('Property media uploaded');
      await load();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Property media upload failed');
    } finally {
      setUploadingSection(null);
    }
  };
  const removeMedia = async (item: MediaItem) => {
    try {
      await mediaApi.delete(id, item.id);
      success('Image removed');
      await load();
    } catch (caught) {
      error(caught instanceof Error ? caught.message : 'Unable to remove image');
    }
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <button className="flex items-center gap-2 text-sm" onClick={() => router.back()}><ArrowLeft className="h-4 w-4" />Back</button>
      <div><h1 className="font-display text-2xl font-bold">Manage Short Let</h1><p className="text-sm text-veriq-muted">Operational property details only. Veriq intelligence and operator association are protected.</p></div>

      <section className="card space-y-4 p-6">
        <h2 className="font-display font-semibold">Basic Information</h2>
        <label><span className="label">Title</span><input className="input" value={property.title} onChange={(event) => setProperty({ ...property, title: event.target.value })} /></label>
        <label><span className="label">Description</span><textarea className="input" rows={3} value={property.description || ''} onChange={(event) => setProperty({ ...property, description: event.target.value })} /></label>
        <label><span className="label">Cover Image</span><span className="inline-flex cursor-pointer items-center gap-2 rounded-lg border px-4 py-2 text-sm font-medium"><Upload className="h-4 w-4" />Replace cover<input className="hidden" type="file" accept={ACCEPTED_IMAGE_INPUT} onChange={(event) => replaceCover(event.target.files?.[0])} /></span></label>
        <div className="grid gap-4 sm:grid-cols-3">
          <label><span className="label">Short Let Type</span><select className="input" value={String(details.shortLetType ?? '')} onChange={(event) => setDetail('shortLetType', event.target.value)}><option value="">Select type</option>{['Studio Apartment', 'Serviced Apartment', 'Duplex / House', 'Private Room'].map((value) => <option key={value}>{value}</option>)}</select></label>
          <label><span className="label">Beds</span><input className="input" type="number" min={1} value={String(details.beds ?? '')} onChange={(event) => setDetail('beds', Number(event.target.value))} /></label>
          <label><span className="label">Maximum Guests</span><input className="input" type="number" min={1} value={String(details.maximumGuests ?? '')} onChange={(event) => setDetail('maximumGuests', Number(event.target.value))} /></label>
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display font-semibold">Pricing, Stay Details &amp; Fees</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="sm:col-span-2"><span className="label">Pricing Model</span><select className="input" value={String(details.pricingModel ?? '')} onChange={(event) => setDetail('pricingModel', event.target.value)}><option value="">Select pricing model</option>{['Daily', 'Weekly', 'Daily & Weekly'].map((value) => <option key={value}>{value}</option>)}</select></label>
          {['Daily', 'Daily & Weekly'].includes(String(details.pricingModel ?? '')) && <label><span className="label">Daily Rate (N/night)</span><input className="input" type="number" min={0} value={String(details.dailyRate ?? '')} onChange={(event) => setDetail('dailyRate', Number(event.target.value))} /></label>}
          {['Weekly', 'Daily & Weekly'].includes(String(details.pricingModel ?? '')) && <label><span className="label">Weekly Rate (N/week)</span><input className="input" type="number" min={0} value={String(details.weeklyRate ?? '')} onChange={(event) => setDetail('weeklyRate', Number(event.target.value))} /></label>}
          {DETAIL_FIELDS.map(([key, label, type]) => <label key={key}><span className="label">{label}</span><input className="input" type={type} min={type === 'number' ? 0 : undefined} value={String(details[key] ?? '')} onChange={(event) => setDetail(key, type === 'number' ? Number(event.target.value) : event.target.value)} /></label>)}
          {Number(details.otherMandatoryFee ?? 0) > 0 && <label className="sm:col-span-2"><span className="label">Fee Description *</span><input className="input" value={String(details.otherMandatoryFeeDescription ?? '')} placeholder="Describe what this mandatory fee covers" onChange={(event) => setDetail('otherMandatoryFeeDescription', event.target.value)} /></label>}
        </div>
      </section>

      <section className="card space-y-4 p-6">
        <h2 className="font-display font-semibold">Amenities &amp; Rules</h2>
        <div className="flex flex-wrap gap-2">{AMENITIES.map((amenity) => { const active = (details.amenities as string[] | undefined)?.includes(amenity); return <button key={amenity} type="button" onClick={() => toggleAmenity(amenity)} className={`rounded-full border px-3 py-2 text-xs font-semibold ${active ? 'border-veriq-secondary bg-veriq-secondary text-white' : 'border-slate-200'}`}>{amenity}</button>; })}</div>
        <label><span className="label">House Rules</span><textarea className="input" rows={3} maxLength={500} value={String(details.houseRules ?? '')} onChange={(event) => setDetail('houseRules', event.target.value)} /></label>
      </section>

      <section className="card space-y-5 p-6">
        <h2 className="font-display flex items-center gap-2 font-semibold"><Camera className="h-4 w-4 text-veriq-secondary" />Property Media</h2>
        {mediaCategories.map(({ section, label, minimum }) => {
          const sectionMedia = media.filter((item) => item.section === section);
          return <div key={section} className="border-b border-slate-100 pb-5 last:border-0"><div className="mb-3 flex items-center justify-between"><div><p className="text-sm font-semibold">{label}</p><p className="text-xs text-slate-500">{sectionMedia.length}/5 uploaded · minimum {minimum}</p></div><label className="cursor-pointer rounded-md border px-3 py-2 text-xs font-semibold"><Upload className="mr-1 inline h-3.5 w-3.5" />{uploadingSection === section ? 'Uploading...' : 'Add images'}<input className="hidden" type="file" multiple accept={ACCEPTED_IMAGE_INPUT} disabled={uploadingSection === section || sectionMedia.length >= 5} onChange={(event) => addMedia(section, event.target.files)} /></label></div><div className="flex flex-wrap gap-3">{sectionMedia.map((item) => <div key={item.id} className="group relative h-24 w-24 overflow-hidden rounded-md border"><img src={item.url} alt={item.caption || label} className="h-full w-full object-cover" /><button type="button" title="Remove image" onClick={() => removeMedia(item)} className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white"><Trash2 className="h-3.5 w-3.5" /></button></div>)}</div></div>;
        })}
      </section>

      <section className="card space-y-2 p-6"><h2 className="font-display font-semibold">Booking Link</h2><input className="input" type="url" placeholder="https://operator.example/accommodations/unit-name" value={property.bookingLink || ''} onChange={(event) => setProperty({ ...property, bookingLink: event.target.value })} /><p className="text-xs text-veriq-muted">Visible to customers only after unlock.</p></section>
      <button disabled={saving} onClick={save} className="btn-primary w-full">{saving ? 'Saving...' : 'Save changes'}</button>
    </div>
  );
}
