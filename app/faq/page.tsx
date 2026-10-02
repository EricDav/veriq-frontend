import type { Metadata } from 'next';
import { Eyebrow } from '@/components/ui';
import { getPublicPageContent } from '@/lib/site-content';
import { FAQClient } from './FAQClient';
import { DEFAULT_FAQS, FAQ_CONTENT_VERSION, type FAQItem } from './faq-data';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about unlocking a property, what access covers, refunds and wallet credit, Street Intelligence and listing as an Operator.',
};

function isFAQList(value: unknown): value is FAQItem[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is FAQItem =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { q?: unknown }).q === 'string' &&
        typeof (item as { a?: unknown }).a === 'string',
    )
  );
}

/**
 * The prototype's `#faq`, matched exactly: a page head and the nine questions. Managed content written
 * against an older answer set is ignored rather than merged, so a stale CMS entry can never resurrect
 * an answer that no longer matches.
 */
export default async function FAQPage() {
  const content = await getPublicPageContent('faq');
  const managed = content.questions?.data;
  const managedFaqs = managed?.faqVersion === FAQ_CONTENT_VERSION ? managed.faqs : null;
  const faqs = isFAQList(managedFaqs) ? managedFaqs : DEFAULT_FAQS;

  return (
    <main className="proto-type mx-auto max-w-[1280px] px-[22px] pb-[30px] pt-24 wide:px-10 wide:pb-[50px] wide:pt-32">
      <div className="page-head mb-7">
        <Eyebrow>Your questions, answered</Eyebrow>
        <h1 className="my-2 font-display text-[1.7rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground wide:text-[2rem]">
          A little clarity goes a long way.
        </h1>
      </div>

      <FAQClient faqs={faqs} />
    </main>
  );
}
