import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Clock, Facebook, Instagram, Mail, ShieldCheck, Youtube } from 'lucide-react';
import { Button, Eyebrow, Panel } from '@/components/ui';
import { getPublicPageContent } from '@/lib/site-content';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Property questions go to the operator. Listing or unlock issues go to your assigned Veriq Agent. Send a general enquiry to the Veriq team.',
};

const TikTokIcon = () => (
  <svg viewBox="0 0 24 24" fill="currentColor" className="h-[18px] w-[18px]" aria-hidden="true">
    <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.69a8.19 8.19 0 004.79 1.54V6.79a4.85 4.85 0 01-1.02-.1z" />
  </svg>
);

const SOCIAL: Array<{ label: string; href: string; icon: ReactNode }> = [
  { label: 'YouTube', href: 'https://www.youtube.com/@veriqproperty', icon: <Youtube className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { label: 'TikTok', href: 'https://www.tiktok.com/@veriqproperty', icon: <TikTokIcon /> },
  { label: 'Facebook', href: 'https://www.facebook.com/@veriqproperty', icon: <Facebook className="h-[18px] w-[18px]" aria-hidden="true" /> },
  { label: 'Instagram', href: 'https://www.instagram.com/veriqproperty', icon: <Instagram className="h-[18px] w-[18px]" aria-hidden="true" /> },
];

const panelHeading =
  'font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground';
const panelBody = 'mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground';

function isLinkList(value: unknown): value is Array<{ label: string; href: string }> {
  return (
    Array.isArray(value) &&
    value.every(
      (item): item is { label: string; href: string } =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as { label?: unknown }).label === 'string' &&
        typeof (item as { href?: unknown }).href === 'string',
    )
  );
}

function text(value: unknown, fallback: string) {
  return typeof value === 'string' && value.trim() ? value : fallback;
}

/**
 * The prototype's `#contact` routes the question before it answers it: the operator handles the
 * property, the assigned Agent handles the listing or the unlock, and the form is for everything else.
 * The support channels, social links and operating region below the two panels are ours — the
 * prototype's form is a stub with nowhere to send anything.
 */
