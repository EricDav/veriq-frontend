'use client';

import Link from 'next/link';
import { ArrowRight, ClipboardCheck, Landmark, UserCheck } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { PageLoader } from '@/components/ui/LoadingSpinner';
import { UserRole } from '@/types';
import { ErrorBlock, InlineNotice, PageHeader } from '@/components/agent/ui';

const NEXT_STEPS = [
  {
    href: '/dashboard/agent/sales',
    label: 'My sale submissions',
    description:
      'Owner-submitted sale listings assigned to you: record your physical visit, review the documents, prepare the sales representation agreement and publish.',
    icon: Landmark,
    primary: true,
  },
  {
    href: '/dashboard/agent/verification',
    label: 'Verification queue',
    description: 'Properties, Short Lets, Hostels and Shared Property opportunities waiting on your verification.',
    icon: ClipboardCheck,
  },
  {
    href: '/dashboard/agent/portfolio',
    label: 'My Operators',
    description:
      'The Operators assigned to you. An owner who wants Veriq to represent a sale submits it from their own Operator dashboard.',
    icon: UserCheck,
  },
];

/**
 * Agent-created sale listings are retired (Master Blueprint §6: "Only the owner may submit"). This route explains
 * the owner-submission path instead of offering a form that the server would refuse.
 */
export default function RetiredAgentSaleCreationPage() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <PageLoader />;
  const isManager = user?.role === UserRole.AGENT || user?.role === UserRole.ADMIN || user?.role === UserRole.SUPER_ADMIN;
  if (!isManager) return <ErrorBlock message="Property for Sale listings are managed by Veriq Agents and Admin." />;

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageHeader
        title="Only the owner may submit a property for sale"
        backHref="/dashboard/agent/sales"
        backLabel="Property for Sale"
        subtitle="Veriq Agents no longer create sale listings. The owner submits from their Operator dashboard, and you verify, agree terms and publish."
        badges={<span className="badge bg-[#fbbf2410] text-[#fcd34d] border-[#fbbf2430]">Page moved</span>}
      />

      <InlineNotice tone="info">
        A sale listing now starts with the owner: they confirm they own the property, submit the facts, price and
        documents, and accept the Veriq listing declaration. You then visit the property in person, review ownership
        and authority to sell, and publish once Veriq and the owner have signed the sales representation agreement.
      </InlineNotice>

      <div className="grid gap-3">
        {NEXT_STEPS.map((step) => (
          <Link
            key={step.href}
            href={step.href}
            className={`card flex items-start gap-4 p-5 ${step.primary ? 'ring-1 ring-[#10b98166]' : ''}`}
          >
            <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-[#10b98112]">
              <step.icon className="h-5 w-5 text-primary" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex items-center gap-1.5 font-semibold text-foreground">
                {step.label} <ArrowRight className="h-4 w-4 text-primary" />
              </span>
              <span className="mt-0.5 block text-sm text-muted-foreground">{step.description}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
