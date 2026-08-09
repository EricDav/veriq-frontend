import Image from 'next/image';
import Link from 'next/link';
import {
  ArrowRight,
  Bath,
  BedDouble,
  CheckCircle2,
  CircleParking,
  MapPin,
  ShieldCheck,
} from 'lucide-react';
import type { SiteContent } from '@/types';

const TRUST_POINTS = [
  'Verified Property Intelligence',
  'Street Intelligence for your area',
  'Agent trust and freshness signals',
];

const INTELLIGENCE = [
  ['Availability Confirmed', 'Verification 2 days ago'],
  ['Agent Identity Verified', 'ID and licence verified'],
  ['Street Flood Risk', 'Low'],
  ['Noise Level', 'Moderate'],
  ['Road Access', 'Good'],
  ['Trust Score', 'High'],
];

export function Hero({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="relative overflow-hidden bg-hero-pattern pb-24 pt-28 lg:pb-20 lg:pt-32">
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.85fr_1.15fr] lg:items-center lg:px-8">
        <div>
          <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-300">
            <MapPin className="h-3.5 w-3.5" />
            Launch Phase: Port Harcourt
          </div>
          <h1 className="font-display text-5xl font-black leading-none text-white sm:text-6xl lg:text-7xl">
            Know <span className="text-emerald-400">Before</span>
            <br />You Go.
          </h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">
            Veriq helps you understand the property, the street, and the agent before you spend time and money on inspection.
          </p>
          <ul className="mt-7 space-y-3">
            {TRUST_POINTS.map((point) => (
              <li key={point} className="flex items-center gap-3 text-sm text-slate-200">
                <CheckCircle2 className="h-4 w-4 flex-none text-emerald-400" />
                {point}
              </li>
            ))}
          </ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link href="/properties" className="btn-primary">
              Browse Properties <ArrowRight className="h-4 w-4" />
            </Link>
            <Link href="/street-intelligence" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white hover:bg-white/15">
              Explore Street Intelligence <MapPin className="h-4 w-4" />
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-emerald-400/20 bg-[#0b1719]/95 p-3 shadow-glow sm:p-4">
          <div className="grid gap-4 sm:grid-cols-[0.8fr_1.2fr]">
            <div className="relative aspect-[4/3] overflow-hidden rounded-lg">
              <Image src="/images/property-intelligence-home.png" alt="Modern property preview" fill sizes="(min-width: 1024px) 280px, 80vw" className="object-cover" priority />
              <span className="absolute bottom-2 right-2 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">13 Photos</span>
            </div>
            <div>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="font-display text-xl font-bold text-white">2-Bed Flat, Rumuola</h2>
                  <p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" /> Rumuola, Port Harcourt</p>
                </div>
                <span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Available</span>
              </div>
              <p className="mt-4 text-lg font-bold text-emerald-400">₦65,000 <span className="text-xs font-medium text-slate-400">/mo</span></p>
              <div className="mt-3 flex flex-wrap gap-4 text-xs text-slate-300">
                <span className="flex items-center gap-1"><BedDouble className="h-3.5 w-3.5 text-emerald-400" /> 2 Beds</span>
                <span className="flex items-center gap-1"><Bath className="h-3.5 w-3.5 text-emerald-400" /> 2 Baths</span>
                <span className="flex items-center gap-1"><CircleParking className="h-3.5 w-3.5 text-emerald-400" /> 1 Parking</span>
              </div>
            </div>
          </div>

          <div className="mt-4 rounded-lg border border-white/10 bg-white/[0.03] p-3">
            <p className="mb-3 text-xs font-bold text-slate-300">Intelligence Preview</p>
            <div className="grid gap-2 sm:grid-cols-2">
              {INTELLIGENCE.map(([label, value]) => (
                <div key={label} className="flex items-center gap-2 rounded-lg bg-white/[0.04] px-3 py-2">
                  <ShieldCheck className="h-4 w-4 flex-none text-emerald-400" />
                  <div className="min-w-0">
                    <p className="truncate text-[11px] font-semibold text-white">{label}</p>
                    <p className="truncate text-[10px] text-slate-500">{value}</p>
                  </div>
                </div>
              ))}
            </div>
            <Link href="/properties" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-600">
              <ShieldCheck className="h-4 w-4" /> Unlock Full Intelligence Report
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
