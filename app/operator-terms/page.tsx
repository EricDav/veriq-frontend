import type { Metadata } from 'next';
import Link from 'next/link';
import { AlertTriangle, Building2, CheckCircle2, ClipboardList, FileCheck2, Home, KeyRound, Landmark, Users, XCircle } from 'lucide-react';

export const metadata: Metadata = {
  title: 'Property Operator Terms',
  description:
    'What Veriq expects from Property Operators: who may hold an account, what evidence is required, what you control after publication, and what only a Veriq Agent can do.',
};

const CONTEXTS = [
  {
    icon: Home,
    title: 'Residential Property',
    holder: 'Landlord or property owner only',
    body:
      'Caretakers never hold an account or sign in. A caretaker is a replaceable property contact record that renters see after an unlock. Replacing the caretaker does not change the property record, its Units, its intelligence or its assigned Veriq Agent.',
  },
  {
    icon: Building2,
    title: 'Short Lets and Hostels',
    holder: 'The individual or business operating the accommodation',
    body:
      'You must establish identity and legitimate authority to operate the accommodation — ownership evidence, a management or operating agreement, lease or hospitality-management rights, owner authorisation, or comparable credible evidence.',
  },
  {
    icon: Users,
    title: 'Shared Property',
    holder: 'The current resident offering the space',
    body:
      'You must establish identity, prove that you currently occupy the home, and declare that you are permitted to share or sublet and that the listing does not breach your tenancy obligations. Veriq may require landlord or caretaker confirmation where evidence is inadequate or disputed.',
  },
  {
    icon: Landmark,
    title: 'Property for Sale',
    holder: 'No seller self-listing',
    body:
      'Sale listings are created, verified, managed and published by a Veriq Agent after the seller or owner and their authority to sell are verified. Sellers are verified parties on the listing, not account holders who publish it.',
  },
];

const CAN = [
  'Create and submit properties, opportunities and Units, with the required facts, commercial terms and structured intelligence.',
  'Upload media for verification and add further Units later as they become documentable.',
  'Update availability immediately on your own records — the change takes effect at once and is recorded in history.',
  'Submit updated commercial or contact details subject to validation.',
  'Submit correction or intelligence-review requests to your assigned Veriq Agent.',
  'See your assigned Veriq Agent and the verification and publication status of every record.',
];

const CANNOT = [
  'Publish a property yourself — publication is a Veriq Agent responsibility.',
  'Overwrite the approved public snapshot of property or Unit intelligence; edits go through a working revision the assigned Agent reviews.',
  'Silently replace verified public or unlocked media — new media enters Pending Review while the current verified media stays live.',
  'Change a verified exact address without going through the verification workflow.',
  'Remove audit history or verification evidence.',
  'Assign or reassign your Veriq Agent, or see Agent earnings or internal quality information.',
];

const ACCOUNT_REQUIREMENTS = [
  'Full legal name, or a verified operating entity name.',
  'Phone number verified by OTP, and an email address.',
  'Government-issued identity verification for individuals, or appropriate business verification for entities.',
  'Your general operating area.',
  'Acceptance of these Operator terms, accuracy declarations, verification consent, privacy terms and any category-specific declarations.',
  'Optionally, a Veriq Agent referral code, which only sets your initial Agent assignment.',
];

