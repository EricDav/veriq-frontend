import type {
  EvidenceKind,
  MediaReviewStatus,
  MediaSectionState,
  OperatorIdentityStatus,
  OperatorPropertyCategory,
  PublicationStatus,
  RevisionKind,
  RevisionStatus,
  SharedOpportunityType,
  VerificationCaseStatus,
  VerificationStatus,
} from '@/types/operator';

export type Tone = 'slate' | 'amber' | 'emerald' | 'red' | 'blue' | 'violet';

export const TONE_CLASSES: Record<Tone, string> = {
  slate: 'bg-slate-100 text-slate-700',
  amber: 'bg-amber-50 text-amber-700',
  emerald: 'bg-emerald-50 text-emerald-700',
  red: 'bg-red-50 text-red-700',
  blue: 'bg-sky-50 text-sky-700',
  violet: 'bg-violet-50 text-violet-700',
};

interface Meta {
  label: string;
  tone: Tone;
  description?: string;
}

export const CATEGORY_LABELS: Record<OperatorPropertyCategory, string> = {
  residential: 'Residential Property',
  short_let: 'Short Let',
  hostel: 'Hostel',
};

export const CATEGORY_DESCRIPTIONS: Record<OperatorPropertyCategory, string> = {
  residential: 'Landlord/owner-managed flats, self-contains, room & parlour, duplexes and similar long-term rentals.',
  short_let: 'Serviced apartments and homes rented by the night, week or month, operated by you or your business.',
  hostel: 'Student or worker hostels with rooms or bedspaces priced per session, semester, term or month.',
};

export const SHARED_TYPE_LABELS: Record<SharedOpportunityType, string> = {
  private_room: 'Private Room in an Occupied Home',
  shared_room_bedspace: 'Shared Room / Bedspace in an Occupied Home',
};

export const PUBLICATION_STATUS_META: Record<PublicationStatus, Meta> = {
  draft: { label: 'Draft', tone: 'slate', description: 'Not yet submitted for verification.' },
  submitted: {
    label: 'Pending Verification',
    tone: 'amber',
    description: 'Submitted and waiting for your Veriq Agent to start verification.',
  },
  verification_in_progress: {
    label: 'Verification in Progress',
    tone: 'blue',
    description: 'Your Veriq Agent is completing checks, intelligence and media review.',
  },
  needs_correction: {
    label: 'Needs Correction',
    tone: 'red',
    description: 'Your Veriq Agent needs you to correct or complete some details before verification continues.',
  },
  ready_to_publish: {
    label: 'Verified / Ready to Publish',
    tone: 'violet',
    description: 'Verification is complete. Your Veriq Agent publishes the listing.',
  },
  published: { label: 'Published', tone: 'emerald', description: 'Live on Veriq.' },
  suspended: {
    label: 'Suspended',
    tone: 'red',
    description: 'Temporarily removed from public view by Veriq.',
  },
  archived: { label: 'Archived', tone: 'slate', description: 'No longer an active property record.' },
};

export const VERIFICATION_STATUS_META: Record<VerificationStatus, Meta> = {
  not_started: { label: 'Not started', tone: 'slate' },
  pending: { label: 'Pending verification', tone: 'amber' },
  in_review: { label: 'In review', tone: 'blue' },
  needs_more_information: { label: 'Needs more information', tone: 'red' },
  verified: { label: 'Verified', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'red' },
  suspended: { label: 'Suspended', tone: 'red' },
};

export const CASE_STATUS_META: Record<VerificationCaseStatus, Meta> = {
  pending: { label: 'Waiting for Agent', tone: 'amber' },
  in_progress: { label: 'Agent verifying', tone: 'blue' },
  needs_correction: { label: 'Correction requested', tone: 'red' },
  ready_to_publish: { label: 'Ready to publish', tone: 'violet' },
  published: { label: 'Published', tone: 'emerald' },
  suspended: { label: 'Suspended', tone: 'red' },
  closed: { label: 'Closed', tone: 'slate' },
};

export const IDENTITY_STATUS_META: Record<OperatorIdentityStatus, Meta> = {
  account_submitted: {
    label: 'Account Submitted',
    tone: 'slate',
    description:
      'Basic account details received. Upload your government-issued ID as verification evidence on your first submission so your Veriq Agent can verify your identity.',
  },
  identity_pending: {
    label: 'Identity Verification Pending',
    tone: 'amber',
    description: 'Your identity evidence is waiting for Veriq review.',
  },
  identity_verified: {
    label: 'Identity Verified',
    tone: 'emerald',
    description: 'Your identity has been verified. Property authority is still verified per submission.',
  },
  identity_rejected: {
    label: 'Identity Not Verified',
    tone: 'red',
    description: 'Veriq could not verify your identity. Upload clearer identity evidence and contact your Veriq Agent.',
  },
};

export const REVISION_STATUS_META: Record<RevisionStatus, Meta> = {
  pending: { label: 'Sent for Agent review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'emerald' },
  rejected: { label: 'Not approved', tone: 'red' },
  withdrawn: { label: 'Withdrawn', tone: 'slate' },
};

export const REVISION_KIND_LABELS: Record<RevisionKind, string> = {
  edit: 'Details correction',
  correction_request: 'Correction request',
  intelligence_review_request: 'Intelligence review request',
  address_correction: 'Address correction',
};

export const MEDIA_STATE_META: Record<MediaSectionState, Meta> = {
  satisfied: { label: 'Complete', tone: 'emerald' },
  at_limit: { label: 'Full (5 of 5)', tone: 'emerald' },
  missing: { label: 'Missing', tone: 'red' },
  pending_review: { label: 'Pending review', tone: 'amber' },
  not_applicable: { label: 'Not applicable (verified)', tone: 'violet' },
  optional: { label: 'Optional', tone: 'slate' },
};

export const MEDIA_REVIEW_META: Record<MediaReviewStatus, Meta> = {
  pending_review: { label: 'Pending review', tone: 'amber' },
  approved: { label: 'Approved', tone: 'emerald' },
  rejected: { label: 'Rejected', tone: 'red' },
  superseded: { label: 'Replaced', tone: 'slate' },
  removed: { label: 'Removed', tone: 'slate' },
};

export const EVIDENCE_KIND_LABELS: Record<EvidenceKind, string> = {
  identity: 'Government-issued identity',
  business_registration: 'Business registration',
  ownership: 'Ownership / landlord-status evidence',
  operating_authority: 'Authority to operate',
  occupancy: 'Proof of current occupancy',
  permission_declaration: 'Signed sharing permission',
  landlord_confirmation: 'Landlord confirmation',
  other: 'Other supporting evidence',
};

export function formatDateTime(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' });
}

export function formatDate(value: string | null | undefined) {
  if (!value) return 'Not recorded';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Not recorded';
  return date.toLocaleDateString('en-NG', { dateStyle: 'medium' });
}

export function humanize(value: string) {
  return value.replace(/_/g, ' ').replace(/^\w/, (letter) => letter.toUpperCase());
}

/** A Unit needs reconfirmation when it is Available and the prompt was sent or the deadline is within 24 hours. */
export function needsReconfirmation(record: {
  availabilityStatus: string;
  freshnessExpiresAt: string | null;
  reconfirmPromptedAt: string | null;
}) {
  if (record.availabilityStatus !== 'available') return false;
  if (record.reconfirmPromptedAt) return true;
  if (!record.freshnessExpiresAt) return false;
  return new Date(record.freshnessExpiresAt).getTime() - Date.now() < 24 * 3_600_000;
}
