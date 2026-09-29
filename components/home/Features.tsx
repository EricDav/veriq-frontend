import { ArrowRight, MapPin, Shield, ShieldCheck } from 'lucide-react';
import Link from 'next/link';
import type { SiteContent } from '@/types';

const FEATURES = [
  {
    icon: Shield,
    title: 'Property Intelligence',
    description: 'Verified previews, disclosures, property condition, utilities, and inspection insights, all structured so you know what to expect.',
    className: 'bg-[#10b98112] text-primary',
    href: '/properties',
  },
  {
    icon: MapPin,
    title: 'Street Intelligence',
    description: 'Flood risk, electricity, noise, network, road access, security feel, and neighbourhood context for supported areas.',
    className: 'bg-[#ffffff08] text-muted-foreground',
    href: '/street-intelligence',
  },
  {
    icon: ShieldCheck,
    title: 'Verified Availability',
    description: 'See whether a property or unit is available before you unlock, with freshness and verification signals.',
    className: 'bg-[#ffffff08] text-muted-foreground',
    href: '/properties',
  },
];

export function Features({ content: _content }: { content?: SiteContent }) {
  return (
    <section id="features" className="bg-[#ffffff08] py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-bold text-primary">Why Veriq</span>
          <h2 className="mt-3 font-display text-3xl font-black text-foreground sm:text-4xl">Everything you need to inspect smarter</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">Veriq combines three layers of intelligence so you can clearly see before you visit, avoid surprises, and make confident decisions.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, className, href }) => (
            <div key={title} className="rounded-lg border border-[#ffffff12] bg-card p-6 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${className}`}><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 font-display text-lg font-bold text-foreground">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-muted-foreground">{description}</p>
              <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary">Learn more <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
