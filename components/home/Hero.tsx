import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BedDouble, Building2, CheckCircle2, Heart, Home, MapPin, ShieldCheck, Waves, Zap } from 'lucide-react';
import type { SiteContent } from '@/types';

const TRUST_POINTS = ['Verified Property Intelligence', 'Street Intelligence for your area', 'Direct access to operators after unlock'];
const UNITS = [
  { label: '2-Bedroom Flat', available: true },
  { label: '1-Bedroom Flat', available: false },
  { label: 'Self-Contain', available: false },
];
const SIGNALS = [
  { icon: ShieldCheck, label: 'Availability Confirmed', value: '' },
  { icon: CheckCircle2, label: 'Verified by Veriq', value: '' },
  { icon: Waves, label: 'Flood Risk:', value: 'Low' },
  { icon: Home, label: 'Road Access:', value: 'Good' },
  { icon: Zap, label: 'Electricity:', value: 'Fair' },
  { icon: ShieldCheck, label: 'Security Feel:', value: 'Good' },
];

export function Hero({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="relative overflow-hidden bg-hero-pattern pb-16 pt-28 lg:pb-20 lg:pt-32">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_72%_42%,rgba(16,185,129,0.12),transparent_35%)]" />
      <div className="relative mx-auto grid max-w-7xl gap-12 px-4 sm:px-6 lg:grid-cols-[0.9fr_1.1fr] lg:items-center lg:px-8">
        <div>
          <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-1.5 text-xs font-semibold text-emerald-300"><MapPin className="h-3.5 w-3.5" /> Launch Phase: Port Harcourt</div>
          <h1 className="font-display text-5xl font-black leading-[0.98] text-white sm:text-6xl lg:text-7xl">Know <span className="text-emerald-400">Before</span><br />You Go.</h1>
          <p className="mt-6 max-w-lg text-base leading-relaxed text-slate-300">Veriq helps you understand the property, the street, and the real availability before you spend time and money on inspection.</p>
          <ul className="mt-7 space-y-3">{TRUST_POINTS.map((point) => <li key={point} className="flex items-center gap-3 text-sm text-slate-200"><CheckCircle2 className="h-4 w-4 flex-none text-emerald-400" />{point}</li>)}</ul>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row"><Link href="/properties" className="btn-primary">Browse Properties <ArrowRight className="h-4 w-4" /></Link><Link href="/street-intelligence" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/20 bg-white/[0.04] px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Explore Street Intelligence</Link></div>
          <div className="mt-9 grid max-w-lg gap-4 border-t border-white/10 pt-5 text-xs text-slate-400 sm:grid-cols-2"><span className="flex items-center gap-3"><Building2 className="h-5 w-5 text-emerald-400" /> Trusted property intelligence<br />in Port Harcourt</span><span className="flex items-center gap-3"><ShieldCheck className="h-5 w-5 text-emerald-400" /> Smarter decisions<br />for a better tomorrow</span></div>
        </div>
        <div className="mx-auto w-full max-w-xl rounded-lg border border-emerald-400/30 bg-navy-800/95 p-3 shadow-glow sm:p-4">
          <div className="relative aspect-[16/8.7] overflow-hidden rounded-lg">
            <Image src="/images/property-intelligence-home.png" alt="Peace Court property in Rumuola" fill sizes="(min-width: 1024px) 560px, 94vw" className="object-cover" priority />
            <span className="absolute right-3 top-3 rounded-full bg-emerald-500 px-3 py-1 text-[10px] font-bold text-white">Available</span><button aria-label="Save property" className="absolute right-3 top-11 flex h-8 w-8 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur"><Heart className="h-4 w-4" /></button><span className="absolute bottom-3 right-3 rounded bg-black/70 px-2 py-1 text-[10px] font-semibold text-white">12 Photos</span>
          </div>
          <div className="px-1 pt-4">
            <h2 className="font-display text-xl font-bold text-white sm:text-2xl">Peace Court, Rumuola</h2><p className="mt-1 flex items-center gap-1 text-xs text-slate-400"><MapPin className="h-3 w-3" /> Rumuola, Port Harcourt</p><p className="mt-3 text-sm text-slate-400">From <strong className="text-xl text-emerald-400">₦1.5M<span className="text-xs">/yr</span></strong></p><p className="mt-1 text-[11px] text-slate-500">3 documented units · 1 available</p>
            <div className="mt-3 space-y-1.5 border-b border-white/10 pb-4">{UNITS.map((unit) => <div key={unit.label} className="flex items-center justify-between text-xs"><span className="flex items-center gap-2 text-slate-300"><BedDouble className="h-3.5 w-3.5" />{unit.label}</span><span className={unit.available ? 'text-emerald-400' : 'text-rose-400'}><i className={`mr-2 inline-block h-1.5 w-1.5 rounded-full ${unit.available ? 'bg-emerald-400' : 'bg-rose-400'}`} />{unit.available ? 'Available' : 'Unavailable'}</span></div>)}</div>
            <p className="my-3 text-xs font-bold text-slate-300">Intelligence Preview</p><div className="grid gap-2 sm:grid-cols-2">{SIGNALS.map(({ icon: Icon, label, value }) => <div key={label} className="flex items-center gap-2 rounded-md bg-white/[0.05] px-3 py-2.5"><Icon className="h-4 w-4 flex-none text-emerald-400" /><p className="text-[10px] font-semibold text-slate-200">{label} <span className="text-emerald-300">{value}</span></p></div>)}</div>
            <Link href="/properties" className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-xs font-bold text-white hover:bg-emerald-600"><ShieldCheck className="h-4 w-4" /> Unlock Full Intelligence</Link>
          </div>
        </div>
      </div>
    </section>
  );
}
