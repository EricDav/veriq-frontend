import type { SiteContent } from '@/types';
import { Eyebrow } from '@/components/ui';

/**
 * The prototype's "From search to certainty" band: three numbered columns, each opening on a hairline
 * rule and a large emerald numeral in Sora. Three steps, not four — the prototype folds previewing
 * into the first, because a renter does not experience it as a separate act.
 */
const STEPS = [
  {
    number: '01',
    title: 'Find a place that fits',
    description:
      'Browse by category, area, price and availability. See your options before spending anything.',
  },
  {
    number: '02',
    title: 'Unlock the full picture',
    description:
      'Get 24-hour access to verified property details, all documented units, photos, contacts and linked Street Intelligence.',
  },
  {
    number: '03',
    title: 'Connect and decide',
    description:
      'Speak directly with the owner or caretaker. Ask your assigned Veriq Agent for support when you need it.',
  },
];

export function HowItWorks({ content: _content }: { content?: SiteContent }) {
  return (
    <section id="how-it-works" className="bg-background py-14 sm:py-[60px]">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <Eyebrow>From search to certainty</Eyebrow>
        <h2 className="mt-4 max-w-2xl font-display text-[1.9rem] font-semibold leading-[1.15] tracking-[-0.04em] text-foreground sm:text-[2.2rem]">
          Less guesswork. More confidence.
        </h2>

        <ol className="mt-10 grid gap-x-9 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
          {STEPS.map(({ number, title, description }) => (
            <li key={number} className="border-t border-border pt-7">
              <span className="block font-display text-[1.7rem] leading-none text-primary">{number}</span>
              <h3 className="mt-[30px] font-display text-base font-semibold text-foreground">{title}</h3>
              <p className="mt-3 text-[0.95rem] leading-[1.6] text-muted-foreground">{description}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
