import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, ArrowUpRight, Check } from 'lucide-react';
import { Button, Eyebrow, Notice, Panel, ReviewCard } from '@/components/ui';

export const metadata: Metadata = {
  title: 'How Veriq Works',
  description:
    'A straightforward path from browsing to a more informed decision: what is free, what an unlock adds, how wallet credit and refunds work.',
};

/**
 * The prototype's `#how-it-works` is a prose column of five numbered steps. The panels below the steps
 * are ours — what an unlock actually contains, how each category differs, Street Intelligence and the
 * refund route — and are kept because the prototype has no room for them and the product does.
 */
const STEPS = [
  {
    title: 'Explore for free',
    body:
      'Choose Residential Property, Short Lets, Hostels, Shared Property or Property for Sale. Compare basic details, prices and clear availability labels.',
  },
  {
    title: 'Unlock the full picture',
    body:
      'Click Unlock to go directly to checkout. Available wallet credit applies automatically. Pay only the balance. Access begins after successful full settlement, lasts 24 hours, and the exact expiry time is shown on your unlock.',
  },
  {
    title: 'Check the details',
    body:
      'Explore all documented verified units, their images, property-type intelligence and the linked street record. See source and confidence information before drawing conclusions.',
  },
  {
    title: 'Connect and decide',
    body:
      'Contact the owner, caretaker or operator. Arrange your inspection directly and contact your assigned Veriq Agent for support. Unlocking does not reserve a property.',
  },
  {
    title: 'Report a material issue',
    body:
      'Submit a supported refund request through Unlock history within 24 hours. Approved refunds become non-expiring wallet credit for a future eligible unlock.',
  },
];

const UNLOCK_INCLUDES = [
  'The exact verified location',
  'Every documented verified unit, with its details, price and availability',
  'Protected property and unit images',
  'Property-type and unit intelligence reviewed by a Veriq Agent',
  'The linked Street Intelligence record, with its source and confidence',
  'The property contact, and WhatsApp support from your assigned Veriq Agent',
];

const CATEGORIES = [
  {
    title: 'Residential, Short Lets and Hostels',
    body:
      'One unlock covers the whole property and every documented verified unit — never a fee per room. Short Let availability is checked against the dates you searched.',
    href: '/properties',
    cta: 'Browse properties',
  },
  {
    title: 'Shared Property',
    body:
      'A current resident offers a room or bedspace in the home they occupy. Veriq verifies their occupancy and permission to share, and the opportunity disappears from search once the space is taken.',
    href: '/shared',
    cta: 'Browse Shared Property',
  },
  {
    title: 'Property for Sale',
    body:
      'Only the owner may submit, and an Agent visits before publication to confirm the property and review ownership and authority-to-sell documents. You see document statuses, never the documents — and a sighted document is not a legal title guarantee.',
    href: '/for-sale',
    cta: 'Browse Property for Sale',
  },
];

