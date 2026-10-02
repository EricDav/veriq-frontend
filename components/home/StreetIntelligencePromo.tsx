import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Eyebrow, buttonClass } from '@/components/ui';

/**
 * The prototype's Street Intelligence band: one `.panel.grid.two` on a 125° green-to-dark wash, the
 * claim in Sora on the left and what it means plus the way in on the right.
 *
 * This sits on the homepage rather than on a property page on purpose — Blueprint §4 keeps Street
 * Intelligence separate from any single property, and it is "never sourced from a property page".
 */
export function StreetIntelligencePromo() {
  return (
    <section className="my-[25px] grid gap-6 rounded-2xl border border-[#ffffff12] bg-[linear-gradient(125deg,#102b26,#111827)] p-[21px] wide:my-10 wide:grid-cols-2 wide:items-center wide:p-10">
      <div>
        <Eyebrow>Community-powered Street Intelligence</Eyebrow>
        <h2 className="mb-4 mt-3 font-display text-[clamp(1.55rem,2.6vw,2.25rem)] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
          A street has a story.
          <br />
          Its people know it best.
        </h2>
      </div>

      <div>
        <p className="text-muted-foreground">
          Road access. Power patterns. Noise. Flooding. Explore what people know about a street, with
          visible sources and confidence levels.
        </p>
        <Link href="/street-intelligence" className={buttonClass('secondary', 'default', 'mt-6')}>
          Explore Street Intelligence
          <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
        </Link>
      </div>
    </section>
  );
}
