import type { Metadata } from 'next';
import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  CheckCircle2,
  Eye,
  MapPin,
  Shield,
  Target,
  TrendingUp,
  UserRound,
} from 'lucide-react';
import { getPublicPageContent } from '@/lib/site-content';

export const metadata: Metadata = {
  title: 'About Us',
  description: 'Veriq Property builds the intelligence layer for smarter property decisions.',
};

const PROBLEMS = [
  'Misleading or incomplete property listings',
  'Wasted inspection trips and transport costs',
  'Poor visibility into property conditions before inspection',
  'Little reliable information about the street or surrounding environment',
  'Difficulty knowing whether an agent is trustworthy',
  'Stale or unavailable listings',
];

const CAPABILITIES = [
  {
    icon: Eye,
    title: 'Explore Properties',
    description: 'Browse available properties and preview key listing information.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
  {
    icon: Shield,
    title: 'Unlock Property Intelligence',
    description: 'See structured property details, condition, disclosures, utilities, and more.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
  {
    icon: MapPin,
    title: 'Check Street Intelligence',
    description: 'Understand flood risk, road access, network, noise, security feel, and more.',
    iconClass: 'bg-[#10b98112] text-primary',
  },
  {
    icon: UserRound,
    title: 'Evaluate Agent Trust',
    description: 'Review verification, freshness, and performance signals before engaging.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
];

const VALUES = [
  {
    icon: Shield,
    title: 'Trust First',
    description: 'Every feature is designed to increase transparency and reduce risk.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
  {
    icon: Eye,
    title: 'Structured Intelligence',
    description: 'Information should be organised, useful, and decision-ready.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
  {
    icon: Target,
    title: 'Decision Confidence',
    description: 'Users should know more before inspection, not guess more.',
    iconClass: 'bg-[#10b98112] text-primary',
  },
  {
    icon: TrendingUp,
    title: 'Accountability',
    description: 'Agents are rewarded for professionalism, accuracy, and responsiveness.',
    iconClass: 'bg-[#ffffff08] text-muted-foreground',
  },
];

export default async function AboutPage() {
  const content = await getPublicPageContent('about');
  const problems = content.problems;
  const problemsSolved = Array.isArray(problems?.data?.items)
    ? problems.data.items as string[]
    : PROBLEMS;

  return (
    <>
      <section className="relative min-h-[540px] overflow-hidden bg-background pb-24 pt-32 sm:min-h-[580px] lg:pt-36">
        <Image
          src="/images/web-background-visual-layer.png"
          alt=""
          fill
          priority
          sizes="100vw"
          className="object-cover object-center opacity-90"
        />
        <div className="absolute inset-0 bg-[#070b1433]" />
        <div className="relative mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6 lg:px-8">
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-[#10b98135] bg-[#10b98112] px-4 py-1.5 text-xs font-semibold text-[#6ee7b7]">
            <Target className="h-3.5 w-3.5" />
            About Veriq Property
          </div>
          <h1 className="max-w-4xl font-display text-4xl font-black leading-tight text-foreground sm:text-5xl lg:text-6xl">
            Building The Intelligence Layer
            <br />
            For <span className="text-primary">Smarter</span> Property Decisions.
          </h1>
          <p className="mt-6 max-w-2xl text-base leading-relaxed text-muted-foreground sm:text-lg">
            Veriq helps people understand properties, the streets, and the agents before they spend time and money on inspection.
          </p>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            We combine structured property information with real-world street insights to reduce risk and promote transparency.
          </p>
        </div>
        <div className="absolute inset-x-0 bottom-0">
          <svg viewBox="0 0 1440 90" fill="none" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none" className="h-16 w-full sm:h-24">
            <path d="M0 42C250 88 520 88 720 54C940 17 1160 15 1440 62V90H0V42Z" fill="white" />
          </svg>
        </div>
      </section>

      <section className="bg-card py-16 sm:py-20">
        <div className="mx-auto grid max-w-6xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-start lg:px-8">
          <div>
            <span className="inline-flex rounded-full border border-[#ffffff12] px-3 py-1 text-xs font-bold text-foreground">Our Mission</span>
            <h2 className="mt-5 font-display text-3xl font-black text-foreground sm:text-4xl">
              Know Before <span className="text-primary">You Go.</span>
            </h2>
            <div className="mt-5 space-y-4 text-sm leading-7 text-muted-foreground sm:text-base">
              <p>Veriq is a trusted property intelligence platform designed to help people make better decisions before physical inspections.</p>
              <p>We build the intelligence layer around property discovery, covering <strong className="text-foreground">Property Intelligence, Street Intelligence,</strong> and <strong className="text-foreground">Agent Trust.</strong></p>
              <p>Our mission is to reduce costly surprises, promote transparency, and make property decisions simpler, safer, and smarter for everyone in <strong className="text-primary">Port Harcourt</strong> and beyond.</p>
            </div>
          </div>

          <div className="rounded-lg bg-[#ffffff08] p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold text-foreground">Problems We Solve</h3>
            <ul className="mt-6 space-y-4">
              {problemsSolved.map((problem) => (
                <li key={problem} className="flex items-start gap-3 text-sm text-foreground">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 flex-none text-primary" />
                  <span>{problem}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="border-y border-[#10b98135] bg-[#10b98112] py-12">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <Shield className="h-5 w-5" />
          </div>
          <h2 className="mt-4 font-display text-2xl font-black text-foreground">Trust Is Earned. Not Claimed.</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Veriq combines structured property data, street-level context, listing freshness, and agent performance signals to help users make confident decisions every time.
          </p>
        </div>
      </section>

      <section className="bg-card py-16 sm:py-20">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="font-display text-3xl font-black text-foreground">What You Can Do On <span className="text-primary">Veriq</span></h2>
            <p className="mt-3 text-sm text-muted-foreground">The core product experiences that help people inspect smarter.</p>
          </div>
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {CAPABILITIES.map(({ icon: Icon, title, description, iconClass }) => (
              <div key={title} className="rounded-lg border border-[#ffffff12] bg-card p-5 shadow-sm">
                <div className={`flex h-10 w-10 items-center justify-center rounded-full ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-5 font-display text-base font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>

          <div className="mt-16 text-center">
            <h2 className="font-display text-3xl font-black text-foreground">Our Core Values</h2>
            <p className="mt-3 text-sm text-muted-foreground">The principles that guide every decision we make.</p>
          </div>
          <div className="mt-10 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
            {VALUES.map(({ icon: Icon, title, description, iconClass }) => (
              <div key={title} className="text-center lg:border-r lg:border-[#ffffff12] lg:last:border-r-0 lg:px-5">
                <div className={`mx-auto flex h-11 w-11 items-center justify-center rounded-full ${iconClass}`}>
                  <Icon className="h-5 w-5" />
                </div>
                <h3 className="mt-4 font-display text-sm font-bold text-foreground">{title}</h3>
                <p className="mt-3 text-xs leading-6 text-muted-foreground">{description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="bg-[#ffffff08] py-16">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <h2 className="font-display text-3xl font-black text-foreground">Join The Smarter Property Movement</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
            Whether you&apos;re a renter, buyer, or agent, Veriq is building the future of property decisions, one inspection at a time.
          </p>
          <div className="mt-7 flex flex-col justify-center gap-3 sm:flex-row">
            <Link href="/properties" className="btn-primary">
              Browse Properties <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/street-intelligence" className="btn-outline">
              Explore Street Intelligence
            </Link>
          </div>
          <Link href="/auth/register?role=agent" className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary hover:text-primary">
            Are you an agent? Join Veriq <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
      </section>
    </>
  );
}
