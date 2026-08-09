import Link from 'next/link';
import { ArrowRight, Shield, UserRound } from 'lucide-react';
import type { SiteContent } from '@/types';

export function CTA({ content: _content }: { content?: SiteContent }) {
  return (
    <section className="bg-white py-12 sm:py-16">
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid overflow-hidden rounded-lg bg-[#06101c] text-white lg:grid-cols-[1.15fr_0.85fr_0.85fr]">
          <div className="p-7 sm:p-9">
            <h2 className="font-display text-3xl font-black">Ready to inspect smarter?</h2>
            <p className="mt-3 max-w-md text-sm leading-6 text-slate-400">Start with property and street intelligence built for people searching for homes in Port Harcourt.</p>
            <div className="mt-6 flex flex-col gap-3 sm:flex-row">
              <Link href="/properties" className="btn-primary">Browse Properties <ArrowRight className="h-4 w-4" /></Link>
              <Link href="/auth/register?role=agent" className="inline-flex items-center justify-center gap-2 rounded-lg border border-white/15 bg-white/[0.06] px-5 py-3 text-sm font-semibold"><UserRound className="h-4 w-4" /> For Agents</Link>
            </div>
          </div>
          <div className="border-t border-white/10 p-7 lg:border-l lg:border-t-0">
            <Shield className="h-6 w-6 text-blue-300" />
            <h3 className="mt-4 text-sm font-bold">For Property Users</h3>
            <p className="mt-3 text-xs leading-5 text-slate-400">Unlock verified reports and street intelligence to make informed decisions before you visit.</p>
            <Link href="/properties" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-400">Learn more <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
          <div className="border-t border-white/10 bg-emerald-500/[0.08] p-7 lg:border-l lg:border-t-0">
            <UserRound className="h-6 w-6 text-emerald-300" />
            <h3 className="mt-4 text-sm font-bold">For Agents</h3>
            <p className="mt-3 text-xs leading-5 text-slate-400">Build trust, stand out with verified listings, and close with confident clients.</p>
            <Link href="/auth/register?role=agent" className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-400">Learn more <ArrowRight className="h-3.5 w-3.5" /></Link>
          </div>
        </div>
      </div>
    </section>
  );
}