export default function OperatorTermsPage() {
  return (
    <>
      <section className="bg-navy-900 pb-14 pt-28 text-white sm:pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Property Operator Terms</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">Listing on Veriq: what is expected of you</h1>
          <p className="mt-5 text-sm leading-7 text-white/70 sm:text-base">
            Property Operator is the supply-side account: landlords, Short Let and Hostel operators, and residents offering Shared Property. Listing is
            free at launch. Operators receive no share of unlock revenue, and Veriq never collects rent, deposits or purchase money on your behalf.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <h2 className="font-display text-2xl font-black text-navy-900">Who holds the account</h2>
          <p className="mt-2 max-w-3xl text-sm leading-6 text-veriq-muted">
            One verified identity can operate in more than one context — a landlord who also runs a Short Let does not need a second account — but each
            property context keeps its own authority and verification requirements.
          </p>
          <div className="mt-8 grid gap-5 md:grid-cols-2">
            {CONTEXTS.map(({ icon: Icon, title, holder, body }) => (
              <article key={title} className="rounded-2xl border border-slate-200 p-5">
                <span className="flex h-10 w-10 items-center justify-center rounded-full bg-navy-50 text-navy-700"><Icon className="h-5 w-5" /></span>
                <h3 className="mt-4 font-display text-base font-bold text-navy-900">{title}</h3>
                <p className="mt-1 text-xs font-semibold uppercase tracking-wide text-veriq-secondary">{holder}</p>
                <p className="mt-2 text-sm leading-6 text-veriq-muted">{body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-veriq-surface py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-black text-navy-900"><ClipboardList className="h-6 w-6 text-veriq-secondary" /> Account requirements</h2>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {ACCOUNT_REQUIREMENTS.map((item) => (
              <li key={item} className="flex items-start gap-2 rounded-xl border border-slate-200 bg-white p-4 text-sm leading-6 text-slate-700">
                <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-emerald-500" /> {item}
              </li>
            ))}
          </ul>
          <p className="mt-4 text-xs leading-6 text-slate-500">
            Identity documents, proof of occupancy and authority evidence are private verification evidence. They are never shown publicly, never shown to
            renters, and never published as listing media.
          </p>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-slate-200 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> What you control</h2>
            <ul className="mt-4 space-y-3">
              {CAN.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" /> {item}</li>)}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><XCircle className="h-5 w-5 text-red-400" /> What only Veriq can do</h2>
            <ul className="mt-4 space-y-3">
              {CANNOT.map((item) => <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><XCircle className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-red-400" /> {item}</li>)}
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-veriq-surface py-14 sm:py-16">
        <div className="mx-auto max-w-4xl space-y-5 px-4 sm:px-6 lg:px-8">
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><KeyRound className="h-4 w-4 text-veriq-secondary" /> Availability is your responsibility</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">
              Mark a Unit or opportunity unavailable as soon as it is taken. Changes apply immediately and are recorded with the time and the person who made
              them. Veriq asks you to reconfirm availability regularly; a Unit that is not reconfirmed within the configured freshness period moves to
              Unavailable rather than staying publicly available while stale. Availability history is the evidence Veriq uses when a renter requests a refund.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 bg-white p-6">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><FileCheck2 className="h-4 w-4 text-veriq-secondary" /> Accuracy and occupant privacy</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">
              Everything you submit must be true and current. You are not required to intrude on occupied Units for photographs; document those Units later,
              lawfully and without infringing your current occupants&apos; privacy. Material inaccuracy that causes a renter refund is investigated, and
              repeated problems can lead to suspension of a listing or account.
            </p>
          </article>
          <article className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-6">
            <AlertTriangle className="mt-0.5 h-5 w-5 flex-shrink-0 text-amber-600" />
            <p className="text-sm leading-6 text-amber-900">
              Veriq may suspend or unpublish a listing immediately where authority is disputed, a duplicate or fraudulent record is suspected, or a
              verification requirement fails. Records are retained and remain auditable; they are not deleted to hide a change.
            </p>
          </article>
        </div>
      </section>

      <section className="bg-white pb-16">
        <div className="mx-auto max-w-4xl px-4 text-sm leading-6 text-veriq-muted sm:px-6 lg:px-8">
          These Operator terms sit alongside the Veriq <Link href="/terms" className="font-semibold text-veriq-secondary hover:underline">Terms &amp; Conditions</Link> and{' '}
          <Link href="/privacy" className="font-semibold text-veriq-secondary hover:underline">Privacy Policy</Link>. See the{' '}
          <Link href="/verification-rules" className="font-semibold text-veriq-secondary hover:underline">verification rules</Link> for what a Veriq Agent
          checks before a listing is published, or <Link href="/contact" className="font-semibold text-veriq-secondary hover:underline">contact Veriq</Link>{' '}
          if you are unsure which context applies to you.
        </div>
      </section>
    </>
  );
}
