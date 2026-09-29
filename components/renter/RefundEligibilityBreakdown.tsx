import { CheckCircle2, Scale, UserCheck, XCircle } from 'lucide-react';
import type { RefundAgentConfirmation, RefundEligibility } from '@/types/renter';
import { Eyebrow, Notice, Panel } from '@/components/ui';
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
    <Panel as="section" className="space-y-5" aria-labelledby="refund-eligibility-heading">
      <div className="flex items-start gap-3">
        <Scale aria-hidden="true" className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
        <div className="min-w-0">
          <Eyebrow>Launch refund rule</Eyebrow>
          <h2 id="refund-eligibility-heading" className="font-display text-base font-semibold text-foreground">
            How your request measures against the launch refund rule
          </h2>
          {launchRule && <p className="mt-1 text-ui-sm leading-6 text-muted-foreground">{launchRule}</p>}
        </div>
      </div>

      <ul className="space-y-3">
        {TESTS.map((test) => {
          const passed = eligibility[test.key] === true;
          return (
            <li key={test.key} className="flex items-start gap-3 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
              {passed ? (
                <CheckCircle2 aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
              ) : (
                <XCircle aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-muted-foreground" />
              )}
              <div className="min-w-0">
                <p className="text-ui-md font-semibold text-foreground">
                  {test.label}
                  <span className="sr-only">{passed ? ' — met' : ' — not met'}</span>
                </p>
                <p className="text-ui-sm leading-6 text-muted-foreground">{passed ? test.met : test.notMet}</p>
              </div>
            </li>
          );
        })}
      </ul>

      <Notice
        tone={eligibility.meetsLaunchRule ? 'neutral' : 'amber'}
        title={eligibility.meetsLaunchRule ? 'Every part of the rule is met' : 'Admin will decide this one on its merits'}
      >
        {eligibility.meetsLaunchRule
          ? 'The Veriq Agent confirms the availability change, or Admin decides in your favour.'
          : 'Your request does not meet every part of the launch rule, so Admin will look at it on its own merits. Other qualifying problems can still justify a refund.'}
      </Notice>

      {agentConfirmation && (
        <div className="flex items-start gap-3 rounded-unit border border-[#ffffff18] bg-[#070b1444] p-[17px]">
          <UserCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" />
          <div className="min-w-0">
            <p className="text-ui-md font-semibold text-foreground">
              {agentConfirmation.decision === 'confirmed'
                ? 'The Veriq Agent confirmed the availability change'
                : 'The Veriq Agent disputed the availability claim — Admin will decide'}
            </p>
            {agentConfirmation.note && (
              <p className="mt-0.5 text-ui-sm leading-6 text-muted-foreground">{agentConfirmation.note}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(agentConfirmation.at)}</p>
          </div>
        </div>
      )}

      <p className="text-xs text-muted-foreground">Checked {formatDateTime(eligibility.checkedAt)}</p>
    </Panel>
  );
}
