import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, ArrowUpRight, Building2, ShieldCheck } from 'lucide-react';
import type { SiteContent } from '@/types';
import { Badge, ChipIcon, Eyebrow, buttonClass } from '@/components/ui';
import { HomeSearch } from './HomeSearch';

/**
 * The prototype's `.hero`: a 1.05fr/1fr split with the claim on the left and one photograph on the
 * right, the photo carrying a badge at its top right and a caption panel hanging off its bottom left
 * corner. The search bar sits directly below it.
 *
 * The copy is the prototype's, word for word, and the numbers are its stylesheet's: an h1 of
 * clamp(2.8rem, 5vw, 4.65rem) at -0.065em and 1.13 leading, an art column of 475px stepping to 420 at
 * 1050 and 350 at 760, and the photo's 110px top-left corner relaxing to 65px on a phone.
 */
export function Hero({ content: _content }: { content?: SiteContent }) {
  return (
    <>
      <section className="grid items-center gap-[35px] pb-[65px] pt-6 wide:grid-cols-[1.05fr_1fr] wide:gap-[30px] wide:pt-[50px] min-[1051px]:gap-[60px]">
        <div>
          <Eyebrow>Know before you go</Eyebrow>

          <h1 className="mb-[25px] mt-5 font-display text-[3rem] font-semibold leading-[1.13] tracking-[-0.065em] text-foreground wide:text-[clamp(2.8rem,5vw,4.65rem)]">
            A property is more
            <br />
            than <em className="not-italic text-primary">an address.</em>
          </h1>

          <p className="max-w-[490px] text-[1.05rem] leading-[1.6] text-muted-foreground">
            See the property. Understand the street. Connect directly with the owner or caretaker&mdash;with
            the information you need to decide.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <Link href="/properties" className={buttonClass('primary')}>
              Find your next place
              <ArrowRight className="h-[18px] w-[18px]" aria-hidden="true" />
            </Link>
            <Link href="/how-it-works" className={buttonClass('ghost')}>
              See how it works
              <ArrowUpRight className="h-[17px] w-[17px]" aria-hidden="true" />
            </Link>
          </div>

          <div className="mt-7 flex flex-wrap items-center gap-3 text-[0.8rem] text-muted-foreground">
            <ShieldCheck className="h-4 w-4 flex-none text-primary" aria-hidden="true" />
            Agent-verified details <span aria-hidden="true">·</span> No agency or inspection fee
          </div>
        </div>

        <div className="relative h-[350px] wide:h-[420px] min-[1051px]:h-[475px]">
          <Image
            src="/images/property-intelligence-home.png"
            alt="Illustrative contemporary home exterior"
            fill
            priority
            sizes="(min-width: 1051px) 560px, (min-width: 760px) 45vw, 94vw"
            className="rounded-[65px_18px_18px_18px] object-cover brightness-[0.85] wide:rounded-[110px_18px_18px_18px]"
          />

          <div className="absolute right-[22px] top-[22px]">
            <Badge>
              <ShieldCheck className="h-3.5 w-3.5" aria-hidden="true" />
              More clarity. Better decisions.
            </Badge>
          </div>

          <div className="absolute bottom-[15px] left-[15px] max-w-[270px] rounded-xl border border-[#ffffff22] bg-[#111827ef] px-[22px] py-[18px] shadow-[0_20px_50px_#00000077] backdrop-blur-[12px] wide:bottom-[25px] wide:left-[-10px] wide:max-w-[310px] min-[1051px]:left-[-24px]">
            <div className="flex items-center gap-3">
              <ChipIcon>
                <Building2 className="h-[21px] w-[21px]" aria-hidden="true" />
              </ChipIcon>
              <strong className="font-semibold text-foreground">Know what you&rsquo;re walking into.</strong>
            </div>
            <p className="mt-1.5 text-[0.85rem] leading-[1.6] text-muted-foreground">
              Property details, real images and the intelligence behind the address.
            </p>
          </div>
        </div>
      </section>

      <HomeSearch />
    </>
  );
}
