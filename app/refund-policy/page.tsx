import type { Metadata } from 'next';
import Link from 'next/link';
import { CheckCircle2, Clock, Gift, ListChecks, Scale, ShieldCheck, Wallet, XCircle } from 'lucide-react';
import type { RefundPolicy } from '@/types/renter';

export const metadata: Metadata = {
  title: 'Refund Policy',
  description:
    'When a Veriq unlock qualifies for a refund, what does not qualify, how to request one, and why approved refunds are credited to your Veriq Wallet.',
};

export const revalidate = 300;

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL ?? 'http://localhost:3000/api/v1';

/** Published policy text comes from the backend so the site always matches the rules Admin actually applies. */
const FALLBACK_POLICY: RefundPolicy = {
  launchRule:
    'The launch refund rule: the unit was Available when you paid, it is confirmed Unavailable inside your access window, you did not take it, and you asked for the refund before your access expired. The Veriq Agent confirms the availability change, or Admin decides.',
  qualifying: [
    'The unit was Available when you paid and was confirmed Unavailable inside your access window, you did not take it, and you asked before your access expired.',
    'The Property or Unit was shown as available at unlock but was already unavailable and the availability record was materially stale or incorrect.',
    'The Property Contact was materially invalid, wrong, or no longer legitimately associated with the property.',
    'The unlocked property materially differs from what Veriq verified or represented.',
    'The exact location cannot reasonably be found because Veriq’s verified location information is materially wrong.',
    'A significant Veriq-verified fact or intelligence item is materially inaccurate due to a verification failure.',
    'The street link or Agent-supplied Initial Veriq Intelligence was materially wrong at unlock.',
    'A technical or payment failure resulted in payment without proper unlock access.',
    'Duplicate payment for the same intended unlock.',
    'For Property for Sale: a publicly represented document status or other verified sale fact was materially inaccurate at unlock.',
    'For Property for Sale: the listing was shown as Available but had already been sold or withdrawn and the record was materially stale.',
  ],
  nonQualifying: [
    'You changed your mind.',
    'You inspected and did not like the property.',
    'You found another property.',
    'You did not inspect or use the unlock within the access period.',
    'You knowingly unlocked a property clearly marked unavailable.',
    'The property was genuinely available at unlock but someone else took it afterwards.',
    'The unlock did not result in a successful rental, booking or purchase (including a sale that did not proceed).',
  ],
  creditOnly:
    'Approved refunds are credited to your Veriq Wallet for future unlocks. They are not paid out as cash and credits do not expire.',
  freeUnlock:
    'A Free Unlock has no refundable payment value. You can still report an access or accuracy issue for investigation.',
  reasons: [],
};

async function loadPolicy(): Promise<{ policy: RefundPolicy; live: boolean }> {
  try {
    const res = await fetch(`${API_BASE}/refunds/policy`, { next: { revalidate } });
    if (!res.ok) return { policy: FALLBACK_POLICY, live: false };
    const body = (await res.json()) as { data?: Partial<RefundPolicy> };
    const data = body.data;
    if (!data?.qualifying?.length || !data.nonQualifying?.length) return { policy: FALLBACK_POLICY, live: false };
    return {
      policy: {
        launchRule: data.launchRule ?? FALLBACK_POLICY.launchRule,
        qualifying: data.qualifying,
        nonQualifying: data.nonQualifying,
        creditOnly: data.creditOnly ?? FALLBACK_POLICY.creditOnly,
        freeUnlock: data.freeUnlock ?? FALLBACK_POLICY.freeUnlock,
        reasons: data.reasons ?? [],
      },
      live: true,
    };
  } catch {
    return { policy: FALLBACK_POLICY, live: false };
  }
}

const STEPS = [
  'Open My Unlocks in your dashboard and select the unlock the problem relates to.',
  'Choose Request Refund. The qualifying and non-qualifying conditions are shown again before you submit.',
  'Select the reason that matches what happened and add an explanation. Attach photos, screenshots or documents where they help.',
  'Submit the request. Veriq Admin reviews the availability history, the unlock and payment record, the verification data and any evidence from the Veriq Agent or Property Operator.',
  'Veriq approves or rejects the request and records the reason. You are notified either way and can follow the case in your dashboard.',
];

