import { CheckCircle, Gift, Wallet, XCircle } from 'lucide-react';
import type { RefundPolicy } from '@/types/renter';

/** Qualifying and non-qualifying refund conditions with the wallet-credit destination (§14.2 step 4, §23.2). */
export function RefundPolicySummary({ policy, compact = false }: { policy: RefundPolicy; compact?: boolean }) {
  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
        <Wallet className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-600" />
        <p className="leading-6">{policy.creditOnly}</p>
      </div>
      <div className={`grid gap-4 ${compact ? '' : 'md:grid-cols-2'}`}>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-navy-900">Qualifies for review</p>
          <ul className="space-y-2">
            {policy.qualifying.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <CheckCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" /> {item}
              </li>
            ))}
          </ul>
        </div>
        <div className="rounded-xl border border-slate-200 bg-white p-4">
          <p className="mb-3 text-sm font-bold text-navy-900">Does not qualify</p>
          <ul className="space-y-2">
            {policy.nonQualifying.map((item) => (
              <li key={item} className="flex items-start gap-2 text-xs leading-5 text-slate-700">
                <XCircle className="mt-0.5 h-3.5 w-3.5 flex-shrink-0 text-red-400" /> {item}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
        <Gift className="mt-0.5 h-3.5 w-3.5 flex-shrink-0" /> {policy.freeUnlock}
      </p>
    </div>
  );
}
