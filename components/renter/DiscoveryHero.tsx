import type { ReactNode } from 'react';

/** Dark hero band used by public renter pages so the transparent navbar stays readable. */
export function DiscoveryHero({
  eyebrow,
  title,
  description,
  children,
}: {
  eyebrow: string;
  title: ReactNode;
  description: ReactNode;
  children?: ReactNode;
}) {
  return (
    <section className="bg-navy-900 pb-12 pt-28 text-white sm:pt-32">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <p className="text-xs font-bold uppercase tracking-wider text-emerald-300">{eyebrow}</p>
        <h1 className="mt-2 max-w-3xl font-display text-3xl font-bold leading-tight sm:text-4xl lg:text-5xl">{title}</h1>
        <div className="mt-4 max-w-3xl text-sm leading-7 text-white/70 sm:text-base">{description}</div>
        {children}
      </div>
    </section>
  );
}
