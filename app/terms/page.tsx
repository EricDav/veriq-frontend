import type { Metadata } from 'next';
import { Shield } from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';
import {
  DEFAULT_TERMS_SECTIONS,
  TERMS_CONTENT_VERSION,
  TERMS_EFFECTIVE_DATE,
  TERMS_LAST_UPDATED,
  type TermsSection,
} from './terms-data';

export const metadata: Metadata = {
  title: 'Terms & Conditions',
  description: 'Terms and conditions governing use of the Veriq Property platform.',
};

export default async function TermsPage() {
  const content = await getPublicPageContent('terms');
  const hero = content.hero;
  const documents = content.documents;
  const contact = content.contact;
  const managedData = documents?.data ?? null;
  const hasCurrentManagedTerms =
    managedData?.termsVersion === TERMS_CONTENT_VERSION &&
    Array.isArray(managedData.sections);
  const sections = hasCurrentManagedTerms
    ? managedData.sections as TermsSection[]
    : DEFAULT_TERMS_SECTIONS;

  return (
    <>
      <section className="relative overflow-hidden bg-hero-pattern pb-20 pt-32">
        <div className="absolute inset-x-0 bottom-0">
          <svg viewBox="0 0 1440 80" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
            <path d="M0 80L1440 80L1440 40C1200 0 800 0 720 40C640 80 240 80 0 40L0 80Z" fill="white" />
          </svg>
        </div>
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-white/20 bg-[#ffffff0f] px-4 py-1.5 text-xs font-semibold text-primary">
            <Shield className="h-3.5 w-3.5" />
            {hero?.subtitle ?? 'Legal'}
          </div>
          <h1 className="mb-4 font-display text-5xl font-bold text-foreground">
            {hero?.title ?? 'Terms & Conditions'}
          </h1>
          <p className="text-base text-muted-foreground">
            {hero?.body ?? 'Please read these Terms carefully before using Veriq Property.'}
          </p>
        </div>
      </section>

      <section className="bg-card py-20">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-8 lg:grid-cols-4">
            <aside className="lg:col-span-1">
              <div className="sticky top-24 bg-background p-5">
                <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {documents?.title ?? 'Terms sections'}
                </p>
                <nav className="space-y-1" aria-label="Terms sections">
                  {sections.map((section) => (
                    <a
                      key={section.id}
                      href={`#${section.id}`}
                      className="block rounded-lg px-3 py-2 text-sm text-foreground transition-colors hover:bg-card hover:text-primary"
                    >
                      {section.title}
                    </a>
                  ))}
                </nav>
                <div className="mt-5 space-y-1 border-t border-[#ffffff12] pt-5 text-xs text-muted-foreground">
                  <p>Last Updated: {TERMS_LAST_UPDATED}</p>
                </div>
              </div>
            </aside>

            <article className="space-y-12 lg:col-span-3">
              <div className="border-l-4 border-primary bg-[#10b98112] px-5 py-4 text-sm font-medium text-foreground">
                If you do not agree with these Terms, please do not use the platform.
              </div>

              {sections.map((section) => (
                <section key={section.id} id={section.id} className="scroll-mt-24">
                  <h2 className="mb-6 border-b border-[#ffffff12] pb-4 font-display text-2xl font-bold text-foreground">
                    {section.title}
                  </h2>
                  <div className="space-y-8">
                    {section.items.map((item) => (
                      <div key={item.heading}>
                        <h3 className="mb-3 font-semibold text-foreground">{item.heading}</h3>
                        <div className="space-y-3">
                          {item.blocks.map((block, index) =>
                            block.type === 'bullets' ? (
                              <ul key={index} className="list-disc space-y-1.5 pl-6 text-sm leading-relaxed text-muted-foreground">
                                {block.items.map((entry) => <li key={entry}>{entry}</li>)}
                              </ul>
                            ) : (
                              <p key={index} className="text-sm leading-relaxed text-muted-foreground">{block.text}</p>
                            ),
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              ))}

              <div className="bg-background p-6">
                <h2 className="mb-2 font-display font-bold text-foreground">
                  {contact?.title ?? 'Contact'}
                </h2>
                <p className="text-sm leading-relaxed text-muted-foreground">
                  {contact?.body ?? "Questions concerning these Terms may be sent through Veriq Property's official contact channels."}{' '}
                  <a href="/contact" className="text-primary hover:underline">Contact page</a>.
                </p>
                <p className="mt-3 text-sm text-muted-foreground">
                  Veriq Global Services Ltd. · Veriq Property · veriqproperty.com
                </p>
              </div>
            </article>
          </div>
        </div>
      </section>
    </>
  );
}
