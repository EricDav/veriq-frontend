import { ArrowRight, MapPin, Shield, UserRound } from 'lucide-react';
import Link from 'next/link';
import type { SiteContent } from '@/types';

const FEATURES = [
  {
    icon: Shield,
    title: 'Property Intelligence',
    description: 'Verified previews, disclosures, property condition, utilities, and inspection insights, all structured so you know what to expect.',
    className: 'bg-emerald-50 text-emerald-600',
    href: '/properties',
  },
  {
    icon: MapPin,
    title: 'Street Intelligence',
    description: 'Flood risk, electricity, noise, network, road access, security feel, and neighbourhood context for supported areas.',
    className: 'bg-blue-50 text-blue-600',
    href: '/street-intelligence',
  },
  {
    icon: UserRound,
    title: 'Agent Trust',
    description: 'Identity verification, listing freshness, trust score, and performance history to help you choose the right agent.',
    className: 'bg-violet-50 text-violet-600',
    href: '/about',
  },
];

export function Features({ content: _content }: { content?: SiteContent }) {
  return (
    <section id="features" className="bg-slate-50 py-16 sm:py-20">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="text-center">
          <span className="text-xs font-bold text-emerald-600">Why Veriq</span>
          <h2 className="mt-3 font-display text-3xl font-black text-navy-900 sm:text-4xl">Everything you need to inspect smarter</h2>
          <p className="mx-auto mt-3 max-w-2xl text-sm leading-relaxed text-veriq-muted">Veriq combines three layers of intelligence so you can clearly see before you visit, avoid surprises, and make confident decisions.</p>
        </div>
        <div className="mt-10 grid gap-4 md:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, description, className, href }) => (
            <div key={title} className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm">
              <div className={`flex h-11 w-11 items-center justify-center rounded-lg ${className}`}><Icon className="h-5 w-5" /></div>
              <h3 className="mt-5 font-display text-lg font-bold text-navy-900">{title}</h3>
              <p className="mt-3 text-sm leading-6 text-veriq-muted">{description}</p>
              <Link href={href} className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-emerald-600">Learn more <ArrowRight className="h-4 w-4" /></Link>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
