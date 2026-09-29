import Link from 'next/link';
import { ArrowRight, CheckCircle, Gift, Lock, ShieldCheck, Wallet } from 'lucide-react';
import { Button, LockedBlock, Notice, Panel } from '@/components/ui';
import { formatNaira } from './format';

/**
 * The unlock boundary before payment: the prototype's dashed `.locked` block carrying the effective fee
 * (Free / ₦0 while a Free Unlock is active) and the wallet-credit refund disclosure.
 */
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
  const label = isAuthenticated ? (isFree ? 'Unlock free' : 'Unlock full details') : 'Review unlock';

  return (
    <Panel as="section" className="space-y-5">
      <LockedBlock
        icon={isFree ? <Gift className="h-8 w-8" /> : undefined}
        title={isFree ? 'Free · ₦0' : formatNaira(price)}
        action={
          <Button onClick={onUnlock}>
            {isFree ? <Gift aria-hidden="true" className="h-4 w-4" /> : <Lock aria-hidden="true" className="h-4 w-4" />}
            {label} {!isFree && `· ${formatNaira(price)}`}
            <ArrowRight aria-hidden="true" className="h-4 w-4" />
          </Button>
        }
      >
        The full picture is behind your unlock. Direct checkout · 24-hour access · refund credit applies
        automatically.
      </LockedBlock>

      <ul className="grid gap-2.5 wide:grid-cols-2">
        {covers.map((item) => (
          <li key={item} className="flex items-start gap-3 text-ui-md text-muted-foreground">
            <CheckCircle aria-hidden="true" className="mt-1 h-4 w-4 flex-shrink-0 text-primary" />
            {item}
          </li>
        ))}
      </ul>

      <Notice icon={<Wallet className="h-4 w-4" />} title="Approved refunds return as wallet credit">
        Any Veriq Wallet credit is applied automatically at checkout. Approved refunds for qualifying problems are
        credited to your Veriq Wallet, not paid as cash.
      </Notice>

      <p className="flex items-start gap-3 text-ui-sm leading-6 text-muted-foreground">
        <ShieldCheck aria-hidden="true" className="mt-0.5 h-4 w-4 flex-shrink-0" />
        <span>
          An unlock buys time-limited access to verified information. It is not a reservation and does not guarantee a
          successful rental or purchase.{' '}
          <Link href="/refund-policy" className="font-semibold text-primary hover:underline">
            Refund Policy
          </Link>
        </span>
      </p>
    </Panel>
  );
}
