import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Eyebrow, Panel, buttonClass } from '@/components/ui';
import { ContactForm } from '@/components/contact/ContactForm';

export const metadata: Metadata = {
  title: 'Contact Us',
  description:
    'Property questions go to the operator. Listing or unlock issues go to your assigned Veriq Agent.',
};

/**
 * The prototype's `#contact`, matched exactly: a page head, then two panels side by side — where to
 * go for help with a property you have already unlocked, and the general enquiry form.
 *
 * The form itself keeps the fields the contact endpoint requires, which is more than the prototype's
 * two-field stub; everything around it is the prototype's.
 */
export default function ContactPage() {
  return (
    <main className="proto-type mx-auto max-w-[1280px] px-[22px] pb-[30px] pt-24 wide:px-10 wide:pb-[50px] wide:pt-32">
      <div className="page-head mb-7 flex flex-wrap items-center justify-between gap-5">
        <div>
          <Eyebrow>Here to help</Eyebrow>
          <h1 className="my-2 font-display text-[1.7rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground wide:text-[2rem]">
            Let&rsquo;s get you to the right person.
          </h1>
          <p className="text-muted-foreground">
            Property questions go to the operator. Listing or unlock issues go to your assigned Veriq
            Agent.
          </p>
        </div>
      </div>

      <div className="grid gap-6 wide:grid-cols-2">
        <Panel as="section">
          <h2 className="mb-3 font-display text-[1.12rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            Need help with an unlocked property?
          </h2>
          <p className="text-muted-foreground">
            Open your active property to find the operator contact and your assigned Agent&rsquo;s
            WhatsApp support.
          </p>
          <Link href="/dashboard/unlocks" className={buttonClass('secondary', 'default', 'mt-6')}>
            Open unlock history
            <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
          </Link>
        </Panel>

        <Panel as="section">
          <h2 className="font-display text-[1.12rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            General enquiry
          </h2>
          <ContactForm />
        </Panel>
      </div>
    </main>
  );
}
