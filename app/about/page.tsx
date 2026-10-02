import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { Eyebrow, buttonClass } from '@/components/ui';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Veriq connects people with property intelligence and direct operator contacts, helping them understand a place before arranging an inspection.',
};

/**
 * The prototype's `#about`, matched exactly: a single 790px prose column — back link, eyebrow, one
 * Sora headline, a 1.1rem lead, three unnumbered blocks and two closing actions. Nothing else is on
 * this page in the prototype, so nothing else is on it here.
 */
const BLOCKS = [
  {
    title: 'Know the property',
    body:
      'Operators supply property-level intelligence, individual unit details and images. Veriq Agents verify the submission, add observations, link Street Intelligence and publish. You can explore the full package after unlocking.',
  },
  {
    title: 'Understand the street',
    body:
      'Linked Street Intelligence brings together street-level knowledge with visible sources and confidence. Community contributions help the picture improve over time.',
  },
  {
    title: 'Connect directly',
    body:
      'After unlocking, contact the owner or caretaker directly. Your assigned Veriq Agent remains available for support.',
  },
];

export default function AboutPage() {
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

        <Eyebrow>about</Eyebrow>

        <h1 className="mb-5 mt-3 font-display text-[2rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground wide:text-[clamp(2rem,4vw,3.3rem)]">
          Better property decisions start with better information.
        </h1>

        <p className="text-[1.1rem] leading-[1.6] text-muted-foreground">
          Veriq connects people with property intelligence and direct operator contacts, helping them
          understand a place before arranging an inspection.
        </p>

        {BLOCKS.map(({ title, body }) => (
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
