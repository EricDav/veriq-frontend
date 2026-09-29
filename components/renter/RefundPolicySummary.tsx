import { CheckCircle, Gift, Wallet, XCircle } from 'lucide-react';
import type { RefundPolicy } from '@/types/renter';
import { cn } from '@/lib/utils';
import { Notice } from '@/components/ui';

/** Qualifying and non-qualifying refund conditions with the wallet-credit destination (§14.2 step 4, §23.2). */
export function RefundPolicySummary({ policy, compact = false }: { policy: RefundPolicy; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <Notice icon={<Wallet className="h-5 w-5" />} title="Approved refunds become wallet credit">
        {policy.creditOnly}
      </Notice>
      <div className={cn('grid gap-4', !compact && 'wide:grid-cols-2')}>
        <div className="rounded-review border border-[#ffffff18] bg-[#070b1444] p-[22px]">
          <p className="mb-3 font-display text-base font-semibold text-foreground">Qualifies for review</p>
          <ul className="space-y-2">
            {policy.qualifying.map((item) => (
              <li key={item} className="flex items-start gap-2 text-ui-sm leading-6 text-muted-foreground">
                <CheckCircle aria-hidden="true" className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-primary" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-review border border-[#ffffff18] bg-[#070b1444] p-[22px]">
          <p className="mb-3 font-display text-base font-semibold text-foreground">Does not qualify</p>
          <ul className="space-y-2">
            {policy.nonQualifying.map((item) => (
              <li key={item} className="flex items-start gap-2 text-ui-sm leading-6 text-muted-foreground">
                <XCircle aria-hidden="true" className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-[#fda4af]" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="flex items-start gap-2 text-ui-sm leading-6 text-muted-foreground">
        <Gift aria-hidden="true" className="mt-1 h-3.5 w-3.5 flex-shrink-0" /> {policy.freeUnlock}
      </p>
    </div>
  );
}
