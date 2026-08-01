'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, BarChart3, Clock, MapPin, Users } from 'lucide-react';
import { ApiError, communityApi } from '@/lib/api';
import { IntelligenceSourceType, type StreetIntelligencePayload } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { useAuth } from '@/context/AuthContext';

const SECTIONS = ['Infrastructure', 'Environment', 'Accessibility'] as const;
const SOURCE_LABELS: Record<IntelligenceSourceType, string> = {
  [IntelligenceSourceType.VERIQ_INITIAL]: 'Veriq Initial Intelligence',
  [IntelligenceSourceType.AGENT_REPORT]: 'Agent Reports',
  [IntelligenceSourceType.COMMUNITY_UPDATE]: 'Community Updates',
};

function updatedLabel(value: string | null) {
  if (!value) return 'No recent update';
  const days = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 86_400_000));
  if (days === 0) return 'Today';
  if (days === 1) return 'Yesterday';
  if (days < 7) return `${days} days ago`;
  if (days < 14) return '1 week ago';
  return new Date(value).toLocaleDateString();
}

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

function StreetResult() {
  const { id } = useParams<{ id: string }>();
  const { isAuthenticated } = useAuth();
  const [payload, setPayload] = useState<StreetIntelligencePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchLimitReached, setSearchLimitReached] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    communityApi
      .getStreet(id)
      .then((res) => setPayload(res.data))
      .catch((error) => {
        if (error instanceof ApiError && error.statusCode === 403 && error.message === 'street_search_limit_reached') {
          setSearchLimitReached(true);
        }
        setLoadError(error instanceof ApiError && error.statusCode !== 404 ? error.message : null);
        setPayload(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-veriq-surface"><LoadingSpinner size="lg" /></div>;
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-veriq-surface pt-24">
        <main className="mx-auto min-w-0 max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-navy-900">
            {searchLimitReached ? 'Continue Exploring Street Intelligence' : 'Street not found'}
          </h1>
          {searchLimitReached ? (
            <>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-veriq-muted">
                You&apos;re discovering valuable insights that help people make smarter property decisions.
                Create your free Veriq account to continue exploring Street Intelligence, save your searches,
                and become part of a growing community helping everyone Know Before They Go.
              </p>
              <div className="mt-6 flex flex-wrap justify-center gap-3">
                <Link href="/auth/register" className="btn-primary">Create Free Account</Link>
                <Link href={`/auth/login?redirect=${encodeURIComponent(`/street-intelligence/${id}`)}`} className="btn-outline">Sign In</Link>
              </div>
            </>
          ) : (
            <>
              <p className="mx-auto mt-3 max-w-xl break-words text-sm text-veriq-muted">{loadError ?? 'This street is unavailable or is still awaiting admin approval.'}</p>
              <Link href="/street-intelligence" className="btn-primary mt-6">Back to Street Intelligence</Link>
            </>
          )}
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

        {!isAuthenticated && (
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            <span><strong>{payload.usage.remaining}</strong> of {payload.usage.limit} free street searches remaining.</span>
            <Link href="/auth/register" className="font-bold text-emerald-800 underline">Create a free account</Link>
          </div>
        )}

        {SECTIONS.map((section) => (
          <section key={section} className="mb-8">
            <h2 className="mb-4 font-display text-lg font-black text-navy-900">{section}</h2>
            <div className="grid gap-4 sm:grid-cols-2">
          {payload.results.filter((item) => item.section === section).map((result) => {
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
                {result.supplementaryResult.length > 0 && (
                  <p className="mt-3 text-xs text-veriq-muted">
                    <strong className="text-navy-900">Works Well On:</strong> {result.supplementaryResult.join(' • ')}
                  </p>
                )}
                <div className="mt-3 space-y-1 text-xs text-veriq-muted">
                  <p className="flex items-start gap-1"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Source: {result.sources.length ? result.sources.map((source) => SOURCE_LABELS[source]).join(' + ') : 'Awaiting reports'}</p>
                  {result.confidenceScore !== undefined && (
                    <p>
                      Confidence: <strong className="capitalize text-navy-900">{result.confidenceLevel}</strong>
                      {' '}({result.confidenceScore}%) from {result.evidenceCount} {result.evidenceCount === 1 ? 'record' : 'records'}
                    </p>
                  )}
                  <p className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> Updated: {updatedLabel(result.lastUpdated)}</p>
                </div>
                <p className="sr-only">
                  {result.category} rating: {label}, {result.level ? `level ${result.level} out of ${result.maxLevel}` : 'no rating level'}, based on {result.contributors} contributors.
                </p>
              </section>
            );
          })}
            </div>
          </section>
        ))}

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-navy-900">Know This Area?</p>
          <p className="mt-1 text-sm text-veriq-muted">Has anything changed? Do you have more recent or accurate information? Help keep this Street Intelligence up to date for everyone.</p>
          <Link href={`/dashboard/community?streetId=${street.id}`} className="btn-primary mt-4 inline-flex">Update This Street</Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Street Intelligence reflects the experiences of Community Contributors and may change as new reports are submitted. Users should make independent enquiries before making a property decision.
        </p>
      </main>
    </div>
  );
}

export default function StreetResultPage() {
  return <StreetResult />;
}
