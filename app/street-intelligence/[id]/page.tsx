'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Building2,
  Check,
  Clock,
  Copy,
  Facebook,
  Instagram,
  Linkedin,
  Mail,
  MapPin,
  MessageCircle,
  Share2,
  Users,
  X,
} from 'lucide-react';
import { ApiError, communityApi, propertiesApi } from '@/lib/api';
import { IntelligenceSourceType, type Property, type StreetIntelligencePayload } from '@/types';
import { LoadingSpinner } from '@/components/ui/LoadingSpinner';
import { PropertyCard } from '@/components/properties/PropertyCard';

const SECTIONS = ['Infrastructure', 'Environment', 'Accessibility'] as const;
const SOURCE_LABELS: Partial<Record<IntelligenceSourceType, string>> = {
  [IntelligenceSourceType.VERIQ_INITIAL]: 'Initial Veriq Intelligence',
  [IntelligenceSourceType.COMMUNITY_UPDATE]: 'Community Updates',
};

function sourceLabel(sources: IntelligenceSourceType[]) {
  const labels = sources
    .filter((source) => source !== IntelligenceSourceType.AGENT_REPORT)
    .map((source) => SOURCE_LABELS[source])
    .filter((label): label is string => Boolean(label));
  return labels.length ? labels.join(' + ') : 'Awaiting community reports';
}

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

