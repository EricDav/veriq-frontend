import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Eyebrow } from '@/components/ui';

/**
 * The prototype's Street Intelligence band: one wide panel on a green-to-dark wash, the claim in Sora
 * on the left and what it means plus the way in on the right.
 *
 * This sits on the homepage rather than on a property page on purpose — Blueprint §4 keeps Street
 * Intelligence separate from any single property, and it is "never sourced from a property page".
 */
export function StreetIntelligencePromo() {
  return (
    <section className="bg-background pb-14 sm:pb-[60px]">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-10">
        <div className="grid gap-8 rounded-2xl border border-border bg-[linear-gradient(110deg,#0d2a22_0%,#111827_55%,#0f1722_100%)] p-8 sm:p-[46px] lg:grid-cols-2 lg:items-center lg:gap-14">
          <div>
            <Eyebrow>Community-powered Street Intelligence</Eyebrow>
            <h2 className="mt-5 font-display text-[1.75rem] font-semibold leading-[1.2] tracking-[-0.04em] text-foreground sm:text-[2rem]">
              A street has a story.
              <br />
              Its people know it best.
            </h2>
          </div>

          <div>
            <p className="text-[0.98rem] leading-[1.65] text-muted-foreground">
              Road access. Power patterns. Noise. Flooding. Explore what people know about a street, with
              visible sources and confidence levels.
            </p>
            <Link
              href="/street-intelligence"
              className="mt-6 inline-flex items-center gap-2 rounded-[9px] border border-input bg-[#ffffff06] px-5 py-3 text-[0.9rem] font-semibold text-foreground transition-colors hover:bg-[#ffffff0f] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              Explore Street Intelligence
              <ArrowUpRight className="h-4 w-4" aria-hidden="true" />
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
