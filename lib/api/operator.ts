/**
 * Property Operator API client: schema catalogue, property submissions, listing media, availability,
 * Shared Property opportunities and referral-code validation. Paths omit the /api/v1 prefix.
 */

import { api } from '@/lib/api';
import type { ApiResponse } from '@/types';
import type {
  AvailabilityEventRecord,
  ContactInput,
  CreatePropertySubmissionInput,
  CreateSharedOpportunityInput,
  EvidenceKind,
  EvidenceRecord,
  FormSchema,
  ListingMediaItem,
  ListingMediaView,
  ListingRevisionRecord,
  MediaNotApplicableInput,
  MediaOwnerType,
  MediaUploadInput,
  OperatorPropertiesList,
  PropertyContactRecord,
  PropertyManagerData,
  PropertyUnitRecord,
  PropertyUpdateResult,
  ReferralCodeValidation,
  SchemaAnswers,
  SchemaCatalogue,
  SchemaValidationResult,
  SharedManagerData,
  SharedOpportunitySummary,
  SharedUpdateResult,
  UnitAvailabilityStatus,
  UnitSubmissionInput,
  UnitUpdateResult,
  UpdatePropertySubmissionInput,
  UpdateSharedOpportunityInput,
  UpdateUnitSubmissionInput,
  ValidationMode,
} from '@/types/operator';

const enc = encodeURIComponent;

export const propertySchemasApi = {
  catalogue: () =>
    api.get<ApiResponse<SchemaCatalogue>>('/property-schemas', { public: true }),

  get: (schemaId: string) =>
    api.get<ApiResponse<FormSchema>>(`/property-schemas/${enc(schemaId)}`, { public: true }),

  validate: (schemaId: string, answers: SchemaAnswers, mode: ValidationMode = 'submit') =>
    api.post<ApiResponse<SchemaValidationResult>>(
      `/property-schemas/${enc(schemaId)}/validate`,
      { ...answers, mode },
      { public: true },
    ),
};

function evidenceForm(kind: EvidenceKind, file: File, notes?: string) {
  const form = new FormData();
  form.append('kind', kind);
  if (notes?.trim()) form.append('notes', notes.trim());
  form.append('file', file);
  return form;
}

export const propertySubmissionsApi = {
  create: (input: CreatePropertySubmissionInput) =>
    api.post<ApiResponse<PropertyManagerData>>('/listing-submissions/properties', input),

  mine: () =>
    api.get<ApiResponse<OperatorPropertiesList>>('/listing-submissions/properties'),

  get: (propertyId: string) =>
    api.get<ApiResponse<PropertyManagerData>>(`/listing-submissions/properties/${enc(propertyId)}`),

  update: (propertyId: string, input: UpdatePropertySubmissionInput) =>
    api.patch<ApiResponse<PropertyUpdateResult>>(
      `/listing-submissions/properties/${enc(propertyId)}`,
      input,
    ),

  addUnit: (propertyId: string, input: UnitSubmissionInput) =>
    api.post<ApiResponse<PropertyUnitRecord>>(
      `/listing-submissions/properties/${enc(propertyId)}/units`,
      input,
    ),

  updateUnit: (unitId: string, input: UpdateUnitSubmissionInput) =>
    api.patch<ApiResponse<UnitUpdateResult>>(`/listing-submissions/units/${enc(unitId)}`, input),

  submit: (propertyId: string) =>
    api.post<ApiResponse<PropertyManagerData>>(
      `/listing-submissions/properties/${enc(propertyId)}/submit`,
    ),

  replaceContact: (propertyId: string, input: ContactInput) =>
    api.post<ApiResponse<PropertyContactRecord>>(
      `/listing-submissions/properties/${enc(propertyId)}/contacts`,
      input,
    ),

  addEvidence: (propertyId: string, kind: EvidenceKind, file: File, notes?: string) =>
    api.upload<ApiResponse<EvidenceRecord>>(
      `/listing-submissions/properties/${enc(propertyId)}/evidence`,
      evidenceForm(kind, file, notes),
    ),

  evidence: (propertyId: string) =>
    api.get<ApiResponse<EvidenceRecord[]>>(
      `/listing-submissions/properties/${enc(propertyId)}/evidence`,
    ),

  revisions: (propertyId: string) =>
    api.get<ApiResponse<ListingRevisionRecord[]>>(
      `/listing-submissions/properties/${enc(propertyId)}/revisions`,
    ),

  withdrawRevision: (revisionId: string) =>
    api.post<ApiResponse<ListingRevisionRecord>>(
      `/listing-submissions/revisions/${enc(revisionId)}/withdraw`,
    ),
};

