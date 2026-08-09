import { Shield } from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';
import { FAQClient } from './FAQClient';

import { DEFAULT_FAQS, DEFAULT_FAQ_CATEGORIES, FAQ_CONTENT_VERSION, type FAQCategory, type FAQItem } from './faq-data';

export default async function FAQPage() {
  const content = await getPublicPageContent('faq');
  const hero = content.hero;
  const questions = content.questions;
  const cta = content.cta;
  const managedData = questions?.data ?? null;
  const hasCurrentManagedFAQ = managedData?.faqVersion === FAQ_CONTENT_VERSION && Array.isArray(managedData.faqs);
  const faqs = hasCurrentManagedFAQ ? managedData.faqs as FAQItem[] : DEFAULT_FAQS;
  const categories = hasCurrentManagedFAQ && Array.isArray(managedData.categories)
    ? managedData.categories as FAQCategory[]
    : DEFAULT_FAQ_CATEGORIES;

  return (
    <>
      <section className="bg-hero-pattern pt-32 pb-20 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 sm:px-6 lg:px-8 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/20 px-4 py-1.5 text-xs font-semibold text-gold-300 mb-5">
            <Shield className="h-3.5 w-3.5" />
            {hero?.subtitle ?? 'Frequently Asked Questions'}
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">{hero?.title ?? 'FAQ'}</h1>
          <p className="text-white/70 text-lg">
            {hero?.body ?? 'Answers about Property Intelligence, Street Intelligence, agents, payments, refunds, and using Veriq Property.'}
          </p>
        </div>
      </section>

      <FAQClient
        faqs={faqs}
        categories={categories}
        ctaTitle={cta?.title ?? 'Still have questions?'}
        ctaBody={cta?.body ?? 'Use the official Contact Us or Support options for any enquiry not covered above.'}
      />
    </>
  );
}
