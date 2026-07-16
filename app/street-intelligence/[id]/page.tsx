'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3, MapPin, Users } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { StreetIntelligencePayload } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';

function RatingDots({ level, maxLevel }: { level: number | null; maxLevel: number }) {
  if (!level) {
    return <div className="flex gap-1 text-slate-300" aria-hidden="true">{Array.from({ length: maxLevel }).map((_, idx) => <span key={idx}>—</span>)}</div>;
  }
  return (
    <div className="flex gap-1" aria-hidden="true">
      {Array.from({ length: maxLevel }).map((_, idx) => (
        <span key={idx} className={idx < level ? 'text-emerald-600' : 'text-slate-300'}>●</span>
      ))}
    </div>
  );
}

export default function StreetResultPage() {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<StreetIntelligencePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    communityApi
      .getStreet(id)
      .then((res) => setPayload(res.data))
      .catch(() => setPayload(null))
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-veriq-surface"><LoadingSpinner size="lg" /></div>;
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-veriq-surface pt-24">
        <main className="mx-auto max-w-4xl px-4 py-16 text-center">
          <p className="font-display text-2xl font-bold text-navy-900">Street not found</p>
          <Link href="/street-intelligence" className="btn-primary mt-6">Back to Street Intelligence</Link>
        </main>
      </div>
    );
  }

  const { street } = payload;

  return (
    <div className="min-h-screen bg-veriq-surface pt-24">
      <main className="mx-auto max-w-5xl px-4 py-10 sm:px-6 lg:px-8">
        <Link href="/street-intelligence" className="mb-6 inline-flex items-center gap-2 text-sm text-veriq-muted hover:text-navy-900">
          <ArrowLeft className="h-4 w-4" /> Back to Street Intelligence
        </Link>

        <div className="mb-6 rounded-2xl bg-navy-900 p-6 text-white">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/10">
            <MapPin className="h-6 w-6 text-gold-400" />
          </div>
          <h1 className="font-display text-3xl font-black">{street.streetName}</h1>
          <p className="mt-1 text-sm text-white/70">{street.area}, {street.city}, {street.state}</p>
          <div className="mt-5 flex flex-wrap gap-3 text-xs">
            <span className="rounded-full bg-white/10 px-3 py-1.5">
              Last community update: {payload.lastUpdated ? new Date(payload.lastUpdated).toLocaleDateString() : 'Not enough data'}
            </span>
            <span className="rounded-full bg-white/10 px-3 py-1.5">{payload.contributors} Community Contributors</span>
          </div>
        </div>

        <div className="mb-6 rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm leading-6 text-blue-900">
          {payload.sourceNotice}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          {payload.results.map((result) => {
            const label = result.status === 'insufficient_data'
              ? 'Not Enough Community Reports'
              : result.result ?? 'Not Enough Community Reports';
            return (
              <section key={result.categoryId} className="card p-5">
                <div className="mb-4 flex items-center justify-between gap-3">
                  <div>
                    <h2 className="font-display text-base font-bold text-navy-900">{result.category}</h2>
                    <p className={`mt-1 text-sm font-black ${
                      result.status === 'mixed' ? 'text-amber-700' :
                      result.status === 'insufficient_data' ? 'text-slate-500' :
                      result.isPositiveScale ? 'text-emerald-700' : 'text-blue-700'
                    }`}>
                      {label}
                    </p>
                  </div>
                  <BarChart3 className="h-5 w-5 text-slate-300" />
                </div>
                <RatingDots level={result.level} maxLevel={result.maxLevel} />
                <p className="mt-3 flex items-center gap-1 text-xs text-veriq-muted">
                  <Users className="h-3.5 w-3.5" /> Based on {result.contributors} contributors
                </p>
                <p className="sr-only">
                  {result.category} rating: {label}, {result.level ? `level ${result.level} out of ${result.maxLevel}` : 'no rating level'}, based on {result.contributors} contributors.
                </p>
              </section>
            );
          })}
        </div>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-navy-900">Know this street?</p>
          <p className="mt-1 text-sm text-veriq-muted">Contribute or update intelligence if you have lived or worked here recently.</p>
          <Link href={`/dashboard/community?streetId=${street.id}`} className="btn-primary mt-4 inline-flex">Contribute or Update Intelligence</Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Street Intelligence reflects the experiences of Community Contributors and may change as new reports are submitted. Users should make independent enquiries before making a property decision.
        </p>
      </main>
    </div>
  );
}
