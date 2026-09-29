'use client';

import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { FileCheck2, FileSignature, Footprints, Image as ImageIcon, Landmark, Send, ShieldCheck } from 'lucide-react';
import { ownerSaleListingsApi } from '@/lib/api/operator';
import type { EvidenceKind, SaleOwnerView } from '@/types/operator';
import { LoadingSpinner, PageLoader } from '@/components/ui/LoadingSpinner';
import { useToast } from '@/components/ui/Toast';
import {
  EvidenceUploader,
  IssueList,
  ListingDeclarationPanel,
  MediaChecklist,
  Notice,
  OperatorGuard,
  PUBLICATION_STATUS_META,
  SectionCard,
  StatusBadge,
  errorMessage,
  formatDateTime,
  parseApiError,
  useListingDeclaration,
} from '@/components/listing-forms';
import { SaleDocumentStatusList } from '@/components/renter/SaleDocumentStatusList';
import { formatNaira } from '@/components/renter/format';
import { buttonClass } from '@/components/ui';

const SUBTYPE_LABELS: Record<string, string> = { built_property: 'Built Property', land: 'Land' };

const PARTY_TONE: Record<string, 'slate' | 'amber' | 'emerald' | 'red'> = {
  not_required: 'slate',
  pending: 'amber',
  verified: 'emerald',
  failed: 'red',
};

/** The documents the owner supplies. Veriq reviews ownership and authority to sell before publication (§6). */
const SALE_EVIDENCE_KINDS: Array<{ kind: EvidenceKind; required: boolean; help: string }> = [
  {
    kind: 'ownership',
    required: true,
    help: 'A document showing you own this property — for example a deed of assignment, certificate of occupancy or survey plan.',
  },
  {
    kind: 'authority_to_sell',
    required: false,
    help: 'Only if you are selling on behalf of the owner: the written authority that allows you to do so.',
  },
  {
    kind: 'sale_document',
    required: false,
    help: 'Any other sale document you want Veriq to review, such as a governor’s consent or a receipt of purchase.',
  },
];

/** Statuses that the owner may still edit and re-submit. */
const OWNER_EDITABLE = ['draft', 'needs_correction'];

/**
 * The owner's view of their sale submission (Master Blueprint §6): what they sent, what Veriq still needs, the
 * signed representation agreement and the recorded outcome. Internal review notes stay with Veriq.
 */