function ShareStreet({ streetName, location }: { streetName: string; location: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false);
    };
    document.addEventListener('keydown', closeOnEscape);
    return () => document.removeEventListener('keydown', closeOnEscape);
  }, [isOpen]);

  const shareUrl = typeof window === 'undefined' ? '' : window.location.href;
  const shareText = `See the Street Intelligence report for ${streetName}, ${location} on Veriq Property.`;

  const openShareUrl = (url: string) => {
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const copyLink = async (message = 'Link copied to clipboard') => {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setFeedback(message);
    } catch {
      setFeedback('Unable to copy automatically. Copy the address from your browser.');
    }
  };

  const shareFromDevice = async () => {
    if (!navigator.share) {
      await copyLink('Link copied. Paste it into the app you want to share with.');
      return;
    }
    try {
      await navigator.share({ title: `${streetName} Street Intelligence`, text: shareText, url: shareUrl });
      setFeedback('Street shared successfully');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') return;
      setFeedback('Sharing was not completed. Please try another option.');
    }
  };

  const encodedUrl = encodeURIComponent(shareUrl);
  const encodedText = encodeURIComponent(shareText);
  const shareOptions = [
    {
      label: 'WhatsApp',
      icon: MessageCircle,
      action: () => openShareUrl(`https://wa.me/?text=${encodedText}%20${encodedUrl}`),
      className: 'text-emerald-700 hover:bg-emerald-50',
    },
    {
      label: 'Facebook',
      icon: Facebook,
      action: () => openShareUrl(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`),
      className: 'text-blue-700 hover:bg-blue-50',
    },
    {
      label: 'Instagram',
      icon: Instagram,
      action: () => void shareFromDevice(),
      className: 'text-pink-700 hover:bg-pink-50',
    },
    {
      label: 'X',
      icon: X,
      action: () => openShareUrl(`https://twitter.com/intent/tweet?text=${encodedText}&url=${encodedUrl}`),
      className: 'text-slate-900 hover:bg-slate-100',
    },
    {
      label: 'LinkedIn',
      icon: Linkedin,
      action: () => openShareUrl(`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`),
      className: 'text-sky-800 hover:bg-sky-50',
    },
    {
      label: 'Email',
      icon: Mail,
      action: () => { window.location.href = `mailto:?subject=${encodeURIComponent(`${streetName} Street Intelligence`)}&body=${encodedText}%0A%0A${encodedUrl}`; },
      className: 'text-slate-700 hover:bg-slate-100',
    },
  ];

  return (
    <>
      <div className="mt-6 flex justify-center">
        <button type="button" onClick={() => { setFeedback(null); setIsOpen(true); }} className="btn-primary inline-flex min-h-12 items-center gap-2 px-6 uppercase">
          <Share2 className="h-4 w-4" /> Share This Street?
        </button>
      </div>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-navy-900/60 p-4 sm:items-center" role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setIsOpen(false); }}>
          <section role="dialog" aria-modal="true" aria-labelledby="share-street-title" className="w-full max-w-md rounded-lg bg-white p-5 shadow-2xl">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 id="share-street-title" className="font-display text-lg font-bold text-navy-900">Share {streetName}</h2>
                <p className="mt-1 text-sm text-veriq-muted">Help someone make a better-informed property decision.</p>
              </div>
              <button type="button" onClick={() => setIsOpen(false)} className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100" aria-label="Close share options">
                <X className="h-5 w-5" />
              </button>
            </div>

            <button type="button" onClick={() => void shareFromDevice()} className="mt-5 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-navy-900 px-4 text-sm font-medium text-white hover:bg-navy-800">
              <Share2 className="h-4 w-4" /> Share with another app
            </button>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {shareOptions.map(({ label, icon: Icon, action, className }) => (
                <button key={label} type="button" onClick={action} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-lg border border-slate-200 px-2 text-xs font-medium transition-colors ${className}`}>
                  <Icon className="h-5 w-5" /> {label}
                </button>
              ))}
            </div>

            <button type="button" onClick={() => void copyLink()} className="mt-4 flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-slate-300 px-4 text-sm font-medium text-navy-900 hover:bg-slate-50">
              {feedback?.startsWith('Link copied') ? <Check className="h-4 w-4 text-emerald-600" /> : <Copy className="h-4 w-4" />}
              Copy link
            </button>
            {feedback && <p role="status" className="mt-3 text-center text-xs text-veriq-muted">{feedback}</p>}
          </section>
        </div>
      )}
    </>
  );
}

function StreetResult() {
  const { id } = useParams<{ id: string }>();
  const [payload, setPayload] = useState<StreetIntelligencePayload | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [relatedProperties, setRelatedProperties] = useState<Property[]>([]);
  const [propertyScope, setPropertyScope] = useState<'street' | 'area'>('street');
  const [propertiesLoading, setPropertiesLoading] = useState(false);

  useEffect(() => {
    communityApi
      .getStreet(id)
      .then((res) => setPayload(res.data))
      .catch((error) => {
        setNotFound(error instanceof ApiError && error.statusCode === 404);
        setLoadError(
          error instanceof ApiError
            ? error.statusCode === 404 ? null : error.message
            : 'Unable to connect to Street Intelligence. Please check that the API is running and try again.',
        );
        setPayload(null);
      })
      .finally(() => setIsLoading(false));
  }, [id]);

  useEffect(() => {
    if (!payload?.street) return;
    let cancelled = false;
    const loadRelatedProperties = async () => {
      setPropertiesLoading(true);
      try {
        const exact = await propertiesApi.list({ streetId: payload.street.id, page: 1, limit: 3 });
        if (cancelled) return;
        if (exact.data.length > 0) {
          setRelatedProperties(exact.data);
          setPropertyScope('street');
          return;
        }
        const nearby = await propertiesApi.list({
          state: payload.street.state,
          city: payload.street.city,
          area: payload.street.area,
          page: 1,
          limit: 3,
        });
        if (!cancelled) {
          setRelatedProperties(nearby.data);
          setPropertyScope('area');
        }
      } catch {
        if (!cancelled) setRelatedProperties([]);
      } finally {
        if (!cancelled) setPropertiesLoading(false);
      }
    };
    void loadRelatedProperties();
    return () => { cancelled = true; };
  }, [payload]);

  if (isLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-veriq-surface"><LoadingSpinner size="lg" /></div>;
  }

  if (!payload) {
    return (
      <div className="min-h-screen bg-veriq-surface pt-24">
        <main className="mx-auto min-w-0 max-w-4xl px-4 py-16 text-center sm:px-6">
          <h1 className="font-display text-2xl font-bold text-navy-900">
            {notFound ? 'Street not found' : 'Unable to load Street Intelligence'}
          </h1>
          <>
              <p className="mx-auto mt-3 max-w-xl break-words text-sm text-veriq-muted">{loadError ?? 'This street is unavailable or is still awaiting admin approval.'}</p>
              <Link href="/street-intelligence" className="btn-primary mt-6">Back to Street Intelligence</Link>
          </>
        </main>
      </div>
    );
  }

  const { street } = payload;
  const browsePropertiesUrl = `/properties?${new URLSearchParams({
    state: street.state,
    city: street.city,
    area: street.area,
  }).toString()}`;

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
                  <p className="flex items-start gap-1"><Users className="mt-0.5 h-3.5 w-3.5 shrink-0" /> Source: {sourceLabel(result.sources)}</p>
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

        <section className="mb-8 border-y border-slate-200 py-8">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="mb-1 text-xs font-bold uppercase text-emerald-700">Continue your search</p>
              <h2 className="font-display text-xl font-black text-navy-900">
                {propertyScope === 'street' && relatedProperties.length > 0
                  ? `Properties on ${street.streetName}`
                  : `Properties around ${street.area}`}
              </h2>
              <p className="mt-1 text-sm text-veriq-muted">Use what you have learned about the street to compare available homes nearby.</p>
            </div>
            <Link href={browsePropertiesUrl} className="btn-primary inline-flex">
              Browse properties <ArrowRight className="h-4 w-4" />
            </Link>
          </div>

          {propertiesLoading ? (
            <div className="flex justify-center py-10"><LoadingSpinner size="lg" /></div>
          ) : relatedProperties.length > 0 ? (
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
              {relatedProperties.map((property) => <PropertyCard key={property.id} property={property} />)}
            </div>
          ) : (
            <div className="flex flex-col items-center border border-dashed border-slate-300 bg-white px-5 py-10 text-center">
              <Building2 className="mb-3 h-8 w-8 text-slate-300" />
              <p className="font-bold text-navy-900">No active listings here yet</p>
              <p className="mt-1 max-w-md text-sm text-veriq-muted">Explore the wider property directory for other verified listings in {street.city}.</p>
              <Link href={browsePropertiesUrl} className="btn-outline mt-5 inline-flex">Explore nearby properties</Link>
            </div>
          )}
        </section>

        <div className="mt-8 rounded-2xl border border-slate-200 bg-white p-5">
          <p className="font-bold text-navy-900">Know This Area?</p>
          <p className="mt-1 text-sm text-veriq-muted">Has anything changed? Do you have more recent or accurate information? Help keep this Street Intelligence up to date for everyone.</p>
          <Link href={`/dashboard/community?streetId=${street.id}`} className="btn-primary mt-4 inline-flex">Update This Street</Link>
        </div>

        <p className="mt-6 text-xs leading-5 text-slate-500">
          Street Intelligence reflects the experiences of Community Contributors and may change as new reports are submitted. Users should make independent enquiries before making a property decision.
        </p>
        <ShareStreet streetName={street.streetName} location={`${street.area}, ${street.city}, ${street.state}`} />
      </main>
    </div>
  );
}

export default function StreetResultPage() {
  return <StreetResult />;
}
