'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Home, Upload } from 'lucide-react';
import { ApiError, propertiesApi } from '@/lib/api';
import { uploadToFileService } from '@/lib/upload';
import type { CreatePropertyDto, Property } from '@/types';
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

export default function EditListingPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { success, error: toastError } = useToast();
  const [property, setProperty] = useState<Property | null>(null);
  const [form, setForm] = useState<EditForm>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isCoverUploading, setIsCoverUploading] = useState(false);

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
          state: p.state,
          city: p.city,
          area: p.area,
          address: p.address ?? '',
          bedrooms: p.bedrooms,
          bathrooms: p.bathrooms,
          floorLevel: p.floorLevel ?? '',
          rentAmount: Number(p.rentAmount),
          serviceCharge: Number(p.serviceCharge ?? 0),
          agencyFee: Number(p.agencyFee ?? 0),
          legalFee: Number(p.legalFee ?? 0),
          cautionFee: Number(p.cautionFee ?? 0),
          inspectionFee: Number(p.inspectionFee ?? 0),
          coverImageUrl: p.coverImageUrl ?? '',
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

  const update = (key: keyof CreatePropertyDto, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [key]: value }));
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
                  onChange={(e) => uploadCover(e.target.files?.[0])}
                />
              </label>
              {form.coverImageUrl && (
                <a href={form.coverImageUrl} target="_blank" rel="noopener noreferrer" className="text-xs font-semibold text-veriq-secondary hover:underline">
                  View current cover
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="card space-y-4 p-6">
          <h2 className="font-display text-base font-bold text-navy-900">Location</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="label">State *</label>
              <input value={form.state ?? ''} onChange={(e) => update('state', e.target.value)} className="input" required />
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
              <label className="label">Bedrooms</label>
              <input type="number" min={0} value={Number(form.bedrooms ?? 0)} onChange={(e) => update('bedrooms', Number(e.target.value))} className="input" />
            </div>
            <div>
              <label className="label">Bathrooms</label>
              <input type="number" min={0} value={Number(form.bathrooms ?? 0)} onChange={(e) => update('bathrooms', Number(e.target.value))} className="input" />
            </div>
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
