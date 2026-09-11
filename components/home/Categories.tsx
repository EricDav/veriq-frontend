import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight, BedDouble, Building2, Home, Landmark, UsersRound } from 'lucide-react';

const CATEGORIES = [
  { title: 'Residential Property', text: 'Long-term rental properties with unit-level availability and verified intelligence.', icon: Home, href: '/properties', position: 'center' },
  { title: 'Short Lets', text: 'Short-stay apartments and accommodation you can assess before you book or inspect.', icon: BedDouble, href: '/properties?propertyType=short_stay', position: 'center 58%' },
  { title: 'Hostels', text: 'Student and hostel accommodation with room or unit-specific details and availability.', icon: Building2, href: '/properties?propertyType=hostel', position: 'center 42%' },
  { title: 'Shared Apartments', text: 'Available rooms in shared homes, with clear house, room, and compatibility information.', icon: UsersRound, href: '/properties?q=shared', position: 'center 62%' },
  { title: 'Property for Sale', text: 'Built property and land with sale-specific document visibility and Veriq-led verification.', icon: Landmark, href: '/properties?q=for+sale', position: 'center 48%' },
];

export function Categories() {
  return <section className="bg-emerald-50/40 py-16 sm:py-20"><div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8"><div className="text-center"><span className="text-xs font-bold text-emerald-600">Find What You’re Looking For</span><h2 className="mt-3 font-display text-3xl font-black text-navy-900 sm:text-4xl">Explore by Category</h2><p className="mt-3 text-sm text-veriq-muted">Browse the property experiences currently available on Veriq.</p></div><div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-5">{CATEGORIES.map(({ title, text, icon: Icon, href, position }) => <article key={title} className="overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"><div className="relative aspect-[16/9]"><Image src="/images/property-intelligence-home.png" alt="" fill sizes="(min-width: 1024px) 220px, 45vw" className="object-cover" style={{ objectPosition: position }} /></div><div className="p-5"><div className="flex h-9 w-9 items-center justify-center rounded-md bg-emerald-50 text-emerald-600"><Icon className="h-4 w-4" /></div><h3 className="mt-4 font-display text-sm font-bold text-navy-900">{title}</h3><p className="mt-2 min-h-[88px] text-xs leading-5 text-veriq-muted">{text}</p><Link href={href} className="mt-4 inline-flex items-center gap-2 text-xs font-bold text-emerald-600">Explore <ArrowRight className="h-3.5 w-3.5" /></Link></div></article>)}</div></div></section>;
}
