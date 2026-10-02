import { Hero } from "@/components/home/Hero";
import { Discover } from "@/components/home/Discover";
import { HowItWorks } from "@/components/home/HowItWorks";
import { StreetIntelligencePromo } from "@/components/home/StreetIntelligencePromo";
import { CTA } from "@/components/home/CTA";
import { getPublicPageContent } from "@/lib/site-content";

/**
 * The prototype's home page, in its order: hero and search, the discovery band, how it works, the
 * Street Intelligence panel and the closing call to list. Everything sits in the prototype's single
 * `.container` — 1280px wide, 50px/40px of padding, 30px/22px on a phone — so the sections keep its
 * 40px rhythm rather than each carrying its own.
 */
export default async function HomePage() {
  const content = await getPublicPageContent("home");

  return (
    <main className="proto-type mx-auto max-w-[1280px] px-[22px] pb-[30px] pt-24 wide:px-10 wide:pb-[50px] wide:pt-32">
      <Hero content={content.hero} />
      <Discover />
      <HowItWorks content={content.how_it_works} />
      <StreetIntelligencePromo />
      <CTA content={content.cta} />
    </main>
  );
}
