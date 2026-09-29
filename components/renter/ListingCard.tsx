import Link from 'next/link';
import type { ReactNode } from 'react';
import { Eye, Gift, Home, KeyRound, Landmark, Lock, MapPin, Users } from 'lucide-react';
import type { FormSchemaDefinition, PortfolioItem, SaleListingCardData, SharedListingPublic } from '@/types/renter';
import { Badge } from '@/components/ui';
import { answerValue } from './SchemaAnswers';
import { CATEGORY_LABELS, formatNaira, listingHref, locationLine, mediaSrc } from './format';

const PRICE_BASIS_LABELS: Record<string, string> = {
  total: 'total',
  per_plot: 'per plot',
  per_square_metre: 'per m²',
};

function UnlockFeeBadge({ isFree, price }: { isFree: boolean; price: number }) {
  return isFree ? (
    <Badge className="border-[#ffffff20] bg-[#070b14d9]">
      <Gift aria-hidden="true" className="h-3 w-3" /> Free unlock · ₦0
    </Badge>
  ) : (
    <Badge tone="neutral" className="border-[#ffffff20] bg-[#070b14d9] text-foreground">
      <Lock aria-hidden="true" className="h-3 w-3 text-primary" /> Unlock {formatNaira(price)}
    </Badge>
  );
}

/**
 * The prototype's `.property-card`: a 14px-radius card with a 220px cover, the category badge pinned top-left over
 * the image, and a hairline-separated footer carrying the price. Lifts 4px and picks up an emerald edge on hover.
 */
function CardShell({
  href,
  image,
  alt,
  badge,
  categoryLabel,
  children,
}: {
  href: string;
  image: string | null;
  /** Also the card link's accessible name, so it is never announced as a bare "link". */
  alt: string;
  badge?: ReactNode;
  categoryLabel: string;
  children: ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-label={`${categoryLabel}: ${alt}`}
      className="group block h-full rounded-searchbar focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <article className="flex h-full flex-col overflow-hidden rounded-searchbar border border-[#ffffff16] bg-card transition-[transform,border-color] duration-200 group-hover:-translate-y-1 group-hover:border-[#10b98170]">
        <div className="relative h-[220px] overflow-hidden bg-[#070b1444]">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mediaSrc(image)}
              alt={alt}
              className="h-full w-full object-cover transition-transform duration-[600ms] group-hover:scale-[1.04]"
              loading="lazy"
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <Home aria-hidden="true" className="h-12 w-12 text-[#ffffff20]" />
            </div>
          )}
          <span className="absolute left-3.5 top-3.5">
            <Badge tone="neutral" className="border-[#ffffff20] bg-[#070b14d9] text-foreground">
              {categoryLabel}
            </Badge>
          </span>
          {badge && <span className="absolute bottom-3.5 right-3.5">{badge}</span>}
        </div>
        <div className="flex flex-1 flex-col p-[21px]">{children}</div>
      </article>
    </Link>
  );
}

/** Public Shared Property card: general area, opportunity type, contribution and unlock fee only (§11.4). */
export function SharedListingCard({ listing, schema = null }: { listing: SharedListingPublic; schema?: FormSchemaDefinition | null }) {
  const contribution = answerValue(schema, 'contribution_amount', listing.basics.contribution_amount);
  const basis = answerValue(schema, 'contribution_basis', listing.basics.contribution_basis);
  const bathroom = answerValue(schema, 'bathroom_sharing', listing.basics.bathroom_sharing);
  return (
    <CardShell
      href={`/shared/${listing.id}`}
      image={listing.coverImageUrl}
      alt={listing.displayLabel}
      categoryLabel="Shared Property"
      badge={<UnlockFeeBadge isFree={listing.isFreeUnlock} price={listing.unlockPrice} />}
    >
      <p className="flex items-center gap-1.5 text-ui-sm font-semibold text-primary">
        <Users aria-hidden="true" className="h-3.5 w-3.5" /> {listing.opportunityTypeLabel}
      </p>
      <h3 className="mt-1.5 line-clamp-2 font-display text-base font-semibold text-foreground">{listing.displayLabel}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-ui-sm text-muted-foreground">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />{' '}
        <span className="truncate">{locationLine(listing.area, listing.city, listing.state)}</span>
      </p>
      {bathroom && <p className="mt-2 text-ui-sm text-muted-foreground">Bathroom: {bathroom}</p>}
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#ffffff10] pt-[15px] text-ui-md">
        <span>
          <strong className="font-semibold text-foreground">{contribution ?? 'On unlock'}</strong>
          {basis && <small className="text-muted-foreground"> {basis.toLowerCase()}</small>}
        </span>
        <Badge>Available now</Badge>
      </div>
    </CardShell>
  );
}

