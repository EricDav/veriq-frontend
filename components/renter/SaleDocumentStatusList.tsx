import { FileCheck2, Scale } from 'lucide-react';
import type { SaleDocumentStatus } from '@/types/renter';
import { cn } from '@/lib/utils';
import { Badge, Notice, Panel, type BadgeTone } from '@/components/ui';
import { formatDate } from './format';

const AVAILABILITY_TONES: Record<string, BadgeTone> = {
  available: 'success',
  sighted: 'neutral',
  not_available: 'neutral',
  not_presented: 'amber',
  requires_further_verification: 'amber',
};

const LEGAL_STYLES: Record<string, string> = {
  not_performed: 'text-muted-foreground',
  requested: 'text-muted-foreground',
  completed_no_issues: 'text-[#6ee7b7]',
  completed_issues_found: 'text-[#fda4af]',
};

/**
 * Sale document STATUSES only (Master Blueprint §6). The buyer view is free, so these statuses are public, but the
 * source documents, the Agent's private notes and the owner's identity evidence are never shown.
 */
export function SaleDocumentStatusList({
  documents,
  disclaimer,
}: {
  documents: SaleDocumentStatus[];
  /** The review disclaimer as the API words it; a local fallback keeps the warning present either way. */
  disclaimer?: string;
}) {
  return (
    <Panel as="section">
      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-semibold text-foreground">
        <FileCheck2 aria-hidden="true" className="h-4 w-4 text-primary" /> Document status
      </h2>
      <p className="mb-4 text-ui-sm leading-6 text-muted-foreground">
        Statuses record what the Veriq Agent was shown or could confirm. Veriq never publishes the documents themselves.
      </p>

      <Notice
        tone="amber"
        className="mb-4"
        icon={<Scale className="h-4 w-4" />}
        title="A document sighted by a Veriq Agent is not a legal search"
      >
        {disclaimer ??
          'Sighting or availability does not mean a title is legally verified. An independent legal search is shown separately only where one was actually performed. Instruct your own lawyer and surveyor before paying for any property or land.'}
      </Notice>

      {documents.length === 0 ? (
        <p className="text-ui-md text-muted-foreground">No document statuses have been recorded for this listing.</p>
      ) : (
        <ul>
          {documents.map((doc) => (
            <li key={`${doc.documentType}-${doc.label}`} className="border-b border-[#ffffff10] py-3.5 last:border-b-0">
              <div className="flex flex-col gap-1.5 wide:flex-row wide:items-start wide:justify-between wide:gap-4">
                <p className="text-ui-md font-medium text-foreground">{doc.label}</p>
                <Badge tone={AVAILABILITY_TONES[doc.availability] ?? 'neutral'} className="self-start whitespace-nowrap">
                  {doc.availabilityLabel}
                </Badge>
              </div>
              <p className={cn('mt-1 text-ui-sm', LEGAL_STYLES[doc.legalSearchStatus] ?? 'text-muted-foreground')}>
                {doc.legalSearchLabel}
              </p>
              {doc.checkedAt && <p className="text-xs text-muted-foreground">Last checked {formatDate(doc.checkedAt)}</p>}
            </li>
          ))}
        </ul>
      )}
    </Panel>
  );
}
