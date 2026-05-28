'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Home } from 'lucide-react';
import Link from 'next/link';
import { propertiesApi, ApiError } from '@/lib/api';
import { PropertyType } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';

const schema = z.object({
  title: z.string().min(5, 'Title must be at least 5 characters').max(300),
  description: z.string().max(1000).optional(),
  propertyType: z.nativeEnum(PropertyType),
  bedrooms: z.coerce.number().min(0),
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
});

type FormData = z.infer<typeof schema>;

const PROPERTY_TYPES = Object.values(PropertyType);

export default function NewPropertyPage() {
  const router = useRouter();
  const { success, error: toastError } = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { bedrooms: 1, bathrooms: 1 },
  });

  const onSubmit = async (data: FormData) => {
    try {
      await propertiesApi.create(data);
      success('Listing created successfully!');
      router.push('/dashboard/properties');
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.statusCode === 403) {
          toastError('You must complete Level 1 verification before listing properties.');
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
        {/* Basic info */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900 flex items-center gap-2">
            <Home className="h-4 w-4 text-veriq-secondary" /> Basic Information
          </h2>

          <div>
            <label className="label">Property Title *</label>
            <input {...register('title')} className="input" placeholder="e.g. 3-bedroom apartment in Lekki Phase 1" />
            {errors.title && <p className="error">{errors.title.message}</p>}
          </div>

          <div>
            <label className="label">Description</label>
            <textarea {...register('description')} rows={3} className="input resize-none" placeholder="Describe the property…" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">Property Type *</label>
              <select {...register('propertyType')} className="input">
                {PROPERTY_TYPES.map((t) => (
                  <option key={t} value={t}>{t.replace(/_/g, ' ')}</option>
                ))}
              </select>
              {errors.propertyType && <p className="error">{errors.propertyType.message}</p>}
            </div>
            <div>
              <label className="label">Bedrooms *</label>
              <input {...register('bedrooms')} type="number" min={0} className="input" />
            </div>
            <div>
              <label className="label">Bathrooms *</label>
              <input {...register('bathrooms')} type="number" min={0} className="input" />
            </div>
          </div>

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
        </div>

        {/* Pricing */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900">Pricing (₦)</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="label">Annual Rent *</label>
              <input {...register('rentAmount')} type="number" min={0} className="input" placeholder="e.g. 1500000" />
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

        {/* Location */}
        <div className="card p-6 space-y-4">
          <h2 className="font-display text-base font-bold text-navy-900">Location</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="label">State *</label>
              <input {...register('state')} className="input" placeholder="e.g. Lagos" />
              {errors.state && <p className="error">{errors.state.message}</p>}
            </div>
            <div>
              <label className="label">City *</label>
              <input {...register('city')} className="input" placeholder="e.g. Lagos Island" />
              {errors.city && <p className="error">{errors.city.message}</p>}
            </div>
            <div>
              <label className="label">Area *</label>
              <input {...register('area')} className="input" placeholder="e.g. Lekki Phase 1" />
              {errors.area && <p className="error">{errors.area.message}</p>}
            </div>
          </div>
          <div>
            <label className="label">Full Address <span className="text-slate-400">(optional — shown only after unlock)</span></label>
            <input {...register('address')} className="input" placeholder="e.g. 5B Admiralty Way, Lekki Phase 1" />
          </div>
        </div>

        {/* Submit */}
        <div className="flex gap-3 justify-end pb-8">
          <Link href="/dashboard/properties" className="rounded-xl border border-slate-200 px-6 py-3 text-sm font-medium text-navy-700 hover:bg-slate-50">
            Cancel
          </Link>
          <button
            type="submit"
            disabled={isSubmitting}
            className="btn-primary flex items-center gap-2"
          >
            {isSubmitting && <LoadingSpinner size="sm" />}
            {isSubmitting ? 'Creating…' : 'Create Listing'}
          </button>
        </div>
      </form>
    </div>
  );
}