export const listingMediaApi = {
  view: (ownerType: MediaOwnerType, ownerId: string) =>
    api.get<ApiResponse<ListingMediaView>>(`/listing-media/${ownerType}/${enc(ownerId)}`),

  upload: (ownerType: MediaOwnerType, ownerId: string, input: MediaUploadInput) => {
    const form = new FormData();
    form.append('mediaCategory', input.mediaCategory);
    if (input.componentKey) form.append('componentKey', input.componentKey);
    if (input.replacesMediaId) form.append('replacesMediaId', input.replacesMediaId);
    form.append('file', input.file);
    return api.upload<ApiResponse<ListingMediaItem>>(
      `/listing-media/${ownerType}/${enc(ownerId)}`,
      form,
    );
  },

  notApplicable: (ownerType: MediaOwnerType, ownerId: string, input: MediaNotApplicableInput) =>
    api.post<ApiResponse<{ id: string; status: string }>>(
      `/listing-media/${ownerType}/${enc(ownerId)}/not-applicable`,
      {
        mediaCategory: input.mediaCategory,
        ...(input.componentKey ? { componentKey: input.componentKey } : {}),
        reason: input.reason,
      },
    ),

  remove: (mediaId: string) =>
    api.delete<ApiResponse<{ id: string }>>(`/listing-media/items/${enc(mediaId)}`),
};

export const unitAvailabilityApi = {
  change: (unitId: string, status: UnitAvailabilityStatus, reason?: string) =>
    api.patch<ApiResponse<PropertyUnitRecord>>(`/availability/units/${enc(unitId)}`, {
      status,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),

  reconfirm: (unitId: string) =>
    api.post<ApiResponse<PropertyUnitRecord>>(`/availability/units/${enc(unitId)}/reconfirm`),

  history: (unitId: string) =>
    api.get<ApiResponse<AvailabilityEventRecord[]>>(`/availability/units/${enc(unitId)}/history`),
};

export const sharedPropertiesApi = {
  create: (input: CreateSharedOpportunityInput) =>
    api.post<ApiResponse<SharedManagerData>>('/shared-properties', input),

  mine: () => api.get<ApiResponse<SharedOpportunitySummary[]>>('/shared-properties/mine'),

  manage: (id: string) =>
    api.get<ApiResponse<SharedManagerData>>(`/shared-properties/${enc(id)}/manage`),

  update: (id: string, input: UpdateSharedOpportunityInput) =>
    api.patch<ApiResponse<SharedUpdateResult>>(`/shared-properties/${enc(id)}`, input),

  addEvidence: (id: string, kind: EvidenceKind, file: File, notes?: string) =>
    api.upload<ApiResponse<EvidenceRecord>>(
      `/shared-properties/${enc(id)}/evidence`,
      evidenceForm(kind, file, notes),
    ),

  evidence: (id: string) =>
    api.get<ApiResponse<EvidenceRecord[]>>(`/shared-properties/${enc(id)}/evidence`),

  submit: (id: string) =>
    api.post<ApiResponse<SharedManagerData>>(`/shared-properties/${enc(id)}/submit`),

  availability: (id: string, status: UnitAvailabilityStatus, reason?: string) =>
    api.patch<ApiResponse<SharedManagerData>>(`/shared-properties/${enc(id)}/availability`, {
      status,
      ...(reason?.trim() ? { reason: reason.trim() } : {}),
    }),
};

export const referralCodesApi = {
  validate: (code: string) =>
    api.get<ApiResponse<ReferralCodeValidation>>(`/referral-codes/${enc(code.trim())}`, {
      public: true,
    }),
};

export const operatorApi = {
  schemas: propertySchemasApi,
  submissions: propertySubmissionsApi,
  media: listingMediaApi,
  availability: unitAvailabilityApi,
  shared: sharedPropertiesApi,
  referrals: referralCodesApi,
};
