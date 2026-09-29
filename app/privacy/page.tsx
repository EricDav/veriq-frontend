import type { Metadata } from 'next';
import Link from 'next/link';
import { Shield } from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'Privacy Policy',
  description: 'Veriq Property Privacy Policy.',
};

const DEFAULT_SECTIONS = [
  { title: 'Information We Collect', body: 'We may collect information such as:', items: ['Name', 'Phone number', 'Email address', 'Property preferences', 'Agent information'] },
  { title: 'How We Use Your Information', body: 'We use the information we collect to respond to inquiries, process applications, communicate with users and agents, improve our services, and provide information about Veriq Property.' },
  { title: 'Information Sharing', body: 'We do not sell, rent, or trade your personal information to third parties.' },
  { title: 'Data Security', body: 'We take reasonable measures to protect your information from unauthorized access, loss, misuse, or disclosure.' },
  { title: 'Third-Party Services', body: 'Our website may contain links to third-party websites or services. We are not responsible for the privacy practices of those third parties.' },
  { title: 'Your Rights', body: 'You may contact us at any time to request access, correct inaccurate information, or request deletion where applicable.' },
];

export default async function PrivacyPolicyPage() {
  const content = await getPublicPageContent('privacy');
  const hero = content.hero;
  const intro = content.intro;
  const sectionsContent = content.sections;
  const contact = content.contact;
  const agreement = content.agreement;
  const sections = Array.isArray(sectionsContent?.data?.sections)
    ? sectionsContent.data.sections as typeof DEFAULT_SECTIONS
    : DEFAULT_SECTIONS;
  const contactData = (contact?.data ?? {}) as { website?: string; email?: string };

  return (
    <>
      <section className="bg-hero-pattern pt-32 pb-20 relative overflow-hidden">
        <div className="absolute bottom-0 left-0 right-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#ffffff0f] px-4 py-1.5 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            {hero?.subtitle ?? 'Privacy'}
          </div>
          <h1 className="font-display mb-4 text-4xl font-bold text-foreground sm:text-5xl">{hero?.title ?? 'Privacy Policy'}</h1>
          <p className="text-sm text-muted-foreground sm:text-base">{hero?.body ?? 'Last Updated: June 2026'}</p>
        </div>
      </section>

      <section className="bg-card py-16 sm:py-20">
        <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
          <div className="space-y-8">
            <p className="text-sm leading-7 text-muted-foreground sm:text-base">
              {intro?.body ?? 'Veriq Property ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy explains how we collect, use, and protect the information you provide when using our website, forms, and services.'}
            </p>

            {sections.map((section) => (
              <section key={section.title} className="rounded-2xl border border-[#ffffff12] bg-background p-5 sm:p-6">
                <h2 className="font-display mb-3 text-xl font-bold text-foreground">{section.title}</h2>
                {section.body && <p className="mb-3 text-sm leading-7 text-muted-foreground">{section.body}</p>}
                {Array.isArray(section.items) && (
                  <ul className="space-y-2 pl-5 text-sm leading-7 text-muted-foreground">
                    {section.items.map((item) => <li key={item} className="list-disc">{item}</li>)}
                  </ul>
                )}
              </section>
            ))}

            <section className="rounded-2xl border border-[#10b98135] bg-[#10b98112] p-5 sm:p-6">
              <h2 className="font-display mb-3 text-xl font-bold text-foreground">{contact?.title ?? 'Contact Us'}</h2>
              <p className="mb-4 text-sm leading-7 text-muted-foreground">
                {contact?.body ?? 'If you have questions about this Privacy Policy or how your information is used, please contact us:'}
              </p>
              <div className="space-y-2 text-sm text-foreground">
                <p className="font-semibold">Veriq Property</p>
                <p>Website: <a href={`https://${contactData.website ?? 'www.veriqproperty.com'}`} className="font-semibold text-primary hover:underline">{contactData.website ?? 'www.veriqproperty.com'}</a></p>
                <p>Email: <a href={`mailto:${contactData.email ?? 'info@veriqproperty.com'}`} className="font-semibold text-primary hover:underline">{contactData.email ?? 'info@veriqproperty.com'}</a></p>
              </div>
            </section>

            <div className="flex flex-col gap-3 rounded-2xl bg-background p-5 text-foreground sm:flex-row sm:items-center sm:justify-between">
              <p className="text-sm text-foreground">{agreement?.body ?? 'By using our website, forms, or services, you agree to this Privacy Policy.'}</p>
              <Link href="/contact" className="btn-gold shrink-0 !py-2.5 !text-sm">Contact Us</Link>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}
