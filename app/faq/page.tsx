import type { Metadata } from 'next';
import { Eyebrow } from '@/components/ui';
import { getPublicPageContent } from '@/lib/site-content';
import { FAQClient } from './FAQClient';
import {
  DEFAULT_FAQS,
  DEFAULT_FAQ_CATEGORIES,
  FAQ_CONTENT_VERSION,
  type FAQCategory,
  type FAQItem,
} from './faq-data';

export const metadata: Metadata = {
  title: 'FAQ',
  description:
    'Answers about unlocking a property, what access covers, refunds and wallet credit, Street Intelligence, listing as an Operator, and staying safe.',
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

function isCategoryList(value: unknown): value is FAQCategory[] {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is FAQCategory =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { value?: unknown }).value === 'string',
    )
  );
}

export default async function FAQPage() {
  const content = await getPublicPageContent('faq');
  const hero = content.hero;
  const questions = content.questions;
  const cta = content.cta;

  // Managed content written against an older answer set is ignored rather than merged, so a stale CMS
  // entry can never resurrect an answer that no longer matches the Master Blueprint.
  const managed = questions?.data;
  const managedFaqs = managed?.faqVersion === FAQ_CONTENT_VERSION ? managed.faqs : null;
  const faqs = isFAQList(managedFaqs) ? managedFaqs : DEFAULT_FAQS;
  const managedCategories = managed?.faqVersion === FAQ_CONTENT_VERSION ? managed.categories : null;
  const categories = isCategoryList(managedCategories) ? managedCategories : DEFAULT_FAQ_CATEGORIES;

  return (
    <section className="bg-background pb-16 pt-28 sm:pb-24 sm:pt-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="max-w-[790px]">
          <Eyebrow>{hero?.subtitle ?? 'Your questions, answered'}</Eyebrow>
          <h1 className="mt-2 font-display text-[1.8rem] font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-[2rem]">
            {hero?.title ?? 'A little clarity goes a long way.'}
          </h1>
          {hero?.body && (
            <p className="mt-2 text-[0.95rem] leading-[1.6] text-muted-foreground">{hero.body}</p>
          )}
        </div>

        <FAQClient
          faqs={faqs}
          categories={categories}
          ctaTitle={cta?.title ?? 'Still have a question?'}
          ctaBody={
            cta?.body ??
            'Anything not covered here goes to the Veriq team through the contact page. For an unlocked property, your operator contact and assigned Agent are in your unlock history.'
          }
        />
      </div>
    </section>
  );
}