export default async function RefundPolicyPage() {
  const { policy } = await loadPolicy();

  return (
    <>
      <section className="bg-navy-900 pb-14 pt-28 text-white sm:pt-32">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">Refund Policy</p>
          <h1 className="mt-2 font-display text-3xl font-bold leading-tight sm:text-4xl">Refund protection for paid unlocks</h1>
          <p className="mt-5 text-sm leading-7 text-white/70 sm:text-base">
            Veriq charges for time-limited access to verified property information. Refund rules apply only where money or wallet value was actually
            charged, and they cover problems with the accuracy, availability or delivery of what you unlocked — not the outcome of your search.
          </p>
          <div className="mt-6 space-y-3">
            <div className="flex items-start gap-3 rounded-2xl border border-emerald-400/30 bg-emerald-400/10 p-4">
              <Scale className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
              <div>
                <p className="text-sm font-semibold text-white">The launch rule</p>
                <p className="mt-1 text-sm leading-6 text-emerald-100">{policy.launchRule}</p>
              </div>
            </div>
            <div className="flex items-start gap-3 rounded-2xl border border-white/15 bg-white/5 p-4">
              <Wallet className="mt-0.5 h-5 w-5 flex-shrink-0 text-emerald-300" />
              <p className="text-sm leading-6 text-white/80">{policy.creditOnly}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-6 px-4 sm:px-6 lg:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-slate-200 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><CheckCircle2 className="h-5 w-5 text-emerald-500" /> What qualifies</h2>
            <ul className="mt-4 space-y-3">
              {policy.qualifying.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><CheckCircle2 className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-emerald-500" /> {item}</li>
              ))}
            </ul>
          </article>
          <article className="rounded-2xl border border-slate-200 p-6">
            <h2 className="flex items-center gap-2 font-display text-xl font-bold text-navy-900"><XCircle className="h-5 w-5 text-red-400" /> What does not qualify</h2>
            <ul className="mt-4 space-y-3">
              {policy.nonQualifying.map((item) => (
                <li key={item} className="flex items-start gap-2 text-sm leading-6 text-slate-700"><XCircle className="mt-1 h-3.5 w-3.5 flex-shrink-0 text-red-400" /> {item}</li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section className="bg-veriq-surface py-14 sm:py-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <h2 className="flex items-center gap-2 font-display text-2xl font-black text-navy-900"><ListChecks className="h-6 w-6 text-veriq-secondary" /> How to request a refund</h2>
          <ol className="mt-6 space-y-4">
            {STEPS.map((step, index) => (
              <li key={step} className="flex gap-4 rounded-2xl border border-slate-200 bg-white p-4">
                <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-navy-900 text-xs font-bold text-white">{index + 1}</span>
                <p className="text-sm leading-6 text-slate-700">{step}</p>
              </li>
            ))}
          </ol>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/dashboard/unlocks" className="btn-primary">Open My Unlocks</Link>
            <Link href="/dashboard/refunds" className="btn-outline">Track a refund request</Link>
          </div>
        </div>
      </section>

      <section className="bg-white py-14 sm:py-16">
        <div className="mx-auto grid max-w-5xl gap-5 px-4 sm:px-6 md:grid-cols-2 lg:px-8">
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><Clock className="h-4 w-4 text-veriq-secondary" /> The refund window</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">
              A paid unlock gives you 24 hours of access from confirmed payment, and the refund window is the same 24 hours. It never outlives your
              access, so a request has to arrive before your access expires. The exact deadline for each unlock is shown in My Unlocks and on the
              refund form.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><ShieldCheck className="h-4 w-4 text-veriq-secondary" /> Who decides</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">
              The listing&apos;s Veriq Agent confirms or disputes that the unit became unavailable inside your access window, and Admin decides every
              case that the launch rule does not settle outright. The Property Operator may be asked for evidence but never decides. Decisions and the
              evidence behind them are recorded, and the related Agent earnings stay on hold until the 24-hour window and any dispute are resolved.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><Wallet className="h-4 w-4 text-veriq-secondary" /> What approval changes</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">
              An approved refund of the unlock purchase credits the full amount charged — including any wallet-funded part — to your Veriq Wallet and ends
              access to that listing immediately. A duplicate charge is refunded on its own and leaves your separately paid, valid unlock untouched.
            </p>
          </article>
          <article className="rounded-2xl border border-slate-200 p-5">
            <p className="flex items-center gap-2 font-display text-base font-bold text-navy-900"><Gift className="h-4 w-4 text-veriq-secondary" /> Free Unlocks</p>
            <p className="mt-2 text-sm leading-6 text-veriq-muted">{policy.freeUnlock} <Link href="/contact" className="font-semibold text-veriq-secondary hover:underline">Contact support</Link> if a Free Unlock had an access or accuracy problem.</p>
          </article>
        </div>
      </section>

      <section className="bg-veriq-surface pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-sm leading-6 text-veriq-muted">
            <p className="font-semibold text-navy-900">Fair use</p>
            <p className="mt-2">
              Veriq reviews repeated or unusual refund behaviour to protect legitimate refund rights for everyone. Evidence and decisions remain on record,
              and a request is never rejected simply because you have asked before. Disputed community Street Intelligence is reviewed against the street
              version shown and its source and confidence labels; disagreement alone does not establish inaccuracy.
            </p>
            <p className="mt-3">
              Questions about a specific decision? <Link href="/contact" className="font-semibold text-veriq-secondary hover:underline">Contact Veriq support</Link>.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
