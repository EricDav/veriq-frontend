'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { BadgeCheck, CheckCircle2, ShieldCheck, Upload } from 'lucide-react';
import { operatorAccountsApi } from '@/lib/api/operator';
import type { OperatorIdentityEvidenceKind, OperatorIdentityEvidenceRecord } from '@/types/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import { FieldShell, Select } from '@/components/ui/Select';
import {
  Notice,
  OperatorGuard,
  PostingRequirementList,
  SectionCard,
  StatusBadge,
  errorMessage,
  formatDateTime,
  usePostingReadiness,
} from '@/components/listing-forms';

const EVIDENCE_KINDS = [
  { value: 'government_id', label: 'Valid government ID' },
  { value: 'selfie_with_id', label: 'Selfie holding that government ID' },
];

const ID_TYPES = [
  { value: 'nin', label: 'National Identification Number (NIN) slip' },
  { value: 'drivers_licence', label: "Driver's licence" },
  { value: 'voters_card', label: "Voter's card" },
  { value: 'international_passport', label: 'International passport' },
  { value: 'other', label: 'Another government-issued ID' },
];

const IDENTITY_STATUS_TONE: Record<string, 'slate' | 'amber' | 'emerald' | 'red'> = {
  identity_unverified: 'slate',
  identity_pending: 'amber',
  identity_verified: 'emerald',
  identity_rejected: 'red',
};

const DOCUMENT_ACCEPT = 'application/pdf,image/jpeg,image/png,image/webp,image/heic,image/heif';
const PHOTO_ACCEPT = 'image/jpeg,image/png,image/webp,image/heic,image/heif';

/**
 * The Operator's own verification checklist (Master Blueprint §3). Signup needs only category, name, email and the
 * Operator Terms — phone is optional there — but before posting the Operator needs phone OTP, a valid government ID
 * and a selfie holding that ID. This page walks through whatever is still missing. Veriq stores the files privately
 * and never shows them back; only what Veriq holds is listed.
 */
