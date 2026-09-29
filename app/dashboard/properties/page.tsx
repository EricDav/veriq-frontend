'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Plus, Home } from 'lucide-react';
import { consultationsApi } from '@/lib/api';
import type { Consultation } from '@/types';
import { ConsultationStatus } from '@/types';
import { useAuth } from '@/context/AuthContext';
import { UserRole } from '@/types';
import { PageLoader, LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PropertyCard } from '@/components/properties/PropertyCard';
import { AgentAssignedProperties } from '@/components/agent/AgentAssignedProperties';
import { buttonClass } from '@/components/ui';

const formatDate = (value: string | null | undefined) =>
  value ? new Date(value).toLocaleString() : 'Not provided';

// ─── User view: consultation history ─────────────────────────────────────

function UserPropertiesView() {
  const [consultations, setConsultations] = useState<Consultation[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    consultationsApi
      .getMyConsultations(1, 100)
      .then((res) => setConsultations(res.data))
      .catch(() => setConsultations([]))
      .finally(() => setIsLoading(false));
  }, []);

  const now = Date.now();
  const activeUnlocked = consultations.filter(
    (item) =>
      item.status === ConsultationStatus.UNLOCKED &&
      item.accessExpiresAt &&
      new Date(item.accessExpiresAt).getTime() > now &&
      item.property,
  );

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold text-foreground">My Properties</h1>
          <p className="text-sm text-muted-foreground">Properties you&apos;ve unlocked intelligence reports for</p>
        </div>
        <Link href="/properties" className={buttonClass()}>
          <Plus className="h-4 w-4" /> Find Properties
        </Link>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-16">
          <LoadingSpinner size="lg" />
        </div>
      ) : activeUnlocked.length > 0 ? (
        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {activeUnlocked.map((consultation) => (
            <div key={consultation.id} className="space-y-2">
              <PropertyCard
                property={consultation.property}
                detailHref={`/dashboard/browse/${consultation.propertyId}`}
              />
              <p className="rounded-xl bg-[#10b98112] px-3 py-2 text-xs font-semibold text-[#6ee7b7]">
                Access valid until {formatDate(consultation.accessExpiresAt)}
              </p>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl bg-veriq-surface border border-[#ffffff18] p-8 flex flex-col items-center text-center">
          <div className="h-16 w-16 rounded-2xl bg-[#ffffff0f] flex items-center justify-center mb-4">
            <Home className="h-8 w-8 text-muted-foreground" />
          </div>
          <h3 className="font-display text-base font-bold text-foreground mb-2">No active unlocked reports</h3>
          <p className="text-sm text-muted-foreground mb-5 max-w-sm">
            Browse properties and unlock intelligence reports to access full details and contact agents.
          </p>
          <Link href="/properties" className={buttonClass()}>Browse Properties</Link>
        </div>
      )}
    </div>
  );
}

// ─── Router ───────────────────────────────────────────────────────────────

export default function MyPropertiesPage() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <PageLoader />;

  if (user?.role === UserRole.AGENT) {
    return <AgentAssignedProperties />;
  }

  return <UserPropertiesView />;
}
