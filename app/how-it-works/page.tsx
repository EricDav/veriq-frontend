import type { Metadata } from 'next';
import Link from 'next/link';
import {
  AlertTriangle, Building2, CheckCircle2, Clock, CreditCard, KeyRound, Landmark, Lock, MapPin, MessageCircle,
  Search, ShieldCheck, Undo2, Users, Wallet,
} from 'lucide-react';

export const metadata: Metadata = {
  title: 'How Veriq Works',
  description:
    'How Veriq verifies properties, what an unlock gives you, how wallet credit and refunds work, and what happens when your access period ends.',
};

const STEPS = [
  {
    icon: Search,
    title: '1. Search by what you actually need',
    body:
      'Filter Residential Property, Short Lets, Hostels, Shared Property and Property for Sale by area, price, accommodation type and availability. Rental searches match individual Units inside a property and return the property that has at least one matching Unit.',
  },
  {
    icon: Building2,
    title: '2. Read the basic details first',
    body:
      'Before you pay anything you see the category, general area, the verified public photo, the documented Unit types with their basic prices, and whether they are available now. Exact address, protected photos, full intelligence and contacts stay locked.',
  },
  {
    icon: Lock,
    title: '3. Unlock at the listed fee',
    body:
      'Clicking Unlock opens a checkout that shows the effective fee, any Veriq Wallet credit applied, the remaining amount, the 24-hour access period, current availability and the refund rules. Some listings are marked Free, and unlock at ₦0. A property with no available unit cannot be unlocked at all — you can ask to be told when one is free instead.',
  },
  {
    icon: KeyRound,
    title: '4. Use your 24 hours of access',
    body:
      'Once payment is confirmed you get the exact verified location, all documented Units, protected photos, property-type intelligence, the linked Street Intelligence and the contact routes — for 24 hours from that confirmation. The exact expiry time is shown on your unlock.',
  },
  {
    icon: MessageCircle,
    title: '5. Contact and inspect',
    body:
      'Message or call the property contact directly on WhatsApp with a pre-filled Veriq reference, and message the assigned Veriq Agent about verification, intelligence or unlock questions. Always inspect in person before paying anyone.',
  },
  {
    icon: Clock,
    title: '6. Tell us what happened',
    body:
      'When your 24 hours end, protected details lock again and Veriq asks whether you took the property, did not take it, or are still considering. If you took it, you can tell us which Unit and opt into sharing resident experience later.',
  },
];

const UNLOCK_INCLUDES = [
  'Exact verified address and location',
  'All documented verified Units with details, prices and availability',
  'Full property and Unit photos intended for unlocked viewers',
  'Property-type and Unit-specific intelligence verified by a Veriq Agent',
  'Linked community-powered Street Intelligence with its source and confidence',
  'Property contact phone number and WhatsApp action',
  'WhatsApp support from the assigned Veriq Agent',
  'Short Let booking link where the operator provides one',
];

const CATEGORY_NOTES = [
  {
    icon: Building2,
    title: 'Residential, Short Lets and Hostels',
    body:
      'One unlock covers the whole property and every documented verified Unit — never a separate fee per room. These properties stay listed even when all Units are currently unavailable, and that is clearly shown before you pay.',
    href: '/properties',
    cta: 'Browse properties',
  },
  {
    icon: Users,
    title: 'Shared Property',
    body:
      'A current resident offers a room or bedspace in the home they occupy. Veriq verifies their identity, occupancy and permission to share. One unlock covers that opportunity, and it disappears from search as soon as the space is taken.',
    href: '/shared',
    cta: 'Browse Shared Property',
  },
  {
    icon: Landmark,
    title: 'Property for Sale',
    body:
      'Sellers do not self-list. A Veriq Agent verifies the seller, confirms the property or land and records the status of each document. You see document statuses — never the documents — and a sighted document is not a legal search.',
    href: '/for-sale',
    cta: 'Browse Property for Sale',
  },
];