export default function HowItWorksPage() {
  return (
    <section className="bg-background pb-16 pt-28 sm:pb-24 sm:pt-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="max-w-[790px]">
          <Eyebrow>How it works</Eyebrow>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-[3.3rem] sm:leading-[1.25]">
            Know before you go.
          </h1>
          <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground sm:text-[1.1rem]">
            A straightforward path from browsing to a more informed decision.
          </p>

          <ol className="mt-4">
            {STEPS.map(({ title, body }, index) => (
              <li key={title} className="mt-8">
                <h2 className="font-display text-[1.35rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
                  <span className="text-primary">{index + 1}.</span> {title}
                </h2>
                <p className="mt-4 text-[0.95rem] leading-[1.6] text-muted-foreground">{body}</p>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Panel as="section" aria-labelledby="includes-heading">
            <h2
              id="includes-heading"
              className="font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground"
            >
              What an unlock gives you
            </h2>
            <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">
              Checkout lists exactly what is included for that listing, because it differs slightly between
              rentals, Shared Property and Property for Sale. For a rental property it normally covers:
            </p>
            <ul className="mt-4 space-y-2.5">
              {UNLOCK_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-[0.9rem] leading-[1.55] text-muted-foreground">
                  <Check className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel as="section" aria-labelledby="paying-heading">
            <h2
              id="paying-heading"
              className="font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground"
            >
              Paying, and being paid back
            </h2>
            <dl className="mt-4 space-y-5">
              <div>
                <dt className="text-[0.95rem] font-semibold text-foreground">You never fund a wallet first</dt>
                <dd className="mt-1.5 text-[0.9rem] leading-[1.55] text-muted-foreground">
                  Wallet credit is applied automatically up to the fee. With enough credit the unlock is confirmed
                  without a payment page; otherwise you pay only the difference.
                </dd>
              </div>
              <div>
                <dt className="text-[0.95rem] font-semibold text-foreground">Access starts only on settlement</dt>
                <dd className="mt-1.5 text-[0.9rem] leading-[1.55] text-muted-foreground">
                  Returning from the payment page is not proof of payment. Veriq confirms it with the provider, then
                  starts and records your 24 hours. Credit held for an unfinished checkout is released.
                </dd>
              </div>
              <div>
                <dt className="text-[0.95rem] font-semibold text-foreground">Approved refunds become wallet credit</dt>
                <dd className="mt-1.5 text-[0.9rem] leading-[1.55] text-muted-foreground">
                  Credit does not expire, works across every eligible category, and is spent only when you choose to
                  unlock something.{' '}
                  <Link href="/refund-policy" className="font-semibold text-primary hover:underline">
                    Read the Refund Policy
                  </Link>
                  .
                </dd>
              </div>
            </dl>
          </Panel>
        </div>

        <section aria-labelledby="categories-heading" className="mt-14">
          <h2
            id="categories-heading"
            className="font-display text-[1.35rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground"
          >
            How each category works
          </h2>
          <div className="mt-6 grid gap-5 md:grid-cols-3">
            {CATEGORIES.map(({ title, body, href, cta }) => (
              <ReviewCard
                key={title}
                title={title}
                footer={
                  <Link href={href} className="text-[0.9rem] font-semibold text-primary hover:underline">
                    {cta}
                  </Link>
                }
              >
                <p className="text-[0.9rem] leading-[1.55]">{body}</p>
              </ReviewCard>
            ))}
          </div>
        </section>

        <div className="mt-14 grid gap-6 lg:grid-cols-2">
          <Panel as="section" aria-labelledby="street-heading">
            <h2
              id="street-heading"
              className="font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground"
            >
              Street Intelligence is community powered
            </h2>
            <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">
              Every listing links to the record for its street, with its source label, confidence and last-updated
              date. You can share the standalone street link with people who know the area so they can contribute — a
              shared link never carries addresses, protected images, contacts or your access.
            </p>
            <Link
              href="/street-intelligence"
              className="mt-4 inline-flex text-[0.9rem] font-semibold text-primary hover:underline"
            >
              Explore Street Intelligence
            </Link>
          </Panel>

          <Notice
            tone="amber"
            icon={<AlertTriangle className="h-5 w-5" />}
            title="Inspect before you pay anyone"
          >
            <p className="leading-[1.6]">
              Confirm terms directly with the property contact and see the place in person. Veriq provides verified
              information and intelligence to help you decide — it is not a guarantee of title, condition or
              availability, and Veriq never collects rent, a deposit or a purchase price.{' '}
              <Link href="/safety" className="font-semibold text-foreground underline">
                Read the safety guidance
              </Link>
              .
            </p>
          </Notice>
        </div>

        <div className="mt-12 flex flex-wrap gap-3">
          <Button asChild>
            <Link href="/properties">
              Explore properties
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </Button>
          <Button asChild variant="secondary">
            <Link href="/contact">Get help</Link>
          </Button>
        </div>
      </div>
    </section>
  );
}
