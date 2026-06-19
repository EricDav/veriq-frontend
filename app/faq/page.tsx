import { Shield } from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';
import { FAQClient } from './FAQClient';

const DEFAULT_FAQS = [
  { q: 'What is Veriq Property?', a: 'Veriq Property is a property intelligence platform designed to help people make smarter property decisions before physical inspections. We provide verified listings, detailed property intelligence reports, and agent trust scores.', categories: ['renter'] },
  { q: 'Does Veriq Property own the listed properties?', a: 'No. Veriq Property does not own properties listed on the platform. The platform operates as a property intelligence and intermediary service. All listings are submitted by independent agents.', categories: ['renter'] },
  { q: 'Does Veriq Property guarantee properties?', a: 'No. Users are strongly advised to physically inspect properties and independently verify important details before making commitments. We provide intelligence to help you decide — not a guarantee.', categories: ['renter'] },
  { q: 'Why do I need to pay before seeing full property details?', a: 'The consultation/intelligence access fee unlocks detailed property intelligence, structured disclosures, and consultation access. This model ensures agents take listings seriously and users receive quality, curated information.', categories: ['renter', 'payment'] },
  { q: 'What is included after unlocking a property?', a: 'Users may access detailed property images, environmental information, accessibility reports, utility disclosures, and consultation messaging with the listing agent.', categories: ['renter'] },
  { q: 'What happens if the property is no longer available after payment?', a: 'If a property becomes unavailable shortly after consultation unlock, users may qualify for a refund credit. This can be applied toward unlocking similar available properties.', categories: ['renter', 'payment'] },
  { q: 'Will I always receive a cash refund?', a: 'Not necessarily. Refunds may be issued as wallet credit, platform credit, or similar-property access support rather than direct cash refunds.', categories: ['payment'] },
  { q: 'What qualifies for refund consideration?', a: 'Refund consideration may apply to unavailable properties, stale listings, duplicate listings, fake listings, or major listing misrepresentation.', categories: ['payment'] },
  { q: 'What does NOT qualify for refunds?', a: 'Refunds are generally not granted for change of mind, personal preference, or dissatisfaction after inspection. The property must have been genuinely misrepresented or unavailable.', categories: ['payment'] },
  { q: 'How are agents verified?', a: 'Agents may go through identity verification, listing review, profile assessment, and platform moderation before receiving verified status.', categories: ['agent'] },
  { q: 'What are trust scores?', a: 'Trust scores measure agent performance based on listing accuracy, response speed, freshness reliability, and inspection success rate. Higher trust scores earn agents better visibility on the platform.', categories: ['agent'] },
  { q: 'Can agents lose visibility or get suspended?', a: 'Yes. Agents who repeatedly violate platform policies may face reduced visibility, suspension, payout restrictions, or permanent removal from the platform.', categories: ['agent'] },
  { q: 'Can multiple agents post the same property?', a: 'Yes. Users can compare agents based on trust scores and platform performance when multiple agents list the same property.', categories: ['renter', 'agent'] },
  { q: 'Does Veriq Property handle rent payments?', a: 'No. Veriq Property currently focuses on property intelligence and consultation access. Rent payment arrangements are made directly between tenants and landlords/agents.', categories: ['renter'] },
  { q: 'Is Veriq Property available only in Port Harcourt?', a: 'The platform may begin with focused operational regions but is designed for broader expansion over time across Nigeria and beyond.', categories: ['renter'] },
  { q: 'Why do listings expire automatically?', a: 'Automatic expiration helps reduce stale listings and outdated property information. Agents must regularly reconfirm listing availability to keep properties active.', categories: ['renter', 'agent'] },
  { q: 'How does Veriq Property reduce fake listings?', a: 'The platform uses moderation, trust systems, freshness requirements, refund protection, and performance tracking to discourage and identify fake listings.', categories: ['renter', 'agent'] },
  { q: 'Can agents withdraw earnings immediately?', a: 'No. Agent earnings may first enter a temporary Pending Balance review period of up to 48 hours before becoming available for withdrawal.', categories: ['agent', 'payment'] },
  { q: 'What is the minimum withdrawal amount for agents?', a: 'The current minimum withdrawal threshold is ₦5,000. Withdrawals can be made once daily.', categories: ['agent', 'payment'] },
  { q: 'How can I contact Veriq Property?', a: 'Users can contact Veriq Property through official support channels and platform communication systems. Visit our Contact page for details.', categories: ['renter', 'agent'] },
];

const DEFAULT_CATEGORIES = [
  { label: 'All', value: 'all' },
  { label: 'For Renters', value: 'renter' },
  { label: 'For Agents', value: 'agent' },
  { label: 'Payments & Refunds', value: 'payment' },
];

export default async function FAQPage() {
  const content = await getPublicPageContent('faq');
  const hero = content.hero;
  const questions = content.questions;
  const cta = content.cta;
  const faqs = Array.isArray(questions?.data?.faqs) ? questions.data.faqs as typeof DEFAULT_FAQS : DEFAULT_FAQS;
  const categories = Array.isArray(questions?.data?.categories) ? questions.data.categories as typeof DEFAULT_CATEGORIES : DEFAULT_CATEGORIES;

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
            {hero?.body ?? 'Everything you need to know about Veriq Property — for renters, property seekers, and agents.'}
          </p>
        </div>
      </section>

      <FAQClient
        faqs={faqs}
        categories={categories}
        ctaTitle={cta?.title ?? 'Still have questions?'}
        ctaBody={cta?.body ?? 'Our support team is happy to help with any inquiry not covered above.'}
      />
    </>
  );
}
