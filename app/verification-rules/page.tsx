import type { Metadata } from 'next';
import Link from 'next/link';
import { BadgeCheck, Camera, FileCheck2, Landmark, MapPin, Scale, ShieldCheck, Sparkles, Users } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Verification Rules',
  description:
    'What a Veriq Agent checks before a listing is published: authority, exact location, facts, media, Units, document statuses and the linked Street Intelligence.',
};

const CHECKS = [
  {
    icon: ShieldCheck,
    title: 'Authority and relationship',
    body:
      'The Agent confirms that the Property Operator really is the landlord, the authorised operator, or the resident entitled to share the space. Identity documents, occupancy evidence and authority evidence are private verification records and are never published.',
  },
  {
    icon: MapPin,
    title: 'Exact location and street linkage',
    body:
      'The Agent confirms the exact address and coordinates, links the listing to the correct canonical State → LGA → Veriq Area → Street record, and checks that the property is not a duplicate of an existing Veriq record. Public pages show the general area only.',
  },
  {
    icon: FileCheck2,
    title: 'Facts, Units and commercial terms',
    body:
      'Property and Unit facts are validated against what the Agent can observe, each documented Unit gets a stable label and type, and commercial terms are reviewed for permitted fields and obvious inconsistencies. Agency and inspection fees are not supported charges.',
  },
  {
    icon: Camera,
    title: 'Media',
    body:
      'Required photos must match the category and the actual property. Operator uploads enter Pending Review, and current verified images stay live until the Agent approves a replacement. Each media category is independently capped at five images.',
  },
  {
    icon: Sparkles,
    title: 'Structured intelligence',
    body:
      'The Agent reviews the Operator-supplied property-level and Unit-level intelligence, corrects what is wrong, and may add an Agent Observation. Required answers start blank, offer no "Unknown" option, and must be answered deliberately.',
  },
  {
    icon: BadgeCheck,
    title: 'Publication and re-checks',
    body:
      'A Veriq Agent with active publishing permission publishes directly; Admin keeps audit, unpublish, suspend and permission control. After publication, availability changes apply immediately, while verified facts, addresses and intelligence changes go back through review.',
  },
];

export default function VerificationRulesPage() {
  return (
    <>
      <section className="bg-background pb-14 pt-28 text-foreground sm:pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-[#6ee7b7]">Verification Rules</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">What Veriq checks before you ever see a listing</h1>
          <p className="mt-5 text-sm leading-7 text-muted-foreground sm:text-base">
            Every listing on Veriq is verified by an assigned Veriq Agent — an independent verification professional, not an agency-fee intermediary.
            Verification is about what can be established and recorded, and Veriq is explicit about the limits of what it can confirm.
          </p>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-foreground">The verification checklist</h2>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {CHECKS.map(({ icon: Icon, title, body }) => (
              <article key={title} className="rounded-2xl border border-[#ffffff12] p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-[#10b98112] text-primary"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-base font-bold text-foreground">{title}</h3>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-background py-14 sm:py-16">
        <div className="mx-auto max-w-5xl space-y-5 px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-foreground">Category-specific rules</h2>
          <article className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><Users className="h-4 w-4 text-primary" /> Shared Property</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              The resident must prove current occupancy — for example a tenancy agreement, rent receipt, service-charge receipt, a bill that identifies them,
              or a written landlord acknowledgement — and formally declare that they are permitted to share the space. A utility bill alone is not treated as
              sufficient, because it may be in another person&apos;s name. The opportunity is published with a verified private location and a room or
              living-area photo, and it is hidden from search the moment the space becomes unavailable. Reactivation is immediate only while verification is
              still fresh; otherwise a lightweight re-verification is required first.
            </p>
          </article>
          <article className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><Landmark className="h-4 w-4 text-primary" /> Property for Sale</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              A Veriq Agent verifies the seller or owner&apos;s identity and authority to sell, confirms the physical property or land, and completes a
              document checklist appropriate to Built Property or Land. Each document is recorded as Available, Not Available, Not Presented, Sighted by
              Veriq Agent, or requiring further verification. Conflicts, suspected forgery, ownership disputes or material location and document
              inconsistencies are escalated to Admin and block publication until resolved.
            </p>
            <div className="mt-4 flex items-start gap-3 rounded-xl border border-[#fbbf2430] bg-[#fbbf2410] p-4">
              <Scale className="mt-0.5 h-5 w-5 flex-shrink-0 text-[#fcd34d]" />
              <p className="text-sm leading-6 text-[#fcd34d]">
                <span className="font-semibold">A sighted document is not a legal search.</span> Veriq records what was presented and observed. An
                independent qualified legal or title search is recorded separately and is never inferred from a document sighting. Always instruct your own
                lawyer and surveyor before buying.
              </p>
            </div>
          </article>
          <article className="rounded-2xl border border-[#ffffff12] bg-card p-6">
            <p className="flex items-center gap-2 font-display text-base font-bold text-foreground"><MapPin className="h-4 w-4 text-primary" /> Street Intelligence linkage</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">
              Every listing must link to the canonical Street Intelligence record for its verified street — never a similarly named street elsewhere. Where a
              street already has community intelligence, it is reused with its existing source and confidence labels, even when confidence is low. Where an
              approved street has none, the Agent may supply Initial Veriq Intelligence, which is labelled as such and never presented as
              community-confirmed. Agents cannot edit or overwrite the community aggregate.
            </p>
            <Link href="/street-intelligence" className="mt-3 inline-flex text-sm font-semibold text-primary hover:underline">See Street Intelligence</Link>
          </article>
        </div>
      </section>

      <section className="bg-card py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-foreground">What verification does not mean</h2>
          <ul className="mt-5 space-y-3 text-sm leading-6 text-muted-foreground">
            <li className="rounded-xl border border-[#ffffff12] p-4">Verified does not mean guaranteed. Conditions change, and a property that was genuinely available at unlock can be taken by someone else afterwards.</li>
            <li className="rounded-xl border border-[#ffffff12] p-4">Verification is not a legal, structural or valuation opinion. Veriq records observations and document statuses; professional advice remains your responsibility.</li>
            <li className="rounded-xl border border-[#ffffff12] p-4">Street Intelligence is community powered. Its source, confidence level and last-updated date are always shown so you can weigh it yourself.</li>
            <li className="rounded-xl border border-[#ffffff12] p-4">Veriq Agents are paid a share of unlock revenue. They do not charge you an agency or inspection fee, and they never approve their own refund cases.</li>
          </ul>
          <p className="mt-6 text-sm leading-6 text-muted-foreground">
            Found something inaccurate in a listing you unlocked? Message the assigned Veriq Agent from the unlocked page, or{' '}
            <Link href="/dashboard/refunds/new" className="font-semibold text-primary hover:underline">raise a refund request</Link> while your refund
            window is open. See the <Link href="/refund-policy" className="font-semibold text-primary hover:underline">Refund Policy</Link> for what qualifies.
          </p>
        </div>
      </section>
    </>
  );
}