export default async function ContactPage() {
  const content = await getPublicPageContent('contact');
  const hero = content.hero;
  const formIntro = content.form_intro;
  const support = content.support;
  const agentSupport = content.agent_support;
  const socialContent = content.social;
  const operations = content.operations;

  const supportData: Record<string, unknown> = support?.data ?? {};
  const agentSupportData: Record<string, unknown> = agentSupport?.data ?? {};
  const supportEmail = text(supportData.supportEmail, 'support@veriqproperty.com');
  const agentEmail = text(agentSupportData.agentEmail ?? supportData.agentEmail, 'agents@veriqproperty.com');
  const responseTime = text(
    supportData.responseTime,
    'We aim to respond to every enquiry within 24–48 hours on business days.',
  );
  const businessHours = text(supportData.businessHours, 'Monday – Friday, 9am – 6pm WAT');

  const managedSocial = socialContent?.data?.links;
  const socialLinks = isLinkList(managedSocial)
    ? managedSocial.map((item) => ({
        icon: SOCIAL.find((social) => social.label === item.label)?.icon ?? SOCIAL[0].icon,
        label: item.label,
        href: item.href,
      }))
    : SOCIAL;

  return (
    <section className="bg-background pb-16 pt-28 sm:pb-24 sm:pt-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="max-w-[790px]">
          <Eyebrow>Here to help</Eyebrow>
          <h1 className="mt-2 font-display text-[1.8rem] font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-[2rem]">
            {text(hero?.title, 'Let’s get you to the right person.')}
          </h1>
          <p className="mt-2 text-[0.95rem] leading-[1.6] text-muted-foreground">
            {text(
              hero?.subtitle,
              'Property questions go to the operator. Listing or unlock issues go to your assigned Veriq Agent.',
            )}
          </p>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-2 lg:items-start">
          <div className="space-y-6">
            <Panel as="section" aria-labelledby="unlocked-heading">
              <h2 id="unlocked-heading" className={panelHeading}>
                Need help with an unlocked property?
              </h2>
              <p className={panelBody}>
                Open your active property to find the operator contact and your assigned Agent&rsquo;s WhatsApp
                support.
              </p>
              <Button asChild variant="secondary" className="mt-5">
                <Link href="/dashboard/unlocks">
                  Open unlock history
                  <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
                </Link>
              </Button>
            </Panel>

            <Panel as="section" aria-labelledby="channels-heading">
              <h2 id="channels-heading" className={panelHeading}>
                Official channels
              </h2>
              <dl className="mt-4 space-y-5">
                <div className="flex gap-3">
                  <Mail className="mt-0.5 h-[18px] w-[18px] flex-none text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[0.95rem] font-semibold text-foreground">
                      {text(support?.title, 'General support')}
                    </dt>
                    <dd className="mt-1 text-[0.9rem] leading-[1.55] text-muted-foreground">
                      {text(support?.body, 'Account, property, payment and technical enquiries.')}{' '}
                      <a href={`mailto:${supportEmail}`} className="font-semibold text-primary hover:underline">
                        {supportEmail}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <ShieldCheck className="mt-0.5 h-[18px] w-[18px] flex-none text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[0.95rem] font-semibold text-foreground">
                      {text(agentSupport?.title, 'Operator and listing support')}
                    </dt>
                    <dd className="mt-1 text-[0.9rem] leading-[1.55] text-muted-foreground">
                      {text(
                        agentSupport?.body,
                        'Verification, listing corrections and publication questions from Property Operators.',
                      )}{' '}
                      <a href={`mailto:${agentEmail}`} className="font-semibold text-primary hover:underline">
                        {agentEmail}
                      </a>
                    </dd>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-[18px] w-[18px] flex-none text-primary" aria-hidden="true" />
                  <div className="min-w-0">
                    <dt className="text-[0.95rem] font-semibold text-foreground">Response time</dt>
                    <dd className="mt-1 text-[0.9rem] leading-[1.55] text-muted-foreground">
                      {responseTime} <span className="text-foreground">{businessHours}</span>
                    </dd>
                  </div>
                </div>
              </dl>
            </Panel>

            <Panel as="section" aria-labelledby="follow-heading">
              <h2 id="follow-heading" className={panelHeading}>
                {text(socialContent?.title, 'Follow Veriq')}
              </h2>
              <p className={panelBody}>
                {text(
                  socialContent?.body,
                  'Property intelligence tips, platform news and what we are learning about the market.',
                )}
              </p>
              <ul className="mt-5 grid gap-3 sm:grid-cols-2">
                {socialLinks.map((social) => (
                  <li key={social.label}>
                    <a
                      href={social.href}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-2.5 rounded-unit border border-[#ffffff18] bg-[#070b1444] px-4 py-3 text-[0.9rem] font-medium text-foreground transition-colors hover:border-[#10b98170] hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-card"
                    >
                      {social.icon}
                      {social.label}
                    </a>
                  </li>
                ))}
              </ul>
              <p className="mt-5 text-[0.85rem] leading-[1.55] text-muted-foreground">
                {text(
                  operations?.body,
                  'Veriq is live in Port Harcourt and Obio Akpor, and expands as more properties, streets and intelligence are verified.',
                )}
              </p>
            </Panel>
          </div>

          <Panel as="section" aria-labelledby="enquiry-heading">
            <h2 id="enquiry-heading" className={panelHeading}>
              {text(formIntro?.title, 'General enquiry')}
            </h2>
            <p className={panelBody}>
              {text(
                formIntro?.body,
                'Anything an operator or an Agent cannot answer. We reply from an official Veriq address.',
              )}
            </p>
            <ContactForm />
          </Panel>
        </div>
      </div>
    </section>
  );
}
