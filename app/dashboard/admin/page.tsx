'use client';

import React, { useEffect } from 'react';
import Link from 'next/link';
import { ShieldCheck, Users, Home, ArrowRight, AlertCircle, Landmark, FileText, Mail } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { useRouter } from 'next/navigation';
import { PageLoader } from '@/components/ui/LoadingSpinner';

export default function AdminOverviewPage() {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user?.role !== UserRole.ADMIN) {
      router.push('/dashboard');
    }
  }, [isLoading, user, router]);

  if (isLoading) return <PageLoader />;
  if (user?.role !== UserRole.ADMIN) return null;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <div className="h-10 w-10 rounded-xl bg-red-100 flex items-center justify-center">
            <ShieldCheck className="h-5 w-5 text-red-600" />
          </div>
          <h1 className="font-display text-2xl font-bold text-navy-900">Admin Panel</h1>
        </div>
        <p className="text-sm text-veriq-muted">
          Welcome, {user.firstName}. You have full administrative access.
        </p>
      </div>

      {/* Warning banner */}
      <div className="flex items-start gap-3 rounded-xl bg-amber-50 border border-amber-100 p-4">
        <AlertCircle className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
        <p className="text-sm text-amber-800">
          <strong>Admin actions are irreversible.</strong> Approving or deactivating accounts affects real users. Review document submissions carefully before approving verifications.
        </p>
      </div>

      {/* Quick nav cards */}
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {[
          {
            href: '/dashboard/admin/agents',
            icon: ShieldCheck,
            iconCls: 'bg-emerald-100 text-emerald-600',
            title: 'Agent Management',
            description: 'Review verification documents, approve Level 1 & Level 2, deactivate non-compliant agents.',
            cta: 'Manage Agents',
            ctaCls: 'bg-emerald-600 hover:bg-emerald-700',
          },
          {
            href: '/dashboard/admin/users',
            icon: Users,
            iconCls: 'bg-blue-100 text-blue-600',
            title: 'User Management',
            description: 'View all registered users, activate or deactivate accounts, and monitor platform activity.',
            cta: 'Manage Users',
            ctaCls: 'bg-veriq-secondary hover:bg-navy-700',
          },
          {
            href: '/dashboard/admin/properties',
            icon: Home,
            iconCls: 'bg-purple-100 text-purple-600',
            title: 'Property Listings',
            description: 'Review all listings across the platform. Hide inappropriate or misleading properties.',
            cta: 'Manage Properties',
            ctaCls: 'bg-purple-600 hover:bg-purple-700',
          },
          {
            href: '/dashboard/admin/ledger',
            icon: Landmark,
            iconCls: 'bg-gold-100 text-gold-600',
            title: 'Wallet Ledger & Revenue',
            description: 'View every wallet transaction platform-wide, and see the revenue split between Veriq and agents.',
            cta: 'View Ledger',
            ctaCls: 'bg-gold-600 hover:bg-gold-700',
          },
          {
            href: '/dashboard/admin/contacts',
            icon: Mail,
            iconCls: 'bg-blue-100 text-blue-600',
            title: 'Contact Forms',
            description: 'View messages submitted from the public contact page and mark them read or resolved.',
            cta: 'View Messages',
            ctaCls: 'bg-blue-600 hover:bg-blue-700',
          },
          {
            href: '/dashboard/admin/content',
            icon: FileText,
            iconCls: 'bg-cyan-100 text-cyan-600',
            title: 'Site Content',
            description: 'Update static pages like About and Contact without developer support.',
            cta: 'Edit Content',
            ctaCls: 'bg-cyan-600 hover:bg-cyan-700',
          },
        ].map(({ href, icon: Icon, iconCls, title, description, cta, ctaCls }) => (
          <div key={href} className="card p-6 flex flex-col">
            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center mb-4 ${iconCls}`}>
              <Icon className="h-6 w-6" />
            </div>
            <h2 className="font-display text-base font-bold text-navy-900 mb-2">{title}</h2>
            <p className="text-sm text-veriq-muted flex-1 leading-relaxed mb-5">{description}</p>
            <Link
              href={href}
              className={`flex items-center justify-center gap-2 rounded-xl py-2.5 text-sm font-bold text-white transition-colors ${ctaCls}`}
            >
              {cta} <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        ))}
      </div>

      {/* Info */}
      <div className="card p-6 bg-navy-900">
        <h2 className="font-display text-sm font-bold text-white mb-3">Verification Policy</h2>
        <div className="space-y-2 text-xs text-slate-400 leading-relaxed">
          <p><strong className="text-white">Level 1 (Basic):</strong> Requires valid government ID + selfie. Once approved, the agent can list properties.</p>
          <p><strong className="text-white">Level 2 (Professional):</strong> Requires CAC docs and/or real estate association membership. Grants the &quot;Professional&quot; badge.</p>
          <p><strong className="text-white">Deactivation:</strong> Blocks login and hides all of the agent&apos;s listings automatically.</p>
        </div>
      </div>
    </div>
  );
}
