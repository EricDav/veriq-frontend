import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { SiteContent } from '@/types';

export function CTA({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="relative overflow-hidden bg-[#063c36] py-12 sm:py-16">
      <div className="pointer-events-none absolute inset-y-0 right-0 w-1/2 bg-[radial-gradient(circle_at_center,rgba(16,185,129,0.18),transparent_65%)]" />
      <div className="relative mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <span className="text-xs font-bold uppercase text-emerald-300">Take the next step</span>
        <h2 className="mt-3 font-display text-3xl font-black text-white sm:text-4xl">Ready to search with confidence?</h2>
        <p className="mt-3 max-w-xl text-sm leading-6 text-emerald-50/70">Start with verified properties and street intelligence designed for clearer decisions.</p>
        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Link href="/properties" className="btn-primary">Browse Properties <ArrowRight className="h-4 w-4" /></Link>
          <Link href="/auth/register" className="inline-flex items-center justify-center rounded-lg border border-white/30 px-5 py-3 text-sm font-semibold text-white transition hover:bg-white/10">Get Started</Link>
        </div>
      </div>
    </section>
  );
}
