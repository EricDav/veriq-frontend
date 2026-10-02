'use client';

import Link from 'next/link';
import Image from 'next/image';
import { ArrowUpRight, Heart, Home, MapPin } from 'lucide-react';
import type { Property } from '@/types';
import { PropertyType } from '@/types';
import { Badge } from '@/components/ui';

/**
 * The prototype's `.property-card`: photo with the category badge top left and a save control top
 * right, then location and availability on one line, the title, the documented-unit count, and a
 * footer carrying the price and the way in.
 *
 * Numbers are the prototype's stylesheet: a 220px image (230 on a phone), 21px body padding, a
 * 1.05rem Sora title and a 0.86rem body line, over a 14px card at #111827 that lifts 4px on hover.
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE_URL?.replace('/api/v1', '') ?? 'http://localhost:3000';

function mediaUrl(url: string): string {
  if (!url) return '';
  if (url.startsWith('http') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `${API_BASE}${url.startsWith('/') ? '' : '/'}${url}`;
}

/** The five labels the browse filter and the home search both use, keyed off the listing's type. */
function categoryLabel(propertyType: PropertyType): string {
  if (propertyType === PropertyType.SHORT_STAY) return 'Short Lets';
  if (propertyType === PropertyType.HOSTEL) return 'Hostels';
  if (propertyType === PropertyType.SHARED_APARTMENT) return 'Shared Property';
  return 'Residential Property';
}

function naira(amount: number): string {
  return `₦${Math.round(amount).toLocaleString('en-NG')}`;
}

export function PropertyCard({
  property,
  detailHref,
}: {
  property: Property;
  /** Override the link destination (e.g. /dashboard/browse/:id). */
  detailHref?: string;
  /** Retained so existing call sites keep compiling; the card has one appearance now. */
  browseVariant?: boolean;
}) {
  const {
    id,
    title,
    area,
    city,
    state,
    rentAmount,
    propertyType,
    coverImageUrl,
    availabilitySummary,
    shortStayDailyRate,
  } = property;

  const href = detailHref ?? `/properties/${id}`;
  const location = [area, city, state].filter(Boolean).join(', ');

  const documented = availabilitySummary?.documentedUnits ?? property.units?.length ?? 0;
  const available =
    availabilitySummary?.availableUnits ??
    property.units?.filter((unit) => unit.availabilityStatus === 'available').length ??
    0;
  const isAvailable = available > 0;

  const isShortLet = propertyType === PropertyType.SHORT_STAY;
  const price = isShortLet ? (shortStayDailyRate ?? rentAmount) : rentAmount;
  const period = isShortLet ? '/ night' : '/ year';

  return (
    <article className="overflow-hidden rounded-[14px] border border-[#ffffff16] bg-card transition-[transform,border-color] duration-200 hover:-translate-y-1 hover:border-[#10b98170]">
      <div className="group relative h-[230px] overflow-hidden wide:h-[220px]">
        <Link href={href} tabIndex={-1} aria-hidden="true" className="block h-full w-full">
          {coverImageUrl ? (
            <Image
              src={mediaUrl(coverImageUrl)}
              alt=""
              fill
              sizes="(min-width: 1051px) 400px, (min-width: 760px) 45vw, 94vw"
              className="object-cover transition-transform duration-[600ms] group-hover:scale-[1.04]"
            />
          ) : (
            <span className="flex h-full w-full items-center justify-center bg-[#0b141d]">
              <Home className="h-10 w-10 text-[#ffffff14]" aria-hidden="true" />
            </span>
          )}
        </Link>

        <span className="absolute left-[14px] top-[14px] inline-flex items-center gap-1.5 rounded-md border border-[#ffffff20] bg-[#070b14d9] px-2.5 py-[5px] text-ui-xs font-medium leading-[1.4] text-foreground">
          {categoryLabel(propertyType)}
        </span>

        <button
          type="button"
          aria-label={`Save ${title}`}
          className="absolute right-[14px] top-[14px] grid h-10 w-10 place-items-center rounded-full border border-[#ffffff20] bg-[#070b1488] text-white transition-colors hover:bg-[#070b14cc] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Heart className="h-[18px] w-[18px]" aria-hidden="true" />
        </button>
      </div>

      <div className="p-[21px]">
        <div className="flex items-center justify-between gap-3">
          <small className="flex items-center gap-[5px] text-ui-xs text-muted-foreground">
            <MapPin className="h-[13px] w-[13px] flex-none" aria-hidden="true" />
            <span className="truncate">{location}</span>
          </small>
          <Badge tone={isAvailable ? 'success' : 'amber'}>{isAvailable ? 'Available now' : 'Unavailable'}</Badge>
        </div>

        <Link href={href}>
          <h3 className="mb-2 mt-3 font-display text-[1.05rem] font-semibold leading-[1.25] tracking-[-0.035em] text-foreground">
            {title}
          </h3>
        </Link>

        <p className="mb-4 text-[0.86rem] leading-[1.6] text-muted-foreground">
          {documented} documented {documented === 1 ? 'unit' : 'units'}
        </p>

        <div className="flex items-center justify-between border-t border-[#ffffff10] pt-[15px] text-ui-md">
          <span className="text-muted-foreground">
            <strong className="text-[1.05rem] font-semibold text-foreground">{naira(price)}</strong>{' '}
            <small className="text-ui-md">{period}</small>
          </span>
          <Link
            href={href}
            aria-label={`View ${title}`}
            className="text-muted-foreground transition-colors hover:text-primary"
          >
            <ArrowUpRight className="h-[21px] w-[21px]" aria-hidden="true" />
          </Link>
        </div>
      </div>
    </article>
  );
}
