import Link from 'next/link';
import { ArrowRight, CheckCircle2, MapPin, Search, ShieldCheck, Unlock } from 'lucide-react';
import type { SiteContent } from '@/types';

const STEPS = [
  { number: '01', icon: Search, title: 'Browse Properties', description: 'Explore verified listings in Port Harcourt that match your needs.', className: 'bg-emerald-600' },
  { number: '02', icon: Unlock, title: 'Unlock Intelligence', description: 'Get the full report with property, street, and agent intelligence.', className: 'bg-blue-600' },
  { number: '03', icon: CheckCircle2, title: 'Compare & Decide', description: 'Compare options and trust signals to choose what is worth visiting.', className: 'bg-violet-600' },
  { number: '04', icon: MapPin, title: 'Inspect with Confidence', description: 'Walk in informed, with fewer surprises and better decisions.', className: 'bg-emerald-600' },
];

const STREET_METRICS = [
  ['Flood Risk', 'Low'],
  ['Noise Level', 'Moderate'],
  ['Electricity', 'Fair'],
  ['Network Coverage', 'Good'],
  ['Road Access', 'Good'],
  ['Security Feel', 'Fair'],
];

export function HowItWorks({ content: _content }: { content?: SiteContent }) {
  return (
    <section id="how-it-works" className="bg-white py-16 sm:py-20">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid gap-8 lg:grid-cols-[0.7fr_1.3fr] lg:items-end">
          <div>
            <span className="inline-flex rounded-full bg-emerald-50 px-3 py-1 text-xs font-bold text-emerald-600">Simple Process</span>
            <h2 className="mt-4 font-display text-3xl font-black text-navy-900 sm:text-4xl">How Veriq<br /><span className="text-emerald-500">Property Works</span></h2>
            <p className="mt-4 max-w-sm text-sm leading-relaxed text-veriq-muted">From discovery to inspection, a smarter, more informed journey every step of the way.</p>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ number, icon: Icon, title, description, className }) => (
              <div key={number} className="relative">
                <span className="absolute right-0 top-0 text-4xl font-black text-slate-100">{number}</span>
                <div className={`flex h-11 w-11 items-center justify-center rounded-lg text-white ${className}`}><Icon className="h-5 w-5" /></div>
                <h3 className="mt-4 font-display text-sm font-bold text-navy-900">{title}</h3>
                <p className="mt-2 text-xs leading-5 text-veriq-muted">{description}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="mt-14 grid overflow-hidden rounded-lg border border-emerald-400/20 bg-[#061016] lg:grid-cols-[0.9fr_1.1fr]">
          <div className="p-7 sm:p-10">
            <span className="inline-flex rounded-full bg-emerald-400/10 px-3 py-1 text-xs font-bold text-emerald-300">Street Intelligence</span>
            <h2 className="mt-5 font-display text-3xl font-black leading-tight text-white sm:text-4xl">Know the <span className="text-emerald-400">street</span> before<br className="hidden sm:block" /> you choose the house.</h2>
            <p className="mt-4 max-w-lg text-sm leading-relaxed text-slate-400">Search supported locations and view structured local intelligence, from flood risks to road access and neighbourhood feel, before you commit.</p>
            <form action="/street-intelligence" className="mt-6 flex rounded-lg border border-white/10 bg-white/[0.06] p-1">
              <Search className="ml-3 mt-2.5 h-4 w-4 flex-none text-slate-500" />
              <input name="q" aria-label="Search a street" placeholder="Search Rumuola, Woji, Ada-George..." className="min-w-0 flex-1 bg-transparent px-3 py-2 text-sm text-white outline-none placeholder:text-slate-600" />
              <button type="submit" className="rounded-lg bg-emerald-500 px-4 py-2 text-xs font-bold text-white">Search</button>
            </form>
            <div className="mt-4 flex flex-wrap items-center gap-2 text-[11px] text-slate-500">
              <span>Popular areas:</span>
              {['Rumuola', 'Woji', 'GRA Phase 2', 'Ada-George'].map((area) => <span key={area} className="rounded bg-white/[0.06] px-2 py-1 text-slate-300">{area}</span>)}
            </div>
          </div>
          <div className="m-4 rounded-lg border border-white/10 bg-white/[0.03] p-5 sm:m-6 sm:p-6">
            <div className="flex items-center gap-3 border-b border-white/10 pb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><MapPin className="h-5 w-5" /></div>
              <div>
                <div className="flex flex-wrap items-center gap-2"><h3 className="font-display text-lg font-bold text-white">Rumuola, Port Harcourt</h3><span className="rounded-full bg-emerald-400/10 px-2 py-1 text-[10px] font-bold text-emerald-300">Verified</span></div>
                <p className="mt-1 text-xs text-slate-500">Last updated: 2 days ago</p>
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {STREET_METRICS.map(([label, value]) => (
                <div key={label} className="flex items-center justify-between rounded-lg bg-white/[0.04] px-3 py-3 text-xs">
                  <span className="flex items-center gap-2 text-slate-300"><ShieldCheck className="h-4 w-4 text-emerald-400" />{label}</span>
                  <span className={value === 'Moderate' || value === 'Fair' ? 'text-amber-300' : 'text-emerald-300'}>{value}</span>
                </div>
              ))}
            </div>
            <Link href="/street-intelligence" className="mt-4 flex items-center justify-center gap-2 rounded-lg bg-emerald-500 px-4 py-3 text-sm font-bold text-white">View Street Intelligence <ArrowRight className="h-4 w-4" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