function OwnerSaleSubmission() {
  const { id } = useParams<{ id: string }>();
  const { success } = useToast();
  const declaration = useListingDeclaration();
  const [data, setData] = useState<SaleOwnerView | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<{ message: string; issues: ReturnType<typeof parseApiError>['issues'] } | null>(null);

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await ownerSaleListingsApi.get(id);
      setData(res.data);
    } catch (err) {
      setLoadError(errorMessage(err, 'Could not load this sale submission'));
    }
  }, [id]);

  useEffect(() => {
    if (id) void load();
  }, [id, load]);

  const submit = async () => {
    if (!declaration.payload) {
      setSubmitError({ message: 'Accept the Veriq listing declaration to submit', issues: [] });
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await ownerSaleListingsApi.submit(id, declaration.payload);
      setData(res.data);
      success(res.message || 'Submitted to Veriq');
      declaration.reset();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (caught) {
      const parsed = parseApiError(caught, 'This submission could not be sent');
      setSubmitError({ message: parsed.message, issues: parsed.issues });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadError) {
    return (
      <div className="mx-auto max-w-2xl space-y-3">
        <Notice tone="error" title="This sale submission could not be loaded">
          <p>{loadError}</p>
          <button type="button" onClick={() => void load()} className="mt-2 text-sm font-semibold underline">
            Try again
          </button>
        </Notice>
        <Link href="/dashboard/operator/sales" className={buttonClass('secondary')}>
          Back to my sale submissions
        </Link>
      </div>
    );
  }

  if (!data) return <PageLoader />;

  const { sale, property, agreement } = data;
  const publication = PUBLICATION_STATUS_META[sale.publicationStatus];
  const canSubmit = OWNER_EDITABLE.includes(sale.publicationStatus) && !sale.saleOutcome;

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <header className="space-y-2">
        <Link href="/dashboard/operator/sales" className="text-sm font-medium text-primary hover:underline">
          Back to my sale submissions
        </Link>
        <h1 className="flex items-center gap-2 font-display text-2xl font-bold text-foreground">
          <Landmark className="h-5 w-5 text-primary" /> {sale.title}
        </h1>
        <p className="text-sm text-muted-foreground">
          {SUBTYPE_LABELS[sale.subtype] ?? sale.subtype} · {formatNaira(sale.askingPrice)} · {property.area},{' '}
          {property.city}, {property.state}
        </p>
        <div className="flex flex-wrap gap-1.5">
          <StatusBadge tone={publication.tone}>{publication.label}</StatusBadge>
          <StatusBadge tone={PARTY_TONE[sale.ownerIdentityStatus] ?? 'slate'}>
            Owner identity: {sale.ownerIdentityStatus.replace(/_/g, ' ')}
          </StatusBadge>
          <StatusBadge tone={PARTY_TONE[sale.authorityToSellStatus] ?? 'slate'}>
            Authority to sell: {sale.authorityToSellStatus.replace(/_/g, ' ')}
          </StatusBadge>
          {sale.saleOutcome && <StatusBadge tone="slate">Sale {sale.saleOutcome}</StatusBadge>}
        </div>
      </header>

      {sale.correctionNote && (
        <Notice tone="warning" title="Veriq asked you to correct something">
          <p>{sale.correctionNote}</p>
          <p className="mt-1 text-xs">Make the change, then re-accept the declaration below and send it again.</p>
        </Notice>
      )}

      {sale.publicationStatus === 'published' && (
        <Notice tone="success" title="Your property is live">
          <p>
            Buyers can view your listing for free and enquire through Veriq. Your own contact details are not shown, so
            every enquiry reaches your Veriq Agent first.
          </p>
        </Notice>
      )}

      <SectionCard title="Where your submission stands" description="Everything below comes from Veriq's own checks.">
        <dl className="grid gap-3 sm:grid-cols-2">
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Submitted</dt>
            <dd className="mt-0.5 text-sm text-foreground">{formatDateTime(sale.submittedAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Veriq&apos;s physical visit</dt>
            <dd className="mt-0.5 flex items-center gap-1.5 text-sm text-foreground">
              <Footprints className="h-3.5 w-3.5 text-primary" />
              {sale.physicalVisitAt ? formatDateTime(sale.physicalVisitAt) : 'Not done yet'}
            </dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Published</dt>
            <dd className="mt-0.5 text-sm text-foreground">{formatDateTime(sale.publishedAt)}</dd>
          </div>
          <div>
            <dt className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">Completed sale</dt>
            <dd className="mt-0.5 text-sm text-foreground">
              {sale.salePriceAmount === null ? 'Not recorded' : formatNaira(sale.salePriceAmount)}
              {sale.commissionAmount !== null && (
                <span className="block text-xs text-muted-foreground">Commission {formatNaira(sale.commissionAmount)}</span>
              )}
            </dd>
          </div>
        </dl>

        {data.outstanding.length > 0 ? (
          <div className="rounded-xl border border-[#ffffff18] p-3">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Still needed before publication</p>
            <ul className="mt-1 ml-4 list-disc space-y-0.5 text-sm text-muted-foreground">
              {data.outstanding.map((blocker) => (
                <li key={blocker.code}>{blocker.message}</li>
              ))}
            </ul>
          </div>
        ) : (
          <Notice tone="success">Nothing is outstanding. Veriq will publish once the final checks are done.</Notice>
        )}
      </SectionCard>

      <SectionCard
        title="Sales representation agreement"
        description="Veriq and you sign this before publication. It sets the success commission you pay only if a Veriq-generated sale completes."
      >
        {agreement ? (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center gap-2">
              <StatusBadge tone={agreement.status === 'signed' ? 'emerald' : 'amber'}>
                <FileSignature className="h-3 w-3" /> {agreement.status}
              </StatusBadge>
              <span className="text-sm text-foreground">Your commission: {agreement.commissionPercent}% of the sale price</span>
            </div>
            {agreement.signedAt ? (
              <p className="text-xs text-muted-foreground">
                Signed {formatDateTime(agreement.signedAt)}
                {agreement.signedByOwnerName ? ` as ${agreement.signedByOwnerName}` : ''}.
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Veriq has prepared the agreement. It is signed by both sides before your property is published.
              </p>
            )}
            {agreement.documentUrl && (
              <a
                href={agreement.documentUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-semibold text-primary hover:underline"
              >
                Open the signed agreement
              </a>
            )}
          </div>
        ) : (
          <Notice tone="info">
            Veriq prepares the agreement after reviewing your documents, and will talk you through the commission before
            anything is signed.
          </Notice>
        )}
      </SectionCard>

      <SectionCard
        title="Your documents"
        description="Stored privately for Veriq's review. They are never published, and buyers only ever see the status of each one."
      >
        <EvidenceUploader
          ownerType="sale_listing"
          ownerId={sale.id}
          kinds={SALE_EVIDENCE_KINDS}
          records={data.myDocuments.map((doc) => ({
            id: doc.id,
            kind: doc.kind as EvidenceKind,
            fileName: doc.fileName,
            notes: doc.notes ?? null,
            createdAt: doc.createdAt,
          }))}
          onChanged={() => void load()}
        />
      </SectionCard>

      <SectionCard
        title="Document review"
        description="What Veriq was shown or could confirm for each document. A sighted document is not a legal search."
      >
        <SaleDocumentStatusList documents={data.documentStatuses} />
        {data.documentChecklist.length > 0 && data.documentStatuses.length === 0 && (
          <Notice tone="info">
            <p className="mb-1">Veriq will record a status against each of these once your documents are reviewed:</p>
            <ul className="ml-4 list-disc">
              {data.documentChecklist.map((type) => (
                <li key={type.key}>{type.label}</li>
              ))}
            </ul>
          </Notice>
        )}
      </SectionCard>

      <SectionCard
        title="Photos"
        description="Clear photos help buyers decide before they enquire. A front exterior image is used as the listing cover."
      >
        <span className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
          <ImageIcon className="h-3.5 w-3.5" /> Categories that do not apply to your property are marked Optional.
        </span>
        <MediaChecklist ownerType="sale_listing" ownerId={sale.id} onChanged={load} />
      </SectionCard>

      {canSubmit && (
        <SectionCard
          title={sale.publicationStatus === 'needs_correction' ? 'Send your correction' : 'Submit to Veriq'}
          description="You accept the declaration each time you submit, including after a correction."
        >
          {submitError && <IssueList message={submitError.message} issues={submitError.issues} />}
          <ListingDeclarationPanel state={declaration} idPrefix="owner-sale-declaration" disabled={submitting} />
          <div className="flex items-center justify-between gap-3">
            <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <ShieldCheck className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
              A Veriq Agent will call you to arrange the physical visit after you submit.
            </p>
            <button
              type="button"
              className={buttonClass('primary', 'default', 'flex-shrink-0')}
              disabled={submitting || !declaration.canSubmit}
              onClick={() => void submit()}
            >
              {submitting ? <LoadingSpinner size="sm" /> : <Send className="h-4 w-4" />}
              {sale.publicationStatus === 'needs_correction' ? 'Re-submit to Veriq' : 'Submit to Veriq'}
            </button>
          </div>
        </SectionCard>
      )}

      {!canSubmit && !sale.saleOutcome && (
        <Notice tone="info" title="With Veriq now">
          <p className="flex items-start gap-1.5">
            <FileCheck2 className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" />
            Your submission is being verified. Veriq will contact you if anything needs correcting.
          </p>
        </Notice>
      )}
    </div>
  );
}

export default function OwnerSaleSubmissionPage() {
  return (
    <OperatorGuard>
      <OwnerSaleSubmission />
    </OperatorGuard>
  );
}
