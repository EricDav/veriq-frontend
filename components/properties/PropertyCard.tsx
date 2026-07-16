'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CheckCircle, Bed, Bath, Lock, Shield, Home, Gift } from 'lucide-react';
import { communityApi } from '@/lib/api';
import type { FreeUnlockStatus, Property } from '@/types';
import { AgentVerificationLevel, FreshnessScore } from '@/types';

// Colour gradient pool keyed by property type for visual variety
const TYPE_COLORS: Record<string, string> = {
  flat: 'from-blue-600 to-blue-800',
  duplex: 'from-indigo-600 to-indigo-800',
  bungalow: 'from-teal-600 to-teal-800',
  self_contain: 'from-cyan-600 to-cyan-800',
  studio: 'from-purple-600 to-purple-800',
  penthouse: 'from-navy-700 to-navy-900',
  mansion: 'from-slate-700 to-slate-900',
  terraced_house: 'from-emerald-600 to-emerald-800',
  detached_house: 'from-orange-600 to-orange-800',
  semi_detached: 'from-amber-600 to-amber-800',
  room_and_parlour: 'from-pink-600 to-pink-800',
  other: 'from-gray-600 to-gray-800',
};

const FRESHNESS_BADGE: Record<FreshnessScore, { label: string; cls: string }> = {
  freshly_verified: { label: 'Freshly Verified', cls: 'bg-emerald-100 text-emerald-700' },
  recently_verified: { label: 'Recent', cls: 'bg-blue-100 text-blue-700' },
  verification_expiring: { label: 'Expiring Soon', cls: 'bg-amber-100 text-amber-700' },
  unverified: { label: 'Unverified', cls: 'bg-slate-100 text-slate-600' },
};

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

function formatNaira(amount: number): string {
  if (amount >= 1_000_000) {
    return `₦${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `₦${(amount / 1_000).toFixed(0)}k`;
  }
  return `₦${amount.toLocaleString()}`;
}

export function PropertyCard({
  property,
  detailHref,
}: {
  property: Property;
  /** Override the link destination (e.g. /dashboard/browse/:id) */
  detailHref?: string;
}) {
  const [freeUnlock, setFreeUnlock] = useState<FreeUnlockStatus | null>(null);
  const {
    id,
    title,
    area,
    city,
    state,
    rentAmount,
    bedrooms,
    bathrooms,
    propertyType,
    freshnessScore,
    agent,
    status,
    isVerified,
    coverImageUrl,
  } = property as Property & { isVerified?: boolean };

  const gradient = TYPE_COLORS[propertyType] ?? TYPE_COLORS.other;
  const freshness = FRESHNESS_BADGE[freshnessScore];
  const agentName = agent?.user
    ? `${agent.user.firstName} ${agent.user.lastName}`
    : 'Unknown Agent';
  const agentInitial = agentName[0]?.toUpperCase() ?? 'A';
  const agentVerified =
    (agent?.verificationLevel ?? 0) >= AgentVerificationLevel.BASIC;
  const location = [area, city, state].filter(Boolean).join(', ');
  const isActive = status === 'active';

  useEffect(() => {
    let cancelled = false;
    communityApi
      .freeUnlockStatus(id)
      .then((res) => {
        if (!cancelled) setFreeUnlock(res.data);
      })
      .catch(() => {
        if (!cancelled) setFreeUnlock(null);
      });
    return () => {
      cancelled = true;
    };
  }, [id]);

  return (
    <Link href={detailHref ?? `/properties/${id}`} className="group block">
      <div className="card overflow-hidden">
        {/* Image / placeholder */}
        <div className={`relative h-52 bg-gradient-to-br ${gradient} overflow-hidden`}>
          {coverImageUrl ? (
            <Image
              src={mediaUrl(coverImageUrl)}
              alt={title}
              fill
              className="object-cover"
              sizes="(max-width: 768px) 100vw, 33vw"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home className="h-12 w-12 text-white/10" />
            </div>
          )}

          {/* Freshness badge */}
          <div className="absolute top-3 left-3">
            <span className={`badge text-xs font-semibold ${freshness.cls}`}>
              {freshness.label}
            </span>
          </div>

          {/* Status warning */}
          {!isActive && (
            <div className="absolute top-3 left-3">
              <span className="badge bg-slate-800/90 text-white text-xs font-semibold capitalize">
                {status}
              </span>
            </div>
          )}

          {/* Verified badge */}
          {agentVerified && (
            <div className="absolute top-3 right-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1">
              <CheckCircle className="h-3 w-3 text-emerald-500" />
              <span className="text-xs font-bold text-navy-900">Verified</span>
            </div>
          )}

          {freeUnlock?.available && (
            <div className="absolute top-12 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-white shadow-sm">
              <Gift className="h-3 w-3" />
              <span className="text-xs font-bold">Free Unlock</span>
            </div>
          )}

          {/* Unlock report CTA */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-navy-900/80 backdrop-blur-sm px-3 py-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
            {freeUnlock?.available ? <Gift className="h-3 w-3 text-emerald-300" /> : <Lock className="h-3 w-3 text-gold-400" />}
            <span className="text-xs font-semibold text-white">{freeUnlock?.available ? 'Claim Free Unlock' : 'Unlock Report'}</span>
          </div>

          {/* Type label */}
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1">
            <span className="text-xs font-medium text-navy-700 capitalize">
              {propertyType.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-5">
          <h3 className="font-display text-base font-bold text-navy-900 leading-snug group-hover:text-veriq-secondary transition-colors line-clamp-1 mb-1.5">
            {title}
          </h3>

          <div className="flex items-center gap-1.5 text-veriq-muted text-xs mb-4">
            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Specs */}
          <div className="flex items-center gap-4 text-xs text-veriq-muted mb-4 pb-4 border-b border-slate-100">
            <div className="flex items-center gap-1">
              <Bed className="h-3.5 w-3.5" />
              <span>{bedrooms} Beds</span>
            </div>
            <div className="flex items-center gap-1">
              <Bath className="h-3.5 w-3.5" />
              <span>{bathrooms} Baths</span>
            </div>
          </div>

          {/* Agent & price */}
          <div className="flex items-center justify-between">
            <div>
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Agent</p>
              <div className="flex items-center gap-1.5">
                <div className="h-5 w-5 rounded-full bg-veriq-secondary flex items-center justify-center text-[9px] font-bold text-white">
                  {agentInitial}
                </div>
                <span className="text-xs font-medium text-navy-700 max-w-[80px] truncate">{agentName}</span>
                {agent?.isPlatformVerified && (
                  <Shield className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Rent</p>
              <p className="text-base font-bold text-navy-900">
                {formatNaira(rentAmount)}
                <span className="text-xs font-normal text-slate-400">/yr</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </Link>
  );
}
