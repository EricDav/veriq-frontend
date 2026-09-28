import { FileCheck2, Scale } from 'lucide-react';
import type { SaleDocumentStatus } from '@/types/renter';
import { formatDate } from './format';

const AVAILABILITY_STYLES: Record<string, string> = {
  available: 'bg-emerald-50 text-emerald-700',
  sighted: 'bg-blue-50 text-blue-700',
  not_available: 'bg-slate-100 text-slate-600',
  not_presented: 'bg-amber-50 text-amber-700',
  requires_further_verification: 'bg-orange-50 text-orange-700',
};

const LEGAL_STYLES: Record<string, string> = {
  not_performed: 'text-slate-500',
  requested: 'text-blue-700',
  completed_no_issues: 'text-emerald-700',
  completed_issues_found: 'text-red-700',
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
    <section className="card p-6">
      <h2 className="mb-1 flex items-center gap-2 font-display text-base font-bold text-navy-900"><FileCheck2 className="h-4 w-4 text-veriq-secondary" /> Document status</h2>
      <p className="mb-4 text-xs leading-5 text-slate-500">
        Statuses record what the Veriq Agent was shown or could confirm. Veriq never publishes the documents themselves.
      </p>

      <div className="mb-4 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-3 py-2.5 text-xs leading-5 text-amber-900">
        <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
        <span>
          <span className="font-semibold">A document sighted by a Veriq Agent is not a legal search.</span>{' '}
          {disclaimer ??
            'Sighting or availability does not mean a title is legally verified. An independent legal search is shown separately only where one was actually performed. Instruct your own lawyer and surveyor before paying for any property or land.'}
        </span>
      </div>

      {documents.length === 0 ? (
        <p className="text-sm text-veriq-muted">No document statuses have been recorded for this listing.</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {documents.map((doc) => (
            <li key={`${doc.documentType}-${doc.label}`} className="py-3">
              <div className="flex flex-col gap-1.5 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                <p className="text-sm font-medium text-navy-900">{doc.label}</p>
                <span className={`self-start whitespace-nowrap rounded-full px-2.5 py-1 text-[11px] font-semibold ${AVAILABILITY_STYLES[doc.availability] ?? 'bg-slate-100 text-slate-600'}`}>{doc.availabilityLabel}</span>
              </div>
              <p className={`mt-1 text-xs ${LEGAL_STYLES[doc.legalSearchStatus] ?? 'text-slate-500'}`}>{doc.legalSearchLabel}</p>
              {doc.checkedAt && <p className="text-[11px] text-slate-400">Last checked {formatDate(doc.checkedAt)}</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
