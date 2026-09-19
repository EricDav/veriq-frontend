import Link from 'next/link';
import { ArrowRight, CheckCircle, Gift, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { formatNaira } from './format';

/** Pre-unlock call to action with the effective fee (Free / ₦0 when active) and wallet-credit refund disclosure. */
export function LockedUnlockCallout({
  price,
  isFree,
  covers,
  onUnlock,
  isAuthenticated,
}: {
  price: number;
  isFree: boolean;
  covers: string[];
  onUnlock: () => void;
  isAuthenticated: boolean;
}) {
  return (
    <section className="card overflow-hidden">
      <div className="bg-navy-900 p-5 text-white sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <span className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-emerald-400/15 text-emerald-300">
              {isFree ? <Gift className="h-5 w-5" /> : <Lock className="h-5 w-5" />}
            </span>
            <div>
              <p className="text-xs uppercase tracking-wider text-white/50">Unlock fee</p>
              <p className="font-display text-2xl font-black">{isFree ? 'Free · ₦0' : formatNaira(price)}</p>
            </div>
          </div>
          <button type="button" onClick={onUnlock} className="btn-primary !py-3">
            {isFree ? <Gift className="h-4 w-4" /> : <Lock className="h-4 w-4" />}
            {isAuthenticated ? (isFree ? 'Unlock free' : 'Unlock full details') : 'Review unlock'}
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </div>
      <div className="space-y-4 p-5 sm:p-6">
        <ul className="grid gap-2 sm:grid-cols-2">
          {covers.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm text-navy-800"><CheckCircle className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {item}</li>
          ))}
        </ul>
        <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3 py-2 text-xs leading-5 text-emerald-900">
          <Wallet className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-600" />
          Any Veriq Wallet credit is applied automatically at checkout. Approved refunds for qualifying problems are credited to your Veriq Wallet, not paid as cash.
        </p>
        <p className="flex items-start gap-2 text-xs leading-5 text-slate-500">
          <ShieldCheck className="mt-0.5 h-4 w-4 flex-shrink-0" />
          An unlock buys time-limited access to verified information. It is not a reservation and does not guarantee a successful rental or purchase.{' '}
          <Link href="/refund-policy" className="font-semibold text-veriq-secondary hover:underline">Refund Policy</Link>
        </p>
      </div>
    </section>
  );
}
