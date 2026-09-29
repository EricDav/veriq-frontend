import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import type { SiteContent } from '@/types';

/**
 * The prototype closes the homepage on the Operator rather than the renter: the claim on the left, the
 * one thing to do on the right. "Listing is free" is the point — the unlock fee is the renter's, and
 * an Operator never pays to be listed.
 */
export function CTA({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="border-t border-border bg-background py-14 sm:py-[60px]">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-7 px-5 sm:px-10 lg:flex-row lg:items-center lg:justify-between lg:gap-12">
        <div>
          <h2 className="font-display text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.04em] text-foreground sm:text-[2.2rem]">
            Own a property? Let&rsquo;s make it known.
          </h2>
          <p className="mt-4 text-[0.98rem] leading-[1.65] text-muted-foreground">
            Listing is free. Our team verifies the details and helps serious renters find you.
          </p>
        </div>

        <Link
          href="/auth/register?role=operator"
          className="inline-flex shrink-0 items-center justify-center gap-2 self-start rounded-[9px] bg-primary px-5 py-3 text-[0.9rem] font-semibold text-primary-foreground transition-colors hover:bg-[#34d399] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background lg:self-auto"
        >
          List your property
          <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
