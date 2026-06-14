import { Hero } from "@/components/home/Hero";
import { Features } from "@/components/home/Features";
import { HowItWorks } from "@/components/home/HowItWorks";
import { TrustStats } from "@/components/home/TrustStats";
import { CTA } from "@/components/home/CTA";
import { getPublicPageContent } from "@/lib/site-content";

export default async function HomePage() {
  const content = await getPublicPageContent("home");

  return (
    <>
      <Hero content={content.hero} />
      <Features content={content.features} />
      <HowItWorks content={content.how_it_works} />
      <TrustStats />
      <CTA content={content.cta} />
    </>
  );
}
