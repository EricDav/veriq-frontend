import { CheckCircle2, Scale, UserCheck, XCircle } from 'lucide-react';
import type { RefundAgentConfirmation, RefundEligibility } from '@/types/renter';
import { formatDateTime } from './format';

/** Each part of the launch refund rule, in the renter's own terms (Master Blueprint §5). */
const TESTS: Array<{ key: keyof RefundEligibility; label: string; met: string; notMet: string }> = [
  {
    key: 'availableAtPayment',
    label: 'The unit was Available when you paid',
    met: 'Veriq recorded the unit as available at the moment of payment.',
    notMet: 'Veriq’s record shows the unit was not available when you paid.',
  },
  {
    key: 'unavailableNow',
    label: 'It is confirmed Unavailable now',
    met: 'The listing has no available unit at the moment we checked.',
    notMet: 'The listing still has an available unit.',
  },
  {
    key: 'renterDidNotTake',
    label: 'You did not take the unit',
    met: 'No “I took it” outcome is recorded against this unlock.',
    notMet: 'You told us you took this unit, so the unlock did its job.',
  },
  {
    key: 'requestedBeforeExpiry',
    label: 'You asked before your access expired',
    met: 'Your request arrived inside the refund window.',
    notMet: 'Your request arrived after your access had already expired.',
  },
];

/**
 * The refund eligibility breakdown and the Veriq Agent's confirmation, shown to the renter (Master Blueprint §5).
 * Meeting the rule is not the decision itself: the Agent confirms the availability change, or Admin decides.
 */
export function RefundEligibilityBreakdown({
  eligibility,
  agentConfirmation,
  launchRule,
}: {
  eligibility: RefundEligibility | null;
  agentConfirmation: RefundAgentConfirmation | null;
  launchRule?: string;
}) {
  if (!eligibility) return null;
  return (
    <section className="card space-y-4 p-5" aria-labelledby="refund-eligibility-heading">
      <div className="flex items-start gap-2.5">
        <Scale className="mt-0.5 h-4 w-4 flex-shrink-0 text-veriq-secondary" />
        <div className="min-w-0">
          <h2 id="refund-eligibility-heading" className="font-display text-sm font-bold text-navy-900">
            How your request measures against the launch refund rule
          </h2>
          {launchRule && <p className="mt-1 text-xs leading-5 text-slate-500">{launchRule}</p>}
        </div>
      </div>

      <ul className="space-y-2">
        {TESTS.map((test) => {
          const passed = eligibility[test.key] === true;
          return (
            <li key={test.key} className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3">
              {passed ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
              ) : (
                <XCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-slate-400" />
              )}
              <div className="min-w-0">
                <p className="text-sm font-semibold text-navy-900">{test.label}</p>
                <p className="text-xs leading-5 text-slate-500">{passed ? test.met : test.notMet}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <div
        className={`rounded-xl border p-3 text-sm leading-6 ${
          eligibility.meetsLaunchRule
            ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
            : 'border-amber-200 bg-amber-50 text-amber-900'
        }`}
      >
        {eligibility.meetsLaunchRule
          ? 'Your request meets every part of the launch rule. The Veriq Agent confirms the availability change, or Admin decides in your favour.'
          : 'Your request does not meet every part of the launch rule, so Admin will look at it on its own merits. Other qualifying problems can still justify a refund.'}
      </div>

      {agentConfirmation && (
        <div className="flex items-start gap-2.5 rounded-xl border border-slate-200 p-3">
          <UserCheck className="mt-0.5 h-4 w-4 flex-shrink-0 text-veriq-secondary" />
          <div className="min-w-0">
            <p className="text-sm font-semibold text-navy-900">
              {agentConfirmation.decision === 'confirmed'
                ? 'The Veriq Agent confirmed the availability change'
                : 'The Veriq Agent disputed the availability claim — Admin will decide'}
            </p>
            {agentConfirmation.note && <p className="mt-0.5 text-xs leading-5 text-slate-600">{agentConfirmation.note}</p>}
            <p className="mt-1 text-[11px] text-slate-400">{formatDateTime(agentConfirmation.at)}</p>
          </div>
        </div>
      )}

      <p className="text-[11px] text-slate-400">Checked {formatDateTime(eligibility.checkedAt)}</p>
    </section>
  );
}
