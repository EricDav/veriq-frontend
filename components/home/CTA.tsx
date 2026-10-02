import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { SiteContent } from '@/types';
import { buttonClass } from '@/components/ui';

/**
 * The prototype closes the homepage on the Operator rather than the renter: the claim on the left, the
 * one thing to do on the right. "Listing is free" is the point — the unlock fee is the renter's, and
 * an Operator never pays to be listed.
 */
export function CTA({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="flex flex-col flex-wrap justify-between gap-7 py-[25px] wide:flex-row wide:items-center wide:py-10">
      <div>
        <h2 className="mb-4 font-display text-[clamp(1.55rem,2.6vw,2.25rem)] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
          Own a property? Let&rsquo;s make it known.
        </h2>
        <p className="text-muted-foreground">
          Listing is free. Our team verifies the details and helps serious renters find you.
        </p>
      </div>

      <Link
        href="/auth/register?role=operator"
        className={buttonClass('primary', 'default', 'shrink-0 self-start wide:self-auto')}
      >
        List your property
        <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