/**
 * Public Property for Sale card. There is no unlock and no fee for a sale listing, so the badge says the listing is
 * free to view rather than advertising a price to unlock it (Master Blueprint §6).
 */
export function SaleListingCard({ listing }: { listing: SaleListingCardData }) {
  const basis = PRICE_BASIS_LABELS[listing.priceBasis] ?? '';
  const bedrooms = listing.basics.bedrooms;
  const landArea = typeof listing.basics.land_area === 'string' ? listing.basics.land_area : null;
  const recorded = listing.documentStatuses.length;
  return (
    <CardShell
      href={`/for-sale/${listing.id}`}
      image={listing.coverImageUrl}
      alt={listing.title}
      categoryLabel="Property for Sale"
      badge={
        <Badge className="border-[#ffffff20] bg-[#070b14d9]">
          <Eye aria-hidden="true" className="h-3 w-3" /> Free to view
        </Badge>
      }
    >
      <p className="flex items-center gap-1.5 text-ui-sm font-semibold text-primary">
        <Landmark aria-hidden="true" className="h-3.5 w-3.5" /> {listing.subtypeLabel}
      </p>
      <h3 className="mt-1.5 line-clamp-2 font-display text-base font-semibold text-foreground">{listing.title}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-ui-sm text-muted-foreground">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />{' '}
        <span className="truncate">{locationLine(listing.area, listing.city, listing.state)}</span>
      </p>
      <p className="mt-2 text-ui-sm text-muted-foreground">
        {typeof bedrooms === 'number' ? `${bedrooms} bedroom${bedrooms === 1 ? '' : 's'}` : landArea ?? ''}
        {recorded > 0 && `${typeof bedrooms === 'number' || landArea ? ' · ' : ''}${recorded} document status${recorded === 1 ? '' : 'es'} recorded`}
      </p>
      <div className="mt-auto flex items-center justify-between gap-3 border-t border-[#ffffff10] pt-[15px] text-ui-md">
        <span>
          <strong className="font-semibold text-foreground">{formatNaira(listing.askingPrice)}</strong>
          <small className="text-muted-foreground"> {basis || 'asking price'}</small>
        </span>
        {listing.negotiable !== null && (
          <Badge tone="neutral">{listing.negotiable ? 'Negotiable' : 'Fixed price'}</Badge>
        )}
      </div>
    </CardShell>
  );
}

/** Portfolio card on the public Veriq Agent profile. */
export function PortfolioCard({ item }: { item: PortfolioItem }) {
  const label = CATEGORY_LABELS[item.category] ?? 'Property';
  return (
    <CardShell href={listingHref(item.targetType, item.id)} image={item.coverImageUrl} alt={item.title} categoryLabel={label}>
      <h3 className="line-clamp-2 font-display text-base font-semibold text-foreground">{item.title}</h3>
      <p className="mt-1.5 flex items-center gap-1.5 text-ui-sm text-muted-foreground">
        <MapPin aria-hidden="true" className="h-3.5 w-3.5 flex-shrink-0" />{' '}
        <span className="truncate">{locationLine(item.area, item.city) || 'General area shown on the listing'}</span>
      </p>
      <span className="mt-auto inline-flex items-center gap-1.5 border-t border-[#ffffff10] pt-[15px] text-ui-sm font-semibold text-primary">
        <KeyRound aria-hidden="true" className="h-3.5 w-3.5" /> View basic details
      </span>
    </CardShell>
  );
}