function OperatorVerificationChecklist() {
  const { success, error: toastError } = useToast();
  const readiness = usePostingReadiness();
  const [evidence, setEvidence] = useState<OperatorIdentityEvidenceRecord[]>([]);
  const [evidenceError, setEvidenceError] = useState<string | null>(null);
  const [kind, setKind] = useState('');
  const [idType, setIdType] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [notes, setNotes] = useState('');
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const loadEvidence = useCallback(async () => {
    setEvidenceError(null);
    try {
      const res = await operatorAccountsApi.identityEvidence();
      setEvidence(res.data);
    } catch (err) {
      setEvidenceError(errorMessage(err, 'Could not load what Veriq already holds'));
    }
  }, []);

  useEffect(() => {
    void loadEvidence();
  }, [loadEvidence]);

  const upload = async () => {
    setFormError(null);
    if (!kind) {
      setFormError('Choose which item you are uploading.');
      return;
    }
    if (!file) {
      setFormError('Attach the file.');
      return;
    }
    if (kind === 'government_id' && !idType) {
      setFormError('Tell Veriq which government ID this is.');
      return;
    }
    setUploading(true);
    try {
      const res = await operatorAccountsApi.submitIdentityEvidence({
        kind: kind as OperatorIdentityEvidenceKind,
        file,
        ...(kind === 'government_id' && idType ? { idType } : {}),
        ...(kind === 'government_id' && idNumber.trim() ? { idNumber: idNumber.trim() } : {}),
        ...(notes.trim() ? { notes: notes.trim() } : {}),
      });
      success(res.message || 'Saved privately for verification');
      setKind('');
      setIdType('');
      setIdNumber('');
      setNotes('');
      setFile(null);
      await Promise.all([readiness.reload(), loadEvidence()]);
    } catch (err) {
      const message = errorMessage(err, 'That file could not be saved');
      setFormError(message);
      toastError(message);
    } finally {
      setUploading(false);
    }
  };

  if (readiness.loading && !readiness.readiness) return <PageLoader />;

  if (!readiness.readiness) {
    return (
      <div className="mx-auto max-w-2xl">
        <Notice tone="error" title="Your verification status could not be loaded">
          <p>{errorMessage(readiness.error, 'Try again in a moment.')}</p>
          <button type="button" onClick={() => void readiness.reload()} className="mt-2 text-sm font-semibold underline">
            Try again
          </button>
        </Notice>
      </div>
    );
  }

  const data = readiness.readiness;
  const outstanding = data.requirements.filter((item) => !item.satisfied).length;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <header className="space-y-2">
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-navy-900">
          <ShieldCheck className="h-5 w-5 text-veriq-secondary" /> My Operator verification
        </h1>
        <p className="text-sm leading-6 text-slate-500">
          Veriq verifies who you are before you post a listing. This confirms the person, not automatic ownership of
          every property — each listing is still verified on its own.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <StatusBadge tone={IDENTITY_STATUS_TONE[data.identityStatus] ?? 'slate'}>
            <BadgeCheck className="h-3 w-3" /> {data.identityStatus.replace(/_/g, ' ')}
          </StatusBadge>
          {data.canPost ? (
            <StatusBadge tone="emerald">
              <CheckCircle2 className="h-3 w-3" /> You can post
            </StatusBadge>
          ) : (
            <StatusBadge tone="amber">
              {outstanding} step{outstanding === 1 ? '' : 's'} left before you can post
            </StatusBadge>
          )}
        </div>
      </header>

      {data.canPost && (
        <Notice tone="success" title="Verification complete">
          <p>
            You can post listings now.{' '}
            <Link href="/dashboard/operator/properties/new" className="font-semibold underline">
              Add a property
            </Link>{' '}
            or{' '}
            <Link href="/dashboard/operator/sales/new" className="font-semibold underline">
              submit a property for sale
            </Link>
            .
          </p>
        </Notice>
      )}

      {data.furtherEvidenceRequested && (
        <Notice tone="warning" title="Veriq asked for a little more">
          <p>{data.furtherEvidenceNote ?? 'Veriq needs limited further evidence to clarify your identity, role or authority.'}</p>
          {data.furtherEvidenceRequestedAt && (
            <p className="mt-1 text-xs">Asked {formatDateTime(data.furtherEvidenceRequestedAt)}</p>
          )}
        </Notice>
      )}

      {data.identityReviewNote && (
        <Notice tone="info" title="Note from your reviewer">
          <p>{data.identityReviewNote}</p>
        </Notice>
      )}

      <SectionCard title="Before you can post" description="Each step is checked again by Veriq when you submit a listing.">
        <PostingRequirementList readiness={data} />
      </SectionCard>

      <SectionCard
        title="Upload your identity evidence"
        description="Your ID and selfie are stored privately for verification. Veriq restricts who can open them and never publishes them."
      >
        <div className="space-y-3">
          <Select
            id="evidence-kind"
            label="What are you uploading?"
            options={EVIDENCE_KINDS}
            value={kind}
            onValueChange={(value) => {
              setKind(value);
              setIdType('');
              setIdNumber('');
            }}
            required
          />

          {kind === 'government_id' && (
            <div className="grid gap-3 sm:grid-cols-2">
              <Select
                id="evidence-id-type"
                label="Which government ID is it?"
                options={ID_TYPES}
                value={idType}
                onValueChange={setIdType}
                required
              />
              <FieldShell
                htmlFor="evidence-id-number"
                label="ID number"
                optional
                hint="Veriq keeps only the last four characters so your file can be matched to the right ID."
              >
                <input
                  id="evidence-id-number"
                  className="input"
                  maxLength={40}
                  value={idNumber}
                  onChange={(event) => setIdNumber(event.target.value)}
                />
              </FieldShell>
            </div>
          )}

          {kind === 'selfie_with_id' && (
            <Notice tone="info">
              Hold the same government ID next to your face, with your face and the ID both clearly readable in one
              photo.
            </Notice>
          )}

          <FieldShell
            htmlFor="evidence-file"
            label={kind === 'selfie_with_id' ? 'Photo (JPG, PNG, WebP or HEIC, max 10 MB)' : 'File (PDF or photo, max 10 MB)'}
            required
          >
            <input
              id="evidence-file"
              type="file"
              accept={kind === 'selfie_with_id' ? PHOTO_ACCEPT : DOCUMENT_ACCEPT}
              className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-100 file:px-3 file:py-2 file:text-sm file:font-semibold"
              onChange={(event) => setFile(event.target.files?.[0] ?? null)}
            />
          </FieldShell>

          <FieldShell htmlFor="evidence-notes" label="Anything Veriq should know" optional>
            <input
              id="evidence-notes"
              className="input"
              maxLength={500}
              value={notes}
              onChange={(event) => setNotes(event.target.value)}
            />
          </FieldShell>

          {formError && <Notice tone="error">{formError}</Notice>}

          <div className="flex justify-end">
            <button type="button" onClick={() => void upload()} disabled={uploading} className="btn-primary !py-2.5">
              {uploading ? <LoadingSpinner size="sm" /> : <Upload className="h-4 w-4" />} Send to Veriq
            </button>
          </div>
        </div>
      </SectionCard>

      <SectionCard title="What Veriq already holds" description="File names and dates only — the files themselves are never shown back.">
        {evidenceError ? (
          <Notice tone="error">
            <p>{evidenceError}</p>
            <button type="button" onClick={() => void loadEvidence()} className="mt-2 text-sm font-semibold underline">
              Try again
            </button>
          </Notice>
        ) : evidence.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-6 text-center text-sm text-slate-500">
            Nothing uploaded yet.
          </p>
        ) : (
          <ul className="space-y-2">
            {evidence.map((item) => (
              <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 rounded-xl border border-slate-200 p-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-navy-900">
                    {item.kind === 'selfie_with_id' ? 'Selfie holding your government ID' : 'Government ID'}
                  </p>
                  <p className="truncate text-xs text-slate-500">{item.fileName ?? 'File on record'}</p>
                  {item.notes && <p className="truncate text-xs text-slate-500">{item.notes}</p>}
                </div>
                <p className="flex-shrink-0 text-[11px] text-slate-400">{formatDateTime(item.createdAt)}</p>
              </li>
            ))}
          </ul>
        )}
      </SectionCard>
    </div>
  );
}

export default function OperatorVerificationPage() {
  return (
    <OperatorGuard>
      <OperatorVerificationChecklist />
    </OperatorGuard>
  );
}
