import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight, Check } from 'lucide-react';
import { Button, Eyebrow, Panel } from '@/components/ui';
import { getPublicPageContent } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'About Us',
  description:
    'Veriq connects people with property intelligence and direct operator contacts, helping them understand a place before arranging an inspection.',
};

/**
 * The prototype's `#about` is a single prose column: eyebrow, one Sora headline, a lead, three
 * unnumbered blocks and two closing actions. Everything below the three blocks is ours — the CMS-backed
 * "problems we solve" list and the values strip — and is kept in the same grammar rather than dropped,
 * because the prototype is a static design with no content system behind it.
 */
const BLOCKS = [
  {
    title: 'Know the property',
    body:
      'Operators supply property-level intelligence, individual unit details and images. Veriq Agents verify the submission, add observations, link Street Intelligence and publish. You can explore the full package after unlocking.',
  },
  {
    title: 'Understand the street',
    body:
      'Linked Street Intelligence brings together street-level knowledge with visible sources and confidence. Community contributions help the picture improve over time.',
  },
  {
    title: 'Connect directly',
    body:
      'After unlocking, contact the owner or caretaker directly. Your assigned Veriq Agent remains available for support.',
  },
];

/** Shown when the CMS has no `problems` section for this page. */
const PROBLEMS = [
  'Misleading or incomplete property listings',
  'Wasted inspection trips and transport costs',
  'Poor visibility into property condition before inspection',
  'Little reliable information about the street or surrounding environment',
  'Unclear availability, so a place is already gone before you call',
  'No straightforward way to reach the person actually responsible for the property',
];

const VALUES = [
  {
    title: 'Accuracy over volume',
    body:
      'A verified property with honest availability is worth more than ten listings nobody has checked.',
  },
  {
    title: 'A clear locked boundary',
    body:
      'What is free stays useful, and what an unlock adds is stated plainly before you pay anything.',
  },
  {
    title: 'Sources you can weigh',
    body:
      'Intelligence carries its source, its confidence and when it was recorded, so you can judge it yourself.',
  },
  {
    title: 'Decisions, not promises',
    body:
      'Veriq helps you decide whether a place is worth the trip. It never stands in for the inspection itself.',
  },
];

export default async function AboutPage() {
  const content = await getPublicPageContent('about');
  const hero = content.hero;
  const problems = content.problems;
  const managedItems = problems?.data?.items;
  const problemsSolved =
    Array.isArray(managedItems) && managedItems.every((item): item is string => typeof item === 'string')
      ? managedItems
      : PROBLEMS;

  return (
    <section className="bg-background pb-16 pt-28 sm:pb-24 sm:pt-32">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="max-w-[790px]">
          <Eyebrow>About</Eyebrow>
          <h1 className="mt-3 font-display text-[2rem] font-semibold leading-[1.2] tracking-[-0.035em] text-foreground sm:text-[3.3rem] sm:leading-[1.25]">
            {hero?.title ?? 'Better property decisions start with better information.'}
          </h1>
          <p className="mt-5 text-[1.05rem] leading-[1.6] text-muted-foreground sm:text-[1.1rem]">
            {hero?.body ??
              'Veriq connects people with property intelligence and direct operator contacts, helping them understand a place before arranging an inspection.'}
          </p>

          {BLOCKS.map(({ title, body }) => (
            <div key={title} className="mt-8">
              <h2 className="font-display text-[1.35rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
                {title}
              </h2>
              <p className="mt-4 text-[0.95rem] leading-[1.6] text-muted-foreground">{body}</p>
            </div>
          ))}
        </div>

        <Panel as="section" aria-labelledby="problems-heading" className="mt-12 max-w-[790px]">
          <h2
            id="problems-heading"
            className="font-display text-[1.12rem] font-semibold leading-[1.3] tracking-[-0.035em] text-foreground"
          >
            What we set out to fix
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {problemsSolved.map((problem) => (
              <li key={problem} className="flex items-start gap-2.5 text-[0.9rem] leading-[1.55] text-muted-foreground">
                <Check className="mt-0.5 h-4 w-4 flex-none text-primary" aria-hidden="true" />
                <span>{problem}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <section aria-labelledby="values-heading" className="mt-14">
          <h2
            id="values-heading"
            className="font-display text-[1.35rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground"
          >
            How we work
          </h2>
          <ul className="mt-8 grid gap-x-9 gap-y-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ title, body }) => (
              <li key={title} className="border-t border-border pt-6">
                <h3 className="font-display text-base font-semibold text-foreground">{title}</h3>
                <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">{body}</p>
              </li>
            ))}
          </ul>
        </section>

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