export default function HowItWorksPage() {
  return (
    <>
      <section className="bg-background pb-14 pt-28 text-foreground sm:pt-32">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6ee7b7]">How Veriq works</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-5xl">Know before you go — and know exactly what you are paying for.</h1>
          <p className="mt-5 max-w-3xl text-sm leading-7 text-muted-foreground sm:text-base">
            Veriq sells time-limited access to verified property information, property-type intelligence and clearly labelled community-powered
            Street Intelligence. An unlock is not a reservation and does not guarantee a successful rental, booking or purchase. There is no agency
            fee and no inspection fee in the Veriq model.
          </p>
          <div className="mt-7 flex flex-wrap gap-3">
            <Link href="/properties" className="btn-primary">Start searching</Link>
            <Link href="/refund-policy" className="btn-outline !border-white/30 !bg-transparent !text-foreground hover:!bg-[#ffffff0f]">Refund Policy</Link>
          </div>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-foreground sm:text-3xl">From search to inspection</h2>
          <div className="mt-8 grid gap-5 sm:grid-cols-2">
            {STEPS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-[#ffffff12] bg-card p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b98112] text-primary"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div>
            <h2 className="font-display text-2xl font-black text-foreground">What an unlock gives you</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Exactly what is included is listed on the checkout for each listing, because it differs slightly between rentals, Shared Property and
              Property for Sale. For a rental property it normally includes:
            </p>
            <ul className="mt-5 space-y-2">
              {UNLOCK_INCLUDES.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm text-foreground"><CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-primary" /> {item}</li>
              ))}
            </ul>
          </div>
          <div className="space-y-4">
            <div className="rounded-2xl border border-[#ffffff12] bg-card p-5">
              <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><CreditCard className="h-4 w-4 text-primary" /> Paying for an unlock</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                You are never asked to fund a wallet first. Available Veriq Wallet credit is applied automatically up to the fee: with enough credit the
                unlock is confirmed without a payment page, with partial credit you pay only the difference, and with no credit you pay the fee directly.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ffffff12] bg-card p-5">
              <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><ShieldCheck className="h-4 w-4 text-primary" /> Access starts only after payment is confirmed</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Returning from the payment page is not proof of payment. Veriq verifies the payment with the provider, then starts and records your access
                period. A failed, cancelled or pending payment never grants access, and credit held for an unfinished checkout is released.
              </p>
            </div>
            <div className="rounded-2xl border border-[#ffffff12] bg-card p-5">
              <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><Wallet className="h-4 w-4 text-primary" /> Veriq Wallet</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The wallet holds approved refund credit. It does not expire, works across every eligible category, and is spent only when you choose to
                unlock something. <Link href="/dashboard/wallet" className="font-semibold text-primary hover:underline">View your wallet</Link>.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-foreground">How each category works</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-3">
            {CATEGORY_NOTES.map(({ icon: Icon, title, body, href, cta }) => (
              <article key={title} className="flex flex-col rounded-2xl border border-[#ffffff12] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#ffffff08] text-foreground"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 flex-1 text-sm leading-6 text-muted-foreground">{body}</p>
                <Link href={href} className="mt-4 text-sm font-semibold text-primary hover:underline">{cta}</Link>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-8 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <div className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-foreground"><MapPin className="h-5 w-5 text-primary" /> Street Intelligence is community powered</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              Every listing links to the canonical record for its street. Inside an unlock you see that record with its source label, confidence level and
              last-updated date, and you can share the standalone street page with people who know the area so they can contribute. A shared street link
              never carries property addresses, protected photos, contacts or your access.
            </p>
            <Link href="/street-intelligence" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Explore Street Intelligence</Link>
          </div>
          <div className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <p className="flex items-center gap-2 font-display text-lg font-bold text-foreground"><Undo2 className="h-5 w-5 text-muted-foreground" /> If something was wrong</p>
            <p className="mt-3 text-sm leading-6 text-muted-foreground">
              If a qualifying problem affected your unlock — for example the listing was already unavailable, the contact was invalid, or a verified fact was
              materially inaccurate — you can request a refund from My Unlocks within the refund window. Veriq Admin reviews the evidence and decides.
              Approved refunds are credited to your Veriq Wallet for future unlocks, not returned as cash.
            </p>
            <Link href="/refund-policy" className="mt-4 inline-flex text-sm font-semibold text-primary hover:underline">Read the Refund Policy</Link>
          </div>
        </div>
      </section>

      <section className="bg-card pb-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex items-start gap-3 rounded-2xl border border-[#fbbf2430] bg-[#fbbf2410] p-5">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#fcd34d]" />
            <p className="text-sm leading-6 text-[#fcd34d]">
              Always inspect a property in person and confirm terms directly with the property contact before paying anyone. Veriq provides verified
              information and intelligence to help you decide — it is not a guarantee, and Veriq never asks you to pay rent, a deposit or a purchase price
              through the platform. <Link href="/safety" className="font-semibold underline">Read the safety guidance</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
