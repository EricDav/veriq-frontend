import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Eyebrow, buttonClass } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How Veriq Works',
  description:
    'A straightforward path from browsing to a more informed decision.',
};

/**
 * The prototype's `#how-it-works`, matched exactly: a 790px prose column of five numbered steps and
 * two closing actions. The step copy is the prototype's, word for word.
 */
const STEPS = [
  {
    title: '1. Explore for free',
    body:
      'Choose Residential Property, Short Lets, Hostels, Shared Property or Property for Sale. Compare basic details, prices and clear availability labels.',
  },
  {
    title: '2. Unlock the full picture',
    body:
      'Click Unlock to go directly to checkout. Available wallet credit applies automatically. Pay only the balance. Access begins after successful full settlement and lasts 24 hours.',
  },
  {
    title: '3. Check the details',
    body:
      'Explore all documented verified units, their images, property-type intelligence and the linked street record. See source and confidence information before drawing conclusions.',
  },
  {
    title: '4. Connect and decide',
    body:
      'Contact the owner, caretaker or operator. Arrange your inspection directly and contact your assigned Veriq Agent for support. Unlocking does not reserve a property.',
  },
  {
    title: '5. Report a material issue',
    body:
      'Submit a supported refund request through Unlock history within 24 hours. Approved refunds become non-expiring wallet credit for a future eligible unlock.',
  },
];

export default function HowItWorksPage() {
  return (
    <main className="proto-type mx-auto max-w-[1280px] px-[22px] pb-[30px] pt-24 wide:px-10 wide:pb-[50px] wide:pt-32">
      <div className="prose max-w-[790px]">
        <Link
          href="/"
          className="mb-[25px] inline-flex items-center gap-2 text-ui-md text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Back to Veriq
        </Link>

        <Eyebrow>how it works</Eyebrow>

        <h1 className="mb-5 mt-3 font-display text-[2rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground wide:text-[clamp(2rem,4vw,3.3rem)]">
          Know before you go.
        </h1>

        <p className="text-[1.1rem] leading-[1.6] text-muted-foreground">
          A straightforward path from browsing to a more informed decision.
        </p>

        {STEPS.map(({ title, body }) => (
          <section key={title}>
            <h2 className="mb-3 mt-8 font-display text-[1.35rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
              {title}
            </h2>
            <p className="text-muted-foreground">{body}</p>
          </section>
        ))}

        <div className="mt-[25px] flex flex-wrap gap-3">
          <Link href="/properties" className={buttonClass('primary')}>
            Explore properties
            <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
          </Link>
          <Link href="/contact" className={buttonClass('secondary')}>
            Get help
          </Link>
        </div>
      </div>
    </main>
  );
}
