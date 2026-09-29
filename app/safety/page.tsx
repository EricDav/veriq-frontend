import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Eye, Flag, Lock, MessageCircle, PhoneCall, ShieldCheck, UserCheck, Wallet } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Safety & Verification',
  description:
    'How to stay safe when inspecting a property found on Veriq, what Veriq protects, what Veriq will never ask you to do, and how to report a problem.',
};

const BEFORE = [
  'Read the basic details and availability before you unlock. If a listing is marked unavailable, you can still unlock it to research it — but that is not a refund reason later.',
  'Check the linked Street Intelligence for the street, with its source and confidence labels, before committing time to a trip.',
  'Confirm the contribution, rent or asking price, and what it covers, in writing with the property contact before travelling.',
];

const DURING = [
  'Inspect in daylight where possible, and tell someone you trust where you are going and when you expect to be back.',
  'Bring someone with you, especially for a first viewing or for a shared home where you would be living with others.',
  'Check the things photos cannot show: water and power supply, drainage after rain, noise at different times, security arrangements and the state of shared bathrooms and kitchens.',
  'Match what you see to what Veriq verified. If something material is different, record it — photos and dates help if you later request a refund.',
];

const MONEY = [
  'Never pay rent, a deposit, a service charge or a purchase price through Veriq. Veriq only ever charges the unlock fee.',
  'Do not pay anyone before you have inspected the property and confirmed who they are and what you are paying for.',
  'For a purchase, instruct your own lawyer and surveyor. Document statuses recorded by a Veriq Agent are not a legal search.',
  'Be cautious of pressure to pay immediately to "hold" a property, requests to move off WhatsApp to an unknown number, or prices far below the market.',
];

export default function SafetyPage() {
  return (
    <>
      <section className="bg-background pb-14 pt-28 text-foreground sm:pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6ee7b7]">Safety &amp; Verification</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">Inspect smarter, and stay safe doing it</h1>
          <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
            Veriq reduces wasted trips by verifying property information before you travel. It does not replace your own judgement: always inspect in
            person, confirm who you are dealing with, and never send money before you are satisfied.
          </p>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-3 lg:px-8">
          <article className="rounded-2xl border border-[#ffffff12] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b98112] text-primary"><Eye className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-base font-bold text-foreground">Before you travel</h2>
            <ul className="mt-3 space-y-2">
              {BEFORE.map((item) => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>)}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#ffffff12] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b98112] text-primary"><UserCheck className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-base font-bold text-foreground">At the inspection</h2>
            <ul className="mt-3 space-y-2">
              {DURING.map((item) => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>)}
            </ul>
          </article>
          <article className="rounded-2xl border border-[#ffffff12] p-5">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b98112] text-primary"><Wallet className="h-5 w-5" /></span>
            <h2 className="mt-4 font-display text-base font-bold text-foreground">About money</h2>
            <ul className="mt-3 space-y-2">
              {MONEY.map((item) => <li key={item} className="text-sm leading-6 text-muted-foreground">{item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground"><ShieldCheck className="h-5 w-5 text-primary" /> What Veriq protects</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li><span className="font-semibold text-foreground">Your location privacy.</span> Exact addresses, coordinates and protected photos are never in public pages or public API responses — only inside a valid unlock, checked on the server each time.</li>
              <li><span className="font-semibold text-foreground">Other people&apos;s documents.</span> Identity, occupancy and authority evidence, and sale source documents, are private verification records. They are never published, and never shown to renters or buyers.</li>
              <li><span className="font-semibold text-foreground">Occupants.</span> Operators are not required to intrude on occupied homes for photographs; Units are documented when that can be done lawfully and respectfully.</li>
              <li><span className="font-semibold text-foreground">Shared street links.</span> Sharing Street Intelligence shares only the street page. It never carries a property address, protected image, contact or your unlock access.</li>
            </ul>
          </article>
          <article className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <h2 className="flex items-center gap-2 font-display text-lg font-bold text-foreground"><Lock className="h-5 w-5 text-primary" /> Protect your account</h2>
            <ul className="mt-4 space-y-3 text-sm leading-6 text-muted-foreground">
              <li>Veriq will never ask for your password or a one-time code. Anyone who does is not from Veriq.</li>
              <li>Pay only on the secure payment page opened from the Veriq checkout, and check the reference shown on your unlock afterwards.</li>
              <li>Unlock access belongs to your account. Sharing screenshots of protected details with other people is a breach of these terms.</li>
              <li>If you think your account has been accessed by someone else, change your password and <Link href="/contact" className="font-semibold text-primary hover:underline">contact Veriq</Link> straight away.</li>
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-black text-foreground"><Flag className="h-6 w-6 text-primary" /> Report a problem</h2>
          <div className="mt-6 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-[#ffffff12] p-5">
              <MessageCircle className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-bold text-foreground">Something looks wrong in a listing</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Message the assigned Veriq Agent from the unlocked page while your access is active.</p>
            </div>
            <div className="rounded-2xl border border-[#ffffff12] p-5">
              <PhoneCall className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-bold text-foreground">The contact does not work</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">An invalid or wrong property contact is a qualifying refund reason. Raise it from <Link href="/dashboard/unlocks" className="font-semibold text-primary hover:underline">My Unlocks</Link> inside the refund window.</p>
            </div>
            <div className="rounded-2xl border border-[#ffffff12] p-5">
              <AlertTriangle className="h-5 w-5 text-primary" />
              <p className="mt-3 text-sm font-bold text-foreground">Suspected fraud or a dispute</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground"><Link href="/contact" className="font-semibold text-primary hover:underline">Contact Veriq support</Link>. Admin can suspend a listing immediately and freeze sensitive changes while a dispute is investigated.</p>
            </div>
          </div>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">
            See the <Link href="/verification-rules" className="font-semibold text-primary hover:underline">verification rules</Link> for what a Veriq
            Agent checks, and the <Link href="/refund-policy" className="font-semibold text-primary hover:underline">Refund Policy</Link> for what
            qualifies for a refund. In an emergency, always contact the local authorities first.
          </p>
        </div>
      </section>
    </>
  );
}
