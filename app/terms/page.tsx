import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Veriq Property Terms of Service, Privacy Policy, and Agent Terms & Guidelines.',
};

const DEFAULT_SECTIONS = [
  {
    id: 'terms',
    title: 'Terms of Service',
    items: [
      { heading: '1. About Veriq Property', content: 'Veriq Property is a property intelligence platform designed to help users make more informed property decisions before physical inspections. The platform provides property intelligence reports, listing information, environmental disclosures, accessibility information, trust indicators, and agent performance metrics. Veriq Property is NOT a property owner, real estate agency, property developer, or guarantor of any property.' },
      { heading: '2. User Eligibility', content: 'Users must be at least 18 years old and provide accurate account information.' },
      { heading: '3. Property Information Disclaimer', content: 'Property information on Veriq Property is submitted by independent agents and third-party contributors. Users are strongly advised to physically inspect properties before making commitments.' },
      { heading: '4. Consultation Access Fees', content: 'Consultation fees grant temporary access to detailed property intelligence reports and consultation features.' },
      { heading: '5. User Responsibilities', content: 'Users agree to use the platform lawfully and avoid fraudulent or abusive behavior.' },
      { heading: '6. Listing Availability', content: 'Property availability may change at any time. Listings may expire or become unavailable without notice.' },
      { heading: '7. Trust Scores and Ratings', content: 'Veriq Property may display trust scores, inspection success rates, response speed indicators, and consultation satisfaction ratings.' },
      { heading: '8. Payments', content: 'All payments are subject to platform policies and payment verification.' },
      { heading: '9. Refund Policy', content: 'If a user unlocks a property intelligence report and the property is discovered to be unavailable shortly after payment, the user may qualify for a refund credit. Approved refund credits may be returned to the user wallet or redirected toward unlocking similar available properties. Refunds may also apply to stale listings, duplicate listings, or major listing misrepresentation.' },
      { heading: '10. Limitation of Liability', content: 'Veriq Property shall not be liable for property disputes, failed transactions, or inspection outcomes.' },
      { heading: '11. Platform Rights', content: 'Veriq Property reserves the right to suspend accounts, remove listings, or terminate access for policy violations.' },
    ],
  },
  {
    id: 'privacy',
    title: 'Privacy Policy',
    items: [
      { heading: '1. Information We Collect', content: 'We may collect names, phone numbers, email addresses, payment information, device information, and platform activity.' },
      { heading: '2. How We Use Information', content: 'We use collected information to operate the platform, process payments, improve trust systems, prevent fraud, and improve user experience.' },
      { heading: '3. Payment Information', content: 'Payments are processed through third-party payment providers. We do not store full payment card details.' },
      { heading: '4. Data Sharing', content: 'Veriq Property does not sell user personal data.' },
      { heading: '5. Security', content: 'We implement reasonable security measures to protect user information.' },
      { heading: '6. User Rights', content: 'Users may request account updates, corrections, or deletion subject to platform obligations.' },
    ],
  },
  {
    id: 'agent-terms',
    title: 'Agent Terms & Guidelines',
    items: [
      { heading: '1. Agent Responsibilities', content: 'Agents must provide accurate listing information, maintain professional conduct, provide truthful disclosures, and maintain listing freshness.' },
      { heading: '2. Listing Accuracy', content: 'Agents must ensure listings are genuine, accurate, and currently available.' },
      { heading: '3. Freshness Requirements', content: 'Agents must regularly reconfirm listings, remove unavailable properties, and avoid stale property uploads. If a property becomes unavailable shortly after consultation unlock, the user may receive a refund credit. Repeated stale listing violations may result in reduced trust scores, lower visibility, suspension, payout restrictions, or permanent removal.' },
      { heading: '4. Image & Content Standards', content: 'Agents may not upload stolen, misleading, or unrelated property images.' },
      { heading: '5. Trust Performance System', content: 'Agent visibility may depend on inspection success rates, consultation satisfaction, listing accuracy, response speed, and freshness reliability.' },
      { heading: '6. Payments, Commissions & Withdrawals', content: 'Consultation fees are shared between the platform and the listing agent. Agent earnings may remain under temporary review (Pending Balance) before becoming available for withdrawal — up to 48 hours. Minimum withdrawal threshold: ₦5,000. Withdrawal frequency: once daily. If a property is unavailable or misleading, related commissions may be reversed or withheld.' },
      { heading: '7. Account Verification', content: 'Agents may be required to submit identification and verification information.' },
      { heading: '8. Platform Moderation Rights', content: 'Veriq Property reserves the right to reject listings, suspend accounts, or terminate access.' },
      { heading: '9. Founding Verified Agents', content: 'Founding Verified Agent status may be revoked for policy violations.' },
      { heading: '10. Liability', content: 'Agents are solely responsible for listing accuracy and disclosures.' },
    ],
  },
];

export default async function TermsPage() {
  const content = await getPublicPageContent('terms');
  const hero = content.hero;
  const documents = content.documents;
  const contact = content.contact;
  const sections = Array.isArray(documents?.data?.sections)
    ? documents.data.sections as typeof DEFAULT_SECTIONS
    : DEFAULT_SECTIONS;

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
            {hero?.subtitle ?? 'Legal Documents'}
          </div>
          <h1 className="font-display text-5xl font-bold text-white mb-4">{hero?.title ?? 'Terms & Conditions'}</h1>
          <p className="text-white/70 text-base">{hero?.body ?? 'Please read these terms carefully before using the Veriq Property platform.'}</p>
        </div>
      </section>

      <section className="py-20 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="lg:col-span-1">
              <div className="sticky top-24 rounded-2xl bg-veriq-surface p-5">
                <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">{documents?.title ?? 'Documents'}</p>
                <nav className="space-y-1">
                  {sections.map((section) => (
                    <a key={section.id} href={`#${section.id}`} className="block rounded-lg px-3 py-2 text-sm text-navy-700 hover:bg-white hover:text-veriq-secondary transition-colors">
                      {section.title}
                    </a>
                  ))}
                </nav>
                <div className="mt-5 pt-5 border-t border-slate-200">
                  <p className="text-xs text-slate-500">{documents?.body ?? 'Effective Date: To be confirmed. Contact us for current effective dates.'}</p>
                </div>
              </div>
            </aside>

            <div className="lg:col-span-3 space-y-12">
              {sections.map((section) => (
                <div key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="font-display text-2xl font-bold text-navy-900 mb-6 pb-4 border-b border-slate-200">{section.title}</h2>
                  <div className="space-y-6">
                    {section.items.map((item) => (
                      <div key={item.heading}>
                        <h3 className="font-semibold text-navy-800 mb-2">{item.heading}</h3>
                        <p className="text-sm text-veriq-muted leading-relaxed">{item.content}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ))}

              <div className="rounded-2xl bg-veriq-surface p-6">
                <h3 className="font-display font-bold text-navy-900 mb-2">{contact?.title ?? 'Contact Us'}</h3>
                <p className="text-sm text-veriq-muted">
                  {contact?.body ?? 'For questions or disputes regarding these terms, contact our support team through our Contact page.'}{' '}
                  <a href="/contact" className="text-veriq-secondary hover:underline">Contact page</a>.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
