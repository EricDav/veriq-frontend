'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { MapPin, CheckCircle, Bed, Bath, Lock, Shield, Home, Gift } from 'lucide-react';
import type { Property } from '@/types';
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
  browseVariant = false,
}: {
  property: Property;
  /** Override the link destination (e.g. /dashboard/browse/:id) */
  detailHref?: string;
  browseVariant?: boolean;
}) {
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
    consultationFee,
  } = property as Property & { isVerified?: boolean };

  // The public list returns the effective unlock price, so ₦0 means this listing is currently free to unlock (§12.7).
  const isFreeUnlock = typeof consultationFee === 'number' && consultationFee === 0;
  const unlockLabel = isFreeUnlock
    ? 'Free unlock · ₦0'
    : typeof consultationFee === 'number' && consultationFee > 0
      ? `Unlock ₦${consultationFee.toLocaleString('en-NG')}`
      : 'Unlock full details';

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

  return (
    <Link href={detailHref ?? `/properties/${id}`} className="group block">
      <div className={`overflow-hidden rounded-md border transition-all duration-200 ${browseVariant ? 'border-emerald-400/20 bg-[#062129] text-white hover:border-emerald-400/50 hover:shadow-[0_12px_35px_rgba(16,185,129,0.12)]' : 'card'}`}>
        {/* Image / placeholder */}
        <div className={`relative ${browseVariant ? 'h-48' : 'h-52'} bg-gradient-to-br ${gradient} overflow-hidden`}>
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

          {isFreeUnlock && (
            <div className="absolute top-12 right-3 flex items-center gap-1 rounded-full bg-emerald-500 px-2.5 py-1 text-white shadow-sm">
              <Gift className="h-3 w-3" />
              <span className="text-xs font-bold">Free Unlock</span>
            </div>
          )}

          {/* Unlock fee CTA */}
          <div className="absolute bottom-3 right-3 flex items-center gap-1.5 rounded-lg bg-navy-900/80 px-3 py-1.5 backdrop-blur-sm">
            {isFreeUnlock ? <Gift className="h-3 w-3 text-emerald-300" /> : <Lock className="h-3 w-3 text-gold-400" />}
            <span className="text-xs font-semibold text-white">{unlockLabel}</span>
          </div>

          {/* Type label */}
          <div className="absolute bottom-3 left-3 rounded-lg bg-white/90 backdrop-blur-sm px-2.5 py-1">
            <span className="text-xs font-medium text-navy-700 capitalize">
              {propertyType.replace(/_/g, ' ')}
            </span>
          </div>
        </div>

        {/* Content */}
        <div className={browseVariant ? 'p-4' : 'p-5'}>
          <h3 className={`font-display text-base font-bold leading-snug group-hover:text-veriq-secondary transition-colors line-clamp-1 mb-1.5 ${browseVariant ? 'text-white' : 'text-navy-900'}`}>
            {title}
          </h3>

          <div className={`flex items-center gap-1.5 text-xs mb-4 ${browseVariant ? 'text-white/55' : 'text-veriq-muted'}`}>
            <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
            <span className="truncate">{location}</span>
          </div>

          {/* Specs */}
          <div className={`flex items-center gap-4 text-xs mb-4 pb-4 border-b ${browseVariant ? 'border-white/10 text-white/60' : 'border-slate-100 text-veriq-muted'}`}>
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
                <span className={`text-xs font-medium max-w-[80px] truncate ${browseVariant ? 'text-white/70' : 'text-navy-700'}`}>{agentName}</span>
                {agent?.isPlatformVerified && (
                  <Shield className="h-3 w-3 text-emerald-500 flex-shrink-0" />
                )}
              </div>
            </div>
            <div className="text-right">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5">Rent</p>
              <p className={`text-base font-bold ${browseVariant ? 'text-emerald-300' : 'text-navy-900'}`}>
                {formatNaira(rentAmount)}
                <span className="text-xs font-normal text-slate-400">/yr</span>
              </p>
            </div>
          </div>
          {browseVariant && (
            <div className="mt-4 grid grid-cols-2 gap-2 border-t border-white/10 pt-3">
              <span className="flex min-h-9 items-center justify-center rounded border border-white/15 text-xs font-semibold text-white/80">View Preview</span>
              <span className="flex min-h-9 items-center justify-center gap-1.5 rounded bg-emerald-500 text-xs font-semibold text-[#03161c]">{isFreeUnlock ? <Gift className="h-3.5 w-3.5" /> : <Lock className="h-3.5 w-3.5" />}{isFreeUnlock ? 'Unlock Free' : 'Unlock Full Details'}</span>
            </div>
          )}
        </div>
      </div>
    </Link>
  );
}
