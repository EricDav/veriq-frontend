'use client';

import Link from 'next/link';
import { ArrowRight, Building2, ClipboardCheck, Home, Landmark, ShieldCheck, Users } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { UserRole } from '@/types';

interface Destination {
  href: string;
  label: string;
  description: string;
  icon: typeof Home;
  primary?: boolean;
}

const OPERATOR_LINKS: Destination[] = [
  {
    href: '/dashboard/operator/properties/new',
    label: 'Add a Property',
    description: 'Residential Property, Short Let or Hostel: location, property details, Units, contact and media, submitted to your Veriq Agent for verification.',
    icon: Building2,
    primary: true,
  },
  {
    href: '/dashboard/operator/shared/new',
    label: 'Share a room or bedspace',
    description: 'A Shared Property opportunity in the home you currently live in, with occupancy evidence and a permission declaration.',
    icon: Users,
  },
  {
    href: '/dashboard/operator/properties',
    label: 'My Properties',
    description: 'Track verification status, availability, Units, media review and change requests.',
    icon: ClipboardCheck,
  },
];

const AGENT_LINKS: Destination[] = [
  {
    href: '/dashboard/agent/verification',
    label: 'Verification queue',
    description: 'Veriq Agents verify and publish the Properties, Units and Shared Property opportunities submitted by their assigned Operators.',
    icon: ShieldCheck,
    primary: true,
  },
  {
    href: '/dashboard/agent/sales',
    label: 'Property for Sale submissions',
    description: 'Only the owner may submit a property for sale. Owner submissions assigned to you arrive here for the physical visit, document review, the signed sales agreement and publication.',
    icon: Landmark,
  },
];

const ADMIN_LINKS: Destination[] = [
  {
    href: '/dashboard/admin/assignments',
    label: 'Operator assignments',
    description: 'Assign Property Operators to Veriq Agents so their submissions reach a verification queue.',
    icon: ClipboardCheck,
    primary: true,
  },
];

const RENTER_LINKS: Destination[] = [
  {
    href: '/properties',
    label: 'Browse verified properties',
    description: 'Search verified Residential Properties, Short Lets, Hostels and Shared Property opportunities.',
    icon: Home,
    primary: true,
  },
  {
    href: '/auth/register?role=operator',
    label: 'Become a Property Operator',
    description: 'Listing on Veriq is free. Operators submit properties and Veriq Agents verify them before publication.',
    icon: Building2,
  },
];

export default function LegacyCreatePropertyPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;

  const role = user?.role;
  const { heading, explanation, links } =
    role === UserRole.PROPERTY_OPERATOR
      ? {
          heading: 'Properties are now added from the Operator portal',
          explanation:
            'Property submission moved to the subtype-driven Operator flow: you choose the category, select State → LGA → Veriq Area → Street, answer the property and Unit questions for your exact property type, and submit for Veriq Agent verification.',
          links: OPERATOR_LINKS,
        }
      : role === UserRole.AGENT
        ? {
            heading: 'Veriq Agents verify Operator submissions',
            explanation:
              'Agents no longer create listings from this page. Properties, Short Lets, Hostels and Property for Sale are all submitted by their owner or Operator and reach you for verification, where you confirm authority, location, facts, intelligence and media before publishing.',
            links: AGENT_LINKS,
          }
        : role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN
          ? {
              heading: 'Listing creation belongs to Operators and Agents',
              explanation:
                'Admin does not create listings. Property Operators submit them, and the assigned Veriq Agent verifies and publishes. Make sure every Operator has an assigned Agent so their submissions are routed.',
              links: ADMIN_LINKS,
            }
          : {
              heading: 'This page has moved',
              explanation:
                'Veriq properties are submitted by verified Property Operators and published by Veriq Agents after verification.',
              links: RENTER_LINKS,
            };

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card space-y-3 p-6">
        <span className="badge bg-amber-50 text-amber-700">Page moved</span>
        <h1 className="font-display text-2xl font-bold text-navy-900">{heading}</h1>
        <p className="text-sm leading-relaxed text-slate-600">{explanation}</p>
        <p className="text-xs text-slate-500">
          The old agent property-creation endpoint has been retired, so this form no longer exists.
        </p>
      </div>

      <div className="grid gap-3">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className={`card flex items-start gap-4 p-5 ${link.primary ? 'ring-1 ring-veriq-secondary/40' : ''}`}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-emerald-50">
              <link.icon className="h-5 w-5 text-veriq-secondary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-semibold text-navy-900">
                {link.label} <ArrowRight className="h-4 w-4 text-veriq-secondary" />
              </span>
              <span className="mt-0.5 block text-sm text-slate-500">{link.description}</span>
            </span>
          </Link>
        ))}
      </div>

      <Link href="/dashboard" className="btn-ghost">Back to dashboard</Link>
    </div>
  );
}
